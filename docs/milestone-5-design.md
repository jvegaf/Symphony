# Milestone 5 - Settings y Conversión MP3

## Diseño Técnico Detallado

**Versión:** v0.5.0  
**Fecha:** 17 dic 2025  
**Estado:** En diseño

---

## 1. Resumen Ejecutivo

### Objetivo
Implementar sistema completo de configuración de aplicación y conversión opcional de archivos de audio a MP3, cumpliendo con los requisitos RF-002 (Conversión a MP3) y requisitos de configuración.

### Alcance
- Sistema de settings con persistencia en SQLite
- Conversión de audio a MP3 con ffmpeg
- UI de configuración con tabs
- Progreso en tiempo real de conversión
- Configuración de bitrate MP3 (128/192/256/320 kbps)
- Conversión automática durante importación (opcional)
- Conversión manual de pistas existentes

### Fuera de Alcance (Milestone 6+)
- Sincronización de settings entre dispositivos
- Perfiles de configuración múltiples
- Conversión a otros formatos (AAC, FLAC, etc.)
- Compresión de artwork
- Plugins de conversión externos

---

## 2. Análisis de Requisitos

### RF-002: Conversión a MP3 (Opcional)

#### RF-002.1: Configuración de Conversión
**WHERE** la conversión a MP3 está habilitada en configuración, **THE SYSTEM SHALL** convertir automáticamente archivos no-MP3 durante la importación.

**Implementación:**
- Setting: `conversion.auto_convert` (boolean)
- Hook de importación para conversión automática
- Mantener archivo original sin modificación

#### RF-002.2: Preservación de Original
**WHEN** el sistema convierte un archivo a MP3, **THE SYSTEM SHALL** mantener el archivo original sin modificación.

**Implementación:**
- Archivo MP3 generado en carpeta configurable (setting: `conversion.output_folder`)
- Naming pattern: `{artist} - {title} [converted].mp3`
- Metadata copiado del archivo original

#### RF-002.3: Configuración de Calidad
**WHERE** la conversión a MP3 está habilitada, **THE SYSTEM SHALL** permitir al usuario configurar el bitrate de salida (128, 192, 256, 320 kbps).

**Implementación:**
- Setting: `conversion.bitrate` (enum: 128, 192, 256, 320)
- Validación de valores permitidos
- Default: 320 kbps (máxima calidad)

### Settings Generales (Nuevos Requisitos)

#### Configuración de UI
- `ui.theme` (string): "light" | "dark" | "system" (default: "system")
- `ui.language` (string): "es" (futuro: "en")
- `ui.waveform_resolution` (number): 500-2000 samples (default: 1000)

#### Configuración de Audio
- `audio.output_device` (string): Device ID (default: "default")
- `audio.sample_rate` (number): 44100 | 48000 | 96000 (default: 44100)
- `audio.buffer_size` (number): 256-8192 frames (default: 2048)

#### Configuración de Biblioteca
- `library.auto_scan_on_startup` (boolean): default false
- `library.scan_interval_hours` (number): 0-168 (0 = disabled, default: 0)
- `library.import_folder` (string): última carpeta de importación

#### Configuración de Conversión
- `conversion.enabled` (boolean): default false
- `conversion.auto_convert` (boolean): default false
- `conversion.bitrate` (number): 128|192|256|320 (default: 320)
- `conversion.output_folder` (string): carpeta de salida (default: "$HOME/Music/Converted")
- `conversion.preserve_structure` (boolean): mantener estructura de carpetas (default: true)

---

## 3. Diseño de Base de Datos

### 3.1. Tabla `settings` (Existente)

```sql
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL  -- "string" | "number" | "boolean" | "json"
);
```

**No requiere migración** - esquema ya existe.

### 3.2. Settings por Defecto

