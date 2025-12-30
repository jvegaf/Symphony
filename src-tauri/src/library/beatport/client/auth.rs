/// Módulo de autenticación OAuth para Beatport
/// 
/// Gestiona tokens anónimos extraídos desde HTML de la página de búsqueda.
/// Los tokens se cachean con Arc<Mutex> para evitar múltiples peticiones.

use std::sync::Arc;
use std::time::Instant;
use reqwest::Client;
use scraper::{Html, Selector};
use serde_json::Value;
use tokio::sync::Mutex;

use super::super::error::BeatportError;
use super::super::models::BeatportOAuth;

/// Obtiene un token OAuth válido (cached o nuevo desde HTML)
pub async fn get_token(
    http: &Client,
    oauth: &Arc<Mutex<Option<BeatportOAuth>>>,
) -> Result<String, BeatportError> {
    let mut oauth_guard = oauth.lock().await;
    
    // Verificar si tenemos token válido en cache
    if let Some(ref token_data) = *oauth_guard {
        if !token_data.is_expired() {
            return Ok(token_data.access_token.clone());
        }
    }
    
    // Token expirado o no existe - obtener nuevo desde HTML
    let html = http
        .get("https://www.beatport.com/search/tracks?q=test")
        .send()
        .await
        .map_err(|e| BeatportError::NetworkError(format!("Error fetching HTML: {}", e)))?
        .text()
        .await
        .map_err(|e| BeatportError::NetworkError(format!("Error reading HTML: {}", e)))?;
    
    extract_token_from_html(&html, &mut oauth_guard)
}

/// Extrae el token OAuth desde el script __NEXT_DATA__ del HTML
fn extract_token_from_html(
    html: &str,
    oauth_guard: &mut Option<BeatportOAuth>,
) -> Result<String, BeatportError> {
    let document = Html::parse_document(html);
    let selector = Selector::parse("script#__NEXT_DATA__")
        .map_err(|_| BeatportError::ParseError("Invalid selector".to_string()))?;
    
    let script = document
        .select(&selector)
        .next()
        .ok_or_else(|| BeatportError::AuthError("No __NEXT_DATA__ script found".to_string()))?;
    
    let json_str = script.inner_html();
    let json: Value = serde_json::from_str(&json_str)
        .map_err(|e| BeatportError::ParseError(format!("Error parsing __NEXT_DATA__: {}", e)))?;
    
    // Navegar estructura: props.pageProps.anonSession
    let access_token = json
        .get("props")
        .and_then(|p| p.get("pageProps"))
        .and_then(|pp| pp.get("anonSession"))
        .and_then(|as_| as_.get("access_token"))
        .and_then(|at| at.as_str())
        .ok_or_else(|| BeatportError::AuthError("access_token not found in __NEXT_DATA__".to_string()))?
        .to_string();
    
    let expires_in = json
        .get("props")
        .and_then(|p| p.get("pageProps"))
        .and_then(|pp| pp.get("anonSession"))
        .and_then(|as_| as_.get("expires_in"))
        .and_then(|ei| ei.as_i64())
        .unwrap_or(3600); // Default: 1 hora
    
    // Guardar en cache
    *oauth_guard = Some(BeatportOAuth {
        access_token: access_token.clone(),
        token_type: "Bearer".to_string(),
        expires_in,
        obtained_at: Some(Instant::now()),
    });
    
    Ok(access_token)
}
