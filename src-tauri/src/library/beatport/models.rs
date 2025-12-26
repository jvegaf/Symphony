/**
 * Modelos de datos para integración con Beatport
 * 
 * Define las estructuras de datos para OAuth, respuestas de búsqueda,
 * metadatos de tracks y resultados de operaciones fix_tags.
 */

use serde::{Deserialize, Serialize, Deserializer};

/// Deserializador personalizado para length_ms que acepta i64 directamente
fn deserialize_length_ms<'de, D>(deserializer: D) -> Result<Option<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    let value: Option<serde_json::Value> = Option::deserialize(deserializer)?;
    
    match value {
        None => Ok(None),
        Some(serde_json::Value::Number(n)) => Ok(n.as_i64()),
        _ => Ok(None),
    }
}

/// Token OAuth de Beatport
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportOAuth {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
    #[serde(skip)]
    pub obtained_at: Option<std::time::Instant>,
}

impl BeatportOAuth {
    /// Verifica si el token ha expirado (con margen de 60 segundos)
    pub fn is_expired(&self) -> bool {
        match self.obtained_at {
            Some(obtained) => {
                let elapsed = obtained.elapsed().as_secs() as i64;
                elapsed >= (self.expires_in - 60)
            }
            None => true, // Si no tenemos timestamp, asumimos expirado
        }
    }
}

/// Artista de Beatport (simplificado)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportArtist {
    #[serde(alias = "artist_id")]
    pub id: i64,
    #[serde(alias = "artist_name")]
    pub name: String,
    #[serde(default)]
    pub slug: Option<String>,
}

/// Género de Beatport
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportGenre {
    #[serde(alias = "genre_id")]
    pub id: i64,
    #[serde(alias = "genre_name")]
    pub name: String,
    #[serde(default)]
    pub slug: Option<String>,
}

/// Contenedor para genre (puede ser objeto, array, o null/vacío)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GenreData {
    Single(BeatportGenre),
    Array(Vec<BeatportGenre>),
    /// Para cuando genre es null o valor inesperado
    Null(serde_json::Value),
}

impl GenreData {
    /// Obtiene el primer género
    pub fn first(&self) -> Option<&BeatportGenre> {
        match self {
            GenreData::Single(g) => Some(g),
            GenreData::Array(arr) => arr.first(),
            GenreData::Null(_) => None,
        }
    }
}

/// Label de Beatport
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportLabel {
    #[serde(alias = "label_id")]
    pub id: i64,
    #[serde(alias = "label_name")]
    pub name: String,
    #[serde(default)]
    pub slug: Option<String>,
}

/// Release de Beatport
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportRelease {
    #[serde(alias = "release_id")]
    pub id: i64,
    #[serde(alias = "release_name")]
    pub name: String,
    #[serde(default)]
    pub slug: Option<String>,
    #[serde(default)]
    pub image: Option<BeatportImage>,
    /// Label del release (API v4 tiene label dentro de release, no en track directamente)
    #[serde(default)]
    pub label: Option<BeatportLabel>,
    /// Imagen como string (scraping)
    #[serde(default, alias = "release_image_uri")]
    pub image_uri: Option<String>,
    #[serde(default, alias = "release_image_dynamic_uri")]
    pub image_dynamic_uri: Option<String>,
}

impl BeatportRelease {
    /// Obtiene la URL del artwork en tamaño especificado
    pub fn get_artwork_url(&self, size: u32) -> Option<String> {
        // Primero intentar desde image (objeto)
        if let Some(ref img) = self.image {
            return Some(img.get_url(size));
        }
        // Luego desde image_dynamic_uri (scraping)
        if let Some(ref dyn_uri) = self.image_dynamic_uri {
            return Some(dyn_uri.replace("{w}", &size.to_string())
                              .replace("{h}", &size.to_string()));
        }
        // Finalmente image_uri sin dynamic
        self.image_uri.clone()
    }
}

/// Imagen de Beatport (artwork)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportImage {
    pub id: i64,
    #[serde(rename = "uri")]
    pub uri: String,
    #[serde(rename = "dynamic_uri", default)]
    pub dynamic_uri: Option<String>,
}

