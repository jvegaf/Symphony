/**
 * Módulo de modelos de datos para integración con Beatport
 * 
 * Organizado por responsabilidad:
 * - core: Tipos básicos (OAuth, Artist, Genre, Label)
 * - release: Release e Image
 * - track: Track, Key y SearchResult
 * - tags: Tags extraídos para aplicar
 * - operations: Resultados y progreso de operaciones fix_tags
 * - candidates: Selección manual de candidatos
 */

pub mod core;
pub mod release;
pub mod track;
pub mod tags;
pub mod operations;
pub mod candidates;

// Re-exports para acceso directo
pub use core::{BeatportOAuth, BeatportArtist, BeatportGenre, GenreData, BeatportLabel};
pub use release::{BeatportRelease, BeatportImage};
pub use track::{BeatportTrack, BeatportKey, BeatportSearchResult};
pub use tags::BeatportTags;
pub use operations::{FixTagsResult, BatchFixResult, FixTagsProgress, FixTagsPhase};
pub use candidates::{BeatportCandidate, TrackCandidates, TrackSelection, SearchCandidatesResult};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_beatport_oauth_expired() {
        let mut oauth = BeatportOAuth {
            access_token: "test".to_string(),
            token_type: "Bearer".to_string(),
            expires_in: 3600,
            obtained_at: None,
        };
        
        // Sin timestamp, debería estar expirado
        assert!(oauth.is_expired());
        
        // Con timestamp reciente, no debería estar expirado
        oauth.obtained_at = Some(std::time::Instant::now());
        assert!(!oauth.is_expired());
    }

    #[test]
    fn test_beatport_key_camelot() {
        let key = BeatportKey {
            id: 1,
            name: "A minor".to_string(),
            camelot_number: Some(8),
            camelot_letter: Some("A".to_string()),
        };
        
        assert_eq!(key.camelot(), Some("8A".to_string()));
        assert_eq!(key.open_key(), "A minor".to_string());
    }

    #[test]
    fn test_beatport_image_url() {
        let image = BeatportImage {
            id: 1,
            uri: "https://example.com/image.jpg".to_string(),
            dynamic_uri: Some("https://example.com/{w}x{h}/image.jpg".to_string()),
        };
        
        assert_eq!(image.get_url(500), "https://example.com/500x500/image.jpg");
    }

    #[test]
    fn test_fix_tags_result_success() {
        let tags = BeatportTags {
            title: Some("Test Track".to_string()),
            artist: Some("Test Artist".to_string()),
            bpm: Some(128.0),
            key: Some("A minor".to_string()),
            genre: Some("Techno".to_string()),
            label: None,
            album: None,
            year: Some(2024),
            isrc: None,
            catalog_number: None,
            artwork_url: None,
            artwork_data: None,
        };
        
        let result = FixTagsResult::success("track-123".to_string(), 456789, tags);
        
        assert!(result.success);
        assert_eq!(result.track_id, "track-123");
        assert_eq!(result.beatport_track_id, Some(456789));
        assert!(result.error.is_none());
    }

    #[test]
    fn test_fix_tags_result_error() {
        let result = FixTagsResult::error("track-123".to_string(), "Not found".to_string());
        
        assert!(!result.success);
        assert_eq!(result.error, Some("Not found".to_string()));
        assert!(result.tags_applied.is_none());
    }

    #[test]
    fn test_batch_fix_result() {
        let results = vec![
            FixTagsResult::success("1".to_string(), 1, BeatportTags {
                title: None,
                artist: None,
                bpm: Some(128.0),
                key: None,
                genre: None,
                label: None,
                album: None,
                year: None,
                isrc: None,
                catalog_number: None,
                artwork_url: None,
                artwork_data: None,
            }),
            FixTagsResult::error("2".to_string(), "Error".to_string()),
        ];
        
        let batch = BatchFixResult::new(results);
        
        assert_eq!(batch.total, 2);
        assert_eq!(batch.success_count, 1);
        assert_eq!(batch.failed_count, 1);
    }

    #[test]
    fn test_parse_genre_array() {
        let json = r#"[{"genre_id": 96, "genre_name": "Mainstage"}]"#;
        let genres: Vec<BeatportGenre> = serde_json::from_str(json).unwrap();
        assert_eq!(genres.len(), 1);
        assert_eq!(genres[0].name, "Mainstage");
    }

    #[test]
    fn test_parse_genre_data_array() {
        let json = r#"[{"genre_id": 96, "genre_name": "Mainstage"}]"#;
        let genre: GenreData = serde_json::from_str(json).unwrap();
        assert!(matches!(genre, GenreData::Array(_)));
    }

    #[test]
    fn test_parse_minimal_track() {
        let json = r#"{
            "track_id": 123,
            "track_name": "Test Track",
            "bpm": 128,
            "genre": [{"genre_id": 5, "genre_name": "House"}]
        }"#;
        let track: BeatportTrack = serde_json::from_str(json).unwrap();
        assert_eq!(track.id, 123);
        assert_eq!(track.name, "Test Track");
        assert_eq!(track.get_genre_name(), Some("House".to_string()));
    }

    #[test]
    fn test_parse_label_api_format() {
        // Formato de la API v4
        let json = r#"{"id":97547,"name":"Daft Life Ltd."}"#;
        let label: BeatportLabel = serde_json::from_str(json).unwrap();
        assert_eq!(label.id, 97547);
        assert_eq!(label.name, "Daft Life Ltd.");
    }

    #[test]
    fn test_parse_track_with_label_api_format() {
        // JSON con label en formato API v4
        let json = r#"{
            "id": 5811848,
            "name": "Around the World",
            "bpm": 121,
            "label": {"id": 97547, "name": "Daft Life Ltd."}
        }"#;
        let track: BeatportTrack = serde_json::from_str(json).unwrap();
        assert_eq!(track.id, 5811848);
        assert!(track.label.is_some());
        assert_eq!(track.label.as_ref().unwrap().name, "Daft Life Ltd.");
    }

    #[test]
    fn test_parse_api_response_with_label() {
        // JSON simplificado de una respuesta real de la API v4
        let json = r#"{
            "artists": [{"id": 3547, "name": "Daft Punk"}],
            "bpm": 121,
            "genre": {"id": 5, "name": "House"},
            "id": 5811848,
            "isrc": "GBDUW0600009",
            "label": {"id": 97547, "name": "Daft Life Ltd./ADA France", "image": {"id": 5539566}},
            "name": "Around the World",
            "release": {"id": 15073, "name": "Homework"}
        }"#;
        let track: BeatportTrack = serde_json::from_str(json).unwrap();
        assert_eq!(track.id, 5811848);
        eprintln!("Label parsed: {:?}", track.label);
        assert!(track.label.is_some(), "Label should be present");
        assert_eq!(track.label.as_ref().unwrap().name, "Daft Life Ltd./ADA France");
    }
}