```rust
// src-tauri/src/db/queries/settings.rs
const DEFAULT_SETTINGS: &[(&str, &str, &str)] = &[
    // UI
    ("ui.theme", "system", "string"),
    ("ui.language", "es", "string"),
    ("ui.waveform_resolution", "1000", "number"),
    
    // Audio
    ("audio.output_device", "default", "string"),
    ("audio.sample_rate", "44100", "number"),
    ("audio.buffer_size", "2048", "number"),
    
    // Library
    ("library.auto_scan_on_startup", "false", "boolean"),
    ("library.scan_interval_hours", "0", "number"),
    ("library.import_folder", "", "string"),
    
    // Conversion
    ("conversion.enabled", "false", "boolean"),
    ("conversion.auto_convert", "false", "boolean"),
    ("conversion.bitrate", "320", "number"),
    ("conversion.output_folder", "", "string"),  // Se calcula en runtime
    ("conversion.preserve_structure", "true", "boolean"),
];
```

---

## 4. Diseño Backend (Rust)

### 4.1. Settings Queries (`src-tauri/src/db/queries/settings.rs`)

```rust
use rusqlite::{Connection, Result};
use crate::db::models::Setting;

/// Obtiene un setting por clave
pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<Setting>> {
    let mut stmt = conn.prepare(
        "SELECT key, value, value_type FROM settings WHERE key = ?1"
    )?;
    
    let setting = stmt.query_row([key], |row| {
        Ok(Setting {
            key: row.get(0)?,
            value: row.get(1)?,
            value_type: row.get(2)?,
        })
    }).optional()?;
    
    Ok(setting)
}

/// Obtiene todos los settings
pub fn get_all_settings(conn: &Connection) -> Result<Vec<Setting>> {
    let mut stmt = conn.prepare(
        "SELECT key, value, value_type FROM settings ORDER BY key"
    )?;
    
    let settings = stmt.query_map([], |row| {
        Ok(Setting {
            key: row.get(0)?,
            value: row.get(1)?,
            value_type: row.get(2)?,
        })
    })?
    .collect::<Result<Vec<_>>>()?;
    
    Ok(settings)
}

/// Actualiza o inserta un setting
pub fn upsert_setting(
    conn: &Connection,
    key: &str,
    value: &str,
    value_type: &str,
) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value, value_type) 
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET 
            value = excluded.value,
            value_type = excluded.value_type",
        [key, value, value_type],
    )?;
    Ok(())
}

/// Elimina un setting (retorna a default)
pub fn delete_setting(conn: &Connection, key: &str) -> Result<()> {
    conn.execute("DELETE FROM settings WHERE key = ?1", [key])?;
    Ok(())
}

/// Resetea todos los settings a valores por defecto
pub fn reset_all_settings(conn: &Connection) -> Result<()> {
    conn.execute("DELETE FROM settings", [])?;
    initialize_default_settings(conn)?;
    Ok(())
}

/// Inicializa settings por defecto si no existen
pub fn initialize_default_settings(conn: &Connection) -> Result<()> {
    for (key, value, value_type) in DEFAULT_SETTINGS {
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM settings WHERE key = ?1",
            [key],
            |row| row.get(0),
        )?;
        
        if !exists {
            upsert_setting(conn, key, value, value_type)?;
        }
    }
    Ok(())
}
```

**Tests requeridos (12):**
1. get_setting - clave existente
2. get_setting - clave inexistente (None)
3. get_all_settings - lista completa
4. get_all_settings - base de datos vacía
5. upsert_setting - insertar nuevo
6. upsert_setting - actualizar existente
7. delete_setting - eliminar existente
8. delete_setting - clave inexistente (no error)
9. reset_all_settings - resetear a defaults
10. initialize_default_settings - primera vez
11. initialize_default_settings - idempotente (no duplicar)
12. validate_value_type - tipos válidos (string, number, boolean)

### 4.2. MP3 Converter (`src-tauri/src/library/converter.rs`)

