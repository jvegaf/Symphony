/**
 * Comandos Tauri para integración con Beatport
 *
 * AIDEV-NOTE: Migrado a DbPool + spawn_blocking para evitar bloquear el runtime de Tokio.
 * Todas las operaciones de base de datos se ejecutan en threads dedicados del pool de Tokio.
 *
 * NOTA: Todos los comandos Tauri deben estar en el módulo raíz (este archivo)
 * porque el macro #[tauri::command] genera funciones auxiliares `__cmd__nombre`
 * que deben ser accesibles desde donde se invocan (ver Task 13).
 *
 * ## Comandos
 *
 * - **fix_tags** (deprecado): Búsqueda y aplicación automática de tags
 * - **find_artwork**: Búsqueda y aplicación solo de artwork
 * - **search_beatport_candidates**: Búsqueda de candidatos (selección manual)
 * - **apply_selected_tags**: Aplicación de tags seleccionados manualmente
 */

use futures::future::join_all;
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Semaphore;

use crate::commands::library::LibraryState;
use crate::db::{queries, DbPool};
use crate::library::beatport::{
    BatchFixResult, BeatportClient, BeatportTagger, BeatportTags, ConcurrencyConfig,
    FixTagsPhase, FixTagsProgress, FixTagsResult, RateLimitState, SearchCandidatesResult,
    TrackCandidates, TrackSelection,
};

// ============================================================================
// COMANDOS TAURI
// ============================================================================

