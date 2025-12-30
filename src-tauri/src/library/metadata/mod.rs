/// Módulos de extracción y escritura de metadatos de audio
///
/// AIDEV-NOTE: Este módulo refactoriza metadata.rs (995 líneas) dividiéndolo
/// por responsabilidad funcional para mejor mantenibilidad

pub mod artwork;
pub mod extractor;
pub mod helpers;
pub mod models;
pub mod writer;

// Re-exports públicos
pub use artwork::{extract_artwork, picture_to_data_uri};
pub use extractor::MetadataExtractor;
pub use models::TrackMetadata;
pub use writer::{write_metadata, write_rating_to_mp3_file};
