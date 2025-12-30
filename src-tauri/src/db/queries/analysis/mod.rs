/**
 * CRUD para análisis de audio (beatgrids, cue points, loops)
 * 
 * ## Módulos
 * 
 * - **waveforms**: Caché de visualización de waveforms
 * - **beatgrids**: Análisis de tempo y beatgrid
 * - **cue_points**: Puntos de marcación en pistas
 * - **loops**: Bucles de reproducción
 * 
 * ## Notas
 * 
 * Todos los módulos usan UUIDs (String) como identificadores primarios.
 */

mod beatgrids;
mod cue_points;
mod loops;
mod waveforms;

// Re-exportar funciones públicas
pub use beatgrids::{delete_beatgrid, get_beatgrid, update_beatgrid_offset, upsert_beatgrid};
pub use cue_points::{delete_cue_point, get_cue_points, insert_cue_point, update_cue_point};
pub use loops::{delete_loop, get_loops, insert_loop, update_loop};
pub use waveforms::{get_waveform, save_waveform};

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{migrations, queries::tracks, Database};

    fn setup_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        migrations::run_migrations(&db.conn).unwrap();
        db
    }

    #[test]
    fn test_upsert_beatgrid() {
        let db = setup_db();

        // Crear track primero
        let track = crate::db::models::Track {
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
        let track_id = tracks::insert_track(&db.conn, &track).unwrap();

        // Insertar beatgrid
        let id = upsert_beatgrid(&db.conn, &track_id, 128.0, 0.5, Some(95.0)).unwrap();
        assert!(!id.is_empty());

        // Obtener y verificar
        let beatgrid = get_beatgrid(&db.conn, &track_id).unwrap().unwrap();
        assert_eq!(beatgrid.bpm, 128.0);
        assert_eq!(beatgrid.offset, 0.5);
        assert_eq!(beatgrid.confidence, Some(95.0));
    }

    #[test]
    fn test_insert_cue_point() {
        let db = setup_db();

        let track = crate::db::models::Track {
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
        let track_id = tracks::insert_track(&db.conn, &track).unwrap();

        let id = insert_cue_point(
            &db.conn,
            &track_id,
            30.0,
            "Intro",
            "#FF0000",
            "intro",
            Some(1),
        )
        .unwrap();

        assert!(!id.is_empty());

        let cues = get_cue_points(&db.conn, &track_id).unwrap();
        assert_eq!(cues.len(), 1);
        assert_eq!(cues[0].position, 30.0);
    }
}