/// Arregla los tags de múltiples tracks buscando en Beatport
///
/// ⚠️ **DEPRECADO**: Usar `search_beatport_candidates` + `apply_selected_tags`
/// para evitar falsos positivos.
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
    pool: State<'_, DbPool>,
    _library_state: State<'_, LibraryState>,
    track_ids: Vec<String>,
) -> Result<BatchFixResult, String> {
    let total = track_ids.len();

    if total == 0 {
        return Err("No se seleccionaron tracks".to_string());
    }

    // Crear cliente Beatport
    let client = Arc::new(
        BeatportClient::new().map_err(|e| format!("Error creando cliente Beatport: {}", e))?,
    );
    let tagger = BeatportTagger::new(client);
    let pool_arc = Arc::new(pool.inner().clone());

    let mut results: Vec<FixTagsResult> = Vec::with_capacity(total);

    // Procesar cada track
    for (index, track_id) in track_ids.iter().enumerate() {
        // Obtener información del track desde la base de datos
        let pool_clone = pool_arc.clone();
        let track_id_clone = track_id.clone();
        let track = tokio::task::spawn_blocking(move || {
            let conn = pool_clone.get().map_err(|e| e.to_string())?;
            queries::get_track(&conn, &track_id_clone)
                .map_err(|e| format!("Error obteniendo track {}: {}", track_id_clone, e))
        })
        .await
        .map_err(|e| format!("Task join error: {}", e))??;

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

        let result = tagger
            .fix_track(
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
            )
            .await;

        // Si fue exitoso, actualizar la base de datos
        if result.success {
            if let Some(ref tags) = result.tags_applied {
                let update_result = update_track_in_db(
                    pool_arc.clone(),
                    track_id,
                    tags,
                    track.bpm, // Pasamos el BPM actual para la lógica de merge en DB
                    result.beatport_track_id, // Guardar el beatport_id para tracking
                )
                .await;

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
            phase: if index + 1 == total {
                FixTagsPhase::Complete
            } else {
                FixTagsPhase::ApplyingTags
            },
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
    pool: State<'_, DbPool>,
    _library_state: State<'_, LibraryState>,
    track_ids: Vec<String>,
) -> Result<BatchFixResult, String> {
    let total = track_ids.len();

    if total == 0 {
        return Err("No se seleccionaron tracks".to_string());
    }

    // Crear cliente Beatport
    let client = Arc::new(
        BeatportClient::new().map_err(|e| format!("Error creando cliente Beatport: {}", e))?,
    );
    let tagger = BeatportTagger::new(client);
    let pool_arc = Arc::new(pool.inner().clone());

    let mut results: Vec<FixTagsResult> = Vec::with_capacity(total);

    // Procesar cada track
    for (index, track_id) in track_ids.iter().enumerate() {
        // Obtener información del track desde la base de datos
        let pool_clone = pool_arc.clone();
        let track_id_clone = track_id.clone();
        let track = tokio::task::spawn_blocking(move || {
            let conn = pool_clone.get().map_err(|e| e.to_string())?;
            queries::get_track(&conn, &track_id_clone)
                .map_err(|e| format!("Error obteniendo track {}: {}", track_id_clone, e))
        })
        .await
        .map_err(|e| format!("Task join error: {}", e))??;

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

        let result = tagger
            .find_artwork_only(
                track_id,
                file_path,
                &track.title,
                &track.artist,
                Some(track.duration),
            )
            .await;

        results.push(result);

        // Emitir progreso - fase completada
        let progress = FixTagsProgress {
            current: index + 1,
            total,
            current_track_title: track.title.clone(),
            phase: if index + 1 == total {
                FixTagsPhase::Complete
            } else {
                FixTagsPhase::Downloading
            },
        };
        let _ = app.emit("beatport:progress", &progress);

        // Pequeña pausa entre requests para evitar rate limiting
        if index + 1 < total {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }
    }

    Ok(BatchFixResult::new(results))
}

/// Busca candidatos de Beatport para una lista de tracks locales
///
/// Devuelve hasta 4 candidatos por track con sus scores de similitud,
/// permitiendo al usuario seleccionar manualmente el correcto.
///
/// AIDEV-NOTE: Optimización de concurrencia - búsquedas paralelas con semáforo
/// - Batch DB query: O(1) en lugar de O(n) queries individuales
/// - Paralelización: 4 requests concurrentes con rate limiting adaptativo
/// - Progreso en tiempo real: eventos emitidos conforme completan (no al final)
/// - Mejora esperada: ~7s → ~2s para 10 tracks (70% reducción)
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
    pool: State<'_, DbPool>,
    _library_state: State<'_, LibraryState>,
    track_ids: Vec<String>,
) -> Result<SearchCandidatesResult, String> {
    let total = track_ids.len();

    if total == 0 {
        return Err("No se seleccionaron tracks".to_string());
    }

    // OPTIMIZACIÓN 1: Batch DB query - cargar todos los tracks de una vez
    let pool_arc = Arc::new(pool.inner().clone());
    let pool_clone = pool_arc.clone();
    let track_ids_clone = track_ids.clone();
    let tracks_map = Arc::new(
        tokio::task::spawn_blocking(move || {
            let conn = pool_clone.get().map_err(|e| e.to_string())?;
            queries::get_tracks_batch(&conn, &track_ids_clone)
                .map_err(|e| format!("Error obteniendo tracks en batch: {}", e))
                .map(|tracks| {
                    tracks
                        .into_iter()
                        .filter_map(|t| t.id.clone().map(|id| (id, t)))
                        .collect::<std::collections::HashMap<_, _>>()
                })
        })
        .await
        .map_err(|e| format!("Task join error: {}", e))??,
    );

    // Crear cliente Beatport compartido entre todos los requests
    let client = Arc::new(
        BeatportClient::new().map_err(|e| format!("Error creando cliente Beatport: {}", e))?,
    );

    // OPTIMIZACIÓN 2: Concurrencia controlada con semáforo (4 concurrent)
    let config = ConcurrencyConfig::for_search();
    let semaphore = Arc::new(Semaphore::new(config.max_concurrent));
    let rate_limit_state = Arc::new(RateLimitState::new());

    // Contadores atómicos para estadísticas
    let with_candidates = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let without_candidates = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let completed_count = Arc::new(std::sync::atomic::AtomicUsize::new(0));

    // OPTIMIZACIÓN 3: Procesamiento paralelo con futures
    let search_futures = track_ids.iter().map(|track_id| {
        let client = client.clone();
        let semaphore = semaphore.clone();
        let rate_limit_state = rate_limit_state.clone();
        let track_id = track_id.clone();
        let app = app.clone();
        let with_candidates = with_candidates.clone();
        let without_candidates = without_candidates.clone();
        let completed_count = completed_count.clone();
        let tracks_map = tracks_map.clone();

        async move {
            // Adquirir permiso del semáforo (limita a max_concurrent)
            let _permit = semaphore.clone().acquire_owned().await.unwrap();

            // Rate limiting adaptativo
            let delay = if rate_limit_state.should_slow_down() {
                config.rate_limit_delay_ms
            } else {
                config.min_delay_ms
            };
            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;

            // Obtener track del mapa (ya cargado en batch)
            let track = match tracks_map.get(&track_id) {
                Some(t) => t,
                None => {
                    without_candidates.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                    return TrackCandidates::with_error(
                        track_id.clone(),
                        "".to_string(),
                        "".to_string(),
                        None,
                        None,
                        "Track no encontrado en la base de datos".to_string(),
                    );
                }
            };

            // Emitir progreso en tiempo real
            let current = completed_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
            let progress = FixTagsProgress {
                current,
                total,
                current_track_title: track.title.clone(),
                phase: FixTagsPhase::Searching,
            };
            let _ = app.emit("beatport:progress", &progress);

            // Buscar candidatos
            let candidates_result = client
                .search_candidates(
                    &track.title,
                    &track.artist,
                    Some(track.duration),
                    4,    // max_results
                    0.25, // min_score
                )
                .await;

            // Procesar resultado
            match candidates_result {
                Ok(candidates) => {
                    if candidates.is_empty() {
                        without_candidates.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                    } else {
                        with_candidates.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                    }
                    let filename = std::path::Path::new(&track.path)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(|s| s.to_string());
                    TrackCandidates::with_candidates(
                        track_id.clone(),
                        track.title.clone(),
                        track.artist.clone(),
                        filename,
                        Some(track.duration),
                        candidates,
                    )
                }
                Err(e) => {
                    // Detectar rate limiting y registrarlo
                    if e.to_string().contains("429") {
                        rate_limit_state.record_rate_limit();
                    }
                    without_candidates.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                    let filename = std::path::Path::new(&track.path)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(|s| s.to_string());
                    TrackCandidates::with_error(
                        track_id.clone(),
                        track.title.clone(),
                        track.artist.clone(),
                        filename,
                        Some(track.duration),
                        e.to_string(),
                    )
                }
            }
        }
    });

    // Ejecutar todos los futures en paralelo y esperar resultados
    let tracks_with_candidates = join_all(search_futures).await;

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
        with_candidates: with_candidates.load(std::sync::atomic::Ordering::SeqCst),
        without_candidates: without_candidates.load(std::sync::atomic::Ordering::SeqCst),
    })
}

