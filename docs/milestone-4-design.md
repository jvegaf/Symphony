# Milestone 4 - Technical Design

**Milestone:** Advanced Analysis (Beatgrids, Cue Points, Loops)  
**Fecha:** 14 de diciembre, 2025  
**Estado:** DESIGN Phase  
**Referencia:** [milestone-4-requirements.md](./milestone-4-requirements.md)

---

## 1. Arquitectura General

### Capas del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TS)                     │
├─────────────────────────────────────────────────────────────┤
│  BeatgridEditor  │  CuePointEditor  │  LoopEditor          │
│  (Canvas Overlay)│  (Markers)       │  (Regions)           │
├─────────────────────────────────────────────────────────────┤
│  Hooks: useBeatgrid, useCuePoints, useLoops                │
│  (TanStack Query + Tauri invoke)                            │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ IPC (Tauri)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Rust + Tauri)                     │
├─────────────────────────────────────────────────────────────┤
│  commands/analysis.rs                                        │
│  - analyze_beatgrid, get_beatgrid, update_beatgrid_offset  │
│  - create_cue_point, get_cue_points, update/delete_cue     │
│  - create_loop, get_loops, update/delete_loop              │
├─────────────────────────────────────────────────────────────┤
│  audio/beatgrid_detector.rs                                 │
│  - BPM detection algorithm (onset detection + autocorr)     │
│  - Beatgrid generation from BPM + offset                    │
├─────────────────────────────────────────────────────────────┤
│  db/queries.rs (extended)                                   │
│  - CRUD para beatgrids, cue_points, loops                   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (SQLite)                          │
│  beatgrids | cue_points | loops                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Design (Rust)

### 2.1 Database Queries (queries.rs)

#### Beatgrids

```rust
/// Inserta beatgrid analizado para una pista
pub fn insert_beatgrid(
    conn: &Connection,
    track_id: i64,
    bpm: f64,
    offset: f64,
    confidence: Option<f64>,
) -> Result<i64, DatabaseError> {
    let query = "
        INSERT INTO beatgrids (track_id, bpm, offset, confidence, analyzed_at)
        VALUES (?1, ?2, ?3, ?4, datetime('now'))
        ON CONFLICT(track_id) DO UPDATE SET
            bpm = ?2,
            offset = ?3,
            confidence = ?4,
            analyzed_at = datetime('now')
    ";
    
    conn.execute(query, params![track_id, bpm, offset, confidence])?;
    Ok(conn.last_insert_rowid())
}

/// Obtiene beatgrid de una pista
pub fn get_beatgrid(
    conn: &Connection,
    track_id: i64,
) -> Result<Option<Beatgrid>, DatabaseError> {
    let query = "
        SELECT id, track_id, bpm, offset, confidence, analyzed_at
        FROM beatgrids
        WHERE track_id = ?1
    ";
    
    let mut stmt = conn.prepare(query)?;
    let mut rows = stmt.query(params![track_id])?;
    
    if let Some(row) = rows.next()? {
        Ok(Some(Beatgrid {
            id: row.get(0)?,
            track_id: row.get(1)?,
            bpm: row.get(2)?,
            offset: row.get(3)?,
            confidence: row.get(4)?,
            analyzed_at: row.get(5)?,
        }))
    } else {
        Ok(None)
    }
}

/// Actualiza solo el offset del beatgrid (ajuste fino)
pub fn update_beatgrid_offset(
    conn: &Connection,
    track_id: i64,
    offset: f64,
) -> Result<(), DatabaseError> {
    let query = "UPDATE beatgrids SET offset = ?1 WHERE track_id = ?2";
    conn.execute(query, params![offset, track_id])?;
    Ok(())
}

/// Elimina beatgrid de una pista
pub fn delete_beatgrid(
    conn: &Connection,
    track_id: i64,
) -> Result<(), DatabaseError> {
    let query = "DELETE FROM beatgrids WHERE track_id = ?1";
    conn.execute(query, params![track_id])?;
    Ok(())
}
```

#### Cue Points

