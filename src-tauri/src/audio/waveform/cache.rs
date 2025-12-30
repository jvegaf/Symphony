//! Operaciones de cache de waveform

use rusqlite::Connection;
use tauri::{AppHandle, Emitter};

use super::types::WaveformCompletePayload;
use crate::db::queries;

/// Verifica si existe waveform en cache y la emite si existe
pub async fn check_and_emit_cached(
    track_id: &str,
    db: &tokio::sync::Mutex<Connection>,
    app: &AppHandle,
) -> Option<Vec<f32>> {
    log::info!("🔍 Checking waveform cache for track {}...", track_id);

    let conn = db.lock().await;
    if let Ok(Some(waveform)) = queries::get_waveform(&conn, track_id) {
        log::info!("✅ Waveform cache HIT for track {}", track_id);

        // Deserializar peaks (almacenados como JSON String en DB)
        let data_str = String::from_utf8_lossy(&waveform.data);
        let peaks: Vec<f32> = serde_json::from_str(&data_str).unwrap_or_default();

        log::info!(
            "📤 Emitting waveform:complete event (from cache) - {} peaks",
            peaks.len()
        );

        app.emit(
            "waveform:complete",
            WaveformCompletePayload {
                track_id: track_id.to_string(),
                peaks: peaks.clone(),
            },
        )
        .ok();

        log::info!("✅ waveform:complete event emitted successfully");

        return Some(peaks);
    }

    log::info!("🎵 Waveform cache MISS - generating for track {}", track_id);
    None
}

/// Guarda waveform generado en cache
pub async fn save_to_cache(
    track_id: &str,
    peaks: &[f32],
    db: &tokio::sync::Mutex<Connection>,
) {
    let data_json = serde_json::to_string(peaks).unwrap_or_default();
    let conn = db.lock().await;
    let _ = queries::save_waveform(&conn, track_id, &data_json);
    log::info!("💾 Waveform saved to database");
}
