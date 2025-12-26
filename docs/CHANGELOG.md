# Changelog

Todos los cambios notables de Symphony se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/es/).

## [0.8.1] - 2025-12-25

### 🐛 Corrección: Controles de Ventana

Se ha solucionado un bug crítico donde los botones de minimizar, maximizar y cerrar la ventana no funcionaban.

#### Correcciones

- **Controles de ventana funcionales**: Los botones de minimizar, maximizar y cerrar ahora funcionan correctamente usando la API `getCurrentWindow()` de Tauri
- **Permisos de Tauri capabilities**: Agregados permisos necesarios para control de ventana (`core:window:allow-close`, `core:window:allow-minimize`, `core:window:allow-toggle-maximize`, `core:window:allow-start-dragging`)

#### Mejoras

- **Accesibilidad**: Todos los controles de ventana ahora incluyen `aria-label` descriptivo
- **UX visual**: El botón de cerrar muestra hover rojo para indicar acción destructiva
- **Semántica HTML**: Los controles de ventana cambiados de `<span>` a `<button>` para mejor accesibilidad

#### Cambios Técnicos

- `Header.tsx`: Integración de `getCurrentWindow` con handlers dedicados
- `capabilities/default.json`: Nuevos permisos de ventana y `fs:allow-remove`

**Testing:** 442 frontend + 149 backend tests passing ✅

---

## [0.8.0] - 2025-12-25

### 🎹 Sistema de Cola de Reproducción y Atajos de Teclado

Esta versión introduce un sistema completo de cola de reproducción y atajos de teclado para DJs, permitiendo navegación rápida sin usar el mouse.

#### ✨ Nuevas Funcionalidades

- **Hook `usePlaybackQueue`**: Sistema de cola de reproducción que gestiona el orden de las pistas
  - `generateQueue(tracks, startIndex)` - Crea cola desde el índice hasta el final
  - `next()` / `previous()` - Navegación en la cola
  - `hasNext` / `hasPrevious` - Flags de disponibilidad
  - `clear()` - Limpia la cola

- **Atajos de teclado** (hook `usePlayerShortcuts`):
  | Tecla | Acción |
  |-------|--------|
  | **A** | Ir al inicio de la pista. Doble pulsación en <3s → pista anterior |
  | **D** | Siguiente pista en la cola |
  | **W** | Retroceder 10 segundos |
  | **S** | Avanzar 10 segundos |
  | **Space** | Pausar/Reanudar |

#### 🐛 Correcciones

- **Teclas A/D invertidas**: Corregido el comportamiento (A=anterior, D=siguiente)
- **Orden visual de la cola**: La cola ahora respeta el orden visual de la tabla (por título, BPM, fecha, etc.) en lugar del orden de la base de datos

#### 🔧 Cambios Técnicos

- `TrackTable.tsx`: El callback `onTrackDoubleClick` ahora pasa `(track, sortedTracks, index)` para preservar el orden visual
- `App.tsx`: Integración del hook `usePlaybackQueue` con lookup O(1) via `Map<string, Track>`
- Cobertura de tests: 28 nuevos tests (14 para `usePlaybackQueue`, 14 para `usePlayerShortcuts`)

**Resultados de testing:**
- Frontend: 439/439 tests passing ✅
- TypeScript: Sin errores ✅

---

## [0.7.0] - 2025-12-20

### 📦 Soporte AUR y Optimización de Builds

- **Soporte AUR (Arch Linux)**: Nuevo paquete `symphony-bin` para instalación via AUR
- **Optimización Docker AppImage**: Build multi-stage reducido de 20GB a 2-3GB
- **Comandos Makefile para AUR**: `make aur-build`, `make aur-install`, etc.
- **Documentación**: Investigación completa de portable builds

---

## [0.6.0] - 2025-12-19

### 🎯 Milestone 6 - Infraestructura E2E y Mejoras UI

- **E2E Testing**: Infraestructura completa con Playwright + WebDriver
- **Multi-select**: Selección múltiple de pistas con Ctrl/Shift
- **Track highlighting**: Resaltado visual de pistas seleccionadas
- **Editor layout**: Diseño de dos columnas para el editor de metadatos

---

## [0.5.3] - 2025-12-18

### 🔧 Mantenimiento

- Correcciones menores de CI
- Ajustes de cobertura de tests

---

## [0.5.2] - 2025-12-18

### 🐛 Correcciones

- Fix: advertencia clippy unnecessary-unwrap
- Fix: comandos cargo en Makefile

---

## [0.5.1] - 2025-12-17

### 🐛 Fixes Críticos de Interacción Waveform ([commit eb3ea9a](https://github.com/jvegaf/Symphony/commit/eb3ea9a))

Se resolvieron tres bugs críticos que afectaban la interacción del usuario con el waveform:

- **1. Seek en waveform no funcionaba**
  - Problema: El click en el waveform no hacía seek.
  - Causa raíz: WaveSurfer.js requiere audio URL para el evento 'interaction', pero Symphony usa peaks-only.
  - Solución: Cambio a evento 'click' en `WaveformViewer.tsx` (línea 156).
  - Archivos: `src/components/WaveformViewer.tsx`, `src/components/WaveformViewer.test.tsx`

- **2. Waveform generado al seleccionar pista**
  - Problema: El waveform se generaba con un solo click (selección), no solo al reproducir.
  - Solución: Separación de estado `selectedTrack` (UI) y `playingTrack` (audio) en `App.tsx` (líneas 22, 90, 141).
  - Archivos: `src/App.tsx`

- **3. Overlay de CuePointEditor bloqueaba clicks**
  - Problema: El área superior del waveform no recibía clicks por el overlay SVG.
  - Solución: Se aplicó `pointer-events-none` al contenedor SVG y `pointer-events-auto` a los marcadores `<g>`.
  - Archivos: `src/components/analysis/CuePointEditor.tsx` (líneas 78, 92)

**Documentación técnica y verificación:**
- [`docs/WAVEFORM_FIXES_COMPLETE.md`](docs/WAVEFORM_FIXES_COMPLETE.md) — Resumen técnico y diagramas
- [`docs/WAVEFORM_FIXES_QUICKREF.md`](docs/WAVEFORM_FIXES_QUICKREF.md) — Guía rápida de testing
- [`scripts/verify-waveform-fixes.sh`](../scripts/verify-waveform-fixes.sh) — Script de verificación automatizada
- [`src/components/analysis/AIDEV-CuePointEditor-PointerEvents.md`](src/components/analysis/AIDEV-CuePointEditor-PointerEvents.md) — Patrón de overlays SVG

**Resultados de testing:**
- Frontend: 420/420 tests passing ✅
- Backend: 147/147 tests passing ✅
- TypeScript: Sin errores ✅
- Build: Exitosa (331.31 kB) ✅
- **Total tests:** 567 (420 frontend + 147 backend)

---

## [0.4.1] - 2025-12-17

### 📊 Milestone 4 - Análisis Avanzado (Completado 100%)

[...contenido anterior sin cambios...]
