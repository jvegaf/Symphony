//! Comandos Tauri para gestión de configuraciones
//!
//! AIDEV-NOTE: Migrado a DbPool + spawn_blocking para evitar bloquear el runtime de Tokio.

use crate::db::models::Setting;
use crate::db::queries::settings;
use crate::db::DbPool;
use tauri::State;

/// Obtiene el valor de una configuración específica
#[tauri::command]
pub async fn get_setting(
    pool: State<'_, DbPool>,
    key: String,
) -> Result<Option<Setting>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        settings::get_setting(&conn, &key).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Obtiene todas las configuraciones
#[tauri::command]
pub async fn get_all_settings(pool: State<'_, DbPool>) -> Result<Vec<Setting>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        settings::get_all_settings(&conn).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Actualiza o crea una configuración
#[tauri::command]
pub async fn update_setting(
    pool: State<'_, DbPool>,
    key: String,
    value: String,
    value_type: String,
) -> Result<(), String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        settings::upsert_setting(&conn, &key, &value, &value_type).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Resetea todas las configuraciones a valores por defecto
#[tauri::command]
pub async fn reset_settings(pool: State<'_, DbPool>) -> Result<(), String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        settings::reset_all_settings(&conn).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[cfg(test)]
mod tests {
    // AIDEV-NOTE: Los tests para comandos Tauri requieren un entorno de runtime completo.
    // State<'_, DbPool> no se puede construir en tests unitarios porque
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
