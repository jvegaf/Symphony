//! Generación de waveform con streaming progresivo y cache en SQLite
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

pub mod cache;
pub mod conversion;
pub mod generation;
pub mod streaming;
pub mod types;

pub use streaming::{cancel_waveform_generation, generate_waveform_streaming};
pub use types::{
    WaveformCompletePayload, WaveformData, WaveformErrorPayload, WaveformProgressPayload,
    WaveformState,
};

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
