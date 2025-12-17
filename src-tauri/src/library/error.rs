use std::fmt;
use std::io;
use std::path::PathBuf;

/// Errores específicos del módulo de biblioteca
#[derive(Debug)]
pub enum LibraryError {
    /// Error de I/O al acceder al sistema de archivos
    IoError(io::Error),

    /// Ruta no encontrada
    PathNotFound(PathBuf),

    /// Permisos insuficientes para acceder a la ruta
    PermissionDenied(PathBuf),

    /// Error al extraer metadatos
    MetadataExtractionFailed(String),

    /// Error en operación de base de datos
    DatabaseError(String),

    /// Error al escanear directorio
    ScanError(String),

    /// Error de conversión de audio
    ConversionError(String),

    /// Archivo no encontrado
    FileNotFound(String),
}

impl fmt::Display for LibraryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IoError(err) => write!(f, "Error de I/O: {}", err),
            Self::PathNotFound(path) => write!(f, "Ruta no encontrada: {}", path.display()),
            Self::PermissionDenied(path) => write!(f, "Permiso denegado: {}", path.display()),
            Self::MetadataExtractionFailed(msg) => write!(f, "Error extrayendo metadatos: {}", msg),
            Self::DatabaseError(msg) => write!(f, "Error de base de datos: {}", msg),
            Self::ScanError(msg) => write!(f, "Error escaneando: {}", msg),
            Self::ConversionError(msg) => write!(f, "Error de conversión: {}", msg),
            Self::FileNotFound(msg) => write!(f, "Archivo no encontrado: {}", msg),
        }
    }
}

impl std::error::Error for LibraryError {}

impl From<io::Error> for LibraryError {
    fn from(err: io::Error) -> Self {
        LibraryError::IoError(err)
    }
}

impl From<rusqlite::Error> for LibraryError {
    fn from(err: rusqlite::Error) -> Self {
        LibraryError::DatabaseError(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, LibraryError>;
pub type LibraryResult<T> = std::result::Result<T, LibraryError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display_io_error() {
        let io_err = io::Error::new(io::ErrorKind::NotFound, "archivo no encontrado");
        let err = LibraryError::IoError(io_err);
        assert!(err.to_string().contains("Error de I/O"));
    }

    #[test]
    fn test_error_display_path_not_found() {
        let err = LibraryError::PathNotFound(PathBuf::from("/test/path"));
        assert!(err.to_string().contains("Ruta no encontrada"));
        assert!(err.to_string().contains("/test/path"));
    }

    #[test]
    fn test_error_display_permission_denied() {
        let err = LibraryError::PermissionDenied(PathBuf::from("/restricted"));
        assert!(err.to_string().contains("Permiso denegado"));
    }

    #[test]
    fn test_from_io_error() {
        let io_err = io::Error::new(io::ErrorKind::NotFound, "test");
        let lib_err: LibraryError = io_err.into();
        matches!(lib_err, LibraryError::IoError(_));
    }
}
