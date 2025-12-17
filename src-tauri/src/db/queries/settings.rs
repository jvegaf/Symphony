use crate::db::models::Setting;
/// Queries para gestión de settings de aplicación
/// AIDEV-NOTE: Settings almacenados como key-value pairs con tipo explícito
/// para facilitar validación y conversión en frontend
use rusqlite::{Connection, OptionalExtension, Result};

/// Settings por defecto de la aplicación
/// AIDEV-NOTE: Inicializados la primera vez que se accede a la base de datos
const DEFAULT_SETTINGS: &[(&str, &str, &str)] = &[
    // UI
    ("ui.theme", "system", "string"),
    ("ui.language", "es", "string"),
    ("ui.waveform_resolution", "1000", "number"),
    // Audio
    ("audio.output_device", "default", "string"),
    ("audio.sample_rate", "44100", "number"),
    ("audio.buffer_size", "2048", "number"),
    // Library
    ("library.auto_scan_on_startup", "false", "boolean"),
    ("library.scan_interval_hours", "0", "number"),
    ("library.import_folder", "", "string"),
    // Conversion
    ("conversion.enabled", "false", "boolean"),
    ("conversion.auto_convert", "false", "boolean"),
    ("conversion.bitrate", "320", "number"),
    ("conversion.output_folder", "", "string"),
    ("conversion.preserve_structure", "true", "boolean"),
];

/// Obtiene un setting por clave
///
/// # Argumentos
/// * `conn` - Conexión a la base de datos
/// * `key` - Clave del setting (ej: "ui.theme")
///
/// # Retorna
/// * `Ok(Some(Setting))` - Setting encontrado
/// * `Ok(None)` - Setting no existe
/// * `Err` - Error de base de datos
pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<Setting>> {
    let mut stmt = conn.prepare("SELECT key, value, value_type FROM settings WHERE key = ?1")?;

    let setting = stmt
        .query_row([key], |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
                value_type: row.get(2)?,
            })
        })
        .optional()?;

    Ok(setting)
}

/// Obtiene todos los settings ordenados por clave
///
/// # Argumentos
/// * `conn` - Conexión a la base de datos
///
/// # Retorna
/// * `Ok(Vec<Setting>)` - Lista de todos los settings
/// * `Err` - Error de base de datos
pub fn get_all_settings(conn: &Connection) -> Result<Vec<Setting>> {
    let mut stmt = conn.prepare("SELECT key, value, value_type FROM settings ORDER BY key")?;

    let settings = stmt
        .query_map([], |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
                value_type: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(settings)
}

/// Actualiza o inserta un setting
/// AIDEV-NOTE: Usa UPSERT (INSERT ... ON CONFLICT) para actualizar si existe
///
/// # Argumentos
/// * `conn` - Conexión a la base de datos
/// * `key` - Clave del setting
/// * `value` - Valor como string (se debe convertir en frontend según value_type)
/// * `value_type` - Tipo del valor: "string", "number", "boolean", "json"
///
/// # Retorna
/// * `Ok(())` - Setting actualizado/insertado correctamente
/// * `Err` - Error de base de datos
pub fn upsert_setting(conn: &Connection, key: &str, value: &str, value_type: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value, value_type) 
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET 
            value = excluded.value,
            value_type = excluded.value_type",
        [key, value, value_type],
    )?;
    Ok(())
}

/// Elimina un setting
/// AIDEV-NOTE: Útil para retornar a valor por defecto sin tener que conocerlo
///
/// # Argumentos
/// * `conn` - Conexión a la base de datos
/// * `key` - Clave del setting a eliminar
///
/// # Retorna
/// * `Ok(())` - Setting eliminado (o no existía, ambos casos son éxito)
/// * `Err` - Error de base de datos
pub fn delete_setting(conn: &Connection, key: &str) -> Result<()> {
    conn.execute("DELETE FROM settings WHERE key = ?1", [key])?;
    Ok(())
}

/// Resetea todos los settings a valores por defecto
///
/// # Argumentos
/// * `conn` - Conexión a la base de datos
///
/// # Retorna
/// * `Ok(())` - Settings reseteados correctamente
/// * `Err` - Error de base de datos
pub fn reset_all_settings(conn: &Connection) -> Result<()> {
    conn.execute("DELETE FROM settings", [])?;
    initialize_default_settings(conn)?;
    Ok(())
}

