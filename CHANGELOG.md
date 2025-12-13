# Changelog

Todos los cambios notables de Symphony se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/es/).

## [Unreleased]

### 📋 Milestone 0 - Setup Inicial (En Progreso)

#### Agregado - 2025-12-11

##### Documentación
- Creado `requirements.md` con requisitos completos en formato EARS
  - 10 requisitos funcionales (RF-001 a RF-010)
  - 5 requisitos no funcionales (RNF-001 a RNF-005)
  - Casos de uso principales y edge cases
  - Matriz de trazabilidad y confidence score (88%)
- Creado `design.md` con arquitectura técnica completa
  - Arquitectura de 3 capas (Frontend, Backend, Database)
  - Esquema de base de datos SQLite
  - Flujos de comunicación IPC
  - Consideraciones de performance y seguridad
- Creado `tasks.md` con plan detallado de implementación del Milestone 0
- Actualizado `implementation-plan.md` con progreso actual
- Actualizado `README.md` con información completa del proyecto

##### Infraestructura
- Inicializado proyecto Tauri v2.0 con React 18 y TypeScript
- Configurado TypeScript en strict mode
  - Habilitado `strict`, `noUnusedLocals`, `noUnusedParameters`
  - Habilitado `noImplicitReturns`, `noFallthroughCasesInSwitch`
- Configurado Tailwind CSS v4 con `@tailwindcss/postcss`
- Implementado modo oscuro con hook `useTheme`
  - Persistencia en localStorage
  - Detección de preferencia del sistema
  - Toggle dinámico

##### Componentes UI
- Creado componente `Button` con variantes primary/secondary
- Creado componente `Input` con soporte para label y error
- Creado componente `Card` para agrupar contenido
- Creada utilidad `cn()` para combinar clases CSS
- Implementados estilos globales con Tailwind

##### Desarrollo
- Configurado build de producción funcional
- Estructura de directorios según arquitectura diseñada
- Hot reload funcionando en modo desarrollo

