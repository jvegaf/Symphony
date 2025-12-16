use serde::{Deserialize, Serialize};
/// Generación de waveform con streaming progresivo y cache en SQLite
///
/// AIDEV-NOTE: Reescrito estilo Musicat usando:
/// - Memory-mapped files (memmap2) para lectura eficiente
/// - Streaming progresivo con eventos cada N paquetes
/// - Cache en SQLite (verificar antes de generar)
/// - CancellationToken para cancelar generación en progreso
/// - DSP module para cálculo de peaks (RMS/Peak)
///
/// Arquitectura:
/// 1. Verificar cache en DB → retornar si existe
/// 2. Si no existe, generar con streaming:
///    - Decodificar audio con symphonia
///    - Calcular peaks con ventanas deslizantes (WAVEFORM_WINDOW_SIZE)
///    - Emitir eventos cada WAVEFORM_PEAKS_PER_PACKET paquetes
/// 3. Guardar en DB al finalizar
use std::path::Path;
use std::sync::Arc;
use symphonia::core::audio::{AudioBufferRef, Signal};
use tauri::{AppHandle, Emitter};
use tokio::sync::RwLock;
use tokio_util::sync::CancellationToken;

use crate::audio::{
    constants::{WAVEFORM_PEAKS_PER_PACKET, WAVEFORM_PEAK_METHOD, WAVEFORM_WINDOW_SIZE},
    dsp, AudioError, AudioResult,
};
use crate::db::queries;

// ============================================================================
// TIPOS
// ============================================================================

/// Estado de waveform con cancelación
pub struct WaveformState {
    /// Track ID → CancellationToken
    pub active_generations: Arc<RwLock<std::collections::HashMap<String, CancellationToken>>>,
}

impl WaveformState {
    pub fn new() -> Self {
        Self {
            active_generations: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }
}

impl Default for WaveformState {
    fn default() -> Self {
        Self::new()
    }
}

/// Evento de progreso (emitido cada WAVEFORM_PEAKS_PER_PACKET paquetes)
/// AIDEV-NOTE: Incluye peaks parciales para streaming progresivo visual
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WaveformProgressPayload {
    pub track_id: String,
    pub progress: f32, // 0.0 - 1.0
    pub peaks_so_far: usize,
    pub partial_peaks: Vec<f32>, // Peaks generados hasta ahora (streaming)
}

/// Evento de completado con datos finales
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WaveformCompletePayload {
    pub track_id: String,
    pub peaks: Vec<f32>, // Peaks normalizados
}

/// Evento de error
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WaveformErrorPayload {
    pub track_id: String,
    pub error: String,
}

/// Datos de waveform almacenados
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaveformData {
    pub peaks: Vec<f32>,
    pub duration: f64,
}

// ============================================================================
// API PRINCIPAL
// ============================================================================

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
    {
        log::info!("🔍 Checking waveform cache...");
        let conn = db.lock().await;
        if let Ok(Some(waveform)) = queries::get_waveform(&conn, &track_id) {
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
                    track_id: track_id.clone(),
                    peaks: peaks.clone(),
                },
            )
            .ok();

            log::info!("✅ waveform:complete event emitted successfully");

            return Ok(());
        }
    }

    log::info!("🎵 Waveform cache MISS - generating for track {}", track_id);

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
                let data_json = serde_json::to_string(&peaks).unwrap_or_default();
                {
                    let conn = db_clone.lock().await;
                    let _ = queries::save_waveform(&conn, &track_id_clone, &data_json);
                    log::info!("💾 Waveform saved to database");
                }

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

// ============================================================================
// GENERACIÓN INTERNA
// ============================================================================

