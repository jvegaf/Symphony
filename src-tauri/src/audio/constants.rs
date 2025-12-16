//! Constantes de configuración para el sistema de audio
//!
//! AIDEV-NOTE: Estas constantes controlan el comportamiento del ring buffer
//! y la frecuencia de emisión de eventos. Valores probados con Musicat.

/// Tamaño del buffer de audio para cpal (en frames)
/// Valor bajo = menor latencia, mayor uso de CPU
/// Valor alto = mayor latencia, menor uso de CPU
pub const BUFFER_SIZE: usize = 2048;

/// Tamaño del ring buffer SPSC (en frames estéreo f32)
/// Debe ser suficientemente grande para absorber variaciones de decode
/// pero no tanto que cause delay perceptible
pub const RING_BUFFER_SIZE: usize = 16384;

/// Intervalo de emisión de timestamps al frontend (en ms)
/// ~200ms es un buen balance entre precisión y overhead
pub const TIMESTAMP_INTERVAL_MS: u64 = 200;

/// Sample rate por defecto cuando no se puede determinar
pub const DEFAULT_SAMPLE_RATE: u32 = 44100;

/// Número de canales por defecto (estéreo)
pub const DEFAULT_CHANNELS: u16 = 2;

/// Volumen por defecto (0.0 - 1.0)
pub const DEFAULT_VOLUME: f64 = 1.0;

/// Valor de pausa para atomic-wait
/// AIDEV-NOTE: Usamos estos valores con atomic-wait para pause/resume eficiente
pub const PAUSE_VALUE: u32 = 1;
pub const PLAY_VALUE: u32 = 0;

// ============================================================================
// Constantes de Waveform
// ============================================================================

/// Tamaño de ventana para calcular peaks de waveform (en samples)
/// AIDEV-NOTE: Valor de Musicat - 8192 samples por peak
pub const WAVEFORM_WINDOW_SIZE: usize = 8192;

/// Número de peaks por paquete de streaming
/// ~100 paquetes para mostrar progreso incremental
pub const WAVEFORM_PEAKS_PER_PACKET: usize = 100;

/// Método de cálculo de peaks por defecto
/// AIDEV-NOTE: RMS es más perceptualmente relevante que peak simple
pub use crate::audio::dsp::PeakMethod;
pub const WAVEFORM_PEAK_METHOD: PeakMethod = PeakMethod::Rms;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_buffer_size_is_power_of_2() {
        assert!(BUFFER_SIZE.is_power_of_two());
    }

    #[test]
    fn test_ring_buffer_size_is_power_of_2() {
        assert!(RING_BUFFER_SIZE.is_power_of_two());
    }

    #[test]
    fn test_buffer_sizes_are_reasonable() {
        assert!(BUFFER_SIZE >= 256 && BUFFER_SIZE <= 8192);
        assert!(RING_BUFFER_SIZE >= 4096 && RING_BUFFER_SIZE <= 65536);
    }

    #[test]
    fn test_ring_buffer_larger_than_buffer() {
        assert!(RING_BUFFER_SIZE > BUFFER_SIZE);
    }

    #[test]
    fn test_timestamp_interval_reasonable() {
        assert!(TIMESTAMP_INTERVAL_MS >= 50 && TIMESTAMP_INTERVAL_MS <= 1000);
    }

    #[test]
    fn test_default_sample_rate() {
        assert_eq!(DEFAULT_SAMPLE_RATE, 44100);
    }

    #[test]
    fn test_default_channels() {
        assert_eq!(DEFAULT_CHANNELS, 2);
    }

    #[test]
    fn test_default_volume() {
        assert!(DEFAULT_VOLUME >= 0.0 && DEFAULT_VOLUME <= 1.0);
    }

    #[test]
    fn test_pause_play_values_different() {
        assert_ne!(PAUSE_VALUE, PLAY_VALUE);
    }

    #[test]
    fn test_pause_play_values() {
        assert_eq!(PAUSE_VALUE, 1);
        assert_eq!(PLAY_VALUE, 0);
    }
}
