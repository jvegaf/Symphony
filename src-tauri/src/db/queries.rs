use rusqlite::{Connection, Result, params, OptionalExtension};
use crate::db::models::{Track, Playlist, Setting, Beatgrid, CuePoint, Loop};

/// CRUD para tracks

#[allow(dead_code)]
pub fn insert_track(conn: &Connection, track: &Track) -> Result<i64> {
    conn.execute(
        "INSERT INTO tracks (
            path, title, artist, album, genre, year,
            duration, bitrate, sample_rate, file_size,
            bpm, key, rating, play_count, last_played,
            date_added, date_modified
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
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
            track.date_added,
            track.date_modified,
        ],
    )?;

    Ok(conn.last_insert_rowid())
}

pub fn get_track(conn: &Connection, id: i64) -> Result<Track> {
    conn.query_row(
        "SELECT id, path, title, artist, album, genre, year,
                duration, bitrate, sample_rate, file_size,
                bpm, key, rating, play_count, last_played,
                date_added, date_modified
         FROM tracks WHERE id = ?1",
        [id],
        |row| {
            Ok(Track {
                id: row.get(0)?,
                path: row.get(1)?,
                title: row.get(2)?,
                artist: row.get(3)?,
                album: row.get(4)?,
                genre: row.get(5)?,
                year: row.get(6)?,
                duration: row.get(7)?,
                bitrate: row.get(8)?,
                sample_rate: row.get(9)?,
                file_size: row.get(10)?,
                bpm: row.get(11)?,
                key: row.get(12)?,
                rating: row.get(13)?,
                play_count: row.get(14)?,
                last_played: row.get(15)?,
                date_added: row.get(16)?,
                date_modified: row.get(17)?,
            })
        },
    )
}

pub fn get_all_tracks(conn: &Connection) -> Result<Vec<Track>> {
    let mut stmt = conn.prepare(
        "SELECT id, path, title, artist, album, genre, year,
                duration, bitrate, sample_rate, file_size,
                bpm, key, rating, play_count, last_played,
                date_added, date_modified
         FROM tracks ORDER BY date_added DESC",
    )?;

    let tracks = stmt.query_map([], |row| {
        Ok(Track {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            genre: row.get(5)?,
            year: row.get(6)?,
            duration: row.get(7)?,
            bitrate: row.get(8)?,
            sample_rate: row.get(9)?,
            file_size: row.get(10)?,
            bpm: row.get(11)?,
            key: row.get(12)?,
            rating: row.get(13)?,
            play_count: row.get(14)?,
            last_played: row.get(15)?,
            date_added: row.get(16)?,
            date_modified: row.get(17)?,
        })
    })?;

    tracks.collect()
}

#[allow(dead_code)]
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

#[allow(dead_code)]
pub fn delete_track(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM tracks WHERE id = ?1", [id])?;
    Ok(())
}

/// Busca pistas por título, artista o álbum
pub fn search_tracks(conn: &Connection, query: &str) -> Result<Vec<Track>> {
    let search_pattern = format!("%{}%", query);
    let mut stmt = conn.prepare(
        "SELECT id, path, title, artist, album, genre, year,
                duration, bitrate, sample_rate, file_size,
                bpm, key, rating, play_count, last_played,
                date_added, date_modified
         FROM tracks 
         WHERE title LIKE ?1 OR artist LIKE ?1 OR album LIKE ?1
         ORDER BY date_added DESC",
    )?;

    let tracks = stmt.query_map([&search_pattern], |row| {
        Ok(Track {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            genre: row.get(5)?,
            year: row.get(6)?,
            duration: row.get(7)?,
            bitrate: row.get(8)?,
            sample_rate: row.get(9)?,
            file_size: row.get(10)?,
            bpm: row.get(11)?,
            key: row.get(12)?,
            rating: row.get(13)?,
            play_count: row.get(14)?,
            last_played: row.get(15)?,
            date_added: row.get(16)?,
            date_modified: row.get(17)?,
        })
    })?;

    tracks.collect()
}

/// Obtiene una pista por ID (alias de get_track para consistencia de API)
pub fn get_track_by_id(conn: &Connection, id: i64) -> Result<Track> {
    get_track(conn, id)
}

/// CRUD para playlists

