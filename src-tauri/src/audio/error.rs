use std::fmt;

/// Tipos de error de audio
#[derive(Debug)]
pub enum AudioError {
    /// Error de decodificación de archivo
    DecodingFailed(String),
    /// Formato de audio no soportado
    UnsupportedFormat(String),
    /// Archivo no encontrado o inaccesible
    FileNotFound(String),
    /// Error de reproducción
    PlaybackFailed(String),
    /// Error de I/O
    IoError(String),
    /// Error al generar waveform
    #[allow(dead_code)]
    WaveformGenerationFailed(String),
    /// Error en análisis de audio (BPM, beatgrid, etc.)
    AnalysisError(String),
}

impl fmt::Display for AudioError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AudioError::DecodingFailed(msg) => write!(f, "Error de decodificación: {}", msg),
            AudioError::UnsupportedFormat(fmt) => write!(f, "Formato no soportado: {}", fmt),
            AudioError::FileNotFound(path) => write!(f, "Archivo no encontrado: {}", path),
            AudioError::PlaybackFailed(msg) => write!(f, "Error de reproducción: {}", msg),
            AudioError::IoError(msg) => write!(f, "Error de I/O: {}", msg),
            AudioError::WaveformGenerationFailed(msg) => write!(f, "Error generando waveform: {}", msg),
            AudioError::AnalysisError(msg) => write!(f, "Error en análisis: {}", msg),
        }
    }
}

impl std::error::Error for AudioError {}

impl From<std::io::Error> for AudioError {
    fn from(err: std::io::Error) -> Self {
        AudioError::IoError(err.to_string())
    }
}

impl From<symphonia::core::errors::Error> for AudioError {
    fn from(err: symphonia::core::errors::Error) -> Self {
        AudioError::DecodingFailed(err.to_string())
    }
}

/// Tipo Result personalizado para operaciones de audio
pub type AudioResult<T> = Result<T, AudioError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = AudioError::DecodingFailed("test error".to_string());
        assert_eq!(err.to_string(), "Error de decodificación: test error");
    }

    #[test]
    fn test_unsupported_format() {
        let err = AudioError::UnsupportedFormat("xyz".to_string());
        assert!(err.to_string().contains("xyz"));
    }

    #[test]
    fn test_io_error_conversion() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let audio_err: AudioError = io_err.into();
        assert!(matches!(audio_err, AudioError::IoError(_)));
    }
}
