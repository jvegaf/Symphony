//! Loop principal de decodificación

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{Receiver, TryRecvError};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use crate::audio::constants::TIMESTAMP_INTERVAL_MS;
use crate::audio::output::{AudioOutput, CpalAudioOutput};

use super::decoder::{
    decode_next_frame, open_audio_file, probe_file_sample_rate, seek_to_position,
};
use super::events::{emit_end_of_track, emit_error, emit_state, emit_timestamp};
use super::state::{DecodeResult, DecoderState};
use super::types::PlayerControlEvent;

/// Loop principal de decodificación
///
/// AIDEV-NOTE: Este loop corre en su propio thread y procesa comandos del player.
/// Decodifica audio con Symphonia y lo escribe al ring buffer de cpal.
pub fn decode_loop<R: tauri::Runtime>(
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
                    PlayerControlEvent::StreamFile {
                        path,
                        seek,
                        volume: vol,
                    } => {
                        log::info!("🎵 StreamFile: {}", path);

                        // Detener decodificación actual
                        decoder_state = None;

                        // AIDEV-NOTE: Estilo Musicat - probe el archivo primero para obtener sample rate y canales
                        // Luego crear/recrear output con esos parámetros
                        let (codec_sample_rate, codec_channels) =
                            match probe_file_sample_rate(&path) {
                                Ok((rate, channels)) => {
                                    log::info!("📊 Archivo: {} Hz, {} canales", rate, channels);
                                    (Some(rate), Some(channels))
                                }
                                Err(e) => {
                                    log::error!("❌ Error obteniendo info del archivo: {}", e);
                                    (None, None)
                                }
                            };

                        // AIDEV-NOTE: Cerrar output anterior de forma segura antes de crear uno nuevo
                        // Esto evita race conditions con el callback de audio de cpal
                        if let Some(ref mut output) = audio_output {
                            output.stop();
                        }
                        // Pequeña pausa para asegurar que el stream de cpal se ha detenido completamente
                        thread::sleep(Duration::from_millis(10));
                        audio_output = None; // Destruir output anterior

                        // Recrear output con el sample rate y canales del archivo
                        // Esto permite que el dispositivo se configure correctamente si lo soporta
                        match CpalAudioOutput::new(
                            current_device.as_deref(),
                            codec_sample_rate,
                            codec_channels,
                            vol,
                        ) {
                            Ok(output) => {
                                audio_output = Some(Box::new(output));
                            }
                            Err(e) => {
                                log::error!("❌ Error creando output: {}", e);
                                emit_error(&app_handle, &e.to_string(), true);
                                continue;
                            }
                        }

                        // Abrir archivo y preparar decodificador
                        match open_audio_file(&path, seek, audio_output.as_ref().unwrap().as_ref())
                        {
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
                                emit_timestamp(
                                    &app_handle,
                                    seek_pos,
                                    f64::from_bits(duration.load(Ordering::SeqCst)),
                                );
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
                        // Usar el sample rate del decoder actual si existe
                        let vol = f64::from_bits(volume.load(Ordering::SeqCst));
                        let codec_sample_rate = decoder_state.as_ref().map(|ds| ds.sample_rate);
                        // TODO: Almacenar canales en DecoderState para poder usarlos aquí
                        let codec_channels = None; // Por ahora usar default

                        if audio_output.is_some() {
                            if let Some(ref mut output) = audio_output {
                                output.stop();
                            }
                            match CpalAudioOutput::new(
                                current_device.as_deref(),
                                codec_sample_rate,
                                codec_channels,
                                vol,
                            ) {
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
            Err(TryRecvError::Empty) => {
                // No hay comandos, continuar decodificando
            }
            Err(TryRecvError::Disconnected) => {
                // Canal cerrado, terminar thread
                log::info!("🛑 Decode thread terminando");
                break;
            }
        }

        // Decodificar siguiente frame si no está pausado
        if !is_paused {
            if let (Some(ref mut ds), Some(ref output)) = (&mut decoder_state, &audio_output) {
                match decode_next_frame(ds, output.as_ref()) {
                    Ok(DecodeResult::Continue(pos)) => {
                        position.store(pos.to_bits(), Ordering::SeqCst);

                        // Emitir timestamp periódicamente
                        if last_timestamp_emit.elapsed()
                            >= Duration::from_millis(TIMESTAMP_INTERVAL_MS)
                        {
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
