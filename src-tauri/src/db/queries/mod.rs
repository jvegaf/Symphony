pub mod analysis;
pub mod playlists;
/// Módulo de queries separado por responsabilidades
///
/// AIDEV-NOTE: Refactorizado desde queries.rs monolítico (2115 líneas)
/// a módulos especializados (~300-450 líneas cada uno)
pub mod tracks;

// Re-exportar las funciones principales para compatibilidad
pub use analysis::*;
pub use playlists::*;
pub use tracks::*;