impl BeatportImage {
    /// Obtiene la URL de imagen con tamaño específico
    /// Si hay dynamic_uri, reemplaza el placeholder con el tamaño
    pub fn get_url(&self, size: u32) -> String {
        if let Some(dynamic) = &self.dynamic_uri {
            // El dynamic_uri tiene formato: "https://geo-media.beatport.com/image_size/{size}x{size}/..."
            dynamic.replace("{w}", &size.to_string())
                   .replace("{h}", &size.to_string())
        } else {
            self.uri.clone()
        }
    }
}

/// Track completo de Beatport (desde API v4 y scraping)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportTrack {
    #[serde(alias = "track_id")]
    pub id: i64,
    #[serde(alias = "track_name")]
    pub name: String,
    #[serde(default)]
    pub slug: Option<String>,
    #[serde(default)]
    pub mix_name: Option<String>,
    pub bpm: Option<f64>,
    /// Key como objeto (API v4) o null (scraping - usa key_name)
    #[serde(default)]
    pub key: Option<BeatportKey>,
    /// Key como string (scraping)
    #[serde(default)]
    pub key_name: Option<String>,
    #[serde(default)]
    pub artists: Vec<BeatportArtist>,
    #[serde(default)]
    pub remixers: Vec<BeatportArtist>,
    /// Genre puede ser objeto o array
    #[serde(default)]
    pub genre: Option<GenreData>,
    #[serde(default)]
    pub sub_genre: Option<GenreData>,
    #[serde(default)]
    pub label: Option<BeatportLabel>,
    #[serde(default)]
    pub release: Option<BeatportRelease>,
    #[serde(default)]
    pub publish_date: Option<String>,
    #[serde(default)]
    pub catalog_number: Option<String>,
    #[serde(default)]
    pub isrc: Option<String>,
    /// Duración en ms (desde length_ms)
    #[serde(default, deserialize_with = "deserialize_length_ms")]
    pub length_ms: Option<i64>,
    /// Campo length ignorado (API v4 lo envía como string "MM:SS")
    #[serde(default, rename = "length", skip_serializing)]
    _length: serde_json::Value,
    #[serde(default)]
    pub image: Option<BeatportImage>,
    /// Imagen como string (scraping)
    #[serde(default)]
    pub track_image_uri: Option<String>,
    #[serde(default)]
    pub track_image_dynamic_uri: Option<String>,
}

impl BeatportTrack {
    /// Obtiene el nombre de la key (de objeto o string)
    pub fn get_key_name(&self) -> Option<String> {
        self.key.as_ref().map(|k| k.name.clone())
            .or_else(|| self.key_name.clone())
    }
    
    /// Obtiene el nombre del género principal
    pub fn get_genre_name(&self) -> Option<String> {
        self.genre.as_ref()
            .and_then(|g| g.first())
            .map(|g| g.name.clone())
    }
    
    /// Obtiene el label del track
    /// En API v4, el label está dentro de release
    /// En scraping, puede estar directamente en track o en release
    pub fn get_label(&self) -> Option<&BeatportLabel> {
        // Primero intentar label directo en track (scraping)
        if let Some(ref label) = self.label {
            return Some(label);
        }
        // Luego desde release.label (API v4)
        if let Some(ref release) = self.release {
            if let Some(ref label) = release.label {
                return Some(label);
            }
        }
        None
    }
    
    /// Obtiene el nombre del label
    pub fn get_label_name(&self) -> Option<String> {
        self.get_label().map(|l| l.name.clone())
    }
    
    /// Obtiene la URL del artwork en tamaño especificado
    pub fn get_artwork_url(&self, size: u32) -> Option<String> {
        // Primero intentar desde release
        if let Some(ref release) = self.release {
            if let Some(url) = release.get_artwork_url(size) {
                return Some(url);
            }
        }
        // Luego desde image directamente
        if let Some(ref img) = self.image {
            return Some(img.get_url(size));
        }
        // Finalmente desde track_image_dynamic_uri (scraping)
        if let Some(ref dyn_uri) = self.track_image_dynamic_uri {
            return Some(dyn_uri.replace("{w}", &size.to_string())
                              .replace("{h}", &size.to_string()));
        }
        // O track_image_uri sin dynamic
        self.track_image_uri.clone()
    }
}

