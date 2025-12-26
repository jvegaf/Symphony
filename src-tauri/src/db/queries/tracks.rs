use crate::db::models::Track;
/// CRUD para tracks con UUIDs
///
/// AIDEV-NOTE: Migrado de i64 a String (UUID v4) para IDs
use rusqlite::{params, Connection, Result};
use uuid::Uuid;

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

/// Obtiene un track por su UUID
pub fn get_track(conn: &Connection, id: &str) -> Result<Track> {
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

/// Obtiene todos los tracks ordenados por fecha de agregado
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

/// Elimina un track por su UUID
pub fn delete_track(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM tracks WHERE id = ?1", [id])?;
    Ok(())
}

/// Elimina toda la biblioteca: tracks, playlists, waveforms y datos de análisis
/// AIDEV-NOTE: Útil para empezar de cero sin reinstalar la app
/// Las tablas relacionadas (playlist_tracks, beatgrids, cue_points, loops, waveforms)
/// se eliminan en cascada gracias a las foreign keys
pub fn reset_library(conn: &Connection) -> Result<ResetLibraryResult> {
    // Contar antes de eliminar para informar al usuario
    let tracks_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tracks",
        [],
        |row| row.get(0),
    )?;
    
    let playlists_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM playlists",
        [],
        |row| row.get(0),
    )?;
    
    let waveforms_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM waveforms",
        [],
        |row| row.get(0),
    )?;

    // Eliminar en orden correcto (respeta foreign keys)
    // playlist_tracks, beatgrids, cue_points, loops se eliminan en cascada
    conn.execute("DELETE FROM waveforms", [])?;
    conn.execute("DELETE FROM loops", [])?;
    conn.execute("DELETE FROM cue_points", [])?;
    conn.execute("DELETE FROM beatgrids", [])?;
    conn.execute("DELETE FROM playlist_tracks", [])?;
    conn.execute("DELETE FROM playlists", [])?;
    conn.execute("DELETE FROM tracks", [])?;

    Ok(ResetLibraryResult {
        tracks_deleted: tracks_count as usize,
        playlists_deleted: playlists_count as usize,
        waveforms_deleted: waveforms_count as usize,
    })
}

/// Resultado de reset_library
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetLibraryResult {
    pub tracks_deleted: usize,
    pub playlists_deleted: usize,
    pub waveforms_deleted: usize,
}

/// Busca tracks por título, artista o álbum
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{migrations, Database};

    fn setup_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        migrations::run_migrations(&db.conn).unwrap();
        db
    }

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
        assert!(!id.is_empty());
        assert!(Uuid::parse_str(&id).is_ok());

        let loaded = get_track(&db.conn, &id).unwrap();
        assert_eq!(loaded.title, "Test Track");
        assert_eq!(loaded.artist, "Test Artist");
        assert_eq!(loaded.bpm, Some(128.0));
    }

    #[test]
    fn test_search_tracks() {
        let db = setup_db();

        let track = Track {
            id: None,
            path: "/music/test.mp3".to_string(),
            title: "Electronic Dreams".to_string(),
            artist: "DJ Test".to_string(),
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

        let results = search_tracks(&db.conn, "Electronic").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Electronic Dreams");
    }

    #[test]
    fn test_update_track_metadata() {
        let db = setup_db();

        let track = Track {
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

        update_track_metadata(
            &db.conn,
            &id,
            Some("New Title"),
            None,
            None,
            None,
            None,
            None,
            None,
            Some(5),
        )
        .unwrap();

        let updated = get_track(&db.conn, &id).unwrap();
        assert_eq!(updated.title, "New Title");
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
        delete_track(&db.conn, &id).unwrap();

        let result = get_track(&db.conn, &id);
        assert!(result.is_err());
    }

    #[test]
    fn test_reset_library() {
        let db = setup_db();

        // Insertar algunos tracks
        for i in 0..3 {
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

        // Verificar que hay 3 tracks
        let tracks_before = get_all_tracks(&db.conn).unwrap();
        assert_eq!(tracks_before.len(), 3);

        // Resetear biblioteca
        let result = reset_library(&db.conn).unwrap();
        assert_eq!(result.tracks_deleted, 3);

        // Verificar que no hay tracks
        let tracks_after = get_all_tracks(&db.conn).unwrap();
        assert_eq!(tracks_after.len(), 0);
    }
}