```rust
use std::path::{Path, PathBuf};
use std::process::Command;
use crate::library::error::{LibraryError, LibraryResult};
use tauri::Emitter;

/// Opciones de conversión MP3
#[derive(Debug, Clone)]
pub struct ConversionOptions {
    pub bitrate: u32,                  // 128, 192, 256, 320
    pub output_folder: PathBuf,
    pub preserve_structure: bool,
    pub overwrite_existing: bool,
}

impl Default for ConversionOptions {
    fn default() -> Self {
        Self {
            bitrate: 320,
            output_folder: PathBuf::from("./converted"),
            preserve_structure: true,
            overwrite_existing: false,
        }
    }
}

/// Evento de progreso de conversión
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionProgress {
    pub current_file: String,
    pub current_index: usize,
    pub total_files: usize,
    pub percentage: f64,
    pub status: ConversionStatus,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ConversionStatus {
    Starting,
    Converting,
    Complete,
    Failed,
}

/// Resultado de conversión
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionResult {
    pub input_path: String,
    pub output_path: String,
    pub success: bool,
    pub error: Option<String>,
    pub duration_ms: u64,
}

pub struct Mp3Converter;

impl Mp3Converter {
    /// Convierte un archivo de audio a MP3
    pub fn convert_file<E: Emitter>(
        input_path: &Path,
        options: &ConversionOptions,
        emitter: &E,
    ) -> LibraryResult<ConversionResult> {
        let start = std::time::Instant::now();
        
        // Verificar que ffmpeg esté disponible
        Self::check_ffmpeg_available()?;
        
        // Verificar que el archivo de entrada exista
        if !input_path.exists() {
            return Err(LibraryError::FileNotFound(
                input_path.display().to_string()
            ));
        }
        
        // Generar path de salida
        let output_path = Self::generate_output_path(input_path, options)?;
        
        // Verificar si ya existe
        if output_path.exists() && !options.overwrite_existing {
            return Err(LibraryError::ConversionError(
                format!("El archivo de salida ya existe: {}", output_path.display())
            ));
        }
        
        // Crear directorio de salida si no existe
        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        // Emitir evento de inicio
        let _ = emitter.emit("conversion:progress", ConversionProgress {
            current_file: input_path.display().to_string(),
            current_index: 0,
            total_files: 1,
            percentage: 0.0,
            status: ConversionStatus::Converting,
        });
        
        // Ejecutar ffmpeg
        let output = Command::new("ffmpeg")
            .arg("-i")
            .arg(input_path)
            .arg("-codec:a")
            .arg("libmp3lame")
            .arg("-b:a")
            .arg(format!("{}k", options.bitrate))
            .arg("-y")  // Overwrite without asking
            .arg(&output_path)
            .output()
            .map_err(|e| LibraryError::ConversionError(e.to_string()))?;
        
        let duration_ms = start.elapsed().as_millis() as u64;
        
        if output.status.success() {
            // Emitir evento de completado
            let _ = emitter.emit("conversion:progress", ConversionProgress {
                current_file: input_path.display().to_string(),
                current_index: 1,
                total_files: 1,
                percentage: 100.0,
                status: ConversionStatus::Complete,
            });
            
            Ok(ConversionResult {
                input_path: input_path.display().to_string(),
                output_path: output_path.display().to_string(),
                success: true,
                error: None,
                duration_ms,
            })
        } else {
            let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
            
            // Emitir evento de error
            let _ = emitter.emit("conversion:progress", ConversionProgress {
                current_file: input_path.display().to_string(),
                current_index: 1,
                total_files: 1,
                percentage: 0.0,
                status: ConversionStatus::Failed,
            });
            
            Err(LibraryError::ConversionError(error_msg))
        }
    }
    
    /// Convierte múltiples archivos en batch
    pub fn convert_batch<E: Emitter>(
        input_paths: &[PathBuf],
        options: &ConversionOptions,
        emitter: &E,
    ) -> LibraryResult<Vec<ConversionResult>> {
        let mut results = Vec::new();
        let total = input_paths.len();
        
        for (index, path) in input_paths.iter().enumerate() {
            // Emitir progreso antes de cada archivo
            let _ = emitter.emit("conversion:progress", ConversionProgress {
                current_file: path.display().to_string(),
                current_index: index,
                total_files: total,
                percentage: (index as f64 / total as f64) * 100.0,
                status: ConversionStatus::Converting,
            });
            
            match Self::convert_file(path, options, emitter) {
                Ok(result) => results.push(result),
                Err(e) => {
                    results.push(ConversionResult {
                        input_path: path.display().to_string(),
                        output_path: String::new(),
                        success: false,
                        error: Some(e.to_string()),
                        duration_ms: 0,
                    });
                }
            }
        }
        
        // Emitir evento final
        let _ = emitter.emit("conversion:progress", ConversionProgress {
            current_file: String::new(),
            current_index: total,
            total_files: total,
            percentage: 100.0,
            status: ConversionStatus::Complete,
        });
        
        Ok(results)
    }
    
    /// Verifica que ffmpeg esté disponible
    fn check_ffmpeg_available() -> LibraryResult<()> {
        let output = Command::new("ffmpeg")
            .arg("-version")
            .output()
            .map_err(|_| LibraryError::ConversionError(
                "ffmpeg no está instalado o no está en el PATH".to_string()
            ))?;
        
        if output.status.success() {
            Ok(())
        } else {
            Err(LibraryError::ConversionError(
                "ffmpeg no está disponible".to_string()
            ))
        }
    }
    
    /// Genera path de salida para archivo convertido
    fn generate_output_path(
        input_path: &Path,
        options: &ConversionOptions,
    ) -> LibraryResult<PathBuf> {
        let file_stem = input_path.file_stem()
            .ok_or_else(|| LibraryError::ConversionError(
                "No se pudo obtener nombre de archivo".to_string()
            ))?;
        
        let output_filename = format!("{}.mp3", file_stem.to_string_lossy());
        
        let output_path = if options.preserve_structure {
            // Mantener estructura de carpetas relativa
            // TODO: Implementar lógica de estructura preservada
            options.output_folder.join(&output_filename)
        } else {
            // Archivo plano en carpeta de salida
            options.output_folder.join(&output_filename)
        };
        
        Ok(output_path)
    }
}
```

