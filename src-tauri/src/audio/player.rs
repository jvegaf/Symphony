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
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use rb::RbProducer;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::{FormatOptions, SeekMode, SeekTo};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;
use tauri::Emitter;

use super::constants::{DEFAULT_VOLUME, TIMESTAMP_INTERVAL_MS};
use super::error::{AudioError, AudioResult};
use super::output::{AudioOutput, CpalAudioOutput};

/// Estado de reproducción
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
pub enum PlaybackState {
    Playing,
    Paused,
    Stopped,
}

/// Evento de control enviado al decode thread
#[derive(Debug)]
pub enum PlayerControlEvent {
    /// Cargar y reproducir un archivo
    StreamFile {
        path: String,
        seek: Option<f64>,
        volume: f64,
    },
    /// Saltar a una posición (en segundos)
    Seek { position: f64 },
    /// Cambiar volumen (0.0 - 1.0)
    ChangeVolume { volume: f64 },
    /// Pausar reproducción
    Pause,
    /// Reanudar reproducción
    Resume,
    /// Detener y liberar recursos
    Stop,
    /// Cambiar dispositivo de audio
    ChangeAudioDevice { device_name: Option<String> },
}

/// Payload para evento de timestamp
#[derive(Clone, serde::Serialize)]
pub struct TimestampPayload {
    pub position: f64,
    pub duration: f64,
}

/// Payload para evento de estado
#[derive(Clone, serde::Serialize)]
pub struct StatePayload {
    pub is_playing: bool,
    pub state: PlaybackState,
}

