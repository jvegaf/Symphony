# Plan de Implementación - Symphony

## Resumen Ejecutivo

Symphony es una aplicación de escritorio para gestionar bibliotecas musicales profesionales con importación, reproducción, análisis de audio y herramientas de organización (playlists, metadatos, cue points, loops). Este documento detalla la estrategia de implementación, milestones, tareas y criterios de éxito para alcanzar una versión 1.0.0 estable.

## Fase 1: Clarificación de Requisitos

### Requisitos funcionales clave
- Importación y sincronización de música local con preservación de estructura
- Reproducción integrada y generación de waveforms
- Análisis de beatgrids, edición de cue points y loops
- Playlists CRUD y edición de metadatos
- Conversión a MP3 opcional durante importación

### Preguntas abiertas (necesarias antes de avanzar)
1. ¿Cuál es el tamaño esperado de la biblioteca de referencia para optimizar rendimiento? (p. ej. 5k, 20k+ pistas)
   - entre 5000 y 10000.
2. ¿Conversión a MP3 obligatoria u opcional por configuración?
    - opcional por configuracion
3. ¿Análisis de beatgrid automático al importar o bajo demanda?
    - estaria bien tener las dos posibilidades
4. ¿Integración futura con servicios de metadatos externos (MusicBrainz, Discogs)?
    - Si, tendremos que implementar una solucion para obtener los metadatos de sitios como Beatport, Traxsource, Youtube Music, Tidal, Deezer, Soundcloud...

## Fase 2: Diseño de Arquitectura

### Resumen de capas
- Frontend: React 18 + TypeScript, Tailwind CSS, Zustand/Jotai, TanStack Query
- Backend: Tauri 2.0 + Rust, Symphonia (decodificación), Rodio (reproducción), rusqlite (DB)
- Comunicación: IPC de Tauri (comandos + eventos)

### Componentes principales
- Frontend: `LibraryBrowser`, `TrackList`, `AudioPlayer`, `WaveformViewer`, `PlaylistManager`, `SettingsPanel`
- Backend: `audio/` (decoder, player, waveform), `library/` (scanner, importer, metadata), `db/` (models, queries), `commands/` (audio, library, playlists, settings)

### Esquema simplificado de DB (SQLite)
- `tracks`, `waveforms`, `beatgrids`, `cue_points`, `loops`, `playlists`, `playlist_tracks`, `settings`

## Fase 3: Plan de Implementación por Milestones

### Milestone 0 - Setup Inicial (Semana 1)
- Inicialización del proyecto Tauri + React + Tailwind
- Setup de testing (Vitest, cargo test)
- Configuración de SQLite y esquemas básicos
- CI/CD: GitHub Actions para build y releases

### Milestone 1 - Core Audio (Semanas 2-3)
- Backend: Implementar `audio/decoder`, `audio/player`, `audio/waveform` y comandos Tauri
- Frontend: Hooks `useAudioPlayer`, `AudioPlayer`, `WaveformViewer`

### Milestone 2 - Importación de Biblioteca (Semanas 4-5)
- Backend: `library/scanner`, `library/metadata`, `library/importer`, eventos de progreso
- Frontend: `ImportDialog`, `TrackList`, visualización y store `libraryStore`

### Milestone 3 - Edición & Playlists (Semana 6)
- CRUD de playlists, edición de metadatos, rating
- UI: `TrackDetail`, `PlaylistManager`, `PlaylistDetail`

### Milestone 4 - Análisis Avanzado (Semana 7)
- Implementar beatgrid, generación y edición de cue points y loops
- Hooks y UI para edición sobre waveform

### Milestone 5 - Settings, Conversión y Polish (Semana 8)
- Conversión a MP3 opcional y sistema de settings
- Refinamiento de UI para ajustarse a los prototipos

### Milestone 6 - Testing, Documentación y Release (Semana 9)
- Tests: cobertura ≥ 80% en frontend y backend
- E2E tests con Cypress/Playwright
- Documentación completa y release v1.0.0

## Integración y Flujos Principales
- Importación con `import_library` y eventos `library:import-progress` / `library:import-complete`
- Reproducción con `play_track`, `get_playback_state` y generación de waveform on-demand
- Edición de cue points y loops con comandos CRUD

## Criterios de Éxito para v1.0.0
- Importación de ~5,000 pistas en un tiempo razonable con progreso visible
- Reproducción estable con waveform interactivo
- CRUD de playlists y metadatos
- 80%+ cobertura de tests
- Builds funcionales para Windows y Linux

## Riesgos y Mitigaciones
- Importaciones grandes: importación en background, batch inserts y cache
- Alto uso de memoria por waveforms: resolución variable y cache comprimida
- Seguridad: validación de paths y manejo de permisos

## Próximos pasos inmediatos
1. Responder preguntas abiertas en Requisitos
2. Crear fixtures de testing para todos los formatos soportados
3. Inicializar Tauri + React + Tailwind y asegurar build

## Referencias
- docs/base.md
- .github/instructions/react-typescript.instructions.md
- .github/instructions/tauri-rust.instructions.md
- .github/instructions/testing.instructions.md
