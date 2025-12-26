use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use crate::db::{
    models::Playlist,
    queries::{
        add_track_to_playlist as db_add_track, delete_playlist as db_delete_playlist,
        get_all_playlists, get_playlist as db_get_playlist, get_playlist_tracks, insert_playlist,
        remove_track_from_playlist as db_remove_track, update_playlist as db_update_playlist,
        update_playlist_track_order as db_update_track_order,
    },
};

// Estructura para crear playlist
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePlaylistRequest {
    pub name: String,
    pub description: Option<String>,
}

// Estructura para actualizar playlist
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePlaylistRequest {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

/// Crear nueva playlist
#[tauri::command]
pub async fn create_playlist(
    name: String,
    description: Option<String>,
    db: State<'_, Mutex<Connection>>,
) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let playlist = Playlist {
        id: None,
        name,
        description,
        date_created: "".to_string(), // Se usa CURRENT_TIMESTAMP en DB
        date_modified: "".to_string(),
    };

    insert_playlist(&conn, &playlist).map_err(|e| e.to_string())
}

/// Obtener todas las playlists
#[tauri::command]
pub async fn get_playlists(db: State<'_, Mutex<Connection>>) -> Result<Vec<Playlist>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    get_all_playlists(&conn).map_err(|e| e.to_string())
}

/// Obtener playlist por ID
#[tauri::command]
pub async fn get_playlist(
    id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Playlist, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    db_get_playlist(&conn, &id).map_err(|e| e.to_string())
}

/// Actualizar playlist
#[tauri::command]
pub async fn update_playlist(
    id: String,
    name: String,
    description: Option<String>,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    db_update_playlist(&conn, &id, &name, description.as_deref()).map_err(|e| e.to_string())
}

/// Eliminar playlist
#[tauri::command]
pub async fn delete_playlist(id: String, db: State<'_, Mutex<Connection>>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    db_delete_playlist(&conn, &id).map_err(|e| e.to_string())
}

/// Agregar track a playlist
#[tauri::command]
pub async fn add_track_to_playlist(
    playlist_id: String,
    track_id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    db_add_track(&conn, &playlist_id, &track_id).map_err(|e| e.to_string())
}

/// Eliminar track de playlist
#[tauri::command]
pub async fn remove_track_from_playlist(
    playlist_id: String,
    track_id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    db_remove_track(&conn, &playlist_id, &track_id).map_err(|e| e.to_string())
}

/// Reordenar tracks en playlist
#[tauri::command]
pub async fn reorder_playlist_tracks(
    playlist_id: String,
    track_ids: Vec<String>,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;
    db_update_track_order(&mut conn, &playlist_id, &track_ids).map_err(|e| e.to_string())
}

/// Obtener tracks de una playlist
#[tauri::command]
pub async fn get_playlist_tracks_cmd(
    playlist_id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<crate::db::models::Track>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    get_playlist_tracks(&conn, &playlist_id).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::models::Track;
    use crate::db::queries::insert_track;
    use crate::db::{migrations, Database};

    fn setup_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        migrations::run_migrations(&db.conn).unwrap();
        db
    }

    #[test]
    fn test_create_and_get_playlist() {
        let db = setup_db();

        let playlist = Playlist {
            id: None,
            name: "Test Playlist".to_string(),
            description: Some("Test description".to_string()),
            date_created: "".to_string(),
            date_modified: "".to_string(),
        };

        let id = insert_playlist(&db.conn, &playlist).unwrap();
        let retrieved = db_get_playlist(&db.conn, &id).unwrap();

        assert_eq!(retrieved.name, "Test Playlist");
        assert_eq!(retrieved.description, Some("Test description".to_string()));
    }

    #[test]
    fn test_playlist_crud() {
        let db = setup_db();

        // Create
        let playlist = Playlist {
            id: None,
            name: "Original".to_string(),
            description: None,
            date_created: "".to_string(),
            date_modified: "".to_string(),
        };
        let id = insert_playlist(&db.conn, &playlist).unwrap();

        // Update
        db_update_playlist(&db.conn, &id, "Updated", Some("New description")).unwrap();

        let retrieved = db_get_playlist(&db.conn, &id).unwrap();
        assert_eq!(retrieved.name, "Updated");

        // Delete
        db_delete_playlist(&db.conn, &id).unwrap();

        let result = db_get_playlist(&db.conn, &id);
        assert!(result.is_err());
    }

    #[test]
    fn test_playlist_tracks() {
        let db = setup_db();

        // Crear playlist
        let playlist = Playlist {
            id: None,
            name: "Test Playlist".to_string(),
            description: None,
            date_created: "".to_string(),
            date_modified: "".to_string(),
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
            label: None,
            isrc: None,
        };

        let track_id = insert_track(&db.conn, &track).unwrap();

        // Agregar track a playlist
        db_add_track(&db.conn, &playlist_id, &track_id).unwrap();

        // Obtener tracks
        let tracks = get_playlist_tracks(&db.conn, &playlist_id).unwrap();

        assert_eq!(tracks.len(), 1);
        assert_eq!(tracks[0].title, "Test Track");

        // Remover track
        db_remove_track(&db.conn, &playlist_id, &track_id).unwrap();

        let tracks = get_playlist_tracks(&db.conn, &playlist_id).unwrap();
        assert_eq!(tracks.len(), 0);
    }
}
