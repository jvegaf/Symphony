/// Módulo de búsqueda mediante scraping HTML de Beatport
/// 
/// Extrae resultados desde la estructura __NEXT_DATA__ de Next.js

use reqwest::Client;
use scraper::{Html, Selector};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;

use super::super::error::BeatportError;
use super::super::models::{BeatportOAuth, BeatportSearchResult, BeatportTrack};

const SEARCH_URL: &str = "https://www.beatport.com/search/tracks";

/// Busca tracks en Beatport mediante scraping HTML
pub async fn search(
    http: &Client,
    _oauth: &Arc<Mutex<Option<BeatportOAuth>>>,
    title: &str,
    artist: &str,
) -> Result<BeatportSearchResult, BeatportError> {
    // Construir query: "artist title"
    let query = format!("{} {}", artist, title);
    let encoded_query = urlencoding::encode(&query);
    
    let url = format!("{}?q={}", SEARCH_URL, encoded_query);
    
    let response = http
        .get(&url)
        .send()
        .await
        .map_err(|e| BeatportError::NetworkError(format!("Error fetching search: {}", e)))?;
    
    // Manejar rate limiting
    if response.status() == 429 {
        return Err(BeatportError::RateLimited {
            retry_after_secs: 60,
        });
    }
    
    let html = response
        .text()
        .await
        .map_err(|e| BeatportError::NetworkError(format!("Error reading search HTML: {}", e)))?;
    
    parse_search_results(&html)
}

/// Parsea los resultados de búsqueda desde __NEXT_DATA__
fn parse_search_results(html: &str) -> Result<BeatportSearchResult, BeatportError> {
    let document = Html::parse_document(html);
    let selector = Selector::parse("script#__NEXT_DATA__")
        .map_err(|_| BeatportError::ParseError("Invalid selector".to_string()))?;
    
    let script = document
        .select(&selector)
        .next()
        .ok_or_else(|| BeatportError::ParseError("No __NEXT_DATA__ script found".to_string()))?;
    
    let json_str = script.inner_html();
    let json: Value = serde_json::from_str(&json_str)
        .map_err(|e| BeatportError::ParseError(format!("Error parsing __NEXT_DATA__: {}", e)))?;
    
    // Navegar estructura de Next.js:
    // props.pageProps.dehydratedState.queries[0].state.data.data
    let data = json
        .get("props")
        .and_then(|p| p.get("pageProps"))
        .and_then(|pp| pp.get("dehydratedState"))
        .and_then(|ds| ds.get("queries"))
        .and_then(|q| q.get(0))
        .and_then(|q0| q0.get("state"))
        .and_then(|s| s.get("data"))
        .and_then(|d| d.get("data"))
        .ok_or_else(|| BeatportError::ParseError("data.data not found in __NEXT_DATA__".to_string()))?;
    
    // Deserializar array de tracks
    let tracks: Vec<BeatportTrack> = if let Some(arr) = data.as_array() {
        arr.iter()
            .filter_map(|item| {
                match serde_json::from_value(item.clone()) {
                    Ok(track) => Some(track),
                    Err(e) => {
                        if let Some(id) = item.get("id") {
                            eprintln!("Error parsing track {}: {}", id, e);
                        }
                        None
                    }
                }
            })
            .collect()
    } else {
        Vec::new()
    };
    
    let total_count = tracks.len() as i64;
    
    Ok(BeatportSearchResult {
        total_count,
        tracks,
        page: 1,
        per_page: 25,
    })
}
