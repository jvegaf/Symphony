use std::path::Path;
use std::time::{Duration, Instant};
use std::fs;
use tauri::{AppHandle, Emitter};
use serde::{Serialize, Deserialize};

use super::scanner::LibraryScanner;
use super::metadata::MetadataExtractor;
use super::error::Result;
use crate::db::models::Track;

/// Evento de progreso de importación
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportProgress {
    pub current: usize,
    pub total: usize,
    pub phase: ImportPhase,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImportPhase {
    Scanning,
    Importing,
    Complete,
}

/// Resultado de la importación
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub total_files: usize,
    pub imported: usize,
    pub failed: usize,
    pub duration_secs: f64,
}

/// Configuración del importador
pub struct ImportConfig {
    /// Emitir progreso cada N pistas
    pub progress_interval: usize,
    /// Emitir progreso cada N segundos
    pub progress_time_interval: Duration,
    /// Tamaño del batch para inserción en DB
    #[allow(dead_code)]
    pub batch_size: usize,
}

impl Default for ImportConfig {
    fn default() -> Self {
        Self {
            progress_interval: 100,
            progress_time_interval: Duration::from_secs(1),
            batch_size: 50,
        }
    }
}

/// Importador principal de biblioteca musical
pub struct LibraryImporter {
    scanner: LibraryScanner,
    extractor: MetadataExtractor,
    config: ImportConfig,
}

impl LibraryImporter {
    /// Crea un nuevo importador con configuración por defecto
    pub fn new() -> Self {
        Self::with_config(ImportConfig::default())
    }

    /// Crea un nuevo importador con configuración personalizada
    pub fn with_config(config: ImportConfig) -> Self {
        Self {
            scanner: LibraryScanner::new(),
            extractor: MetadataExtractor::new(),
            config,
        }
    }

    /// Importa una biblioteca completa
    /// 
    /// # Arguments
    /// * `app_handle` - Handle de la aplicación Tauri (para eventos)
    /// * `library_path` - Ruta al directorio de la biblioteca
    /// 
    /// # Returns
    /// Resultado de la importación con estadísticas
    /// 
    /// # Events
    /// Emite eventos:
    /// - `library:import-progress` con ImportProgress
    /// - `library:import-complete` con ImportResult
    pub async fn import_library(
        &self,
        app_handle: AppHandle,
        library_path: &Path,
    ) -> Result<ImportResult> {
        let start_time = Instant::now();

        // Fase 1: Escanear directorio
        self.emit_progress(&app_handle, ImportProgress {
            current: 0,
            total: 0,
            phase: ImportPhase::Scanning,
        });

        let audio_files = self.scanner.scan_directory(library_path)?;
        let total_files = audio_files.len();

        // Fase 2: Importar archivos
        let mut imported = 0;
        let mut failed = 0;
        let mut last_progress_time = Instant::now();

        for (idx, file_path) in audio_files.iter().enumerate() {
            // Extraer metadatos
            match self.extractor.extract_metadata(file_path) {
                Ok(metadata) => {
                    // Convertir a modelo Track
                    match self.metadata_to_track(&metadata, file_path) {
                        Ok(_track) => {
                            // TODO: Insertar en DB (siguiente commit)
                            imported += 1;
                        }
                        Err(_) => {
                            failed += 1;
                        }
                    }
                }
                Err(_) => {
                    failed += 1;
                }
            }

            // Emitir progreso si es necesario
            let should_emit = (idx + 1) % self.config.progress_interval == 0
                || last_progress_time.elapsed() >= self.config.progress_time_interval;

            if should_emit {
                self.emit_progress(&app_handle, ImportProgress {
                    current: idx + 1,
                    total: total_files,
                    phase: ImportPhase::Importing,
                });
                last_progress_time = Instant::now();
            }
        }

        // Fase 3: Completado
        let duration_secs = start_time.elapsed().as_secs_f64();
        let result = ImportResult {
            total_files,
            imported,
            failed,
            duration_secs,
        };

        self.emit_complete(&app_handle, result.clone());

        Ok(result)
    }

    /// Convierte metadatos extraídos a modelo Track
    fn metadata_to_track(&self, metadata: &super::metadata::TrackMetadata, path: &Path) -> Result<Track> {
        // Obtener tamaño del archivo
        let file_size = fs::metadata(path)
            .map(|m| m.len() as i64)
            .unwrap_or(0);

        let now = chrono::Local::now().to_rfc3339();

        Ok(Track {
            id: None, // Se asigna al insertar en DB
            path: metadata.path.clone(),
            title: metadata.title.clone().unwrap_or_else(|| "Unknown".to_string()),
            artist: metadata.artist.clone().unwrap_or_else(|| "Unknown".to_string()),
            album: metadata.album.clone(),
            genre: metadata.genre.clone(),
            year: metadata.year,
            duration: metadata.duration,
            bitrate: metadata.bitrate,
            sample_rate: 44100, // TODO: Extraer de AudioMetadata
            file_size,
            bpm: metadata.bpm.map(|b| b as f64),
            key: None,
            rating: None,
            play_count: 0,
            last_played: None,
            date_added: now.clone(),
            date_modified: now,
        })
    }

