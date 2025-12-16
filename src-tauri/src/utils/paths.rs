/// Gestión centralizada de rutas de la aplicación
///
/// Todas las rutas de Symphony (base de datos, logs, settings) se almacenan
/// en ~/.config/symphony/ siguiendo el estándar XDG Base Directory.

use std::path::PathBuf;

/// Obtiene el directorio de configuración de la aplicación
///
/// Retorna `~/.config/symphony` en Linux/macOS
/// o `%APPDATA%\symphony` en Windows.
///
/// # Panics
/// Entra en pánico si no se puede determinar el directorio de configuración del usuario.
pub fn get_app_config_dir() -> PathBuf {
    dirs::config_dir()
        .expect("No se pudo determinar el directorio de configuración del usuario")
        .join("symphony")
}

/// Asegura que todos los directorios necesarios de la aplicación existan
///
/// Crea el directorio base `~/.config/symphony/` si no existe.
/// Retorna la ruta del directorio de configuración.
///
/// # Errors
/// Retorna error si no se pueden crear los directorios.
pub fn ensure_app_dirs() -> std::io::Result<PathBuf> {
    let config_dir = get_app_config_dir();
    std::fs::create_dir_all(&config_dir)?;
    Ok(config_dir)
}

/// Obtiene la ruta completa del archivo de base de datos
pub fn get_db_path() -> PathBuf {
    get_app_config_dir().join("symphony.db")
}

/// Obtiene la ruta completa del archivo de logs
pub fn get_log_path() -> PathBuf {
    get_app_config_dir().join("symphony.log")
}

/// Obtiene la ruta completa del archivo de settings
pub fn get_settings_path() -> PathBuf {
    get_app_config_dir().join("settings.json")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_app_config_dir() {
        let dir = get_app_config_dir();
        assert!(dir.ends_with("symphony"));
        assert!(dir.to_string_lossy().contains("config") || dir.to_string_lossy().contains("AppData"));
    }

    #[test]
    fn test_ensure_app_dirs() {
        let result = ensure_app_dirs();
        assert!(result.is_ok());
        let dir = result.unwrap();
        assert!(dir.exists() || !cfg!(test)); // En tests puede ser in-memory
    }

    #[test]
    fn test_get_db_path() {
        let path = get_db_path();
        assert!(path.ends_with("symphony.db"));
        assert!(path.to_string_lossy().contains("symphony"));
    }

    #[test]
    fn test_get_log_path() {
        let path = get_log_path();
        assert!(path.ends_with("symphony.log"));
        assert!(path.to_string_lossy().contains("symphony"));
    }

    #[test]
    fn test_get_settings_path() {
        let path = get_settings_path();
        assert!(path.ends_with("settings.json"));
        assert!(path.to_string_lossy().contains("symphony"));
    }
}