```rust
/// Inserta nuevo cue point
pub fn insert_cue_point(
    conn: &Connection,
    track_id: i64,
    position: f64,
    label: &str,
    color: &str,
    cue_type: &str,
    hotkey: Option<i32>,
) -> Result<i64, DatabaseError> {
    // Validar límite de 64 cue points por pista
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM cue_points WHERE track_id = ?1",
        params![track_id],
        |row| row.get(0),
    )?;
    
    if count >= 64 {
        return Err(DatabaseError::ValidationError(
            "Máximo 64 cue points por pista".into()
        ));
    }
    
    let query = "
        INSERT INTO cue_points (track_id, position, label, color, type, hotkey, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
    ";
    
    conn.execute(query, params![track_id, position, label, color, cue_type, hotkey])?;
    Ok(conn.last_insert_rowid())
}

/// Obtiene todos los cue points de una pista
pub fn get_cue_points(
    conn: &Connection,
    track_id: i64,
) -> Result<Vec<CuePoint>, DatabaseError> {
    let query = "
        SELECT id, track_id, position, label, color, type, hotkey, created_at
        FROM cue_points
        WHERE track_id = ?1
        ORDER BY position ASC
    ";
    
    let mut stmt = conn.prepare(query)?;
    let cue_points = stmt.query_map(params![track_id], |row| {
        Ok(CuePoint {
            id: row.get(0)?,
            track_id: row.get(1)?,
            position: row.get(2)?,
            label: row.get(3)?,
            color: row.get(4)?,
            cue_type: row.get(5)?,
            hotkey: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?
    .collect::<Result<Vec<_>, _>>()?;
    
    Ok(cue_points)
}

/// Actualiza cue point existente
pub fn update_cue_point(
    conn: &Connection,
    id: i64,
    position: Option<f64>,
    label: Option<&str>,
    color: Option<&str>,
    cue_type: Option<&str>,
    hotkey: Option<Option<i32>>,
) -> Result<(), DatabaseError> {
    // Construir query dinámicamente según campos a actualizar
    let mut updates = Vec::new();
    let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();
    
    if let Some(pos) = position {
        updates.push("position = ?");
        params.push(&pos);
    }
    if let Some(lbl) = label {
        updates.push("label = ?");
        params.push(&lbl);
    }
    if let Some(clr) = color {
        updates.push("color = ?");
        params.push(&clr);
    }
    if let Some(typ) = cue_type {
        updates.push("type = ?");
        params.push(&typ);
    }
    if let Some(hk) = hotkey {
        updates.push("hotkey = ?");
        params.push(&hk);
    }
    
    if updates.is_empty() {
        return Ok(());
    }
    
    let query = format!("UPDATE cue_points SET {} WHERE id = ?", updates.join(", "));
    params.push(&id);
    
    conn.execute(&query, &params[..])?;
    Ok(())
}

/// Elimina cue point
pub fn delete_cue_point(
    conn: &Connection,
    id: i64,
) -> Result<(), DatabaseError> {
    let query = "DELETE FROM cue_points WHERE id = ?1";
    conn.execute(query, params![id])?;
    Ok(())
}
```

#### Loops

```rust
/// Inserta nuevo loop
pub fn insert_loop(
    conn: &Connection,
    track_id: i64,
    label: &str,
    loop_start: f64,
    loop_end: f64,
) -> Result<i64, DatabaseError> {
    // Validación: loop_end > loop_start + 0.1
    if loop_end <= loop_start + 0.1 {
        return Err(DatabaseError::ValidationError(
            "Loop debe tener duración mínima de 100ms".into()
        ));
    }
    
    let query = "
        INSERT INTO loops (track_id, label, loop_start, loop_end, is_active, created_at)
        VALUES (?1, ?2, ?3, ?4, 0, datetime('now'))
    ";
    
    conn.execute(query, params![track_id, label, loop_start, loop_end])?;
    Ok(conn.last_insert_rowid())
}

/// Obtiene todos los loops de una pista
pub fn get_loops(
    conn: &Connection,
    track_id: i64,
) -> Result<Vec<Loop>, DatabaseError> {
    let query = "
        SELECT id, track_id, label, loop_start, loop_end, is_active, created_at
        FROM loops
        WHERE track_id = ?1
        ORDER BY loop_start ASC
    ";
    
    let mut stmt = conn.prepare(query)?;
    let loops = stmt.query_map(params![track_id], |row| {
        Ok(Loop {
            id: row.get(0)?,
            track_id: row.get(1)?,
            label: row.get(2)?,
            loop_start: row.get(3)?,
            loop_end: row.get(4)?,
            is_active: row.get::<_, i32>(5)? == 1,
            created_at: row.get(6)?,
        })
    })?
    .collect::<Result<Vec<_>, _>>()?;
    
    Ok(loops)
}

/// Actualiza loop existente
pub fn update_loop(
    conn: &Connection,
    id: i64,
    label: Option<&str>,
    loop_start: Option<f64>,
    loop_end: Option<f64>,
    is_active: Option<bool>,
) -> Result<(), DatabaseError> {
    // Si se actualizan start o end, validar duración mínima
    if let (Some(start), Some(end)) = (loop_start, loop_end) {
        if end <= start + 0.1 {
            return Err(DatabaseError::ValidationError(
                "Loop debe tener duración mínima de 100ms".into()
            ));
        }
    }
    
    let mut updates = Vec::new();
    let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();
    
    if let Some(lbl) = label {
        updates.push("label = ?");
        params.push(&lbl);
    }
    if let Some(start) = loop_start {
        updates.push("loop_start = ?");
        params.push(&start);
    }
    if let Some(end) = loop_end {
        updates.push("loop_end = ?");
        params.push(&end);
    }
    if let Some(active) = is_active {
        let active_int = if active { 1 } else { 0 };
        updates.push("is_active = ?");
        params.push(&active_int);
    }
    
    if updates.is_empty() {
        return Ok(());
    }
    
    let query = format!("UPDATE loops SET {} WHERE id = ?", updates.join(", "));
    params.push(&id);
    
    conn.execute(&query, &params[..])?;
    Ok(())
}

/// Elimina loop
pub fn delete_loop(
    conn: &Connection,
    id: i64,
) -> Result<(), DatabaseError> {
    let query = "DELETE FROM loops WHERE id = ?1";
    conn.execute(query, params![id])?;
    Ok(())
}
```

