use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;

use crate::db::models::Track;
use crate::db::queries;
use crate::library::metadata::TrackMetadata;
use crate::library::{ImportResult, LibraryImporter, MetadataExtractor};

/// Estado global del importador de biblioteca
pub struct LibraryState {
    importer: Arc<Mutex<LibraryImporter>>,
}

impl Default for LibraryState {
    fn default() -> Self {
        Self::new()
    }
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

    // ✅ IMPORTANTE: Añadir el directorio al scope del asset protocol
    // Esto permite que el frontend use convertFileSrc() para cargar archivos de audio
    let asset_scope = app_handle.asset_protocol_scope();
    if let Err(e) = asset_scope.allow_directory(&library_path, true) {
        log::warn!("No se pudo añadir directorio al asset scope: {}", e);
        // No fallamos, continuamos con la importación
    } else {
        log::info!(
            "Directorio añadido al asset protocol scope: {:?}",
            library_path
        );
    }

    // Obtener importador
    let importer = library_state.importer.lock().await;

    // Iniciar importación
    importer
        .import_library(app_handle, &library_path)
        .await
        .map_err(|e| e.to_string())
}

/// Obtiene todas las pistas de la biblioteca
#[tauri::command]
pub async fn get_all_tracks() -> Result<Vec<Track>, String> {
    let db = crate::db::get_connection().map_err(|e| e.to_string())?;
    queries::get_all_tracks(&db.conn).map_err(|e| e.to_string())
}

/// Busca pistas por título, artista o álbum
#[tauri::command]
pub async fn search_tracks(query: String) -> Result<Vec<Track>, String> {
    let db = crate::db::get_connection().map_err(|e| e.to_string())?;
    queries::search_tracks(&db.conn, &query).map_err(|e| e.to_string())
}

/// Obtiene una pista por ID (UUID)
#[tauri::command]
pub async fn get_track_by_id(id: String) -> Result<Track, String> {
    let db = crate::db::get_connection().map_err(|e| e.to_string())?;
    queries::get_track(&db.conn, &id).map_err(|e| e.to_string())
}

/// Obtiene estadísticas de la biblioteca
#[tauri::command]
pub async fn get_library_stats() -> Result<LibraryStats, String> {
    let db = crate::db::get_connection().map_err(|e| e.to_string())?;
    let tracks = queries::get_all_tracks(&db.conn).map_err(|e| e.to_string())?;

    let total_tracks = tracks.len();
    let total_duration: f64 = tracks.iter().map(|t| t.duration).sum();
    let total_size: i64 = tracks.iter().map(|t| t.file_size).sum();

    // Contar artistas y álbumes únicos
    let mut artists = std::collections::HashSet::new();
    let mut albums = std::collections::HashSet::new();

    // Calcular distribución de ratings [0, 1, 2, 3, 4, 5]
    let mut rating_distribution = vec![0usize; 6]; // índices 0-5 para ratings 0-5

    for track in tracks {
        artists.insert(track.artist.clone());
        if let Some(album) = track.album {
            albums.insert(album);
        }

        // Contar rating (si es None, se considera 0)
        let rating = track.rating.unwrap_or(0) as usize;
        if rating <= 5 {
            rating_distribution[rating] += 1;
        }
    }

    Ok(LibraryStats {
        total_tracks,
        total_artists: artists.len(),
        total_albums: albums.len(),
        total_duration_hours: total_duration / 3600.0,
        total_size_gb: total_size as f64 / 1_073_741_824.0,
        rating_distribution,
    })
}

/// Estructura para actualizar metadatos de track
/// AIDEV-NOTE: 'key' soportado, 'comment' removido (no existe en DB schema)
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTrackMetadataRequest {
    pub id: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub year: Option<i32>,
    pub genre: Option<String>,
    pub bpm: Option<f64>,
    pub key: Option<String>, // Tonalidad musical (ej: "Am", "C#m")
    pub rating: Option<i32>,
}

