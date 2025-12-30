/**
 * Sistema de migraciones de base de datos
 * 
 * ## Estructura
 * 
 * - **schema.rs**: Definiciones de esquema SQL (5 migraciones)
 * - **runner.rs**: Ejecución de migraciones y control de versiones
 * 
 * ## Versiones
 * 
 * - v1: Esquema inicial (tracks, playlists, análisis)
 * - v2: Actualización de tablas de análisis (beatgrids, cue_points, loops)
 * - v3: Migración a UUIDs (TEXT en lugar de INTEGER)
 * - v4: Campos Beatport (label, isrc)
 * - v5: Campo beatport_id para tracking
 * 
 * ## Uso
 * 
 * ```rust
 * use crate::db::migrations::run_migrations;
 * 
 * let conn = get_connection()?;
 * run_migrations(&conn)?;
 * ```
 */

mod schema;
mod runner;

// Re-exportar función pública
pub use runner::run_migrations;
