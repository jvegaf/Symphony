/**
 * Errores del módulo Beatport
 * 
 * Define los tipos de error que pueden ocurrir durante la integración
 * con la API de Beatport para obtención de metadatos.
 */

use std::fmt;

/// Errores posibles durante operaciones con Beatport
#[derive(Debug, Clone)]
pub enum BeatportError {
    /// Error de red (conexión, timeout, etc.)
    NetworkError(String),
    /// Error de autenticación OAuth
    AuthError(String),
    /// Rate limiting activo - esperar antes de reintentar
    RateLimited { retry_after_secs: u64 },
    /// Error al parsear respuesta HTML o JSON
    ParseError(String),
    /// Track no encontrado en Beatport
    TrackNotFound { title: String, artist: String },
    /// Track existe pero está restringido (región, etc.)
    TrackRestricted { track_id: i64, reason: String },
    /// Error de I/O al escribir metadatos
    IoError(String),
    /// Error al escribir tags en el archivo de audio
    TagWriteError(String),
}

impl fmt::Display for BeatportError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BeatportError::NetworkError(msg) => write!(f, "Error de red: {}", msg),
            BeatportError::AuthError(msg) => write!(f, "Error de autenticación: {}", msg),
            BeatportError::RateLimited { retry_after_secs } => {
                write!(f, "Rate limited. Reintentar en {} segundos", retry_after_secs)
            }
            BeatportError::ParseError(msg) => write!(f, "Error al parsear respuesta: {}", msg),
            BeatportError::TrackNotFound { title, artist } => {
                write!(f, "Track no encontrado: {} - {}", artist, title)
            }
            BeatportError::TrackRestricted { track_id, reason } => {
                write!(f, "Track {} restringido: {}", track_id, reason)
            }
            BeatportError::IoError(msg) => write!(f, "Error de I/O: {}", msg),
            BeatportError::TagWriteError(msg) => write!(f, "Error escribiendo tags: {}", msg),
        }
    }
}

impl std::error::Error for BeatportError {}

/// Convierte errores de reqwest a BeatportError
impl From<reqwest::Error> for BeatportError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            BeatportError::NetworkError("Timeout de conexión".to_string())
        } else if err.is_connect() {
            BeatportError::NetworkError("No se pudo conectar a Beatport".to_string())
        } else {
            BeatportError::NetworkError(err.to_string())
        }
    }
}

/// Convierte errores de I/O a BeatportError
impl From<std::io::Error> for BeatportError {
    fn from(err: std::io::Error) -> Self {
        BeatportError::IoError(err.to_string())
    }
}

/// Convierte errores de lofty a BeatportError
impl From<lofty::error::LoftyError> for BeatportError {
    fn from(err: lofty::error::LoftyError) -> Self {
        BeatportError::TagWriteError(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_display_network_error() {
        let err = BeatportError::NetworkError("timeout".to_string());
        assert_eq!(format!("{}", err), "Error de red: timeout");
    }

    #[test]
    fn test_display_rate_limited() {
        let err = BeatportError::RateLimited { retry_after_secs: 60 };
        assert_eq!(format!("{}", err), "Rate limited. Reintentar en 60 segundos");
    }

    #[test]
    fn test_display_track_not_found() {
        let err = BeatportError::TrackNotFound {
            title: "Test Track".to_string(),
            artist: "Test Artist".to_string(),
        };
        assert_eq!(format!("{}", err), "Track no encontrado: Test Artist - Test Track");
    }

    #[test]
    fn test_display_track_restricted() {
        let err = BeatportError::TrackRestricted {
            track_id: 12345,
            reason: "Región no disponible".to_string(),
        };
        assert_eq!(format!("{}", err), "Track 12345 restringido: Región no disponible");
    }
}
