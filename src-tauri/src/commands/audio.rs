use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use serde::{Serialize, Deserialize};
use tauri::State;

use crate::audio::{AudioPlayer, AudioDecoder, AudioMetadata, PlaybackState};

/// Estado global del reproductor de audio
#[derive(Clone)]
pub struct AudioPlayerState {
    player: Arc<Mutex<Option<AudioPlayer>>>,
}

impl AudioPlayerState {
    pub fn new() -> Self {
        Self {
            player: Arc::new(Mutex::new(None)),
        }
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

/// Reproduce una pista de audio
#[tauri::command]
pub async fn play_track(
    path: String,
    player_state: State<'_, AudioPlayerState>,
) -> Result<(), String> {
    let path = PathBuf::from(&path);
    
    // Obtener o crear el reproductor
    let mut player_guard = player_state.player.lock().unwrap();
    
    if player_guard.is_none() {
        let player = AudioPlayer::new().map_err(|e| e.to_string())?;
        *player_guard = Some(player);
    }
    
    let player = player_guard.as_ref().unwrap();
    player.play(&path).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Pausa la reproducción
#[tauri::command]
pub fn pause_playback(player_state: State<'_, AudioPlayerState>) -> Result<(), String> {
    let player_guard = player_state.player.lock().unwrap();
    
    if let Some(player) = player_guard.as_ref() {
        player.pause();
        Ok(())
    } else {
        Err("No hay reproductor activo".to_string())
    }
}

/// Reanuda la reproducción
#[tauri::command]
pub fn resume_playback(player_state: State<'_, AudioPlayerState>) -> Result<(), String> {
    let player_guard = player_state.player.lock().unwrap();
    
    if let Some(player) = player_guard.as_ref() {
        player.resume();
        Ok(())
    } else {
        Err("No hay reproductor activo".to_string())
    }
}

/// Detiene la reproducción
#[tauri::command]
pub fn stop_playback(player_state: State<'_, AudioPlayerState>) -> Result<(), String> {
    let player_guard = player_state.player.lock().unwrap();
    
    if let Some(player) = player_guard.as_ref() {
        player.stop();
        Ok(())
    } else {
        Err("No hay reproductor activo".to_string())
    }
}

/// Obtiene el estado actual de reproducción
#[tauri::command]
pub fn get_playback_state(
    player_state: State<'_, AudioPlayerState>,
) -> Result<PlaybackStateResponse, String> {
    let player_guard = player_state.player.lock().unwrap();
    
    if let Some(player) = player_guard.as_ref() {
        let state = player.get_state();
        let is_playing = player.is_playing();
        
        let state_str = match state {
            PlaybackState::Playing => "playing",
            PlaybackState::Paused => "paused",
            PlaybackState::Stopped => "stopped",
        }.to_string();
        
        Ok(PlaybackStateResponse {
            state: state_str,
            is_playing,
        })
    } else {
        Ok(PlaybackStateResponse {
            state: "stopped".to_string(),
            is_playing: false,
        })
    }
}

/// Decodifica metadatos de audio sin reproducir
#[tauri::command]
pub async fn decode_audio_metadata(path: String) -> Result<AudioMetadata, String> {
    let path = PathBuf::from(&path);
    AudioDecoder::decode(&path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn test_audio_player_state_creation() {
        let state = AudioPlayerState::new();
        let guard = state.player.lock().unwrap();
        assert!(guard.is_none());
    }
}
