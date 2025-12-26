/**
 * Comandos Tauri para integración con Beatport
 * 
 * Expone la funcionalidad de fix_tags al frontend, permitiendo
 * corregir metadatos de tracks buscando en Beatport.
 */

use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

use crate::db::{queries, get_connection};
use crate::library::beatport::{
    BatchFixResult, BeatportClient, BeatportTagger, FixTagsPhase, FixTagsProgress, FixTagsResult,
};
use crate::commands::library::LibraryState;

/// Arregla los tags de múltiples tracks buscando en Beatport
/// 
/// # Arguments
/// * `track_ids` - Vector de IDs de tracks a procesar
/// 
/// # Events
/// Emite `beatport:progress` con el progreso de cada track
/// 
/// # Returns
/// `BatchFixResult` con el resumen de la operación
#[tauri::command]
pub async fn fix_tags(
    app: AppHandle,
    _library_state: State<'_, LibraryState>,
    track_ids: Vec<String>,
) -> Result<BatchFixResult, String> {
    let total = track_ids.len();
    
    if total == 0 {
        return Err("No se seleccionaron tracks".to_string());
    }

    // Crear cliente Beatport
    let client = Arc::new(
        BeatportClient::new().map_err(|e| format!("Error creando cliente Beatport: {}", e))?
    );
    let tagger = BeatportTagger::new(client);

    let mut results: Vec<FixTagsResult> = Vec::with_capacity(total);

    // Procesar cada track
    for (index, track_id) in track_ids.iter().enumerate() {
        // Obtener información del track desde la base de datos
        let track = {
            let db = get_connection().map_err(|e| e.to_string())?;
            queries::get_track(&db.conn, track_id)
                .map_err(|e| format!("Error obteniendo track {}: {}", track_id, e))?
        };

        // Emitir progreso - fase de búsqueda
        let progress = FixTagsProgress {
            current: index + 1,
            total,
            current_track_title: track.title.clone(),
            phase: FixTagsPhase::Searching,
        };
        let _ = app.emit("beatport:progress", &progress);

        // Procesar el track
        let file_path = Path::new(&track.path);
        
        let result = tagger.fix_track(
            track_id,
            file_path,
            &track.title,
            &track.artist,
            Some(track.duration), // Duración para mejor matching
            track.bpm,
            track.key.as_deref(),
            track.genre.as_deref(),
            track.album.as_deref(),
            track.year,
        ).await;

        // Si fue exitoso, actualizar la base de datos
        if result.success {
            if let Some(ref tags) = result.tags_applied {
                let update_result = update_track_in_db(
                    track_id,
                    tags,
                    track.bpm, // Pasamos el BPM actual para la lógica de merge en DB
                );
                
                if let Err(e) = update_result {
                    eprintln!("Warning: No se pudo actualizar DB para {}: {}", track_id, e);
                }
            }
        }

        results.push(result);

        // Emitir progreso - fase completada
        let progress = FixTagsProgress {
            current: index + 1,
            total,
            current_track_title: track.title.clone(),
            phase: if index + 1 == total { FixTagsPhase::Complete } else { FixTagsPhase::ApplyingTags },
        };
        let _ = app.emit("beatport:progress", &progress);

        // Pequeña pausa entre requests para evitar rate limiting
        if index + 1 < total {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }
    }

    Ok(BatchFixResult::new(results))
}

