# Diseño Arquitectónico - Symphony v1.0.0

## Visión General

Symphony es una aplicación de escritorio construida con arquitectura de 3 capas que separa la presentación (React), la lógica de negocio (Tauri/Rust) y la persistencia (SQLite). La comunicación entre capas se realiza mediante IPC (Inter-Process Communication) de Tauri.

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
│                  React 18 + TypeScript                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   UI     │  │  Stores  │  │  Hooks   │              │
│  │Components│  │ (Zustand)│  │ (Custom) │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                      │
│       └─────────────┴─────────────┘                      │
│                     │                                     │
│              TanStack Query                               │
│                     │                                     │
└─────────────────────┼─────────────────────────────────────┘
                      │ Tauri IPC (invoke/listen)
                      │
┌─────────────────────┼─────────────────────────────────────┐
│                     │         BACKEND LAYER                │
│                Tauri 2.0 + Rust                           │
│       ┌─────────────┴─────────────┐                       │
│       │    Tauri Commands         │                       │
│       └─────────────┬─────────────┘                       │
│  ┌────────┐  ┌──────┴──────┐  ┌──────────┐              │
│  │ Audio  │  │   Library   │  │ Database │              │
│  │ Module │  │   Module    │  │  Module  │              │
│  └────┬───┘  └──────┬──────┘  └────┬─────┘              │
│       │             │              │                      │
└───────┼─────────────┼──────────────┼──────────────────────┘
        │             │              │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │Symphonia│   │  File   │   │ SQLite  │
   │ (decode)│   │ System  │   │   DB    │
   └─────────┘   └─────────┘   └─────────┘
```

## Capa Frontend (React + TypeScript)

### Estructura de Directorios

```
src/
├── main.tsx                 # Punto de entrada React
├── App.tsx                  # Componente raíz
├── components/              # Componentes reutilizables
│   ├── ui/                  # Componentes base (Button, Input, etc.)
│   ├── AudioPlayer/         # Reproductor de audio
│   │   ├── AudioPlayer.tsx
│   │   ├── AudioPlayer.test.tsx
│   │   └── Controls.tsx
│   ├── WaveformViewer/      # Visualizador de waveforms
│   │   ├── WaveformViewer.tsx
│   │   ├── WaveformViewer.test.tsx
│   │   └── WaveformCanvas.tsx
│   ├── TrackList/           # Lista de pistas
│   │   ├── TrackList.tsx
│   │   ├── TrackList.test.tsx
│   │   ├── TrackItem.tsx
│   │   └── VirtualizedList.tsx
│   └── PlaylistManager/     # Gestor de playlists
│       ├── PlaylistManager.tsx
│       ├── PlaylistDetail.tsx
│       └── PlaylistEditor.tsx
├── pages/                   # Páginas principales
│   ├── Library.tsx          # Vista de biblioteca
│   ├── Player.tsx           # Vista de reproducción
│   ├── Playlists.tsx        # Vista de playlists
│   └── Settings.tsx         # Configuración
├── stores/                  # Estado global (Zustand)
│   ├── audioStore.ts        # Estado de reproducción
│   ├── libraryStore.ts      # Estado de biblioteca
│   ├── playlistStore.ts     # Estado de playlists
│   └── settingsStore.ts     # Configuración
├── hooks/                   # Custom hooks
│   ├── useAudioPlayer.ts    # Hook de reproducción
│   ├── useTauriCommand.ts   # Wrapper genérico Tauri
│   ├── useLibrary.ts        # Hook de biblioteca
│   └── useWaveform.ts       # Hook de waveform
├── api/                     # Cliente Tauri
│   ├── audio.ts             # Comandos de audio
│   ├── library.ts           # Comandos de biblioteca
│   ├── playlists.ts         # Comandos de playlists
│   └── types.ts             # Tipos compartidos
├── utils/                   # Utilidades
│   ├── formatters.ts        # Formateadores (tiempo, tamaño)
│   ├── validators.ts        # Validadores
│   └── constants.ts         # Constantes
└── styles/                  # Estilos globales
    ├── globals.css          # Estilos base + Tailwind
    └── themes.css           # Temas (dark/light)
```

### State Management (Zustand)

```typescript
// audioStore.ts
interface AudioState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  
  // Actions
  play: (track: Track) => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
}

// libraryStore.ts
interface LibraryState {
  tracks: Track[];
  isLoading: boolean;
  importProgress: number | null;
  
