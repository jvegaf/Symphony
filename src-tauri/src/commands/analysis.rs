//! Comandos Tauri para análisis de audio: beatgrid, cue points y loops
//!
//! AIDEV-NOTE: Migrado a DbPool + spawn_blocking para evitar bloquear el runtime de Tokio.
//! Todas las operaciones de base de datos se ejecutan en threads dedicados del pool de Tokio.

use crate::audio::beatgrid_detector::BeatgridDetector;
use crate::db::{
    models::{Beatgrid, CuePoint, Loop},
    queries, DbPool,
};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::State;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeatgridResponse {
    pub track_id: String,
    pub bpm: f64,
    pub offset: f64,
    pub confidence: Option<f64>,
    pub analyzed_at: String,
}

impl From<Beatgrid> for BeatgridResponse {
    fn from(beatgrid: Beatgrid) -> Self {
        Self {
            track_id: beatgrid.track_id,
            bpm: beatgrid.bpm,
            offset: beatgrid.offset,
            confidence: beatgrid.confidence,
            analyzed_at: beatgrid.analyzed_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCuePointRequest {
    pub track_id: String,
    pub position: f64,
    pub label: Option<String>,
    pub color: Option<String>,
    #[serde(rename = "type")]
    pub cue_type: String,
    pub hotkey: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCuePointRequest {
    pub position: Option<f64>,
    pub label: Option<String>,
    pub color: Option<String>,
    #[serde(rename = "type")]
    pub cue_type: Option<String>,
    pub hotkey: Option<Option<i32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CuePointResponse {
    pub id: String,
    pub track_id: String,
    pub position: f64,
    pub label: String,
    pub color: String,
    #[serde(rename = "type")]
    pub cue_type: String,
    pub hotkey: Option<i32>,
    pub created_at: String,
}

impl From<CuePoint> for CuePointResponse {
    fn from(cue: CuePoint) -> Self {
        Self {
            id: cue.id.unwrap_or_default(),
            track_id: cue.track_id,
            position: cue.position,
            label: cue.label,
            color: cue.color,
            cue_type: cue.cue_type,
            hotkey: cue.hotkey,
            created_at: cue.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLoopRequest {
    pub track_id: String,
    pub label: Option<String>,
    pub loop_start: f64,
    pub loop_end: f64,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLoopRequest {
    pub label: Option<String>,
    pub loop_start: Option<f64>,
    pub loop_end: Option<f64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoopResponse {
    pub id: String,
    pub track_id: String,
    pub label: String,
    pub loop_start: f64,
    pub loop_end: f64,
    pub is_active: bool,
    pub created_at: String,
}

impl From<Loop> for LoopResponse {
    fn from(loop_item: Loop) -> Self {
        Self {
            id: loop_item.id.unwrap_or_default(),
            track_id: loop_item.track_id,
            label: loop_item.label,
            loop_start: loop_item.loop_start,
            loop_end: loop_item.loop_end,
            is_active: loop_item.is_active,
            created_at: loop_item.created_at,
        }
    }
}

// ============================================================================
// Beatgrid Commands
// ============================================================================

/// Analiza beatgrid de una pista automáticamente
///
/// Este comando carga el audio, detecta tempo y offset, y guarda
/// resultados en la base de datos. Proceso asíncrono en background.
#[tauri::command]
pub async fn analyze_beatgrid(
    track_id: String,
    track_path: String,
    pool: State<'_, DbPool>,
) -> Result<BeatgridResponse, String> {
    // Analizar en thread separado para no bloquear UI
    let path = track_path.clone();
    let analysis = tokio::task::spawn_blocking(move || BeatgridDetector::analyze(Path::new(&path)))
        .await
        .map_err(|e| format!("Error en task: {}", e))?
        .map_err(|e| format!("Error de análisis: {}", e))?;

    // Guardar en DB usando el pool
    let pool = pool.inner().clone();
    let track_id_clone = track_id.clone();
    let bpm = analysis.bpm;
    let offset = analysis.offset;
    let confidence = analysis.confidence;

    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;

        queries::upsert_beatgrid(&conn, &track_id_clone, bpm, offset, Some(confidence))
            .map_err(|e| format!("Error guardando beatgrid: {}", e))?;

        // Obtener beatgrid guardado con timestamp
        let saved = queries::get_beatgrid(&conn, &track_id_clone)
            .map_err(|e| format!("Error obteniendo beatgrid: {}", e))?
            .ok_or_else(|| "Beatgrid no encontrado después de guardar".to_string())?;

        Ok(BeatgridResponse::from(saved))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Obtiene beatgrid de una pista si existe
#[tauri::command]
pub async fn get_beatgrid(
    track_id: String,
    pool: State<'_, DbPool>,
) -> Result<Option<BeatgridResponse>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        queries::get_beatgrid(&conn, &track_id)
            .map(|opt| opt.map(BeatgridResponse::from))
            .map_err(|e| format!("Error obteniendo beatgrid: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Actualiza offset del beatgrid (ajuste manual fino)
#[tauri::command]
pub async fn update_beatgrid_offset(
    track_id: String,
    offset: f64,
    pool: State<'_, DbPool>,
) -> Result<(), String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        queries::update_beatgrid_offset(&conn, &track_id, offset)
            .map_err(|e| format!("Error actualizando offset: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Elimina beatgrid de una pista
#[tauri::command]
pub async fn delete_beatgrid(track_id: String, pool: State<'_, DbPool>) -> Result<(), String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        queries::delete_beatgrid(&conn, &track_id)
            .map_err(|e| format!("Error eliminando beatgrid: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

// ============================================================================
// Cue Point Commands
// ============================================================================

/// Crea nuevo cue point
#[tauri::command]
pub async fn create_cue_point(
    request: CreateCuePointRequest,
    pool: State<'_, DbPool>,
) -> Result<CuePointResponse, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;

        let id = queries::insert_cue_point(
            &conn,
            &request.track_id,
            request.position,
            request.label.as_deref().unwrap_or(""),
            request.color.as_deref().unwrap_or("#FFFFFF"),
            &request.cue_type,
            request.hotkey,
        )
        .map_err(|e| format!("Error creando cue point: {}", e))?;

        // Retornar el cue point creado
        Ok(CuePointResponse {
            id,
            track_id: request.track_id,
            position: request.position,
            label: request.label.unwrap_or_default(),
            color: request.color.unwrap_or_else(|| "#FFFFFF".to_string()),
            cue_type: request.cue_type,
            hotkey: request.hotkey,
            created_at: chrono::Utc::now().to_rfc3339(),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Obtiene todos los cue points de una pista
#[tauri::command]
pub async fn get_cue_points(
    track_id: String,
    pool: State<'_, DbPool>,
) -> Result<Vec<CuePointResponse>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        queries::get_cue_points(&conn, &track_id)
            .map(|cues| cues.into_iter().map(CuePointResponse::from).collect())
            .map_err(|e| format!("Error obteniendo cue points: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Actualiza un cue point existente
#[tauri::command]
pub async fn update_cue_point(
    id: String,
    request: UpdateCuePointRequest,
    pool: State<'_, DbPool>,
) -> Result<(), String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        queries::update_cue_point(
            &conn,
            &id,
            request.position,
            request.label.as_deref(),
            request.color.as_deref(),
            request.cue_type.as_deref(),
            request.hotkey,
        )
        .map_err(|e| format!("Error actualizando cue point: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Elimina un cue point
#[tauri::command]
pub async fn delete_cue_point(id: String, pool: State<'_, DbPool>) -> Result<(), String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        queries::delete_cue_point(&conn, &id).map_err(|e| format!("Error eliminando cue point: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

// ============================================================================
// Loop Commands
// ============================================================================

/// Crea nuevo loop
#[tauri::command]
pub async fn create_loop(
    request: CreateLoopRequest,
    pool: State<'_, DbPool>,
) -> Result<LoopResponse, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;

        let id = queries::insert_loop(
            &conn,
            &request.track_id,
            request.label.as_deref().unwrap_or(""),
            request.loop_start,
            request.loop_end,
        )
        .map_err(|e| format!("Error creando loop: {}", e))?;

        // Retornar el loop creado
        Ok(LoopResponse {
            id,
            track_id: request.track_id,
            label: request.label.unwrap_or_default(),
            loop_start: request.loop_start,
            loop_end: request.loop_end,
            is_active: request.is_active.unwrap_or(false),
            created_at: chrono::Utc::now().to_rfc3339(),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Obtiene todos los loops de una pista
#[tauri::command]
pub async fn get_loops(
    track_id: String,
    pool: State<'_, DbPool>,
) -> Result<Vec<LoopResponse>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        queries::get_loops(&conn, &track_id)
            .map(|loops| loops.into_iter().map(LoopResponse::from).collect())
            .map_err(|e| format!("Error obteniendo loops: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Actualiza un loop existente
#[tauri::command]
pub async fn update_loop(
    id: String,
    request: UpdateLoopRequest,
    pool: State<'_, DbPool>,
) -> Result<(), String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        queries::update_loop(
            &conn,
            &id,
            request.label.as_deref(),
            request.loop_start,
            request.loop_end,
            request.is_active,
        )
        .map_err(|e| format!("Error actualizando loop: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Elimina un loop
#[tauri::command]
pub async fn delete_loop(id: String, pool: State<'_, DbPool>) -> Result<(), String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = pool.get().map_err(|e| e.to_string())?;
        queries::delete_loop(&conn, &id).map_err(|e| format!("Error eliminando loop: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {

    use crate::db::migrations;
    use rusqlite::Connection;

    // TODO: Implementar tests de integración para comandos Tauri
    // Los comandos son wrappers sobre queries, que ya están testeadas.
    // Los tests de comandos deberían validar:
    // 1. Conversión de errores a String
    // 2. Serialización/deserialización de tipos
    // 3. Manejo de locks de Mutex
    //
    // Para esto se necesita un approach diferente usando mock de State
    // o tests de integración E2E con Tauri test harness.
    //
    // Referencia: https://tauri.app/v1/guides/testing/

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        migrations::run_migrations(&conn).unwrap();
        conn
    }

    fn insert_test_track(conn: &Connection, track_id: &str) {
        conn.execute(
            "INSERT INTO tracks (id, path, title, artist, duration, bitrate, sample_rate, file_size, date_added, date_modified)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                track_id,
                "/test/path.mp3",
                "Test Track",
                "Test Artist",
                180.0,
                320,
                44100,
                1024000,
                "2024-01-01T00:00:00Z",
                "2024-01-01T00:00:00Z"
            ],
        )
        .unwrap();
    }

    // Test básico para validar compilación del módulo
    #[test]
    fn test_module_compiles() {
        let conn = setup_test_db();
        let test_id = uuid::Uuid::new_v4().to_string();
        insert_test_track(&conn, &test_id);

        // Verificar que la BD funciona
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }
}
