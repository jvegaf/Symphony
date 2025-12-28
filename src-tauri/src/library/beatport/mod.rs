/**
 * Módulo de integración con Beatport
 * 
 * Proporciona funcionalidad para buscar tracks en Beatport y aplicar
 * metadatos automáticamente a archivos de audio locales.
 */

pub mod client;
pub mod error;
pub mod models;
pub mod tagger;

pub use client::BeatportClient;
pub use error::BeatportError;
pub use models::{
    BatchFixResult, BeatportCandidate, BeatportTags, FixTagsPhase, FixTagsProgress, 
    FixTagsResult, SearchCandidatesResult, TrackCandidates, TrackSelection,
};
pub use tagger::BeatportTagger;
