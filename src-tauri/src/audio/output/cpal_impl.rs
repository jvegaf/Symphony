/**
 * Trait e implementación del trait AudioOutput
 * 
 * Define la interfaz para salidas de audio y su implementación CPAL.
 */

use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Stream, StreamConfig, SupportedStreamConfig};
use rb::{Consumer, Producer, RbConsumer, SpscRb, RB};

use super::super::constants::{PAUSE_VALUE, PLAY_VALUE, RING_BUFFER_SIZE};
use super::super::error::{AudioError, AudioResult};
use super::super::DEFAULT_VOLUME;
use super::device::{find_device_by_name, get_best_config};

/// Información sobre un dispositivo de audio
#[derive(Debug, Clone, serde::Serialize)]
pub struct AudioDeviceInfo {
    pub name: String,
    pub is_default: bool,
}

/// Trait para la salida de audio
pub trait AudioOutput: Send {
    /// Obtiene una referencia al producer del ring buffer para escribir samples
    fn get_producer(&self) -> &Producer<f32>;

    /// Obtiene el sample rate del dispositivo
    fn sample_rate(&self) -> u32;

    /// Obtiene el número de canales
    fn channels(&self) -> u16;

    /// Inicia la reproducción
    fn play(&self) -> AudioResult<()>;

    /// Pausa la reproducción
    fn pause(&self) -> AudioResult<()>;

    /// Detiene y libera recursos
    fn stop(&mut self);

    /// Establece el volumen (0.0 - 1.0)
    fn set_volume(&self, volume: f64);

    /// Obtiene el volumen actual
    fn get_volume(&self) -> f64;
}

/// Implementación de salida de audio usando cpal
pub struct CpalAudioOutput {
    /// Stream de audio de cpal
    _stream: Stream,
    /// Producer del ring buffer (para el decode thread)
    producer: Producer<f32>,
    /// Sample rate del dispositivo
    sample_rate: u32,
    /// Número de canales
    channels: u16,
    /// Estado de pausa (para atomic-wait)
    pause_state: Arc<AtomicU32>,
    /// Volumen actual (compartido con el callback)
    volume: Arc<AtomicU32>,
}

// SAFETY: CpalAudioOutput es Send porque todos sus campos son Send o están
// protegidos por Arc. El Stream de cpal se usa solo desde el thread que lo crea.
unsafe impl Send for CpalAudioOutput {}

impl CpalAudioOutput {
    /// Crea una nueva salida de audio con el dispositivo especificado
    ///
    /// # Arguments
    /// * `device_name` - Nombre del dispositivo (None = default)
    /// * `desired_sample_rate` - Sample rate deseado (None = usar default del dispositivo)
    /// * `desired_channels` - Número de canales deseado (None = usar default del dispositivo)
    /// * `initial_volume` - Volumen inicial (0.0 - 1.0)
    ///
    /// # AIDEV-NOTE: Estilo Musicat
    /// Si el dispositivo soporta el sample rate y canales deseados, se usa eso.
    /// Si no, se usa la configuración por defecto del dispositivo.
    /// Esto evita resampling innecesario cuando el dispositivo puede manejar
    /// el sample rate y canales del archivo nativamente.
    pub fn new(
        device_name: Option<&str>,
        desired_sample_rate: Option<u32>,
        desired_channels: Option<u16>,
        initial_volume: f64,
    ) -> AudioResult<Self> {
        let host = cpal::default_host();

        // Seleccionar dispositivo
        let device = if let Some(name) = device_name {
            find_device_by_name(&host, name)?
        } else {
            host.default_output_device().ok_or_else(|| {
                AudioError::PlaybackFailed("No hay dispositivo de audio disponible".to_string())
            })?
        };

        log::info!("🔊 Usando dispositivo de audio: {:?}", device.name());

        // Obtener configuración soportada
        let supported_config = get_best_config(&device, desired_sample_rate, desired_channels)?;
        let sample_rate = supported_config.sample_rate().0;
        let channels = supported_config.channels();

        if let Some(desired_rate) = desired_sample_rate {
            if sample_rate == desired_rate && Some(channels) == desired_channels {
                log::info!("✅ Dispositivo configurado a sample rate y canales deseados: {} Hz ({} canales)", sample_rate, channels);
            } else {
                log::warn!(
                    "⚠️ Dispositivo no soporta {} Hz / {} canales, usando {} Hz / {} canales",
                    desired_rate,
                    desired_channels.unwrap_or(2),
                    sample_rate,
                    channels
                );
            }
        } else {
            log::info!("📊 Config: {} Hz, {} canales", sample_rate, channels);
        }

        // Crear ring buffer
        let ring_buffer = SpscRb::<f32>::new(RING_BUFFER_SIZE);
        let (producer, consumer) = (ring_buffer.producer(), ring_buffer.consumer());

        // Estado de pausa compartido
        let pause_state = Arc::new(AtomicU32::new(PLAY_VALUE));
        let pause_state_callback = Arc::clone(&pause_state);

        // Volumen compartido (como u32 bits para atomic)
        let volume_bits = (initial_volume.clamp(0.0, 1.0) as f32).to_bits();
        let volume = Arc::new(AtomicU32::new(volume_bits));
        let volume_callback = Arc::clone(&volume);

        // Configuración del stream
        let config: StreamConfig = supported_config.into();
        let channels_count = channels as usize;

        // Crear stream con callback
        let stream = device
            .build_output_stream(
                &config,
                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                    audio_callback(
                        data,
                        &consumer,
                        &pause_state_callback,
                        &volume_callback,
                        channels_count,
                    );
                },
                move |err| {
                    log::error!("❌ Error en stream de audio: {}", err);
                },
                None, // No timeout
            )
            .map_err(|e| AudioError::PlaybackFailed(format!("No se pudo crear stream: {}", e)))?;