#[allow(dead_code)]
pub fn insert_playlist(conn: &Connection, playlist: &Playlist) -> Result<i64> {
    conn.execute(
        "INSERT INTO playlists (name, description, date_created, date_modified)
         VALUES (?1, ?2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        params![
            playlist.name,
            playlist.description,
        ],
    )?;

    Ok(conn.last_insert_rowid())
}

#[allow(dead_code)]
pub fn get_playlist(conn: &Connection, id: i64) -> Result<Playlist> {
    conn.query_row(
        "SELECT id, name, description, date_created, date_modified
         FROM playlists WHERE id = ?1",
        [id],
        |row| {
            Ok(Playlist {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                date_created: row.get(3)?,
                date_modified: row.get(4)?,
            })
        },
    )
}

#[allow(dead_code)]
pub fn get_all_playlists(conn: &Connection) -> Result<Vec<Playlist>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, date_created, date_modified
         FROM playlists ORDER BY name ASC",
    )?;

    let playlists = stmt.query_map([], |row| {
        Ok(Playlist {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            date_created: row.get(3)?,
            date_modified: row.get(4)?,
        })
    })?;

    playlists.collect()
}

#[allow(dead_code)]
pub fn delete_playlist(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM playlists WHERE id = ?1", [id])?;
    Ok(())
}

#[allow(dead_code)]
pub fn update_playlist(
    conn: &Connection,
    id: i64,
    name: &str,
    description: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE playlists SET name = ?1, description = ?2, date_modified = CURRENT_TIMESTAMP WHERE id = ?3",
        params![name, description, id],
    )?;
    Ok(())
}

#[allow(dead_code)]
pub fn add_track_to_playlist(
    conn: &Connection,
    playlist_id: i64,
    track_id: i64,
) -> Result<()> {
    // Obtener posición más alta actual
    let max_position: Option<i32> = conn
        .query_row(
            "SELECT MAX(position) FROM playlist_tracks WHERE playlist_id = ?1",
            params![playlist_id],
            |row| row.get(0),
        )
        .optional()?
        .flatten();
    
    let next_position = max_position.unwrap_or(-1) + 1;
    
    conn.execute(
        "INSERT INTO playlist_tracks (playlist_id, track_id, position, date_added)
         VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
        params![playlist_id, track_id, next_position],
    )?;
    Ok(())
}

#[allow(dead_code)]
pub fn remove_track_from_playlist(
    conn: &Connection,
    playlist_id: i64,
    track_id: i64,
) -> Result<()> {
    conn.execute(
        "DELETE FROM playlist_tracks 
         WHERE playlist_id = ?1 AND track_id = ?2",
        params![playlist_id, track_id],
    )?;
    
    // Reordenar posiciones
    reorder_playlist_tracks(conn, playlist_id)?;
    Ok(())
}

#[allow(dead_code)]
pub fn reorder_playlist_tracks(
    conn: &Connection,
    playlist_id: i64,
) -> Result<()> {
    // Obtener tracks en orden actual
    let mut stmt = conn.prepare(
        "SELECT id FROM playlist_tracks 
         WHERE playlist_id = ?1 
         ORDER BY position"
    )?;
    
    let track_ids: Vec<i64> = stmt
        .query_map(params![playlist_id], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    
    // Actualizar posiciones secuencialmente
    for (idx, id) in track_ids.iter().enumerate() {
        conn.execute(
            "UPDATE playlist_tracks SET position = ?1 WHERE id = ?2",
            params![idx as i32, id],
        )?;
    }
    
    Ok(())
}

#[allow(dead_code)]
pub fn update_playlist_track_order(
    conn: &mut Connection,
    playlist_id: i64,
    track_ids: &[i64],
) -> Result<()> {
    let tx = conn.transaction()?;
    
    // Eliminar tracks actuales
    tx.execute(
        "DELETE FROM playlist_tracks WHERE playlist_id = ?1",
        params![playlist_id],
    )?;
    
    // Insertar con nuevo orden
    for (position, track_id) in track_ids.iter().enumerate() {
        tx.execute(
            "INSERT INTO playlist_tracks (playlist_id, track_id, position, date_added)
             VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
            params![playlist_id, track_id, position as i32],
        )?;
    }
    
    tx.commit()?;
    Ok(())
}

#[allow(dead_code)]
pub fn get_playlist_tracks(
    conn: &Connection,
    playlist_id: i64,
) -> Result<Vec<Track>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.path, t.title, t.artist, t.album, t.genre, t.year,
                t.duration, t.bitrate, t.sample_rate, t.file_size,
                t.bpm, t.key, t.rating, t.play_count, t.last_played,
                t.date_added, t.date_modified
         FROM tracks t
         INNER JOIN playlist_tracks pt ON t.id = pt.track_id
         WHERE pt.playlist_id = ?1
         ORDER BY pt.position"
    )?;
    
    let tracks = stmt.query_map(params![playlist_id], |row| {
        Ok(Track {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            genre: row.get(5)?,
            year: row.get(6)?,
            duration: row.get(7)?,
            bitrate: row.get(8)?,
            sample_rate: row.get(9)?,
            file_size: row.get(10)?,
            bpm: row.get(11)?,
            key: row.get(12)?,
            rating: row.get(13)?,
            play_count: row.get(14)?,
            last_played: row.get(15)?,
            date_added: row.get(16)?,
            date_modified: row.get(17)?,
        })
    })?;
    
    tracks.collect()
}

