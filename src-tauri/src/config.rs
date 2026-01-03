//! Gestión de configuración de la aplicación
//!
//! AIDEV-NOTE: La configuración se almacena en ~/.config/symphony/settings.json
//! separada de la base de datos SQLite para mantener settings persistentes
//! incluso si se resetea la biblioteca.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::utils::get_settings_path;

/// Configuración principal de la aplicación
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// Rutas de bibliotecas importadas
    #[serde(default)]
    pub library_paths: Vec<String>,

    /// Configuración de UI
    #[serde(default)]
    pub ui: UiConfig,

    /// Configuración de audio
    #[serde(default)]
    pub audio: AudioConfig,

    /// Configuración de conversión
    #[serde(default)]
    pub conversion: ConversionConfig,
}

/// Configuración de interfaz de usuario
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiConfig {
    /// Tema: "system", "dark", "light"
    #[serde(default = "default_theme")]
    pub theme: String,

    /// Idioma
    #[serde(default = "default_language")]
    pub language: String,

    /// Resolución de waveform (número de samples)
    #[serde(default = "default_waveform_resolution")]
    pub waveform_resolution: u32,
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            language: default_language(),
            waveform_resolution: default_waveform_resolution(),
        }
    }
}

fn default_theme() -> String {
    "system".to_string()
}

fn default_language() -> String {
    "es".to_string()
}

fn default_waveform_resolution() -> u32 {
    1000
}

/// Configuración de audio
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioConfig {
    /// Dispositivo de salida
    #[serde(default = "default_output_device")]
    pub output_device: String,

    /// Sample rate preferido
    #[serde(default = "default_sample_rate")]
    pub sample_rate: u32,

    /// Tamaño de buffer
    #[serde(default = "default_buffer_size")]
    pub buffer_size: u32,
}

impl Default for AudioConfig {
    fn default() -> Self {
        Self {
            output_device: default_output_device(),
            sample_rate: default_sample_rate(),
            buffer_size: default_buffer_size(),
        }
    }
}

fn default_output_device() -> String {
    "default".to_string()
}

fn default_sample_rate() -> u32 {
    44100
}

fn default_buffer_size() -> u32 {
    2048
}

/// Configuración de conversión de audio
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionConfig {
    /// Conversión habilitada
    #[serde(default)]
    pub enabled: bool,

    /// Auto-convertir al importar
    #[serde(default)]
    pub auto_convert: bool,

    /// Bitrate de conversión (kbps)
    #[serde(default = "default_bitrate")]
    pub bitrate: u32,

    /// Carpeta de salida para conversiones
    #[serde(default)]
    pub output_folder: String,

    /// Preservar estructura de carpetas
    #[serde(default = "default_preserve_structure")]
    pub preserve_structure: bool,
}

impl Default for ConversionConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            auto_convert: false,
            bitrate: default_bitrate(),
            output_folder: String::new(),
            preserve_structure: default_preserve_structure(),
        }
    }
}

fn default_bitrate() -> u32 {
    320
}

fn default_preserve_structure() -> bool {
    true
}

impl AppConfig {
    /// Carga la configuración desde el archivo settings.json
    ///
    /// Si el archivo no existe, retorna configuración por defecto.
    pub fn load() -> Self {
        let path = get_settings_path();

        if !path.exists() {
            log::info!(
                "📁 Archivo de configuración no existe, usando valores por defecto: {:?}",
                path
            );
            return Self::default();
        }

        match fs::read_to_string(&path) {
            Ok(contents) => match serde_json::from_str(&contents) {
                Ok(config) => {
                    log::info!("✅ Configuración cargada desde {:?}", path);
                    config
                }
                Err(e) => {
                    log::warn!(
                        "⚠️ Error parseando configuración, usando valores por defecto: {}",
                        e
                    );
                    Self::default()
                }
            },
            Err(e) => {
                log::warn!(
                    "⚠️ Error leyendo archivo de configuración, usando valores por defecto: {}",
                    e
                );
                Self::default()
            }
        }
    }

    /// Guarda la configuración al archivo settings.json
    pub fn save(&self) -> Result<(), String> {
        let path = get_settings_path();

        // Asegurar que el directorio existe
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Error creando directorio de configuración: {}", e))?;
        }

        let contents = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Error serializando configuración: {}", e))?;

        fs::write(&path, contents)
            .map_err(|e| format!("Error escribiendo archivo de configuración: {}", e))?;

        log::info!("💾 Configuración guardada en {:?}", path);
        Ok(())
    }

    /// Agrega un path de biblioteca si no existe
    pub fn add_library_path(&mut self, path: &str) -> bool {
        if !self.library_paths.contains(&path.to_string()) {
            self.library_paths.push(path.to_string());
            true
        } else {
            false
        }
    }

    /// Elimina un path de biblioteca
    pub fn remove_library_path(&mut self, path: &str) -> bool {
        let initial_len = self.library_paths.len();
        self.library_paths.retain(|p| p != path);
        self.library_paths.len() != initial_len
    }

    /// Obtiene la ruta del archivo de configuración
    pub fn get_config_path() -> PathBuf {
        get_settings_path()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert!(config.library_paths.is_empty());
        assert_eq!(config.ui.theme, "system");
        assert_eq!(config.ui.language, "es");
        assert_eq!(config.audio.sample_rate, 44100);
        assert_eq!(config.conversion.bitrate, 320);
    }

    #[test]
    fn test_add_library_path() {
        let mut config = AppConfig::default();

        // Agregar nuevo path
        assert!(config.add_library_path("/home/user/Music"));
        assert_eq!(config.library_paths.len(), 1);

        // Intentar agregar duplicado
        assert!(!config.add_library_path("/home/user/Music"));
        assert_eq!(config.library_paths.len(), 1);

        // Agregar otro path
        assert!(config.add_library_path("/home/user/Music2"));
        assert_eq!(config.library_paths.len(), 2);
    }

    #[test]
    fn test_remove_library_path() {
        let mut config = AppConfig::default();
        config.library_paths.push("/home/user/Music".to_string());
        config.library_paths.push("/home/user/Music2".to_string());

        // Eliminar path existente
        assert!(config.remove_library_path("/home/user/Music"));
        assert_eq!(config.library_paths.len(), 1);

        // Intentar eliminar path que no existe
        assert!(!config.remove_library_path("/home/user/NonExistent"));
        assert_eq!(config.library_paths.len(), 1);
    }

    #[test]
    fn test_serialization() {
        let mut config = AppConfig::default();
        config.library_paths.push("/home/user/Music".to_string());
        config.ui.theme = "dark".to_string();

        let json = serde_json::to_string_pretty(&config).unwrap();
        assert!(json.contains("libraryPaths"));
        assert!(json.contains("/home/user/Music"));
        assert!(json.contains("dark"));

        // Deserializar y verificar
        let loaded: AppConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(loaded.library_paths, config.library_paths);
        assert_eq!(loaded.ui.theme, "dark");
    }

    #[test]
    fn test_load_missing_file() {
        // AIDEV-NOTE: Este test verifica que la deserialización de JSON vacío
        // retorna los valores por defecto, no depende del estado del sistema.
        let json = "{}";
        let config: AppConfig = serde_json::from_str(json).unwrap();
        
        // Con un JSON vacío, serde usa los valores por defecto
        assert!(config.library_paths.is_empty());
        assert_eq!(config.ui.theme, "system");
        assert_eq!(config.audio.sample_rate, 44100);
    }
}
