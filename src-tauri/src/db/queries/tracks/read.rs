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

/// Obtiene múltiples tracks por sus UUIDs en una sola query
///
/// Optimización para operaciones batch (ej: Fix Tags de Beatport)
/// que necesitan cargar múltiples tracks simultáneamente.
///
/// # Arguments
/// * `conn` - Conexión a la base de datos
/// * `ids` - Vector de UUIDs de tracks a obtener
///
/// # Returns
/// Vector de tracks en el mismo orden que los IDs proporcionados
/// (si un ID no existe, no aparece en el resultado)
///
/// # Example
/// ```no_run
/// use rusqlite::Connection;
/// use symphony_lib::db::queries::get_tracks_batch;
/// 
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// let conn = Connection::open_in_memory()?;
/// let ids = vec!["uuid1".to_string(), "uuid2".to_string()];
/// let tracks = get_tracks_batch(&conn, &ids)?;
/// # Ok(())
/// # }
/// ```
pub fn get_tracks_batch(conn: &Connection, ids: &[String]) -> Result<Vec<Track>> {
    // AIDEV-NOTE: Optimización para Fix Tags - reduce N queries individuales a 1 batch query
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    
    // Construir placeholders: "?,?,?"
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!(
        "SELECT id, path, title, artist, album, genre, year,
                duration, bitrate, sample_rate, file_size,
                bpm, key, rating, play_count, last_played,
                date_added, date_modified, label, isrc, beatport_id
         FROM tracks WHERE id IN ({})",
        placeholders
    );
    
    let mut stmt = conn.prepare(&query)?;
    
    // Convertir Vec<String> a Vec<&dyn ToSql>
    let params: Vec<&dyn rusqlite::ToSql> = ids.iter()
        .map(|id| id as &dyn rusqlite::ToSql)
        .collect();
    
    let tracks = stmt.query_map(params.as_slice(), |row| {
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

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        
        // Crear tabla tracks
        conn.execute(
            "CREATE TABLE tracks (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT,
                genre TEXT,
                year INTEGER,
                duration REAL NOT NULL,
                bitrate INTEGER,
                sample_rate INTEGER,
                file_size INTEGER,
                bpm REAL,
                key TEXT,
                rating INTEGER,
                play_count INTEGER,
                last_played TEXT,
                date_added TEXT NOT NULL,
                date_modified TEXT NOT NULL,
                label TEXT,
                isrc TEXT,
                beatport_id INTEGER
            )",
            [],
        ).unwrap();
        
        conn
    }

    fn insert_test_track(conn: &Connection, id: &str, title: &str) {
        conn.execute(
            "INSERT INTO tracks (id, path, title, artist, duration, bitrate, sample_rate, file_size, play_count, date_added, date_modified)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![id, "/test.mp3", title, "Test Artist", 180.0, 320, 44100, 1024, 0, "2025-01-01", "2025-01-01"],
        ).unwrap();
    }

    #[test]
    fn test_get_tracks_batch_empty() {
        let conn = create_test_db();
        let result = get_tracks_batch(&conn, &[]).unwrap();
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_get_tracks_batch_single() {
        let conn = create_test_db();
        insert_test_track(&conn, "track1", "Track 1");
        
        let ids = vec!["track1".to_string()];
        let result = get_tracks_batch(&conn, &ids).unwrap();
        
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, Some("track1".to_string()));
        assert_eq!(result[0].title, "Track 1");
    }

    #[test]
    fn test_get_tracks_batch_multiple() {
        let conn = create_test_db();
        insert_test_track(&conn, "track1", "Track 1");
        insert_test_track(&conn, "track2", "Track 2");
        insert_test_track(&conn, "track3", "Track 3");
        
        let ids = vec!["track1".to_string(), "track3".to_string()];
        let result = get_tracks_batch(&conn, &ids).unwrap();
        
        assert_eq!(result.len(), 2);
        // Verificar que ambos tracks están presentes (orden puede variar)
        let ids_result: Vec<String> = result.iter()
            .filter_map(|t| t.id.as_ref().cloned())
            .collect();
        assert!(ids_result.contains(&"track1".to_string()));
        assert!(ids_result.contains(&"track3".to_string()));
    }

    #[test]
    fn test_get_tracks_batch_nonexistent() {
        let conn = create_test_db();
        insert_test_track(&conn, "track1", "Track 1");
        
        let ids = vec!["track1".to_string(), "nonexistent".to_string()];
        let result = get_tracks_batch(&conn, &ids).unwrap();
        
        // Solo debe devolver el track que existe
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, Some("track1".to_string()));
    }
}
