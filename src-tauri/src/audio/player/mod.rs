//! Reproductor de audio modular

pub mod decode_loop;
pub mod decoder;
pub mod events;
pub mod player;
pub mod state;
pub mod types;

// Re-exportar los tipos públicos principales
pub use player::AudioPlayer;
pub use types::{ErrorPayload, PlaybackState, PlayerControlEvent, StatePayload, TimestampPayload};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_playback_state_serialize() {
        let state = PlaybackState::Playing;
        let json = serde_json::to_string(&state).unwrap();
        assert_eq!(json, "\"playing\"");
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
