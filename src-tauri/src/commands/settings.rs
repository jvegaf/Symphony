use tauri::State;
use rusqlite::Connection;
use std::sync::Mutex;
use crate::db::queries::settings;
use crate::db::models::Setting;

/// Obtiene el valor de una configuración específica
#[tauri::command]
pub fn get_setting(
    db: State<'_, Mutex<Connection>>,
    key: String,
) -> Result<Option<Setting>, String> {
    let conn = db.lock().unwrap();
    settings::get_setting(&conn, &key)
        .map_err(|e| e.to_string())
}

/// Obtiene todas las configuraciones
#[tauri::command]
pub fn get_all_settings(
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<Setting>, String> {
    let conn = db.lock().unwrap();
    settings::get_all_settings(&conn)
        .map_err(|e| e.to_string())
}

/// Actualiza o crea una configuración
#[tauri::command]
pub fn update_setting(
    db: State<'_, Mutex<Connection>>,
    key: String,
    value: String,
    value_type: String,
) -> Result<(), String> {
    let conn = db.lock().unwrap();
    settings::upsert_setting(&conn, &key, &value, &value_type)
        .map_err(|e| e.to_string())
}

/// Resetea todas las configuraciones a valores por defecto
#[tauri::command]
pub fn reset_settings(
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().unwrap();
    settings::reset_all_settings(&conn)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    // AIDEV-NOTE: Los tests para comandos Tauri requieren un entorno de runtime completo.
    // State<'_, Mutex<Connection>> no se puede construir en tests unitarios porque
    // requiere el contexto de runtime de Tauri.
    //
    // Los tests para estos comandos deben ejecutarse como tests de integración E2E
    // usando la API de Tauri para tests.
    //
    // Casos de prueba documentados:
    //
    // #[test]
    // fn test_get_setting_command() {
    //     // Inicializar app de prueba con Tauri
    //     // Invocar comando get_setting("ui.theme")
    //     // Verificar que retorna Setting
    // }
    //
    // #[test]
    // fn test_get_all_settings_command() {
    //     // Invocar get_all_settings()
    //     // Verificar que retorna Vec<Setting> no vacío
    // }
    //
    // #[test]
    // fn test_update_setting_command() {
    //     // Invocar update_setting("ui.theme", "dark", "string")
    //     // Verificar que se actualiza correctamente
    //     // Invocar get_setting("ui.theme")
    //     // Verificar que el valor cambió
    // }
    //
    // #[test]
    // fn test_reset_settings_command() {
    //     // Modificar varias settings
    //     // Invocar reset_settings()
    //     // Verificar que todas vuelven a defaults
    // }
    //
    // #[test]
    // fn test_error_handling() {
    //     // Probar con DB corrupto
    //     // Verificar que los errores se convierten a String correctamente
    // }
}
