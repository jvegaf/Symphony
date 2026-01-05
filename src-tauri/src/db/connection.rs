use rusqlite::{Connection, Result};
use std::path::PathBuf;

#[cfg(not(test))]
use crate::utils::paths::{ensure_app_dirs, get_db_path as get_app_db_path};

/// Wrapper para la conexión de base de datos SQLite
pub struct Database {
    pub conn: Connection,
}

impl Database {
    /// Crea una nueva conexión a la base de datos
    ///
    /// La base de datos se crea en el directorio de configuración de la aplicación.
    /// Para tests, usa conexión en memoria.
    pub fn new() -> Result<Self> {
        let db_path = Self::get_db_path();
        let conn = Connection::open(&db_path)?;

        // Habilitar foreign keys
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        Ok(Database { conn })
    }

    /// Crea una conexión en memoria para tests
    #[cfg(test)]
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        Ok(Database { conn })
    }

    /// Obtiene la ruta de la base de datos
    fn get_db_path() -> PathBuf {
        #[cfg(test)]
        {
            PathBuf::from(":memory:")
        }

        #[cfg(not(test))]
        {
            // AIDEV-NOTE: Usar función centralizada de paths.rs
            // Asegura que el directorio existe antes de retornar la ruta
            ensure_app_dirs().expect("No se pudo crear el directorio de configuración");
            get_app_db_path()
        }
    }
}

/// Obtiene una conexión global a la base de datos
///
/// AIDEV-NOTE: DEPRECATED - Usar DbPool en su lugar para mejor rendimiento.
/// Esta función crea una nueva conexión cada vez que se llama, lo cual es
/// ineficiente (~100-500ms de overhead por operación). El pool de conexiones
/// reutiliza conexiones existentes (~1-5ms).
///
/// El pool se obtiene como State<DbPool> en comandos Tauri:
/// ```ignore
/// #[tauri::command]
/// pub async fn my_command(pool: State<'_, DbPool>) -> Result<(), String> {
///     let pool = pool.inner().clone();
///     tokio::task::spawn_blocking(move || {
///         let conn = pool.get().map_err(|e| e.to_string())?;
///         // ... operaciones DB
///         Ok(())
///     }).await.map_err(|e| format!("{}", e))?
/// }
/// ```
#[deprecated(
    since = "0.19.0",
    note = "Use DbPool instead. See db::create_pool() and State<DbPool> in Tauri commands."
)]
pub fn get_connection() -> Result<Database> {
    Database::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_database() {
        let db = Database::new();
        assert!(db.is_ok());
    }

    #[test]
    fn test_in_memory_database() {
        let db = Database::new_in_memory();
        assert!(db.is_ok());
    }

    #[test]
    fn test_foreign_keys_enabled() {
        let db = Database::new_in_memory().unwrap();
        let mut stmt = db.conn.prepare("PRAGMA foreign_keys").unwrap();
        let enabled: i32 = stmt.query_row([], |row| row.get(0)).unwrap();
        assert_eq!(enabled, 1);
    }
}
