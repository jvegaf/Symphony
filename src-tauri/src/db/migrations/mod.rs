mod runner;
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
 * ```no_run
 * use symphony_lib::db::migrations::run_migrations;
 * use symphony_lib::db::get_connection;
 *
 * let db = get_connection()?;
 * run_migrations(&db.conn)?;
 * # Ok::<(), Box<dyn std::error::Error>>(())
 * ```
 */
mod schema;

// Re-exportar función pública
pub use runner::run_migrations;
