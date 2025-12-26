/**
 * Tagger de Beatport
 * 
 * Coordina la búsqueda en Beatport y la aplicación de tags a archivos locales.
 * Implementa la lógica de merge de tags según las reglas definidas:
 * - BPM: Se ignora si el track local ya tiene BPM
 * - Key: Siempre se aplica (reemplaza el existente)
 * - Otros tags: Se aplican solo si el local está vacío
 */

use std::path::Path;
use std::sync::Arc;

use lofty::prelude::{Accessor, ItemKey, TagExt, TaggedFileExt};
use lofty::picture::{MimeType, Picture, PictureType};
use lofty::tag::Tag;
use lofty::config::WriteOptions;

use super::client::BeatportClient;
use super::error::BeatportError;
use super::models::{BeatportTags, FixTagsResult};

/// Tagger que aplica metadatos de Beatport a archivos locales
pub struct BeatportTagger {
    client: Arc<BeatportClient>,
}

impl BeatportTagger {
    /// Crea una nueva instancia del tagger
    pub fn new(client: Arc<BeatportClient>) -> Self {
        Self { client }
    }

    /// Crea un tagger con un cliente nuevo
    pub fn with_new_client() -> Result<Self, BeatportError> {
        let client = BeatportClient::new()?;
        Ok(Self { client: Arc::new(client) })
    }

    /// Arregla los tags de un track individual
    /// 
    /// # Arguments
    /// * `track_id` - ID del track en la base de datos Symphony
    /// * `file_path` - Ruta al archivo de audio
    /// * `current_title` - Título actual del track
    /// * `current_artist` - Artista actual del track
    /// * `current_duration` - Duración actual en segundos (mejora precisión del matching)
    /// * `current_bpm` - BPM actual (si existe)
    /// * `current_key` - Key actual (se reemplazará siempre)
    /// * `current_genre` - Género actual (si existe)
    /// * `current_album` - Álbum actual (si existe)
    /// * `current_year` - Año actual (si existe)
    #[allow(clippy::too_many_arguments)]
    pub async fn fix_track(
        &self,
        track_id: &str,
        file_path: &Path,
        current_title: &str,
        current_artist: &str,
        current_duration: Option<f64>,
        current_bpm: Option<f64>,
        _current_key: Option<&str>, // Se ignora, siempre aplicamos
        current_genre: Option<&str>,
        current_album: Option<&str>,
        current_year: Option<i32>,
    ) -> FixTagsResult {
        // 1. Buscar el mejor match en Beatport (usando duración para mejor precisión)
        let beatport_track = match self.client.find_best_match(current_title, current_artist, current_duration).await {
            Ok(track) => track,
            Err(e) => return FixTagsResult::error(track_id.to_string(), e.to_string()),
        };

        // 2. Extraer tags de Beatport
        let mut beatport_tags = BeatportTags::from(&beatport_track);

        // 3. Descargar artwork si está disponible
        if let Some(ref url) = beatport_tags.artwork_url {
            match self.client.download_artwork(url).await {
                Ok(data) => beatport_tags.artwork_data = Some(data),
                Err(e) => {
                    // Log pero no fallar - artwork es opcional
                    eprintln!("Warning: No se pudo descargar artwork: {}", e);
                }
            }
        }

        // 4. Aplicar lógica de merge
        let merged_tags = self.merge_tags(
            &beatport_tags,
            current_bpm,
            current_genre,
            current_album,
            current_year,
        );

        // 5. Escribir tags al archivo
        match self.write_tags(file_path, &merged_tags) {
            Ok(()) => FixTagsResult::success(
                track_id.to_string(),
                beatport_track.id,
                merged_tags,
            ),
            Err(e) => FixTagsResult::error(track_id.to_string(), e.to_string()),
        }
    }

    /// Aplica la lógica de merge de tags
    /// 
    /// Reglas:
    /// - BPM: Se ignora si local tiene valor
    /// - Key: Siempre se aplica
    /// - Genre, Album, Year, Label, ISRC: Se aplican si local está vacío
    /// - Artwork: Siempre se aplica si está disponible
    fn merge_tags(
        &self,
        beatport: &BeatportTags,
        local_bpm: Option<f64>,
        local_genre: Option<&str>,
        local_album: Option<&str>,
        local_year: Option<i32>,
    ) -> BeatportTags {
        BeatportTags {
            // BPM: Solo si local no tiene
            bpm: if local_bpm.is_some() { None } else { beatport.bpm },
            // Key: Siempre se aplica
            key: beatport.key.clone(),
            // Genre: Solo si local no tiene
            genre: if local_genre.is_some() && !local_genre.unwrap().is_empty() { 
                None 
            } else { 
                beatport.genre.clone() 
            },
            // Album: Solo si local no tiene
            album: if local_album.is_some() && !local_album.unwrap().is_empty() { 
                None 
            } else { 
                beatport.album.clone() 
            },
            // Year: Solo si local no tiene
            year: if local_year.is_some() { None } else { beatport.year },
            // Label: Siempre se aplica (generalmente no hay en local)
            label: beatport.label.clone(),
            // ISRC: Siempre se aplica (generalmente no hay en local)
            isrc: beatport.isrc.clone(),
            // Catalog: Siempre se aplica
            catalog_number: beatport.catalog_number.clone(),
            // Artwork: Siempre se aplica si disponible
            artwork_url: beatport.artwork_url.clone(),
            artwork_data: beatport.artwork_data.clone(),
        }
    }

