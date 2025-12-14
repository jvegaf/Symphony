/// Módulo de audio para Symphony
/// 
/// Gestiona decodificación, reproducción y generación de waveforms
/// usando Symphonia (decoder) y Rodio (playback).

pub mod decoder;
pub mod player;
pub mod waveform;
pub mod beatgrid_detector;
mod error;

pub use decoder::{AudioDecoder, AudioMetadata, DecodedAudio};
pub use player::{AudioPlayer, PlaybackState};
pub use beatgrid_detector::{BeatgridDetector, BeatgridAnalysis};
pub use error::{AudioError, AudioResult};
