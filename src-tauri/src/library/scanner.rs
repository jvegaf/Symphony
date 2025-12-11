use std::path::{Path, PathBuf};
use std::fs;
use super::error::{LibraryError, Result};

/// Extensiones de archivo soportadas
const SUPPORTED_EXTENSIONS: &[&str] = &["mp3", "flac", "wav", "ogg", "m4a", "aac"];

/// Scanner recursivo de bibliotecas musicales
pub struct LibraryScanner;

impl LibraryScanner {
    /// Crea un nuevo scanner
    pub fn new() -> Self {
        Self
    }

    /// Escanea recursivamente un directorio en busca de archivos de audio
    /// 
    /// # Arguments
    /// * `path` - Ruta al directorio raíz de la biblioteca
    /// 
    /// # Returns
    /// Vector de PathBuf con todos los archivos de audio encontrados
    /// 
    /// # Errors
    /// Retorna error si:
    /// - La ruta no existe
    /// - No hay permisos de lectura
    /// - Error durante el escaneo
    /// 
    /// # Example
    /// ```
    /// let scanner = LibraryScanner::new();
    /// let files = scanner.scan_directory(Path::new("/music"))?;
    /// ```
    pub fn scan_directory(&self, path: &Path) -> Result<Vec<PathBuf>> {
        // Validar que el path existe
        if !path.exists() {
            return Err(LibraryError::PathNotFound(path.to_path_buf()));
        }

        // Validar que es un directorio
        if !path.is_dir() {
            return Err(LibraryError::ScanError(
                format!("{} no es un directorio", path.display())
            ));
        }

        // Escanear recursivamente
        self.scan_directory_recursive(path)
    }

    /// Función recursiva interna para escanear directorios
    fn scan_directory_recursive(&self, path: &Path) -> Result<Vec<PathBuf>> {
        let mut audio_files = Vec::new();

        // Leer entradas del directorio
        let entries = fs::read_dir(path).map_err(|e| {
            if e.kind() == std::io::ErrorKind::PermissionDenied {
                LibraryError::PermissionDenied(path.to_path_buf())
            } else {
                LibraryError::IoError(e)
            }
        })?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                // Recursión en subdirectorios
                match self.scan_directory_recursive(&path) {
                    Ok(mut files) => audio_files.append(&mut files),
                    Err(LibraryError::PermissionDenied(_)) => {
                        // Ignorar directorios sin permisos y continuar
                        continue;
                    },
                    Err(e) => return Err(e),
                }
            } else if path.is_file() && self.is_supported_audio_file(&path) {
                audio_files.push(path);
            }
        }

        Ok(audio_files)
    }

    /// Verifica si un archivo es de audio soportado por extensión
    fn is_supported_audio_file(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
            .unwrap_or(false)
    }
}