/// Actualización parcial de metadatos de track
#[allow(dead_code)]
pub fn update_track_metadata(
    conn: &Connection,
    id: i64,
    title: Option<&str>,
    artist: Option<&str>,
    album: Option<&str>,
    year: Option<i32>,
    genre: Option<&str>,
    bpm: Option<f64>,
    rating: Option<i32>,
) -> Result<()> {
    // Validar rating (0-5)
    if let Some(r) = rating {
        if r < 0 || r > 5 {
            return Err(rusqlite::Error::InvalidParameterName("Rating must be between 0 and 5".to_string()));
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
    if let Some(r) = rating {
        updates.push("rating = ?");
        params.push(Box::new(r));
    }

    if updates.is_empty() {
        return Ok(());
    }

    // Actualizar date_modified
    updates.push("date_modified = CURRENT_TIMESTAMP");

    let query = format!(
        "UPDATE tracks SET {} WHERE id = ?",
        updates.join(", ")
    );
    params.push(Box::new(id));

    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, params_refs.as_slice())?;

    Ok(())
}

/// CRUD para configuración

#[allow(dead_code)]
pub fn set_setting(conn: &Connection, key: &str, value: &str, value_type: &str) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, value_type)
         VALUES (?1, ?2, ?3)",
        params![key, value, value_type],
    )?;
    Ok(())
}

#[allow(dead_code)]
pub fn get_setting(conn: &Connection, key: &str) -> Result<Setting> {
    conn.query_row(
        "SELECT key, value, value_type FROM settings WHERE key = ?1",
        [key],
        |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
                value_type: row.get(2)?,
            })
        },
    )
}

/// CRUD para beatgrids

/// Inserta o actualiza beatgrid analizado para una pista
pub fn upsert_beatgrid(
    conn: &Connection,
    track_id: i64,
    bpm: f64,
    offset: f64,
    confidence: Option<f64>,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO beatgrids (track_id, bpm, offset, confidence, analyzed_at)
         VALUES (?1, ?2, ?3, ?4, datetime('now'))
         ON CONFLICT(track_id) DO UPDATE SET
            bpm = ?2,
            offset = ?3,
            confidence = ?4,
            analyzed_at = datetime('now')",
        params![track_id, bpm, offset, confidence],
    )?;
    
    Ok(conn.last_insert_rowid())
}

