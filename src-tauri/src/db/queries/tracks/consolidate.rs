//! Consolidación y mantenimiento de biblioteca

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::Path;
use walkdir::WalkDir;

use crate::library::metadata::MetadataExtractor;
use crate::utils::extract_date_from_path;

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

    log::info!("📂 Escaneando {} carpetas de biblioteca...", library_paths.len());
    for library_path in library_paths {
        log::info!("📂 Escaneando: {}", library_path);
        let mut files_in_folder = 0;
        for entry in WalkDir::new(library_path)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if supported_extensions.contains(&ext.to_str().unwrap_or("").to_lowercase().as_str()) {
                        files_in_folder += 1;
                        let path_str = path.to_string_lossy().to_string();
                        if !existing_paths.contains(&path_str) {
                            new_files.push(path.to_path_buf());
                        }
                    }
                }
            }
        }
        log::info!("📂 Encontrados {} archivos de audio en {}", files_in_folder, library_path);
    }
    log::info!("🆕 Total de archivos nuevos a importar: {}", new_files.len());

    // 10. Importar archivos nuevos
    // AIDEV-NOTE: Si falla la extracción de metadatos (ej: UTF-16 BOM corrupto),
    // igual importamos el archivo con metadatos básicos del nombre de archivo
    let mut new_tracks_added = 0;
    let mut metadata_errors = 0;
    let mut insert_errors = 0;
    
    for file_path in new_files.iter() {
        
        // Crear MetadataExtractor en scope aislado para evitar memory corruption
        let metadata_result = {
            let extractor = MetadataExtractor::new();
            extractor.extract_metadata(file_path)
        };

        // Generar UUID para el nuevo track
        let id = uuid::Uuid::new_v4().to_string();
        let path_str = file_path.to_string_lossy();
        
        // Obtener tamaño de archivo
        let file_size = std::fs::metadata(file_path)
            .map(|m| m.len() as i64)
            .unwrap_or(0);

        // Extraer título del nombre de archivo como fallback
        let fallback_title = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown")
            .to_string();

        // AIDEV-NOTE: Extraer date_added del path YYMM (ej: /Music/BOX/2402/ -> 2024-02)
        // Si no se encuentra patrón YYMM válido, usar fecha actual
        let date_added = extract_date_from_path(file_path)
            .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m").to_string());

        // Preparar valores para inserción (usar metadata si disponible, sino fallback)
        // AIDEV-NOTE: artist es NOT NULL en la BD, por eso usamos unwrap_or
        let (title, artist, album, genre, year, duration, bitrate, sample_rate, bpm, key) = 
            match &metadata_result {
                Ok(metadata) => (
                    metadata.title.as_deref().unwrap_or(&fallback_title).to_string(),
                    metadata.artist.clone().unwrap_or_else(|| "Unknown".to_string()),
                    metadata.album.clone(),
                    metadata.genre.clone(),
                    metadata.year,
                    metadata.duration,
                    metadata.bitrate,
                    metadata.sample_rate,
                    metadata.bpm,
                    metadata.key.clone(),
                ),
                Err(e) => {
                    metadata_errors += 1;
                    if metadata_errors <= 5 {
                        log::warn!("⚠️ Metadata corrupta, usando fallback para {:?}: {}", 
                            file_path.file_name(), e);
                    }
                    // Fallback: usar nombre de archivo como título, "Unknown" para artist
                    // AIDEV-NOTE: La BD requiere artist NOT NULL
                    (
                        fallback_title,
                        "Unknown".to_string(),  // artist - NOT NULL en BD
                        None,  // album
                        None,  // genre
                        None,  // year
                        0.0,   // duration - se puede calcular después
                        0,     // bitrate
                        44100, // sample_rate default
                        None,  // bpm
                        None,  // key
                    )
                }
            };

        // Insertar nuevo track (funciona tanto con metadata completa como fallback)
        // AIDEV-NOTE: date_added viene del path YYMM, date_modified es CURRENT_TIMESTAMP
        let insert_result = conn.execute(
            "INSERT INTO tracks (
                id, path, title, artist, album, genre, year,
                duration, bitrate, sample_rate, file_size,
                bpm, key, rating, play_count, last_played,
                date_added, date_modified
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, CURRENT_TIMESTAMP)",
            params![
                id,
                path_str.as_ref(),
                title,
                artist,
                album,
                genre,
                year,
                duration,
                bitrate,
                sample_rate,
                file_size,
                bpm,
                key,
                0, // rating inicial
                0, // play_count inicial
                None::<String>, // last_played
                date_added, // extraído del path YYMM
            ],
        );

        match insert_result {
            Ok(_) => new_tracks_added += 1,
            Err(e) => {
                insert_errors += 1;
                if insert_errors <= 5 {
                    log::warn!("❌ Error al insertar {}: {}", path_str, e);
                }
            }
        }
    }
    
    if metadata_errors > 0 {
        log::info!("⚠️ {} archivos importados con metadata básica (de {} nuevos)", metadata_errors, new_files.len());
    }
    if insert_errors > 0 {
        log::warn!("❌ Total errores de inserción: {} de {} archivos", insert_errors, new_files.len());
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