**Total queries:** 13 funciones nuevas (4 beatgrids + 5 cue points + 4 loops)

---

### 2.2 Beatgrid Detector (audio/beatgrid_detector.rs)

#### Algoritmo de Detección de BPM

**Approach:** Onset Detection + Autocorrelation

```rust
use std::path::Path;
use crate::audio::decoder::decode_audio;

pub struct BeatgridDetector;

impl BeatgridDetector {
    /// Analiza una pista y retorna BPM + offset del primer beat
    pub fn analyze(path: &Path) -> Result<BeatgridAnalysis, AudioError> {
        // 1. Decodificar audio
        let audio_data = decode_audio(path)?;
        
        // 2. Convertir a mono si es estéreo (promedio de canales)
        let mono_samples = Self::to_mono(&audio_data.samples, audio_data.channels);
        
        // 3. Detección de onsets (picos de energía)
        let onsets = Self::detect_onsets(&mono_samples, audio_data.sample_rate)?;
        
        // 4. Calcular BPM usando autocorrelación
        let (bpm, confidence) = Self::calculate_bpm(&onsets, audio_data.sample_rate)?;
        
        // 5. Detectar offset del primer beat
        let offset = Self::find_first_beat(&onsets, bpm, audio_data.sample_rate)?;
        
        Ok(BeatgridAnalysis {
            bpm,
            offset,
            confidence,
        })
    }
    
    /// Convierte audio estéreo a mono (promedio)
    fn to_mono(samples: &[f32], channels: u16) -> Vec<f32> {
        if channels == 1 {
            return samples.to_vec();
        }
        
        samples
            .chunks(channels as usize)
            .map(|chunk| chunk.iter().sum::<f32>() / channels as f32)
            .collect()
    }
    
    /// Detecta onsets usando energía espectral
    fn detect_onsets(samples: &[f32], sample_rate: u32) -> Result<Vec<usize>, AudioError> {
        const FRAME_SIZE: usize = 1024;
        const HOP_SIZE: usize = 512;
        
        let mut onsets = Vec::new();
        let mut prev_energy = 0.0;
        
        for (i, frame) in samples.chunks(HOP_SIZE).enumerate() {
            if frame.len() < FRAME_SIZE {
                break;
            }
            
            // Calcular energía del frame (RMS)
            let energy: f32 = frame.iter()
                .take(FRAME_SIZE)
                .map(|&s| s * s)
                .sum::<f32>()
                / FRAME_SIZE as f32;
            
            let energy = energy.sqrt();
            
            // Detectar onset si hay aumento significativo de energía
            if energy > prev_energy * 1.5 && energy > 0.01 {
                onsets.push(i * HOP_SIZE);
            }
            
            prev_energy = energy;
        }
        
        Ok(onsets)
    }
    
    /// Calcula BPM usando autocorrelación de intervalos entre onsets
    fn calculate_bpm(
        onsets: &[usize],
        sample_rate: u32,
    ) -> Result<(f64, f64), AudioError> {
        if onsets.len() < 10 {
            return Err(AudioError::AnalysisError(
                "No se detectaron suficientes beats".into()
            ));
        }
        
        // Calcular intervalos entre onsets
        let intervals: Vec<f64> = onsets
            .windows(2)
            .map(|pair| {
                let diff = pair[1] - pair[0];
                diff as f64 / sample_rate as f64
            })
            .collect();
        
        // Filtrar intervalos fuera de rango razonable (0.3s - 2.0s = 30-200 BPM)
        let valid_intervals: Vec<f64> = intervals.iter()
            .filter(|&&interval| interval >= 0.3 && interval <= 2.0)
            .copied()
            .collect();
        
        if valid_intervals.is_empty() {
            return Err(AudioError::AnalysisError(
                "No se encontró tempo consistente".into()
            ));
        }
        
        // Calcular BPM promedio
        let avg_interval = valid_intervals.iter().sum::<f64>() / valid_intervals.len() as f64;
        let bpm = 60.0 / avg_interval;
        
        // Calcular confidence basado en desviación estándar
        let variance: f64 = valid_intervals.iter()
            .map(|&i| (i - avg_interval).powi(2))
            .sum::<f64>()
            / valid_intervals.len() as f64;
        
        let std_dev = variance.sqrt();
        let confidence = ((1.0 - (std_dev / avg_interval).min(1.0)) * 100.0).max(0.0);
        
        Ok((bpm, confidence))
    }
    
    /// Encuentra el offset del primer beat
    fn find_first_beat(
        onsets: &[usize],
        bpm: f64,
        sample_rate: u32,
    ) -> Result<f64, AudioError> {
        if onsets.is_empty() {
            return Ok(0.0);
        }
        
        // El primer onset detectado es el primer beat
        let first_onset_seconds = onsets[0] as f64 / sample_rate as f64;
        
        Ok(first_onset_seconds)
    }
}

#[derive(Debug, Clone)]
pub struct BeatgridAnalysis {
    pub bpm: f64,
    pub offset: f64,
    pub confidence: f64,
}
```

