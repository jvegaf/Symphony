use crate::db::models::{Beatgrid, CuePoint, Loop};
/// CRUD para análisis de audio (beatgrids, cue points, loops) con UUIDs
///
/// AIDEV-NOTE: Migrado de i64 a String (UUID v4) para IDs
use rusqlite::{params, Connection, OptionalExtension, Result};
use uuid::Uuid;

// ============================================================================
// WAVEFORMS
// ============================================================================

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

// ============================================================================
// TESTS
// ============================================================================

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

// ============================================================================
// CUE POINTS
// ============================================================================

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

// ============================================================================
// LOOPS
// ============================================================================

/// Inserta nuevo loop
pub fn insert_loop(
    conn: &Connection,
    track_id: &str,
    label: &str,
    loop_start: f64,
    loop_end: f64,
) -> Result<String> {
    // Validación: loop_end > loop_start + 0.1 (100ms mínimo)
    const EPSILON: f64 = 0.001;
    if loop_end < loop_start + 0.1 - EPSILON {
        return Err(rusqlite::Error::InvalidParameterName(
            "Loop debe tener duración mínima de 100ms".to_string(),
        ));
    }

    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO loops (id, track_id, label, loop_start, loop_end, is_active, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, datetime('now'))",
        params![&id, track_id, label, loop_start, loop_end],
    )?;

    Ok(id)
}

/// Obtiene todos los loops de una pista ordenados por posición
pub fn get_loops(conn: &Connection, track_id: &str) -> Result<Vec<Loop>> {
    let mut stmt = conn.prepare(
        "SELECT id, track_id, label, loop_start, loop_end, is_active, created_at
         FROM loops
         WHERE track_id = ?1
         ORDER BY loop_start ASC",
    )?;

    let loops = stmt.query_map([track_id], |row| {
        Ok(Loop {
            id: row.get(0)?,
            track_id: row.get(1)?,
            label: row.get(2)?,
            loop_start: row.get(3)?,
            loop_end: row.get(4)?,
            is_active: row.get::<_, i32>(5)? == 1,
            created_at: row.get(6)?,
        })
    })?;

    loops.collect()
}

/// Actualiza loop existente
pub fn update_loop(
    conn: &Connection,
    id: &str,
    label: Option<&str>,
    loop_start: Option<f64>,
    loop_end: Option<f64>,
    is_active: Option<bool>,
) -> Result<()> {
    // Si se actualizan start o end, validar duración mínima
    if loop_start.is_some() || loop_end.is_some() {
        let current: (f64, f64) = conn.query_row(
            "SELECT loop_start, loop_end FROM loops WHERE id = ?1",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        let final_start = loop_start.unwrap_or(current.0);
        let final_end = loop_end.unwrap_or(current.1);

        const EPSILON: f64 = 0.001;
        if final_end < final_start + 0.1 - EPSILON {
            return Err(rusqlite::Error::InvalidParameterName(
                "Loop debe tener duración mínima de 100ms".to_string(),
            ));
        }
    }

    // Construir query dinámicamente
    let mut updates = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(lbl) = label {
        updates.push("label = ?");
        params_vec.push(Box::new(lbl.to_string()));
    }
    if let Some(start) = loop_start {
        updates.push("loop_start = ?");
        params_vec.push(Box::new(start));
    }
    if let Some(end) = loop_end {
        updates.push("loop_end = ?");
        params_vec.push(Box::new(end));
    }
    if let Some(active) = is_active {
        let active_int = if active { 1 } else { 0 };
        updates.push("is_active = ?");
        params_vec.push(Box::new(active_int));
    }

    if updates.is_empty() {
        return Ok(());
    }

    let query = format!("UPDATE loops SET {} WHERE id = ?", updates.join(", "));
    params_vec.push(Box::new(id.to_string()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, params_refs.as_slice())?;

    Ok(())
}

/// Elimina loop
pub fn delete_loop(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM loops WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{migrations, queries::tracks, Database};

    fn setup_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        migrations::run_migrations(&db.conn).unwrap();
        db
    }

    #[test]
    fn test_upsert_beatgrid() {
        let db = setup_db();

        // Crear track primero
        let track = crate::db::models::Track {
            id: None,
            path: "/music/test.mp3".to_string(),
            title: "Test".to_string(),
            artist: "Artist".to_string(),
            album: None,
            genre: None,
            year: None,
            duration: 180.0,
            bitrate: 320,
            sample_rate: 44100,
            file_size: 8388608,
            bpm: None,
            key: None,
            rating: None,
            play_count: 0,
            last_played: None,
            date_added: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
            label: None,
            isrc: None,
        };
        let track_id = tracks::insert_track(&db.conn, &track).unwrap();

        // Insertar beatgrid
        let id = upsert_beatgrid(&db.conn, &track_id, 128.0, 0.5, Some(95.0)).unwrap();
        assert!(!id.is_empty());

        // Obtener y verificar
        let beatgrid = get_beatgrid(&db.conn, &track_id).unwrap().unwrap();
        assert_eq!(beatgrid.bpm, 128.0);
        assert_eq!(beatgrid.offset, 0.5);
        assert_eq!(beatgrid.confidence, Some(95.0));
    }

    #[test]
    fn test_insert_cue_point() {
        let db = setup_db();

        let track = crate::db::models::Track {
            id: None,
            path: "/music/test.mp3".to_string(),
            title: "Test".to_string(),
            artist: "Artist".to_string(),
            album: None,
            genre: None,
            year: None,
            duration: 180.0,
            bitrate: 320,
            sample_rate: 44100,
            file_size: 8388608,
            bpm: None,
            key: None,
            rating: None,
            play_count: 0,
            last_played: None,
            date_added: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
            label: None,
            isrc: None,
        };
        let track_id = tracks::insert_track(&db.conn, &track).unwrap();

        let id = insert_cue_point(
            &db.conn,
            &track_id,
            30.0,
            "Intro",
            "#FF0000",
            "intro",
            Some(1),
        )
        .unwrap();

        assert!(!id.is_empty());

        let cues = get_cue_points(&db.conn, &track_id).unwrap();
        assert_eq!(cues.len(), 1);
        assert_eq!(cues[0].position, 30.0);
    }
}