  // Actions
  setTracks: (tracks: Track[]) => void;
  addTracks: (tracks: Track[]) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
}
```

### Data Fetching (TanStack Query)

```typescript
// Queries
export const useGetTracks = () => {
  return useQuery({
    queryKey: ['tracks'],
    queryFn: () => invoke<Track[]>('get_all_tracks'),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Mutations
export const useImportLibrary = () => {
  return useMutation({
    mutationFn: (path: string) => 
      invoke<ImportResult>('import_library', { path }),
    onSuccess: (result) => {
      // Invalidar cache de tracks
      queryClient.invalidateQueries(['tracks']);
    },
  });
};
```

## Capa Backend (Tauri + Rust)

### Estructura de Directorios

```
src-tauri/
├── src/
│   ├── main.rs              # Punto de entrada
│   ├── lib.rs               # Librería
│   ├── audio/               # Módulo de audio
│   │   ├── mod.rs
│   │   ├── decoder.rs       # Decodificación con Symphonia
│   │   ├── player.rs        # Reproducción con Rodio
│   │   └── waveform.rs      # Generación de waveforms
│   ├── library/             # Módulo de biblioteca
│   │   ├── mod.rs
│   │   ├── scanner.rs       # Escaneo de carpetas
│   │   ├── importer.rs      # Importación de pistas
│   │   ├── metadata.rs      # Extracción de metadatos
│   │   └── converter.rs     # Conversión a MP3
│   ├── db/                  # Módulo de base de datos
│   │   ├── mod.rs
│   │   ├── schema.rs        # Definición de esquemas
│   │   ├── models.rs        # Structs de datos
│   │   ├── queries.rs       # Queries SQL
│   │   └── migrations.rs    # Migraciones
│   ├── commands/            # Comandos Tauri
│   │   ├── mod.rs
│   │   ├── audio.rs         # Comandos de audio
│   │   ├── library.rs       # Comandos de biblioteca
│   │   ├── playlists.rs     # Comandos de playlists
│   │   └── settings.rs      # Comandos de configuración
│   ├── error.rs             # Tipos de error
│   ├── config.rs            # Configuración
│   └── utils.rs             # Utilidades
├── tests/                   # Tests de integración
│   ├── audio_test.rs
│   ├── library_test.rs
│   └── fixtures/            # Fixtures de audio
│       ├── sample.mp3
│       ├── sample.flac
│       └── sample.wav
├── Cargo.toml               # Dependencias Rust
└── tauri.conf.json          # Configuración Tauri
```

### Arquitectura de Módulos

#### Audio Module

##### Nueva Arquitectura de Audio (cpal + rb)

```mermaid
flowchart TD
    FE[Frontend]
    CMD[Tauri Commands]
    DEC[Decode Thread\nSymphonia]
    RB[Ring Buffer\n(rb)]
    AO[Audio Output\n(cpal)]
    FE -- invoke/play_track --> CMD
    CMD -- StreamFile --> DEC
    DEC -- PCM frames --> RB
    AO -- read frames --> RB
    AO -- emit events --> FE
```

- **Ventajas:**
  - Seeking instantáneo (sin re-decodificación)
  - Latencia mínima
  - Control preciso de volumen/dispositivo
  - Eventos push (sin polling)

- **Decisión:**
  - Rodio fue reemplazado por cpal + rb para permitir control total del pipeline de audio y eliminar la latencia de seek.

- **Frontend:**
  - Usar siempre el hook `useAudioPlayer` para controlar el player y escuchar eventos.

---

```rust
// audio/decoder.rs
pub struct AudioDecoder {
    codec: Box<dyn Decoder>,
}

impl AudioDecoder {
    pub fn decode_file(path: &Path) -> Result<AudioData, AudioError> {
        // Symphonia para decodificación multi-formato
    }
    
    pub fn extract_metadata(path: &Path) -> Result<Metadata, AudioError> {
        // Extracción de tags (ID3, FLAC, etc.)
    }
}

// audio/player.rs
pub struct AudioPlayer {
    sink: Sink,
    device: Device,
}

impl AudioPlayer {
    pub fn play(&mut self, track: &Track) -> Result<(), AudioError> {
        // Rodio para reproducción
    }
    
    pub fn get_state(&self) -> PlaybackState {
        // Estado actual de reproducción
    }
}

// audio/waveform.rs
pub struct WaveformGenerator {
    resolution: usize,
}

impl WaveformGenerator {
    pub fn generate(audio: &AudioData, resolution: usize) -> Vec<f32> {
        // Generación de waveform con downsampling
    }
}
```

#### Library Module

```rust
// library/scanner.rs
pub struct LibraryScanner {
    supported_formats: Vec<String>,
}

impl LibraryScanner {
    pub async fn scan_directory(path: &Path) -> Result<Vec<PathBuf>, ScanError> {
        // Escaneo recursivo con filtrado de extensiones
    }
}

// library/importer.rs
pub struct LibraryImporter {
    db: Arc<Mutex<Connection>>,
    scanner: LibraryScanner,
}

impl LibraryImporter {
    pub async fn import(
        &mut self,
        path: &Path,
        window: &Window,
    ) -> Result<ImportResult, ImportError> {
        // Importación con progreso y eventos
        // Emite: library:import-progress, library:import-complete
    }
}
```

#### Database Module

```rust
// db/models.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: i64,
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub year: Option<i32>,
    pub genre: Option<String>,
    pub bpm: Option<f64>,
    pub duration: f64,
    pub bitrate: i32,
    pub format: String,
    pub artwork_path: Option<String>,
    pub rating: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub track_count: i32,
    pub created_at: String,
    pub updated_at: String,
}
```

### Comandos Tauri (IPC API)

```rust
// commands/audio.rs

#[tauri::command]
pub async fn play_track(
    id: i64,
    player: State<'_, AudioPlayer>,
    db: State<'_, Database>,
) -> Result<(), String> {
    // Cargar pista y reproducir
}

#[tauri::command]
pub async fn pause(player: State<'_, AudioPlayer>) -> Result<(), String> {
    // Pausar reproducción
}

#[tauri::command]
pub async fn get_playback_state(
    player: State<'_, AudioPlayer>,
) -> Result<PlaybackState, String> {
    // Obtener estado
}

#[tauri::command]
pub async fn get_waveform(
    id: i64,
    db: State<'_, Database>,
    cache: State<'_, WaveformCache>,
) -> Result<Vec<f32>, String> {
    // Obtener waveform (cacheada)
}

// commands/library.rs

#[tauri::command]
pub async fn import_library(
    path: String,
    window: Window,
    importer: State<'_, LibraryImporter>,
) -> Result<ImportResult, String> {
    // Importar biblioteca con progreso
}

#[tauri::command]
pub async fn get_all_tracks(
    db: State<'_, Database>,
) -> Result<Vec<Track>, String> {
    // Obtener todas las pistas
}

#[tauri::command]
pub async fn update_track_metadata(
    id: i64,
    metadata: TrackMetadata,
    db: State<'_, Database>,
) -> Result<(), String> {
    // Actualizar metadatos
}
```

## Base de Datos (SQLite)

### Esquema de Base de Datos

```sql
-- Tabla principal de pistas
CREATE TABLE tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    year INTEGER,
    genre TEXT,
    bpm REAL,
    duration REAL NOT NULL,
    bitrate INTEGER NOT NULL,
    format TEXT NOT NULL,
    artwork_path TEXT,
    rating INTEGER DEFAULT 0 CHECK(rating >= 0 AND rating <= 5),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda rápida
CREATE INDEX idx_tracks_artist ON tracks(artist);
CREATE INDEX idx_tracks_title ON tracks(title);
CREATE INDEX idx_tracks_genre ON tracks(genre);
CREATE INDEX idx_tracks_bpm ON tracks(bpm);

-- Waveforms cacheadas
CREATE TABLE waveforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL UNIQUE,
    data BLOB NOT NULL,
    resolution INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- Beatgrids
CREATE TABLE beatgrids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL UNIQUE,
    bpm REAL NOT NULL,
    offset REAL NOT NULL DEFAULT 0,
    grid_data BLOB NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- Cue points
CREATE TABLE cue_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL,
    position REAL NOT NULL,
    label TEXT,
    color TEXT,
    cue_index INTEGER NOT NULL CHECK(cue_index >= 0 AND cue_index < 8),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    UNIQUE(track_id, cue_index)
);

-- Loops
CREATE TABLE loops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL,
    start_position REAL NOT NULL,
    end_position REAL NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    CHECK(end_position > start_position)
);