**Tests requeridos (15):**
1. convert_file - FLAC a MP3 320kbps (éxito)
2. convert_file - WAV a MP3 192kbps (éxito)
3. convert_file - archivo no existe (error)
4. convert_file - archivo ya existe + overwrite=false (error)
5. convert_file - archivo ya existe + overwrite=true (éxito)
6. convert_file - ffmpeg no disponible (error)
7. convert_batch - múltiples archivos (éxito)
8. convert_batch - algunos fallan (resultados parciales)
9. convert_batch - emite eventos de progreso
10. check_ffmpeg_available - ffmpeg instalado
11. check_ffmpeg_available - ffmpeg no instalado
12. generate_output_path - preserve_structure=false
13. generate_output_path - preserve_structure=true
14. conversion_options - valores por defecto
15. conversion_result - serialización correcta

### 4.3. Tauri Commands (`src-tauri/src/commands/settings.rs`)

```rust
use tauri::State;
use rusqlite::{Connection, Mutex};
use crate::db::queries::settings;
use crate::db::models::Setting;

#[tauri::command]
pub fn get_setting(
    db: State<'_, Mutex<Connection>>,
    key: String,
) -> Result<Option<Setting>, String> {
    let conn = db.lock().unwrap();
    settings::get_setting(&conn, &key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_settings(
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<Setting>, String> {
    let conn = db.lock().unwrap();
    settings::get_all_settings(&conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_setting(
    db: State<'_, Mutex<Connection>>,
    key: String,
    value: String,
    value_type: String,
) -> Result<(), String> {
    let conn = db.lock().unwrap();
    settings::upsert_setting(&conn, &key, &value, &value_type)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_settings(
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().unwrap();
    settings::reset_all_settings(&conn)
        .map_err(|e| e.to_string())
}
```

### 4.4. Tauri Commands (`src-tauri/src/commands/conversion.rs`)