/// Payload para evento de error
#[derive(Clone, serde::Serialize)]
pub struct ErrorPayload {
    pub message: String,
    pub is_critical: bool,
}

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
            .map_err(|e| AudioError::PlaybackFailed(format!("Error enviando comando: {}", e)))
    }
    
    /// Pausa la reproducción
    pub fn pause(&self) -> AudioResult<()> {
        self.control_tx
            .send(PlayerControlEvent::Pause)
            .map_err(|e| AudioError::PlaybackFailed(format!("Error enviando comando: {}", e)))
    }
    
    /// Reanuda la reproducción
    pub fn resume(&self) -> AudioResult<()> {
        self.control_tx
            .send(PlayerControlEvent::Resume)
            .map_err(|e| AudioError::PlaybackFailed(format!("Error enviando comando: {}", e)))
    }
    
    /// Detiene la reproducción
    pub fn stop(&self) -> AudioResult<()> {
        self.control_tx
            .send(PlayerControlEvent::Stop)
            .map_err(|e| AudioError::PlaybackFailed(format!("Error enviando comando: {}", e)))
    }
    
    /// Salta a una posición específica
    pub fn seek(&self, position: f64) -> AudioResult<()> {
        self.control_tx
            .send(PlayerControlEvent::Seek { position })
            .map_err(|e| AudioError::PlaybackFailed(format!("Error enviando comando: {}", e)))
    }
    
    /// Cambia el volumen
    pub fn set_volume(&self, volume: f64) -> AudioResult<()> {
        let clamped = volume.clamp(0.0, 1.0);
        self.volume.store(clamped.to_bits(), Ordering::SeqCst);
        self.control_tx
            .send(PlayerControlEvent::ChangeVolume { volume: clamped })
            .map_err(|e| AudioError::PlaybackFailed(format!("Error enviando comando: {}", e)))
    }
    
    /// Cambia el dispositivo de audio
    pub fn set_audio_device(&self, device_name: Option<String>) -> AudioResult<()> {
        self.control_tx
            .send(PlayerControlEvent::ChangeAudioDevice { device_name })
            .map_err(|e| AudioError::PlaybackFailed(format!("Error enviando comando: {}", e)))
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

/// Loop principal de decodificación
/// 
/// AIDEV-NOTE: Este loop corre en su propio thread y procesa comandos del player.
/// Decodifica audio con Symphonia y lo escribe al ring buffer de cpal.
fn decode_loop<R: tauri::Runtime>(
    control_rx: Receiver<PlayerControlEvent>,
    app_handle: tauri::AppHandle<R>,
    state: Arc<AtomicBool>,
    position: Arc<AtomicU64>,
    duration: Arc<AtomicU64>,
    volume: Arc<AtomicU64>,
) {
    let mut audio_output: Option<Box<dyn AudioOutput>> = None;
    let mut current_device: Option<String> = None;
    let mut is_paused = false;
    let mut last_timestamp_emit = Instant::now();
    
    // Decodificador y estado de reproducción
    let mut decoder_state: Option<DecoderState> = None;
    
    loop {
        // Procesar comandos (non-blocking mientras decodificamos)
        match control_rx.try_recv() {
            Ok(event) => {
                match event {
                    PlayerControlEvent::StreamFile { path, seek, volume: vol } => {
                        log::info!("🎵 StreamFile: {}", path);
                        
                        // Detener decodificación actual
                        decoder_state = None;
                        
                        // Crear nuevo output si no existe
                        if audio_output.is_none() {
                            match CpalAudioOutput::new(current_device.as_deref(), vol) {
                                Ok(output) => {
                                    audio_output = Some(Box::new(output));
                                }
                                Err(e) => {
                                    log::error!("❌ Error creando output: {}", e);
                                    emit_error(&app_handle, &e.to_string(), true);
                                    continue;
                                }
                            }
                        }
                        
                        // Abrir archivo y preparar decodificador
                        match open_audio_file(&path, seek, audio_output.as_ref().unwrap()) {
                            Ok((state_new, dur)) => {
                                decoder_state = Some(state_new);
                                duration.store(dur.to_bits(), Ordering::SeqCst);
                                position.store(seek.unwrap_or(0.0).to_bits(), Ordering::SeqCst);
                                
                                // Actualizar volumen
                                if let Some(ref output) = audio_output {
                                    output.set_volume(vol);
                                    let _ = output.play();
                                }
                                
                                state.store(true, Ordering::SeqCst);
                                is_paused = false;
                                volume.store(vol.to_bits(), Ordering::SeqCst);
                                
                                emit_state(&app_handle, true);
                            }
                            Err(e) => {
                                log::error!("❌ Error abriendo archivo: {}", e);
                                emit_error(&app_handle, &e.to_string(), false);
                            }
                        }
                    }
                    
                    PlayerControlEvent::Seek { position: seek_pos } => {
                        if let Some(ref mut ds) = decoder_state {
                            log::info!("🎯 Seek to {}s", seek_pos);
                            if let Err(e) = seek_to_position(ds, seek_pos) {
                                log::error!("❌ Error en seek: {}", e);
                                emit_error(&app_handle, &e.to_string(), false);
                            } else {
                                position.store(seek_pos.to_bits(), Ordering::SeqCst);
                                emit_timestamp(&app_handle, seek_pos, f64::from_bits(duration.load(Ordering::SeqCst)));
                            }
                        }
                    }
                    
                    PlayerControlEvent::ChangeVolume { volume: vol } => {
                        if let Some(ref output) = audio_output {
                            output.set_volume(vol);
                        }
                        volume.store(vol.to_bits(), Ordering::SeqCst);
                    }
                    
                    PlayerControlEvent::Pause => {
                        if let Some(ref output) = audio_output {
                            let _ = output.pause();
                        }
                        state.store(false, Ordering::SeqCst);
                        is_paused = true;
                        emit_state(&app_handle, false);
                    }
                    
                    PlayerControlEvent::Resume => {
                        if let Some(ref output) = audio_output {
                            let _ = output.play();
                        }
                        state.store(true, Ordering::SeqCst);
                        is_paused = false;
                        emit_state(&app_handle, true);
                    }
                    
                    PlayerControlEvent::Stop => {
                        decoder_state = None;
                        if let Some(ref mut output) = audio_output {
                            output.stop();
                        }
                        audio_output = None;
                        state.store(false, Ordering::SeqCst);
                        position.store(0.0f64.to_bits(), Ordering::SeqCst);
                        is_paused = false;
                        emit_state(&app_handle, false);
                    }
                    
                    PlayerControlEvent::ChangeAudioDevice { device_name } => {
                        log::info!("🔊 Cambiando dispositivo: {:?}", device_name);
                        current_device = device_name.clone();
                        
                        // Recrear output con nuevo dispositivo
                        let vol = f64::from_bits(volume.load(Ordering::SeqCst));
                        if audio_output.is_some() {
                            if let Some(ref mut output) = audio_output {
                                output.stop();
                            }
                            match CpalAudioOutput::new(current_device.as_deref(), vol) {
                                Ok(output) => {
                                    audio_output = Some(Box::new(output));
                                    if !is_paused {
                                        let _ = audio_output.as_ref().unwrap().play();
                                    }
                                }
                                Err(e) => {
                                    log::error!("❌ Error cambiando dispositivo: {}", e);
                                    emit_error(&app_handle, &e.to_string(), true);
                                    audio_output = None;
                                }
                            }
                        }
                    }
                }
            }
            Err(mpsc::TryRecvError::Empty) => {
                // No hay comandos, continuar decodificando
            }
            Err(mpsc::TryRecvError::Disconnected) => {
                // Canal cerrado, terminar thread
                log::info!("🛑 Decode thread terminando");
                break;
            }
        }
        
        // Decodificar siguiente frame si no está pausado
        if !is_paused {
            if let (Some(ref mut ds), Some(ref output)) = (&mut decoder_state, &audio_output) {
                match decode_next_frame(ds, output) {
                    Ok(DecodeResult::Continue(pos)) => {
                        position.store(pos.to_bits(), Ordering::SeqCst);
                        
                        // Emitir timestamp periódicamente
                        if last_timestamp_emit.elapsed() >= Duration::from_millis(TIMESTAMP_INTERVAL_MS) {
                            let dur = f64::from_bits(duration.load(Ordering::SeqCst));
                            emit_timestamp(&app_handle, pos, dur);
                            last_timestamp_emit = Instant::now();
                        }
                    }
                    Ok(DecodeResult::EndOfTrack) => {
                        log::info!("🏁 Fin del track");
                        decoder_state = None;
                        state.store(false, Ordering::SeqCst);
                        position.store(0.0f64.to_bits(), Ordering::SeqCst);
                        emit_end_of_track(&app_handle);
                        emit_state(&app_handle, false);
                    }
                    Err(e) => {
                        log::warn!("⚠️ Error decodificando: {}", e);
                        // No es crítico, intentar continuar
                    }
                }
            } else {
                // Sin decodificador activo, esperar un poco
                thread::sleep(Duration::from_millis(10));
            }
        } else {
            // Pausado, esperar
            thread::sleep(Duration::from_millis(50));
        }
    }
}

/// Estado del decodificador
struct DecoderState {
    format_reader: Box<dyn symphonia::core::formats::FormatReader>,
    decoder: Box<dyn symphonia::core::codecs::Decoder>,
    track_id: u32,
    time_base: symphonia::core::units::TimeBase,
    sample_rate: u32,
}

/// Resultado de decodificación
enum DecodeResult {
    Continue(f64), // Posición actual en segundos
    EndOfTrack,
}

/// Abre un archivo de audio y prepara el decodificador
fn open_audio_file(
    path: &str,
    seek: Option<f64>,
    output: &Box<dyn AudioOutput>,
) -> AudioResult<(DecoderState, f64)> {
    let file = std::fs::File::open(path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    
    // Hint basado en extensión
    let mut hint = Hint::new();
    if let Some(ext) = Path::new(path).extension() {
        hint.with_extension(&ext.to_string_lossy());
    }
    
    // Probar formato
    let format_opts = FormatOptions {
        enable_gapless: false,
        ..Default::default()
    };
    let metadata_opts = MetadataOptions::default();
    
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &format_opts, &metadata_opts)
        .map_err(|e| AudioError::DecodingFailed(format!("Error probando formato: {}", e)))?;
    
    let format_reader = probed.format;
    
    // Encontrar track de audio
    let track = format_reader
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| AudioError::DecodingFailed("No se encontró track de audio".to_string()))?;
    
    let track_id = track.id;
    let codec_params = &track.codec_params;
    
    // Obtener time_base y sample_rate
    let time_base = codec_params.time_base.unwrap_or(symphonia::core::units::TimeBase::new(1, 44100));
    let sample_rate = codec_params.sample_rate.unwrap_or(output.sample_rate());
    
    // Calcular duración
    let duration = if let Some(n_frames) = codec_params.n_frames {
        time_base.calc_time(n_frames).seconds as f64
    } else {
        0.0
    };
    
    // Crear decodificador
    let decoder_opts = DecoderOptions::default();
    let decoder = symphonia::default::get_codecs()
        .make(codec_params, &decoder_opts)
        .map_err(|e| AudioError::DecodingFailed(format!("Error creando decodificador: {}", e)))?;
    
    let mut decoder_state = DecoderState {
        format_reader,
        decoder,
        track_id,
        time_base,
        sample_rate,
    };
    
    // Seek inicial si se especificó
    if let Some(seek_pos) = seek {
        seek_to_position(&mut decoder_state, seek_pos)?;
    }
    
    Ok((decoder_state, duration))
}

