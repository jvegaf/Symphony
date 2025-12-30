/// Módulo para descarga de artwork desde Beatport

use reqwest::{header, Client};

use super::super::error::BeatportError;

/// Descarga una imagen (artwork) desde una URL
pub async fn download_artwork(
    http: &Client,
    url: &str,
) -> Result<Vec<u8>, BeatportError> {
    let response = http
        .get(url)
        .header(header::ACCEPT, "image/*")
        .send()
        .await
        .map_err(|e| BeatportError::NetworkError(format!("Error downloading artwork: {}", e)))?;
    
    let bytes = response
        .bytes()
        .await
        .map_err(|e| BeatportError::NetworkError(format!("Error reading artwork bytes: {}", e)))?;
    
    Ok(bytes.to_vec())
}