```rust
use tauri::{AppHandle, State};
use std::path::PathBuf;
use crate::library::converter::{Mp3Converter, ConversionOptions, ConversionResult};

#[tauri::command]
pub async fn convert_track_to_mp3(
    app: AppHandle,
    input_path: String,
    bitrate: u32,
    output_folder: String,
    preserve_structure: bool,
) -> Result<ConversionResult, String> {
    let options = ConversionOptions {
        bitrate,
        output_folder: PathBuf::from(output_folder),
        preserve_structure,
        overwrite_existing: false,
    };
    
    Mp3Converter::convert_file(
        &PathBuf::from(input_path),
        &options,
        &app,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn batch_convert_to_mp3(
    app: AppHandle,
    input_paths: Vec<String>,
    bitrate: u32,
    output_folder: String,
    preserve_structure: bool,
) -> Result<Vec<ConversionResult>, String> {
    let paths: Vec<PathBuf> = input_paths.iter()
        .map(PathBuf::from)
        .collect();
    
    let options = ConversionOptions {
        bitrate,
        output_folder: PathBuf::from(output_folder),
        preserve_structure,
        overwrite_existing: false,
    };
    
    Mp3Converter::convert_batch(&paths, &options, &app)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_ffmpeg_installed() -> Result<bool, String> {
    match Mp3Converter::check_ffmpeg_available() {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
```

**Tests de comandos (8):**
1. get_setting - invocación correcta
2. get_all_settings - retorna vec
3. update_setting - actualiza correctamente
4. reset_settings - resetea a defaults
5. convert_track_to_mp3 - conversión exitosa
6. batch_convert_to_mp3 - múltiples archivos
7. check_ffmpeg_installed - retorna boolean
8. error handling - errores retornan String

### 4.5. Actualización de `LibraryError`

Agregar variante para errores de conversión:

```rust
// src-tauri/src/library/error.rs
#[derive(Debug, thiserror::Error)]
pub enum LibraryError {
    // ... variantes existentes ...
    
    #[error("Error de conversión: {0}")]
    ConversionError(String),
}
```

---

## 5. Diseño Frontend (TypeScript + React)

### 5.1. Types (`src/types/settings.ts`)

```typescript
/**
 * Modelo de setting
 */
export interface Setting {
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
}

/**
 * Settings agrupados por categoría
 */
export interface AppSettings {
  ui: UISettings;
  audio: AudioSettings;
  library: LibrarySettings;
  conversion: ConversionSettings;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  waveformResolution: number;
}

export interface AudioSettings {
  outputDevice: string;
  sampleRate: 44100 | 48000 | 96000;
  bufferSize: number;
}

export interface LibrarySettings {
  autoScanOnStartup: boolean;
  scanIntervalHours: number;
  importFolder: string;
}

export interface ConversionSettings {
  enabled: boolean;
  autoConvert: boolean;
  bitrate: 128 | 192 | 256 | 320;
  outputFolder: string;
  preserveStructure: boolean;
}

/**
 * Opciones de conversión
 */
export interface ConversionOptions {
  bitrate: 128 | 192 | 256 | 320;
  outputFolder: string;
  preserveStructure: boolean;
}

/**
 * Resultado de conversión
 */
export interface ConversionResult {
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

/**
 * Progreso de conversión
 */
export interface ConversionProgress {
  currentFile: string;
  currentIndex: number;
  totalFiles: number;
  percentage: number;
  status: 'starting' | 'converting' | 'complete' | 'failed';
}
```

### 5.2. Hooks (`src/hooks/useSettings.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { Setting, AppSettings } from '../types/settings';

/**
 * Hook para obtener un setting específico
 */
export function useGetSetting(key: string) {
  return useQuery({
    queryKey: ['setting', key],
    queryFn: async () => {
      const setting = await invoke<Setting | null>('get_setting', { key });
      return setting;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener todos los settings
 */
export function useGetAllSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const settings = await invoke<Setting[]>('get_all_settings');
      return parseSettings(settings);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para actualizar un setting
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      key,
      value,
      valueType,
    }: {
      key: string;
      value: string;
      valueType: string;
    }) => {
      await invoke('update_setting', { key, value, valueType });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['setting', variables.key] });
    },
  });
}

/**
 * Hook para resetear todos los settings
 */
