//! Reproductor de audio con arquitectura de decode thread + ring buffer
//!
//! AIDEV-NOTE: Esta implementación está basada en Musicat (basharovV/musicat).
//! Arquitectura:
//! - Thread de decodificación separado usando Symphonia
//! - Ring buffer SPSC para desacoplar decode de playback
//! - cpal para salida de audio directa
//! - atomic-wait para pause/resume eficiente
//! - Eventos push al frontend via Tauri

use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{self, Sender};
use std::sync::Arc;
use std::thread::{self, JoinHandle};

use crate::audio::constants::DEFAULT_VOLUME;
use crate::audio::error::AudioResult;

use super::decode_loop::decode_loop;
use super::types::PlayerControlEvent;

/// Reproductor de audio principal
///
/// AIDEV-NOTE: El player mantiene un thread de decodificación que recibe
/// comandos via channel. El estado se comunica al frontend via eventos Tauri.
pub struct AudioPlayer<R: tauri::Runtime> {
    /// Canal para enviar comandos al decode thread
    control_tx: Sender<PlayerControlEvent>,
    /// Handle al decode thread
    _decode_thread: JoinHandle<()>,
    /// Estado de reproducción actual
    state: Arc<AtomicBool>, // true = playing
    /// Posición actual en segundos (como bits de f64)
    position: Arc<AtomicU64>,
    /// Duración total en segundos (como bits de f64)
    duration: Arc<AtomicU64>,
    /// Volumen actual
    volume: Arc<AtomicU64>,
    /// Phantom para el runtime
    _phantom: std::marker::PhantomData<R>,
}

impl<R: tauri::Runtime> AudioPlayer<R> {
    /// Crea un nuevo reproductor de audio
    ///
    /// # Arguments
    /// * `app_handle` - Handle de Tauri para emitir eventos
    pub fn new(app_handle: tauri::AppHandle<R>) -> AudioResult<Self> {
        let (control_tx, control_rx) = mpsc::channel();

        // Estado compartido
        let state = Arc::new(AtomicBool::new(false));
        let position = Arc::new(AtomicU64::new(0.0f64.to_bits()));
        let duration = Arc::new(AtomicU64::new(0.0f64.to_bits()));
        let volume = Arc::new(AtomicU64::new(DEFAULT_VOLUME.to_bits()));

        let state_clone = Arc::clone(&state);
        let position_clone = Arc::clone(&position);
        let duration_clone = Arc::clone(&duration);
        let volume_clone = Arc::clone(&volume);

        // Spawn decode thread
        let decode_thread = thread::spawn(move || {
            decode_loop(
                control_rx,
                app_handle,
                state_clone,
                position_clone,
                duration_clone,
                volume_clone,
            );
        });

        Ok(Self {
            control_tx,
            _decode_thread: decode_thread,
            state,
            position,
            duration,
            volume,
            _phantom: std::marker::PhantomData,
        })
    }

    /// Obtiene una copia del Sender del canal de control
    ///
    /// AIDEV-NOTE: Esto permite que commands/audio.rs guarde el Sender
    /// y envíe comandos al decode thread
    pub fn get_control_tx(&self) -> Sender<PlayerControlEvent> {
        self.control_tx.clone()
    }

    /// Reproduce un archivo de audio
    pub fn play(&self, path: &Path, seek: Option<f64>) -> AudioResult<()> {
        let volume = f64::from_bits(self.volume.load(Ordering::SeqCst));
        self.control_tx
            .send(PlayerControlEvent::StreamFile {
                path: path.to_string_lossy().to_string(),
                seek,
                volume,
            })
            .map_err(|e| {
                crate::audio::error::AudioError::PlaybackFailed(format!(
                    "Error enviando comando: {}",
                    e
                ))
            })
    }

    /// Pausa la reproducción
    pub fn pause(&self) -> AudioResult<()> {
        self.control_tx
            .send(PlayerControlEvent::Pause)
            .map_err(|e| {
                crate::audio::error::AudioError::PlaybackFailed(format!(
                    "Error enviando comando: {}",
                    e
                ))
            })
    }

    /// Reanuda la reproducción
    pub fn resume(&self) -> AudioResult<()> {
        self.control_tx
            .send(PlayerControlEvent::Resume)
            .map_err(|e| {
                crate::audio::error::AudioError::PlaybackFailed(format!(
                    "Error enviando comando: {}",
                    e
                ))
            })
    }

    /// Detiene la reproducción
    pub fn stop(&self) -> AudioResult<()> {
        self.control_tx
            .send(PlayerControlEvent::Stop)
            .map_err(|e| {
                crate::audio::error::AudioError::PlaybackFailed(format!(
                    "Error enviando comando: {}",
                    e
                ))
            })
    }

    /// Salta a una posición específica
    pub fn seek(&self, position: f64) -> AudioResult<()> {
        self.control_tx
            .send(PlayerControlEvent::Seek { position })
            .map_err(|e| {
                crate::audio::error::AudioError::PlaybackFailed(format!(
                    "Error enviando comando: {}",
                    e
                ))
            })
    }

    /// Cambia el volumen
    pub fn set_volume(&self, volume: f64) -> AudioResult<()> {
        let clamped = volume.clamp(0.0, 1.0);
        self.volume.store(clamped.to_bits(), Ordering::SeqCst);
        self.control_tx
            .send(PlayerControlEvent::ChangeVolume { volume: clamped })
            .map_err(|e| {
                crate::audio::error::AudioError::PlaybackFailed(format!(
                    "Error enviando comando: {}",
                    e
                ))
            })
    }

    /// Cambia el dispositivo de audio
    pub fn set_audio_device(&self, device_name: Option<String>) -> AudioResult<()> {
        self.control_tx
            .send(PlayerControlEvent::ChangeAudioDevice { device_name })
            .map_err(|e| {
                crate::audio::error::AudioError::PlaybackFailed(format!(
                    "Error enviando comando: {}",
                    e
                ))
            })
    }

    /// Obtiene el estado actual
    pub fn is_playing(&self) -> bool {
        self.state.load(Ordering::SeqCst)
    }

    /// Obtiene la posición actual en segundos
    pub fn get_position(&self) -> f64 {
        f64::from_bits(self.position.load(Ordering::SeqCst))
    }

    /// Obtiene la duración total en segundos
    pub fn get_duration(&self) -> f64 {
        f64::from_bits(self.duration.load(Ordering::SeqCst))
    }

    /// Obtiene el volumen actual
    pub fn get_volume(&self) -> f64 {
        f64::from_bits(self.volume.load(Ordering::SeqCst))
    }
}
