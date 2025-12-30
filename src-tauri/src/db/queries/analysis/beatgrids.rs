/**
 * CRUD para beatgrids (análisis de tempo y grid)
 */

use crate::db::models::Beatgrid;
use rusqlite::{params, Connection, OptionalExtension, Result};
use uuid::Uuid;

/// Inserta o actualiza beatgrid analizado para una pista
pub fn upsert_beatgrid(
    conn: &Connection,
    track_id: &str,
    bpm: f64,
    offset: f64,
    confidence: Option<f64>,
) -> Result<String> {
    // Verificar si ya existe
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM beatgrids WHERE track_id = ?1",
            [track_id],
            |row| row.get(0),
        )
        .optional()?;

    if let Some(id) = existing {
        // Actualizar existente
        conn.execute(
            "UPDATE beatgrids SET bpm = ?1, offset = ?2, confidence = ?3, analyzed_at = datetime('now')
             WHERE id = ?4",
            params![bpm, offset, confidence, &id],
        )?;
        Ok(id)
    } else {
        // Insertar nuevo
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO beatgrids (id, track_id, bpm, offset, confidence, analyzed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))",
            params![&id, track_id, bpm, offset, confidence],
        )?;
        Ok(id)
    }
}

/// Obtiene beatgrid de una pista
pub fn get_beatgrid(conn: &Connection, track_id: &str) -> Result<Option<Beatgrid>> {
    conn.query_row(
        "SELECT id, track_id, bpm, offset, confidence, analyzed_at
         FROM beatgrids
         WHERE track_id = ?1",
        [track_id],
        |row| {
            Ok(Beatgrid {
                id: row.get(0)?,
                track_id: row.get(1)?,
                bpm: row.get(2)?,
                offset: row.get(3)?,
                confidence: row.get(4)?,
                analyzed_at: row.get(5)?,
            })
        },
    )
    .optional()
}

/// Actualiza solo el offset del beatgrid (ajuste fino manual)
pub fn update_beatgrid_offset(conn: &Connection, track_id: &str, offset: f64) -> Result<()> {
    conn.execute(
        "UPDATE beatgrids SET offset = ?1 WHERE track_id = ?2",
        params![offset, track_id],
    )?;
    Ok(())
}

/// Elimina beatgrid de una pista
pub fn delete_beatgrid(conn: &Connection, track_id: &str) -> Result<()> {
    conn.execute("DELETE FROM beatgrids WHERE track_id = ?1", [track_id])?;
    Ok(())
}
