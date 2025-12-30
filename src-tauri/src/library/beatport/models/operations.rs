/**
 * Tipos relacionados con operaciones fix_tags de Beatport
 * 
 * Incluye: FixTagsResult, BatchFixResult, FixTagsProgress, FixTagsPhase
 */

use serde::{Deserialize, Serialize};

use super::tags::BeatportTags;

/// Resultado de fix_tags para un track individual
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixTagsResult {
    pub track_id: String,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub beatport_track_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags_applied: Option<BeatportTags>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl FixTagsResult {
    /// Crea un resultado exitoso
    pub fn success(track_id: String, beatport_id: i64, tags: BeatportTags) -> Self {
        Self {
            track_id,
            success: true,
            beatport_track_id: Some(beatport_id),
            tags_applied: Some(tags),
            error: None,
        }
    }

    /// Crea un resultado de error
    pub fn error(track_id: String, error: String) -> Self {
        Self {
            track_id,
            success: false,
            beatport_track_id: None,
            tags_applied: None,
            error: Some(error),
        }
    }
}

/// Resultado de batch fix_tags
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchFixResult {
    pub total: usize,
    pub success_count: usize,
    pub failed_count: usize,
    pub results: Vec<FixTagsResult>,
}

impl BatchFixResult {
    pub fn new(results: Vec<FixTagsResult>) -> Self {
        let total = results.len();
        let success_count = results.iter().filter(|r| r.success).count();
        let failed_count = total - success_count;
        
        Self {
            total,
            success_count,
            failed_count,
            results,
        }
    }
}

/// Evento de progreso para UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixTagsProgress {
    pub current: usize,
    pub total: usize,
    pub current_track_title: String,
    pub phase: FixTagsPhase,
}

/// Fases del proceso fix_tags
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FixTagsPhase {
    Searching,
    Downloading,
    ApplyingTags,
    Complete,
}
