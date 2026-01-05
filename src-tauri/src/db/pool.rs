//! Pool de conexiones SQLite con r2d2
//!
//! AIDEV-NOTE: Este módulo reemplaza el patrón get_connection() que creaba
//! una nueva conexión por cada request, causando lag significativo (~100-500ms).
//! Con el pool, las conexiones se reutilizan, reduciendo el overhead a ~1-5ms.
//!
//! Configuración optimizada para aplicación desktop:
//! - max_size: 10 conexiones (suficiente para concurrencia moderada)
//! - min_idle: 2 conexiones siempre listas (reduce latencia del primer request)
//! - WAL mode para mejor concurrencia lectura/escritura

use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use std::path::Path;
use std::time::Duration;

/// Tipo alias para el pool de conexiones SQLite
pub type DbPool = Pool<SqliteConnectionManager>;

/// Tipo alias para una conexión del pool
pub type PooledConn = PooledConnection<SqliteConnectionManager>;

/// Crea un nuevo pool de conexiones SQLite optimizado para desktop
///
/// # Arguments
/// * `db_path` - Ruta al archivo de base de datos SQLite
///
/// # Returns
/// Pool configurado con PRAGMAs de optimización
///
/// # PRAGMAs aplicados
/// - `foreign_keys = ON`: Habilita integridad referencial
/// - `journal_mode = WAL`: Write-Ahead Logging para mejor concurrencia
/// - `synchronous = NORMAL`: Balance entre seguridad y performance
/// - `cache_size = -64000`: 64MB de cache en memoria
/// - `temp_store = MEMORY`: Tablas temporales en RAM
pub fn create_pool(db_path: &Path) -> Result<DbPool, r2d2::Error> {
    let manager = SqliteConnectionManager::file(db_path).with_init(|conn| {
        // PRAGMAs de optimización aplicados a cada conexión del pool
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA cache_size = -64000;
             PRAGMA temp_store = MEMORY;",
        )?;
        Ok(())
    });

    Pool::builder()
        .max_size(10) // Máximo 10 conexiones concurrentes
        .min_idle(Some(2)) // Mantener 2 conexiones siempre listas
        .connection_timeout(Duration::from_secs(5)) // Timeout de 5s para obtener conexión
        .idle_timeout(Some(Duration::from_secs(300))) // Cerrar conexiones idle después de 5min
        .build(manager)
}

/// Crea un pool de conexiones en memoria para tests
///
/// AIDEV-NOTE: Usa una sola conexión porque SQLite in-memory
/// no comparte estado entre conexiones diferentes.
#[cfg(test)]
pub fn create_test_pool() -> Result<DbPool, r2d2::Error> {
    let manager = SqliteConnectionManager::memory().with_init(|conn| {
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        Ok(())
    });

    Pool::builder()
        .max_size(1) // Solo 1 conexión para tests in-memory
        .build(manager)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_create_pool_success() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let pool = create_pool(&db_path);
        assert!(pool.is_ok());

        let pool = pool.unwrap();
        assert_eq!(pool.max_size(), 10);
    }

    #[test]
    fn test_pool_connection_works() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let pool = create_pool(&db_path).unwrap();
        let conn = pool.get().unwrap();

        // Verificar que los PRAGMAs se aplicaron
        let foreign_keys: i32 = conn
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .unwrap();
        assert_eq!(foreign_keys, 1);

        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .unwrap();
        assert_eq!(journal_mode.to_lowercase(), "wal");
    }

    #[test]
    fn test_pool_multiple_connections() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let pool = create_pool(&db_path).unwrap();

        // Obtener múltiples conexiones simultáneas
        let conn1 = pool.get().unwrap();
        let conn2 = pool.get().unwrap();
        let conn3 = pool.get().unwrap();

        // Todas deben funcionar
        let _: i32 = conn1.query_row("SELECT 1", [], |row| row.get(0)).unwrap();
        let _: i32 = conn2.query_row("SELECT 2", [], |row| row.get(0)).unwrap();
        let _: i32 = conn3.query_row("SELECT 3", [], |row| row.get(0)).unwrap();
    }

    #[test]
    fn test_create_test_pool() {
        let pool = create_test_pool();
        assert!(pool.is_ok());

        let pool = pool.unwrap();
        assert_eq!(pool.max_size(), 1);

        let conn = pool.get().unwrap();
        let result: i32 = conn.query_row("SELECT 42", [], |row| row.get(0)).unwrap();
        assert_eq!(result, 42);
    }
}