    /// Busca y aplica SOLO el artwork de un track (sin modificar otros tags)
    /// 
    /// # Arguments
    /// * `track_id` - ID del track en la base de datos Symphony
    /// * `file_path` - Ruta al archivo de audio
    /// * `current_title` - Título actual del track
    /// * `current_artist` - Artista actual del track
    /// * `current_duration` - Duración actual en segundos (mejora precisión del matching)
    pub async fn find_artwork_only(
        &self,
        track_id: &str,
        file_path: &Path,
        current_title: &str,
        current_artist: &str,
        current_duration: Option<f64>,
    ) -> FixTagsResult {
        // 1. Buscar el mejor match en Beatport
        let beatport_track = match self.client.find_best_match(current_title, current_artist, current_duration).await {
            Ok(track) => track,
            Err(e) => return FixTagsResult::error(track_id.to_string(), e.to_string()),
        };

        // 2. Obtener URL del artwork
        let artwork_url = beatport_track.get_artwork_url(500);
        
        if artwork_url.is_none() {
            return FixTagsResult::error(
                track_id.to_string(),
                "Track encontrado pero sin artwork disponible".to_string()
            );
        }

        // 3. Descargar artwork
        let artwork_data = match self.client.download_artwork(artwork_url.as_ref().unwrap()).await {
            Ok(data) => data,
            Err(e) => return FixTagsResult::error(track_id.to_string(), format!("Error descargando artwork: {}", e)),
        };

        // 4. Escribir solo el artwork al archivo
        match self.write_artwork_only(file_path, &artwork_data) {
            Ok(()) => {
                // Crear tags con solo artwork para el resultado
                let tags = BeatportTags {
                    bpm: None,
                    key: None,
                    genre: None,
                    label: None,
                    album: None,
                    year: None,
                    isrc: None,
                    catalog_number: None,
                    artwork_url,
                    artwork_data: Some(artwork_data),
                };
                FixTagsResult::success(track_id.to_string(), beatport_track.id, tags)
            }
            Err(e) => FixTagsResult::error(track_id.to_string(), e.to_string()),
        }
    }

    /// Escribe SOLO el artwork al archivo de audio (sin tocar otros tags)
    fn write_artwork_only(&self, file_path: &Path, artwork_data: &[u8]) -> Result<(), BeatportError> {
        // Abrir el archivo para lectura/escritura
        let mut tagged_file = lofty::read_from_path(file_path)?;
        
        // Obtener o crear el tag primario
        let tag = match tagged_file.primary_tag_mut() {
            Some(t) => t,
            None => {
                let file_type = tagged_file.file_type();
                tagged_file.insert_tag(Tag::new(file_type.primary_tag_type()));
                tagged_file.primary_tag_mut()
                    .ok_or_else(|| BeatportError::TagWriteError("No se pudo crear tag".to_string()))?
            }
        };

        // Detectar tipo MIME
        let mime_type = detect_image_mime(artwork_data);
        
        // Crear la imagen
        let picture = Picture::new_unchecked(
            PictureType::CoverFront,
            Some(mime_type),
            None,
            artwork_data.to_vec(),
        );

        // Eliminar artwork existente y agregar el nuevo
        tag.remove_picture_type(PictureType::CoverFront);
        tag.push_picture(picture);

        // Guardar el archivo
        tag.save_to_path(file_path, WriteOptions::default())?;

        Ok(())
    }

    /// Escribe los tags al archivo de audio usando lofty
    fn write_tags(&self, file_path: &Path, tags: &BeatportTags) -> Result<(), BeatportError> {
        // Abrir el archivo para lectura/escritura
        let mut tagged_file = lofty::read_from_path(file_path)?;
        
        // Obtener o crear el tag primario
        let tag = match tagged_file.primary_tag_mut() {
            Some(t) => t,
            None => {
                // Si no hay tag, intentar crear uno
                let file_type = tagged_file.file_type();
                tagged_file.insert_tag(Tag::new(file_type.primary_tag_type()));
                tagged_file.primary_tag_mut()
                    .ok_or_else(|| BeatportError::TagWriteError("No se pudo crear tag".to_string()))?
            }
        };

        // Aplicar tags solo si tienen valor y hay algo que escribir
        if let Some(bpm) = tags.bpm {
            // Escribir BPM como string en el frame BPM
            tag.insert_text(ItemKey::Bpm, bpm.round().to_string());
        }

        if let Some(ref key) = tags.key {
            tag.insert_text(ItemKey::InitialKey, key.clone());
        }

        if let Some(ref genre) = tags.genre {
            tag.set_genre(genre.clone());
        }

        if let Some(ref album) = tags.album {
            tag.set_album(album.clone());
        }

        if let Some(year) = tags.year {
            tag.set_year(year as u32);
        }

        if let Some(ref label) = tags.label {
            tag.insert_text(ItemKey::Label, label.clone());
        }

        if let Some(ref isrc) = tags.isrc {
            tag.insert_text(ItemKey::Isrc, isrc.clone());
        }

        if let Some(ref catalog) = tags.catalog_number {
            tag.insert_text(ItemKey::CatalogNumber, catalog.clone());
        }

        // Aplicar artwork si está disponible
        if let Some(ref artwork_data) = tags.artwork_data {
            // Detectar tipo MIME
            let mime_type = detect_image_mime(artwork_data);
            
            // Crear la imagen
            let picture = Picture::new_unchecked(
                PictureType::CoverFront,
                Some(mime_type),
                None, // Descripción
                artwork_data.clone(),
            );

            // Eliminar artwork existente y agregar el nuevo
            tag.remove_picture_type(PictureType::CoverFront);
            tag.push_picture(picture);
        }

        // Guardar el archivo
        tag.save_to_path(file_path, WriteOptions::default())?;

        Ok(())
    }
}

