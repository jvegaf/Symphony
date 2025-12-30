//! Consolidación y mantenimiento de biblioteca

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::Path;
use walkdir::WalkDir;

use crate::library::metadata::MetadataExtractor;

/// Resultado de consolidación de biblioteca
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsolidateLibraryResult {
    pub orphans_removed: usize,
    pub duplicates_removed: usize,
    pub new_tracks_added: usize,
    pub total_tracks: usize,
    pub initial_tracks: usize,
}

/// Consolida la biblioteca: elimina huérfanos, duplicados y agrega archivos nuevos
pub fn consolidate_library(
    conn: &Connection,
    library_paths: &[String],
) -> Result<ConsolidateLibraryResult> {
    // 1. Contar tracks iniciales
    let initial_tracks: usize = conn.query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get(0))?;

    // 2. Obtener todos los tracks y verificar si existen físicamente
    let mut stmt = conn.prepare("SELECT id, path FROM tracks")?;
    let tracks: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<_>>>()?;

    // 3. Encontrar huérfanos (archivos que ya no existen)
    let mut orphaned_ids = Vec::new();
    for (id, path) in &tracks {
        if !Path::new(path).exists() {
            orphaned_ids.push(id.clone());
        }
    }

    // 4. Eliminar tracks huérfanos
    let orphans_removed = orphaned_ids.len();
    for id in orphaned_ids {
        conn.execute("DELETE FROM tracks WHERE id = ?1", [&id])?;
    }

    // 5. Obtener tracks restantes ordenados por fecha de creación
    let mut stmt = conn.prepare("SELECT id, path, date_added FROM tracks ORDER BY date_added")?;
    let remaining_tracks: Vec<(String, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>>>()?;

    // 6. Detectar duplicados (mismo path)
    let mut seen_paths: HashSet<String> = HashSet::new();
    let mut duplicate_ids = Vec::new();

    for (id, path, _) in remaining_tracks {
        if seen_paths.contains(&path) {
            duplicate_ids.push(id);
        } else {
            seen_paths.insert(path);
        }
    }

    // 7. Eliminar duplicados
    let duplicates_removed = duplicate_ids.len();
    for id in duplicate_ids {
        conn.execute("DELETE FROM tracks WHERE id = ?1", [&id])?;
    }

    // 8. Construir conjunto de paths existentes en la BD
    let mut stmt = conn.prepare("SELECT path FROM tracks")?;
    let existing_paths: HashSet<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<Result<HashSet<_>>>()?;

    // 9. Escanear carpetas de biblioteca en busca de archivos nuevos
    let supported_extensions = ["mp3", "flac", "wav", "ogg", "m4a", "aac"];
    let mut new_files: Vec<std::path::PathBuf> = Vec::new();

    for library_path in library_paths {
        for entry in WalkDir::new(library_path)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if supported_extensions.contains(&ext.to_str().unwrap_or("").to_lowercase().as_str()) {
                        let path_str = path.to_string_lossy().to_string();
                        if !existing_paths.contains(&path_str) {
                            new_files.push(path.to_path_buf());
                        }
                    }
                }
            }
        }
    }

    // 10. Importar archivos nuevos
    let mut new_tracks_added = 0;
    for file_path in new_files {
        // Crear MetadataExtractor en scope aislado para evitar memory corruption
        let metadata_result = {
            let mut extractor = MetadataExtractor::new();
            extractor.extract_metadata(&file_path)
        };

        if let Ok(metadata) = metadata_result {
            // Generar UUID para el nuevo track
            let id = uuid::Uuid::new_v4().to_string();

            // Obtener tamaño de archivo
            let file_size = std::fs::metadata(&file_path)
                .map(|m| m.len() as i64)
                .unwrap_or(0);

            // Insertar nuevo track
            let path_str = file_path.to_string_lossy();
            let insert_result = conn.execute(
                "INSERT INTO tracks (
                    id, path, title, artist, album, genre, year,
                    duration, bitrate, sample_rate, file_size,
                    bpm, key, rating, play_count, last_played,
                    date_added
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, CURRENT_TIMESTAMP)",
                params![
                    id,
                    path_str.as_ref(),
                    metadata.title.as_deref().unwrap_or("Unknown"),
                    metadata.artist,
                    metadata.album,
                    metadata.genre,
                    metadata.year,
                    metadata.duration,
                    metadata.bitrate,
                    metadata.sample_rate,
                    file_size,
                    metadata.bpm,
                    metadata.key,
                    0, // rating inicial
                    0, // play_count inicial
                    None::<String>, // last_played
                ],
            );

            if insert_result.is_ok() {
                new_tracks_added += 1;
            }
        }
    }

    // 11. Optimizar base de datos
    conn.execute("VACUUM", [])?;
    conn.execute("ANALYZE", [])?;

    // 12. Contar tracks finales
    let total_tracks: usize = conn.query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get(0))?;

    Ok(ConsolidateLibraryResult {
        orphans_removed,
        duplicates_removed,
        new_tracks_added,
        total_tracks,
        initial_tracks,
    })
}
