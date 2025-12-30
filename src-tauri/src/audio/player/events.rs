//! Emisión de eventos Tauri al frontend

use tauri::Emitter;

use super::types::{ErrorPayload, PlaybackState, StatePayload, TimestampPayload};

/// Emite evento de timestamp al frontend
pub fn emit_timestamp<R: tauri::Runtime>(
    app_handle: &tauri::AppHandle<R>,
    position: f64,
    duration: f64,
) {
    let _ = app_handle.emit("audio:timestamp", TimestampPayload { position, duration });
}

/// Emite evento de estado al frontend
pub fn emit_state<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>, is_playing: bool) {
    let state = if is_playing {
        PlaybackState::Playing
    } else {
        PlaybackState::Stopped
    };
    let _ = app_handle.emit("audio:state", StatePayload { is_playing, state });
}

/// Emite evento de fin de track
pub fn emit_end_of_track<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) {
    let _ = app_handle.emit("audio:end_of_track", ());
}

/// Emite evento de error
pub fn emit_error<R: tauri::Runtime>(
    app_handle: &tauri::AppHandle<R>,
    message: &str,
    is_critical: bool,
) {
    let _ = app_handle.emit(
        "audio:error",
        ErrorPayload {
            message: message.to_string(),
            is_critical,
        },
    );
}
