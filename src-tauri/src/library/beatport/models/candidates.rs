/**
 * Tipos relacionados con selección manual de candidatos de Beatport
 * 
 * Incluye: BeatportCandidate, TrackCandidates, TrackSelection, SearchCandidatesResult
 */

use serde::{Deserialize, Serialize};

use super::track::BeatportTrack;

/// Candidato de Beatport para un track local
/// Contiene información resumida para mostrar en la UI de selección
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatportCandidate {
    /// ID del track en Beatport
    pub beatport_id: i64,
    /// Título del track
    pub title: String,
    /// Mix name (Original Mix, Extended Mix, etc.)
    pub mix_name: Option<String>,
    /// Artistas concatenados
    pub artists: String,
    /// BPM detectado
    pub bpm: Option<f64>,
    /// Key musical
    pub key: Option<String>,
    /// Duración en segundos
    pub duration_secs: Option<f64>,
    /// URL del artwork (thumbnail para UI)
    pub artwork_url: Option<String>,
    /// Score de similitud (0.0 - 1.0)
    pub similarity_score: f64,
    /// Género
    pub genre: Option<String>,
    /// Label/Sello
    pub label: Option<String>,
    /// Fecha de publicación (YYYY-MM-DD)
    pub release_date: Option<String>,
}

impl BeatportCandidate {
    /// Crea un candidato desde un BeatportTrack con su score de similitud
    pub fn from_track(track: &BeatportTrack, score: f64) -> Self {
        let artists = track.artists.iter()
            .map(|a| a.name.clone())
            .collect::<Vec<_>>()
            .join(", ");
        
        Self {
            beatport_id: track.id,
            title: track.name.clone(),
            mix_name: track.mix_name.clone(),
            artists,
            bpm: track.bpm,
            key: track.get_key_name(),
            duration_secs: track.get_duration_secs(),
            artwork_url: track.get_artwork_url(100), // Thumbnail pequeño
            similarity_score: score,
            genre: track.get_genre_name(),
            label: track.get_label_name(),
            release_date: track.publish_date.clone(),
        }
    }
}

/// Candidatos de Beatport para un track local
/// Agrupa el track local con sus posibles matches de Beatport
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackCandidates {
    /// ID del track local en Symphony
    pub local_track_id: String,
    /// Título del track local
    pub local_title: String,
    /// Artista del track local
    pub local_artist: String,
    /// Nombre del archivo local
    pub local_filename: Option<String>,
    /// Duración del track local en segundos
    pub local_duration: Option<f64>,
    /// Lista de candidatos de Beatport (máximo 4)
    pub candidates: Vec<BeatportCandidate>,
    /// Indica si hubo error al buscar
    pub error: Option<String>,
}

impl TrackCandidates {
    /// Crea un TrackCandidates con candidatos encontrados
    pub fn with_candidates(
        local_track_id: String,
        local_title: String,
        local_artist: String,
        local_filename: Option<String>,
        local_duration: Option<f64>,
        candidates: Vec<BeatportCandidate>,
    ) -> Self {
        Self {
            local_track_id,
            local_title,
            local_artist,
            local_filename,
            local_duration,
            candidates,
            error: None,
        }
    }

    /// Crea un TrackCandidates con error
    pub fn with_error(
        local_track_id: String,
        local_title: String,
        local_artist: String,
        local_filename: Option<String>,
        local_duration: Option<f64>,
        error: String,
    ) -> Self {
        Self {
            local_track_id,
            local_title,
            local_artist,
            local_filename,
            local_duration,
            candidates: Vec::new(),
            error: Some(error),
        }
    }
}

/// Selección del usuario para un track
/// El usuario elige qué candidato de Beatport usar (o ninguno)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackSelection {
    /// ID del track local en Symphony
    pub local_track_id: String,
    /// ID del track de Beatport seleccionado (None = "No está en Beatport")
    pub beatport_track_id: Option<i64>,
}

/// Resultado de búsqueda de candidatos para múltiples tracks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchCandidatesResult {
    /// Candidatos por cada track
    pub tracks: Vec<TrackCandidates>,
    /// Total de tracks procesados
    pub total: usize,
    /// Tracks con al menos un candidato
    pub with_candidates: usize,
    /// Tracks sin candidatos encontrados
    pub without_candidates: usize,
}