/// Salta a una posición específica
fn seek_to_position(ds: &mut DecoderState, position: f64) -> AudioResult<()> {
    let seek_to = SeekTo::Time {
        time: Time::new(position as u64, position.fract()),
        track_id: Some(ds.track_id),
    };
    
    ds.format_reader
        .seek(SeekMode::Accurate, seek_to)
        .map_err(|e| AudioError::PlaybackFailed(format!("Error en seek: {}", e)))?;
    
    // Reset del decodificador para limpiar buffers internos
    ds.decoder.reset();
    
    Ok(())
}

/// Decodifica el siguiente frame y lo escribe al ring buffer
fn decode_next_frame(
    ds: &mut DecoderState,
    output: &Box<dyn AudioOutput>,
) -> AudioResult<DecodeResult> {
    // Leer siguiente paquete
    let packet = match ds.format_reader.next_packet() {
        Ok(p) => p,
        Err(symphonia::core::errors::Error::IoError(e)) 
            if e.kind() == std::io::ErrorKind::UnexpectedEof => {
            return Ok(DecodeResult::EndOfTrack);
        }
        Err(e) => {
            return Err(AudioError::DecodingFailed(format!("Error leyendo paquete: {}", e)));
        }
    };
    
    // Ignorar paquetes de otros tracks
    if packet.track_id() != ds.track_id {
        let pos = ds.time_base.calc_time(packet.ts()).seconds as f64;
        return Ok(DecodeResult::Continue(pos));
    }
    
    // Decodificar
    let decoded = ds.decoder.decode(&packet)
        .map_err(|e| AudioError::DecodingFailed(format!("Error decodificando: {}", e)))?;
    
    // Convertir a f32 interleaved
    let spec = *decoded.spec();
    let duration = decoded.capacity() as u64;
    
    let mut sample_buf = SampleBuffer::<f32>::new(duration, spec);
    sample_buf.copy_interleaved_ref(decoded);
    
    let samples = sample_buf.samples();
    
    // Escribir al ring buffer
    // AIDEV-NOTE: Si el buffer está lleno, esto bloqueará brevemente.
    // Esto es intencional para sincronizar decode con playback.
    let producer = output.get_producer();
    let mut written = 0;
    while written < samples.len() {
        let n = producer.write(&samples[written..]).unwrap_or(0);
        if n == 0 {
            // Buffer lleno, esperar un poco
            thread::sleep(Duration::from_micros(100));
        }
        written += n;
    }
    
    // Calcular posición actual
    let pos = ds.time_base.calc_time(packet.ts()).seconds as f64;
    
    Ok(DecodeResult::Continue(pos))
}

