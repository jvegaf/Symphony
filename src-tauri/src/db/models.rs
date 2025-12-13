use serde::{Deserialize, Serialize};

/// Modelo de pista musical
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: Option<i64>,
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
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Waveform {
    pub id: Option<i64>,
    pub track_id: i64,
    pub data: Vec<u8>,
    pub resolution: i32,
    pub date_generated: String,
}

/// Modelo de beatgrid
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Beatgrid {
    pub id: Option<i64>,
    pub track_id: i64,
    pub bpm: f64,
    pub first_beat: f64,
    pub beat_data: String,
    pub date_analyzed: String,
}

/// Modelo de cue point
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CuePoint {
    pub id: Option<i64>,
    pub track_id: i64,
    pub position: f64,
    pub label: String,
    pub color: String,
    pub cue_type: String,
    pub date_created: String,
}

/// Modelo de loop
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Loop {
    pub id: Option<i64>,
    pub track_id: i64,
    pub start_position: f64,
    pub end_position: f64,
    pub label: String,
    pub is_active: bool,
    pub date_created: String,
}

/// Modelo de playlist
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
    pub id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub date_created: String,
    pub date_modified: String,
}

/// Modelo de relación playlist-track
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistTrack {
    pub id: Option<i64>,
    pub playlist_id: i64,
    pub track_id: i64,
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
            id: Some(1),
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
            id: Some(1),
            name: "My Playlist".to_string(),
            description: Some("Test playlist".to_string()),
            date_created: "2024-01-01".to_string(),
            date_modified: "2024-01-01".to_string(),
        };

        assert_eq!(playlist.name, "My Playlist");
    }
}