        Ok(Self {
            _stream: stream,
            producer,
            sample_rate,
            channels,
            pause_state,
            volume,
        })
    }

    /// Lista todos los dispositivos de audio disponibles
    pub fn list_devices() -> AudioResult<Vec<AudioDeviceInfo>> {
        let host = cpal::default_host();
        let default_device = host.default_output_device();
        let default_name = default_device.as_ref().and_then(|d| d.name().ok());

        let mut devices = Vec::new();

        if let Ok(output_devices) = host.output_devices() {
            for device in output_devices {
                if let Ok(name) = device.name() {
                    let is_default = default_name.as_ref().map(|d| d == &name).unwrap_or(false);
                    devices.push(AudioDeviceInfo { name, is_default });
                }
            }
        }

        Ok(devices)
    }
}

impl AudioOutput for CpalAudioOutput {
    fn get_producer(&self) -> &Producer<f32> {
        &self.producer
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    fn channels(&self) -> u16 {
        self.channels
    }

    fn play(&self) -> AudioResult<()> {
        self.pause_state.store(PLAY_VALUE, Ordering::SeqCst);
        atomic_wait::wake_all(self.pause_state.as_ref());
        self._stream
            .play()
            .map_err(|e| AudioError::PlaybackFailed(format!("Error al iniciar stream: {}", e)))
    }

    fn pause(&self) -> AudioResult<()> {
        self.pause_state.store(PAUSE_VALUE, Ordering::SeqCst);
        Ok(())
    }

    fn stop(&mut self) {
        // El stream se detendrá cuando se dropee
        self.pause_state.store(PAUSE_VALUE, Ordering::SeqCst);
    }

    fn set_volume(&self, volume: f64) {
        let clamped = volume.clamp(0.0, 1.0) as f32;
        self.volume.store(clamped.to_bits(), Ordering::SeqCst);
    }

    fn get_volume(&self) -> f64 {
        f32::from_bits(self.volume.load(Ordering::SeqCst)) as f64
    }
}

/// Callback de audio que lee del ring buffer y escribe al dispositivo
///
/// AIDEV-NOTE: Este callback se ejecuta en el thread de audio de cpal.
/// Debe ser lo más eficiente posible - sin allocations ni locks pesados.
fn audio_callback(
    data: &mut [f32],
    consumer: &Consumer<f32>,
    pause_state: &AtomicU32,
    volume: &AtomicU32,
    _channels: usize,
) {
    // Verificar si estamos en pausa
    if pause_state.load(Ordering::SeqCst) == PAUSE_VALUE {
        // En pausa: llenar con silencio y esperar
        data.fill(0.0);
        atomic_wait::wait(pause_state, PAUSE_VALUE);
        return;
    }

    // Obtener volumen actual
    let vol = f32::from_bits(volume.load(Ordering::SeqCst));

    // Leer del ring buffer
    let read = consumer.read(data).unwrap_or(0);

    // Aplicar volumen a los samples leídos
    for sample in &mut data[..read] {
        *sample *= vol;
    }

    // Llenar el resto con silencio si no hay suficientes samples
    if read < data.len() {
        data[read..].fill(0.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_devices() {
        let result = CpalAudioOutput::list_devices();
        let _ = result;
    }

    #[test]
    fn test_audio_device_info_serialize() {
        let info = AudioDeviceInfo {
            name: "Test Device".to_string(),
            is_default: true,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("Test Device"));
        assert!(json.contains("true"));
    }

    #[test]
    fn test_audio_device_info_creation() {
        let device = AudioDeviceInfo {
            name: "Test Device".to_string(),
            is_default: false,
        };

        assert_eq!(device.name, "Test Device");
        assert!(!device.is_default);
    }

    #[test]
    fn test_list_devices_returns_result() {
        let result = CpalAudioOutput::list_devices();

        match result {
            Ok(devices) => {
                for device in devices {
                    assert!(!device.name.is_empty());
                }
            }
            Err(_) => {
                // OK en ambientes sin audio
            }
        }
    }

    #[test]
    #[cfg_attr(
        windows,
        ignore = "Audio tests can fail on Windows CI without proper audio drivers"
    )]
    fn test_cpal_output_creation_with_default_device() {
        let result = CpalAudioOutput::new(None, None, None, DEFAULT_VOLUME);

        if let Ok(mut output) = result {
            assert!(output.sample_rate() > 0);
            assert!(output.channels() > 0);
            assert_eq!(output.get_volume(), DEFAULT_VOLUME);
            // Explicitly stop to clean up resources
            output.stop();
        }
    }

    #[test]
    #[cfg_attr(
        windows,
        ignore = "Audio tests can fail on Windows CI without proper audio drivers"
    )]
    fn test_cpal_output_volume_range() {
        if let Ok(mut output) = CpalAudioOutput::new(None, None, None, 0.5) {
            assert!((output.get_volume() - 0.5).abs() < 0.01);

            output.set_volume(0.8);
            assert!((output.get_volume() - 0.8).abs() < 0.01);

            output.set_volume(-0.5);
            assert!((output.get_volume() - 0.0).abs() < 0.01);

            output.set_volume(1.5);
            assert!((output.get_volume() - 1.0).abs() < 0.01);

            // Explicitly stop to clean up resources
            output.stop();
        }
    }

    #[test]
    fn test_cpal_output_with_invalid_device() {
        let result =
            CpalAudioOutput::new(Some("NonExistentDevice12345"), None, None, DEFAULT_VOLUME);
        assert!(result.is_err());
    }

    #[test]
    #[cfg_attr(
        windows,
        ignore = "Audio tests can fail on Windows CI without proper audio drivers"
    )]
    fn test_audio_output_trait_methods() {
        if let Ok(mut output) = CpalAudioOutput::new(None, None, None, DEFAULT_VOLUME) {
            let _producer = output.get_producer();
            let _sr = output.sample_rate();
            let _ch = output.channels();

            let _ = output.play();
            let _ = output.pause();

            // Explicitly stop to clean up resources
            output.stop();
        }
    }

    #[test]
    #[cfg_attr(
        windows,
        ignore = "Audio tests can fail on Windows CI without proper audio drivers"
    )]
    fn test_volume_persistence() {
        if let Ok(mut output) = CpalAudioOutput::new(None, None, None, 0.3) {
            assert!((output.get_volume() - 0.3).abs() < 0.01);

            output.set_volume(0.7);
            assert!((output.get_volume() - 0.7).abs() < 0.01);

            let _ = output.pause();
            assert!((output.get_volume() - 0.7).abs() < 0.01);

            let _ = output.play();
            assert!((output.get_volume() - 0.7).abs() < 0.01);

            // Explicitly stop to clean up resources
            output.stop();
        }
    }
}
