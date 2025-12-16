use std::path::Path;
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::config::{ParseOptions, WriteOptions};
use lofty::tag::{Accessor, ItemKey, Tag, TagType};
use lofty::file::{AudioFile, TaggedFile, TaggedFileExt};
use super::error::{LibraryError, Result};

/// Metadatos extraídos de un archivo de audio
/// 
/// AIDEV-NOTE: Esta estructura replica los campos que extraíamos en Python con mutagen/TinyTag
/// Soporta lectura y escritura de tags ID3v2 (MP3), MP4 (M4A), Vorbis, APE, etc.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackMetadata {
    /// Ruta completa del archivo
    pub path: String,
    
    /// Título de la pista
    pub title: Option<String>,
    
    /// Artista
    pub artist: Option<String>,
    
    /// Álbum
    pub album: Option<String>,
    
    /// Año de lanzamiento
    pub year: Option<i32>,
    
    /// Género musical
    pub genre: Option<String>,
    
    /// BPM (beats por minuto) - extraído de tag TBPM/tmpo
    pub bpm: Option<i32>,
    
    /// Tonalidad musical (Initial Key) - extraído de tag TKEY/key
    pub key: Option<String>,
    
    /// Rating/Popularidad (0-255 en POPM, normalizado a 0-5 para UI)
    pub rating: Option<i32>,
    
    /// Comentarios
    pub comment: Option<String>,
    
    /// Duración en segundos
    pub duration: f64,
    
    /// Bitrate en kbps
    pub bitrate: i32,
    
    /// Sample rate en Hz
    pub sample_rate: u32,
    
    /// Número de canales
    pub channels: u16,
    
    /// Formato de audio (mp3, flac, wav, etc.)
    pub format: String,
    
    /// Artwork (imagen de portada) en base64
    pub artwork: Option<String>,
}

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
            return Err(LibraryError::MetadataExtractionFailed(
                format!("File not found: {}", path.display())
            ));
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
        let format = path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("unknown")
            .to_lowercase();

        // Obtener tag primario (preferir ID3v2 > Vorbis > APE > ID3v1)
        let tag = tagged_file.primary_tag()
            .or_else(|| tagged_file.first_tag());

        // Extraer metadatos de tags
        let (title, artist, album, year, genre, bpm, key, rating, comment) = if let Some(tag) = tag {
            (
                Self::get_title(path, tag),
                tag.artist().as_deref().map(String::from),
                tag.album().as_deref().map(String::from),
                Self::get_year(tag),
                tag.genre().as_deref().map(String::from),
                Self::get_bpm(tag),
                Self::get_key(tag),
                Self::get_rating(tag),
                tag.comment().as_deref().map(String::from),
            )
        } else {
            // Sin tags, usar filename como título
            (
                Self::get_title_from_filename(path),
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
            )
        };

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

    /// Obtiene el título del tag o del filename como fallback
    /// Replica el comportamiento de _get_title() en Python
    fn get_title(path: &Path, tag: &Tag) -> Option<String> {
        tag.title()
            .as_deref()
            .filter(|t| !t.is_empty())
            .map(String::from)
            .or_else(|| Self::get_title_from_filename(path))
    }

    /// Extrae título del nombre del archivo (fallback cuando no hay tag)
    fn get_title_from_filename(path: &Path) -> Option<String> {
        path.file_stem()
            .and_then(|name| name.to_str())
            .map(|s| s.to_string())
    }

    /// Extrae año del tag TDRC (ID3v2.4) o TYER (ID3v2.3)
    /// Replica el comportamiento de _get_year() en Python
    fn get_year(tag: &Tag) -> Option<i32> {
        tag.year()
            .and_then(|y| if y > 0 { Some(y as i32) } else { None })
    }

    /// Extrae BPM del tag TBPM (ID3v2) o tmpo (MP4)
    /// Replica el comportamiento de _get_bpm() en Python
    fn get_bpm(tag: &Tag) -> Option<i32> {
        // Buscar en items del tag por clave "BPM" o "TBPM"
        if let Some(bpm_str) = tag.get_string(&ItemKey::Bpm) {
            if let Ok(bpm) = bpm_str.parse::<i32>() {
                if bpm > 0 {
                    return Some(bpm);
                }
            }
        }
        None
    }

    /// Extrae tonalidad musical del tag TKEY (ID3v2) o clave (MP4)
    /// Replica el comportamiento de _get_key() en Python
    fn get_key(tag: &Tag) -> Option<String> {
        tag.get_string(&ItemKey::InitialKey)
            .map(|s| s.to_string())
    }

    /// Extrae rating del tag POPM (Popularimeter en ID3v2)
    /// Replica el comportamiento de _get_rating() en Python
    /// 
    /// AIDEV-NOTE: POPM rating está en rango 0-255, normalizamos a 0-5 para consistencia con UI
    /// Mapeo: 0=0★, 1-51=1★, 52-102=2★, 103-153=3★, 154-204=4★, 205-255=5★
    fn get_rating(_tag: &Tag) -> Option<i32> {
        // lofty no expone POPM directamente en la API simple
        // Por ahora retornar None, implementar en próxima iteración
        // TODO: Implementar extracción de POPM frame
        None
    }

    /// Extrae metadatos de múltiples archivos
    /// Continúa con el siguiente archivo si uno falla
    #[allow(dead_code)]
    pub fn extract_metadata_batch(&self, paths: &[impl AsRef<Path>]) -> Vec<Result<TrackMetadata>> {
        paths.iter()
            .map(|path| self.extract_metadata(path.as_ref()))
            .collect()
    }

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
    pub fn write_metadata(&self, path: &Path, metadata: &TrackMetadata) -> Result<()> {
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
                let tag_type = Self::get_preferred_tag_type(file_type);
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

        // TODO: Implementar escritura de rating (POPM frame)

        // Guardar cambios al archivo
        let write_options = WriteOptions::default();
        tagged_file.save_to_path(path, write_options)
            .map_err(|e: lofty::error::LoftyError| {
                LibraryError::MetadataExtractionFailed(
                    format!("Failed to write metadata: {}", e)
                )
            })?;

        Ok(())
    }

    /// Determina el tipo de tag preferido para un tipo de archivo
    fn get_preferred_tag_type(file_type: lofty::file::FileType) -> TagType {
        use lofty::file::FileType;
        match file_type {
            FileType::Mpeg => TagType::Id3v2,
            FileType::Mp4 => TagType::Mp4Ilst,
            FileType::Flac => TagType::VorbisComments,
            FileType::Opus => TagType::VorbisComments,
            FileType::Vorbis => TagType::VorbisComments,
            FileType::Wav => TagType::RiffInfo,
            _ => TagType::Id3v2, // Fallback
        }
    }
}

