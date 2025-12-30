/// Cliente HTTP para la API de Beatport
/// 
/// Proporciona funcionalidades para:
/// - Obtener tokens OAuth anónimos desde HTML
/// - Buscar tracks mediante scraping de HTML
/// - Obtener detalles de tracks desde API v4
/// - Descargar artwork
/// - Algoritmo de matching para encontrar candidatos

mod api;
mod artwork;
mod auth;
mod matching;
mod search;

use reqwest::Client;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;

use super::error::BeatportError;
use super::models::{BeatportCandidate, BeatportOAuth, BeatportSearchResult, BeatportTrack};

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/// Cliente HTTP para interactuar con Beatport
pub struct BeatportClient {
    http: Client,
    oauth: Arc<Mutex<Option<BeatportOAuth>>>,
}

impl BeatportClient {
    /// Crea una nueva instancia del cliente
    pub fn new() -> Result<Self, BeatportError> {
        let http = Client::builder()
            .user_agent(USER_AGENT)
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| BeatportError::NetworkError(format!("Error creating HTTP client: {}", e)))?;

        Ok(Self {
            http,
            oauth: Arc::new(Mutex::new(None)),
        })
    }

    /// Obtiene un token OAuth válido
    pub async fn get_token(&self) -> Result<String, BeatportError> {
        auth::get_token(&self.http, &self.oauth).await
    }

    /// Busca tracks en Beatport
    pub async fn search(&self, title: &str, artist: &str) -> Result<BeatportSearchResult, BeatportError> {
        search::search(&self.http, &self.oauth, title, artist).await
    }

    /// Obtiene los detalles completos de un track desde la API v4
    pub async fn get_track(&self, track_id: i64) -> Result<BeatportTrack, BeatportError> {
        api::get_track(&self.http, &self.oauth, track_id).await
    }

    /// Descarga una imagen (artwork) desde una URL
    pub async fn download_artwork(&self, url: &str) -> Result<Vec<u8>, BeatportError> {
        artwork::download_artwork(&self.http, url).await
    }

    /// Encuentra el mejor match para un track local (matching automático)
    /// 
    /// # Arguments
    /// * `title` - Título del track local
    /// * `artist` - Artista del track local
    /// * `duration_secs` - Duración en segundos (opcional, mejora precisión)
    /// 
    /// # Returns
    /// El track de Beatport con mejor score de similitud
    pub async fn find_best_match(
        &self,
        title: &str,
        artist: &str,
        duration_secs: Option<f64>,
    ) -> Result<BeatportTrack, BeatportError> {
        matching::find_best_match(&self.http, &self.oauth, title, artist, duration_secs).await
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
        matching::search_candidates(
            &self.http,
            &self.oauth,
            title,
            artist,
            duration_secs,
            max_results,
            min_score,
        )
        .await
    }
}

impl Default for BeatportClient {
    fn default() -> Self {
        Self::new().expect("Failed to create BeatportClient")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::library::beatport::models::BeatportTags;

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
