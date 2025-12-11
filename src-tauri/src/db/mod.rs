/// Módulo de base de datos para Symphony
/// 
/// Gestiona la conexión, migraciones y operaciones CRUD
/// sobre SQLite para metadatos de pistas, playlists y configuración.

pub mod models;
pub mod queries;
pub mod migrations;
mod connection;

pub use connection::{Database, get_connection};
pub use models::*;

use rusqlite::Result;

/// Inicializa la base de datos y ejecuta migraciones pendientes
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
