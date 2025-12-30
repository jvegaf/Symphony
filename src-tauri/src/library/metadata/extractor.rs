use super::super::error::{LibraryError, Result};
use super::helpers::*;
use super::models::TrackMetadata;
use lofty::config::ParseOptions;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::Accessor;
use std::path::Path;

/// Extractor de metadatos de archivos de audio usando lofty
///
/// AIDEV-NOTE: Equivalente Rust de SongCreator en Python
/// Soporta lectura de ID3v2, ID3v1, APEv2, Vorbis Comments, MP4 atoms
pub struct MetadataExtractor;

impl MetadataExtractor {
    /// Crea un nuevo extractor de metadatos
    pub fn new() -> Self {
        Self
    }

    /// Extrae metadatos de un archivo de audio usando lofty
    ///
    /// # Arguments
    /// * `path` - Ruta al archivo de audio
    ///
    /// # Returns
    /// Estructura TrackMetadata con todos los metadatos disponibles
    ///
    /// # Errors
    /// Retorna error si:
    /// - El archivo no existe
    /// - El formato no está soportado
    /// - Hay error al leer tags
    pub fn extract_metadata(&self, path: &Path) -> Result<TrackMetadata> {
        // Validar que el archivo existe
        if !path.exists() {
            return Err(LibraryError::MetadataExtractionFailed(format!(
                "File not found: {}",
                path.display()
            )));
        }

        // Leer archivo con lofty (auto-detecta formato)
        let parse_options = ParseOptions::new();

        let tagged_file = Probe::open(path)
            .map_err(|e| LibraryError::MetadataExtractionFailed(e.to_string()))?
            .options(parse_options)
            .read()
            .map_err(|e| LibraryError::MetadataExtractionFailed(e.to_string()))?;

        // Extraer propiedades de audio (duración, bitrate, etc.)
        let properties = tagged_file.properties();
        let duration = properties.duration().as_secs_f64();
        let bitrate = properties.audio_bitrate().unwrap_or(0) as i32;
        let sample_rate = properties.sample_rate().unwrap_or(44100);
        let channels = properties.channels().unwrap_or(2) as u16;

        // Obtener formato
        let format = path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("unknown")
            .to_lowercase();

        // Obtener tag primario (preferir ID3v2 > Vorbis > APE > ID3v1)
        let tag = tagged_file
            .primary_tag()
            .or_else(|| tagged_file.first_tag());

        // Extraer rating de ID3v2 (POPM frame) si está disponible
        // AIDEV-NOTE: Usamos id3 crate directamente porque lofty no expone POPM frames
        let rating = get_rating_from_mp3_file(path);

        // Extraer metadatos de tags
        let (title, artist, album, year, genre, mut bpm, key, comment) = if let Some(tag) = tag {
            (
                get_title(path, tag),
                get_artist(tag),
                tag.album().as_deref().map(String::from),
                get_year(tag),
                tag.genre().as_deref().map(String::from),
                get_bpm(tag),
                get_key(tag),
                tag.comment().as_deref().map(String::from),
            )
        } else {
            // Sin tags, usar filename como título
            (
                get_title_from_filename(path),
                None,
                None,
                None,
                None,
                None,
                None,
                None,
            )
        };

        // Fallback: Si lofty no pudo extraer BPM y es MP3, intentar con id3 crate
        if bpm.is_none() && format == "mp3" {
            bpm = get_bpm_from_mp3_file(path);
        }

        Ok(TrackMetadata {
            path: path.to_string_lossy().to_string(),
            title,
            artist,
            album,
            year,
            genre,
            bpm,
            key,
            rating,
            comment,
            duration,
            bitrate,
            sample_rate,
            channels,
            format,
            artwork: None, // TODO: Extraer artwork en futuro
        })
    }

    /// Extrae metadatos de múltiples archivos
    /// Continúa con el siguiente archivo si uno falla
    #[allow(dead_code)]
    pub fn extract_metadata_batch(&self, paths: &[impl AsRef<Path>]) -> Vec<Result<TrackMetadata>> {
        paths
            .iter()
            .map(|path| self.extract_metadata(path.as_ref()))
            .collect()
    }
}

impl Default for MetadataExtractor {
    fn default() -> Self {
        Self::new()
    }
}