    /// Emite evento de progreso
    fn emit_progress(&self, app_handle: &AppHandle, progress: ImportProgress) {
        let _ = app_handle.emit("library:import-progress", progress);
    }

    /// Emite evento de completado
    fn emit_complete(&self, app_handle: &AppHandle, result: ImportResult) {
        let _ = app_handle.emit("library:import-complete", result);
    }
}

impl Default for LibraryImporter {
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
        file.write_all(b"RIFF").unwrap();
        file.write_all(&36u32.to_le_bytes()).unwrap();
        file.write_all(b"WAVE").unwrap();
        
        file.write_all(b"fmt ").unwrap();
        file.write_all(&16u32.to_le_bytes()).unwrap();
        file.write_all(&1u16.to_le_bytes()).unwrap();
        file.write_all(&2u16.to_le_bytes()).unwrap();
        file.write_all(&44100u32.to_le_bytes()).unwrap();
        file.write_all(&176400u32.to_le_bytes()).unwrap();
        file.write_all(&4u16.to_le_bytes()).unwrap();
        file.write_all(&16u16.to_le_bytes()).unwrap();
        
        file.write_all(b"data").unwrap();
        file.write_all(&0u32.to_le_bytes()).unwrap();
    }

    #[allow(dead_code)]
    fn create_test_library() -> TempDir {
        let temp_dir = TempDir::new().unwrap();
        let root = temp_dir.path();

        fs::create_dir_all(root.join("Artist1")).unwrap();
        fs::create_dir_all(root.join("Artist2")).unwrap();

        create_test_wav(&root.join("Artist1/track1.wav"));
        create_test_wav(&root.join("Artist2/track2.wav"));

        temp_dir
    }

    #[test]
    fn test_importer_new() {
        let importer = LibraryImporter::new();
        assert_eq!(importer.config.progress_interval, 100);
    }

    #[test]
    fn test_importer_with_custom_config() {
        let config = ImportConfig {
            progress_interval: 50,
            progress_time_interval: Duration::from_millis(500),
            batch_size: 25,
        };
        let importer = LibraryImporter::with_config(config);
        assert_eq!(importer.config.progress_interval, 50);
        assert_eq!(importer.config.batch_size, 25);
    }

    #[test]
    fn test_importer_default() {
        let importer = LibraryImporter::default();
        assert_eq!(importer.config.progress_interval, 100);
    }

    #[test]
    fn test_metadata_to_track() {
        let importer = LibraryImporter::new();
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.wav");
        create_test_wav(&file_path);

        let metadata = super::super::metadata::TrackMetadata {
            path: file_path.to_string_lossy().to_string(),
            title: Some("Test Song".to_string()),
            artist: Some("Test Artist".to_string()),
            album: Some("Test Album".to_string()),
            year: Some(2024),
            genre: Some("Electronic".to_string()),
            bpm: Some(128),
            duration: 180.0,
            bitrate: 320,
            format: "wav".to_string(),
            artwork: None,
        };

        let result = importer.metadata_to_track(&metadata, &file_path);
        assert!(result.is_ok());

        let track = result.unwrap();
        assert_eq!(track.title, "Test Song");
        assert_eq!(track.artist, "Test Artist");
        assert_eq!(track.album, Some("Test Album".to_string()));
        assert_eq!(track.duration, 180.0);
        assert!(track.file_size > 0);
    }

    #[test]
    fn test_metadata_to_track_with_defaults() {
        let importer = LibraryImporter::new();
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.wav");
        create_test_wav(&file_path);

        let metadata = super::super::metadata::TrackMetadata {
            path: file_path.to_string_lossy().to_string(),
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

        let result = importer.metadata_to_track(&metadata, &file_path);
        assert!(result.is_ok());

        let track = result.unwrap();
        assert_eq!(track.title, "Unknown");
        assert_eq!(track.artist, "Unknown");
        assert_eq!(track.album, None);
    }

    #[test]
    fn test_import_progress_serialization() {
        let progress = ImportProgress {
            current: 50,
            total: 100,
            phase: ImportPhase::Importing,
        };

        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"current\":50"));
        assert!(json.contains("\"total\":100"));
        assert!(json.contains("\"importing\""));
    }

    #[test]
    fn test_import_result_serialization() {
        let result = ImportResult {
            total_files: 1000,
            imported: 980,
            failed: 20,
            duration_secs: 45.5,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"total_files\":1000"));
        assert!(json.contains("\"imported\":980"));
        assert!(json.contains("\"failed\":20"));
    }

    // Tests asíncronos del import_library requieren mock de Tauri AppHandle
    // Los dejaremos para integración completa
}