/// Detecta el tipo MIME de una imagen basándose en los magic bytes
fn detect_image_mime(data: &[u8]) -> MimeType {
    if data.len() < 4 {
        return MimeType::Jpeg;
    }

    // JPEG: FF D8 FF
    if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return MimeType::Jpeg;
    }

    // PNG: 89 50 4E 47
    if data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        return MimeType::Png;
    }

    // GIF: 47 49 46
    if data.starts_with(&[0x47, 0x49, 0x46]) {
        return MimeType::Gif;
    }

    // WebP: 52 49 46 46 ... 57 45 42 50
    if data.len() >= 12 && data.starts_with(&[0x52, 0x49, 0x46, 0x46]) && &data[8..12] == &[0x57, 0x45, 0x42, 0x50] {
        // lofty no tiene WebP, usar Unknown
        return MimeType::Unknown("image/webp".to_string());
    }

    // BMP: 42 4D
    if data.starts_with(&[0x42, 0x4D]) {
        return MimeType::Bmp;
    }

    // Default a JPEG
    MimeType::Jpeg
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_tags_bpm_preserved() {
        let tagger = BeatportTagger::with_new_client().unwrap();
        let beatport = BeatportTags {
            bpm: Some(128.0),
            key: Some("A minor".to_string()),
            genre: Some("Techno".to_string()),
            label: None,
            album: None,
            year: Some(2024),
            isrc: None,
            catalog_number: None,
            artwork_url: None,
            artwork_data: None,
        };

        // Si local tiene BPM, se ignora el de Beatport
        let merged = tagger.merge_tags(&beatport, Some(125.0), None, None, None);
        assert!(merged.bpm.is_none()); // BPM de Beatport no se aplica
        assert_eq!(merged.key, Some("A minor".to_string())); // Key siempre se aplica
    }

    #[test]
    fn test_merge_tags_bpm_applied() {
        let tagger = BeatportTagger::with_new_client().unwrap();
        let beatport = BeatportTags {
            bpm: Some(128.0),
            key: Some("A minor".to_string()),
            genre: None,
            label: None,
            album: None,
            year: None,
            isrc: None,
            catalog_number: None,
            artwork_url: None,
            artwork_data: None,
        };

        // Si local NO tiene BPM, se aplica el de Beatport
        let merged = tagger.merge_tags(&beatport, None, None, None, None);
        assert_eq!(merged.bpm, Some(128.0));
    }

    #[test]
    fn test_merge_tags_key_always_applied() {
        let tagger = BeatportTagger::with_new_client().unwrap();
        let beatport = BeatportTags {
            bpm: None,
            key: Some("8A".to_string()),
            genre: None,
            label: None,
            album: None,
            year: None,
            isrc: None,
            catalog_number: None,
            artwork_url: None,
            artwork_data: None,
        };

        // Key siempre se aplica, independiente del valor local
        let merged = tagger.merge_tags(&beatport, None, None, None, None);
        assert_eq!(merged.key, Some("8A".to_string()));
    }

    #[test]
    fn test_merge_tags_genre_preserved() {
        let tagger = BeatportTagger::with_new_client().unwrap();
        let beatport = BeatportTags {
            bpm: None,
            key: None,
            genre: Some("Techno".to_string()),
            label: None,
            album: None,
            year: None,
            isrc: None,
            catalog_number: None,
            artwork_url: None,
            artwork_data: None,
        };

        // Si local tiene género, no se aplica el de Beatport
        let merged = tagger.merge_tags(&beatport, None, Some("House"), None, None);
        assert!(merged.genre.is_none());

        // Si local no tiene género, se aplica el de Beatport
        let merged2 = tagger.merge_tags(&beatport, None, None, None, None);
        assert_eq!(merged2.genre, Some("Techno".to_string()));
    }

    #[test]
    fn test_detect_image_mime_jpeg() {
        let jpeg_data = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
        assert!(matches!(detect_image_mime(&jpeg_data), MimeType::Jpeg));
    }

    #[test]
    fn test_detect_image_mime_png() {
        let png_data = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        assert!(matches!(detect_image_mime(&png_data), MimeType::Png));
    }
}
