/**
 * Runner de migraciones
 * 
 * Gestiona la ejecución de migraciones pendientes y el control
 * de versiones del esquema de la base de datos.
 */

use rusqlite::{Connection, Result};
use super::schema;

/// Versión actual del esquema
/// AIDEV-NOTE: Versión 5 añade columna beatport_id para tracking de pistas fixeadas
#[allow(dead_code)]
const CURRENT_VERSION: i32 = 5;

/// Ejecuta todas las migraciones pendientes
pub fn run_migrations(conn: &Connection) -> Result<()> {
    // Crear tabla de versiones si no existe
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        )",
        [],
    )?;

    let current_version = get_current_version(conn)?;

    if current_version < 1 {
        schema::migration_001_initial_schema(conn)?;
        update_version(conn, 1)?;
    }

    if current_version < 2 {
        schema::migration_002_update_analysis_tables(conn)?;
        update_version(conn, 2)?;
    }

    if current_version < 3 {
        schema::migration_003_uuid_migration(conn)?;
        update_version(conn, 3)?;
    }

    if current_version < 4 {
        schema::migration_004_beatport_fields(conn)?;
        update_version(conn, 4)?;
    }

    if current_version < 5 {
        schema::migration_005_beatport_id(conn)?;
        update_version(conn, 5)?;
    }

    Ok(())
}

/// Obtiene la versión actual del esquema
pub(super) fn get_current_version(conn: &Connection) -> Result<i32> {
    let version: Result<i32> =
        conn.query_row("SELECT MAX(version) FROM schema_version", [], |row| {
            row.get(0)
        });

    match version {
        Ok(v) => Ok(v),
        Err(_) => Ok(0),
    }
}

/// Actualiza la versión del esquema
fn update_version(conn: &Connection, version: i32) -> Result<()> {
    conn.execute(
        "INSERT INTO schema_version (version, applied_at) VALUES (?1, datetime('now'))",
        [version],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;

    #[test]
    fn test_run_migrations() {
        let db = Database::new_in_memory().unwrap();
        let result = run_migrations(&db.conn);
        assert!(result.is_ok());
    }

    #[test]
    fn test_schema_version() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db.conn).unwrap();

        let version = get_current_version(&db.conn).unwrap();
        assert_eq!(version, 5);
    }

    #[test]
    fn test_tables_created() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db.conn).unwrap();

        // Verificar que todas las tablas existen
        let tables = vec![
            "tracks",
            "waveforms",
            "beatgrids",
            "cue_points",
            "loops",
            "playlists",
            "playlist_tracks",
            "settings",
        ];

        for table in tables {
            let count: i32 = db
                .conn
                .query_row(
                    &format!(
                        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{}'",
                        table
                    ),
                    [],
                    |row| row.get(0),
                )
                .unwrap();

            assert_eq!(count, 1, "Table {} should exist", table);
        }
    }

    #[test]
    fn test_foreign_keys_constraints() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db.conn).unwrap();

        let track_id = "test-track-uuid-123";

        // Insertar track
        db.conn.execute(
            "INSERT INTO tracks (id, path, title, artist, duration, bitrate, sample_rate, file_size, date_added, date_modified)
             VALUES (?1, 'test.mp3', 'Test', 'Artist', 180.0, 320, 44100, 8388608, '2024-01-01', '2024-01-01')",
            [track_id],
        ).unwrap();

        // Intentar insertar waveform con track inexistente debería fallar
        let result = db.conn.execute(
            "INSERT INTO waveforms (id, track_id, data, resolution, date_generated)
             VALUES ('wf-invalid', 'non-existent-track', X'00', 1024, '2024-01-01')",
            [],
        );

        assert!(result.is_err(), "Should fail with foreign key constraint");

        // Insertar waveform con track válido debería funcionar
        let result = db.conn.execute(
            "INSERT INTO waveforms (id, track_id, data, resolution, date_generated)
             VALUES ('wf-valid', ?1, X'00', 1024, '2024-01-01')",
            [track_id],
        );

        assert!(result.is_ok(), "Should succeed with valid track_id");
    }
}
