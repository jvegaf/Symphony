use super::super::error::{LibraryError, Result};
use super::helpers::get_preferred_tag_type;
use super::models::TrackMetadata;
use id3::TagLike; // Needed for remove() and add_frame() methods
use lofty::config::{ParseOptions, WriteOptions};
use lofty::file::{AudioFile, TaggedFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::{Accessor, ItemKey, Tag, TagType};
use std::path::Path;

/// Escribe metadatos a un archivo de audio
/// Replica el comportamiento de SongUpdater.update_song_from_tag() en Python
///
/// # Arguments
/// * `path` - Ruta al archivo de audio
/// * `metadata` - Metadatos a escribir
///
/// # Errors
/// Retorna error si:
/// - El archivo no existe
/// - No se puede escribir al archivo
/// - El formato no soporta escritura
pub fn write_metadata(path: &Path, metadata: &TrackMetadata) -> Result<()> {
    // Leer archivo existente
    let parse_options = ParseOptions::new().read_properties(false);

    let mut tagged_file: TaggedFile = Probe::open(path)
        .map_err(|e: lofty::error::LoftyError| {
            LibraryError::MetadataExtractionFailed(e.to_string())
        })?
        .options(parse_options)
        .read()
        .map_err(|e: lofty::error::LoftyError| {
            LibraryError::MetadataExtractionFailed(e.to_string())
        })?;

    // Obtener o crear tag (preferir ID3v2 para MP3)
    let tag = match tagged_file.primary_tag_mut() {
        Some(t) => t,
        None => {
            // Crear nuevo tag apropiado para el formato
            let file_type = tagged_file.file_type();
            let tag_type = get_preferred_tag_type(file_type);
            tagged_file.insert_tag(Tag::new(tag_type));
            tagged_file.primary_tag_mut().unwrap()
        }
    };

    // Escribir campos
    if let Some(ref title) = metadata.title {
        tag.set_title(title.clone());
    }
    if let Some(ref artist) = metadata.artist {
        tag.set_artist(artist.clone());
    }
    if let Some(ref album) = metadata.album {
        tag.set_album(album.clone());
    }
    if let Some(year) = metadata.year {
        tag.set_year(year as u32);
    }
    if let Some(ref genre) = metadata.genre {
        tag.set_genre(genre.clone());
    }
    if let Some(ref comment) = metadata.comment {
        tag.set_comment(comment.clone());
    }

    // BPM y Key requieren ItemKey específicos
    if let Some(bpm) = metadata.bpm {
        tag.insert_text(ItemKey::Bpm, bpm.to_string());
    }
    if let Some(ref key) = metadata.key {
        tag.insert_text(ItemKey::InitialKey, key.clone());
    }

    // Guardar cambios al archivo (tags estándar)
    let write_options = WriteOptions::default();
    tagged_file
        .save_to_path(path, write_options)
        .map_err(|e: lofty::error::LoftyError| {
            LibraryError::MetadataExtractionFailed(format!("Failed to write metadata: {}", e))
        })?;

    // Escribir rating (POPM frame) para archivos MP3/ID3v2
    // AIDEV-NOTE: Hacemos esto DESPUÉS de lofty save para evitar que se sobreescriba
    // Usamos id3 crate porque lofty no maneja correctamente frames POPM
    if let Some(rating_stars) = metadata.rating {
        write_rating_to_mp3_file(path, rating_stars)?;
    }

    Ok(())
}

/// Escribe rating al tag ID3v2 usando frame POPM con id3 crate
/// Replica el comportamiento de UpdateTrackRating en TypeScript
///
/// AIDEV-NOTE: Algoritmo compatible con Traktor Native Instruments
/// - Input: rating_stars (0-5)
/// - POPM value: Math.round((rating_stars / 5) * 255)
/// - Email: traktor@native-instruments.de (mismo que usa Traktor Pro)
/// - Counter: 0 (siempre, no usamos el contador de plays del POPM)
///
///   Ver RATING_IMPLEMENTATION.md para detalles completos
///
/// # Arguments
/// * `path` - Ruta al archivo MP3
/// * `rating_stars` - Valor de rating en estrellas (0-5)
pub fn write_rating_to_mp3_file(path: &Path, rating_stars: i32) -> Result<()> {
    // Verificar que sea un archivo MP3
    if let Some(ext) = path.extension() {
        if ext.to_str().unwrap_or("").to_lowercase() != "mp3" {
            return Ok(()); // Silenciosamente ignorar otros formatos por ahora
        }
    } else {
        return Ok(());
    }

    // Leer tag existente o crear uno nuevo
    let mut tag = id3::Tag::read_from_path(path).unwrap_or_else(|_| id3::Tag::new());

    // Validar y clampear rango de estrellas
    let clamped_rating = rating_stars.clamp(0, 5);

    // Convertir estrellas (0-5) a POPM (0-255) usando algoritmo de Traktor/TypeScript
    let popm_value = (((clamped_rating as f32 / 5.0) * 255.0).round() as i32).min(255) as u8;

    // Eliminar frames POPM existentes para evitar duplicados
    tag.remove("POPM");

    // Agregar nuevo frame POPM
    let popm_frame = id3::frame::Popularimeter {
        user: "traktor@native-instruments.de".to_string(),
        rating: popm_value,
        counter: 0,
    };
    tag.add_frame(popm_frame);

    // Escribir tag al archivo (preservando ID3v2.3 si existe, usando v2.4 para nuevos)
    tag.write_to_path(path, id3::Version::Id3v24).map_err(|e| {
        LibraryError::MetadataExtractionFailed(format!(
            "Failed to write rating to {}: {}",
            path.display(),
            e
        ))
    })?;

    Ok(())
}
