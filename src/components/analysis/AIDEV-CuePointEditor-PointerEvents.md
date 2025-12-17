/**
 * AIDEV-NOTE: CuePointEditor - Patrón de Pointer Events para Overlays SVG
 * 
 * PROBLEMA RESUELTO (Dec 17, 2025):
 * El overlay SVG de CuePointEditor estaba bloqueando los clicks en el waveform.
 * Los usuarios solo podían hacer seek en la zona inferior del canvas.
 * 
 * SOLUCIÓN:
 * Implementar el patrón de pointer-events en cascada:
 * 
 * 1. SVG Container (línea 78):
 *    className="pointer-events-none"
 *    → Pasa TODOS los eventos de puntero al elemento debajo (WaveformCanvas)
 *    → Por defecto, el SVG NO captura clicks
 * 
 * 2. Elementos <g> (línea 92):
 *    className="pointer-events-auto"
 *    → Los grupos individuales de marcadores SÍ capturan clicks
 *    → Solo los marcadores de cue points son interactivos
 * 
 * RESULTADO:
 * - Click en área vacía del waveform → Seek (pasa a WaveformCanvas)
 * - Click en marcador de cue point → Jump to cue (capturado por <g>)
 * - Ambas funciones trabajan simultáneamente sin conflicto
 * 
 * ESTRUCTURA DE CAPAS EN PlayerSection.tsx:
 * ┌─────────────────────────────────────┐
 * │  Relative Container                 │
 * │  ┌───────────────────────────────┐  │
 * │  │ WaveformCanvas (base)         │  │ ← Recibe clicks de seek
 * │  └───────────────────────────────┘  │
 * │  ┌───────────────────────────────┐  │
 * │  │ BeatgridOverlay               │  │ ← pointer-events-none
 * │  │ (pointer-events-none)         │  │
 * │  └───────────────────────────────┘  │
 * │  ┌───────────────────────────────┐  │
 * │  │ CuePointEditor (top)          │  │ ← SVG: pointer-events-none
 * │  │ └─ <g> markers                │  │    <g>: pointer-events-auto
 * │  └───────────────────────────────┘  │
 * └─────────────────────────────────────┘
 * 
 * ESTE PATRÓN SE DEBE APLICAR A TODOS LOS OVERLAYS SVG EN EL FUTURO
 * 
 * Ver también:
 * - src/components/layout/PlayerSection.tsx (líneas 233-275)
 * - src/components/analysis/BeatgridOverlay.tsx (ya implementado)
 */