/// Inicializa settings por defecto si no existen
/// AIDEV-NOTE: Idempotente - no inserta duplicados
///
/// # Argumentos
/// * `conn` - Conexión a la base de datos
///
/// # Retorna
/// * `Ok(())` - Settings inicializados (o ya existían)
/// * `Err` - Error de base de datos
pub fn initialize_default_settings(conn: &Connection) -> Result<()> {
    for (key, value, value_type) in DEFAULT_SETTINGS {
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM settings WHERE key = ?1",
            [key],
            |row| row.get(0),
        )?;

        if !exists {
            upsert_setting(conn, key, value, value_type)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: Crear base de datos temporal para tests
    /// AIDEV-NOTE: Usa in-memory database para evitar problemas de permisos
    fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();

        // Crear tabla settings
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                value_type TEXT NOT NULL
            )",
            [],
        )
        .unwrap();

        conn
    }

    #[test]
    fn test_get_setting_existing() {
        let conn = create_test_db();

        // Insertar setting de prueba
        conn.execute(
            "INSERT INTO settings (key, value, value_type) VALUES (?, ?, ?)",
            ["test.key", "test_value", "string"],
        )
        .unwrap();

        // Obtener setting
        let setting = get_setting(&conn, "test.key").unwrap();

        assert!(setting.is_some());
        let setting = setting.unwrap();
        assert_eq!(setting.key, "test.key");
        assert_eq!(setting.value, "test_value");
        assert_eq!(setting.value_type, "string");
    }

    #[test]
    fn test_get_setting_non_existing() {
        let conn = create_test_db();

        let setting = get_setting(&conn, "non.existing.key").unwrap();

        assert!(setting.is_none());
    }

    #[test]
    fn test_get_all_settings_with_data() {
        let conn = create_test_db();

        // Insertar múltiples settings
        conn.execute(
            "INSERT INTO settings (key, value, value_type) VALUES (?, ?, ?)",
            ["ui.theme", "dark", "string"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO settings (key, value, value_type) VALUES (?, ?, ?)",
            ["audio.volume", "80", "number"],
        )
        .unwrap();

        let settings = get_all_settings(&conn).unwrap();

        assert_eq!(settings.len(), 2);
        // Verificar orden alfabético por clave
        assert_eq!(settings[0].key, "audio.volume");
        assert_eq!(settings[1].key, "ui.theme");
    }

    #[test]
    fn test_get_all_settings_empty() {
        let conn = create_test_db();

        let settings = get_all_settings(&conn).unwrap();

        assert_eq!(settings.len(), 0);
    }

    #[test]
    fn test_upsert_setting_insert() {
        let conn = create_test_db();

        upsert_setting(&conn, "new.setting", "value123", "string").unwrap();

        let setting = get_setting(&conn, "new.setting").unwrap().unwrap();
        assert_eq!(setting.value, "value123");
        assert_eq!(setting.value_type, "string");
    }

    #[test]
    fn test_upsert_setting_update() {
        let conn = create_test_db();

        // Insertar setting inicial
        upsert_setting(&conn, "test.key", "old_value", "string").unwrap();

        // Actualizar
        upsert_setting(&conn, "test.key", "new_value", "number").unwrap();

        let setting = get_setting(&conn, "test.key").unwrap().unwrap();
        assert_eq!(setting.value, "new_value");
        assert_eq!(setting.value_type, "number");
    }

    #[test]
    fn test_delete_setting_existing() {
        let conn = create_test_db();

        upsert_setting(&conn, "to.delete", "value", "string").unwrap();

        delete_setting(&conn, "to.delete").unwrap();

        let setting = get_setting(&conn, "to.delete").unwrap();
        assert!(setting.is_none());
    }

    #[test]
    fn test_delete_setting_non_existing() {
        let conn = create_test_db();

        // No debe fallar al eliminar algo que no existe
        let result = delete_setting(&conn, "non.existing");
        assert!(result.is_ok());
    }

    #[test]
    fn test_reset_all_settings() {
        let conn = create_test_db();

        // Insertar settings personalizados
        upsert_setting(&conn, "custom.key1", "value1", "string").unwrap();
        upsert_setting(&conn, "custom.key2", "value2", "number").unwrap();

        // Resetear
        reset_all_settings(&conn).unwrap();

        // Verificar que se eliminaron los personalizados
        assert!(get_setting(&conn, "custom.key1").unwrap().is_none());
        assert!(get_setting(&conn, "custom.key2").unwrap().is_none());

        // Verificar que se insertaron los defaults
        let settings = get_all_settings(&conn).unwrap();
        assert_eq!(settings.len(), DEFAULT_SETTINGS.len());
    }

    #[test]
    fn test_initialize_default_settings_first_time() {
        let conn = create_test_db();

        initialize_default_settings(&conn).unwrap();

        let settings = get_all_settings(&conn).unwrap();
        assert_eq!(settings.len(), DEFAULT_SETTINGS.len());

        // Verificar algunos defaults específicos
        let theme = get_setting(&conn, "ui.theme").unwrap().unwrap();
        assert_eq!(theme.value, "system");

        let bitrate = get_setting(&conn, "conversion.bitrate").unwrap().unwrap();
        assert_eq!(bitrate.value, "320");
    }

    #[test]
    fn test_initialize_default_settings_idempotent() {
        let conn = create_test_db();

        // Primera inicialización
        initialize_default_settings(&conn).unwrap();
        let count_first = get_all_settings(&conn).unwrap().len();

        // Segunda inicialización (no debe duplicar)
        initialize_default_settings(&conn).unwrap();
        let count_second = get_all_settings(&conn).unwrap().len();

        assert_eq!(count_first, count_second);
        assert_eq!(count_first, DEFAULT_SETTINGS.len());
    }

    #[test]
    fn test_validate_value_types() {
        let conn = create_test_db();

        // Insertar settings de diferentes tipos
        upsert_setting(&conn, "test.string", "hello", "string").unwrap();
        upsert_setting(&conn, "test.number", "42", "number").unwrap();
        upsert_setting(&conn, "test.boolean", "true", "boolean").unwrap();
        upsert_setting(&conn, "test.json", "{\"key\":\"value\"}", "json").unwrap();

        // Verificar que se almacenaron con el tipo correcto
        let string_setting = get_setting(&conn, "test.string").unwrap().unwrap();
        assert_eq!(string_setting.value_type, "string");

        let number_setting = get_setting(&conn, "test.number").unwrap().unwrap();
        assert_eq!(number_setting.value_type, "number");

        let boolean_setting = get_setting(&conn, "test.boolean").unwrap().unwrap();
        assert_eq!(boolean_setting.value_type, "boolean");

        let json_setting = get_setting(&conn, "test.json").unwrap().unwrap();
        assert_eq!(json_setting.value_type, "json");
    }
}
