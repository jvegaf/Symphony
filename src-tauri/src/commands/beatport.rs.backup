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
    SearchCandidatesResult, TrackCandidates, TrackSelection,
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
                    result.beatport_track_id, // Guardar el beatport_id para tracking
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
    beatport_id: Option<i64>,
) -> Result<(), String> {
    let db = get_connection().map_err(|e| e.to_string())?;

    // Construir query dinámico solo con los campos que tienen valor
    let mut updates: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // Title: Siempre se actualiza si tiene valor (corrige nombres)
    if let Some(ref title) = tags.title {
        updates.push("title = ?".to_string());
        params.push(Box::new(title.clone()));
    }

    // Artist: Siempre se actualiza si tiene valor (corrige artistas)
    if let Some(ref artist) = tags.artist {
        updates.push("artist = ?".to_string());
        params.push(Box::new(artist.clone()));
    }

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

    // Genre: Siempre se actualiza si tiene valor (corrige géneros)
    if let Some(ref genre) = tags.genre {
        updates.push("genre = ?".to_string());
        params.push(Box::new(genre.clone()));
    }

    // Album: Siempre se actualiza si tiene valor (corrige álbumes)
    if let Some(ref album) = tags.album {
        updates.push("album = ?".to_string());
        params.push(Box::new(album.clone()));
    }

    // Year: Siempre se actualiza si tiene valor (corrige años)
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

    // Beatport ID: Siempre se actualiza para marcar que fue fixeado
    if let Some(bp_id) = beatport_id {
        updates.push("beatport_id = ?".to_string());
        params.push(Box::new(bp_id));
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

// ============================================================================
// Nuevos comandos para selección manual de candidatos
// ============================================================================

/// Busca candidatos de Beatport para una lista de tracks locales
/// 
/// Devuelve hasta 4 candidatos por track con sus scores de similitud,
/// permitiendo al usuario seleccionar manualmente el correcto.
/// 
/// # Arguments
/// * `track_ids` - Vector de IDs de tracks a buscar
/// 
/// # Events
/// Emite `beatport:progress` con el progreso de cada track
/// 
/// # Returns
/// `SearchCandidatesResult` con candidatos para cada track
#[tauri::command]
pub async fn search_beatport_candidates(
    app: AppHandle,
    _library_state: State<'_, LibraryState>,
    track_ids: Vec<String>,
) -> Result<SearchCandidatesResult, String> {
    let total = track_ids.len();
    
    if total == 0 {
        return Err("No se seleccionaron tracks".to_string());
    }

    // Crear cliente Beatport
    let client = BeatportClient::new()
        .map_err(|e| format!("Error creando cliente Beatport: {}", e))?;

    let mut tracks_with_candidates: Vec<TrackCandidates> = Vec::with_capacity(total);
    let mut with_candidates_count = 0;
    let mut without_candidates_count = 0;

    // Procesar cada track
    for (index, track_id) in track_ids.iter().enumerate() {
        // Obtener información del track desde la base de datos
        let track = {
            let db = get_connection().map_err(|e| e.to_string())?;
            queries::get_track(&db.conn, track_id)
                .map_err(|e| format!("Error obteniendo track {}: {}", track_id, e))?
        };

        // Emitir progreso
        let progress = FixTagsProgress {
            current: index + 1,
            total,
            current_track_title: track.title.clone(),
            phase: FixTagsPhase::Searching,
        };
        let _ = app.emit("beatport:progress", &progress);

        // Buscar candidatos (máximo 4, score mínimo 0.25)
        let candidates_result = client.search_candidates(
            &track.title,
            &track.artist,
            Some(track.duration),
            4,    // max_results
            0.25, // min_score - umbral bajo para no perder posibles matches
        ).await;

        let track_candidates = match candidates_result {
            Ok(candidates) => {
                if candidates.is_empty() {
                    without_candidates_count += 1;
                } else {
                    with_candidates_count += 1;
                }
                // Extraer filename del path
                let filename = std::path::Path::new(&track.path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|s| s.to_string());
                TrackCandidates::with_candidates(
                    track_id.clone(),
                    track.title,
                    track.artist,
                    filename,
                    Some(track.duration),
                    candidates,
                )
            }
            Err(e) => {
                without_candidates_count += 1;
                // Extraer filename del path
                let filename = std::path::Path::new(&track.path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|s| s.to_string());
                TrackCandidates::with_error(
                    track_id.clone(),
                    track.title,
                    track.artist,
                    filename,
                    Some(track.duration),
                    e.to_string(),
                )
            }
        };

        tracks_with_candidates.push(track_candidates);

        // Pequeña pausa entre requests para evitar rate limiting
        if index + 1 < total {
            tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
        }
    }

    // Emitir progreso final
    let progress = FixTagsProgress {
        current: total,
        total,
        current_track_title: "".to_string(),
        phase: FixTagsPhase::Complete,
    };
    let _ = app.emit("beatport:progress", &progress);

    Ok(SearchCandidatesResult {
        tracks: tracks_with_candidates,
        total,
        with_candidates: with_candidates_count,
        without_candidates: without_candidates_count,
    })
}

/// Aplica los tags de Beatport a los tracks según la selección del usuario
/// 
/// Para cada selección, obtiene los datos completos del track de Beatport
/// y aplica los tags al archivo local y la base de datos.
/// 
/// # Arguments
/// * `selections` - Vector de selecciones (track local + beatport id elegido)
/// 
/// # Events
/// Emite `beatport:progress` con el progreso de cada track
/// 
/// # Returns
/// `BatchFixResult` con el resumen de la operación
#[tauri::command]
pub async fn apply_selected_tags(
    app: AppHandle,
    _library_state: State<'_, LibraryState>,
    selections: Vec<TrackSelection>,
) -> Result<BatchFixResult, String> {
    // Filtrar solo las selecciones que tienen un beatport_track_id
    let valid_selections: Vec<&TrackSelection> = selections.iter()
        .filter(|s| s.beatport_track_id.is_some())
        .collect();

    let total = valid_selections.len();
    
    if total == 0 {
        return Ok(BatchFixResult::new(Vec::new()));
    }

    // Crear cliente Beatport
    let client = Arc::new(
        BeatportClient::new().map_err(|e| format!("Error creando cliente Beatport: {}", e))?
    );
    let tagger = BeatportTagger::new(client.clone());

    let mut results: Vec<FixTagsResult> = Vec::with_capacity(total);

    for (index, selection) in valid_selections.iter().enumerate() {
        let beatport_id = selection.beatport_track_id.unwrap(); // Safe: ya filtramos

        // Obtener información del track local desde la base de datos
        let track = {
            let db = get_connection().map_err(|e| e.to_string())?;
            queries::get_track(&db.conn, &selection.local_track_id)
                .map_err(|e| format!("Error obteniendo track {}: {}", selection.local_track_id, e))?
        };

        // Emitir progreso
        let progress = FixTagsProgress {
            current: index + 1,
            total,
            current_track_title: track.title.clone(),
            phase: FixTagsPhase::Downloading,
        };
        let _ = app.emit("beatport:progress", &progress);

        // Obtener datos completos del track de Beatport
        let beatport_track = match client.get_track(beatport_id).await {
            Ok(bt) => bt,
            Err(e) => {
                results.push(FixTagsResult::error(
                    selection.local_track_id.clone(),
                    format!("Error obteniendo datos de Beatport: {}", e),
                ));
                continue;
            }
        };

        // Aplicar tags usando el tagger existente
        let file_path = Path::new(&track.path);
        let result = tagger.apply_tags_from_track(
            &selection.local_track_id,
            file_path,
            &beatport_track,
            track.bpm,
        ).await;

        // Si fue exitoso, actualizar la base de datos
        if result.success {
            if let Some(ref tags) = result.tags_applied {
                let update_result = update_track_in_db(
                    &selection.local_track_id,
                    tags,
                    track.bpm,
                    Some(beatport_id), // Guardar el beatport_id para tracking
                );
                
                if let Err(e) = update_result {
                    eprintln!("Warning: No se pudo actualizar DB para {}: {}", selection.local_track_id, e);
                }
            }
        }

        results.push(result);

        // Pequeña pausa entre requests
        if index + 1 < total {
            tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
        }
    }

    // Emitir progreso final
    let progress = FixTagsProgress {
        current: total,
        total,
        current_track_title: "".to_string(),
        phase: FixTagsPhase::Complete,
    };
    let _ = app.emit("beatport:progress", &progress);

    Ok(BatchFixResult::new(results))
}

#[cfg(test)]
mod tests {
    // Tests para los comandos se harían con mocks del cliente Beatport
    // y una base de datos en memoria
}