-- Playlists
CREATE TABLE playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Relación muchos-a-muchos: Playlists <-> Tracks
CREATE TABLE playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, position)
);

-- Configuración de usuario
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Triggers para actualizar timestamps
CREATE TRIGGER update_tracks_timestamp 
AFTER UPDATE ON tracks
BEGIN
    UPDATE tracks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_playlists_timestamp 
AFTER UPDATE ON playlists
BEGIN
    UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### Migraciones

```rust
// db/migrations.rs

pub fn run_migrations(conn: &Connection) -> Result<()> {
    // Versión 1: Esquema inicial
    conn.execute_batch(include_str!("../migrations/001_initial_schema.sql"))?;
    
    // Versión 2: Agregar columna rating (futuro)
    // conn.execute_batch(include_str!("../migrations/002_add_rating.sql"))?;
    
    Ok(())
}
```

## Flujos de Comunicación

### Flujo de Importación de Biblioteca

```
┌─────────┐                     ┌─────────┐                    ┌─────────┐
│ Frontend│                     │  Tauri  │                    │Database │
└────┬────┘                     └────┬────┘                    └────┬────┘
     │                               │                              │
     │ invoke("import_library")      │                              │
     ├───────────────────────────────>│                              │
     │                               │                              │
     │                               │ scan_directory()             │
     │                               ├──────────────┐               │
     │                               │              │               │
     │                               │<─────────────┘               │
     │                               │                              │
     │                               │ foreach file:                │
     │                               │   extract_metadata()         │
     │                               │   insert_track()             │
     │                               ├──────────────────────────────>│
     │                               │                              │
     │ listen("library:import-progress")                            │
     │<──────────────────────────────┤                              │
     │  { current: 100, total: 5000 }│                              │
     │                               │                              │
     │                               │                              │
     │ listen("library:import-complete")                            │
     │<──────────────────────────────┤                              │
     │  { imported: 5000, failed: 0 }│                              │
     │                               │                              │
```

