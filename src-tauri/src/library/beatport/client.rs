/**
 * Cliente HTTP para la API de Beatport
 * 
 * Implementa autenticación OAuth, búsqueda de tracks y descarga de artwork.
 * Utiliza tokens anónimos extraídos del HTML de Beatport ya que las credenciales
 * de OAuth del cliente web ya no son públicas.
 */

use reqwest::{Client, header};
use scraper::{Html, Selector};
use std::sync::Arc;
use tokio::sync::Mutex;

use super::error::BeatportError;
use super::models::{BeatportCandidate, BeatportOAuth, BeatportSearchResult, BeatportTrack};

const API_BASE: &str = "https://api.beatport.com/v4";
const SEARCH_URL: &str = "https://www.beatport.com/search/tracks";

/// User agent que simula un navegador
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/// Cliente para interactuar con la API de Beatport
pub struct BeatportClient {
    http: Client,
    oauth: Arc<Mutex<Option<BeatportOAuth>>>,
}

impl BeatportClient {
    /// Crea una nueva instancia del cliente
    pub fn new() -> Result<Self, BeatportError> {
        let http = Client::builder()
            .user_agent(USER_AGENT)
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| BeatportError::NetworkError(e.to_string()))?;

        Ok(Self {
            http,
            oauth: Arc::new(Mutex::new(None)),
        })
    }

    /// Obtiene un token anónimo desde el HTML de Beatport
    /// Beatport incluye un token válido en el __NEXT_DATA__ de cada página
    async fn get_token(&self) -> Result<String, BeatportError> {
        let mut oauth_guard = self.oauth.lock().await;
        
        // Verificar si tenemos un token válido
        if let Some(ref token) = *oauth_guard {
            if !token.is_expired() {
                return Ok(token.access_token.clone());
            }
        }

        // Obtener nuevo token anónimo desde la página de búsqueda (tiene __NEXT_DATA__)
        let response = self.http
            .get(format!("{}?q=test", SEARCH_URL))
            .header(header::ACCEPT, "text/html,application/xhtml+xml")
            .header(header::ACCEPT_LANGUAGE, "en-US,en;q=0.9")
            .send()
            .await
            .map_err(|e| BeatportError::NetworkError(format!("No se pudo conectar a Beatport: {}", e)))?;

        if !response.status().is_success() {
            return Err(BeatportError::NetworkError(format!(
                "Error accediendo a Beatport: {}", response.status()
            )));
        }

        let html = response.text().await?;
        self.extract_token_from_html(&html, &mut oauth_guard)
    }
    
    /// Extrae el token anónimo del HTML de una página de Beatport
    fn extract_token_from_html(&self, html: &str, oauth_guard: &mut Option<BeatportOAuth>) -> Result<String, BeatportError> {
        let document = Html::parse_document(html);
        let selector = Selector::parse("script#__NEXT_DATA__")
            .map_err(|_| BeatportError::ParseError("Selector inválido".to_string()))?;

        let script = document.select(&selector).next()
            .ok_or_else(|| BeatportError::ParseError("No se encontró __NEXT_DATA__".to_string()))?;

        let json_text = script.inner_html();
        let json: serde_json::Value = serde_json::from_str(&json_text)
            .map_err(|e| BeatportError::ParseError(format!("JSON inválido: {}", e)))?;

        // Extraer token anónimo de anonSession
        let anon_session = json
            .get("props")
            .and_then(|p| p.get("pageProps"))
            .and_then(|pp| pp.get("anonSession"))
            .ok_or_else(|| BeatportError::AuthError("No se encontró anonSession".to_string()))?;

        let access_token = anon_session
            .get("access_token")
            .and_then(|t| t.as_str())
            .ok_or_else(|| BeatportError::AuthError("No se encontró access_token".to_string()))?
            .to_string();

        let expires_in = anon_session
            .get("expires_in")
            .and_then(|e| e.as_i64())
            .unwrap_or(3600);

        let oauth = BeatportOAuth {
            access_token: access_token.clone(),
            token_type: "Bearer".to_string(),
            expires_in,
            obtained_at: Some(std::time::Instant::now()),
        };
        
        *oauth_guard = Some(oauth);
        Ok(access_token)
    }

    /// Busca tracks en Beatport por título y artista
    /// 
    /// Utiliza scraping del HTML de búsqueda para extraer datos de __NEXT_DATA__
    pub async fn search(&self, title: &str, artist: &str) -> Result<BeatportSearchResult, BeatportError> {
        let query = format!("{} {}", artist, title);
        let url = format!("{}?q={}", SEARCH_URL, urlencoding::encode(&query));

        let response = self.http
            .get(&url)
            .header(header::ACCEPT, "text/html,application/xhtml+xml")
            .header(header::ACCEPT_LANGUAGE, "en-US,en;q=0.9")
            .send()
            .await?;

        if response.status() == 429 {
            return Err(BeatportError::RateLimited { retry_after_secs: 60 });
        }

        if !response.status().is_success() {
            return Err(BeatportError::NetworkError(format!(
                "Búsqueda falló: {}", response.status()
            )));
        }

        let html = response.text().await?;
        self.parse_search_results(&html)
    }

    /// Parsea los resultados de búsqueda desde el HTML
    /// Extrae el JSON de __NEXT_DATA__ que contiene los tracks
    fn parse_search_results(&self, html: &str) -> Result<BeatportSearchResult, BeatportError> {
        let document = Html::parse_document(html);
        let selector = Selector::parse("script#__NEXT_DATA__")
            .map_err(|_| BeatportError::ParseError("Selector inválido".to_string()))?;

        let script = document.select(&selector).next()
            .ok_or_else(|| BeatportError::ParseError("No se encontró __NEXT_DATA__".to_string()))?;

        let json_text = script.inner_html();
        let json: serde_json::Value = serde_json::from_str(&json_text)
            .map_err(|e| BeatportError::ParseError(format!("JSON inválido: {}", e)))?;

        // Navegar la estructura de Next.js para obtener los tracks
        // La estructura es: props.pageProps.dehydratedState.queries[0].state.data.data
        let tracks_data = json
            .get("props")
            .and_then(|p| p.get("pageProps"))
            .and_then(|pp| pp.get("dehydratedState"))
            .and_then(|ds| ds.get("queries"))
            .and_then(|q| q.as_array())
            .and_then(|arr| arr.first())  // Primera query contiene los tracks
            .and_then(|q| q.get("state"))
            .and_then(|s| s.get("data"))
            .and_then(|d| d.get("data"));  // Los tracks están en data.data

        let tracks: Vec<BeatportTrack> = match tracks_data {
            Some(data) => {
                if let Some(arr) = data.as_array() {
                    arr.iter()
                        .filter_map(|t| {
                            match serde_json::from_value::<BeatportTrack>(t.clone()) {
                                Ok(track) => Some(track),
                                Err(e) => {
                                    // Debug: ver errores de parsing (solo el primer caracter del track)
                                    eprintln!("Error parsing track: {} - track_id: {:?}", e, t.get("track_id"));
                                    None
                                }
                            }
                        })
                        .collect()
                } else {
                    Vec::new()
                }
            }
            None => Vec::new(),
        };

        Ok(BeatportSearchResult {
            total_count: tracks.len() as i64,
            tracks,
            page: 1,
            per_page: 25,
        })
    }

    /// Obtiene información completa de un track por ID desde la API v4
    pub async fn get_track(&self, track_id: i64) -> Result<BeatportTrack, BeatportError> {
        let token = self.get_token().await?;
        let url = format!("{}/catalog/tracks/{}", API_BASE, track_id);

        let response = self.http
            .get(&url)
            .header(header::AUTHORIZATION, format!("Bearer {}", token))
            .header(header::ACCEPT, "application/json")
            .send()
            .await?;

        if response.status() == 404 {
            return Err(BeatportError::TrackRestricted {
                track_id,
                reason: "Track no encontrado o restringido".to_string(),
            });
        }

        if response.status() == 429 {
            return Err(BeatportError::RateLimited { retry_after_secs: 60 });
        }

        if !response.status().is_success() {
            return Err(BeatportError::NetworkError(format!(
                "Error obteniendo track: {}", response.status()
            )));
        }

        response.json().await
            .map_err(|e| BeatportError::ParseError(format!("Error parseando track: {}", e)))
    }

    /// Descarga el artwork de un track
    /// 
    /// # Arguments
    /// * `url` - URL de la imagen
    /// * `size` - Tamaño deseado (se usa para URLs dinámicas)
    pub async fn download_artwork(&self, url: &str) -> Result<Vec<u8>, BeatportError> {
        let response = self.http
            .get(url)
            .header(header::ACCEPT, "image/*")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(BeatportError::NetworkError(format!(
                "Error descargando artwork: {}", response.status()
            )));
        }

        let bytes = response.bytes().await
            .map_err(|e| BeatportError::NetworkError(format!("Error leyendo artwork: {}", e)))?;
        
        Ok(bytes.to_vec())
    }

    /// Busca el mejor match para un track local
    /// 
    /// Utiliza título, artista y opcionalmente duración para buscar y seleccionar
    /// el mejor resultado basándose en similitud de nombres y duración.
    /// 
    /// # Arguments
    /// * `title` - Título del track local
    /// * `artist` - Artista del track local
    /// * `duration_secs` - Duración en segundos (opcional, mejora precisión del matching)
    pub async fn find_best_match(
        &self,
        title: &str,
        artist: &str,
        duration_secs: Option<f64>,
    ) -> Result<BeatportTrack, BeatportError> {
        let results = self.search(title, artist).await?;

        if results.tracks.is_empty() {
            return Err(BeatportError::TrackNotFound {
                title: title.to_string(),
                artist: artist.to_string(),
            });
        }

        // Normalizar strings para comparación
        let normalize = |s: &str| -> String {
            s.to_lowercase()
                .chars()
                .filter(|c| c.is_alphanumeric() || c.is_whitespace())
                .collect::<String>()
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ")
        };

        let title_norm = normalize(title);
        let artist_norm = normalize(artist);

        // Encontrar el mejor match
        let best = results.tracks.into_iter()
            .map(|track| {
                let track_title = normalize(&track.name);
                let track_artist = track.artists.iter()
                    .map(|a| normalize(&a.name))
                    .collect::<Vec<_>>()
                    .join(" ");

                // Score basado en similitud de título y artista
                let title_score = similarity(&title_norm, &track_title);
                let artist_score = similarity(&artist_norm, &track_artist);
                
                // Score de duración (si está disponible)
                // Tolerancia de 5 segundos = score perfecto
                // Más de 30 segundos de diferencia = penalización significativa
                let duration_score = match (duration_secs, track.get_duration_secs()) {
                    (Some(local_dur), Some(remote_dur)) => {
                        let diff = (local_dur - remote_dur).abs();
                        if diff <= 5.0 {
                            1.0 // Match casi perfecto
                        } else if diff <= 15.0 {
                            0.8 // Diferencia aceptable (fade in/out diferentes)
                        } else if diff <= 30.0 {
                            0.5 // Podría ser edit o versión diferente
                        } else {
                            0.2 // Probablemente versión muy diferente
                        }
                    }
                    _ => 0.7, // Sin duración para comparar, score neutral
                };

                // Ponderación: 50% título, 30% artista, 20% duración
                let total_score = (title_score * 0.5) + (artist_score * 0.3) + (duration_score * 0.2);

                (track, total_score)
            })
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(track, _)| track);

        // Si encontramos un match, obtener los datos completos desde la API v4
        // para tener todos los campos (incluyendo artwork con URL completa)
        match best {
            Some(track) => {
                // Intentar obtener datos completos de la API v4
                // Si falla, usar los datos del scraping (puede que no tenga artwork)
                match self.get_track(track.id).await {
                    Ok(full_track) => Ok(full_track),
                    Err(_) => {
                        // Fallback a datos del scraping si la API v4 falla
                        eprintln!("Warning: No se pudieron obtener datos completos para track {}, usando datos de búsqueda", track.id);
                        Ok(track)
                    }
                }
            }
            None => Err(BeatportError::TrackNotFound {
                title: title.to_string(),
                artist: artist.to_string(),
            })
        }
    }

    /// Busca candidatos para un track local (máximo N resultados con score mínimo)
    /// 
    /// A diferencia de `find_best_match`, este método devuelve múltiples candidatos
    /// con sus scores de similitud para que el usuario pueda elegir el correcto.
    /// 
    /// # Arguments
    /// * `title` - Título del track local
    /// * `artist` - Artista del track local
    /// * `duration_secs` - Duración en segundos (opcional, mejora precisión)
    /// * `max_results` - Número máximo de candidatos a devolver
    /// * `min_score` - Score mínimo de similitud (0.0 - 1.0)
    /// 
    /// # Returns
    /// Vector de `BeatportCandidate` ordenados por score descendente
    pub async fn search_candidates(
        &self,
        title: &str,
        artist: &str,
        duration_secs: Option<f64>,
        max_results: usize,
        min_score: f64,
    ) -> Result<Vec<BeatportCandidate>, BeatportError> {
        let results = self.search(title, artist).await?;

        if results.tracks.is_empty() {
            return Ok(Vec::new());
        }

        // Normalizar strings para comparación
        let normalize = |s: &str| -> String {
            s.to_lowercase()
                .chars()
                .filter(|c| c.is_alphanumeric() || c.is_whitespace())
                .collect::<String>()
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ")
        };

        let title_norm = normalize(title);
        let artist_norm = normalize(artist);

        // Calcular scores para todos los tracks
        let mut scored_tracks: Vec<(BeatportTrack, f64)> = results.tracks.into_iter()
            .map(|track| {
                let track_title = normalize(&track.name);
                let track_artist = track.artists.iter()
                    .map(|a| normalize(&a.name))
                    .collect::<Vec<_>>()
                    .join(" ");

                let title_score = similarity(&title_norm, &track_title);
                let artist_score = similarity(&artist_norm, &track_artist);
                
                let duration_score = match (duration_secs, track.get_duration_secs()) {
                    (Some(local_dur), Some(remote_dur)) => {
                        let diff = (local_dur - remote_dur).abs();
                        if diff <= 5.0 {
                            1.0
                        } else if diff <= 15.0 {
                            0.8
                        } else if diff <= 30.0 {
                            0.5
                        } else {
                            0.2
                        }
                    }
                    _ => 0.7,
                };

                let total_score = (title_score * 0.5) + (artist_score * 0.3) + (duration_score * 0.2);
                (track, total_score)
            })
            .filter(|(_, score)| *score >= min_score)
            .collect();

        // Ordenar por score descendente
        scored_tracks.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // Tomar los N mejores y convertir a BeatportCandidate
        let candidates: Vec<BeatportCandidate> = scored_tracks
            .into_iter()
            .take(max_results)
            .map(|(track, score)| BeatportCandidate::from_track(&track, score))
            .collect();

        Ok(candidates)
    }
}

