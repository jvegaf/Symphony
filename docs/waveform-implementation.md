# Implementación del Sistema de Waveform en Symphony

## Resumen

Este documento describe la arquitectura, problemas resueltos, decisiones de diseño y detalles técnicos del nuevo sistema de visualización de waveforms en Symphony. Incluye guía de depuración, checklist de testing, fragmentos de código clave y comparativa con enfoques anteriores (WaveSurfer.js, Musicat).

---

## Problemas Resueltos

1. **Condiciones de carrera** entre listeners y eventos (especialmente con caché)
2. **No había streaming visual**: el waveform solo aparecía al 100%
3. **Generación prematura**: waveform se generaba al seleccionar, no al reproducir
4. **Saltos de layout**: el canvas cambiaba de tamaño, moviendo la UI
5. **Bugs de capitalización de estado**: inconsistencias en el manejo de estados
6. **Stretching en WaveSurfer**: problemas visuales al hacer streaming
7. **Progreso basado en peaks**: no reflejaba el tiempo real de reproducción
8. **Sin feedback de hover**: no se podía buscar visualmente

---

## Decisión: Canvas Personalizado vs WaveSurfer.js

- **WaveSurfer.js**:
  - Pros: API sencilla, soporte para múltiples formatos
  - Contras: No soporta streaming real, problemas de stretching, difícil de depurar, dependencias pesadas
- **Canvas personalizado**:
  - Pros: Control total sobre el rendering, soporte para streaming progresivo, integración nativa con eventos Tauri, feedback visual inmediato, soporte para hover y seek, alta performance
  - Contras: Más código propio, requiere manejo manual de DPI y eventos

**Motivo de la migración:** Necesitábamos streaming visual, layout estable y control total sobre la UX.

---

## Arquitectura: Streaming de Chunks (Backend → Frontend)

### Backend (Rust)
- El backend genera los peaks del waveform progresivamente.
- Por cada bloque procesado, emite un evento `waveform:progress` con los nuevos peaks.
- Al finalizar, emite `waveform:complete` con todos los peaks normalizados.
- Si el waveform ya existe en caché, emite solo el evento `complete` (carga instantánea).

**Fragmento clave (Rust):**
```rust
// src-tauri/src/audio/waveform.rs
if packet_count % WAVEFORM_PEAKS_PER_PACKET == 0 {
    let _ = app.emit("waveform:progress", WaveformProgressPayload {
        track_id: track_id.to_string(),
        progress,
        peaks_so_far: peaks.len(),
        partial_peaks: peaks.clone(), // Solo los nuevos peaks
    });
}
```

### Frontend (React/TypeScript)
- El hook `useWaveform` escucha los eventos Tauri y acumula los peaks recibidos.
- El componente `WaveformCanvas` renderiza los peaks progresivamente en el canvas.
- El progreso visual se basa en el tiempo de reproducción (`currentTime/duration`).
- Hover muestra tooltip con tiempo y seek visual.

**Fragmento clave (TS):**
```typescript
// src/hooks/useWaveform.ts
const unlistenProgress = await listen<WaveformProgressPayload>('waveform:progress', (event) => {
  if (event.payload.trackId === trackId && isActive) {
    const partialPeaks = event.payload.partialPeaks && event.payload.partialPeaks.length > 0
      ? new Float32Array(event.payload.partialPeaks)
      : null;
    setState((prev) => ({
      ...prev,
      progress: event.payload.progress,
      peaks: partialPeaks || prev.peaks,
      isLoading: true,
    }));
  }
});
```

---

## Progreso Basado en Tiempo

- El progreso de reproducción se calcula como `currentTime / duration`.
- El canvas colorea la parte reproducida en azul y el resto en azul oscuro.
- El usuario puede hacer hover para ver la posición y click para hacer seek.

**Fragmento clave (TS):**
```typescript
// src/components/WaveformCanvas.tsx
const progressX = Math.floor((currentTime / duration) * width);
ctx.fillStyle = playedColor;
ctx.fillRect(0, 0, progressX, height);
```

---

## Constantes y Configuración Clave

- **Ancho de barra:** 2px
- **Gap entre barras:** 1px
- **Altura canvas:** 64px (fijo)
- **Colores:** Azul (`#2563eb`) para reproducido, azul oscuro (`#1e293b`) para no reproducido
- **DPI:** Soporte para pantallas HiDPI (multiplica dimensiones por `window.devicePixelRatio`)

