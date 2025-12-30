/**
 * CRUD para waveforms (caché de visualización)
 */

use rusqlite::{params, Connection, OptionalExtension, Result};
use uuid::Uuid;

/// Guarda datos de waveform en cache
pub fn save_waveform(
    conn: &Connection,
    track_id: &str,
    data: &str, // JSON serializado de Vec<f32>
) -> Result<String> {
    let data_bytes = data.as_bytes();
    let resolution = data_bytes.len() as i32;

    // Verificar si ya existe
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM waveforms WHERE track_id = ?1",
            [track_id],
            |row| row.get(0),
        )
        .optional()?;

    if let Some(id) = existing {
        // Actualizar existente
        conn.execute(
            "UPDATE waveforms SET data = ?1, resolution = ?2, date_generated = datetime('now') WHERE id = ?3",
            params![data_bytes, resolution, &id],
        )?;
        Ok(id)
    } else {
        // Insertar nuevo
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO waveforms (id, track_id, data, resolution, date_generated) 
             VALUES (?1, ?2, ?3, ?4, datetime('now'))",
            params![&id, track_id, data_bytes, resolution],
        )?;
        Ok(id)
    }
}

/// Obtiene waveform de cache
pub fn get_waveform(
    conn: &Connection,
    track_id: &str,
) -> Result<Option<crate::db::models::Waveform>> {
    conn.query_row(
        "SELECT id, track_id, data, resolution, date_generated FROM waveforms WHERE track_id = ?1",
        [track_id],
        |row| {
            Ok(crate::db::models::Waveform {
                id: row.get(0)?,
                track_id: row.get(1)?,
                data: row.get(2)?,
                resolution: row.get(3)?,
                date_generated: row.get(4)?,
            })
        },
    )
    .optional()
}
