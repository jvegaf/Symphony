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
/// NOTA: Esta es una implementación simple. Para producción,
/// considerar usar un pool de conexiones.
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
