# Guía de Diagnóstico de Waveforms

> ⚠️ **DEPRECATED**: Esta guía ha sido reemplazada por [docs/waveform-implementation.md](docs/waveform-implementation.md). Consulta ese documento para la arquitectura y troubleshooting actualizados.


## Problema
Waveforms no se muestran en el reproductor aunque el sistema está implementado.

## Arquitectura del Sistema

### Backend (Rust)
1. **Comando:** `get_waveform(track_id, track_path, duration)`
2. **Función:** `generate_waveform_streaming()` 
   - Verifica cache en DB
   - Si existe → emite `waveform:complete` inmediatamente
   - Si no existe → genera en background y emite eventos
3. **Eventos emitidos:**
   - `waveform:progress` → Durante generación
   - `waveform:complete` → Al finalizar (con peaks: Vec<f32>)
   - `waveform:error` → Si falla

### Frontend (TypeScript)
1. **Hook:** `useWaveform(trackId, trackPath, duration)`
   - Escucha eventos Tauri
   - Invoca `invoke('get_waveform', ...)`
   - Convierte `number[]` → `Float32Array`
2. **Componente:** `WaveformViewer`
   - Usa hook para obtener peaks
   - Carga en WaveSurfer: `wavesurfer.load("", [peaks], duration)`

## Pasos para Diagnosticar

### 1. Iniciar la aplicación

```bash
# Terminal 1: Ejecutar app en modo desarrollo
cd /home/th3g3ntl3man/Code/Symphony
npm run tauri dev
```

```bash
# Terminal 2: Ver logs del backend en tiempo real
tail -f ~/.local/share/symphony/symphony.log
```

### 2. Abrir DevTools del navegador

1. En la ventana de Symphony presiona `F12`
2. Ve a la pestaña **Console**
3. Filtra por "waveform" si hay mucho ruido

### 3. Acciones en la app

1. Importar biblioteca (si aún no lo has hecho)
2. Navegar a Library
3. Hacer click en una pista para abrirla en el Player
4. **Observar logs en AMBAS terminales**

### 4. Verificar qué logs aparecen

#### Logs esperados en **Frontend (Console F12)**:

```
========== useWaveform: REQUESTING WAVEFORM ==========
Track ID: <uuid>
Track Path: /path/to/file.mp3
Duration: 180.5
👂 useWaveform: Setting up event listeners for track: <uuid>
✅ get_waveform command sent successfully
```

Si hay eventos:
```
📊 waveform:progress event: { trackId: "...", progress: 0.25, peaksSoFar: 500 }
✅ waveform:complete event: { trackId: "...", peaksLength: 1800 }
```

#### Logs esperados en **Backend (Terminal 2)**:

```
🎵 get_waveform: track_id=<uuid>, path=/path/to/file.mp3
========== GENERATE_WAVEFORM_STREAMING START ==========
Track ID: <uuid>
Track Path: /path/to/file.mp3
Duration: 180.50s
🔍 Checking waveform cache...
```

Si está en cache:
```
✅ Waveform cache HIT for track <uuid>
```

Si NO está en cache:
```
🎵 Waveform cache MISS - generating for track <uuid>
[... progreso de generación ...]
```

### 5. Escenarios posibles

#### ❌ Escenario 1: No aparece NADA en frontend console
**Problema:** Hook no se está ejecutando
- Verificar que WaveformViewer se monta correctamente
- Verificar props: trackId, trackPath, duration no son undefined

#### ❌ Escenario 2: Se ve request pero no "Setting up event listeners"
**Problema:** useEffect de listeners no se ejecuta
- Bug en el hook

#### ❌ Escenario 3: Se ve request y setup, pero nunca llega "waveform:complete"
**Problema:** Backend no emite eventos o frontend no escucha
- Revisar logs del backend (Terminal 2)
- Ver si hay errores en la generación

#### ❌ Escenario 4: Llega "waveform:complete" pero no se renderiza
**Problema:** WaveSurfer no carga correctamente
- Ver console para errores de WaveSurfer
- Verificar conversión number[] → Float32Array
- Verificar que peaks no sea vacío

#### ✅ Escenario 5: Todo funciona y se renderiza
**Éxito!** 🎉

## Debugging adicional

### Verificar base de datos

```bash
sqlite3 ~/.local/share/symphony/symphony.db

-- Ver si hay waveforms guardados
SELECT track_id, resolution, date_generated FROM waveforms LIMIT 10;

-- Ver tracks
SELECT id, title, path, duration FROM tracks LIMIT 5;
```

### Limpiar cache para forzar regeneración

```bash
sqlite3 ~/.local/share/symphony/symphony.db "DELETE FROM waveforms;"
```

### Verificar que archivo existe

En Console (F12):
```javascript
await invoke('read_audio_file', { path: '/path/to/file.mp3' })
```

## Checklist de verificación

- [ ] App arranca sin errores
- [ ] Backend muestra banner con ruta de log
- [ ] Frontend abre correctamente (http://localhost:1420)
- [ ] Library tiene pistas importadas
- [ ] Al hacer click en pista, se abre Player
- [ ] Player muestra metadata correctamente
- [ ] WaveformViewer se renderiza (aunque sea vacío)
- [ ] Console muestra "REQUESTING WAVEFORM"
- [ ] Console muestra "Setting up event listeners"
- [ ] Backend muestra "get_waveform: track_id=..."
- [ ] Backend muestra "GENERATE_WAVEFORM_STREAMING START"
- [ ] Se emiten eventos (progress/complete/error)
- [ ] Frontend recibe eventos
- [ ] WaveSurfer se inicializa
- [ ] Waveform se renderiza visualmente

## Soluciones rápidas

### Si nada funciona

```bash
# Limpiar todo y empezar de cero
rm -rf ~/.local/share/symphony/
npm run tauri dev
```

### Si hay errores de TypeScript

```bash
npm run type-check
```

### Si hay errores de Rust

```bash
cd src-tauri
cargo clippy --all-targets --all-features
```

## Próximos pasos

Una vez que identifiques qué escenario es el tuyo, reporta:

1. **Escenario #:** (del 1-5)
2. **Logs de frontend:** (copiar de Console)
3. **Logs de backend:** (copiar de Terminal 2)
4. **Errores visibles:** (screenshots si es posible)

Con esa información podemos identificar el problema exacto y corregirlo.
