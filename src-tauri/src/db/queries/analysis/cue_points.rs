/**
 * CRUD para cue points (puntos de marcación)
 */

use crate::db::models::CuePoint;
use rusqlite::{params, Connection, Result};
use uuid::Uuid;

/// Inserta nuevo cue point
pub fn insert_cue_point(
    conn: &Connection,
    track_id: &str,
    position: f64,
    label: &str,
    color: &str,
    cue_type: &str,
    hotkey: Option<i32>,
) -> Result<String> {
    // Validar límite de 64 cue points por pista
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM cue_points WHERE track_id = ?1",
        [track_id],
        |row| row.get(0),
    )?;

    if count >= 64 {
        return Err(rusqlite::Error::InvalidParameterName(
            "Máximo 64 cue points por pista".to_string(),
        ));
    }

    // Validar hotkey (1-8)
    if let Some(hk) = hotkey {
        if !(1..=8).contains(&hk) {
            return Err(rusqlite::Error::InvalidParameterName(
                "Hotkey debe estar entre 1 y 8".to_string(),
            ));
        }
    }

    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO cue_points (id, track_id, position, label, color, type, hotkey, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))",
        params![&id, track_id, position, label, color, cue_type, hotkey],
    )?;

    Ok(id)
}

/// Obtiene todos los cue points de una pista ordenados por posición
pub fn get_cue_points(conn: &Connection, track_id: &str) -> Result<Vec<CuePoint>> {
    let mut stmt = conn.prepare(
        "SELECT id, track_id, position, label, color, type, hotkey, created_at
         FROM cue_points
         WHERE track_id = ?1
         ORDER BY position ASC",
    )?;

    let cue_points = stmt.query_map([track_id], |row| {
        Ok(CuePoint {
            id: row.get(0)?,
            track_id: row.get(1)?,
            position: row.get(2)?,
            label: row.get(3)?,
            color: row.get(4)?,
            cue_type: row.get(5)?,
            hotkey: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;

    cue_points.collect()
}

/// Actualiza cue point existente
pub fn update_cue_point(
    conn: &Connection,
    id: &str,
    position: Option<f64>,
    label: Option<&str>,
    color: Option<&str>,
    cue_type: Option<&str>,
    hotkey: Option<Option<i32>>,
) -> Result<()> {
    // Validar hotkey si se proporciona
    if let Some(Some(hk)) = hotkey {
        if !(1..=8).contains(&hk) {
            return Err(rusqlite::Error::InvalidParameterName(
                "Hotkey debe estar entre 1 y 8".to_string(),
            ));
        }
    }

    // Construir query dinámicamente
    let mut updates = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(pos) = position {
        updates.push("position = ?");
        params_vec.push(Box::new(pos));
    }
    if let Some(lbl) = label {
        updates.push("label = ?");
        params_vec.push(Box::new(lbl.to_string()));
    }
    if let Some(clr) = color {
        updates.push("color = ?");
        params_vec.push(Box::new(clr.to_string()));
    }
    if let Some(typ) = cue_type {
        updates.push("type = ?");
        params_vec.push(Box::new(typ.to_string()));
    }
    if let Some(hk) = hotkey {
        updates.push("hotkey = ?");
        params_vec.push(Box::new(hk));
    }

    if updates.is_empty() {
        return Ok(());
    }

    let query = format!("UPDATE cue_points SET {} WHERE id = ?", updates.join(", "));
    params_vec.push(Box::new(id.to_string()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, params_refs.as_slice())?;

    Ok(())
}

/// Elimina cue point
pub fn delete_cue_point(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM cue_points WHERE id = ?1", [id])?;
    Ok(())
}
