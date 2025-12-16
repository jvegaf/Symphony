# Fix Aplicado: WaveformViewer - Versión Corregida

> ⚠️ **DEPRECATED**: Este documento ha sido reemplazado por [docs/waveform-implementation.md](docs/waveform-implementation.md). Mantener solo como referencia histórica.


## Problemas Identificados y Solucionados

### ✅ Problema 1: Waveform se generaba al seleccionar en lugar de al reproducir

**Antes:** El componente `WaveformViewer` se montaba cuando seleccionabas cualquier pista, incluso sin reproducir.

**Solución:** Ahora el waveform solo se genera cuando la pista está **reproduciendo o en pausa**.

```tsx
// PlayerSection.tsx - Solo mostrar cuando hay playback activo
{(state === "playing" || state === "paused") && (
  <div className="mt-3">
    <WaveformViewer ... />
  </div>
)}
```

### ✅ Problema 2: Errores de codec no soportado (M4A/AAC) mostraban error rojo

**Antes:** Archivos M4A/AAC fallaban con mensaje de error técnico confuso.

**Solución:** Ahora detecta automáticamente archivos no soportados y muestra mensaje amigable:

```
⚠️ Formato de audio no soportado para waveform (M4A/AAC)
```

### ✅ Problema 3: Componente usaba Card y era muy grande

**Antes:** WaveformViewer usaba componente Card con título, ocupaba mucho espacio.

**Solución:** Versión compacta sin Card, integrada directamente en PlayerSection.

## Comportamiento Actual

### Flujo de Trabajo

1. **Seleccionar pista** → No hace nada (no genera waveform)
2. **Hacer doble click (play)** → Audio empieza a reproducir
3. **WaveformViewer se monta** → Solicita waveform
4. **Backend verifica cache:**
   - ✅ Si existe → Carga instantáneo
   - ⏳ Si no existe → Genera en background

### Estados Visuales

**🎵 Reproduciendo MP3 (soportado):**
```
┌─────────────────────────────────┐
│  [Waveform visual renderizado]  │
│  ▂▃▅▇█▇▅▃▂ ▂▃▅▇█▇▅▃▂           │
└─────────────────────────────────┘
```

**⏳ Generando (primera vez):**
```
┌─────────────────────────────────┐
│  [Contenedor vacío]             │
│  ████████░░░░░░░░░░░ 45%        │
│  Generando waveform... 45%      │
└─────────────────────────────────┘
```

**⚠️ Archivo M4A/AAC (no soportado):**
```
┌─────────────────────────────────┐
│  [Contenedor vacío]             │
│  ⚠️ Formato de audio no         │
│     soportado para waveform     │
│     (M4A/AAC)                   │
└─────────────────────────────────┘
```

**❌ Error de cancelación (cambio de pista):**
```
No muestra nada - error "Cancelled" se ignora
```

## Archivos Modificados

### Frontend

**`src/components/layout/PlayerSection.tsx`**
- ✅ Solo renderiza WaveformViewer si `state === "playing" || "paused"`
- ✅ Pasa props correctas: trackId, trackPath, duration, onSeek

**`src/components/WaveformViewer.tsx`**
- ✅ Removido componente Card (más compacto)
- ✅ Detecta errores de codec no soportado
- ✅ Muestra mensaje amigable para M4A/AAC
- ✅ Ignora errores de "Cancelled" (cambio de pista)
- ✅ UI más compacta para integración en player

### Backend

**`src-tauri/src/audio/waveform.rs`**
- ✅ Logs detallados de generación
- ✅ Eventos emitidos correctamente
- ✅ Cache funcional

## Testing

### Caso 1: Archivo MP3 (soportado) - Primera vez

```bash
# Logs esperados
🎵 get_waveform: track_id=..., path=.../song.mp3
🔍 Checking waveform cache...
🎵 Waveform cache MISS - generating
🔧 generate_and_stream_peaks START
✅ Decoding complete - 1800 peaks generated
✅ Normalization complete
📤 Emitting waveform:complete event - 1800 peaks
```

**UI:** Muestra barra de progreso → Waveform renderizado

### Caso 2: Archivo MP3 (soportado) - Segunda vez

```bash
# Logs esperados
🎵 get_waveform: track_id=..., path=.../song.mp3
🔍 Checking waveform cache...
✅ Waveform cache HIT
📤 Emitting waveform:complete event (from cache) - 1800 peaks
```

**UI:** Waveform aparece instantáneamente (desde cache)

### Caso 3: Archivo M4A/AAC (no soportado)

```bash
# Logs esperados
🎵 get_waveform: track_id=..., path=.../song.m4a
🔍 Checking waveform cache...
🎵 Waveform cache MISS - generating
🔧 generate_and_stream_peaks START
❌ Decoder creation failed: unsupported codec
❌ Waveform generation FAILED: unsupported codec
📤 Emitting waveform:error event
```

**UI:** Mensaje amigable "⚠️ Formato de audio no soportado para waveform (M4A/AAC)"

### Caso 4: Cambio de pista durante generación

```bash
# Logs esperados
🎵 get_waveform: track_id=abc, path=.../song1.mp3
🔧 generate_and_stream_peaks START
🛑 cancel_waveform: track_id=abc
🛑 Cancelled waveform generation
❌ Waveform generation FAILED: Cancelled
📤 Emitting waveform:error event

🎵 get_waveform: track_id=xyz, path=.../song2.mp3
[continúa con nueva pista]
```

**UI:** No muestra error (se ignora "Cancelled")

## Limitaciones Conocidas

### ❌ Formatos No Soportados para Waveform

- M4A (AAC en contenedor MP4)
- ALAC (Apple Lossless)
- Algunos codecs propietarios

**Nota:** El AUDIO se reproduce correctamente (usa decoder diferente), solo el waveform no se puede generar.

### ⏳ Primera Generación Lenta

- Archivos largos (>5 min) pueden tardar 5-15 segundos
- Se genera en background, no bloquea reproducción
- Cache persiste entre sesiones

## Próximos Pasos (Opcional)

### Mejora 1: Agregar soporte M4A

Requiere activar feature `aac` en Symphonia o usar decoder alternativo.

### Mejora 2: Pre-generación en background

Generar waveforms para toda la biblioteca al importar.

### Mejora 3: Indicador visual durante generación

Mostrar spinner animado en lugar de progreso porcentual.

### Mejora 4: Fallback para codecs no soportados

Generar waveform genérico basado en metadata (duration, bitrate).

## Comandos Útiles

### Ver logs en tiempo real

```bash
# Solo waveform
tail -f ~/.local/share/symphony/symphony.log | grep -i waveform

# Todo
tail -f ~/.local/share/symphony/symphony.log
```

### Limpiar cache de waveforms

```bash
sqlite3 ~/.local/share/symphony/symphony.db "DELETE FROM waveforms;"
```

### Verificar waveforms en DB

```bash
sqlite3 ~/.local/share/symphony/symphony.db
SELECT track_id, resolution, date_generated FROM waveforms;
```

### Verificar tracks

```bash
sqlite3 ~/.local/share/symphony/symphony.db
SELECT id, title, path, duration FROM tracks LIMIT 10;
```

## Resultado Final

Ahora el sistema de waveform:

- ✅ Solo se activa al reproducir (no al seleccionar)
- ✅ Maneja errores de codec gracefully
- ✅ Cache funcional (rápido en subsecuentes reproducciones)
- ✅ UI compacta integrada en player
- ✅ Mensajes de error amigables
- ✅ No bloquea reproducción de audio

**Estado:** Funcional para archivos MP3. Archivos M4A/AAC se reproducen pero no muestran waveform (esperado).