impl Default for MetadataExtractor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // Helper: Crea un archivo WAV válido usando hound
    fn create_test_wav(path: &Path) {
        use hound::{WavSpec, WavWriter};
        
        let spec = WavSpec {
            channels: 2,
            sample_rate: 44100,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        
        let mut writer = WavWriter::create(path, spec).unwrap();
        
        // Escribir 1 segundo de audio silencioso
        for _ in 0..(spec.sample_rate * spec.channels as u32) {
            writer.write_sample(0i16).unwrap();
        }
        
        writer.finalize().unwrap();
    }

    #[test]
    fn test_metadata_extractor_new() {
        let _extractor = MetadataExtractor::new();
        assert!(true);
    }

    #[test]
    fn test_metadata_extractor_default() {
        let _extractor = MetadataExtractor::default();
        assert!(true);
    }

    #[test]
    fn test_extract_metadata_nonexistent_file() {
        let extractor = MetadataExtractor::new();
        let path = Path::new("/nonexistent/file.mp3");
        let result = extractor.extract_metadata(path);
        
        assert!(result.is_err());
        match result {
            Err(LibraryError::MetadataExtractionFailed(_)) => {},
            _ => panic!("Esperaba MetadataExtractionFailed"),
        }
    }

    #[test]
    fn test_extract_metadata_wav_file() {
        let temp_dir = TempDir::new().unwrap();
        let wav_path = temp_dir.path().join("test.wav");
        create_test_wav(&wav_path);

        let extractor = MetadataExtractor::new();
        let result = extractor.extract_metadata(&wav_path);

        assert!(result.is_ok());
        let metadata = result.unwrap();
        
        assert_eq!(metadata.format, "wav");
        assert!(metadata.duration >= 0.0);
        assert!(metadata.path.contains("test.wav"));
    }

    #[test]
    fn test_extract_metadata_uses_filename_as_fallback_title() {
        let temp_dir = TempDir::new().unwrap();
        let wav_path = temp_dir.path().join("My Awesome Song.wav");
        create_test_wav(&wav_path);

        let extractor = MetadataExtractor::new();
        let result = extractor.extract_metadata(&wav_path);

        assert!(result.is_ok());
        let metadata = result.unwrap();
        
        // WAV sin tags debe usar filename como título
        assert_eq!(metadata.title, Some("My Awesome Song".to_string()));
    }

    #[test]
    fn test_extract_metadata_format_detection() {
        let temp_dir = TempDir::new().unwrap();
        let wav_path = temp_dir.path().join("test.wav");
        create_test_wav(&wav_path);

        let extractor = MetadataExtractor::new();
        let result = extractor.extract_metadata(&wav_path);

        assert!(result.is_ok());
        let metadata = result.unwrap();
        assert_eq!(metadata.format, "wav");
    }

    #[test]
    fn test_extract_metadata_batch_empty() {
        let extractor = MetadataExtractor::new();
        let paths: Vec<&Path> = vec![];
        let results = extractor.extract_metadata_batch(&paths);
        
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_extract_metadata_batch_multiple_files() {
        let temp_dir = TempDir::new().unwrap();
        
        let wav1 = temp_dir.path().join("track1.wav");
        let wav2 = temp_dir.path().join("track2.wav");
        create_test_wav(&wav1);
        create_test_wav(&wav2);

        let extractor = MetadataExtractor::new();
        let paths = vec![wav1, wav2];
        let results = extractor.extract_metadata_batch(&paths);
        
        assert_eq!(results.len(), 2);
        assert!(results[0].is_ok());
        assert!(results[1].is_ok());
    }

    #[test]
    fn test_extract_metadata_batch_with_failures() {
        let temp_dir = TempDir::new().unwrap();
        
        let wav_valid = temp_dir.path().join("valid.wav");
        let wav_invalid = temp_dir.path().join("invalid.wav");
        
        create_test_wav(&wav_valid);

        let extractor = MetadataExtractor::new();
        let paths = vec![wav_valid, wav_invalid];
        let results = extractor.extract_metadata_batch(&paths);
        
        assert_eq!(results.len(), 2);
        assert!(results[0].is_ok());
        assert!(results[1].is_err());
    }

    #[test]
    fn test_track_metadata_serialization() {
        let metadata = TrackMetadata {
            path: "/music/song.mp3".to_string(),
            title: Some("Test Song".to_string()),
            artist: Some("Test Artist".to_string()),
            album: Some("Test Album".to_string()),
            year: Some(2024),
            genre: Some("Electronic".to_string()),
            bpm: Some(128),
            key: Some("Am".to_string()),
            rating: Some(5),
            comment: Some("Great track".to_string()),
            duration: 180.5,
            bitrate: 320,
            sample_rate: 44100,
            channels: 2,
            format: "mp3".to_string(),
            artwork: None,
        };

        let json = serde_json::to_string(&metadata).unwrap();
        assert!(json.contains("Test Song"));
        assert!(json.contains("Test Artist"));

        let deserialized: TrackMetadata = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.title, Some("Test Song".to_string()));
        assert_eq!(deserialized.bpm, Some(128));
        assert_eq!(deserialized.key, Some("Am".to_string()));
    }

    #[test]
    fn test_track_metadata_none_values() {
        let metadata = TrackMetadata {
            path: "/music/song.wav".to_string(),
            title: None,
            artist: None,
            album: None,
            year: None,
            genre: None,
            bpm: None,
            key: None,
            rating: None,
            comment: None,
            duration: 120.0,
            bitrate: 1411,
            sample_rate: 44100,
            channels: 2,
            format: "wav".to_string(),
            artwork: None,
        };

        assert!(metadata.title.is_none());
        assert!(metadata.artist.is_none());
        assert!(metadata.bpm.is_none());
        assert_eq!(metadata.duration, 120.0);
    }
}