### Flujo de Reproducción

```
┌─────────┐                     ┌─────────┐                    ┌─────────┐
│ Frontend│                     │  Audio  │                    │Database │
└────┬────┘                     └────┬────┘                    └────┬────┘
     │                               │                              │
     │ invoke("play_track", {id})    │                              │
     ├───────────────────────────────>│                              │
     │                               │ get_track(id)                │
     │                               ├──────────────────────────────>│
     │                               │<──────────────────────────────┤
     │                               │  Track                        │
     │                               │                              │
     │                               │ load_audio()                 │
     │                               │ start_playback()             │
     │                               ├──────────┐                   │
     │                               │          │                   │
     │                               │<─────────┘                   │
     │<──────────────────────────────┤                              │
     │  Ok(())                       │                              │
     │                               │                              │
     │ invoke("get_playback_state")  │                              │
     ├───────────────────────────────>│                              │
     │<──────────────────────────────┤                              │
     │  { position: 10.5, ... }      │                              │
```

## Consideraciones de Performance

### Frontend

1. **Virtualización de Listas**: Usar `react-window` o `react-virtual` para listas de miles de pistas
2. **Lazy Loading**: Cargar artwork bajo demanda con placeholder
3. **Debouncing**: Búsqueda en tiempo real con debounce de 300ms
4. **Memoización**: React.memo para TrackItem y componentes repetidos
5. **Code Splitting**: Lazy load de páginas con React.lazy

### Backend

1. **Batch Inserts**: Insertar pistas en lotes de 100 con transacciones
2. **Índices DB**: Índices en columnas de búsqueda frecuente
3. **Cache de Waveforms**: Almacenar waveforms generadas en DB
4. **Async Operations**: Importación y análisis en hilos separados
5. **Connection Pooling**: Pool de conexiones SQLite si es necesario

### Base de Datos

1. **WAL Mode**: Habilitar Write-Ahead Logging para concurrencia
2. **PRAGMA optimize**: Optimización automática de índices
3. **Vacuuming**: Limpieza periódica de espacio no utilizado

## Seguridad

### Validación de Input

```rust
// Validación de paths
pub fn validate_library_path(path: &str) -> Result<PathBuf, ValidationError> {
    let path = PathBuf::from(path);
    
    // Evitar path traversal
    if path.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err(ValidationError::PathTraversal);
    }
    
    // Validar existencia
    if !path.exists() || !path.is_dir() {
        return Err(ValidationError::InvalidPath);
    }
    
    Ok(path.canonicalize()?)
}
```

### Permisos de Archivos

```rust
// Permisos restrictivos para DB
#[cfg(unix)]
fn set_db_permissions(path: &Path) -> io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    let permissions = fs::Permissions::from_mode(0o600);
    fs::set_permissions(path, permissions)
}
```

## Manejo de Errores

### Estrategia de Error Handling

```rust
// error.rs
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Error de audio: {0}")]
    Audio(#[from] AudioError),
    
    #[error("Error de base de datos: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Error de I/O: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Error de importación: {0}")]
    Import(String),
}

// Conversión a String para Tauri
impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}
```

## Testing Strategy

### Frontend Tests

1. **Unit Tests**: Hooks, utilidades, stores
2. **Component Tests**: Componentes individuales con React Testing Library
3. **Integration Tests**: Flujos completos (importación, reproducción)

### Backend Tests

1. **Unit Tests**: Módulos individuales con mocks
2. **Integration Tests**: Comandos Tauri con DB en memoria
3. **Fixtures**: Archivos de audio de muestra para tests

## Deployment

### Build Configuration

```json
// tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "bundle": {
    "identifier": "com.symphony.app",
    "targets": ["deb", "appimage", "msi", "nsis"],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256"
    }
  }
}
```

## Referencias

- [Tauri 2.0 Documentation](https://v2.tauri.app/)
- [React 18 Documentation](https://react.dev/)
- [Symphonia Documentation](https://docs.rs/symphonia/latest/symphonia/)
- [Rusqlite Documentation](https://docs.rs/rusqlite/latest/rusqlite/)
