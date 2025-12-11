use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

use crate::library::{LibraryImporter, ImportResult};
use crate::db::queries;
use crate::db::models::Track;

/// Estado global del importador de biblioteca
pub struct LibraryState {
    importer: Arc<Mutex<LibraryImporter>>,
}

impl LibraryState {
    pub fn new() -> Self {
        Self {
            importer: Arc::new(Mutex::new(LibraryImporter::new())),
        }
    }
}

/// Importa una biblioteca musical desde una ruta
/// 
/// Escanea recursivamente el directorio, extrae metadatos
/// de archivos de audio e inserta en la base de datos.
/// 
/// Emite eventos:
/// - `library:import-progress` con progreso actual
/// - `library:import-complete` con resultado final
#[tauri::command]
pub async fn import_library(
    app_handle: AppHandle,
    library_state: State<'_, LibraryState>,
    path: String,
) -> Result<ImportResult, String> {
    let library_path = PathBuf::from(&path);
    
    // Validar que el path existe
    if !library_path.exists() {
        return Err(format!("Ruta no encontrada: {}", path));
    }

    if !library_path.is_dir() {
        return Err(format!("La ruta no es un directorio: {}", path));
    }

    // Obtener importador
    let importer = library_state.importer.lock().await;
    
    // Iniciar importación
    importer.import_library(app_handle, &library_path)
        .await
        .map_err(|e| e.to_string())
}

/// Obtiene todas las pistas de la biblioteca
#[tauri::command]
pub async fn get_all_tracks() -> Result<Vec<Track>, String> {
    let db = crate::db::get_connection()
        .map_err(|e| e.to_string())?;
    queries::get_all_tracks(&db.conn)
        .map_err(|e| e.to_string())
}

/// Busca pistas por título, artista o álbum
#[tauri::command]
pub async fn search_tracks(query: String) -> Result<Vec<Track>, String> {
    let db = crate::db::get_connection()
        .map_err(|e| e.to_string())?;
    queries::search_tracks(&db.conn, &query)
        .map_err(|e| e.to_string())
}

/// Obtiene una pista por ID
#[tauri::command]
pub async fn get_track_by_id(id: i64) -> Result<Track, String> {
    let db = crate::db::get_connection()
        .map_err(|e| e.to_string())?;
    queries::get_track_by_id(&db.conn, id)
        .map_err(|e| e.to_string())
}

/// Obtiene estadísticas de la biblioteca
#[tauri::command]
pub async fn get_library_stats() -> Result<LibraryStats, String> {
    let db = crate::db::get_connection()
        .map_err(|e| e.to_string())?;
    let tracks = queries::get_all_tracks(&db.conn)
        .map_err(|e| e.to_string())?;

    let total_tracks = tracks.len();
    let total_duration: f64 = tracks.iter().map(|t| t.duration).sum();
    let total_size: i64 = tracks.iter().map(|t| t.file_size).sum();
    
    // Contar artistas y álbumes únicos
    let mut artists = std::collections::HashSet::new();
    let mut albums = std::collections::HashSet::new();
    
    for track in tracks {
        artists.insert(track.artist.clone());
        if let Some(album) = track.album {
            albums.insert(album);
        }
    }

    Ok(LibraryStats {
        total_tracks,
        total_artists: artists.len(),
        total_albums: albums.len(),
        total_duration_hours: total_duration / 3600.0,
        total_size_gb: total_size as f64 / 1_073_741_824.0,
    })
}

/// Estadísticas de la biblioteca
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LibraryStats {
    pub total_tracks: usize,
    pub total_artists: usize,
    pub total_albums: usize,
    pub total_duration_hours: f64,
    pub total_size_gb: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_library_state_new() {
        let _state = LibraryState::new();
        assert!(true); // Estado se crea correctamente
    }

    #[test]
    fn test_library_stats_serialization() {
        let stats = LibraryStats {
            total_tracks: 1000,
            total_artists: 150,
            total_albums: 200,
            total_duration_hours: 72.5,
            total_size_gb: 8.3,
        };

        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("\"total_tracks\":1000"));
        assert!(json.contains("\"total_artists\":150"));
        assert!(json.contains("\"total_duration_hours\":72.5"));
    }

    // Tests asíncronos de comandos requieren setup completo de Tauri
    // Los dejaremos para testing de integración
}
