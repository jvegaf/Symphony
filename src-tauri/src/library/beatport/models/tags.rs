/**
 * Tipos relacionados con tags extraídos de Beatport
 * 
 * Incluye: BeatportTags + impl From<&BeatportTrack>
 */

use serde::{Deserialize, Serialize};

use super::track::BeatportTrack;

/// Tags extraídos de Beatport para aplicar a un track local
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportTags {
    pub title: Option<String>,
    pub artist: Option<String>,
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
        let artists = track.artists.iter()
            .map(|a| a.name.clone())
            .collect::<Vec<_>>()
            .join(", ");
        
        let year = track.publish_date.as_ref().and_then(|d| {
            d.split('-').next().and_then(|y| y.parse::<i32>().ok())
        });

        // Usar el helper get_artwork_url que busca en todas las fuentes posibles
        // (release.image, release.image_dynamic_uri, track.image, track.track_image_dynamic_uri)
        let artwork_url = track.get_artwork_url(500);

        // Construir título completo con mix_name si existe
        let title = if let Some(ref mix) = track.mix_name {
            if !mix.is_empty() && mix.to_lowercase() != "original mix" {
                Some(format!("{} ({})", track.name, mix))
            } else {
                Some(track.name.clone())
            }
        } else {
            Some(track.name.clone())
        };

        BeatportTags {
            title,
            artist: if artists.is_empty() { None } else { Some(artists) },
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
