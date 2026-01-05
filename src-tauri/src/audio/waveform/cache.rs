//! Operaciones de cache de waveform
//!
//! AIDEV-NOTE: Migrado a DbPool + spawn_blocking para evitar bloquear el runtime de Tokio.

use tauri::{AppHandle, Emitter};

use super::types::WaveformCompletePayload;
use crate::db::{queries, DbPool};

/// Verifica si existe waveform en cache y la emite si existe
pub async fn check_and_emit_cached(
    track_id: &str,
    pool: &DbPool,
    app: &AppHandle,
) -> Option<Vec<f32>> {
    log::info!("🔍 Checking waveform cache for track {}...", track_id);

    let pool_clone = pool.clone();
    let track_id_owned = track_id.to_string();

    // Ejecutar en thread de bloqueo para no bloquear el runtime de Tokio
    let result = tokio::task::spawn_blocking(move || {
        let conn = pool_clone.get().ok()?;
        queries::get_waveform(&conn, &track_id_owned).ok().flatten()
    })
    .await
    .ok()
    .flatten();

    if let Some(waveform) = result {
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
pub async fn save_to_cache(track_id: &str, peaks: &[f32], pool: &DbPool) {
    let data_json = serde_json::to_string(peaks).unwrap_or_default();
    let pool_clone = pool.clone();
    let track_id_owned = track_id.to_string();

    // Ejecutar en thread de bloqueo
    let _ = tokio::task::spawn_blocking(move || {
        if let Ok(conn) = pool_clone.get() {
            let _ = queries::save_waveform(&conn, &track_id_owned, &data_json);
            log::info!("💾 Waveform saved to database");
        }
    })
    .await;
}