/// Obtiene beatgrid de una pista
pub fn get_beatgrid(
    conn: &Connection,
    track_id: i64,
) -> Result<Option<Beatgrid>> {
    conn.query_row(
        "SELECT id, track_id, bpm, offset, confidence, analyzed_at
         FROM beatgrids
         WHERE track_id = ?1",
        params![track_id],
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
pub fn update_beatgrid_offset(
    conn: &Connection,
    track_id: i64,
    offset: f64,
) -> Result<()> {
    conn.execute(
        "UPDATE beatgrids SET offset = ?1 WHERE track_id = ?2",
        params![offset, track_id],
    )?;
    Ok(())
}

/// Elimina beatgrid de una pista
pub fn delete_beatgrid(
    conn: &Connection,
    track_id: i64,
) -> Result<()> {
    conn.execute(
        "DELETE FROM beatgrids WHERE track_id = ?1",
        params![track_id],
    )?;
    Ok(())
}

/// CRUD para cue points

/// Inserta nuevo cue point
pub fn insert_cue_point(
    conn: &Connection,
    track_id: i64,
    position: f64,
    label: &str,
    color: &str,
    cue_type: &str,
    hotkey: Option<i32>,
) -> Result<i64> {
    // Validar límite de 64 cue points por pista
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM cue_points WHERE track_id = ?1",
        params![track_id],
        |row| row.get(0),
    )?;
    
    if count >= 64 {
        return Err(rusqlite::Error::InvalidParameterName(
            "Máximo 64 cue points por pista".to_string()
        ));
    }
    
    // Validar hotkey (1-8)
    if let Some(hk) = hotkey {
        if hk < 1 || hk > 8 {
            return Err(rusqlite::Error::InvalidParameterName(
                "Hotkey debe estar entre 1 y 8".to_string()
            ));
        }
    }
    
    conn.execute(
        "INSERT INTO cue_points (track_id, position, label, color, type, hotkey, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))",
        params![track_id, position, label, color, cue_type, hotkey],
    )?;
    
    Ok(conn.last_insert_rowid())
}

/// Obtiene todos los cue points de una pista ordenados por posición
pub fn get_cue_points(
    conn: &Connection,
    track_id: i64,
) -> Result<Vec<CuePoint>> {
    let mut stmt = conn.prepare(
        "SELECT id, track_id, position, label, color, type, hotkey, created_at
         FROM cue_points
         WHERE track_id = ?1
         ORDER BY position ASC",
    )?;
    
    let cue_points = stmt.query_map(params![track_id], |row| {
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
    id: i64,
    position: Option<f64>,
    label: Option<&str>,
    color: Option<&str>,
    cue_type: Option<&str>,
    hotkey: Option<Option<i32>>,
) -> Result<()> {
    // Validar hotkey si se proporciona
    if let Some(Some(hk)) = hotkey {
        if hk < 1 || hk > 8 {
            return Err(rusqlite::Error::InvalidParameterName(
                "Hotkey debe estar entre 1 y 8".to_string()
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
    params_vec.push(Box::new(id));
    
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, params_refs.as_slice())?;
    
    Ok(())
}

/// Elimina cue point
pub fn delete_cue_point(
    conn: &Connection,
    id: i64,
) -> Result<()> {
    conn.execute(
        "DELETE FROM cue_points WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

/// CRUD para loops

/// Inserta nuevo loop
pub fn insert_loop(
    conn: &Connection,
    track_id: i64,
    label: &str,
    loop_start: f64,
    loop_end: f64,
) -> Result<i64> {
    // Validación: loop_end > loop_start + 0.1 (100ms mínimo)
    // Usamos epsilon para evitar problemas de precisión de punto flotante
    const EPSILON: f64 = 0.001;
    if loop_end < loop_start + 0.1 - EPSILON {
        return Err(rusqlite::Error::InvalidParameterName(
            "Loop debe tener duración mínima de 100ms".to_string()
        ));
    }
    
    conn.execute(
        "INSERT INTO loops (track_id, label, loop_start, loop_end, is_active, created_at)
         VALUES (?1, ?2, ?3, ?4, 0, datetime('now'))",
        params![track_id, label, loop_start, loop_end],
    )?;
    
    Ok(conn.last_insert_rowid())
}

/// Obtiene todos los loops de una pista ordenados por posición
pub fn get_loops(
    conn: &Connection,
    track_id: i64,
) -> Result<Vec<Loop>> {
    let mut stmt = conn.prepare(
        "SELECT id, track_id, label, loop_start, loop_end, is_active, created_at
         FROM loops
         WHERE track_id = ?1
         ORDER BY loop_start ASC",
    )?;
    
    let loops = stmt.query_map(params![track_id], |row| {
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
    id: i64,
    label: Option<&str>,
    loop_start: Option<f64>,
    loop_end: Option<f64>,
    is_active: Option<bool>,
) -> Result<()> {
    // Si se actualizan start o end, validar duración mínima
    // Primero obtener valores actuales si es necesario
    if loop_start.is_some() || loop_end.is_some() {
        let current: (f64, f64) = conn.query_row(
            "SELECT loop_start, loop_end FROM loops WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;
        
        let final_start = loop_start.unwrap_or(current.0);
        let final_end = loop_end.unwrap_or(current.1);
        
        // Usamos epsilon para evitar problemas de precisión de punto flotante
        const EPSILON: f64 = 0.001;
        if final_end < final_start + 0.1 - EPSILON {
            return Err(rusqlite::Error::InvalidParameterName(
                "Loop debe tener duración mínima de 100ms".to_string()
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
    params_vec.push(Box::new(id));
    
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, params_refs.as_slice())?;
    
    Ok(())
}

/// Elimina loop
pub fn delete_loop(
    conn: &Connection,
    id: i64,
) -> Result<()> {
    conn.execute(
        "DELETE FROM loops WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{Database, migrations};

    fn setup_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        migrations::run_migrations(&db.conn).unwrap();
        db
    }

    // ==================== TESTS DE TRACKS ====================

    #[test]
    fn test_insert_and_get_track() {
        let db = setup_db();
        
        let track = Track {
            id: None,
            path: "/music/test.mp3".to_string(),
            title: "Test Track".to_string(),
            artist: "Test Artist".to_string(),
            album: Some("Test Album".to_string()),
            genre: Some("Electronic".to_string()),
            year: Some(2024),
            duration: 180.0,
            bitrate: 320,
            sample_rate: 44100,
            file_size: 8388608,
            bpm: Some(128.0),
            key: Some("Am".to_string()),
            rating: Some(4),
            play_count: 0,
            last_played: None,
            date_added: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        };

        let id = insert_track(&db.conn, &track).unwrap();
        assert!(id > 0);

        let loaded = get_track(&db.conn, id).unwrap();
        assert_eq!(loaded.title, "Test Track");
        assert_eq!(loaded.artist, "Test Artist");
        assert_eq!(loaded.bpm, Some(128.0));
    }

    #[test]
    fn test_get_all_tracks() {
        let db = setup_db();

        // Insertar múltiples tracks
        for i in 1..=3 {
            let track = Track {
                id: None,
                path: format!("/music/test{}.mp3", i),
                title: format!("Track {}", i),
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
            };
            insert_track(&db.conn, &track).unwrap();
        }

        let tracks = get_all_tracks(&db.conn).unwrap();
        assert_eq!(tracks.len(), 3);
    }

    #[test]
    fn test_update_track() {
        let db = setup_db();

        let mut track = Track {
            id: None,
            path: "/music/test.mp3".to_string(),
            title: "Original Title".to_string(),
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
        };

        let id = insert_track(&db.conn, &track).unwrap();
        track.id = Some(id);
        track.title = "Updated Title".to_string();
        track.rating = Some(5);

        update_track(&db.conn, &track).unwrap();

        let updated = get_track(&db.conn, id).unwrap();
        assert_eq!(updated.title, "Updated Title");
        assert_eq!(updated.rating, Some(5));
    }

    #[test]
    fn test_delete_track() {
        let db = setup_db();

        let track = Track {
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
        };

        let id = insert_track(&db.conn, &track).unwrap();
        delete_track(&db.conn, id).unwrap();

        let result = get_track(&db.conn, id);
        assert!(result.is_err());
    }

    #[test]
    fn test_insert_and_get_playlist() {
        let db = setup_db();

        let playlist = Playlist {
            id: None,
            name: "My Playlist".to_string(),
            description: Some("Test playlist".to_string()),
            date_created: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        };

        let id = insert_playlist(&db.conn, &playlist).unwrap();
        let loaded = get_playlist(&db.conn, id).unwrap();

        assert_eq!(loaded.name, "My Playlist");
        assert_eq!(loaded.description, Some("Test playlist".to_string()));
    }

    #[test]
    fn test_update_playlist() {
        let db = setup_db();

        let playlist = Playlist {
            id: None,
            name: "Original Name".to_string(),
            description: Some("Original description".to_string()),
            date_created: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        };

        let id = insert_playlist(&db.conn, &playlist).unwrap();
        
        update_playlist(&db.conn, id, "Updated Name", Some("Updated description")).unwrap();
        
        let updated = get_playlist(&db.conn, id).unwrap();
        assert_eq!(updated.name, "Updated Name");
        assert_eq!(updated.description, Some("Updated description".to_string()));
    }

    #[test]
    fn test_get_all_playlists() {
        let db = setup_db();

        for i in 1..=3 {
            let playlist = Playlist {
                id: None,
                name: format!("Playlist {}", i),
                description: None,
                date_created: "2024-01-01".to_string(),
                date_modified: "2024-01-01".to_string(),
            };
            insert_playlist(&db.conn, &playlist).unwrap();
        }

        let playlists = get_all_playlists(&db.conn).unwrap();
        assert_eq!(playlists.len(), 3);
    }

    #[test]
    fn test_add_track_to_playlist() {
        let db = setup_db();

        // Crear playlist
        let playlist = Playlist {
            id: None,
            name: "Test Playlist".to_string(),
            description: None,
            date_created: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        };
        let playlist_id = insert_playlist(&db.conn, &playlist).unwrap();

        // Crear track
        let track = Track {
            id: None,
            path: "/music/test.mp3".to_string(),
            title: "Test Track".to_string(),
            artist: "Test Artist".to_string(),
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        // Agregar track a playlist
        add_track_to_playlist(&db.conn, playlist_id, track_id).unwrap();

        // Verificar
        let tracks = get_playlist_tracks(&db.conn, playlist_id).unwrap();
        assert_eq!(tracks.len(), 1);
        assert_eq!(tracks[0].id, Some(track_id));
    }

    #[test]
    fn test_add_multiple_tracks_to_playlist() {
        let db = setup_db();

        let playlist_id = insert_playlist(&db.conn, &Playlist {
            id: None,
            name: "Test Playlist".to_string(),
            description: None,
            date_created: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        }).unwrap();

        // Agregar 3 tracks
        for i in 1..=3 {
            let track = Track {
                id: None,
                path: format!("/music/test{}.mp3", i),
                title: format!("Track {}", i),
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
            };
            let track_id = insert_track(&db.conn, &track).unwrap();
            add_track_to_playlist(&db.conn, playlist_id, track_id).unwrap();
        }

        let tracks = get_playlist_tracks(&db.conn, playlist_id).unwrap();
        assert_eq!(tracks.len(), 3);
        // Verificar orden
        assert_eq!(tracks[0].title, "Track 1");
        assert_eq!(tracks[1].title, "Track 2");
        assert_eq!(tracks[2].title, "Track 3");
    }

    #[test]
    fn test_remove_track_from_playlist() {
        let db = setup_db();

        let playlist_id = insert_playlist(&db.conn, &Playlist {
            id: None,
            name: "Test Playlist".to_string(),
            description: None,
            date_created: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        }).unwrap();

        // Agregar 3 tracks
        let mut track_ids = Vec::new();
        for i in 1..=3 {
            let track = Track {
                id: None,
                path: format!("/music/test{}.mp3", i),
                title: format!("Track {}", i),
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
            };
            let track_id = insert_track(&db.conn, &track).unwrap();
            add_track_to_playlist(&db.conn, playlist_id, track_id).unwrap();
            track_ids.push(track_id);
        }

        // Eliminar el track del medio
        remove_track_from_playlist(&db.conn, playlist_id, track_ids[1]).unwrap();

        let tracks = get_playlist_tracks(&db.conn, playlist_id).unwrap();
        assert_eq!(tracks.len(), 2);
        assert_eq!(tracks[0].title, "Track 1");
        assert_eq!(tracks[1].title, "Track 3");
    }

    #[test]
    fn test_reorder_playlist_tracks() {
        let db = setup_db();

        let playlist_id = insert_playlist(&db.conn, &Playlist {
            id: None,
            name: "Test Playlist".to_string(),
            description: None,
            date_created: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        }).unwrap();

        // Agregar 3 tracks
        let mut track_ids = Vec::new();
        for i in 1..=3 {
            let track = Track {
                id: None,
                path: format!("/music/test{}.mp3", i),
                title: format!("Track {}", i),
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
            };
            let track_id = insert_track(&db.conn, &track).unwrap();
            add_track_to_playlist(&db.conn, playlist_id, track_id).unwrap();
            track_ids.push(track_id);
        }

        // Reordenar: [3, 1, 2]
        let new_order = vec![track_ids[2], track_ids[0], track_ids[1]];
        // Necesitamos hacer el conn mutable para transacciones
        let mut conn = db.conn;
        update_playlist_track_order(&mut conn, playlist_id, &new_order).unwrap();

        let tracks = get_playlist_tracks(&conn, playlist_id).unwrap();
        assert_eq!(tracks.len(), 3);
        assert_eq!(tracks[0].title, "Track 3");
        assert_eq!(tracks[1].title, "Track 1");
        assert_eq!(tracks[2].title, "Track 2");
    }

    #[test]
    fn test_delete_playlist_cascade() {
        let db = setup_db();

        let playlist_id = insert_playlist(&db.conn, &Playlist {
            id: None,
            name: "Test Playlist".to_string(),
            description: None,
            date_created: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        }).unwrap();

        let track = Track {
            id: None,
            path: "/music/test.mp3".to_string(),
            title: "Test Track".to_string(),
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();
        add_track_to_playlist(&db.conn, playlist_id, track_id).unwrap();

        // Eliminar playlist
        delete_playlist(&db.conn, playlist_id).unwrap();

        // Verificar que playlist_tracks también se eliminó (CASCADE)
        let tracks = get_playlist_tracks(&db.conn, playlist_id).unwrap();
        assert_eq!(tracks.len(), 0);

        // Track original debe seguir existiendo
        let track_exists = get_track(&db.conn, track_id);
        assert!(track_exists.is_ok());
    }

    #[test]
    fn test_update_track_metadata() {
        let db = setup_db();

        let track = Track {
            id: None,
            path: "/music/test.mp3".to_string(),
            title: "Original Title".to_string(),
            artist: "Original Artist".to_string(),
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
        };

        let id = insert_track(&db.conn, &track).unwrap();

        // Actualizar solo título y rating
        update_track_metadata(
            &db.conn,
            id,
            Some("New Title"),
            None,
            None,
            None,
            None,
            None,
            Some(4),
        ).unwrap();

        let updated = get_track(&db.conn, id).unwrap();
        assert_eq!(updated.title, "New Title");
        assert_eq!(updated.artist, "Original Artist"); // No cambió
        assert_eq!(updated.rating, Some(4));
    }

    #[test]
    fn test_update_track_metadata_all_fields() {
        let db = setup_db();

        let track = Track {
            id: None,
            path: "/music/test.mp3".to_string(),
            title: "Original".to_string(),
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
        };

        let id = insert_track(&db.conn, &track).unwrap();

        // Actualizar todos los campos
        update_track_metadata(
            &db.conn,
            id,
            Some("New Title"),
            Some("New Artist"),
            Some("New Album"),
            Some(2024),
            Some("Electronic"),
            Some(128.0),
            Some(5),
        ).unwrap();

        let updated = get_track(&db.conn, id).unwrap();
        assert_eq!(updated.title, "New Title");
        assert_eq!(updated.artist, "New Artist");
        assert_eq!(updated.album, Some("New Album".to_string()));
        assert_eq!(updated.year, Some(2024));
        assert_eq!(updated.genre, Some("Electronic".to_string()));
        assert_eq!(updated.bpm, Some(128.0));
        assert_eq!(updated.rating, Some(5));
    }

    #[test]
    fn test_update_track_metadata_invalid_rating() {
        let db = setup_db();

        let track = Track {
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
        };

        let id = insert_track(&db.conn, &track).unwrap();

        // Intentar actualizar con rating inválido
        let result = update_track_metadata(
            &db.conn,
            id,
            None,
            None,
            None,
            None,
            None,
            None,
            Some(10), // Invalid: debe ser 0-5
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_update_track_metadata_no_changes() {
        let db = setup_db();

        let track = Track {
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
        };

        let id = insert_track(&db.conn, &track).unwrap();

        // Llamar sin cambios (todos None)
        let result = update_track_metadata(
            &db.conn,
            id,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        );

        assert!(result.is_ok());

        // Track debe seguir igual
        let unchanged = get_track(&db.conn, id).unwrap();
        assert_eq!(unchanged.title, "Test");
        assert_eq!(unchanged.artist, "Artist");
    }

    #[test]
    fn test_settings() {
        let db = setup_db();

        set_setting(&db.conn, "theme", "dark", "string").unwrap();
        let setting = get_setting(&db.conn, "theme").unwrap();

        assert_eq!(setting.key, "theme");
        assert_eq!(setting.value, "dark");
        assert_eq!(setting.value_type, "string");
    }

    // ==================== TESTS DE BEATGRIDS ====================

    #[test]
    fn test_upsert_beatgrid() {
        let db = setup_db();

        // Crear track primero
        let track = Track {
            id: None,
            path: "/music/test.mp3".to_string(),
            title: "Test Track".to_string(),
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        // Insertar beatgrid
        let id = upsert_beatgrid(&db.conn, track_id, 128.0, 0.5, Some(95.0)).unwrap();
        assert!(id > 0);

        // Obtener y verificar
        let beatgrid = get_beatgrid(&db.conn, track_id).unwrap().unwrap();
        assert_eq!(beatgrid.bpm, 128.0);
        assert_eq!(beatgrid.offset, 0.5);
        assert_eq!(beatgrid.confidence, Some(95.0));
    }

    #[test]
    fn test_get_beatgrid_nonexistent() {
        let db = setup_db();
        
        let result = get_beatgrid(&db.conn, 999).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_update_beatgrid_offset() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        upsert_beatgrid(&db.conn, track_id, 128.0, 0.5, Some(90.0)).unwrap();

        // Actualizar solo offset
        update_beatgrid_offset(&db.conn, track_id, 0.75).unwrap();

        let beatgrid = get_beatgrid(&db.conn, track_id).unwrap().unwrap();
        assert_eq!(beatgrid.offset, 0.75);
        assert_eq!(beatgrid.bpm, 128.0); // BPM no cambió
    }

    #[test]
    fn test_delete_beatgrid() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        upsert_beatgrid(&db.conn, track_id, 128.0, 0.5, None).unwrap();
        delete_beatgrid(&db.conn, track_id).unwrap();

        let result = get_beatgrid(&db.conn, track_id).unwrap();
        assert!(result.is_none());
    }

    // ==================== TESTS DE CUE POINTS ====================

    #[test]
    fn test_insert_and_get_cue_points() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        // Insertar cue point
        let id = insert_cue_point(
            &db.conn,
            track_id,
            30.0,
            "Intro",
            "#FF0000",
            "intro",
            Some(1),
        )
        .unwrap();
        assert!(id > 0);

        // Obtener y verificar
        let cues = get_cue_points(&db.conn, track_id).unwrap();
        assert_eq!(cues.len(), 1);
        assert_eq!(cues[0].position, 30.0);
        assert_eq!(cues[0].label, "Intro");
        assert_eq!(cues[0].hotkey, Some(1));
    }

    #[test]
    fn test_get_cue_points_ordered() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        // Insertar en orden no secuencial
        insert_cue_point(&db.conn, track_id, 90.0, "Outro", "#00FF00", "outro", None).unwrap();
        insert_cue_point(&db.conn, track_id, 30.0, "Intro", "#FF0000", "intro", None).unwrap();
        insert_cue_point(&db.conn, track_id, 60.0, "Drop", "#0000FF", "drop", None).unwrap();

        // Deben retornar ordenados por posición
        let cues = get_cue_points(&db.conn, track_id).unwrap();
        assert_eq!(cues.len(), 3);
        assert_eq!(cues[0].position, 30.0);
        assert_eq!(cues[1].position, 60.0);
        assert_eq!(cues[2].position, 90.0);
    }

    #[test]
    fn test_cue_point_limit_64() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        // Insertar 64 cue points
        for i in 0..64 {
            insert_cue_point(
                &db.conn,
                track_id,
                i as f64,
                &format!("Cue {}", i),
                "#FFFFFF",
                "custom",
                None,
            )
            .unwrap();
        }

        // Intentar insertar el 65
        let result = insert_cue_point(
            &db.conn,
            track_id,
            100.0,
            "Extra",
            "#000000",
            "custom",
            None,
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_update_cue_point() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        let cue_id = insert_cue_point(
            &db.conn,
            track_id,
            30.0,
            "Original",
            "#FF0000",
            "intro",
            None,
        )
        .unwrap();

        // Actualizar label y hotkey
        update_cue_point(
            &db.conn,
            cue_id,
            None,
            Some("Updated"),
            None,
            None,
            Some(Some(2)),
        )
        .unwrap();

        let cues = get_cue_points(&db.conn, track_id).unwrap();
        assert_eq!(cues[0].label, "Updated");
        assert_eq!(cues[0].hotkey, Some(2));
        assert_eq!(cues[0].position, 30.0); // No cambió
    }

    #[test]
    fn test_delete_cue_point() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        let cue_id = insert_cue_point(
            &db.conn,
            track_id,
            30.0,
            "Test",
            "#FF0000",
            "intro",
            None,
        )
        .unwrap();

        delete_cue_point(&db.conn, cue_id).unwrap();

        let cues = get_cue_points(&db.conn, track_id).unwrap();
        assert_eq!(cues.len(), 0);
    }

    #[test]
    fn test_cue_point_invalid_hotkey() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        // Hotkey inválido (> 8)
        let result = insert_cue_point(
            &db.conn,
            track_id,
            30.0,
            "Test",
            "#FF0000",
            "intro",
            Some(10),
        );

        assert!(result.is_err());
    }

    // ==================== TESTS DE LOOPS ====================

    #[test]
    fn test_insert_and_get_loops() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        // Insertar loop
        let id = insert_loop(&db.conn, track_id, "Loop 1", 30.0, 60.0).unwrap();
        assert!(id > 0);

        // Obtener y verificar
        let loops = get_loops(&db.conn, track_id).unwrap();
        assert_eq!(loops.len(), 1);
        assert_eq!(loops[0].label, "Loop 1");
        assert_eq!(loops[0].loop_start, 30.0);
        assert_eq!(loops[0].loop_end, 60.0);
        assert!(!loops[0].is_active);
    }

    #[test]
    fn test_get_loops_ordered() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        // Insertar en orden no secuencial
        insert_loop(&db.conn, track_id, "Loop 2", 60.0, 90.0).unwrap();
        insert_loop(&db.conn, track_id, "Loop 1", 30.0, 60.0).unwrap();
        insert_loop(&db.conn, track_id, "Loop 3", 90.0, 120.0).unwrap();

        // Deben retornar ordenados por loop_start
        let loops = get_loops(&db.conn, track_id).unwrap();
        assert_eq!(loops.len(), 3);
        assert_eq!(loops[0].loop_start, 30.0);
        assert_eq!(loops[1].loop_start, 60.0);
        assert_eq!(loops[2].loop_start, 90.0);
    }

    #[test]
    fn test_loop_duration_validation() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        // Loop demasiado corto (< 100ms)
        let result = insert_loop(&db.conn, track_id, "Invalid", 30.0, 30.05);
        assert!(result.is_err());

        // Loop válido (>= 100ms)
        let result = insert_loop(&db.conn, track_id, "Valid", 30.0, 30.1);
        assert!(result.is_ok());
    }

    #[test]
    fn test_update_loop() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        let loop_id = insert_loop(&db.conn, track_id, "Original", 30.0, 60.0).unwrap();

        // Actualizar label e is_active
        update_loop(&db.conn, loop_id, Some("Updated"), None, None, Some(true)).unwrap();

        let loops = get_loops(&db.conn, track_id).unwrap();
        assert_eq!(loops[0].label, "Updated");
        assert!(loops[0].is_active);
        assert_eq!(loops[0].loop_start, 30.0); // No cambió
    }

    #[test]
    fn test_update_loop_duration_validation() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        let loop_id = insert_loop(&db.conn, track_id, "Test", 30.0, 60.0).unwrap();

        // Intentar actualizar con duración inválida
        let result = update_loop(&db.conn, loop_id, None, Some(50.0), Some(50.05), None);
        assert!(result.is_err());

        // Actualizar con duración válida
        let result = update_loop(&db.conn, loop_id, None, Some(50.0), Some(70.0), None);
        assert!(result.is_ok());
    }

    #[test]
    fn test_delete_loop() {
        let db = setup_db();

        let track = Track {
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
        };
        let track_id = insert_track(&db.conn, &track).unwrap();

        let loop_id = insert_loop(&db.conn, track_id, "Test", 30.0, 60.0).unwrap();

        delete_loop(&db.conn, loop_id).unwrap();

        let loops = get_loops(&db.conn, track_id).unwrap();
        assert_eq!(loops.len(), 0);
    }
}
