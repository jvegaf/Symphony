//! Operaciones de actualización de tracks

use rusqlite::{params, Connection, Result};

use crate::db::models::Track;

/// Actualiza un track existente
pub fn update_track(conn: &Connection, track: &Track) -> Result<()> {
    conn.execute(
        "UPDATE tracks SET
            path = ?1, title = ?2, artist = ?3, album = ?4,
            genre = ?5, year = ?6, duration = ?7, bitrate = ?8,
            sample_rate = ?9, file_size = ?10, bpm = ?11, key = ?12,
            rating = ?13, play_count = ?14, last_played = ?15,
            date_modified = ?16
         WHERE id = ?17",
        params![
            track.path,
            track.title,
            track.artist,
            track.album,
            track.genre,
            track.year,
            track.duration,
            track.bitrate,
            track.sample_rate,
            track.file_size,
            track.bpm,
            track.key,
            track.rating,
            track.play_count,
            track.last_played,
            track.date_modified,
            track.id,
        ],
    )?;

    Ok(())
}

/// Actualización parcial de metadatos de track
/// AIDEV-NOTE: Agregado parámetro 'key' para soportar tonalidad musical
#[allow(clippy::too_many_arguments)]
pub fn update_track_metadata(
    conn: &Connection,
    id: &str,
    title: Option<&str>,
    artist: Option<&str>,
    album: Option<&str>,
    year: Option<i32>,
    genre: Option<&str>,
    bpm: Option<f64>,
    key: Option<&str>,
    rating: Option<i32>,
) -> Result<()> {
    // Validar rating (0-5)
    if let Some(r) = rating {
        if !(0..=5).contains(&r) {
            return Err(rusqlite::Error::InvalidParameterName(
                "Rating must be between 0 and 5".to_string(),
            ));
        }
    }

    // Construir query dinámica
    let mut updates = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(t) = title {
        updates.push("title = ?");
        params.push(Box::new(t.to_string()));
    }
    if let Some(a) = artist {
        updates.push("artist = ?");
        params.push(Box::new(a.to_string()));
    }
    if let Some(a) = album {
        updates.push("album = ?");
        params.push(Box::new(a.to_string()));
    }
    if let Some(y) = year {
        updates.push("year = ?");
        params.push(Box::new(y));
    }
    if let Some(g) = genre {
        updates.push("genre = ?");
        params.push(Box::new(g.to_string()));
    }
    if let Some(b) = bpm {
        updates.push("bpm = ?");
        params.push(Box::new(b));
    }
    if let Some(k) = key {
        updates.push("key = ?");
        params.push(Box::new(k.to_string()));
    }
    if let Some(r) = rating {
        updates.push("rating = ?");
        params.push(Box::new(r));
    }

    if updates.is_empty() {
        return Ok(());
    }

    // Actualizar date_modified
    updates.push("date_modified = CURRENT_TIMESTAMP");

    let query = format!("UPDATE tracks SET {} WHERE id = ?", updates.join(", "));
    params.push(Box::new(id.to_string()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, params_refs.as_slice())?;

    Ok(())
}
