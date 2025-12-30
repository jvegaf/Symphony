/// Módulo para llamadas directas a la API v4 de Beatport

use reqwest::{header, Client};
use std::sync::Arc;
use tokio::sync::Mutex;

use super::super::error::BeatportError;
use super::super::models::{BeatportOAuth, BeatportTrack};
use super::auth;

const API_BASE: &str = "https://api.beatport.com/v4";

/// Obtiene los detalles completos de un track desde la API v4
pub async fn get_track(
    http: &Client,
    oauth: &Arc<Mutex<Option<BeatportOAuth>>>,
    track_id: i64,
) -> Result<BeatportTrack, BeatportError> {
    let token = auth::get_token(http, oauth).await?;
    
    let url = format!("{}/catalog/tracks/{}", API_BASE, track_id);
    
    let response = http
        .get(&url)
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::ACCEPT, "application/json")
        .send()
        .await
        .map_err(|e| BeatportError::NetworkError(format!("Error fetching track: {}", e)))?;
    
    // Manejar errores HTTP
    if response.status() == 404 {
        return Err(BeatportError::TrackRestricted {
            track_id,
            reason: "Track no encontrado o restringido".to_string(),
        });
    }
    
    if response.status() == 429 {
        return Err(BeatportError::RateLimited {
            retry_after_secs: 60,
        });
    }
    
    response
        .json::<BeatportTrack>()
        .await
        .map_err(|e| BeatportError::ParseError(format!("Error parsing track: {}", e)))
}
