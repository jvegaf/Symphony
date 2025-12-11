---
applyTo: "src-tauri/src/**/*.rs"
description: "Estándares para desarrollo con Tauri y Rust en Symphony"
---

# Desarrollo Tauri 2.0 + Rust

## Estructura de Proyecto Rust

### Organización de Módulos
```
src-tauri/src/
├── main.rs           # Punto de entrada
├── lib.rs            # Librería
├── audio/            # Módulo de audio
│   ├── mod.rs
│   ├── player.rs
│   ├── decoder.rs
│   └── waveform.rs
├── library/          # Gestión de biblioteca
│   ├── mod.rs
│   ├── importer.rs
│   ├── metadata.rs
│   └── synchronizer.rs
├── db/               # Base de datos
│   ├── mod.rs
│   ├── models.rs
│   └── queries.rs
├── commands/         # Comandos Tauri
│   ├── mod.rs
│   ├── audio.rs
│   ├── library.rs
│   └── settings.rs
├── error.rs          # Definiciones de error
└── config.rs         # Configuración
```

## Convenciones de Código

### Nombres
- **Módulos**: `snake_case`
- **Funciones**: `snake_case`
- **Tipos/Structs**: `PascalCase`
- **Constantes**: `UPPER_SNAKE_CASE`
- **Variables**: `snake_case`

### Formato
- Sigue `rustfmt` (automático con `cargo fmt`)
- Sigue `clippy` (chequea con `cargo clippy`)
- Máximo 100 caracteres por línea
- Espacios de 4 caracteres (default)

## Manejo de Errores

### Custom Error Types
- Define errors como enum personalizado
- Implementa `Display` y `From` traits
- Usa para manejo específico de errores

```rust
#[derive(Debug)]
pub enum AudioError {
    DecodingFailed(String),
    FormatNotSupported(String),
    PlaybackFailed(String),
}

impl Display for AudioError {
    fn fmt(&self, f: &mut Formatter) -> Result {
        match self {
            AudioError::DecodingFailed(msg) => write!(f, "Error de decodificación: {}", msg),
            AudioError::FormatNotSupported(fmt) => write!(f, "Formato no soportado: {}", fmt),
            AudioError::PlaybackFailed(msg) => write!(f, "Error de reproducción: {}", msg),
        }
    }
}

impl Error for AudioError {}
```

### Result Type
- Usa `Result<T>` para operaciones que fallan
- Propaga errores con `?` operator
- Maneja al nivel más apropiado

```rust
pub fn load_track(path: &Path) -> Result<Track, AudioError> {
    let metadata = fs::metadata(path)?;
    let duration = extract_duration(path)?;
    
    Ok(Track {
        path: path.to_path_buf(),
        duration,
        size: metadata.len(),
    })
}
```

### Logging
- Usa `tracing` o `log` para debug
- Incluye contexto relevante en logs
- Evita logs en producción que expongan paths

```rust
use tracing::{info, warn, error};

pub fn import_library(path: &Path) -> Result<()> {
    info!(path = ?path, "Iniciando importación de biblioteca");
    
    match scan_directory(path) {
        Ok(tracks) => {
            info!(count = tracks.len(), "Pistas encontradas");
            Ok(())
        }
        Err(e) => {
            error!(error = ?e, "Fallo en importación");
            Err(e)
        }
    }
}
```

## Comandos Tauri

### Definición de Comandos
- Uno por archivo en `commands/`
- Siempre devuelve `Result`
- Tipifica todas las entradas y salidas
- Incluye documentación JSDoc equivalente

```rust
// src-tauri/src/commands/audio.rs

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct PlaybackState {
    pub is_playing: bool,
    pub current_position: f64,
    pub duration: f64,
}

/// Obtiene el estado actual de reproducción
#[tauri::command]
pub async fn get_playback_state(
    player: tauri::State<'_, AudioPlayer>,
) -> Result<PlaybackState, String> {
    player.get_state()
        .map_err(|e| e.to_string())
}
```

### Manejadores Globales
- Centraliza setup de estado compartido
- Usa `tauri::State<T>` para acceso sincronizado
- Implementa sincronización con channels si es necesario

## Acceso a Base de Datos

### Models
- Define structs para cada tabla
- Derisa `Serialize`, `Deserialize`, `Debug`
- Usa tipos apropiados (`i64` vs `i32`, `String` vs `&str`)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: i64,
    pub path: String,
    pub title: String,
    pub artist: String,
    pub duration: f64,
    pub bitrate: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub track_count: i32,
    pub created_at: String,
}
```

### Queries
- Encapsula en funciones específicas
- Usa prepared statements (Diesel) o parametrizadas (rusqlite)
- Maneja transacciones para operaciones múltiples

```rust
pub fn insert_tracks(
    conn: &Connection,
    tracks: &[Track],
) -> Result<(), DatabaseError> {
    let mut stmt = conn.prepare(
        "INSERT INTO tracks (path, title, artist, duration) VALUES (?, ?, ?, ?)"
    )?;
    
    for track in tracks {
        stmt.execute((
            &track.path,
            &track.title,
            &track.artist,
            track.duration,
        ))?;
    }
    
    Ok(())
}
```

## Procesamiento de Audio

### Decodificación (Symphonia)
- Maneja múltiples formatos explícitamente
- Extrae metadatos completamente
- Valida formato antes de procesar

```rust
use symphonia::core::io::MediaSourceStream;
use symphonia::default::get_probe;

