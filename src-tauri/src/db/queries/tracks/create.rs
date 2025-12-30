//! Operaciones de creación de tracks

use rusqlite::{params, Connection, Result};
use uuid::Uuid;

use crate::db::models::Track;

/// Inserta un nuevo track y retorna su UUID
pub fn insert_track(conn: &Connection, track: &Track) -> Result<String> {
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO tracks (
            id, path, title, artist, album, genre, year,
            duration, bitrate, sample_rate, file_size,
            bpm, key, rating, play_count, last_played,
            date_added, date_modified
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
        params![
            id,
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

    Ok(id)
}
