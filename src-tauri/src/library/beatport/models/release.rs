/**
 * Tipos relacionados con releases de Beatport
 * 
 * Incluye: BeatportRelease, BeatportImage
 */

use serde::{Deserialize, Serialize};

use super::core::{BeatportLabel};

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