/// Emite evento de timestamp al frontend
fn emit_timestamp<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>, position: f64, duration: f64) {
    let _ = app_handle.emit("audio:timestamp", TimestampPayload { position, duration });
}

/// Emite evento de estado al frontend
fn emit_state<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>, is_playing: bool) {
    let state = if is_playing { PlaybackState::Playing } else { PlaybackState::Stopped };
    let _ = app_handle.emit("audio:state", StatePayload { is_playing, state });
}

/// Emite evento de fin de track
fn emit_end_of_track<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) {
    let _ = app_handle.emit("audio:end_of_track", ());
}

/// Emite evento de error
fn emit_error<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>, message: &str, is_critical: bool) {
    let _ = app_handle.emit("audio:error", ErrorPayload {
        message: message.to_string(),
        is_critical,
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_playback_state_serialize() {
        let state = PlaybackState::Playing;
        let json = serde_json::to_string(&state).unwrap();
        assert_eq!(json, "\"Playing\"");
    }

    #[test]
    fn test_timestamp_payload_serialize() {
        let payload = TimestampPayload {
            position: 10.5,
            duration: 180.0,
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("10.5"));
        assert!(json.contains("180"));
    }

    #[test]
    fn test_error_payload_serialize() {
        let payload = ErrorPayload {
            message: "Test error".to_string(),
            is_critical: true,
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("Test error"));
        assert!(json.contains("true"));
    }
}
