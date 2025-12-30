/// Módulo de algoritmo de matching para encontrar el mejor candidato

use reqwest::Client;
use std::sync::Arc;
use tokio::sync::Mutex;

use super::super::error::BeatportError;
use super::super::models::{BeatportCandidate, BeatportOAuth, BeatportTrack};
use super::{api, search};

/// Normaliza un string para comparación (lowercase + alphanumeric + whitespace)
fn normalize(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Calcula la similitud entre dos strings usando Levenshtein (0.0 - 1.0)
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

/// Calcula el score de duración entre dos tracks
fn duration_score(local_dur_opt: Option<f64>, remote_dur_opt: Option<f64>) -> f64 {
    match (local_dur_opt, remote_dur_opt) {
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
    }
}

/// Encuentra el mejor match para un track local (matching automático)
pub async fn find_best_match(
    http: &Client,
    oauth: &Arc<Mutex<Option<BeatportOAuth>>>,
    title: &str,
    artist: &str,
    duration_secs: Option<f64>,
) -> Result<BeatportTrack, BeatportError> {
    let results = search::search(http, oauth, title, artist).await?;

    if results.tracks.is_empty() {
        return Err(BeatportError::TrackNotFound {
            title: title.to_string(),
            artist: artist.to_string(),
        });
    }

    // Normalizar strings para comparación
    let title_norm = normalize(title);
    let artist_norm = normalize(artist);

    // Calcular scores y encontrar mejor match
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
            let dur_score = duration_score(duration_secs, track.get_duration_secs());

            // Ponderación: 50% título, 30% artista, 20% duración
            let total_score = (title_score * 0.5) + (artist_score * 0.3) + (dur_score * 0.2);

            (track, total_score)
        })
        .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(track, _)| track);

    // Si encontramos un match, obtener los datos completos desde la API v4
    match best {
        Some(track) => {
            // Intentar obtener datos completos de la API v4
            match api::get_track(http, oauth, track.id).await {
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
pub async fn search_candidates(
    http: &Client,
    oauth: &Arc<Mutex<Option<BeatportOAuth>>>,
    title: &str,
    artist: &str,
    duration_secs: Option<f64>,
    max_results: usize,
    min_score: f64,
) -> Result<Vec<BeatportCandidate>, BeatportError> {
    let results = search::search(http, oauth, title, artist).await?;

    if results.tracks.is_empty() {
        return Ok(Vec::new());
    }

    // Normalizar strings para comparación
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
            let dur_score = duration_score(duration_secs, track.get_duration_secs());

            let total_score = (title_score * 0.5) + (artist_score * 0.3) + (dur_score * 0.2);
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

#[cfg(test)]
mod tests {
    use super::*;

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
        let score = similarity("techno", "tecnho");
        assert!(score > 0.5, "Score esperado > 0.5, got {}", score);
    }
}
