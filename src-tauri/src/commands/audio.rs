use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::mpsc::Sender;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};

use crate::audio::{
    cancel_waveform_generation, generate_waveform_streaming, AudioDecoder, AudioDeviceInfo,
    AudioMetadata, CpalAudioOutput, PlayerControlEvent, WaveformState,
};

/// Estado global del reproductor de audio
///
/// AIDEV-NOTE: Guardamos el Sender del canal de control para enviar comandos
/// al decode thread. El player vive en su propio thread y se comunica via channel.
pub struct AudioPlayerState {
    /// Canal para enviar comandos al decode thread
    control_tx: Arc<Mutex<Option<Sender<PlayerControlEvent>>>>,
}

impl AudioPlayerState {
    pub fn new() -> Self {
        Self {
            control_tx: Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_control_tx(&self, tx: Sender<PlayerControlEvent>) {
        *self.control_tx.lock().unwrap() = Some(tx);
    }

    pub fn get_control_tx(&self) -> Option<Sender<PlayerControlEvent>> {
        self.control_tx.lock().unwrap().clone()
    }

    pub fn is_active(&self) -> bool {
        self.control_tx.lock().unwrap().is_some()
    }
}

impl Default for AudioPlayerState {
    fn default() -> Self {
        Self::new()
    }
}

/// Respuesta del estado de reproducción
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackStateResponse {
    pub state: String,
    pub is_playing: bool,
}

/// Respuesta de la posición de reproducción
/// AIDEV-NOTE: Deprecado - usar eventos `audio:timestamp` en su lugar
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackPositionResponse {
    pub current_position: f64,
    pub duration: f64,
}

// Genera datos de waveform para una pista (DEPRECATED - usar get_waveform)
// AIDEV-NOTE: Función antigua, reemplazada por sistema streaming
/*
#[tauri::command]
pub async fn generate_waveform_data(
    path: String,
    samples: Option<usize>,
) -> Result<WaveformData, String> {
    log::info!("generate_waveform_data: path={}, samples={:?}", path, samples);

    let path = PathBuf::from(&path);
    let target_samples = samples.unwrap_or(1000);

    generate_waveform(&path, target_samples)
        .map_err(|e: AudioError| e.to_string())
}
*/

/// Obtiene waveform con cache y streaming (NUEVO)
///
/// AIDEV-NOTE: Sistema estilo Musicat con:
/// - Verificación de cache en SQLite
/// - Generación streaming si no existe
/// - Eventos: waveform:progress, waveform:complete, waveform:error
#[tauri::command]
pub async fn get_waveform(
    track_id: String,
    track_path: String,
    duration: f64,
    app: AppHandle,
    waveform_state: State<'_, Arc<WaveformState>>,
    db: State<'_, Arc<tokio::sync::Mutex<rusqlite::Connection>>>,
) -> Result<(), String> {
    log::info!(
        "🎵 get_waveform: track_id={}, path={}",
        track_id,
        track_path
    );

    generate_waveform_streaming(
        track_id,
        track_path,
        duration,
        app,
        waveform_state.inner().clone(),
        db.inner().clone(),
    )
    .await
    .map_err(|e| e.to_string())
}

/// Cancela generación de waveform en progreso
#[tauri::command]
pub async fn cancel_waveform(
    track_id: String,
    waveform_state: State<'_, Arc<WaveformState>>,
) -> Result<bool, String> {
    log::info!("🛑 cancel_waveform: track_id={}", track_id);

    Ok(cancel_waveform_generation(&track_id, waveform_state.inner().clone()).await)
}

// Obtiene un waveform cacheado de la base de datos (DEPRECATED)
// AIDEV-NOTE: Reemplazado por get_waveform que maneja cache internamente
/*
#[tauri::command]
pub async fn get_cached_waveform(
    track_id: i64,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Option<WaveformData>, String> {
    log::info!("get_cached_waveform: track_id={}", track_id);

    let db = db.lock().map_err(|e| e.to_string())?;

    let result = db.conn.query_row(
        "SELECT data FROM waveforms WHERE track_id = ?1",
        [track_id],
        |row| {
            let blob: Vec<u8> = row.get(0)?;
            Ok(blob)
        },
    ).optional();

    match result {
        Ok(Some(blob)) => {
            match bincode::deserialize::<WaveformData>(&blob) {
                Ok(waveform) => {
                    log::info!("✅ Waveform loaded from cache");
                    Ok(Some(waveform))
                }
                Err(e) => {
                    log::warn!("Failed to deserialize waveform: {}", e);
                    Ok(None)
                }
            }
        }
        Ok(None) => {
            log::info!("No cached waveform found");
            Ok(None)
        }
        Err(e) => {
            log::error!("Database error: {}", e);
            Err(e.to_string())
        }
    }
}
*/

/// Genera un waveform y lo guarda en la base de datos (DEPRECATED)
/// AIDEV-NOTE: Reemplazado por get_waveform que maneja generación y cache
/*
#[tauri::command]
pub async fn generate_and_cache_waveform(
    track_id: i64,
    path: String,
    samples: Option<usize>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<WaveformData, String> {
    log::info!("generate_and_cache_waveform: track_id={}, path={}", track_id, path);

    let path_buf = PathBuf::from(&path);
    let target_samples = samples.unwrap_or(200);
    let waveform = generate_waveform(&path_buf, target_samples)
        .map_err(|e: AudioError| e.to_string())?;

    let blob = bincode::serialize(&waveform)
        .map_err(|e| format!("Failed to serialize waveform: {}", e))?;

    let db = db.lock().map_err(|e| e.to_string())?;

    let result = db.conn.execute(
        "INSERT INTO waveforms (track_id, data, resolution, date_generated)
         VALUES (?1, ?2, ?3, datetime('now'))
         ON CONFLICT(track_id) DO UPDATE SET
            data = excluded.data,
            resolution = excluded.resolution,
            date_generated = excluded.date_generated",
        rusqlite::params![track_id, &blob, target_samples as i32],
    );

    match result {
        Ok(_) => {
            log::info!("✅ Waveform saved to database");
            Ok(waveform)
        }
        Err(e) => {
            log::error!("Failed to save waveform: {}", e);
            Ok(waveform)
        }
    }
}
*/
/// Reproduce una pista de audio
///
/// AIDEV-NOTE: Crea el player y guarda el Sender del canal de control
#[tauri::command]
pub async fn play_track(
    path: String,
    app_handle: AppHandle,
    player_state: State<'_, AudioPlayerState>,
) -> Result<(), String> {
    log::info!("========== PLAY_TRACK COMMAND START ==========");
    log::info!("Path received: {}", path);

    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        log::error!("File does not exist: {:?}", path_buf);
        return Err(format!("El archivo no existe: {:?}", path_buf));
    }

    // Si ya hay un player activo, enviar comando StreamFile
    if let Some(tx) = player_state.get_control_tx() {
        log::info!("Using existing player, sending StreamFile command");
        let volume = 1.0; // TODO: obtener del settings
        tx.send(PlayerControlEvent::StreamFile {
            path: path_buf.to_string_lossy().to_string(),
            seek: None,
            volume,
        })
        .map_err(|e| format!("Error enviando comando: {}", e))?;
        return Ok(());
    }

    // Crear nuevo player
    log::info!("Creating new AudioPlayer...");
    let player = crate::audio::AudioPlayer::new(app_handle).map_err(|e| {
        log::error!("Failed to create player: {}", e);
        e.to_string()
    })?;

    // Guardar el sender
    player_state.set_control_tx(player.get_control_tx());

    // Reproducir
    log::info!("Calling player.play()...");
    player.play(&path_buf, None).map_err(|e| {
        log::error!("player.play() failed: {}", e);
        e.to_string()
    })?;

    // El player se mantiene vivo mientras su decode thread corre
    std::mem::forget(player);

    log::info!("✅ player.play() SUCCESS");
    Ok(())
}

/// Pausa la reproducción
#[tauri::command]
pub fn pause_playback(player_state: State<'_, AudioPlayerState>) -> Result<(), String> {
    if let Some(tx) = player_state.get_control_tx() {
        tx.send(PlayerControlEvent::Pause)
            .map_err(|e| format!("Error enviando comando: {}", e))
    } else {
        Err("No hay reproductor activo".to_string())
    }
}

/// Reanuda la reproducción
#[tauri::command]
pub fn resume_playback(player_state: State<'_, AudioPlayerState>) -> Result<(), String> {
    if let Some(tx) = player_state.get_control_tx() {
        tx.send(PlayerControlEvent::Resume)
            .map_err(|e| format!("Error enviando comando: {}", e))
    } else {
        Err("No hay reproductor activo".to_string())
    }
}

/// Detiene la reproducción
#[tauri::command]
pub fn stop_playback(player_state: State<'_, AudioPlayerState>) -> Result<(), String> {
    if let Some(tx) = player_state.get_control_tx() {
        tx.send(PlayerControlEvent::Stop)
            .map_err(|e| format!("Error enviando comando: {}", e))?;
        // Limpiar el control_tx
        *player_state.control_tx.lock().unwrap() = None;
        Ok(())
    } else {
        Err("No hay reproductor activo".to_string())
    }
}

/// Comando para saltar a una posición específica
#[tauri::command]
pub async fn seek_to_position(
    position: f64,
    player_state: State<'_, AudioPlayerState>,
) -> Result<(), String> {
    log::info!("seek_to_position command: {} seconds", position);

    if let Some(tx) = player_state.get_control_tx() {
        tx.send(PlayerControlEvent::Seek { position })
            .map_err(|e| format!("Error enviando comando: {}", e))?;
        log::info!("✅ Seek command sent");
        Ok(())
    } else {
        Err("No hay reproductor activo".to_string())
    }
}

/// Cambia el volumen del reproductor
#[tauri::command]
pub fn set_playback_volume(
    volume: f64,
    player_state: State<'_, AudioPlayerState>,
) -> Result<(), String> {
    if let Some(tx) = player_state.get_control_tx() {
        tx.send(PlayerControlEvent::ChangeVolume { volume })
            .map_err(|e| format!("Error enviando comando: {}", e))
    } else {
        Err("No hay reproductor activo".to_string())
    }
}

/// Cambia el dispositivo de audio
#[tauri::command]
pub fn set_audio_device(
    device_name: Option<String>,
    player_state: State<'_, AudioPlayerState>,
) -> Result<(), String> {
    if let Some(tx) = player_state.get_control_tx() {
        tx.send(PlayerControlEvent::ChangeAudioDevice { device_name })
            .map_err(|e| format!("Error enviando comando: {}", e))
    } else {
        Err("No hay reproductor activo".to_string())
    }
}

/// Obtiene el estado actual de reproducción
/// AIDEV-NOTE: Deprecado - usar eventos `audio:state` en su lugar
#[tauri::command]
pub fn get_playback_state(
    player_state: State<'_, AudioPlayerState>,
) -> Result<PlaybackStateResponse, String> {
    let is_active = player_state.is_active();

    Ok(PlaybackStateResponse {
        state: if is_active { "playing" } else { "stopped" }.to_string(),
        is_playing: is_active,
    })
}

/// Obtiene la posición actual de reproducción
/// AIDEV-NOTE: Deprecado - usar eventos `audio:timestamp` en su lugar
#[tauri::command]
pub fn get_playback_position(
    _player_state: State<'_, AudioPlayerState>,
) -> Result<PlaybackPositionResponse, String> {
    // No podemos obtener la posición sin referencia al player
    // Usar eventos en su lugar
    Ok(PlaybackPositionResponse {
        current_position: 0.0,
        duration: 0.0,
    })
}

/// Lista los dispositivos de audio disponibles
#[tauri::command]
pub async fn get_audio_devices() -> Result<Vec<AudioDeviceInfo>, String> {
    CpalAudioOutput::list_devices().map_err(|e| e.to_string())
}

/// Decodifica metadatos de audio sin reproducir
#[tauri::command]
pub async fn decode_audio_metadata(path: String) -> Result<AudioMetadata, String> {
    let path = PathBuf::from(&path);
    AudioDecoder::decode(&path).map_err(|e| e.to_string())
}

/// Respuesta con datos de audio para blob URL
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioBlobResponse {
    pub data: Vec<u8>,
    pub mime_type: String,
}

/// Permite un archivo al asset protocol scope en runtime
#[tauri::command]
pub async fn allow_asset_file(app_handle: AppHandle, path: String) -> Result<(), String> {
    log::info!("allow_asset_file: {}", path);

    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err(format!("El archivo no existe: {}", path));
    }

