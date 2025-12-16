/// Módulo de queries separado por responsabilidades
/// 
/// AIDEV-NOTE: Refactorizado desde queries.rs monolítico (2115 líneas)
/// a módulos especializados (~300-450 líneas cada uno)

pub mod tracks;
pub mod playlists;
pub mod analysis;

// Re-exportar las funciones principales para compatibilidad
pub use tracks::*;
pub use playlists::*;
pub use analysis::*;
