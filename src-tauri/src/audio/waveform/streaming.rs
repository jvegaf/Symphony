//! API de streaming progresivo con cancelación

use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio_util::sync::CancellationToken;

use crate::audio::AudioResult;

use super::cache::{check_and_emit_cached, save_to_cache};
use super::generation::generate_and_stream_peaks;
use super::types::{WaveformCompletePayload, WaveformErrorPayload, WaveformState};

/// Genera waveform con streaming progresivo
///
/// AIDEV-NOTE: Workflow completo:
/// 1. Verificar cache en DB
/// 2. Si existe, emitir evento "complete" y retornar
/// 3. Si no, generar en background:
///    - Registrar CancellationToken
///    - Decode audio con symphonia
///    - Emitir eventos de progreso
///    - Guardar en DB al finalizar
///    - Cleanup token
pub async fn generate_waveform_streaming(
    track_id: String,
    track_path: String,
    duration: f64,
    app: AppHandle,
    state: Arc<WaveformState>,
    db: Arc<tokio::sync::Mutex<rusqlite::Connection>>,
) -> AudioResult<()> {
    log::info!("========== GENERATE_WAVEFORM_STREAMING START ==========");
    log::info!("Track ID: {}", track_id);
    log::info!("Track Path: {}", track_path);
    log::info!("Duration: {:.2}s", duration);

    // 1. Verificar cache en DB
    if check_and_emit_cached(&track_id, &db, &app).await.is_some() {
        return Ok(());
    }

    // 2. Registrar token de cancelación
    let cancel_token = CancellationToken::new();
    {
        let mut active = state.active_generations.write().await;
        active.insert(track_id.clone(), cancel_token.clone());
    }

    // 3. Generar en background
    let track_id_clone = track_id.clone();
    let app_clone = app.clone();
    let state_clone = state.clone();
    let db_clone = db.clone();

    tokio::task::spawn(async move {
        let result = generate_and_stream_peaks(
            &track_id_clone,
            &track_path,
            duration,
            &app_clone,
            &cancel_token,
        )
        .await;

        match result {
            Ok(peaks) => {
                log::info!("✅ Waveform generation SUCCESS - {} peaks", peaks.len());

                // Guardar en DB
                save_to_cache(&track_id_clone, &peaks, &db_clone).await;

                // Emitir evento final
                log::info!(
                    "📤 Emitting waveform:complete event (from generation) - {} peaks",
                    peaks.len()
                );
                let _ = app_clone.emit(
                    "waveform:complete",
                    WaveformCompletePayload {
                        track_id: track_id_clone.clone(),
                        peaks: peaks.clone(),
                    },
                );
                log::info!("✅ waveform:complete event emitted successfully");
            }
            Err(e) => {
                log::error!("❌ Waveform generation FAILED: {}", e);
                log::info!("📤 Emitting waveform:error event");
                let _ = app_clone.emit(
                    "waveform:error",
                    WaveformErrorPayload {
                        track_id: track_id_clone.clone(),
                        error: e.to_string(),
                    },
                );
            }
        }

        // Cleanup token
        let mut active = state_clone.active_generations.write().await;
        active.remove(&track_id_clone);
    });

    Ok(())
}

/// Cancela generación en progreso
pub async fn cancel_waveform_generation(track_id: &str, state: Arc<WaveformState>) -> bool {
    let mut active = state.active_generations.write().await;
    if let Some(token) = active.remove(track_id) {
        token.cancel();
        log::info!("🛑 Cancelled waveform generation for track {}", track_id);
        true
    } else {
        false
    }
}