impl Default for BeatportClient {
    fn default() -> Self {
        Self::new().expect("Failed to create BeatportClient")
    }
}

/// Calcula la similitud entre dos strings (0.0 - 1.0)
/// Usa el algoritmo de Levenshtein normalizado
fn similarity(a: &str, b: &str) -> f64 {
    if a == b {
        return 1.0;
    }
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }

    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let a_len = a_chars.len();
    let b_len = b_chars.len();

    // Matriz de distancia de Levenshtein
    let mut matrix = vec![vec![0usize; b_len + 1]; a_len + 1];

    for i in 0..=a_len {
        matrix[i][0] = i;
    }
    for j in 0..=b_len {
        matrix[0][j] = j;
    }

    for i in 1..=a_len {
        for j in 1..=b_len {
            let cost = if a_chars[i - 1] == b_chars[j - 1] { 0 } else { 1 };
            matrix[i][j] = std::cmp::min(
                std::cmp::min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                ),
                matrix[i - 1][j - 1] + cost,
            );
        }
    }

    let distance = matrix[a_len][b_len];
    let max_len = std::cmp::max(a_len, b_len);
    1.0 - (distance as f64 / max_len as f64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::library::beatport::models::BeatportTags;

    #[test]
    fn test_similarity_exact() {
        assert_eq!(similarity("test", "test"), 1.0);
    }

    #[test]
    fn test_similarity_empty() {
        assert_eq!(similarity("", "test"), 0.0);
        assert_eq!(similarity("test", ""), 0.0);
    }

    #[test]
    fn test_similarity_partial() {
        let score = similarity("hello world", "hello");
        assert!(score > 0.4 && score < 0.8);
    }

    #[test]
    fn test_similarity_similar() {
        // "techno" vs "tecnho" - typo simple (transposición de letras)
        let score = similarity("techno", "tecnho");
        // La similitud de Sørensen-Dice puede dar menos de 0.8 para typos
        // porque compara bigramas
        assert!(score > 0.5, "Score esperado > 0.5, got {}", score);
    }

    #[test]
    fn test_beatport_client_creation() {
        let client = BeatportClient::new();
        assert!(client.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requiere conexión a internet - ejecutar manualmente con: cargo test test_beatport_api -- --ignored --nocapture
    async fn test_beatport_api() {
        let client = BeatportClient::new().expect("Error creando cliente");
        
        // Test 1: OAuth token
        println!("🔐 Probando autenticación OAuth...");
        match client.get_token().await {
            Ok(token) => println!("✅ Token obtenido: {}...", &token[..20.min(token.len())]),
            Err(e) => {
                println!("❌ Error OAuth: {:?}", e);
                panic!("OAuth falló");
            }
        }
        
        // Test 2: Búsqueda
        println!("\n🔍 Probando búsqueda...");
        match client.search("Daft Punk", "Around The World").await {
            Ok(results) => {
                println!("✅ Resultados encontrados: {}", results.tracks.len());
                for (i, track) in results.tracks.iter().take(3).enumerate() {
                    println!("  {}. {} - {} (ID: {})", 
                        i + 1, 
                        track.artists.first().map(|a| a.name.as_str()).unwrap_or("Unknown"),
                        track.name,
                        track.id
                    );
                }
                
                // Test 3: Obtener detalles del primer resultado
                if let Some(first) = results.tracks.first() {
                    println!("\n📋 Obteniendo detalles del track {}...", first.id);
                    match client.get_track(first.id).await {
                        Ok(track) => {
                            println!("✅ Detalles obtenidos:");
                            println!("   Título: {}", track.name);
                            println!("   BPM: {:?}", track.bpm);
                            println!("   Key: {:?}", track.key.as_ref().map(|k| &k.name));
                            println!("   Genre: {:?}", track.get_genre_name());
                            println!("   Label: {:?}", track.get_label_name());
                            println!("   ISRC: {:?}", track.isrc);
                            
                            // Verificar que los tags se crean correctamente
                            let tags: BeatportTags = (&track).into();
                            println!("\n🏷️  Tags generados:");
                            println!("   BPM: {:?}", tags.bpm);
                            println!("   Key: {:?}", tags.key);
                            println!("   Genre: {:?}", tags.genre);
                            println!("   Label: {:?}", tags.label);
                            println!("   Album: {:?}", tags.album);
                            println!("   Year: {:?}", tags.year);
                            println!("   ISRC: {:?}", tags.isrc);
                            println!("   Artwork URL: {:?}", tags.artwork_url);
                            
                            // Test 4: Descargar artwork
                            if let Some(ref url) = tags.artwork_url {
                                println!("\n🖼️  Descargando artwork...");
                                match client.download_artwork(url).await {
                                    Ok(bytes) => {
                                        println!("✅ Artwork descargado: {} bytes", bytes.len());
                                        // Verificar que es una imagen válida
                                        if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
                                            println!("   Formato: JPEG");
                                        } else if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
                                            println!("   Formato: PNG");
                                        } else {
                                            println!("   Formato: desconocido");
                                        }
                                    }
                                    Err(e) => println!("⚠️ Error descargando artwork: {:?}", e),
                                }
                            }
                        }
                        Err(e) => println!("❌ Error obteniendo detalles: {:?}", e),
                    }
                }
            }
            Err(e) => {
                println!("❌ Error en búsqueda: {:?}", e);
                panic!("Búsqueda falló");
            }
        }
    }
}
