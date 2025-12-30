//! Operaciones de lectura de tracks

use rusqlite::{Connection, Result};

use crate::db::models::Track;

/// Obtiene un track por su UUID
pub fn get_track(conn: &Connection, id: &str) -> Result<Track> {
    conn.query_row(
        "SELECT id, path, title, artist, album, genre, year,
                duration, bitrate, sample_rate, file_size,
                bpm, key, rating, play_count, last_played,
                date_added, date_modified, label, isrc, beatport_id
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
                label: row.get(18)?,
                isrc: row.get(19)?,
                beatport_id: row.get(20)?,
            })
        },
    )
}

/// Obtiene todos los tracks ordenados por fecha de agregado
pub fn get_all_tracks(conn: &Connection) -> Result<Vec<Track>> {
    let mut stmt = conn.prepare(
        "SELECT id, path, title, artist, album, genre, year,
                duration, bitrate, sample_rate, file_size,
                bpm, key, rating, play_count, last_played,
                date_added, date_modified, label, isrc, beatport_id
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
            label: row.get(18)?,
            isrc: row.get(19)?,
            beatport_id: row.get(20)?,
        })
    })?;

    tracks.collect()
}
