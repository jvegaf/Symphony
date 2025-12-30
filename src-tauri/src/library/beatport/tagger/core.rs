/// Core del BeatportTagger con métodos principales de búsqueda y aplicación
///
/// Este módulo contiene la estructura principal BeatportTagger y sus métodos
/// públicos para buscar tracks en Beatport y aplicar tags.

use std::path::Path;
use std::sync::Arc;

use super::super::client::BeatportClient;
use super::super::error::BeatportError;
use super::super::models::{BeatportTags, BeatportTrack, FixTagsResult};
use super::merge::merge_tags;
use super::writer::{write_artwork_only, write_tags};

/// Tagger que aplica metadatos de Beatport a archivos locales
pub struct BeatportTagger {
    pub(super) client: Arc<BeatportClient>,
}

impl BeatportTagger {
    /// Crea una nueva instancia del tagger
    pub fn new(client: Arc<BeatportClient>) -> Self {
        Self { client }
    }

    /// Crea un tagger con un cliente nuevo
    pub fn with_new_client() -> Result<Self, BeatportError> {
        let client = BeatportClient::new()?;
        Ok(Self {
            client: Arc::new(client),
        })
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
        let beatport_track = match self
            .client
            .find_best_match(current_title, current_artist, current_duration)
            .await
        {
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
        let merged_tags =
            merge_tags(&beatport_tags, current_bpm, current_genre, current_album, current_year);

        // 5. Escribir tags al archivo
        match write_tags(file_path, &merged_tags) {
            Ok(()) => FixTagsResult::success(track_id.to_string(), beatport_track.id, merged_tags),
            Err(e) => FixTagsResult::error(track_id.to_string(), e.to_string()),
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
        let beatport_track = match self
            .client
            .find_best_match(current_title, current_artist, current_duration)
            .await
        {
            Ok(track) => track,
            Err(e) => return FixTagsResult::error(track_id.to_string(), e.to_string()),
        };

        // 2. Obtener URL del artwork
        let artwork_url = beatport_track.get_artwork_url(500);

        if artwork_url.is_none() {
            return FixTagsResult::error(
                track_id.to_string(),
                "Track encontrado pero sin artwork disponible".to_string(),
            );
        }

        // 3. Descargar artwork
        let artwork_data = match self
            .client
            .download_artwork(artwork_url.as_ref().unwrap())
            .await
        {
            Ok(data) => data,
            Err(e) => {
                return FixTagsResult::error(
                    track_id.to_string(),
                    format!("Error descargando artwork: {}", e),
                )
            }
        };

        // 4. Escribir solo el artwork al archivo
        match write_artwork_only(file_path, &artwork_data) {
            Ok(()) => {
                // Crear tags con solo artwork para el resultado
                let tags = BeatportTags {
                    title: None,
                    artist: None,
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

    /// Aplica los tags de un track de Beatport ya obtenido (sin búsqueda)
    ///
    /// Este método se usa cuando el usuario ha seleccionado manualmente
    /// un candidato de Beatport y queremos aplicar sus tags.
    ///
    /// # Arguments
    /// * `track_id` - ID del track en la base de datos Symphony
    /// * `file_path` - Ruta al archivo de audio
    /// * `beatport_track` - Track de Beatport con los datos a aplicar
    /// * `current_bpm` - BPM actual del track local (para decidir si sobrescribir)
    pub async fn apply_tags_from_track(
        &self,
        track_id: &str,
        file_path: &Path,
        beatport_track: &BeatportTrack,
        current_bpm: Option<f64>,
    ) -> FixTagsResult {
        // 1. Extraer tags de Beatport
        let mut beatport_tags = BeatportTags::from(beatport_track);

        // 2. Descargar artwork si está disponible
        if let Some(ref url) = beatport_tags.artwork_url {
            match self.client.download_artwork(url).await {
                Ok(data) => beatport_tags.artwork_data = Some(data),
                Err(e) => {
                    eprintln!("Warning: No se pudo descargar artwork: {}", e);
                }
            }
        }

        // 3. Aplicar lógica de merge (respeta BPM local si existe)
        let merged_tags = merge_tags(
            &beatport_tags,
            current_bpm,
            None, // genre - siempre aplicamos de Beatport
            None, // album - siempre aplicamos de Beatport
            None, // year - siempre aplicamos de Beatport
        );

        // 4. Escribir tags al archivo
        match write_tags(file_path, &merged_tags) {
            Ok(()) => FixTagsResult::success(track_id.to_string(), beatport_track.id, merged_tags),
            Err(e) => FixTagsResult::error(track_id.to_string(), e.to_string()),
        }
    }
}
