/**
 * Módulo de salida de audio usando cpal con ring buffer
 *
 * AIDEV-NOTE: Esta implementación está basada en Musicat (basharovV/musicat).
 * Usa rb (ring buffer SPSC) para desacoplar el thread de decodificación
 * del callback de audio de cpal.
 * 
 * ## Estructura
 * 
 * - **cpal_impl.rs**: Trait AudioOutput e implementación CpalAudioOutput
 * - **device.rs**: Gestión de dispositivos de audio (búsqueda y configuración)
 * 
 * ## Características
 * 
 * - Ring buffer SPSC para desacoplamiento de threads
 * - Soporte para sample rate y canales nativos del dispositivo
 * - Control de volumen con atomic operations
 * - Pausa/resume con atomic-wait
 * - Listado de dispositivos disponibles
 */

mod cpal_impl;
mod device;

// Re-exportar tipos públicos
pub use cpal_impl::{AudioDeviceInfo, AudioOutput, CpalAudioOutput};