**Complejidad:** O(n) donde n = número de samples  
**Performance esperada:** ~2-5s para pista de 5 min

---

### 2.3 Tauri Commands (commands/analysis.rs)

```rust
use tauri::State;
use std::sync::Mutex;
use crate::db::queries;
use crate::audio::beatgrid_detector::BeatgridDetector;

// Estado global de la aplicación
pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
}

// ==================== BEATGRIDS ====================

#[tauri::command]
pub async fn analyze_beatgrid(
    track_id: i64,
    track_path: String,
    state: State<'_, AppState>,
) -> Result<BeatgridResponse, String> {
    // Analizar en thread separado para no bloquear UI
    let analysis = tokio::task::spawn_blocking(move || {
        BeatgridDetector::analyze(Path::new(&track_path))
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;
    
    // Guardar en DB
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::insert_beatgrid(
        &conn,
        track_id,
        analysis.bpm,
        analysis.offset,
        Some(analysis.confidence),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(BeatgridResponse {
        track_id,
        bpm: analysis.bpm,
        offset: analysis.offset,
        confidence: Some(analysis.confidence),
    })
}

#[tauri::command]
pub async fn get_beatgrid(
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<Option<BeatgridResponse>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let beatgrid = queries::get_beatgrid(&conn, track_id)
        .map_err(|e| e.to_string())?;
    
    Ok(beatgrid.map(|b| BeatgridResponse {
        track_id: b.track_id,
        bpm: b.bpm,
        offset: b.offset,
        confidence: b.confidence,
    }))
}

#[tauri::command]
pub async fn update_beatgrid_offset(
    track_id: i64,
    offset: f64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::update_beatgrid_offset(&conn, track_id, offset)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_beatgrid(
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::delete_beatgrid(&conn, track_id)
        .map_err(|e| e.to_string())
}

// ==================== CUE POINTS ====================

#[tauri::command]
pub async fn create_cue_point(
    request: CreateCuePointRequest,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::insert_cue_point(
        &conn,
        request.track_id,
        request.position,
        &request.label,
        &request.color,
        &request.cue_type,
        request.hotkey,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_cue_points(
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<CuePointResponse>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let cue_points = queries::get_cue_points(&conn, track_id)
        .map_err(|e| e.to_string())?;
    
    Ok(cue_points.into_iter().map(|c| CuePointResponse {
        id: c.id,
        track_id: c.track_id,
        position: c.position,
        label: c.label,
        color: c.color,
        cue_type: c.cue_type,
        hotkey: c.hotkey,
    }).collect())
}

#[tauri::command]
pub async fn update_cue_point(
    request: UpdateCuePointRequest,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::update_cue_point(
        &conn,
        request.id,
        request.position,
        request.label.as_deref(),
        request.color.as_deref(),
        request.cue_type.as_deref(),
        request.hotkey,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_cue_point(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::delete_cue_point(&conn, id)
        .map_err(|e| e.to_string())
}

// ==================== LOOPS ====================

#[tauri::command]
pub async fn create_loop(
    request: CreateLoopRequest,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::insert_loop(
        &conn,
        request.track_id,
        &request.label,
        request.loop_start,
        request.loop_end,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_loops(
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<LoopResponse>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let loops = queries::get_loops(&conn, track_id)
        .map_err(|e| e.to_string())?;
    
    Ok(loops.into_iter().map(|l| LoopResponse {
        id: l.id,
        track_id: l.track_id,
        label: l.label,
        loop_start: l.loop_start,
        loop_end: l.loop_end,
        is_active: l.is_active,
    }).collect())
}

#[tauri::command]
pub async fn update_loop(
    request: UpdateLoopRequest,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::update_loop(
        &conn,
        request.id,
        request.label.as_deref(),
        request.loop_start,
        request.loop_end,
        request.is_active,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_loop(
    id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::delete_loop(&conn, id)
        .map_err(|e| e.to_string())
}

// ==================== TYPES ====================

#[derive(serde::Serialize, serde::Deserialize)]
pub struct BeatgridResponse {
    pub track_id: i64,
    pub bpm: f64,
    pub offset: f64,
    pub confidence: Option<f64>,
}

#[derive(serde::Deserialize)]
pub struct CreateCuePointRequest {
    pub track_id: i64,
    pub position: f64,
    pub label: String,
    pub color: String,
    pub cue_type: String,
    pub hotkey: Option<i32>,
}

#[derive(serde::Serialize)]
pub struct CuePointResponse {
    pub id: i64,
    pub track_id: i64,
    pub position: f64,
    pub label: String,
    pub color: String,
    pub cue_type: String,
    pub hotkey: Option<i32>,
}

#[derive(serde::Deserialize)]
pub struct UpdateCuePointRequest {
    pub id: i64,
    pub position: Option<f64>,
    pub label: Option<String>,
    pub color: Option<String>,
    pub cue_type: Option<String>,
    pub hotkey: Option<Option<i32>>,
}

#[derive(serde::Deserialize)]
pub struct CreateLoopRequest {
    pub track_id: i64,
    pub label: String,
    pub loop_start: f64,
    pub loop_end: f64,
}

#[derive(serde::Serialize)]
pub struct LoopResponse {
    pub id: i64,
    pub track_id: i64,
    pub label: String,
    pub loop_start: f64,
    pub loop_end: f64,
    pub is_active: bool,
}

#[derive(serde::Deserialize)]
pub struct UpdateLoopRequest {
    pub id: i64,
    pub label: Option<String>,
    pub loop_start: Option<f64>,
    pub loop_end: Option<f64>,
    pub is_active: Option<bool>,
}
```

