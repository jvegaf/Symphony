/// Escritura de tags y artwork a archivos de audio usando lofty
/// 
/// Este módulo maneja la escritura física de metadatos a archivos de audio,
/// detectando automáticamente el formato y aplicando los tags apropiados.

use std::path::Path;

use lofty::config::WriteOptions;
use lofty::picture::{MimeType, Picture, PictureType};
use lofty::prelude::{Accessor, ItemKey, TagExt, TaggedFileExt};
use lofty::tag::Tag;

use super::super::error::BeatportError;
use super::super::models::BeatportTags;

/// Escribe SOLO el artwork al archivo de audio (sin tocar otros tags)
pub fn write_artwork_only(file_path: &Path, artwork_data: &[u8]) -> Result<(), BeatportError> {
    // Abrir el archivo para lectura/escritura
    let mut tagged_file = lofty::read_from_path(file_path)?;

    // Obtener o crear el tag primario
    let tag = match tagged_file.primary_tag_mut() {
        Some(t) => t,
        None => {
            let file_type = tagged_file.file_type();
            tagged_file.insert_tag(Tag::new(file_type.primary_tag_type()));
            tagged_file.primary_tag_mut().ok_or_else(|| {
                BeatportError::TagWriteError("No se pudo crear tag".to_string())
            })?
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
pub fn write_tags(file_path: &Path, tags: &BeatportTags) -> Result<(), BeatportError> {
    // Abrir el archivo para lectura/escritura
    let mut tagged_file = lofty::read_from_path(file_path)?;

    // Obtener o crear el tag primario
    let tag = match tagged_file.primary_tag_mut() {
        Some(t) => t,
        None => {
            // Si no hay tag, intentar crear uno
            let file_type = tagged_file.file_type();
            tagged_file.insert_tag(Tag::new(file_type.primary_tag_type()));
            tagged_file.primary_tag_mut().ok_or_else(|| {
                BeatportError::TagWriteError("No se pudo crear tag".to_string())
            })?
        }
    };

    // Aplicar tags solo si tienen valor y hay algo que escribir
    if let Some(ref title) = tags.title {
        tag.set_title(title.clone());
    }

    if let Some(ref artist) = tags.artist {
        tag.set_artist(artist.clone());
    }

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
    if data.len() >= 12
        && data.starts_with(&[0x52, 0x49, 0x46, 0x46])
        && &data[8..12] == &[0x57, 0x45, 0x42, 0x50]
    {
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
