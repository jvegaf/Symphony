use serde::{Deserialize, Serialize};

/// Modelo de pista musical
/// AIDEV-NOTE: Migrado de i64 a String (UUID v4) para mejor escalabilidad
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: Option<String>,
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub duration: f64,
    pub bitrate: i32,
    pub sample_rate: i32,
    pub file_size: i64,
    pub bpm: Option<f64>,
    pub key: Option<String>,
    pub rating: Option<i32>,
    pub play_count: i32,
    pub last_played: Option<String>,
    pub date_added: String,
    pub date_modified: String,
}

/// Modelo de waveform
/// AIDEV-NOTE: data almacena peaks como Vec<f32> serializado a bincode
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Waveform {
    pub id: Option<String>,
    pub track_id: String,
    pub data: Vec<u8>,
    pub resolution: i32,
    pub date_generated: String,
}

/// Modelo de beatgrid
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Beatgrid {
    pub id: Option<String>,
    pub track_id: String,
    pub bpm: f64,
    pub offset: f64,  // Offset del primer beat en segundos
    pub confidence: Option<f64>,  // Confidence score del análisis (0-100)
    pub analyzed_at: String,
}

/// Modelo de cue point
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CuePoint {
    pub id: Option<String>,
    pub track_id: String,
    pub position: f64,
    pub label: String,
    pub color: String,
    pub cue_type: String,  // intro, outro, drop, break, custom
    pub hotkey: Option<i32>,  // 1-8 para hot cues
    pub created_at: String,
}

/// Modelo de loop
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Loop {
    pub id: Option<String>,
    pub track_id: String,
    pub label: String,
    pub loop_start: f64,
    pub loop_end: f64,
    pub is_active: bool,
    pub created_at: String,
}

/// Modelo de playlist
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
    pub id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub date_created: String,
    pub date_modified: String,
}

/// Modelo de relación playlist-track
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistTrack {
    pub id: Option<String>,
    pub playlist_id: String,
    pub track_id: String,
    pub position: i32,
    pub date_added: String,
}

/// Modelo de configuración
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub value_type: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_track_creation() {
        let track = Track {
            id: Some("test-uuid-1234".to_string()),
            path: "/music/test.mp3".to_string(),
            title: "Test Track".to_string(),
            artist: "Test Artist".to_string(),
            album: None,
            genre: Some("Electronic".to_string()),
            year: Some(2024),
            duration: 180.0,
            bitrate: 320,
            sample_rate: 44100,
            file_size: 8388608,
            bpm: Some(128.0),
            key: Some("Am".to_string()),
            rating: Some(4),
            play_count: 0,
            last_played: None,
            date_added: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        };

        assert_eq!(track.title, "Test Track");
        assert_eq!(track.artist, "Test Artist");
    }

    #[test]
    fn test_playlist_creation() {
        let playlist = Playlist {
            id: Some("test-playlist-uuid".to_string()),
            name: "My Playlist".to_string(),
            description: Some("Test playlist".to_string()),
            date_created: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        };

        assert_eq!(playlist.name, "My Playlist");
    }
}
