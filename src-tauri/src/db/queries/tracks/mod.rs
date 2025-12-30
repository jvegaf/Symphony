//! Operaciones de base de datos para tracks

pub mod consolidate;
pub mod create;
pub mod delete;
pub mod read;
pub mod search;
pub mod update;

pub use consolidate::{consolidate_library, ConsolidateLibraryResult};
pub use create::insert_track;
pub use delete::{delete_track, reset_library, ResetLibraryResult};
pub use read::{get_all_tracks, get_track};
pub use search::search_tracks;
pub use update::{update_track, update_track_metadata};

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{models::Track, Database};

    fn setup_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        crate::db::migrations::run_migrations(&db.conn).unwrap();
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
            duration: 180.5,
            bitrate: 320,
            sample_rate: 44100,
            file_size: 8388608,
            bpm: Some(128.0),
            key: Some("Cm".to_string()),
            rating: Some(4),
            play_count: 0,
            last_played: None,
            date_added: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
            label: None,
            isrc: None,
            beatport_id: None,
        };

        let id = insert_track(&db.conn, &track).unwrap();
        assert!(!id.is_empty());

        let retrieved = get_track(&db.conn, &id).unwrap();
        assert_eq!(retrieved.title, "Test Track");
        assert_eq!(retrieved.artist, "Test Artist");
    }

    #[test]
    fn test_search_tracks() {
        let db = setup_db();

        let track = Track {
            id: None,
            path: "/music/electronic.mp3".to_string(),
            title: "Electronic Dreams".to_string(),
            artist: "Dream Artist".to_string(),
            album: None,
            genre: Some("Electronic".to_string()),
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
            beatport_id: None,
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
            title: "Old Title".to_string(),
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
            label: None,
            isrc: None,
            beatport_id: None,
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
            label: None,
            isrc: None,
            beatport_id: None,
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
                label: None,
                isrc: None,
                beatport_id: None,
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