**Total comandos:** 11 (4 beatgrids + 4 cue points + 3 loops)

---

## 3. Frontend Design (React + TypeScript)

### 3.1 Type Definitions (types/analysis.ts)

```typescript
export interface Beatgrid {
  trackId: number;
  bpm: number;
  offset: number;
  confidence?: number;
}

export interface CuePoint {
  id: number;
  trackId: number;
  position: number;  // Segundos
  label: string;
  color: string;     // Hex color
  cueType: "intro" | "outro" | "drop" | "break" | "custom";
  hotkey?: number;   // 1-8
}

export interface Loop {
  id: number;
  trackId: number;
  label: string;
  loopStart: number; // Segundos
  loopEnd: number;   // Segundos
  isActive: boolean;
}

// Requests
export interface CreateCuePointRequest {
  trackId: number;
  position: number;
  label: string;
  color: string;
  cueType: string;
  hotkey?: number;
}

export interface UpdateCuePointRequest {
  id: number;
  position?: number;
  label?: string;
  color?: string;
  cueType?: string;
  hotkey?: number | null;
}

export interface CreateLoopRequest {
  trackId: number;
  label: string;
  loopStart: number;
  loopEnd: number;
}

export interface UpdateLoopRequest {
  id: number;
  label?: string;
  loopStart?: number;
  loopEnd?: number;
  isActive?: boolean;
}
```

---

### 3.2 Custom Hooks (hooks/useAnalysis.ts)

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type {
  Beatgrid,
  CuePoint,
  Loop,
  CreateCuePointRequest,
  UpdateCuePointRequest,
  CreateLoopRequest,
  UpdateLoopRequest,
} from "../types/analysis";

// ==================== BEATGRIDS ====================

export const useAnalyzeBeatgrid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trackId,
      trackPath,
    }: {
      trackId: number;
      trackPath: string;
    }) => {
      return await invoke<Beatgrid>("analyze_beatgrid", {
        track_id: trackId,
        track_path: trackPath,
      });
    },
    onSuccess: (data) => {
      // Invalidar beatgrid y track para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["beatgrid", data.trackId] });
      queryClient.invalidateQueries({ queryKey: ["track", data.trackId] });
    },
  });
};

export const useGetBeatgrid = (trackId: number, enabled = true) => {
  return useQuery<Beatgrid | null>({
    queryKey: ["beatgrid", trackId],
    queryFn: async () => {
      return await invoke<Beatgrid | null>("get_beatgrid", {
        track_id: trackId,
      });
    },
    enabled: enabled && trackId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutos (rara vez cambia)
  });
};

export const useUpdateBeatgridOffset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trackId,
      offset,
    }: {
      trackId: number;
      offset: number;
    }) => {
      await invoke("update_beatgrid_offset", {
        track_id: trackId,
        offset,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["beatgrid", variables.trackId],
      });
    },
  });
};

// ==================== CUE POINTS ====================

export const useGetCuePoints = (trackId: number, enabled = true) => {
  return useQuery<CuePoint[]>({
    queryKey: ["cuePoints", trackId],
    queryFn: async () => {
      return await invoke<CuePoint[]>("get_cue_points", {
        track_id: trackId,
      });
    },
    enabled: enabled && trackId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useCreateCuePoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateCuePointRequest) => {
      return await invoke<number>("create_cue_point", { request });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cuePoints", variables.trackId],
      });
    },
  });
};

export const useUpdateCuePoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateCuePointRequest) => {
      await invoke("update_cue_point", { request });
    },
    onSuccess: () => {
      // Invalidar todos los cue points (no sabemos el trackId aquí)
      queryClient.invalidateQueries({ queryKey: ["cuePoints"] });
    },
  });
};

export const useDeleteCuePoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("delete_cue_point", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cuePoints"] });
    },
  });
};

// ==================== LOOPS ====================

