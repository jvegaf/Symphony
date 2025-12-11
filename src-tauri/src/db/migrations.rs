use rusqlite::{Connection, Result};

/// Versión actual del esquema
const CURRENT_VERSION: i32 = 1;

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
        migration_001_initial_schema(conn)?;
        update_version(conn, 1)?;
    }

    Ok(())
}

/// Obtiene la versión actual del esquema
fn get_current_version(conn: &Connection) -> Result<i32> {
    let version: Result<i32> = conn.query_row(
        "SELECT MAX(version) FROM schema_version",
        [],
        |row| row.get(0),
    );

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

/// Migración 001: Esquema inicial
fn migration_001_initial_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        -- Tabla de pistas
        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT,
            genre TEXT,
            year INTEGER,
            duration REAL NOT NULL,
            bitrate INTEGER NOT NULL,
            sample_rate INTEGER NOT NULL,
            file_size INTEGER NOT NULL,
            bpm REAL,
            key TEXT,
            rating INTEGER CHECK(rating BETWEEN 0 AND 5),
            play_count INTEGER DEFAULT 0,
            last_played TEXT,
            date_added TEXT NOT NULL,
            date_modified TEXT NOT NULL
        );

        -- Índices para tracks
        CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
        CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
        CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
        CREATE INDEX IF NOT EXISTS idx_tracks_bpm ON tracks(bpm);
        CREATE INDEX IF NOT EXISTS idx_tracks_rating ON tracks(rating);

        -- Tabla de waveforms
        CREATE TABLE IF NOT EXISTS waveforms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL,
            data BLOB NOT NULL,
            resolution INTEGER NOT NULL,
            date_generated TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_waveforms_track ON waveforms(track_id);

        -- Tabla de beatgrids
        CREATE TABLE IF NOT EXISTS beatgrids (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL,
            bpm REAL NOT NULL,
            first_beat REAL NOT NULL,
            beat_data TEXT NOT NULL,
            date_analyzed TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_beatgrids_track ON beatgrids(track_id);

        -- Tabla de cue points
        CREATE TABLE IF NOT EXISTS cue_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL,
            position REAL NOT NULL,
            label TEXT NOT NULL,
            color TEXT NOT NULL,
            cue_type TEXT NOT NULL,
            date_created TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_cue_points_track ON cue_points(track_id);

        -- Tabla de loops
        CREATE TABLE IF NOT EXISTS loops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL,
            start_position REAL NOT NULL,
            end_position REAL NOT NULL,
            label TEXT NOT NULL,
            is_active INTEGER DEFAULT 0,
            date_created TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_loops_track ON loops(track_id);

        -- Tabla de playlists
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            date_created TEXT NOT NULL,
            date_modified TEXT NOT NULL
        );

        -- Tabla de relación playlist-track
        CREATE TABLE IF NOT EXISTS playlist_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL,
            track_id INTEGER NOT NULL,
            position INTEGER NOT NULL,
            date_added TEXT NOT NULL,
            FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
            UNIQUE(playlist_id, track_id)
        );

        CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
        CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);

        -- Tabla de configuración
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            value_type TEXT NOT NULL
        );
        "
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
        assert_eq!(version, 1);
    }

    #[test]
    fn test_tables_created() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db.conn).unwrap();

        // Verificar que todas las tablas existen
        let tables = vec![
            "tracks", "waveforms", "beatgrids", "cue_points",
            "loops", "playlists", "playlist_tracks", "settings"
        ];

        for table in tables {
            let count: i32 = db.conn.query_row(
                &format!("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{}'", table),
                [],
                |row| row.get(0),
            ).unwrap();
            
            assert_eq!(count, 1, "Table {} should exist", table);
        }
    }

    #[test]
    fn test_foreign_keys_constraints() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db.conn).unwrap();

        // Insertar track
        db.conn.execute(
            "INSERT INTO tracks (path, title, artist, duration, bitrate, sample_rate, file_size, date_added, date_modified)
             VALUES ('test.mp3', 'Test', 'Artist', 180.0, 320, 44100, 8388608, '2024-01-01', '2024-01-01')",
            [],
        ).unwrap();

        let track_id: i64 = db.conn.last_insert_rowid();

        // Intentar insertar waveform con track inexistente debería fallar
        let result = db.conn.execute(
            "INSERT INTO waveforms (track_id, data, resolution, date_generated)
             VALUES (999999, X'00', 1024, '2024-01-01')",
            [],
        );

        assert!(result.is_err(), "Should fail with foreign key constraint");

        // Insertar waveform con track válido debería funcionar
        let result = db.conn.execute(
            "INSERT INTO waveforms (track_id, data, resolution, date_generated)
             VALUES (?1, X'00', 1024, '2024-01-01')",
            [track_id],
        );

        assert!(result.is_ok(), "Should succeed with valid track_id");
    }
}
