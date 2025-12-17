# Changelog

Todos los cambios notables de Symphony se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/es/).

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
- [`scripts/verify-waveform-fixes.sh`](scripts/verify-waveform-fixes.sh) — Script de verificación automatizada
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
