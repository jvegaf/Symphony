//! Operaciones de búsqueda de tracks

use rusqlite::{Connection, Result};

use crate::db::models::Track;

/// Busca tracks por título, artista o álbum
pub fn search_tracks(conn: &Connection, query: &str) -> Result<Vec<Track>> {
    let pattern = format!("%{}%", query);

    let mut stmt = conn.prepare(
        "SELECT id, path, title, artist, album, genre, year, duration, bitrate,
                sample_rate, file_size, bpm, key, rating, play_count, last_played,
                date_added, date_modified, label, isrc, beatport_id
         FROM tracks
         WHERE title LIKE ?1 OR artist LIKE ?1 OR album LIKE ?1
         ORDER BY date_added DESC",
    )?;

    let tracks = stmt.query_map([&pattern], |row| {
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
            label: row.get(18)?,
            isrc: row.get(19)?,
            beatport_id: row.get(20)?,
        })
    })?;

    tracks.collect()
}
