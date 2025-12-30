/**
 * Tipos de datos core para integración con Beatport
 * 
 * Incluye estructuras básicas: OAuth, Artist, Genre, Label
 */

use serde::{Deserialize, Serialize};

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
