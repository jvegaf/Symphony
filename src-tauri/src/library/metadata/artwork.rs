use super::super::error::{LibraryError, Result};
use base64::Engine;
use lofty::config::ParseOptions;
use lofty::file::TaggedFileExt;
use lofty::picture::{Picture, PictureType};
use lofty::probe::Probe;
use std::path::Path;

/// Extrae el artwork (imagen de portada) de un archivo de audio
///
/// AIDEV-NOTE: Busca la imagen embedded en el archivo usando lofty.
/// Prioriza portada frontal (CoverFront) pero acepta cualquier tipo.
/// Retorna la imagen como base64 con prefijo data URI para uso directo en <img src>.
///
/// # Arguments
/// * `path` - Ruta al archivo de audio
///
/// # Returns
/// - `Ok(Some(base64_data_uri))` si hay artwork
/// - `Ok(None)` si no hay artwork
/// - `Err` si hay error leyendo el archivo
pub fn extract_artwork(path: &Path) -> Result<Option<String>> {
    // Validar que el archivo existe
    if !path.exists() {
        return Err(LibraryError::MetadataExtractionFailed(format!(
            "File not found: {}",
            path.display()
        )));
    }

    // Leer archivo con lofty
    let parse_options = ParseOptions::new();
    let tagged_file = Probe::open(path)
        .map_err(|e| LibraryError::MetadataExtractionFailed(e.to_string()))?
        .options(parse_options)
        .read()
        .map_err(|e| LibraryError::MetadataExtractionFailed(e.to_string()))?;

    // Buscar en todos los tags disponibles
    for tag in tagged_file.tags() {
        let pictures: &[Picture] = tag.pictures();

        // Primero buscar portada frontal
        for pic in pictures {
            if pic.pic_type() == PictureType::CoverFront {
                let base64_data = picture_to_data_uri(pic);
                return Ok(Some(base64_data));
            }
        }

        // Si no hay portada frontal, usar la primera imagen disponible
        if let Some(pic) = pictures.first() {
            let base64_data = picture_to_data_uri(pic);
            return Ok(Some(base64_data));
        }
    }

    Ok(None)
}

/// Convierte una imagen (Picture) a data URI base64
pub fn picture_to_data_uri(picture: &lofty::picture::Picture) -> String {
    let mime_type = picture.mime_type().map(|m| m.as_str()).unwrap_or("image/jpeg");
    let base64_data = base64::engine::general_purpose::STANDARD.encode(picture.data());
    format!("data:{};base64,{}", mime_type, base64_data)
}