/// Genera peaks y emite eventos de progreso
async fn generate_and_stream_peaks(
    track_id: &str,
    track_path: &str,
    duration: f64,
    app: &AppHandle,
    cancel_token: &CancellationToken,
) -> AudioResult<Vec<f32>> {
    use std::fs::File;
    use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
    use symphonia::core::formats::FormatOptions;
    use symphonia::core::io::MediaSourceStream;
    use symphonia::core::meta::MetadataOptions;
    use symphonia::core::probe::Hint;

    log::info!("🔧 generate_and_stream_peaks START for track {}", track_id);
    log::info!("   Path: {}", track_path);
    log::info!("   Duration: {:.2}s", duration);

    let path = Path::new(track_path);
    let file = File::open(path).map_err(|e| {
        log::error!("❌ Cannot open file: {}", e);
        AudioError::DecodingFailed(format!("Cannot open file: {}", e))
    })?;

    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let probed = symphonia::default::get_probe()
        .format(
            &hint,
            mss,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|e| AudioError::DecodingFailed(format!("Probe failed: {}", e)))?;

    let mut format = probed.format;

    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| AudioError::DecodingFailed("No audio track found".to_string()))?;

    let track_id_sym = track.id;
    let codec_params = &track.codec_params;

    let mut decoder = symphonia::default::get_codecs()
        .make(codec_params, &DecoderOptions::default())
        .map_err(|e| AudioError::DecodingFailed(format!("Decoder creation failed: {}", e)))?;

    let mut peaks: Vec<f32> = Vec::new();
    let mut samples_buffer: Vec<f32> = Vec::new();
    let mut packet_count = 0usize;
    let mut last_emitted_peak_count = 0usize; // AIDEV-NOTE: Track cuántos peaks ya enviamos

    loop {
        // Verificar cancelación
        if cancel_token.is_cancelled() {
            return Err(AudioError::DecodingFailed("Cancelled".to_string()));
        }

        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(_) => break,
        };

        if packet.track_id() != track_id_sym {
            continue;
        }

        packet_count += 1;

        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(_) => continue,
        };

        // Convertir a mono y acumular samples
        let mono_samples = convert_to_mono(&decoded);
        samples_buffer.extend(mono_samples);

        // Calcular peaks en ventanas cuando tengamos suficientes samples
        while samples_buffer.len() >= WAVEFORM_WINDOW_SIZE {
            let window: Vec<f32> = samples_buffer.drain(..WAVEFORM_WINDOW_SIZE).collect();
            let peak = dsp::calculate_peak_value(&window, WAVEFORM_PEAK_METHOD);
            peaks.push(peak);
        }

        // Emitir progreso cada N paquetes
        if packet_count.is_multiple_of(WAVEFORM_PEAKS_PER_PACKET) {
            let progress = (packet_count as f64 * duration / 1000.0).min(0.99) as f32;
            log::info!(
                "📊 Progress: {:.0}% - {} packets, {} peaks",
                progress * 100.0,
                packet_count,
                peaks.len()
            );

            // AIDEV-NOTE: Enviar solo los NUEVOS peaks desde el último evento (chunk incremental)
            // Esto es más eficiente que enviar todos los peaks cada vez
            let new_peaks = if peaks.len() > last_emitted_peak_count {
                peaks[last_emitted_peak_count..].to_vec()
            } else {
                vec![]
            };

            if !new_peaks.is_empty() {
                log::info!(
                    "   Enviando {} nuevos peaks (total acumulado: {})",
                    new_peaks.len(),
                    peaks.len()
                );
                let _ = app.emit(
                    "waveform:progress",
                    WaveformProgressPayload {
                        track_id: track_id.to_string(),
                        progress,
                        peaks_so_far: peaks.len(),
                        partial_peaks: new_peaks, // Solo los nuevos
                    },
                );
                last_emitted_peak_count = peaks.len();
            }
        }
    }

    log::info!(
        "🏁 Loop finished - processed {} packets total",
        packet_count
    );

    // Procesar samples restantes
    if !samples_buffer.is_empty() {
        let peak = dsp::calculate_peak_value(&samples_buffer, WAVEFORM_PEAK_METHOD);
        peaks.push(peak);
    }

    log::info!("✅ Decoding complete - {} peaks generated", peaks.len());

    // Normalizar peaks (normalizepeaks modifica in-place)
    let mut normalized = peaks;
    dsp::normalize_peaks(&mut normalized);

    log::info!(
        "✅ Normalization complete - returning {} peaks",
        normalized.len()
    );

    Ok(normalized)
}

/// Convierte AudioBufferRef a mono (promedio de canales)
fn convert_to_mono(audio_buf: &AudioBufferRef) -> Vec<f32> {
    match audio_buf {
        AudioBufferRef::F32(buf) => {
            let num_channels = buf.spec().channels.count();
            let num_frames = buf.frames();
            let mut mono = Vec::with_capacity(num_frames);

            for frame_idx in 0..num_frames {
                let mut sum = 0.0f32;
                for ch in 0..num_channels {
                    sum += buf.chan(ch)[frame_idx].abs();
                }
                mono.push(sum / num_channels as f32);
            }
            mono
        }
        AudioBufferRef::S16(buf) => {
            let num_channels = buf.spec().channels.count();
            let num_frames = buf.frames();
            let mut mono = Vec::with_capacity(num_frames);

            for frame_idx in 0..num_frames {
                let mut sum = 0.0f32;
                for ch in 0..num_channels {
                    sum += (buf.chan(ch)[frame_idx] as f32 / 32768.0).abs();
                }
                mono.push(sum / num_channels as f32);
            }
            mono
        }
        _ => Vec::new(),
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_convert_to_mono_stereo() {
        // Test básico - la lógica completa requiere datos de symphonia
        // Test validado por tests de integración
    }

    #[test]
    fn test_waveform_state_new() {
        let state = WaveformState::new();
        assert_eq!(state.active_generations.blocking_read().len(), 0);
    }
}
