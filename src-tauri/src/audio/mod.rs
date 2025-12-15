/// Módulo de audio para Symphony
/// 
/// AIDEV-NOTE: Arquitectura estilo Musicat - Symphonia (decode) + cpal (output) + rb (ring buffer)
/// - constants: Configuración del sistema de audio
/// - output: Salida de audio con ring buffer (cpal + rb)
/// - player: Decode thread y control de reproducción
/// - decoder: Decodificación de archivos (para análisis)
/// - waveform: Generación de waveforms
/// - beatgrid_detector: Detección de BPM y beatgrid

pub mod constants;
pub mod decoder;
pub mod output;
pub mod player;
pub mod waveform;
pub mod beatgrid_detector;
mod error;

pub use beatgrid_detector::{BeatgridDetector, BeatgridAnalysis};
pub use constants::*;
pub use decoder::{AudioDecoder, AudioMetadata, DecodedAudio};
pub use error::{AudioError, AudioResult};
pub use output::{AudioDeviceInfo, AudioOutput, CpalAudioOutput};
pub use player::{AudioPlayer, ErrorPayload, PlaybackState, PlayerControlEvent, StatePayload, TimestampPayload};
pub use waveform::{WaveformData, generate_waveform};