    let asset_scope = app_handle.asset_protocol_scope();
    asset_scope
        .allow_file(&path_buf)
        .map_err(|e| format!("Error añadiendo archivo al asset scope: {}", e))?;

    log::info!("✅ Archivo añadido al asset protocol scope: {}", path);
    Ok(())
}

/// Permite un directorio completo al asset protocol scope
#[tauri::command]
pub async fn allow_asset_directory(
    app_handle: AppHandle,
    path: String,
    recursive: bool,
) -> Result<(), String> {
    log::info!("allow_asset_directory: {}, recursive: {}", path, recursive);

    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() || !path_buf.is_dir() {
        return Err(format!("El directorio no existe: {}", path));
    }

    let asset_scope = app_handle.asset_protocol_scope();
    asset_scope
        .allow_directory(&path_buf, recursive)
        .map_err(|e| format!("Error añadiendo directorio al asset scope: {}", e))?;

    log::info!("✅ Directorio añadido al asset protocol scope: {}", path);
    Ok(())
}

/// Lee un archivo de audio y devuelve sus bytes para crear un blob URL
#[tauri::command]
pub async fn read_audio_file(path: String) -> Result<AudioBlobResponse, String> {
    log::info!("read_audio_file: {}", path);

    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err(format!("El archivo no existe: {}", path));
    }

    let mime_type = match path_buf.extension().and_then(|e| e.to_str()) {
        Some("mp3") => "audio/mpeg",
        Some("flac") => "audio/flac",
        Some("wav") => "audio/wav",
        Some("ogg") => "audio/ogg",
        Some("m4a") | Some("aac") => "audio/mp4",
        Some("opus") => "audio/opus",
        _ => "audio/mpeg",
    }
    .to_string();

    let data = fs::read(&path_buf).map_err(|e| format!("Error leyendo archivo: {}", e))?;

    log::info!(
        "✅ Audio file read: {} bytes, mime: {}",
        data.len(),
        mime_type
    );

    Ok(AudioBlobResponse { data, mime_type })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    #[test]
    fn test_playback_state_response_serialization() {
        let response = PlaybackStateResponse {
            state: "playing".to_string(),
            is_playing: true,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("playing"));
        assert!(json.contains("true"));
    }

    #[tokio::test]
    async fn test_decode_audio_metadata_invalid_path() {
        let result = decode_audio_metadata("/nonexistent/file.mp3".to_string()).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_playback_position_response() {
        let response = PlaybackPositionResponse {
            current_position: 10.5,
            duration: 180.0,
        };

        assert_eq!(response.current_position, 10.5);
        assert_eq!(response.duration, 180.0);
    }

    #[test]
    fn test_audio_blob_response() {
        let response = AudioBlobResponse {
            data: vec![1, 2, 3, 4],
            mime_type: "audio/mpeg".to_string(),
        };

        assert_eq!(response.data.len(), 4);
        assert_eq!(response.mime_type, "audio/mpeg");
    }

    #[test]
    fn test_audio_player_state() {
        let state = AudioPlayerState::new();
        assert!(!state.is_active());

        let (tx, _rx) = mpsc::channel();
        state.set_control_tx(tx);
        assert!(state.is_active());
    }
}