export const useGetLoops = (trackId: number, enabled = true) => {
  return useQuery<Loop[]>({
    queryKey: ["loops", trackId],
    queryFn: async () => {
      return await invoke<Loop[]>("get_loops", {
        track_id: trackId,
      });
    },
    enabled: enabled && trackId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useCreateLoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateLoopRequest) => {
      return await invoke<number>("create_loop", { request });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["loops", variables.trackId],
      });
    },
  });
};

export const useUpdateLoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateLoopRequest) => {
      await invoke("update_loop", { request });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loops"] });
    },
  });
};

export const useDeleteLoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("delete_loop", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loops"] });
    },
  });
};
```

**Total hooks:** 11 (3 beatgrids + 5 cue points + 3 loops)

---

### 3.3 Components

#### BeatgridOverlay (Componente para WaveformViewer)

```typescript
import React from "react";
import type { Beatgrid } from "../types/analysis";

interface BeatgridOverlayProps {
  beatgrid: Beatgrid | null;
  duration: number;
  width: number;
  height: number;
  zoom: number;
  offset: number;
}

/**
 * Overlay de Canvas para renderizar beatgrid sobre waveform
 */
export const BeatgridOverlay: React.FC<BeatgridOverlayProps> = ({
  beatgrid,
  duration,
  width,
  height,
  zoom,
  offset,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!beatgrid || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // Calcular intervalo entre beats
    const beatInterval = 60 / beatgrid.bpm; // Segundos por beat
    const firstBeatTime = beatgrid.offset;

    // Renderizar líneas de beats
    ctx.strokeStyle = "rgba(59, 130, 246, 0.6)"; // Azul semi-transparente
    ctx.lineWidth = 1;

    for (let time = firstBeatTime; time < duration; time += beatInterval) {
      const x = ((time / duration) * width * zoom) - offset;
      
      if (x < 0 || x > width) continue;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }, [beatgrid, duration, width, height, zoom, offset]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width, height }}
    />
  );
};
```

#### CuePointMarkers (Componente para WaveformViewer)

```typescript
import React from "react";
import type { CuePoint } from "../types/analysis";

interface CuePointMarkersProps {
  cuePoints: CuePoint[];
  duration: number;
  width: number;
  height: number;
  zoom: number;
  offset: number;
  onCuePointClick: (cuePoint: CuePoint) => void;
  onCuePointDrag: (id: number, newPosition: number) => void;
}

