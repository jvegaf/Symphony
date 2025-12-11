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

### Milestone 0 - Setup Inicial (Semana 1) 🔄 EN PROGRESO

**Estado:** 75% completado (6 de 8 tareas)

#### ✅ Completado (11 dic 2025)
- ✅ **Fase 1: ANALYZE** - Creación de `requirements.md` con requisitos en formato EARS
  - Requisitos funcionales (RF-001 a RF-010) documentados
  - Requisitos no funcionales (RNF-001 a RNF-005) definidos
  - Casos de uso principales y edge cases identificados
  - Confidence Score: 88% (High Confidence)
  
- ✅ **Fase 2: DESIGN** - Creación de `design.md` con arquitectura completa
  - Arquitectura de 3 capas documentada (Frontend, Backend, Database)
  - Estructura de directorios definida
  - Esquema de base de datos SQLite diseñado
  - Flujos de comunicación IPC documentados
  - Consideraciones de performance y seguridad
  
- ✅ **Tarea 1:** Proyecto Tauri inicializado con React 18 + TypeScript
  - Template Tauri v2 con React instalado
  - TypeScript configurado en strict mode (`noImplicitReturns`, `noUnusedLocals`, etc.)
  - Build de producción funcional (`npm run build`)
  
- ✅ **Tarea 2:** Tailwind CSS v4 configurado
  - `@tailwindcss/postcss` instalado y configurado
  - Modo oscuro implementado con `useTheme` hook
  - Componentes UI base creados: `Button`, `Input`, `Card`
  - Utilidad `cn()` para combinar clases CSS
  - Estilos globales configurados
  
- ✅ **Documentación completa** de tasks.md con plan detallado

- ✅ **Tarea 3:** Setup de testing (Vitest + cargo test)
  - Vitest instalado con React Testing Library
  - Cobertura configurada con threshold de 80%
  - Tests creados para todos los componentes UI (49 tests)
  - Cobertura actual: **100% statements, 94.73% branches**
  - cargo test configurado con tokio-test
  - Tests de ejemplo en Rust (3 tests)
  - cargo-tarpaulin instalado para cobertura
  - Scripts de test agregados a package.json

#### 🔄 Pendiente
- ⏳ **Tarea 4:** Configuración de SQLite y esquemas básicos - SIGUIENTE
- ⏳ **Tarea 5:** CI/CD con GitHub Actions para builds y releases

**Próximo paso:** Implementar esquema SQLite con rusqlite, migraciones y queries básicas

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

## Estado Actual del Proyecto (11 dic 2025)

### ✅ Completado
1. ✅ Requisitos documentados en formato EARS (requirements.md)
2. ✅ Arquitectura técnica diseñada (design.md)
3. ✅ Plan de tareas detallado (tasks.md)
4. ✅ Proyecto Tauri + React + TypeScript inicializado
5. ✅ Tailwind CSS configurado con modo oscuro
6. ✅ Componentes UI base implementados
7. ✅ Setup de testing completado (Vitest + cargo test, 100% cobertura)

### 🔄 En Progreso
- Esquema SQLite
- CI/CD con GitHub Actions

### 📊 Progreso General
- **Milestone 0:** 75% (6/8 tareas)
- **Proyecto global:** 7.5% (Milestone 0 de 8 milestones totales)

## Próximos pasos inmediatos
1. ✅ ~~Responder preguntas abiertas en Requisitos~~ (Completado)
2. ⏳ Configurar Vitest con React Testing Library y cobertura 80%
3. ⏳ Implementar esquema SQLite con migraciones
4. ⏳ Crear fixtures de testing para todos los formatos soportados
5. ⏳ Setup de GitHub Actions para CI/CD

## Referencias
- docs/base.md
- .github/instructions/react-typescript.instructions.md
- .github/instructions/tauri-rust.instructions.md
- .github/instructions/testing.instructions.md