export function useResetSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      await invoke('reset_settings');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

/**
 * Parsea array de settings a objeto AppSettings
 */
function parseSettings(settings: Setting[]): AppSettings {
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));
  
  return {
    ui: {
      theme: (settingsMap.get('ui.theme') as any) || 'system',
      language: settingsMap.get('ui.language') || 'es',
      waveformResolution: parseInt(settingsMap.get('ui.waveform_resolution') || '1000'),
    },
    audio: {
      outputDevice: settingsMap.get('audio.output_device') || 'default',
      sampleRate: parseInt(settingsMap.get('audio.sample_rate') || '44100') as any,
      bufferSize: parseInt(settingsMap.get('audio.buffer_size') || '2048'),
    },
    library: {
      autoScanOnStartup: settingsMap.get('library.auto_scan_on_startup') === 'true',
      scanIntervalHours: parseInt(settingsMap.get('library.scan_interval_hours') || '0'),
      importFolder: settingsMap.get('library.import_folder') || '',
    },
    conversion: {
      enabled: settingsMap.get('conversion.enabled') === 'true',
      autoConvert: settingsMap.get('conversion.auto_convert') === 'true',
      bitrate: parseInt(settingsMap.get('conversion.bitrate') || '320') as any,
      outputFolder: settingsMap.get('conversion.output_folder') || '',
      preserveStructure: settingsMap.get('conversion.preserve_structure') === 'true',
    },
  };
}
```

### 5.3. Hooks de Conversión (`src/hooks/useConversion.ts`)

```typescript
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ConversionProgress, ConversionResult, ConversionOptions } from '../types/settings';

/**
 * Hook para convertir un track a MP3
 */
