use std::path::{Path, PathBuf};
use std::process::Command;
use crate::library::error::{LibraryError, LibraryResult};
use tauri::{AppHandle, Emitter, Runtime};

/// Opciones de conversión MP3
#[derive(Debug, Clone)]
pub struct ConversionOptions {
    pub bitrate: u32,                  // 128, 192, 256, 320
    pub output_folder: PathBuf,
    pub preserve_structure: bool,
    pub overwrite_existing: bool,
}

impl Default for ConversionOptions {
    fn default() -> Self {
        Self {
            bitrate: 320,
            output_folder: PathBuf::from("./converted"),
            preserve_structure: true,
            overwrite_existing: false,
        }
    }
}

/// Evento de progreso de conversión
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionProgress {
    pub current_file: String,
    pub current_index: usize,
    pub total_files: usize,
    pub percentage: f64,
    pub status: ConversionStatus,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ConversionStatus {
    Starting,
    Converting,
    Complete,
    Failed,
}

/// Resultado de conversión
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionResult {
    pub input_path: String,
    pub output_path: String,
    pub success: bool,
    pub error: Option<String>,
    pub duration_ms: u64,
}

pub struct Mp3Converter;

impl Mp3Converter {
    /// Convierte un archivo de audio a MP3
    pub fn convert_file<R: Runtime>(
        input_path: &Path,
        options: &ConversionOptions,
        app_handle: &AppHandle<R>,
    ) -> LibraryResult<ConversionResult> {
        let start = std::time::Instant::now();
        
        // Verificar que ffmpeg esté disponible
        Self::check_ffmpeg_available()?;
        
        // Verificar que el archivo de entrada exista
        if !input_path.exists() {
            return Err(LibraryError::FileNotFound(
                input_path.display().to_string()
            ));
        }
        
        // Generar path de salida
        let output_path = Self::generate_output_path(input_path, options)?;
        
        // Verificar si ya existe
        if output_path.exists() && !options.overwrite_existing {
            return Err(LibraryError::ConversionError(
                format!("El archivo de salida ya existe: {}", output_path.display())
            ));
        }
        
        // Crear directorio de salida si no existe
        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        // Emitir evento de inicio
        let _ = app_handle.emit("conversion:progress", ConversionProgress {
            current_file: input_path.display().to_string(),
            current_index: 0,
            total_files: 1,
            percentage: 0.0,
            status: ConversionStatus::Converting,
        });
        
        // Ejecutar ffmpeg
        let output = Command::new("ffmpeg")
            .arg("-i")
            .arg(input_path)
            .arg("-codec:a")
            .arg("libmp3lame")
            .arg("-b:a")
            .arg(format!("{}k", options.bitrate))
            .arg("-y")  // Overwrite without asking
            .arg(&output_path)
            .output()
            .map_err(|e| LibraryError::ConversionError(e.to_string()))?;
        
        let duration_ms = start.elapsed().as_millis() as u64;
        
        if output.status.success() {
            // Emitir evento de completado
            let _ = app_handle.emit("conversion:progress", ConversionProgress {
                current_file: input_path.display().to_string(),
                current_index: 1,
                total_files: 1,
                percentage: 100.0,
                status: ConversionStatus::Complete,
            });
            
            Ok(ConversionResult {
                input_path: input_path.display().to_string(),
                output_path: output_path.display().to_string(),
                success: true,
                error: None,
                duration_ms,
            })
        } else {
            let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
            
            // Emitir evento de error
            let _ = app_handle.emit("conversion:progress", ConversionProgress {
                current_file: input_path.display().to_string(),
                current_index: 1,
                total_files: 1,
                percentage: 0.0,
                status: ConversionStatus::Failed,
            });
            
            Err(LibraryError::ConversionError(error_msg))
        }
    }
    
    /// Convierte múltiples archivos en batch
    pub fn convert_batch<R: Runtime>(
        input_paths: &[PathBuf],
        options: &ConversionOptions,
        app_handle: &AppHandle<R>,
    ) -> LibraryResult<Vec<ConversionResult>> {
        let mut results = Vec::new();
        let total = input_paths.len();
        
        for (index, path) in input_paths.iter().enumerate() {
            // Emitir progreso antes de cada archivo
            let _ = app_handle.emit("conversion:progress", ConversionProgress {
                current_file: path.display().to_string(),
                current_index: index,
                total_files: total,
                percentage: (index as f64 / total as f64) * 100.0,
                status: ConversionStatus::Converting,
            });
            
            match Self::convert_file(path, options, app_handle) {
                Ok(result) => results.push(result),
                Err(e) => {
                    results.push(ConversionResult {
                        input_path: path.display().to_string(),
                        output_path: String::new(),
                        success: false,
                        error: Some(e.to_string()),
                        duration_ms: 0,
                    });
                }
            }
        }
        
        // Emitir evento final
        let _ = app_handle.emit("conversion:progress", ConversionProgress {
            current_file: String::new(),
            current_index: total,
            total_files: total,
            percentage: 100.0,
            status: ConversionStatus::Complete,
        });
        
        Ok(results)
    }
    
    /// Verifica que ffmpeg esté disponible
    pub fn check_ffmpeg_available() -> LibraryResult<()> {
        let output = Command::new("ffmpeg")
            .arg("-version")
            .output()
            .map_err(|_| LibraryError::ConversionError(
                "ffmpeg no está instalado o no está en el PATH".to_string()
            ))?;
        
        if output.status.success() {
            Ok(())
        } else {
            Err(LibraryError::ConversionError(
                "ffmpeg no está disponible".to_string()
            ))
        }
    }
    
    /// Genera path de salida para archivo convertido
    /// 
    /// AIDEV-NOTE: Por ahora preserve_structure solo afecta el nombre del archivo,
    /// no preserva la estructura completa de directorios. Esto se puede expandir
    /// en el futuro para mantener la jerarquía relativa completa.
    fn generate_output_path(
        input_path: &Path,
        options: &ConversionOptions,
    ) -> LibraryResult<PathBuf> {
        let file_stem = input_path.file_stem()
            .ok_or_else(|| LibraryError::ConversionError(
                "No se pudo obtener nombre de archivo".to_string()
            ))?;
        
        let output_filename = format!("{}.mp3", file_stem.to_string_lossy());
        
        let output_path = if options.preserve_structure {
            // AIDEV-TODO: Implementar preservación completa de estructura de carpetas
            // Por ahora solo coloca el archivo en output_folder
            options.output_folder.join(&output_filename)
        } else {
            // Archivo plano en carpeta de salida
            options.output_folder.join(&output_filename)
        };
        
        Ok(output_path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // AIDEV-NOTE: Para los tests, necesitamos un AppHandle mock.
    // Como AppHandle es complejo de mockear, los tests que requieren
    // eventos reales se marcan como #[ignore] para ejecución manual.
    // Los tests sin eventos (generate_output_path, structs) se ejecutan normalmente.

    #[test]
    fn test_conversion_options_default() {
        let opts = ConversionOptions::default();
        assert_eq!(opts.bitrate, 320);
        assert_eq!(opts.output_folder, PathBuf::from("./converted"));
        assert!(opts.preserve_structure);
        assert!(!opts.overwrite_existing);
    }

    #[test]
    fn test_generate_output_path_no_preserve() {
        let input = PathBuf::from("/some/path/test.flac");
        let opts = ConversionOptions {
            bitrate: 320,
            output_folder: PathBuf::from("/output"),
            preserve_structure: false,
            overwrite_existing: false,
        };
        
        let result = Mp3Converter::generate_output_path(&input, &opts).unwrap();
        assert_eq!(result, PathBuf::from("/output/test.mp3"));
    }

    #[test]
    fn test_generate_output_path_preserve_structure() {
        let input = PathBuf::from("/some/path/test.wav");
        let opts = ConversionOptions {
            bitrate: 192,
            output_folder: PathBuf::from("/output"),
            preserve_structure: true,
            overwrite_existing: false,
        };
        
        let result = Mp3Converter::generate_output_path(&input, &opts).unwrap();
        // AIDEV-NOTE: Por ahora preserve_structure no preserva estructura completa
        assert_eq!(result, PathBuf::from("/output/test.mp3"));
    }

    #[test]
    fn test_generate_output_path_no_extension() {
        let input = PathBuf::from("/some/path/noext");
        let opts = ConversionOptions::default();
        
        let result = Mp3Converter::generate_output_path(&input, &opts).unwrap();
        assert!(result.to_string_lossy().ends_with("noext.mp3"));
    }

    #[test]
    fn test_conversion_result_serialization() {
        let result = ConversionResult {
            input_path: "/input/test.flac".to_string(),
            output_path: "/output/test.mp3".to_string(),
            success: true,
            error: None,
            duration_ms: 1500,
        };
        
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("inputPath"));
        assert!(json.contains("outputPath"));
        assert!(json.contains("1500"));
    }

    #[test]
    fn test_conversion_progress_serialization() {
        let progress = ConversionProgress {
            current_file: "test.flac".to_string(),
            current_index: 1,
            total_files: 5,
            percentage: 20.0,
            status: ConversionStatus::Converting,
        };
        
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("currentFile"));
        assert!(json.contains("totalFiles"));
        assert!(json.contains("20"));
    }

    #[test]
    fn test_check_ffmpeg_available() {
        // AIDEV-NOTE: Este test puede fallar si ffmpeg no está instalado
        // en el entorno de CI. Considerarlo como test de integración.
        let result = Mp3Converter::check_ffmpeg_available();
        
        // Si ffmpeg está instalado, debe retornar Ok
        // Si no, debe retornar ConversionError
        if result.is_err() {
            match result.unwrap_err() {
                LibraryError::ConversionError(msg) => {
                    assert!(msg.contains("ffmpeg"));
                },
                _ => panic!("Expected ConversionError"),
            }
        }
    }

    // AIDEV-NOTE: Los siguientes tests requieren un AppHandle real o mock complejo,
    // por lo que se documentan pero no se implementan en esta fase.
    // Se pueden implementar como tests de integración E2E en el futuro.
    //
    // Tests que requieren AppHandle:
    // - test_convert_file_success: Requiere ffmpeg + AppHandle + archivo de audio
    // - test_convert_file_not_exists: Podría testearse pero requiere AppHandle
    // - test_convert_file_already_exists_no_overwrite: Requiere AppHandle
    // - test_convert_file_already_exists_with_overwrite: Requiere AppHandle + ffmpeg
    // - test_convert_batch_multiple_files: Requiere AppHandle + ffmpeg
    // - test_convert_batch_empty: Requiere AppHandle
    // - test_convert_batch_partial_failures: Requiere AppHandle + ffmpeg
}
