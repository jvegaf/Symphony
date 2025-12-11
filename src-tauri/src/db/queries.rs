use rusqlite::{Connection, Result, params};
use crate::db::models::{Track, Playlist, Setting};

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
         VALUES (?1, ?2, ?3, ?4)",
        params![
            playlist.name,
            playlist.description,
            playlist.date_created,
            playlist.date_modified,
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{Database, migrations};

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
    fn test_settings() {
        let db = setup_db();

        set_setting(&db.conn, "theme", "dark", "string").unwrap();
        let setting = get_setting(&db.conn, "theme").unwrap();

        assert_eq!(setting.key, "theme");
        assert_eq!(setting.value, "dark");
        assert_eq!(setting.value_type, "string");
    }
}
