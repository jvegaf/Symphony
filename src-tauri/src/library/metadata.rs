use std::path::Path;
use crate::audio::decoder::AudioDecoder;
use super::error::{LibraryError, Result};

/// Metadatos extraídos de un archivo de audio
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
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
    
    /// BPM (beats por minuto)
    pub bpm: Option<i32>,
    
    /// Duración en segundos
    pub duration: f64,
    
    /// Bitrate en kbps
    pub bitrate: i32,
    
    /// Formato de audio (mp3, flac, wav, etc.)
    pub format: String,
    
    /// Artwork (imagen de portada) en base64
    pub artwork: Option<String>,
}

/// Extractor de metadatos de archivos de audio
pub struct MetadataExtractor;

impl MetadataExtractor {
    /// Crea un nuevo extractor de metadatos
    pub fn new() -> Self {
        Self
    }

    /// Extrae metadatos de un archivo de audio
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
    /// - Hay error al decodificar
    /// 
    /// # Example
    /// ```
    /// let extractor = MetadataExtractor::new();
    /// let metadata = extractor.extract_metadata(Path::new("song.mp3"))?;
    /// ```
    pub fn extract_metadata(&self, path: &Path) -> Result<TrackMetadata> {
        // Usar el decoder para obtener metadata básica (duration, bitrate, etc.)
        let audio_metadata = AudioDecoder::decode(path)
            .map_err(|e| LibraryError::MetadataExtractionFailed(e.to_string()))?;

        // Obtener extensión del archivo para el formato
        let format = path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("unknown")
            .to_lowercase();

        // Extraer nombre del archivo como título por defecto
        let default_title = path.file_stem()
            .and_then(|name| name.to_str())
            .map(|s| s.to_string());

        // Por ahora, usamos valores por defecto para metadatos de tags
        // TODO: En futuro, extraer tags reales con Symphonia
        Ok(TrackMetadata {
            path: path.to_string_lossy().to_string(),
            title: default_title,  // Usar filename como título
            artist: None,          // Tags no implementadas aún
            album: None,           // Tags no implementadas aún
            year: None,            // Tags no implementadas aún
            genre: None,           // Tags no implementadas aún
            bpm: None,             // BPM requiere análisis adicional
            duration: audio_metadata.duration,
            bitrate: audio_metadata.bitrate.unwrap_or(0) as i32,
            format,
            artwork: None,         // Artwork requiere extracción de imagen
        })
    }

    /// Extrae metadatos de múltiples archivos
    /// Continúa con el siguiente archivo si uno falla
    #[allow(dead_code)]
    pub fn extract_metadata_batch(&self, paths: &[impl AsRef<Path>]) -> Vec<Result<TrackMetadata>> {
        paths.iter()
            .map(|path| self.extract_metadata(path.as_ref()))
            .collect()
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
    use std::fs::File;
    use std::io::Write;
    use tempfile::TempDir;

    // Helper: Crea un archivo WAV válido mínimo
    fn create_test_wav(path: &Path) {
        let mut file = File::create(path).unwrap();
        
        // WAV header mínimo (44 bytes)
        // RIFF header
        file.write_all(b"RIFF").unwrap();
        file.write_all(&36u32.to_le_bytes()).unwrap(); // Chunk size
        file.write_all(b"WAVE").unwrap();
        
        // fmt subchunk
        file.write_all(b"fmt ").unwrap();
        file.write_all(&16u32.to_le_bytes()).unwrap(); // Subchunk1 size
        file.write_all(&1u16.to_le_bytes()).unwrap();  // Audio format (PCM)
        file.write_all(&2u16.to_le_bytes()).unwrap();  // Num channels
        file.write_all(&44100u32.to_le_bytes()).unwrap(); // Sample rate
        file.write_all(&176400u32.to_le_bytes()).unwrap(); // Byte rate
        file.write_all(&4u16.to_le_bytes()).unwrap();  // Block align
        file.write_all(&16u16.to_le_bytes()).unwrap(); // Bits per sample
        
        // data subchunk
        file.write_all(b"data").unwrap();
        file.write_all(&0u32.to_le_bytes()).unwrap(); // Data size (0 for test)
    }

    #[test]
    fn test_metadata_extractor_new() {
        let _extractor = MetadataExtractor::new();
        assert!(true); // Se crea correctamente
    }

    #[test]
    fn test_metadata_extractor_default() {
        let _extractor = MetadataExtractor::default();
        assert!(true); // Default funciona
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
    fn test_extract_metadata_uses_filename_as_default_title() {
        let temp_dir = TempDir::new().unwrap();
        let wav_path = temp_dir.path().join("My Awesome Song.wav");
        create_test_wav(&wav_path);

        let extractor = MetadataExtractor::new();
        let result = extractor.extract_metadata(&wav_path);

        assert!(result.is_ok());
        let metadata = result.unwrap();
        
        // Debe usar el nombre del archivo como título por defecto
        assert_eq!(metadata.title, Some("My Awesome Song".to_string()));
    }

    #[test]
    fn test_extract_metadata_format_detection() {
        let temp_dir = TempDir::new().unwrap();
        
        // Crear archivo con extensión .wav
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
        // No crear invalid.wav - no existe

        let extractor = MetadataExtractor::new();
        let paths = vec![wav_valid, wav_invalid];
        let results = extractor.extract_metadata_batch(&paths);
        
        assert_eq!(results.len(), 2);
        assert!(results[0].is_ok());  // Válido
        assert!(results[1].is_err()); // Inválido
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
            duration: 180.5,
            bitrate: 320,
            format: "mp3".to_string(),
            artwork: None,
        };

        // Verificar serialización
        let json = serde_json::to_string(&metadata).unwrap();
        assert!(json.contains("Test Song"));
        assert!(json.contains("Test Artist"));

        // Verificar deserialización
        let deserialized: TrackMetadata = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.title, Some("Test Song".to_string()));
        assert_eq!(deserialized.duration, 180.5);
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
            duration: 120.0,
            bitrate: 1411,
            format: "wav".to_string(),
            artwork: None,
        };

        assert!(metadata.title.is_none());
        assert!(metadata.artist.is_none());
        assert_eq!(metadata.duration, 120.0);
    }
}
