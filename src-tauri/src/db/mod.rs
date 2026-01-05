mod connection;
pub mod migrations;
/// Módulo de base de datos para Symphony
///
/// Gestiona la conexión, migraciones y operaciones CRUD
/// sobre SQLite para metadatos de pistas, playlists y configuración.
pub mod models;
pub mod pool;
pub mod queries;

// AIDEV-NOTE: get_connection está deprecado. Usar DbPool en su lugar.
#[allow(deprecated)]
pub use connection::{get_connection, Database};
pub use pool::{create_pool, DbPool, PooledConn};

use rusqlite::Result;

/// Inicializa la base de datos y ejecuta migraciones pendientes
#[allow(deprecated)]
pub fn initialize() -> Result<()> {
    let db = Database::new()?;
    migrations::run_migrations(&db.conn)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initialize_database() {
        let result = Database::new();
        assert!(result.is_ok());
    }
}