pub fn decode_audio(path: &Path) -> Result<AudioData, AudioError> {
    let file = fs::File::open(path)
        .map_err(|e| AudioError::IOError(e.to_string()))?;
    
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    
    let probed = get_probe()
        .format(&Default::default())
        .read_until_exhausted(mss, &Default::default())
        .map_err(|_| AudioError::DecodingFailed("Formato no reconocido".into()))?;
    
    let metadata = probed.metadata.get();
    
    // Procesar pistas, extraer waveform, etc.
    Ok(AudioData { /* ... */ })
}
```

### Reproducción (Rodio)
- Configura dispositivo de audio al inicio
- Maneja cambios de dispositivo
- Implementa funciones de control (play, pause, seek)

```rust
pub struct AudioPlayer {
    _host: Host,
    device: Device,
    sink: Sink,
}

impl AudioPlayer {
    pub fn new() -> Result<Self, AudioError> {
        let host = Host::try_default()?;
        let device = host.default_output_device()
            .ok_or(AudioError::NoOutputDevice)?;
        
        let sink = Sink::try_new(&device)?;
        
        Ok(Self {
            _host: host,
            device,
            sink,
        })
    }
    
    pub fn play(&mut self, track: &Track) -> Result<(), AudioError> {
        let file = fs::File::open(&track.path)?;
        let source = Decoder::new(file)?;
        self.sink.append(source);
        Ok(())
    }
}
```

## Testing

### Unit Tests
- Coloca tests en mismo archivo con `#[cfg(test)]`
- Usa `#[tokio::test]` para async
- Mocks para dependencias externas

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_load_track_valid_file() {
        let path = Path::new("tests/fixtures/sample.mp3");
        let result = load_track(path).await;
        
        assert!(result.is_ok());
        let track = result.unwrap();
        assert_eq!(track.title, "Sample");
    }
    
    #[test]
    fn test_load_track_invalid_path() {
        let path = Path::new("nonexistent.mp3");
        let result = load_track(path);
        
        assert!(result.is_err());
    }
}
```

### Coverage
- Target mínimo: 80% para código nuevo
- Ejecuta con `cargo tarpaulin`
- Excluye código generado automáticamente

## Documentación

### Comments
- Usa `///` para documentar públicos
- Incluye ejemplos de uso cuando es posible
- Documenta panics, errores y edge cases

```rust
/// Importa una biblioteca musical desde una ruta
/// 
/// # Arguments
/// * `path` - Ruta raíz de la biblioteca
/// 
/// # Returns
/// Número de pistas importadas y sincronizadas
/// 
/// # Errors
/// Retorna `LibraryError` si:
/// - La ruta no existe
/// - No hay permisos de lectura
/// - Hay pistas corruptas
/// 
/// # Example
/// ```
/// let result = import_library(Path::new("/music"));
/// assert!(result.is_ok());
/// ```
pub async fn import_library(path: &Path) -> Result<usize, LibraryError> {
    // Implementación
}
```

### README del módulo
- Incluye uso básico
- Explica patrones principales
- Enlaza a funciones importantes

## Dependencies (Cargo.toml)

### Estructura
- Agrupa por funcionalidad
- Comenta versiones mayores
- Usa `workspace` para múltiples crates si es necesario

```toml
[package]
name = "symphony"
version = "0.1.0"
edition = "2021"

[dependencies]
# Audio
symphonia = { version = "0.5", features = ["default"] }
rodio = "0.17"

# Database
rusqlite = { version = "0.29", features = ["bundled"] }
serde = { version = "1.0", features = ["derive"] }

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"

# Tauri
tauri = { version = "2", features = ["shell-all"] }

[dev-dependencies]
tokio = { version = "1", features = ["full"] }
```

## Interoperabilidad Frontend-Backend

### Shared Types
- Mantén tipos sincronizados entre Rust y TypeScript
- Usa `serde` para serialización consistente
- Documental campos en ambos lados

```rust
// Rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackMetadata {
    pub title: String,
    pub artist: String,
    #[serde(rename = "beatgridAnalyzed")]
    pub beatgrid_analyzed: bool,
}

// TypeScript corresponde con:
interface TrackMetadata {
  title: string;
  artist: string;
  beatgridAnalyzed: boolean;
}
```

---

*Referencia: Tauri 2.0 con Rust en aplicación de escritorio para música*
