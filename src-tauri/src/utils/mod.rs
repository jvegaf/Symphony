/// Módulo de utilidades para Symphony
///
/// Contiene funciones auxiliares para rutas, configuración, etc.
pub mod paths;
pub mod path_utils;

pub use paths::{ensure_app_dirs, get_app_config_dir, get_settings_path};
pub use path_utils::{extract_date_from_path, extract_full_date_from_path};