export const CuePointMarkers: React.FC<CuePointMarkersProps> = ({
  cuePoints,
  duration,
  width,
  height,
  zoom,
  offset,
  onCuePointClick,
  onCuePointDrag,
}) => {
  const [draggingId, setDraggingId] = React.useState<number | null>(null);

  const handleMouseDown = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPosition = ((x + offset) / (width * zoom)) * duration;

    onCuePointDrag(draggingId, Math.max(0, Math.min(duration, newPosition)));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  return (
    <div
      className="absolute top-0 left-0 w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {cuePoints.map((cue) => {
        const x = ((cue.position / duration) * width * zoom) - offset;

        if (x < 0 || x > width) return null;

        return (
          <div
            key={cue.id}
            className="absolute top-0 cursor-pointer group"
            style={{
              left: x,
              transform: "translateX(-50%)",
            }}
            onMouseDown={(e) => handleMouseDown(cue.id, e)}
            onClick={() => onCuePointClick(cue)}
          >
            {/* Línea vertical */}
            <div
              className="w-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
              style={{
                height,
                backgroundColor: cue.color,
              }}
            />
            
            {/* Etiqueta */}
            <div
              className="absolute top-0 left-2 px-2 py-1 rounded text-xs font-medium text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: cue.color }}
            >
              {cue.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

#### LoopRegions (Componente para WaveformViewer)

```typescript
import React from "react";
import type { Loop } from "../types/analysis";

interface LoopRegionsProps {
  loops: Loop[];
  duration: number;
  width: number;
  height: number;
  zoom: number;
  offset: number;
  onLoopClick: (loop: Loop) => void;
  onLoopResize: (id: number, start: number, end: number) => void;
}

export const LoopRegions: React.FC<LoopRegionsProps> = ({
  loops,
  duration,
  width,
  height,
  zoom,
  offset,
  onLoopClick,
  onLoopResize,
}) => {
  const [resizing, setResizing] = React.useState<{
    id: number;
    edge: "start" | "end";
  } | null>(null);

  const handleMouseDown = (
    id: number,
    edge: "start" | "end",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setResizing({ id, edge });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!resizing) return;

    const loop = loops.find((l) => l.id === resizing.id);
    if (!loop) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = ((x + offset) / (width * zoom)) * duration;

    if (resizing.edge === "start") {
      onLoopResize(
        loop.id,
        Math.max(0, Math.min(position, loop.loopEnd - 0.1)),
        loop.loopEnd
      );
    } else {
      onLoopResize(
        loop.id,
        loop.loopStart,
        Math.max(loop.loopStart + 0.1, Math.min(position, duration))
      );
    }
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  return (
    <div
      className="absolute top-0 left-0 w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {loops.map((loop) => {
        const startX = ((loop.loopStart / duration) * width * zoom) - offset;
        const endX = ((loop.loopEnd / duration) * width * zoom) - offset;
        const loopWidth = endX - startX;

        if (endX < 0 || startX > width) return null;

        return (
          <div
            key={loop.id}
            className="absolute top-0 cursor-pointer group"
            style={{
              left: Math.max(0, startX),
              width: Math.min(loopWidth, width - startX),
              height,
            }}
            onClick={() => onLoopClick(loop)}
          >
            {/* Región coloreada */}
            <div
              className={`w-full h-full ${
                loop.isActive
                  ? "bg-yellow-400/30"
                  : "bg-green-400/20"
              } border-l-2 border-r-2 border-green-500 group-hover:bg-green-400/40 transition-colors`}
            />

            {/* Borde izquierdo (resize handle) */}
            <div
              className="absolute left-0 top-0 w-2 h-full bg-green-500 opacity-0 group-hover:opacity-100 cursor-ew-resize"
              onMouseDown={(e) => handleMouseDown(loop.id, "start", e)}
            />

            {/* Borde derecho (resize handle) */}
            <div
              className="absolute right-0 top-0 w-2 h-full bg-green-500 opacity-0 group-hover:opacity-100 cursor-ew-resize"
              onMouseDown={(e) => handleMouseDown(loop.id, "end", e)}
            />

            {/* Etiqueta */}
            <div className="absolute top-1 left-2 text-xs font-medium text-white bg-green-600 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100">
              {loop.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

---

## 4. Testing Strategy

### 4.1 Backend Tests

**Estructura:**
```
src-tauri/src/
├── audio/
│   └── beatgrid_detector.rs
│       └── #[cfg(test)] mod tests { ... }  // 8 tests
├── db/
│   └── queries.rs
│       └── #[cfg(test)] mod tests { ... }  // 13 tests nuevos
└── commands/
    └── analysis.rs
        └── #[cfg(test)] mod tests { ... }  // 11 tests de integración
```

**Tests esperados:**
- **beatgrid_detector.rs**: 8 tests
  - test_to_mono_conversion
  - test_onset_detection
  - test_bpm_calculation_120bpm
  - test_bpm_calculation_140bpm
  - test_low_confidence_detection
  - test_first_beat_offset
  - test_analysis_insufficient_onsets
  - test_analysis_complete

- **queries.rs (beatgrids)**: 4 tests
  - test_insert_beatgrid
  - test_get_beatgrid
  - test_update_beatgrid_offset
  - test_delete_beatgrid

- **queries.rs (cue_points)**: 5 tests
  - test_insert_cue_point
  - test_get_cue_points
  - test_update_cue_point
  - test_delete_cue_point
  - test_cue_point_limit_64

- **queries.rs (loops)**: 4 tests
  - test_insert_loop
  - test_get_loops
  - test_update_loop
  - test_delete_loop
  - test_loop_duration_validation

- **commands/analysis.rs**: 11 tests de integración
  - test_analyze_beatgrid_command
  - test_get_beatgrid_command
  - test_update_offset_command
  - test_create_cue_point_command
  - test_get_cue_points_command
  - test_update_cue_point_command
  - test_delete_cue_point_command
  - test_create_loop_command
  - test_get_loops_command
  - test_update_loop_command
  - test_delete_loop_command

**Total tests backend:** ~32 tests nuevos

---

### 4.2 Frontend Tests

**Estructura:**
```
src/
├── hooks/
│   └── useAnalysis.test.tsx  // 11 tests para todos los hooks
├── components/
│   ├── BeatgridOverlay.test.tsx  // 5 tests
│   ├── CuePointMarkers.test.tsx  // 8 tests
│   └── LoopRegions.test.tsx      // 8 tests
└── types/
    └── analysis.ts  // No requiere tests (solo tipos)
```

**Tests esperados:**
- **useAnalysis.test.tsx**: 11 tests
  - test_use_analyze_beatgrid
  - test_use_get_beatgrid
  - test_use_update_beatgrid_offset
  - test_use_get_cue_points
  - test_use_create_cue_point
  - test_use_update_cue_point
  - test_use_delete_cue_point
  - test_use_get_loops
  - test_use_create_loop
  - test_use_update_loop
  - test_use_delete_loop

- **BeatgridOverlay.test.tsx**: 5 tests
  - test_renders_without_beatgrid
  - test_renders_beatgrid_lines
  - test_calculates_correct_beat_positions
  - test_respects_zoom_and_offset
  - test_clears_canvas_on_unmount

- **CuePointMarkers.test.tsx**: 8 tests
  - test_renders_cue_points
  - test_click_handler
  - test_drag_to_reposition
  - test_shows_label_on_hover
  - test_color_rendering
  - test_respects_zoom_and_offset
  - test_hides_offscreen_markers
  - test_hotkey_display

- **LoopRegions.test.tsx**: 8 tests
  - test_renders_loops
  - test_click_handler
  - test_resize_start_edge
  - test_resize_end_edge
  - test_active_loop_styling
  - test_respects_zoom_and_offset
  - test_hides_offscreen_regions
  - test_label_display

**Total tests frontend:** ~32 tests nuevos

---

## 5. Implementation Timeline

### Fase 1: Backend Foundation (Día 1)
- ✅ Database queries (beatgrids, cue_points, loops) - 13 funciones
- ✅ Tests de queries - 13 tests
- **Tiempo estimado:** 4 horas

### Fase 2: BPM Detection Algorithm (Día 1)
- ✅ beatgrid_detector.rs con onset detection + autocorrelation
- ✅ Tests de algoritmo - 8 tests
- **Tiempo estimado:** 5 horas

### Fase 3: Tauri Commands (Día 2)
- ✅ commands/analysis.rs - 11 comandos
- ✅ Tests de comandos - 11 tests
- ✅ Registrar en lib.rs
- **Tiempo estimado:** 3 horas

### Fase 4: Frontend Hooks (Día 2)
- ✅ hooks/useAnalysis.ts - 11 hooks
- ✅ Tests de hooks - 11 tests
- **Tiempo estimado:** 4 horas

### Fase 5: UI Components (Día 3)
- ✅ BeatgridOverlay component
- ✅ CuePointMarkers component
- ✅ LoopRegions component
- ✅ Tests de componentes - 21 tests
- **Tiempo estimado:** 6 horas

### Fase 6: Integration & Polish (Día 3)
- ✅ Integrar overlays en WaveformViewer
- ✅ Validar cobertura ≥80%
- ✅ Documentación (API.md, CHANGELOG.md, milestone-4-summary.md)
- **Tiempo estimado:** 4 horas

**Tiempo total estimado:** 26 horas (~3 días de trabajo)

---

## 6. Performance Considerations

### 6.1 BPM Detection
- **Optimización:** Procesamiento en thread separado con `tokio::task::spawn_blocking`
- **Target:** <10s para pista de 5 min
- **Estrategia:** Downsampling de audio para análisis más rápido (opcional)

### 6.2 Canvas Rendering
- **Beatgrid:** Renderizar solo beats visibles en viewport
- **Cue Points:** Limitar a 64 máximo (validación en DB)
- **Loops:** Renderizar solo regiones visibles
- **Target:** 60 FPS durante zoom/pan

### 6.3 Database
- **Índices:** Crear índices en `track_id` para todas las tablas
- **Queries:** Optimizar con `ORDER BY position` para ordenamiento eficiente

---

## 7. UX/UI Considerations

### 7.1 Feedback Visual
- **Análisis en progreso:** Spinner con mensaje "Analizando beatgrid..."
- **Confidence score:** Indicador visual (verde >80%, amarillo 60-80%, rojo <60%)
- **Drag & drop:** Cursor cambia a `ew-resize` para bordes de loops
- **Hover states:** Labels aparecen al pasar cursor sobre marcadores

### 7.2 Shortcuts de Teclado (Futuro)
- **Shift + 1-8:** Crear hot cue en posición actual
- **L:** Crear loop de 4 beats desde posición actual
- **Shift + L:** Activar/desactivar último loop
- **←/→:** Navegar entre cue points

### 7.3 Validaciones
- **BPM:** 40-300 BPM (rango razonable)
- **Cue points:** Máximo 64 por pista
- **Loops:** Duración mínima 100ms
- **Colors:** Paleta de 8 colores pre-definidos

---

## 8. Dependencies

### Backend (Cargo.toml)
```toml
# No se requieren nuevas dependencias
# Usamos código nativo de Rust para detección de BPM
```

### Frontend (package.json)
```json
{
  "dependencies": {
    // No se requieren nuevas dependencias
    // Usamos Canvas nativo del navegador
  }
}
```

---

## 9. Acceptance Criteria Checklist

- [ ] Backend queries implementadas y testeadas (≥80% coverage)
- [ ] Algoritmo de BPM detection funcional con confidence score
- [ ] 11 comandos Tauri registrados y testeados
- [ ] 11 hooks frontend implementados con TanStack Query
- [ ] BeatgridOverlay renderiza beats correctamente sobre waveform
- [ ] CuePointMarkers permite crear, editar y eliminar con drag & drop
- [ ] LoopRegions permite definir y redimensionar loops
- [ ] Análisis de beatgrid completa en <10s para pista de 5 min
- [ ] Renderizado a 60 FPS con zoom/pan
- [ ] Validaciones de datos (BPM range, cue limit, loop duration)
- [ ] Documentación actualizada (API.md, CHANGELOG.md)
- [ ] Tests totales: ≥64 (32 backend + 32 frontend)

---

**Fecha de creación:** 14 de diciembre, 2025  
**Autor:** GitHub Copilot - Spec-Driven Workflow Agent  
**Versión:** 1.0  
**Estado:** Ready for Implementation