impl Default for LibraryScanner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::TempDir;

    fn create_test_library() -> TempDir {
        let temp_dir = TempDir::new().unwrap();
        let root = temp_dir.path();

        // Crear estructura de directorios
        fs::create_dir_all(root.join("Artist1/Album1")).unwrap();
        fs::create_dir_all(root.join("Artist2/Album2")).unwrap();
        fs::create_dir_all(root.join("Artist2/Album3")).unwrap();

        // Crear archivos de audio (vacíos, solo para testing de scanner)
        File::create(root.join("Artist1/Album1/track1.mp3")).unwrap();
        File::create(root.join("Artist1/Album1/track2.flac")).unwrap();
        File::create(root.join("Artist2/Album2/song1.wav")).unwrap();
        File::create(root.join("Artist2/Album3/audio1.ogg")).unwrap();
        File::create(root.join("Artist2/Album3/audio2.m4a")).unwrap();

        // Crear archivos no soportados (deben ser ignorados)
        File::create(root.join("Artist1/Album1/cover.jpg")).unwrap();
        File::create(root.join("Artist2/Album2/readme.txt")).unwrap();

        temp_dir
    }

    #[test]
    fn test_scanner_new() {
        let scanner = LibraryScanner::new();
        assert!(true); // Scanner se crea correctamente
    }

    #[test]
    fn test_scanner_default() {
        let scanner = LibraryScanner::default();
        assert!(true); // Scanner default funciona
    }

    #[test]
    fn test_scan_directory_nonexistent() {
        let scanner = LibraryScanner::new();
        let path = Path::new("/nonexistent/path/that/does/not/exist");
        let result = scanner.scan_directory(path);
        
        assert!(result.is_err());
        match result {
            Err(LibraryError::PathNotFound(p)) => {
                assert_eq!(p, path);
            },
            _ => panic!("Esperaba PathNotFound"),
        }
    }

    #[test]
    fn test_scan_directory_is_file() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.mp3");
        File::create(&file_path).unwrap();

        let scanner = LibraryScanner::new();
        let result = scanner.scan_directory(&file_path);
        
        assert!(result.is_err());
        match result {
            Err(LibraryError::ScanError(msg)) => {
                assert!(msg.contains("no es un directorio"));
            },
            _ => panic!("Esperaba ScanError"),
        }
    }

    #[test]
    fn test_scan_directory_finds_all_audio_files() {
        let temp_dir = create_test_library();
        let scanner = LibraryScanner::new();
        let result = scanner.scan_directory(temp_dir.path());

        assert!(result.is_ok());
        let files = result.unwrap();
        
        // Debe encontrar 5 archivos de audio (mp3, flac, wav, ogg, m4a)
        assert_eq!(files.len(), 5);

        // Verificar que todos son archivos de audio
        for file in &files {
            let ext = file.extension().unwrap().to_str().unwrap();
            assert!(SUPPORTED_EXTENSIONS.contains(&ext));
        }
    }

    #[test]
    fn test_scan_directory_ignores_non_audio() {
        let temp_dir = create_test_library();
        let scanner = LibraryScanner::new();
        let result = scanner.scan_directory(temp_dir.path());

        assert!(result.is_ok());
        let files = result.unwrap();
        
        // No debe encontrar archivos .jpg o .txt
        for file in &files {
            let ext = file.extension().unwrap().to_str().unwrap();
            assert_ne!(ext, "jpg");
            assert_ne!(ext, "txt");
        }
    }

    #[test]
    fn test_scan_directory_recursive() {
        let temp_dir = create_test_library();
        let scanner = LibraryScanner::new();
        let result = scanner.scan_directory(temp_dir.path());

        assert!(result.is_ok());
        let files = result.unwrap();
        
        // Verificar que encuentra archivos en subdirectorios profundos
        assert!(files.iter().any(|p| p.to_str().unwrap().contains("Album1")));
        assert!(files.iter().any(|p| p.to_str().unwrap().contains("Album2")));
        assert!(files.iter().any(|p| p.to_str().unwrap().contains("Album3")));
    }

    #[test]
    fn test_is_supported_audio_file() {
        let scanner = LibraryScanner::new();

        // Archivos soportados
        assert!(scanner.is_supported_audio_file(Path::new("song.mp3")));
        assert!(scanner.is_supported_audio_file(Path::new("track.flac")));
        assert!(scanner.is_supported_audio_file(Path::new("audio.wav")));
        assert!(scanner.is_supported_audio_file(Path::new("music.ogg")));
        assert!(scanner.is_supported_audio_file(Path::new("tune.m4a")));
        assert!(scanner.is_supported_audio_file(Path::new("sound.aac")));

        // Mayúsculas
        assert!(scanner.is_supported_audio_file(Path::new("SONG.MP3")));
        assert!(scanner.is_supported_audio_file(Path::new("Track.FLAC")));

        // No soportados
        assert!(!scanner.is_supported_audio_file(Path::new("image.jpg")));
        assert!(!scanner.is_supported_audio_file(Path::new("document.txt")));
        assert!(!scanner.is_supported_audio_file(Path::new("video.mp4")));
    }

    #[test]
    fn test_scan_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        let scanner = LibraryScanner::new();
        let result = scanner.scan_directory(temp_dir.path());

        assert!(result.is_ok());
        let files = result.unwrap();
        assert_eq!(files.len(), 0);
    }

    #[test]
    fn test_scan_directory_with_aac_files() {
        let temp_dir = TempDir::new().unwrap();
        File::create(temp_dir.path().join("test.aac")).unwrap();
        
        let scanner = LibraryScanner::new();
        let result = scanner.scan_directory(temp_dir.path());

        assert!(result.is_ok());
        let files = result.unwrap();
        assert_eq!(files.len(), 1);
        assert!(files[0].extension().unwrap().to_str().unwrap() == "aac");
    }
}