/// Key musical de Beatport
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportKey {
    pub id: i64,
    pub name: String,
    #[serde(default)]
    pub camelot_number: Option<i32>,
    #[serde(default)]
    pub camelot_letter: Option<String>,
}

impl BeatportKey {
    /// Obtiene la key en formato Camelot (ej: "8A", "11B")
    pub fn camelot(&self) -> Option<String> {
        match (&self.camelot_number, &self.camelot_letter) {
            (Some(num), Some(letter)) => Some(format!("{}{}", num, letter)),
            _ => None,
        }
    }
    
    /// Obtiene la key en formato Open Key
    pub fn open_key(&self) -> String {
        self.name.clone()
    }
}

/// Resultado de búsqueda en Beatport
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportSearchResult {
    pub tracks: Vec<BeatportTrack>,
    pub total_count: i64,
    pub page: i32,
    pub per_page: i32,
}

/// Tags extraídos de Beatport para aplicar a un track local
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportTags {
    pub bpm: Option<f64>,
    pub key: Option<String>,
    pub genre: Option<String>,
    pub label: Option<String>,
    pub album: Option<String>,
    pub year: Option<i32>,
    pub isrc: Option<String>,
    pub catalog_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artwork_url: Option<String>,
    /// Datos binarios del artwork (solo en memoria, no serializado)
    #[serde(skip)]
    pub artwork_data: Option<Vec<u8>>,
}

impl From<&BeatportTrack> for BeatportTags {
    fn from(track: &BeatportTrack) -> Self {
        let _artists = track.artists.iter()
            .map(|a| a.name.clone())
            .collect::<Vec<_>>()
            .join(", ");
        
        let year = track.publish_date.as_ref().and_then(|d| {
            d.split('-').next().and_then(|y| y.parse::<i32>().ok())
        });

        let artwork_url = track.release.as_ref()
            .and_then(|r| r.image.as_ref())
            .map(|img| img.get_url(500))
            .or_else(|| track.image.as_ref().map(|img| img.get_url(500)));

        BeatportTags {
            bpm: track.bpm,
            key: track.get_key_name(),
            genre: track.get_genre_name(),
            label: track.get_label_name(), // Usa helper que busca en track y release
            album: track.release.as_ref().map(|r| r.name.clone()),
            year,
            isrc: track.isrc.clone(),
            catalog_number: track.catalog_number.clone(),
            artwork_url,
            artwork_data: None,
        }
    }
}

/// Resultado de fix_tags para un track individual
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixTagsResult {
    pub track_id: String,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub beatport_track_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags_applied: Option<BeatportTags>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl FixTagsResult {
    /// Crea un resultado exitoso
    pub fn success(track_id: String, beatport_id: i64, tags: BeatportTags) -> Self {
        Self {
            track_id,
            success: true,
            beatport_track_id: Some(beatport_id),
            tags_applied: Some(tags),
            error: None,
        }
    }

    /// Crea un resultado de error
    pub fn error(track_id: String, error: String) -> Self {
        Self {
            track_id,
            success: false,
            beatport_track_id: None,
            tags_applied: None,
            error: Some(error),
        }
    }
}

/// Resultado de batch fix_tags
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchFixResult {
    pub total: usize,
    pub success_count: usize,
    pub failed_count: usize,
    pub results: Vec<FixTagsResult>,
}

impl BatchFixResult {
    pub fn new(results: Vec<FixTagsResult>) -> Self {
        let total = results.len();
        let success_count = results.iter().filter(|r| r.success).count();
        let failed_count = total - success_count;
        
        Self {
            total,
            success_count,
            failed_count,
            results,
        }
    }
}

/// Evento de progreso para UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixTagsProgress {
    pub current: usize,
    pub total: usize,
    pub current_track_title: String,
    pub phase: FixTagsPhase,
}

/// Fases del proceso fix_tags
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FixTagsPhase {
    Searching,
    Downloading,
    ApplyingTags,
    Complete,
}

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
