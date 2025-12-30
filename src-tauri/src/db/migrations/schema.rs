/**
 * Definiciones de esquema de base de datos
 * 
 * Contiene todas las funciones de migración que crean o modifican
 * el esquema de la base de datos.
 */

use rusqlite::{Connection, Result};

/// Migración 001: Esquema inicial
pub(super) fn migration_001_initial_schema(conn: &Connection) -> Result<()> {
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
        ",
    )?;

    Ok(())
}

/// Migración 002: Actualizar tablas de análisis (beatgrids, cue_points, loops)
pub(super) fn migration_002_update_analysis_tables(conn: &Connection) -> Result<()> {
    // Drop y recrear tabla beatgrids con nuevos campos
    conn.execute_batch(
        "
        DROP TABLE IF EXISTS beatgrids;
        
        CREATE TABLE beatgrids (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL UNIQUE,
            bpm REAL NOT NULL,
            offset REAL NOT NULL,
            confidence REAL,
            analyzed_at TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_beatgrids_track ON beatgrids(track_id);
        ",
    )?;

    // Drop y recrear tabla cue_points con nuevos campos
    conn.execute_batch(
        "
        DROP TABLE IF EXISTS cue_points;
        
        CREATE TABLE cue_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL,
            position REAL NOT NULL,
            label TEXT NOT NULL,
            color TEXT NOT NULL,
            type TEXT NOT NULL,
            hotkey INTEGER CHECK(hotkey BETWEEN 1 AND 8),
            created_at TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_cue_points_track ON cue_points(track_id);
        CREATE INDEX idx_cue_points_position ON cue_points(position);
        ",
    )?;

    // Drop y recrear tabla loops con nuevos campos
    conn.execute_batch(
        "
        DROP TABLE IF EXISTS loops;
        
        CREATE TABLE loops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL,
            label TEXT NOT NULL,
            loop_start REAL NOT NULL,
            loop_end REAL NOT NULL,
            is_active INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_loops_track ON loops(track_id);
        CREATE INDEX idx_loops_start ON loops(loop_start);
        ",
    )?;

    Ok(())
}

/// Migración 003: Cambiar todos los IDs de INTEGER a TEXT (UUID)
/// AIDEV-NOTE: Como no hay datos que migrar (base de datos nueva), hacemos DROP y CREATE
pub(super) fn migration_003_uuid_migration(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        -- Drop todas las tablas (orden importante por foreign keys)
        DROP TABLE IF EXISTS playlist_tracks;
        DROP TABLE IF EXISTS playlists;
        DROP TABLE IF EXISTS loops;
        DROP TABLE IF EXISTS cue_points;
        DROP TABLE IF EXISTS beatgrids;
        DROP TABLE IF EXISTS waveforms;
        DROP TABLE IF EXISTS tracks;
        DROP TABLE IF EXISTS settings;

        -- Recrear tabla tracks con UUID
        CREATE TABLE tracks (
            id TEXT PRIMARY KEY,
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

        CREATE INDEX idx_tracks_artist ON tracks(artist);
        CREATE INDEX idx_tracks_album ON tracks(album);
        CREATE INDEX idx_tracks_genre ON tracks(genre);
        CREATE INDEX idx_tracks_bpm ON tracks(bpm);
        CREATE INDEX idx_tracks_rating ON tracks(rating);

        -- Recrear tabla waveforms con UUID
        CREATE TABLE waveforms (
            id TEXT PRIMARY KEY,
            track_id TEXT NOT NULL UNIQUE,
            data BLOB NOT NULL,
            resolution INTEGER NOT NULL,
            date_generated TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_waveforms_track ON waveforms(track_id);

        -- Recrear tabla beatgrids con UUID
        CREATE TABLE beatgrids (
            id TEXT PRIMARY KEY,
            track_id TEXT NOT NULL UNIQUE,
            bpm REAL NOT NULL,
            offset REAL NOT NULL,
            confidence REAL,
            analyzed_at TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_beatgrids_track ON beatgrids(track_id);

        -- Recrear tabla cue_points con UUID
        CREATE TABLE cue_points (
            id TEXT PRIMARY KEY,
            track_id TEXT NOT NULL,
            position REAL NOT NULL,
            label TEXT NOT NULL,
            color TEXT NOT NULL,
            type TEXT NOT NULL,
            hotkey INTEGER CHECK(hotkey BETWEEN 1 AND 8),
            created_at TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_cue_points_track ON cue_points(track_id);
        CREATE INDEX idx_cue_points_position ON cue_points(position);

        -- Recrear tabla loops con UUID
        CREATE TABLE loops (
            id TEXT PRIMARY KEY,
            track_id TEXT NOT NULL,
            label TEXT NOT NULL,
            loop_start REAL NOT NULL,
            loop_end REAL NOT NULL,
            is_active INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_loops_track ON loops(track_id);
        CREATE INDEX idx_loops_start ON loops(loop_start);

        -- Recrear tabla playlists con UUID
        CREATE TABLE playlists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            date_created TEXT NOT NULL,
            date_modified TEXT NOT NULL
        );

        -- Recrear tabla playlist_tracks con UUID
        CREATE TABLE playlist_tracks (
            id TEXT PRIMARY KEY,
            playlist_id TEXT NOT NULL,
            track_id TEXT NOT NULL,
            position INTEGER NOT NULL,
            date_added TEXT NOT NULL,
            FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
            UNIQUE(playlist_id, track_id)
        );

        CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
        CREATE INDEX idx_playlist_tracks_track ON playlist_tracks(track_id);

        -- Recrear tabla settings (sin cambios)
        CREATE TABLE settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            value_type TEXT NOT NULL
        );
        ",
    )?;

    Ok(())
}

/// Migración 004: Añade campos label e isrc para integración con Beatport
/// 
/// Añade columnas opcionales para almacenar información adicional
/// extraída de Beatport al hacer "Fix Tags".
pub(super) fn migration_004_beatport_fields(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        -- Añadir columna label (sello discográfico)
        ALTER TABLE tracks ADD COLUMN label TEXT;

        -- Añadir columna isrc (International Standard Recording Code)
        ALTER TABLE tracks ADD COLUMN isrc TEXT;

        -- Índice para búsquedas por label
        CREATE INDEX IF NOT EXISTS idx_tracks_label ON tracks(label);
        ",
    )?;

    Ok(())
}

/// Migración 005: Añade campo beatport_id para tracking de pistas fixeadas
/// 
/// Este campo almacena el ID de Beatport cuando una pista fue fixeada,
/// permitiendo identificar rápidamente qué pistas fueron procesadas.
pub(super) fn migration_005_beatport_id(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        -- Añadir columna beatport_id (ID del track en Beatport cuando fue fixeado)
        ALTER TABLE tracks ADD COLUMN beatport_id INTEGER;

        -- Índice para búsquedas de pistas fixeadas
        CREATE INDEX IF NOT EXISTS idx_tracks_beatport_id ON tracks(beatport_id);
        ",
    )?;

    Ok(())
}
