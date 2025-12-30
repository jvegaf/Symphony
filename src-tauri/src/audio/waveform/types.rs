//! Tipos para generación de waveform

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_util::sync::CancellationToken;

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
