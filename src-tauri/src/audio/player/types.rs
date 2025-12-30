//! Tipos y estructuras de datos para el reproductor de audio

/// Estado de reproducción
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
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