---

## Sistema de Caché

- El backend guarda los peaks generados en SQLite.
- Si el usuario vuelve a reproducir la misma pista, el waveform se carga instantáneamente desde caché (sin eventos de progreso).
- El frontend detecta si los peaks vienen de caché y muestra el waveform al instante.

---

## Troubleshooting: Problemas Comunes

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| No aparece el waveform | No hay eventos recibidos | Verifica listeners y logs de backend |
| Waveform aparece de golpe | Solo se recibe evento `complete` | Puede ser caché, prueba limpiar caché |
| Hover no muestra tooltip | Canvas no recibe eventos de mouse | Verifica que el div no tenga `pointer-events: none` |
| Progreso no avanza | `currentTime` no se actualiza | Verifica integración con player |
| Layout salta | Canvas no tiene altura fija | Asegúrate de usar `height: 64px` |

---

## Checklist de Testing

- [ ] El waveform se genera solo al reproducir/pausar
- [ ] El canvas mantiene altura fija (64px) en todo momento
- [ ] El waveform se dibuja progresivamente (streaming)
- [ ] El progreso visual sigue el tiempo de reproducción
- [ ] Hover muestra línea y tooltip con tiempo
- [ ] Click en el canvas hace seek correctamente
- [ ] El waveform carga instantáneamente si está en caché
- [ ] No hay saltos de layout al seleccionar/reproducir
- [ ] Funciona en pantallas HiDPI
- [ ] Soporta archivos largos (>10 min) sin problemas

---

## Snippets de Implementación Clave

### 1. Backend: Emisión de chunks
```rust
// src-tauri/src/audio/waveform.rs
let mut last_emitted_peak_count = 0;
for ... {
    // ... procesamiento ...
    if peaks.len() > last_emitted_peak_count {
        let new_peaks = peaks[last_emitted_peak_count..].to_vec();
        let _ = app.emit("waveform:progress", WaveformProgressPayload {
            track_id: track_id.to_string(),
            progress,
            peaks_so_far: peaks.len(),
            partial_peaks: new_peaks,
        });
        last_emitted_peak_count = peaks.len();
    }
}
```

### 2. Frontend: Acumulación de chunks
```typescript
// src/hooks/useWaveform.ts
const [peaks, setPeaks] = useState<Float32Array>(new Float32Array());
listen('waveform:progress', (event) => {
  setPeaks((prev) => {
    const next = new Float32Array(prev.length + event.partialPeaks.length);
    next.set(prev);
    next.set(event.partialPeaks, prev.length);
    return next;
  });
});
```

### 3. Canvas: Renderizado y feedback
```typescript
// src/components/WaveformCanvas.tsx
for (let i = 0; i < peaks.length; i++) {
  const x = i * (BAR_WIDTH + BAR_GAP);
  ctx.fillStyle = i < playedBars ? playedColor : unplayedColor;
  ctx.fillRect(x, y, BAR_WIDTH, barHeight);
}
```

---

## Comparativa con Otros Enfoques

- **WaveSurfer.js**: No soporta streaming real, problemas de stretching, integración limitada con Tauri.
- **Musicat**: Usaba canvas pero sin streaming progresivo ni feedback de hover/seek.
- **Canvas personalizado (actual)**: Streaming real, feedback inmediato, UX superior, integración total con backend.

---

## Consejos de Depuración

- Usa la utilidad global `window.debugWaveform()` en la consola para ver todos los eventos.
- Verifica logs en `~/.local/share/symphony/symphony.log` para eventos de backend.
- Si el waveform no aparece, limpia la caché con:
  ```bash
  sqlite3 ~/.local/share/symphony/symphony.db "DELETE FROM waveforms;"
  ```
- Usa DevTools para inspeccionar el canvas y eventos de mouse.
- Si hay saltos de layout, revisa que todos los contenedores tengan altura fija.

---

## Referencias

- [src/components/WaveformCanvas.tsx]
- [src/hooks/useWaveform.ts]
- [src-tauri/src/audio/waveform.rs]
- [src/components/layout/PlayerSection.tsx]

---

**Última actualización:** 2025-12-16
