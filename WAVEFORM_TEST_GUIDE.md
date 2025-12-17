# Comandos para Probar el Fix de Waveform

## 1. Limpiar cache antiguo (IMPORTANTE - ejecutar primero)

### Opción A: Desde el navegador (RECOMENDADO)
Abrir DevTools (F12) y ejecutar en la consola:
```javascript
const { invoke } = window.__TAURI__.core;
const deleted = await invoke('clear_waveform_cache');
console.log(`✅ ${deleted} waveforms eliminados del cache`);
```

### Opción B: Desde terminal
```bash
./scripts/clear-waveform-cache.sh
```

### Opción C: Manual con SQLite
```bash
sqlite3 ~/.local/share/symphony/symphony.db "DELETE FROM waveforms; VACUUM;"
```

## 2. Recompilar y ejecutar

```bash
# Limpiar builds anteriores
make clean

# Compilar backend (con nuevos valores)
cd src-tauri && cargo build && cd ..

# Iniciar en modo desarrollo
make dev
```

## 3. Probar sincronización

1. Importar una pista de ~3 minutos (ej. 180 segundos)
2. Reproducir la pista (genera waveform automáticamente)
3. Abrir DevTools (F12)
4. Buscar en consola el log: **"🔍 WaveformViewer - Diagnóstico de Sincronización"**
5. Verificar estos valores esperados para canción de 180s

## 4. Verificar sincronización visual

- [ ] El waveform se ve completo en el canvas (no cortado)
- [ ] Al hacer click en diferentes posiciones, salta al tiempo correcto
- [ ] El cursor azul se mueve sincronizado con el audio
- [ ] Los picos visuales coinciden con los picos audibles
- [ ] No hay "saltos" ni "compresión" del waveform

## 5. Validar con diferentes duraciones

Probar con canciones de diferentes longitudes:

| Duración | Peaks esperados | Ancho necesario | ¿Cabe en 1920px? |
|----------|-----------------|-----------------|------------------|
| 60s      | ~161            | 161px           | ✅ SÍ            |
| 180s     | ~484            | 484px           | ✅ SÍ            |
| 300s     | ~807            | 807px           | ✅ SÍ            |
| 600s     | ~1614           | 1614px          | ✅ SÍ            |

Todas deberían caber en pantallas Full HD (1920px).

## 6. Troubleshooting

### "El waveform aún no cabe"
```bash
# 1. Verificar que compilaste con los nuevos valores
cd src-tauri
grep "WAVEFORM_WINDOW_SIZE" src/audio/constants.rs
# Debe mostrar: pub const WAVEFORM_WINDOW_SIZE: usize = 16384;

# 2. Limpiar cache completamente
./scripts/clear-waveform-cache.sh

# 3. Rebuild completo
make clean && make dev
```

### "El log muestra peaksLength: 969"
Significa que estás usando waveforms del cache antiguo (generados con 8192).
Solución: Limpiar cache (paso 1) y regenerar.

### "fitsInCanvas: ❌ NO"
1. Verificar `barSpacing` en el log (debe ser "1px")
2. Si es "3px", el frontend no se actualizó
3. Solución: Hard reload (Ctrl+Shift+R) o recompilar frontend

## 7. Verificar mejoras de performance

### Antes del fix (8192 samples):
```
- Peaks: ~969 para 180s
- Tiempo generación: ~8-10s
- Tamaño cache: ~15KB por track
```

### Después del fix (16384 samples):
```
- Peaks: ~484 para 180s (50% reducción)
- Tiempo generación: ~4-5s (2x más rápido)
- Tamaño cache: ~8KB por track (47% reducción)
```

## 8. Comandos útiles de debugging

### Ver waveforms en DB
```bash
sqlite3 ~/.local/share/symphony/symphony.db << 'EOF'
.mode column
.headers on
SELECT 
    track_id,
    LENGTH(data) as bytes,
    datetime(created_at) as created
FROM waveforms
ORDER BY created_at DESC
LIMIT 10;
EOF
```

---

**Última actualización**: 2025-12-17  
**Ver también**: WAVEFORM_SYNC_FIX.md