export function useConvertTrack() {
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  
  useEffect(() => {
    const unlisten = listen<ConversionProgress>('conversion:progress', (event) => {
      setProgress(event.payload);
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);
  
  const mutation = useMutation({
    mutationFn: async ({
      inputPath,
      options,
    }: {
      inputPath: string;
      options: ConversionOptions;
    }) => {
      const result = await invoke<ConversionResult>('convert_track_to_mp3', {
        inputPath,
        bitrate: options.bitrate,
        outputFolder: options.outputFolder,
        preserveStructure: options.preserveStructure,
      });
      return result;
    },
  });
  
  return {
    ...mutation,
    progress,
  };
}

/**
 * Hook para conversión batch
 */
export function useBatchConvert() {
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  
  useEffect(() => {
    const unlisten = listen<ConversionProgress>('conversion:progress', (event) => {
      setProgress(event.payload);
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);
  
  const mutation = useMutation({
    mutationFn: async ({
      inputPaths,
      options,
    }: {
      inputPaths: string[];
      options: ConversionOptions;
    }) => {
      const results = await invoke<ConversionResult[]>('batch_convert_to_mp3', {
        inputPaths,
        bitrate: options.bitrate,
        outputFolder: options.outputFolder,
        preserveStructure: options.preserveStructure,
      });
      return results;
    },
  });
  
  return {
    ...mutation,
    progress,
  };
}

/**
 * Hook para verificar ffmpeg
 */
export function useCheckFfmpeg() {
  return useQuery({
    queryKey: ['ffmpeg-installed'],
    queryFn: async () => {
      const installed = await invoke<boolean>('check_ffmpeg_installed');
      return installed;
    },
    staleTime: Infinity, // No cambiar durante la sesión
  });
}
```

### 5.4. Componente Settings Panel (Resumen)

```typescript
// src/pages/Settings.tsx
// - Tabs: General, Audio, Library, Conversion
// - Formularios con campos controlados
// - Botón "Guardar" y "Resetear a defaults"
// - Validación de valores
// - Feedback visual de guardado exitoso

// src/components/ConversionDialog.tsx
// - Selección de archivos para convertir
// - Configuración de bitrate y carpeta de salida
// - Barra de progreso con archivo actual
// - Lista de resultados (éxito/error)
// - Cancelación de proceso
```

---

## 6. Plan de Testing

### Backend Tests (35 tests)
- Settings queries: 12 tests
- MP3 converter: 15 tests
- Settings commands: 4 tests
- Conversion commands: 4 tests

### Frontend Tests (47 tests)
- types/settings.ts: 5 tests (validación de interfaces)
- useSettings hooks: 20 tests (queries, mutations, parsing)
- useConversion hooks: 10 tests (conversión, batch, progress)
- SettingsPanel component: 15 tests (tabs, formularios, guardar)
- ConversionDialog component: 12 tests (UI, progreso, resultados)

**Total nuevo: 82 tests**

---

## 7. Estimación de Esfuerzo

| Tarea | Horas | Prioridad |
|-------|-------|-----------|
| Settings queries (backend) | 3 | Alta |
| MP3 converter (backend) | 5 | Alta |
| Tauri commands | 2 | Alta |
| Backend tests | 4 | Alta |
| Frontend types | 1 | Media |
| Frontend hooks | 4 | Media |
| SettingsPanel component | 4 | Media |
| ConversionDialog component | 3 | Media |
| Frontend tests | 5 | Media |
| Documentación | 2 | Baja |
| **TOTAL** | **33 horas** | - |

---

## 8. Criterios de Aceptación

### Funcionales
- ✅ Usuario puede ver y editar todos los settings desde UI
- ✅ Settings se persisten en SQLite correctamente
- ✅ Conversión a MP3 funciona con bitrates configurables
- ✅ Conversión batch procesa múltiples archivos
- ✅ Progreso de conversión se muestra en tiempo real
- ✅ Archivos originales se preservan sin modificación
- ✅ Estructura de carpetas se puede preservar (opcional)
- ✅ Resetear settings retorna a valores por defecto

### No Funcionales
- ✅ Cobertura de tests ≥ 80% en todos los módulos
- ✅ Conversión de archivo de 5 min tarda < 30 segundos
- ✅ UI de settings es responsive y accesible
- ✅ Errores de conversión se manejan gracefully
- ✅ ffmpeg se detecta correctamente y muestra mensaje si falta

---

## 9. Dependencias Externas

### ffmpeg
- **Requerido:** Sí (para conversión MP3)
- **Instalación:** Usuario debe instalar ffmpeg manualmente
- **Detección:** Comando `check_ffmpeg_installed`
- **Mensaje de error:** "ffmpeg no está instalado. Instale ffmpeg para habilitar conversión MP3."

### Rust Crates
```toml
# No se requieren nuevas dependencias
# Ya existentes: rusqlite, tauri, serde, std::process::Command
```

### NPM Packages
```json
// No se requieren nuevas dependencias
// Ya existentes: @tanstack/react-query, @tauri-apps/api
```

---

## 10. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| ffmpeg no instalado | Alta | Alto | Detección temprana + mensaje claro de instalación |
| Conversión lenta | Media | Medio | Conversión en background + feedback de progreso |
| Errores de permisos | Media | Medio | Validación de carpetas + manejo de errores |
| Settings corruptos | Baja | Alto | Validación de tipos + reset a defaults |
| Espacio en disco | Media | Alto | Verificar espacio disponible antes de conversión |

---

## 11. Notas de Implementación

### AIDEV-NOTE: Orden de Implementación
1. **Backend primero (TDD):** Settings queries → tests → converter → tests → commands → tests
2. **Frontend después:** Types → hooks → tests → components → tests
3. **Integración final:** Settings panel + conversion dialog

### AIDEV-NOTE: Compatibilidad
- Settings system usa tabla existente (no requiere migración)
- Conversión es completamente opcional (no afecta funcionalidad existente)
- ffmpeg debe estar en PATH del sistema

### AIDEV-NOTE: Pruebas Manuales Requeridas
1. Conversión de FLAC 24-bit a MP3 320kbps
2. Conversión batch de 10+ archivos
3. Cambio de theme en tiempo real
4. Reset de settings con UI abierta
5. Conversión sin ffmpeg instalado (mensaje de error)

---

**Fin del documento de diseño - Milestone 5**
