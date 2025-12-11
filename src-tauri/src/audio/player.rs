use std::sync::{Arc, Mutex};
use std::path::Path;
use std::fs::File;
use rodio::{Decoder, OutputStream, Sink};

use crate::audio::{AudioError, AudioResult};

/// Estado de reproducción
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlaybackState {
    Playing,
    Paused,
    Stopped,
}

// Wrapper para OutputStream y Sink que implementa Send
struct AudioOutput {
    _stream: OutputStream,
    sink: Sink,
}

// SAFETY: Este wrapper permite enviar OutputStream y Sink entre threads
// aunque rodio no los marca como Send explícitamente. En la práctica,
// el uso que hacemos es seguro porque todo el acceso está sincronizado.
unsafe impl Send for AudioOutput {}

/// Reproductor de audio
pub struct AudioPlayer {
    output: Arc<Mutex<Option<AudioOutput>>>,
    state: Arc<Mutex<PlaybackState>>,
}

impl AudioPlayer {
    /// Crea un nuevo reproductor de audio
    pub fn new() -> AudioResult<Self> {
        Ok(Self {
            output: Arc::new(Mutex::new(None)),
            state: Arc::new(Mutex::new(PlaybackState::Stopped)),
        })
    }

    /// Reproduce un archivo de audio
    pub fn play(&self, path: &Path) -> AudioResult<()> {
        // Crear dispositivo de salida y sink
        let (_stream, handle) = OutputStream::try_default()
            .map_err(|e| AudioError::PlaybackFailed(format!("No se pudo inicializar dispositivo de audio: {}", e)))?;
        
        let sink = Sink::try_new(&handle)
            .map_err(|e| AudioError::PlaybackFailed(format!("No se pudo crear sink: {}", e)))?;

        // Decodificar archivo
        let file = File::open(path)?;
        let source = Decoder::new(file)
            .map_err(|e| AudioError::DecodingFailed(format!("Error al decodificar: {}", e)))?;

        // Reproducir
        sink.append(source);
        sink.play();

        // Guardar output
        let mut output = self.output.lock().unwrap();
        *output = Some(AudioOutput { _stream, sink });

        // Actualizar estado
        let mut state = self.state.lock().unwrap();
        *state = PlaybackState::Playing;

        Ok(())
    }

    /// Pausa la reproducción
    pub fn pause(&self) {
        let output = self.output.lock().unwrap();
        if let Some(audio) = output.as_ref() {
            audio.sink.pause();
            
            let mut state = self.state.lock().unwrap();
            *state = PlaybackState::Paused;
        }
    }

    /// Reanuda la reproducción
    pub fn resume(&self) {
        let output = self.output.lock().unwrap();
        if let Some(audio) = output.as_ref() {
            audio.sink.play();
            
            let mut state = self.state.lock().unwrap();
            *state = PlaybackState::Playing;
        }
    }

    /// Detiene la reproducción
    pub fn stop(&self) {
        let mut output = self.output.lock().unwrap();
        if let Some(audio) = output.as_ref() {
            audio.sink.stop();
        }
        *output = None;

        let mut state = self.state.lock().unwrap();
        *state = PlaybackState::Stopped;
    }

    /// Obtiene el estado actual de reproducción
    pub fn get_state(&self) -> PlaybackState {
        *self.state.lock().unwrap()
    }

    /// Verifica si está reproduciendo
    pub fn is_playing(&self) -> bool {
        let output = self.output.lock().unwrap();
        if let Some(audio) = output.as_ref() {
            !audio.sink.is_paused() && !audio.sink.empty()
        } else {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_player() {
        let result = AudioPlayer::new();
        assert!(result.is_ok());
    }

    #[test]
    fn test_initial_state() {
        let player = AudioPlayer::new().unwrap();
        assert_eq!(player.get_state(), PlaybackState::Stopped);
    }

    #[test]
    fn test_play_nonexistent_file() {
        let player = AudioPlayer::new().unwrap();
        let path = Path::new("/nonexistent/file.mp3");
        let result = player.play(&path);
        assert!(result.is_err());
    }
}