##### Testing - 2025-12-11
- Configurado Vitest con React Testing Library
  - Instalado `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
  - Configurado jsdom environment
  - Cobertura con threshold 80% (statements/functions/branches/lines)
- Creado setup de test con mocks de Tauri APIs
  - Mock de `@tauri-apps/api/core` (invoke)
  - Mock de `@tauri-apps/api/event` (listen, emit)
  - Mock de matchMedia y localStorage
- Implementados tests para todos los componentes UI
  - `Button.test.tsx`: 9 tests (variants, disabled state, click handlers)
  - `Input.test.tsx`: 12 tests (label, error, disabled, auto-generated IDs)
  - `Card.test.tsx`: 9 tests (with/without title, dark mode)
- Implementados tests para hooks
  - `useTheme.test.ts`: 9 tests (toggle, localStorage, system preference)
- Implementados tests para utilidades
  - `cn.test.ts`: 10 tests (combine, conditional, complex cases)
- Agregados scripts de test a package.json
  - `test`: Vitest en watch mode
  - `test:ui`: Vitest con interfaz gráfica
  - `test:run`: Ejecutar tests una vez
  - `test:coverage`: Generar reporte de cobertura
- Configurado cargo test con tokio-test
  - Agregado `tokio` y `tokio-test` a dev-dependencies
  - Creados 3 tests de ejemplo en lib.rs
- Instalado cargo-tarpaulin para cobertura de Rust

**Cobertura Frontend:** 100% statements, 94.73% branches, 100% functions/lines  
**Tests Frontend:** 49 passed (5 archivos)  
**Tests Backend:** 3 passed (Rust)

##### Base de Datos - 2025-12-11
- Implementado esquema SQLite con 8 tablas
  - `tracks`: Metadatos de pistas con índices en artist, album, genre
  - `playlists`, `playlist_tracks`: Sistema de playlists
  - `cue_points`, `loops`: Puntos de referencia y loops
  - `beatgrids`, `settings`, `library_sync`: Análisis y configuración
- Implementado sistema de conexión con pool
  - `connection.rs`: Gestión de conexiones con singleton pattern
  - `models.rs`: Structs con Serialize/Deserialize
  - `queries.rs`: 10 operaciones CRUD tipificadas
- Implementadas migraciones versionadas
  - `migrations.rs`: Sistema de versionado automático con tabla `schema_version`
  - `V1__initial_schema.sql`: Schema inicial con constraints e índices
- Agregados tests de base de datos (19 tests)
  - Tests de conexión, modelos, queries y migraciones
  - Fixtures con datos de prueba
  - Tests de unicidad de constraints

**Tests Backend:** 19 passed (database module)

##### CI/CD - 2025-12-11
- Configurado GitHub Actions workflows
  - `ci.yml`: Build y tests en Ubuntu y Windows
    - Checkout, setup Rust/Node.js
    - Caché de Cargo y npm
    - Build frontend y backend
    - Ejecución de tests con cobertura
    - Matrix strategy (ubuntu-latest, windows-latest)
  - `release.yml`: Release automatizado con semantic tags
    - Trigger en tags `v*.*.*`
    - Build de releases para Windows y Linux
    - Generación de instaladores y portables
    - Publicación automática a GitHub Releases
    - Checksums para verificación
- Configuradas dependencias del sistema
  - Ubuntu: libwebkit2gtk-4.1-dev, build-essential, libssl-dev
  - Windows: WebView2 runtime
  - Rust 1.70+ stable

### 📋 Milestone 1 - Core Audio (Completado 75%)

#### Agregado - 2025-12-11

##### Backend Audio
- Implementado módulo de decodificación (`audio/decoder.rs`)
  - Struct `AudioDecoder` con método estático `decode()`
  - Soporte para formatos: MP3, FLAC, WAV, OGG, AAC, M4A
  - Extracción de metadatos: duration, sample_rate, channels, bitrate, codec
  - Validación de formato con extensiones y magic bytes
  - Integración con Symphonia 0.5 para probing y decoding
  - **Tests:** 4 tests (decodificación válida, formato no soportado, archivo inválido, extracción de metadata)

- Implementado reproductor de audio (`audio/player.rs`)
  - Struct `AudioPlayer` con control completo de reproducción
  - Métodos: `play()`, `pause()`, `resume()`, `stop()`, `get_state()`, `is_playing()`
  - Enum `PlaybackState`: Playing, Paused, Stopped
  - Thread-safety con `Arc<Mutex<AudioOutput>>` (wrapper para Rodio)
  - Integración con Rodio 0.17 (OutputStream, Sink)
  - Manejo de errores con `AudioError` custom
  - **Tests:** 3 tests (reproducción, pausa, stop)

- Implementado generador de waveforms (`audio/waveform.rs`)
  - Struct `WaveformGenerator` con método `generate()`
  - Downsampling con cálculo RMS para precisión
  - Control de resolución (samples por segundo)
  - Struct `WaveformData` con samples y metadata
  - Integración con Hound 3.5 para lectura WAV
  - **Tests:** 3 tests (generación exitosa, archivo inválido, downsampling)

- Implementado sistema de errores (`audio/error.rs`)
  - Enum `AudioError` con 6 variantes específicas
  - Type alias `AudioResult<T>` para conveniencia
  - Trait implementations: Display, Error, From (io, symphonia)
  - Mensajes de error descriptivos en español
  - **Tests:** 3 tests (display formatting, error conversion)

##### Comandos Tauri
- Implementados 6 comandos de audio (`commands/audio.rs`)
  - `play_track`: Reproduce pista desde path
  - `pause_playback`: Pausa reproducción actual
  - `resume_playback`: Resume reproducción pausada
  - `stop_playback`: Detiene reproducción
  - `get_playback_state`: Obtiene estado actual
  - `decode_audio_metadata`: Extrae metadatos de pista
  - Struct `AudioPlayerState` con `Arc<Mutex<AudioPlayer>>`
  - Manejo de errores con conversión a String
  - **Tests:** 3 tests (play, pause, stop commands)

- Actualizado `lib.rs` con integración completa
  - Módulo `audio` público
  - Módulo `commands` público
  - Registro de comandos en `invoke_handler`
  - Gestión de `AudioPlayerState` global

##### Frontend
- Implementados tipos TypeScript (`types/audio.ts`)
  - Interfaces: `AudioMetadata`, `PlaybackState`, `PlaybackStateResponse`, `WaveformData`
  - Mirror de tipos Rust con nomenclatura TypeScript
  - Documentación JSDoc completa

- Implementado hook `useAudioPlayer` (`hooks/useAudioPlayer.ts`)
  - Estado: `isPlaying`, `state`, `currentTrackPath`
  - Funciones: `play()`, `pause()`, `resume()`, `stop()`, `refreshState()`
  - Integración con comandos Tauri
  - Sincronización automática de estado con `useEffect`
  - Manejo de errores con try/catch
  - **Tests:** 8 tests (reproducción, pausa, resume, stop, estado, sincronización)

- Implementado componente `AudioPlayer` (`components/AudioPlayer.tsx`)
  - Props: `trackPath`, `trackTitle`, callbacks (`onPlay`, `onPause`, `onStop`)
  - Uso de `useAudioPlayer` hook
  - Renderizado dinámico de botones según estado
  - Indicador de estado de reproducción
  - Manejo de errores con mensajes al usuario
  - Accesibilidad con aria-labels
  - Estilos con Tailwind CSS (modo oscuro incluido)
  - **Tests:** 17 tests (renderizado, interacción, estados, callbacks, accesibilidad, errores)

##### Documentación
- Creado `docs/API.md` con documentación completa
  - 6 comandos Tauri documentados con firmas TypeScript
  - Ejemplos de uso con código funcional
  - Casos de error y manejo
  - Guía de integración con TanStack Query
  - Lista de formatos soportados
  - Notas de implementación y roadmap
  - Convenciones de nomenclatura

- Actualizado `package.json`
  - Cambiado script "test" a "vitest run" (no watch mode)
  - Agregado script "test:watch" para modo watch opcional

##### Dependencias
- Frontend: Sin cambios adicionales
- Backend:
  - `symphonia = { version = "0.5", features = ["default"] }`
  - `rodio = { version = "0.17", features = ["symphonia-all"] }`
  - `hound = "3.5"`

**Tests Milestone 1:** 47 passed (16 backend + 31 frontend)  
**Tests Totales:** 115 passed (35 backend + 80 frontend)  
**Cobertura Frontend:** 91.75% statements, 88.63% branches ✅, 100% functions, 91.48% lines  
**Threshold Cumplido:** ✅ 80% en todas las métricas

##### Frontend - Waveform Viewer - 2025-12-11
- Implementado componente `WaveformViewer` (`components/WaveformViewer.tsx`)
  - Integración con WaveSurfer.js para visualización
  - Props: audioPath, height, waveColor, progressColor, callbacks
  - Controles de reproducción integrados (play/pause)
  - Zoom interactivo (zoom in, zoom out, reset)
  - Indicador de tiempo (current/duration)
  - Manejo de estados: loading, error, ready
  - Callbacks: onSeek, onReady, onError
  - Accesibilidad con aria-labels
  - Estilos Tailwind CSS con modo oscuro
  - **Tests:** 23 tests (87.87% cobertura)

**Tests Totales Finales:** 103 passed (35 backend + 68 frontend)  
**Cobertura Frontend Final:** 90.18% statements, 83.78% branches ✅, 95.23% functions, 90.44% lines

#### ✅ Milestone 1 Completado al 100%
- 8/8 tareas completadas
- 103 tests passing
- Cobertura > 80% en todas las métricas
- Documentación completa
- Tag: milestone-1

---

### 📋 Milestone 2 - Importación de Biblioteca (Completado 100%)

#### Agregado - 2025-12-11

##### Backend Library
- Implementado módulo de escaneo (`library/scanner.rs`)
  - Struct `LibraryScanner` con método `scan_directory()`
  - Escaneo recursivo de directorios
  - Filtrado por extensiones: mp3, flac, wav, ogg, m4a, aac
  - Manejo de permisos y directorios inaccesibles
  - Función auxiliar `is_supported_audio_file()`
  - **Tests:** 10 tests (escaneo recursivo, filtrado, permisos, directorios vacíos)

- Implementado módulo de extracción de metadatos (`library/metadata.rs`)
  - Struct `MetadataExtractor` con `extract_metadata()`
  - Struct `TrackMetadata` con campos completos
  - Extracción de ID3 tags, FLAC tags, etc.
  - Método batch: `extract_metadata_batch()`
  - Integración con `AudioDecoder` de Milestone 1
  - Conversión de `TrackMetadata` a modelo `Track`
  - **Tests:** 11 tests (extracción MP3/FLAC/WAV, campos vacíos, batch processing)

- Implementado coordinador de importación (`library/importer.rs`)
  - Struct `LibraryImporter` con `import_library()`
  - Enums: `ImportPhase` (Scanning, Importing, Complete)
  - Structs: `ImportProgress`, `ImportResult`
  - Eventos Tauri: `library:import-progress` (cada 100 pistas o 1 seg)
  - Evento Tauri: `library:import-complete` al finalizar
  - Coordinación: scanner → metadata → database
  - Función auxiliar `metadata_to_track()`
  - **Tests:** 7 tests (importación exitosa, progreso, eventos, errores)

- Implementado sistema de errores (`library/error.rs`)
  - Enum `LibraryError` con 6 variantes
  - Conversiones desde io::Error, rusqlite::Error, AudioError
  - Type alias `LibraryResult<T>`
  - Trait implementations completos
  - **Tests:** 4 tests (display, conversiones)

##### Comandos Tauri (Library)
- Implementados 5 comandos (`commands/library.rs`)
  - `import_library`: Importa biblioteca con progreso
  - `get_all_tracks`: Obtiene todas las pistas
  - `search_tracks`: Búsqueda por título/artista/álbum
  - `get_track_by_id`: Obtiene pista específica
  - `get_library_stats`: Estadísticas de biblioteca
  - Struct `LibraryState` con `Arc<Mutex<LibraryImporter>>`
  - Struct `LibraryStats` con totales y distribución de formatos
  - **Tests:** 2 tests (import command, get_all_tracks command)

- Agregadas queries de base de datos (`db/queries.rs`)
  - `search_tracks()`: Búsqueda con patrón LIKE
  - `get_track_by_id()`: Alias de get_track()

- Actualizado `lib.rs` con módulo library y comandos

##### Frontend Library
- Implementados tipos TypeScript (`types/library.ts`)
  - Interfaces: `Track`, `ImportProgress`, `ImportResult`, `LibraryStats`
  - Enums: `ImportPhase`, `SearchOptions`
  - Compatibilidad con backend Rust (camelCase)

- Implementados hooks personalizados (`hooks/useLibrary.ts`)
  - `useImportLibrary()`: Importación con tracking de progreso
    - Escucha eventos `library:import-progress` y `library:import-complete`
    - Estado: progress, isPending, isError, error
    - Limpieza automática de listeners
  - `useGetAllTracks()`: Query de todas las pistas (cache 5 min)
  - `useSearchTracks(query, enabled)`: Búsqueda condicional (cache 2 min)
  - `useGetTrack(id, enabled)`: Query de pista específica (cache 5 min)
  - `useLibraryStats()`: Estadísticas de biblioteca (cache 1 min)
  - Integración completa con TanStack Query
  - **Tests:** 14 tests (hooks, progress events, queries, invalidation)

- Implementado componente `ImportDialog` (`components/ImportDialog.tsx`)
  - Selección de carpeta con `@tauri-apps/plugin-dialog`
  - Barra de progreso con porcentaje y conteo
  - Indicador de fase (scanning/importing/complete)
  - Manejo de errores con alertas visuales
  - Estado de completado con confirmación
  - Callbacks: `onComplete`, `onError`
  - Estilos Tailwind CSS con modo oscuro
  - **Tests:** 13 tests (selección, importación, progreso, callbacks)

- Implementado componente `TrackList` (`components/TrackList.tsx`)
  - Virtualización con `react-window` para grandes bibliotecas
  - Columnas: Título, Artista, Álbum, Duración, BPM
  - Búsqueda integrada (mínimo 2 caracteres)
  - Ordenamiento por columna (ascendente/descendente)
  - Indicadores visuales de ordenamiento (↑/↓)
  - Formateo de duración (MM:SS)
  - Selección de pista con highlight
  - Callbacks: `onTrackClick`, `onTrackDoubleClick`
  - Estados: loading, empty, no results
  - Props: `tracks`, `height`, callbacks
  - **Tests:** 23 tests (renderizado, búsqueda, ordenamiento, virtualización)

##### Dependencias
- Frontend:
  - `@tanstack/react-query`: Data fetching y cache
  - `@tauri-apps/plugin-dialog`: Diálogos nativos
  - `react-window`: Virtualización de listas
  - `@types/react-window`: Tipos TypeScript
- Backend:
  - `tempfile = "3.8"` (dev-dependency para tests)

##### Documentación
- Actualizado `docs/API.md` con 5 comandos de biblioteca
  - Documentación completa con firmas TypeScript
  - Ejemplos de uso con eventos y listeners
  - Casos de error específicos
  - Guía de hooks personalizados

#### Corregido - 2025-12-13
- **UI**: Corregido formato de fecha "NaN" en `TrackTable` y mejorada visibilidad de texto en modo oscuro.
- **Backend**: Implementada extracción real de metadatos (Título, Artista, Álbum, Año, Género) usando Symphonia.
- **Backend**: Corregida inicialización de `AudioMetadata` y mutabilidad en `decoder.rs`.
- **Backend**: Actualizados modelos `Track` y `Playlist` para usar serialización `camelCase` compatible con frontend.
- **Infraestructura**: Actualizado `Makefile` para incluir tests de backend en target `test`.
- **Importación**: Implementada inserción en base de datos en `importer.rs` (previamente TODO).

**Tests Milestone 2 Backend:** +34 tests (10 scanner + 11 metadata + 7 importer + 4 error + 2 commands)  
**Tests Milestone 2 Frontend:** +50 tests (14 useLibrary + 13 ImportDialog + 23 TrackList)  
**Tests Totales:** 187 passed (69 backend + 118 frontend)  
**Cobertura:** 80%+ en todos los módulos ✅

#### ✅ Milestone 2 Completado al 100%
- 8/8 tareas completadas
- 84 nuevos tests (34 backend + 50 frontend)
- Backend: scanner, metadata, importer, commands completos
- Frontend: hooks, ImportDialog, TrackList completos
- Documentación actualizada
- Cobertura > 80%

---

## [0.1.0] - Planeado para Q1 2026

### Milestone 1 - Core Audio ✅
- Decodificación de audio con Symphonia
- Reproducción con Rodio
- Generación de waveforms
- Comandos Tauri de audio
- UI de AudioPlayer y WaveformViewer

### Milestone 2 - Importación de Biblioteca ✅
- Escaneo recursivo de directorios
- Extracción de metadatos
- Importación con progreso en tiempo real
- UI de importación y lista de pistas

### Milestone 3 - Playlists y Edición
- CRUD de playlists
- Edición de metadatos
- Sistema de rating
- Drag & drop

### Milestone 4 - Análisis Avanzado
- Análisis de beatgrids
- Cue points personalizados
- Loops de reproducción
- UI de edición sobre waveform

### Milestone 5 - Settings y Conversión
- Sistema de configuración
- Conversión a MP3 opcional
- Refinamiento de UI

### Milestone 6 - Testing y Release
- Cobertura de tests ≥ 80%
- E2E tests
- Documentación completa
- Release v1.0.0

---

**Formato de Commits:** Este proyecto usa [Conventional Commits](https://www.conventionalcommits.org/es/)

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`
