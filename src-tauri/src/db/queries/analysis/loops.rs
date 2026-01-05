/**
 * CRUD para loops (bucles de reproducción)
 */
use crate::db::models::Loop;
use rusqlite::{params, Connection, Result};
use uuid::Uuid;

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