/// Busca y aplica SOLO el artwork de múltiples tracks desde Beatport
/// 
/// # Arguments
/// * `track_ids` - Vector de IDs de tracks a procesar
/// 
/// # Events
/// Emite `beatport:progress` con el progreso de cada track
/// 
/// # Returns
/// `BatchFixResult` con el resumen de la operación
#[tauri::command]
pub async fn find_artwork(
    app: AppHandle,
    _library_state: State<'_, LibraryState>,
    track_ids: Vec<String>,
) -> Result<BatchFixResult, String> {
    let total = track_ids.len();
    
    if total == 0 {
        return Err("No se seleccionaron tracks".to_string());
    }

    // Crear cliente Beatport
    let client = Arc::new(
        BeatportClient::new().map_err(|e| format!("Error creando cliente Beatport: {}", e))?
    );
    let tagger = BeatportTagger::new(client);

    let mut results: Vec<FixTagsResult> = Vec::with_capacity(total);

    // Procesar cada track
    for (index, track_id) in track_ids.iter().enumerate() {
        // Obtener información del track desde la base de datos
        let track = {
            let db = get_connection().map_err(|e| e.to_string())?;
            queries::get_track(&db.conn, track_id)
                .map_err(|e| format!("Error obteniendo track {}: {}", track_id, e))?
        };

        // Emitir progreso - fase de búsqueda
        let progress = FixTagsProgress {
            current: index + 1,
            total,
            current_track_title: track.title.clone(),
            phase: FixTagsPhase::Searching,
        };
        let _ = app.emit("beatport:progress", &progress);

        // Procesar el track - SOLO artwork
        let file_path = Path::new(&track.path);
        
        let result = tagger.find_artwork_only(
            track_id,
            file_path,
            &track.title,
            &track.artist,
            Some(track.duration),
        ).await;

        results.push(result);

        // Emitir progreso - fase completada
        let progress = FixTagsProgress {
            current: index + 1,
            total,
            current_track_title: track.title.clone(),
            phase: if index + 1 == total { FixTagsPhase::Complete } else { FixTagsPhase::Downloading },
        };
        let _ = app.emit("beatport:progress", &progress);

        // Pequeña pausa entre requests para evitar rate limiting
        if index + 1 < total {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }
    }

    Ok(BatchFixResult::new(results))
}

/// Actualiza el track en la base de datos con los nuevos tags
fn update_track_in_db(
    track_id: &str,
    tags: &crate::library::beatport::BeatportTags,
    current_bpm: Option<f64>,
) -> Result<(), String> {
    let db = get_connection().map_err(|e| e.to_string())?;

    // Construir query dinámico solo con los campos que tienen valor
    let mut updates: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // BPM: Solo si local no tiene y Beatport sí tiene
    if current_bpm.is_none() {
        if let Some(bpm) = tags.bpm {
            updates.push("bpm = ?".to_string());
            params.push(Box::new(bpm));
        }
    }

    // Key: Siempre se actualiza si tiene valor
    if let Some(ref key) = tags.key {
        updates.push("key = ?".to_string());
        params.push(Box::new(key.clone()));
    }

    // Genre: Solo si tiene valor de Beatport (merge ya hecho en tagger)
    if let Some(ref genre) = tags.genre {
        updates.push("genre = ?".to_string());
        params.push(Box::new(genre.clone()));
    }

    // Album: Solo si tiene valor de Beatport
    if let Some(ref album) = tags.album {
        updates.push("album = ?".to_string());
        params.push(Box::new(album.clone()));
    }

    // Year: Solo si tiene valor de Beatport
    if let Some(year) = tags.year {
        updates.push("year = ?".to_string());
        params.push(Box::new(year));
    }

    // Label: Siempre se actualiza si tiene valor
    if let Some(ref label) = tags.label {
        updates.push("label = ?".to_string());
        params.push(Box::new(label.clone()));
    }

    // ISRC: Siempre se actualiza si tiene valor  
    if let Some(ref isrc) = tags.isrc {
        updates.push("isrc = ?".to_string());
        params.push(Box::new(isrc.clone()));
    }

    // Si no hay nada que actualizar, retornar
    if updates.is_empty() {
        return Ok(());
    }

    // Agregar track_id al final de los parámetros
    params.push(Box::new(track_id.to_string()));

    // Construir y ejecutar query
    let query = format!(
        "UPDATE tracks SET {} WHERE id = ?",
        updates.join(", ")
    );

    // Convertir params a referencias
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    db.conn.execute(&query, param_refs.as_slice())
        .map_err(|e| format!("Error actualizando track: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    // Tests para los comandos se harían con mocks del cliente Beatport
    // y una base de datos en memoria
}
