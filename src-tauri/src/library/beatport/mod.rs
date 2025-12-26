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
    BatchFixResult, BeatportTags, FixTagsPhase, FixTagsProgress, FixTagsResult,
};
pub use tagger::BeatportTagger;
