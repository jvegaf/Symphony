/**
 * Tipos relacionados con tracks de Beatport
 * 
 * Incluye: BeatportTrack, BeatportKey, BeatportSearchResult
 */

use serde::{Deserialize, Deserializer, Serialize};

use super::core::{BeatportArtist, BeatportLabel, GenreData};
use super::release::{BeatportImage, BeatportRelease};

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
    /// Campo length (API v4 lo envía como string "MM:SS" o segundos como número)
    #[serde(default, rename = "length")]
    pub length: Option<serde_json::Value>,
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
    
    /// Obtiene la duración en segundos
    /// Intenta primero `length_ms`, luego parsea `length` (puede ser ms, segundos o "MM:SS")
    pub fn get_duration_secs(&self) -> Option<f64> {
        // Primero intentar desde length_ms
        if let Some(ms) = self.length_ms {
            return Some(ms as f64 / 1000.0);
        }
        
        // Fallback: parsear length
        if let Some(ref length_val) = self.length {
            // Si es número
            if let Some(num) = length_val.as_i64() {
                // Si es > 10000, probablemente son milisegundos
                if num > 10000 {
                    return Some(num as f64 / 1000.0);
                }
                return Some(num as f64);
            }
            if let Some(num) = length_val.as_f64() {
                if num > 10000.0 {
                    return Some(num / 1000.0);
                }
                return Some(num);
            }
            // Si es string "MM:SS"
            if let Some(s) = length_val.as_str() {
                let parts: Vec<&str> = s.split(':').collect();
                if parts.len() == 2 {
                    if let (Ok(mins), Ok(secs)) = (parts[0].parse::<i64>(), parts[1].parse::<i64>()) {
                        return Some((mins * 60 + secs) as f64);
                    }
                }
            }
        }
        
        None
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

/// Resultado de búsqueda en Beatport
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportSearchResult {
    pub tracks: Vec<BeatportTrack>,
    pub total_count: i64,
    pub page: i32,
    pub per_page: i32,
}
