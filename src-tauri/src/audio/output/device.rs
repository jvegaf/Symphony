/**
 * Gestión de dispositivos de audio
 * 
 * Funciones para buscar y configurar dispositivos de audio usando CPAL.
 */

use cpal::traits::{DeviceTrait, HostTrait};
use cpal::{Device, Host, SupportedStreamConfig};

use super::super::constants::DEFAULT_SAMPLE_RATE;
use super::super::error::{AudioError, AudioResult};

/// Encuentra un dispositivo por nombre
pub(super) fn find_device_by_name(host: &Host, name: &str) -> AudioResult<Device> {
    if let Ok(devices) = host.output_devices() {
        for device in devices {
            if let Ok(device_name) = device.name() {
                if device_name == name {
                    return Ok(device);
                }
            }
        }
    }

    Err(AudioError::PlaybackFailed(format!(
        "Dispositivo '{}' no encontrado",
        name
    )))
}

/// Obtiene la mejor configuración soportada por el dispositivo
pub(super) fn get_best_config(
    device: &Device,
    desired_sample_rate: Option<u32>,
    desired_channels: Option<u16>,
) -> AudioResult<SupportedStreamConfig> {
    // AIDEV-NOTE: Basado en Musicat - intentar usar el sample rate y canales del archivo si el dispositivo lo soporta

    // Si se especificó un sample rate y/o canales deseados, verificar si el dispositivo los soporta
    if desired_sample_rate.is_some() || desired_channels.is_some() {
        if let Ok(configs) = device.supported_output_configs() {
            // Buscar una config que soporte lo solicitado
            for config_range in configs {
                let mut matches = true;

                // Verificar sample rate si se especificó
                if let Some(desired_rate) = desired_sample_rate {
                    if config_range
                        .try_with_sample_rate(cpal::SampleRate(desired_rate))
                        .is_none()
                    {
                        matches = false;
                    }
                }

                // Verificar canales si se especificó
                if let Some(desired_ch) = desired_channels {
                    if config_range.channels() != desired_ch {
                        matches = false;
                    }
                }

                if matches {
                    // Encontramos una configuración que cumple los requisitos
                    let sample_rate =
                        desired_sample_rate.unwrap_or(config_range.max_sample_rate().0);
                    if let Some(config_with_rate) =
                        config_range.try_with_sample_rate(cpal::SampleRate(sample_rate))
                    {
                        log::info!(
                            "✅ Dispositivo soporta {} Hz / {} canales",
                            sample_rate,
                            config_range.channels()
                        );
                        return Ok(config_with_rate);
                    }
                }
            }

            log::warn!(
                "⚠️ Dispositivo NO soporta {:?} Hz / {:?} canales, usando configuración por defecto",
                desired_sample_rate,
                desired_channels
            );
        }
    }

    // Fallback: intentar obtener configuración por defecto
    if let Ok(config) = device.default_output_config() {
        return Ok(config);
    }

    // Si no hay default, buscar una configuración adecuada
    if let Ok(mut configs) = device.supported_output_configs() {
        if let Some(config) = configs.next() {
            // Preferir 44100 Hz y 2 canales (stereo) si está en el rango
            let sample_rate = if config.min_sample_rate().0 <= DEFAULT_SAMPLE_RATE
                && config.max_sample_rate().0 >= DEFAULT_SAMPLE_RATE
            {
                cpal::SampleRate(DEFAULT_SAMPLE_RATE)
            } else {
                config.max_sample_rate()
            };

            return Ok(config.with_sample_rate(sample_rate));
        }
    }

    Err(AudioError::PlaybackFailed(
        "No se encontró configuración de audio válida".to_string(),
    ))
}
