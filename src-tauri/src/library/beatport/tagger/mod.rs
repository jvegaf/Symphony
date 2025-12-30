/**
 * Tagger de Beatport
 * 
 * Coordina la búsqueda en Beatport y la aplicación de tags a archivos locales.
 * 
 * ## Módulos
 * 
 * - **core**: BeatportTagger struct con métodos principales
 * - **merge**: Lógica de merge de tags (reglas de prioridad)
 * - **writer**: Escritura de tags y artwork a archivos (lofty)
 * 
 * ## Reglas de Merge
 * 
 * - **Title**: Siempre se aplica (corrige nombres mal escritos)
 * - **Artist**: Siempre se aplica (corrige artistas incorrectos)
 * - **Genre**: Siempre se aplica (corrige géneros incorrectos)
 * - **Key**: Siempre se aplica (reemplaza el existente)
 * - **Album**: Siempre se aplica (corrige álbumes)
 * - **Year**: Siempre se aplica (corrige años)
 * - **BPM**: Solo se aplica si el track local NO tiene BPM
 * - **Label, ISRC**: Siempre se aplican (generalmente no existen en local)
 * - **Artwork**: Siempre se aplica si está disponible
 */

mod core;
mod merge;
mod writer;

// Re-exports públicos
pub use core::BeatportTagger;
