/// Módulo de audio para Symphony
/// 
/// AIDEV-NOTE: Arquitectura estilo Musicat - Symphonia (decode) + cpal (output) + rb (ring buffer)
/// - constants: Configuración del sistema de audio
/// - output: Salida de audio con ring buffer (cpal + rb)
/// - player: Decode thread y control de reproducción
/// - decoder: Decodificación de archivos (para análisis)
/// - waveform: Generación de waveforms
/// - beatgrid_detector: Detección de BPM y beatgrid
/// - dsp: Procesamiento de señales digitales (DSP)
/// - resampler: Conversión de sample rate (rubato)

pub mod constants;
pub mod decoder;
pub mod dsp;
pub mod output;
pub mod player;
pub mod resampler;
pub mod waveform;
pub mod beatgrid_detector;
mod error;

pub use beatgrid_detector::{BeatgridDetector, BeatgridAnalysis};
pub use constants::*;
pub use decoder::{AudioDecoder, AudioMetadata, DecodedAudio};
pub use dsp::{PeakMethod, calculate_peak_value, normalize_peaks};
pub use error::{AudioError, AudioResult};
pub use output::{AudioDeviceInfo, AudioOutput, CpalAudioOutput};
pub use player::{AudioPlayer, ErrorPayload, PlaybackState, PlayerControlEvent, StatePayload, TimestampPayload};
pub use resampler::AudioResampler;
pub use waveform::{
    WaveformData, 
    WaveformState, 
    WaveformProgressPayload, 
    WaveformCompletePayload, 
    WaveformErrorPayload,
    generate_waveform_streaming,
    cancel_waveform_generation,
};

