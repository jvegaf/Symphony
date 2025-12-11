/// Módulo de audio para Symphony
/// 
/// Gestiona decodificación, reproducción y generación de waveforms
/// usando Symphonia (decoder) y Rodio (playback).

pub mod decoder;
pub mod player;
pub mod waveform;
mod error;

pub use decoder::{AudioDecoder, AudioMetadata};
pub use player::{AudioPlayer, PlaybackState};
pub use waveform::{WaveformGenerator, WaveformData};
pub use error::{AudioError, AudioResult};
