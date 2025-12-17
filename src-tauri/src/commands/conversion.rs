use tauri::AppHandle;
use std::path::PathBuf;
use crate::library::converter::{Mp3Converter, ConversionOptions, ConversionResult};

/// Convierte un track individual a MP3
#[tauri::command]
pub async fn convert_track_to_mp3(
    app: AppHandle,
    input_path: String,
    bitrate: u32,
    output_folder: String,
    preserve_structure: bool,
) -> Result<ConversionResult, String> {
    let options = ConversionOptions {
        bitrate,
        output_folder: PathBuf::from(output_folder),
        preserve_structure,
        overwrite_existing: false,
    };
    
    Mp3Converter::convert_file(
        &PathBuf::from(input_path),
        &options,
        &app,
    ).map_err(|e| e.to_string())
}

/// Convierte múltiples tracks a MP3 en batch
#[tauri::command]
pub async fn batch_convert_to_mp3(
    app: AppHandle,
    input_paths: Vec<String>,
    bitrate: u32,
    output_folder: String,
    preserve_structure: bool,
) -> Result<Vec<ConversionResult>, String> {
    let paths: Vec<PathBuf> = input_paths.iter()
        .map(PathBuf::from)
        .collect();
    
    let options = ConversionOptions {
        bitrate,
        output_folder: PathBuf::from(output_folder),
        preserve_structure,
        overwrite_existing: false,
    };
    
    Mp3Converter::convert_batch(&paths, &options, &app)
        .map_err(|e| e.to_string())
}

/// Verifica si ffmpeg está instalado y disponible
#[tauri::command]
pub fn check_ffmpeg_installed() -> Result<bool, String> {
    match Mp3Converter::check_ffmpeg_available() {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // AIDEV-NOTE: Los tests para comandos de conversión requieren:
    // 1. Un AppHandle real (no se puede mockear fácilmente)
    // 2. ffmpeg instalado en el sistema
    // 3. Archivos de audio de prueba
    //
    // Por lo tanto, estos tests se deben ejecutar como tests de integración E2E.
    // Aquí documentamos los casos de prueba esperados:
    //
    // #[tokio::test]
    // async fn test_convert_track_to_mp3_success() {
    //     // Requiere AppHandle + archivo de audio + ffmpeg
    //     let app = /* crear AppHandle de prueba */;
    //     let result = convert_track_to_mp3(
    //         app,
    //         "/path/to/test.flac".to_string(),
    //         320,
    //         "/tmp/output".to_string(),
    //         false
    //     ).await;
    //     assert!(result.is_ok());
    //     assert!(result.unwrap().success);
    // }
    //
    // #[tokio::test]
    // async fn test_batch_convert_to_mp3() {
    //     // Requiere AppHandle + múltiples archivos + ffmpeg
    // }
    //
    // #[test]
    // fn test_check_ffmpeg_installed() {
    //     let result = check_ffmpeg_installed();
    //     assert!(result.is_ok());
    //     // El resultado depende de si ffmpeg está instalado
    // }
    //
    // #[tokio::test]
    // async fn test_convert_track_error_handling() {
    //     // Probar con archivo inexistente
    //     let app = /* crear AppHandle de prueba */;
    //     let result = convert_track_to_mp3(
    //         app,
    //         "/nonexistent/file.flac".to_string(),
    //         320,
    //         "/tmp".to_string(),
    //         false
    //     ).await;
    //     assert!(result.is_err());
    // }

    #[test]
    fn test_check_ffmpeg_installed_returns_bool() {
        // AIDEV-NOTE: Este test básico verifica que la función retorna un Result
        // con bool, independientemente del estado de ffmpeg en el sistema.
        let result = check_ffmpeg_installed();
        assert!(result.is_ok());
        // No verificamos el valor porque depende del entorno
    }
}