/// Aplica los tags de Beatport a los tracks según la selección del usuario
///
/// Para cada selección, obtiene los datos completos del track de Beatport
/// y aplica los tags al archivo local y la base de datos.
///
/// AIDEV-NOTE: Optimización de concurrencia - aplicación paralela con control
/// - Batch DB query: cargar todos los tracks locales en una sola query O(1)
/// - Paralelización selectiva:
///   * API calls (get_track): 3 concurrentes con rate limiting adaptativo
///   * Artwork downloads: paralelos (dentro de apply_tags_from_track)
///   * File I/O: secuencial (mejor para discos mecánicos)
/// - Progreso en tiempo real conforme completan
/// - Mejora esperada: ~9.6s → ~3.5s para 10 tracks (65% reducción)
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
    pool: State<'_, DbPool>,
    _library_state: State<'_, LibraryState>,
    selections: Vec<TrackSelection>,
) -> Result<BatchFixResult, String> {
    // Filtrar solo las selecciones que tienen un beatport_track_id
    let valid_selections: Vec<&TrackSelection> = selections
        .iter()
        .filter(|s| s.beatport_track_id.is_some())
        .collect();

    let total = valid_selections.len();

    if total == 0 {
        return Ok(BatchFixResult::new(Vec::new()));
    }

    // OPTIMIZACIÓN 1: Batch DB query - cargar todos los tracks de una vez
    let track_ids: Vec<String> = valid_selections
        .iter()
        .map(|s| s.local_track_id.clone())
        .collect();

    let pool_arc = Arc::new(pool.inner().clone());
    let pool_clone = pool_arc.clone();
    let track_ids_clone = track_ids.clone();
    let tracks_map = Arc::new(
        tokio::task::spawn_blocking(move || {
            let conn = pool_clone.get().map_err(|e| e.to_string())?;
            queries::get_tracks_batch(&conn, &track_ids_clone)
                .map_err(|e| format!("Error obteniendo tracks en batch: {}", e))
                .map(|tracks| {
                    tracks
                        .into_iter()
                        .filter_map(|t| t.id.clone().map(|id| (id, t)))
                        .collect::<std::collections::HashMap<_, _>>()
                })
        })
        .await
        .map_err(|e| format!("Task join error: {}", e))??,
    );

    // Crear cliente Beatport compartido
    let client = Arc::new(
        BeatportClient::new().map_err(|e| format!("Error creando cliente Beatport: {}", e))?,
    );
    let tagger = Arc::new(BeatportTagger::new(client.clone()));

    // OPTIMIZACIÓN 2: Concurrencia controlada (3 concurrent para API v4)
    let config = ConcurrencyConfig::for_api();
    let semaphore = Arc::new(Semaphore::new(config.max_concurrent));
    let rate_limit_state = Arc::new(RateLimitState::new());
    let completed_count = Arc::new(std::sync::atomic::AtomicUsize::new(0));

    // OPTIMIZACIÓN 3: Paralelización de API calls + artwork downloads
    // File I/O se mantiene secuencial dentro de apply_tags_from_track
    let apply_futures = valid_selections.iter().map(|selection| {
        let client = client.clone();
        let tagger = tagger.clone();
        let semaphore = semaphore.clone();
        let rate_limit_state = rate_limit_state.clone();
        let app = app.clone();
        let completed_count = completed_count.clone();
        let beatport_id = selection.beatport_track_id.unwrap(); // Safe: ya filtramos
        let local_track_id = selection.local_track_id.clone();
        let tracks_map = tracks_map.clone();
        let pool_arc = pool_arc.clone();

        async move {
            // Adquirir permiso del semáforo
            let _permit = semaphore.clone().acquire_owned().await.unwrap();

            // Rate limiting adaptativo
            let delay = if rate_limit_state.should_slow_down() {
                config.rate_limit_delay_ms
            } else {
                config.min_delay_ms
            };
            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;

            // Obtener track local del mapa
            let track = match tracks_map.get(&local_track_id) {
                Some(t) => t,
                None => {
                    return FixTagsResult::error(
                        local_track_id.clone(),
                        "Track no encontrado en la base de datos".to_string(),
                    );
                }
            };

            // Emitir progreso en tiempo real
            let current = completed_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
            let progress = FixTagsProgress {
                current,
                total,
                current_track_title: track.title.clone(),
                phase: FixTagsPhase::Downloading,
            };
            let _ = app.emit("beatport:progress", &progress);

            // Obtener datos completos del track de Beatport
            let beatport_track = match client.get_track(beatport_id).await {
                Ok(bt) => bt,
                Err(e) => {
                    // Detectar rate limiting
                    if e.to_string().contains("429") {
                        rate_limit_state.record_rate_limit();
                    }
                    return FixTagsResult::error(
                        local_track_id.clone(),
                        format!("Error obteniendo datos de Beatport: {}", e),
                    );
                }
            };

            // Aplicar tags (incluye artwork download, que puede ser paralelo internamente)
            let file_path = Path::new(&track.path);
            let result = tagger
                .apply_tags_from_track(&local_track_id, file_path, &beatport_track, track.bpm)
                .await;

            // Si fue exitoso, actualizar la base de datos
            if result.success {
                if let Some(ref tags) = result.tags_applied {
                    let update_result = update_track_in_db(
                        pool_arc.clone(),
                        &local_track_id,
                        tags,
                        track.bpm,
                        Some(beatport_id),
                    )
                    .await;

                    if let Err(e) = update_result {
                        eprintln!(
                            "Warning: No se pudo actualizar DB para {}: {}",
                            local_track_id, e
                        );
                    }
                }
            }

            result
        }
    });

    // Ejecutar todos los futures en paralelo
    let results = join_all(apply_futures).await;

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

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/// Actualiza el track en la base de datos con los nuevos tags
async fn update_track_in_db(
    pool: Arc<DbPool>,
    track_id: &str,
    tags: &BeatportTags,
    _current_bpm: Option<f64>,
    beatport_id: Option<i64>,
) -> Result<(), String> {
    let track_id = track_id.to_string();
    let tags = tags.clone();

    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;

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

        // BPM: Siempre actualizar si Beatport tiene valor (igual que Key)
        if let Some(bpm) = tags.bpm {
            updates.push("bpm = ?".to_string());
            params.push(Box::new(bpm));
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
        let query = format!("UPDATE tracks SET {} WHERE id = ?", updates.join(", "));

        // Convertir params a referencias
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

        conn.execute(&query, param_refs.as_slice())
            .map_err(|e| format!("Error actualizando track: {}", e))?;

        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[cfg(test)]
mod tests {
    // Tests para los comandos se harían con mocks del cliente Beatport
    // y una base de datos en memoria
}
