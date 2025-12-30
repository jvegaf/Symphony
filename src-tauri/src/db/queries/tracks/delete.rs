//! Operaciones de eliminación de tracks y reset de biblioteca

use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};

/// Resultado de reset de biblioteca
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetLibraryResult {
    pub tracks_deleted: usize,
    pub playlists_deleted: usize,
    pub waveforms_deleted: usize,
}

/// Elimina un track por ID
pub fn delete_track(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM tracks WHERE id = ?1", [id])?;
    Ok(())
}

/// Resetea completamente la biblioteca (elimina todos los tracks, playlists, waveforms)
pub fn reset_library(conn: &Connection) -> Result<ResetLibraryResult> {
    // Contar antes de eliminar
    let tracks_deleted = conn.query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get::<_, usize>(0))?;
    let playlists_deleted = conn.query_row("SELECT COUNT(*) FROM playlists", [], |row| row.get::<_, usize>(0))?;
    let waveforms_deleted = conn.query_row("SELECT COUNT(*) FROM waveforms", [], |row| row.get::<_, usize>(0))?;

    // Eliminar en orden para respetar foreign keys
    conn.execute("DELETE FROM waveforms", [])?;
    conn.execute("DELETE FROM loops", [])?;
    conn.execute("DELETE FROM cue_points", [])?;
    conn.execute("DELETE FROM beatgrids", [])?;
    conn.execute("DELETE FROM playlist_tracks", [])?;
    conn.execute("DELETE FROM playlists", [])?;
    conn.execute("DELETE FROM tracks", [])?;

    Ok(ResetLibraryResult {
        tracks_deleted,
        playlists_deleted,
        waveforms_deleted,
    })
}