/// Actualiza metadatos de una pista
///
/// AIDEV-NOTE: Ahora escribe tags físicamente al archivo usando lofty (como SongUpdater.update_song_from_tag en Python)
/// 1. Actualiza la base de datos SQLite
/// 2. Escribe tags ID3v2/MP4/Vorbis al archivo físico
#[tauri::command]
pub async fn update_track_metadata(request: UpdateTrackMetadataRequest) -> Result<(), String> {
    let db = crate::db::get_connection().map_err(|e| e.to_string())?;

    // Paso 1: Obtener el track actual para conocer su ruta
    let track =
        queries::get_track(&db.conn, &request.id).map_err(|e| format!("Track not found: {}", e))?;

    // Paso 2: Actualizar base de datos
    queries::update_track_metadata(
        &db.conn,
        &request.id,
        request.title.as_deref(),
        request.artist.as_deref(),
        request.album.as_deref(),
        request.year,
        request.genre.as_deref(),
        request.bpm,
        request.key.as_deref(),
        request.rating,
    )
    .map_err(|e| e.to_string())?;

    // Paso 3: Escribir tags físicamente al archivo (nuevo comportamiento)
    let extractor = MetadataExtractor::new();
    let file_path = Path::new(&track.path);

    // Crear TrackMetadata con los valores actualizados (merge con valores existentes)
    let metadata_to_write = TrackMetadata {
        path: track.path.clone(),
        title: request.title.or(Some(track.title)),
        artist: request.artist.or(Some(track.artist)),
        album: request.album.or(track.album),
        year: request.year.or(track.year),
        genre: request.genre.or(track.genre),
        bpm: request
            .bpm
            .map(|b| b as i32)
            .or(track.bpm.map(|b| b as i32)),
        key: request.key.or(track.key),
        rating: request.rating.or(track.rating),
        comment: None, // Comment no existe en Track model
        // Campos técnicos no cambian
        duration: track.duration,
        bitrate: track.bitrate,
        sample_rate: track.sample_rate as u32,
        channels: 2, // Asumimos stereo, no lo tenemos en DB
        format: file_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("unknown")
            .to_lowercase(),
        artwork: None,
    };

    // Escribir tags al archivo físico
    extractor
        .write_metadata(file_path, &metadata_to_write)
        .map_err(|e| format!("Failed to write tags to file: {}", e))?;

    log::info!(
        "Metadatos actualizados en DB y archivo físico para track {}",
        request.id
    );
    Ok(())
}

/// Estadísticas de la biblioteca
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LibraryStats {
    pub total_tracks: usize,
    pub total_artists: usize,
    pub total_albums: usize,
    pub total_duration_hours: f64,
    pub total_size_gb: f64,
    pub rating_distribution: Vec<usize>, // Distribución de ratings [0-5 stars]
}

/// Elimina una pista de la biblioteca y borra el archivo físico
///
/// AIDEV-NOTE: Proceso de eliminación:
/// 1. Obtiene la pista de la DB para conocer su ruta
/// 2. Elimina la pista de la base de datos
/// 3. Borra el archivo físico del disco
/// 4. Si falla el borrado del archivo, igual retorna OK (la pista ya no está en DB)
#[tauri::command]
pub async fn delete_track(id: String) -> Result<DeleteTrackResult, String> {
    let db = crate::db::get_connection().map_err(|e| e.to_string())?;

    // Paso 1: Obtener la pista para conocer su ruta
    let track = queries::get_track(&db.conn, &id)
        .map_err(|e| format!("Track not found: {}", e))?;
    
    let file_path = PathBuf::from(&track.path);

    // Paso 2: Eliminar de la base de datos
    queries::delete_track(&db.conn, &id)
        .map_err(|e| format!("Failed to delete from database: {}", e))?;

    log::info!("Track eliminado de la base de datos: {} ({})", track.title, id);

    // Paso 3: Borrar el archivo físico
    let file_deleted = if file_path.exists() {
        match std::fs::remove_file(&file_path) {
            Ok(_) => {
                log::info!("Archivo eliminado: {:?}", file_path);
                true
            }
            Err(e) => {
                log::warn!("No se pudo eliminar el archivo {:?}: {}", file_path, e);
                false
            }
        }
    } else {
        log::warn!("El archivo no existe: {:?}", file_path);
        false
    };

    Ok(DeleteTrackResult {
        track_id: id,
        file_deleted,
        file_path: track.path,
    })
}

/// Resultado de la eliminación de una pista
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteTrackResult {
    pub track_id: String,
    pub file_deleted: bool,
    pub file_path: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_library_state_new() {
        let _state = LibraryState::new();
        // Estado se crea correctamente si no hay panic
    }

    #[test]
    fn test_library_stats_serialization() {
        let stats = LibraryStats {
            total_tracks: 1000,
            total_artists: 150,
            total_albums: 200,
            total_duration_hours: 72.5,
            total_size_gb: 8.3,
            rating_distribution: vec![100, 200, 300, 250, 100, 50], // 0-5 stars
        };

        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("\"total_tracks\":1000"));
        assert!(json.contains("\"total_artists\":150"));
        assert!(json.contains("\"total_duration_hours\":72.5"));
        assert!(json.contains("\"rating_distribution\""));
    }

    #[test]
    fn test_delete_track_result_serialization() {
        let result = DeleteTrackResult {
            track_id: "test-uuid-123".to_string(),
            file_deleted: true,
            file_path: "/music/song.mp3".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        // AIDEV-NOTE: Verifica que se use camelCase como espera el frontend
        assert!(json.contains("\"trackId\":\"test-uuid-123\""));
        assert!(json.contains("\"fileDeleted\":true"));
        assert!(json.contains("\"filePath\":\"/music/song.mp3\""));
    }

    #[test]
    fn test_delete_track_result_file_not_deleted() {
        let result = DeleteTrackResult {
            track_id: "test-uuid-456".to_string(),
            file_deleted: false,
            file_path: "/music/missing.mp3".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"fileDeleted\":false"));
    }

    // Tests asíncronos de comandos requieren setup completo de Tauri
    // Los dejaremos para testing de integración
}
