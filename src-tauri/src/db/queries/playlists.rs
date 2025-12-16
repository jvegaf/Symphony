/// CRUD para playlists con UUIDs

use rusqlite::{Connection, Result, params, OptionalExtension};
use uuid::Uuid;
use crate::db::models::{Playlist, Track};

/// Inserta una nueva playlist y retorna su UUID
pub fn insert_playlist(conn: &Connection, playlist: &Playlist) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO playlists (id, name, description, date_created, date_modified)
         VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        params![&id, playlist.name, playlist.description],
    )?;

    Ok(id)
}

/// Obtiene una playlist por UUID
pub fn get_playlist(conn: &Connection, id: &str) -> Result<Playlist> {
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

/// Obtiene todas las playlists ordenadas por nombre
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

/// Elimina una playlist por UUID
pub fn delete_playlist(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM playlists WHERE id = ?1", [id])?;
    Ok(())
}

/// Actualiza una playlist
pub fn update_playlist(
    conn: &Connection,
    id: &str,
    name: &str,
    description: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE playlists SET name = ?1, description = ?2, date_modified = CURRENT_TIMESTAMP WHERE id = ?3",
        params![name, description, id],
    )?;
    Ok(())
}

/// Agrega un track a una playlist
pub fn add_track_to_playlist(
    conn: &Connection,
    playlist_id: &str,
    track_id: &str,
) -> Result<()> {
    // Obtener posición más alta actual
    let max_position: Option<i32> = conn
        .query_row(
            "SELECT MAX(position) FROM playlist_tracks WHERE playlist_id = ?1",
            [playlist_id],
            |row| row.get(0),
        )
        .optional()?
        .flatten();
    
    let next_position = max_position.unwrap_or(-1) + 1;
    let id = Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO playlist_tracks (id, playlist_id, track_id, position, date_added)
         VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
        params![&id, playlist_id, track_id, next_position],
    )?;
    Ok(())
}

/// Elimina un track de una playlist
pub fn remove_track_from_playlist(
    conn: &Connection,
    playlist_id: &str,
    track_id: &str,
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

/// Reordena las posiciones de tracks en una playlist
pub fn reorder_playlist_tracks(
    conn: &Connection,
    playlist_id: &str,
) -> Result<()> {
    // Obtener tracks en orden actual
    let mut stmt = conn.prepare(
        "SELECT id FROM playlist_tracks 
         WHERE playlist_id = ?1 
         ORDER BY position"
    )?;
    
    let track_ids: Vec<String> = stmt
        .query_map([playlist_id], |row| row.get(0))?
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

/// Actualiza el orden completo de tracks en una playlist
pub fn update_playlist_track_order(
    conn: &mut Connection,
    playlist_id: &str,
    track_ids: &[String],
) -> Result<()> {
    let tx = conn.transaction()?;
    
    // Eliminar tracks actuales
    tx.execute(
        "DELETE FROM playlist_tracks WHERE playlist_id = ?1",
        [playlist_id],
    )?;
    
    // Insertar con nuevo orden
    for (position, track_id) in track_ids.iter().enumerate() {
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO playlist_tracks (id, playlist_id, track_id, position, date_added)
             VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
            params![&id, playlist_id, track_id, position as i32],
        )?;
    }
    
    tx.commit()?;
    Ok(())
}

/// Obtiene todos los tracks de una playlist ordenados por posición
pub fn get_playlist_tracks(
    conn: &Connection,
    playlist_id: &str,
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
    
    let tracks = stmt.query_map([playlist_id], |row| {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{Database, migrations, queries::tracks};

    fn setup_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        migrations::run_migrations(&db.conn).unwrap();
        db
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
        let loaded = get_playlist(&db.conn, &id).unwrap();

        assert_eq!(loaded.name, "My Playlist");
        assert_eq!(loaded.description, Some("Test playlist".to_string()));
    }

    #[test]
    fn test_add_track_to_playlist() {
        let db = setup_db();

        let playlist = Playlist {
            id: None,
            name: "Test Playlist".to_string(),
            description: None,
            date_created: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        };
        let playlist_id = insert_playlist(&db.conn, &playlist).unwrap();

        let track = crate::db::models::Track {
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
        let track_id = tracks::insert_track(&db.conn, &track).unwrap();

        add_track_to_playlist(&db.conn, &playlist_id, &track_id).unwrap();

        let tracks = get_playlist_tracks(&db.conn, &playlist_id).unwrap();
        assert_eq!(tracks.len(), 1);
        assert_eq!(tracks[0].id, Some(track_id));
    }
}
