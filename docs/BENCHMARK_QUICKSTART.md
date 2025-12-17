# 🚀 Quick Start: Ejecutar Benchmark de Waveform

## Requisitos Previos

- ✅ Symphony ejecutándose (`make dev`)
- ✅ Algunos tracks importados en la biblioteca
- ✅ Variedad de formatos recomendada (MP3, FLAC, WAV)

## Paso 1: Acceder al Benchmark

1. Abre Symphony
2. En el header, busca la pestaña **"🔬 Benchmark"**
3. Haz click para acceder

## Paso 2: Seleccionar Track de Prueba

En la página de benchmark:

```
┌─────────────────────────────────────────────┐
│  Selecciona un track para benchmark:       │
│  ┌─────────────────────────────────────┐   │
│  │ ▼ Track Name - Artist (X:XX)       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Recomendaciones:**
- Elige archivos de diferentes tamaños
- Prueba varios formatos
- Preferir archivos > 5 MB para mejor comparación

## Paso 3: Ejecutar Benchmark

```
┌─────────────────────────────────────────────┐
│  Benchmark: Generación de Waveform         │
│                                             │
│  Archivo: track-name.mp3                   │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │     [Iniciar Benchmark]                │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Qué esperar:**
1. Click en "Iniciar Benchmark"
2. Mensaje: "Ejecutando Rust benchmark (3 iteraciones)..."
3. Esperar ~5 segundos
4. Mensaje: "Ejecutando WaveSurfer benchmark (3 iteraciones)..."
5. Esperar ~5 segundos más
6. Mensaje: "¡Benchmark completado!"

**Tiempo total:** ~10-15 segundos

## Paso 4: Interpretar Resultados

### Tabla de Resultados

```
┌────────────────────────────────────────────────────────────┐
│  🦀 Rust es 23.5% más rápido                               │
├────────────────┬──────────┬─────────┬──────────────────────┤
│ Método         │ Tiempo   │ Samples │ Memoria              │
├────────────────┼──────────┼─────────┼──────────────────────┤
│ Rust (Symph)   │ 125.34ms │ 50      │ 12.45 KB             │
│ WaveSurfer.js  │ 163.82ms │ 50      │ 34.21 KB             │
└────────────────┴──────────┴─────────┴──────────────────────┘
```

### Conclusión Automática

La interfaz mostrará automáticamente:

**Si diferencia < 100ms:**
```
💡 Conclusión:
⚖️ Performance similar (diferencia < 100ms). 
   Ambos métodos son viables.
```

**Si Rust es más rápido:**
```
💡 Conclusión:
🦀 Rust es significativamente más rápido.
   Mantener generación en backend para mejor performance.
```

**Si WaveSurfer es más rápido:**
```
💡 Conclusión:
⚡ WaveSurfer.js es significativamente más rápido.
   Considerar migrar generación al frontend.
```

## Paso 5: Documentar Resultados

### Opción A: Copiar a Archivo

1. Abrir `docs/benchmark-results.md`
2. Completar una sección de track con los datos
3. Guardar

```markdown
### Track 1: awesome-song.mp3
**Formato:** MP3  
**Tamaño:** 8.5 MB  
**Duración:** 3:45

| Método | Tiempo Promedio | Samples | Memoria | Ganador |
|--------|-----------------|---------|---------|---------|
| Rust (Symphonia) | 125.34 ms | 50 | 12.45 KB | ✅ |
| WaveSurfer.js | 163.82 ms | 50 | 34.21 KB | - |

**Diferencia:** 23.5% más rápido (Rust)
**Conclusión:** Rust superior en MP3 de tamaño medio
```

### Opción B: Screenshot

1. Tomar captura de pantalla de los resultados
2. Guardar en `docs/screenshots/benchmark-[track-name].png`
3. Referenciar en documentación

## Casos de Prueba Recomendados

### Test Suite Básico (3 tracks)

1. **MP3 Pequeño**
   - Tamaño: ~3-5 MB
   - Bitrate: 128kbps
   - Objetivo: Baseline performance

2. **FLAC Grande**
   - Tamaño: ~30-50 MB
   - Sin pérdida
   - Objetivo: Stress test

3. **WAV No Comprimido**
   - Tamaño: ~40-60 MB
   - Raw audio
   - Objetivo: Decodificación simple

### Test Suite Completo (5+ tracks)

Agregar:
- MP3 de alta calidad (320kbps)
- OGG Vorbis
- AAC/M4A
- Track muy largo (>10 min)

## Troubleshooting

### Problema: "No hay tracks disponibles"

**Solución:**
```
1. Ir a pestaña "Library"
2. Click en "Import"
3. Seleccionar carpeta con música
4. Esperar importación
5. Volver a "Benchmark"
```

### Problema: Benchmark se congela

**Solución:**
```
1. Abrir DevTools (F12)
2. Revisar Console por errores
3. Si hay error de CORS:
   - Verificar que Tauri Asset Protocol esté habilitado
   - Ver src-tauri/tauri.conf.json
4. Refrescar aplicación (Ctrl+R)
```

### Problema: Resultados inconsistentes

**Posibles causas:**
- Otros procesos consumiendo CPU
- Archivo corrupto
- Cache de navegador

**Solución:**
```
1. Cerrar otros programas
2. Ejecutar benchmark 2-3 veces
3. Promediar resultados manualmente
```

### Problema: WaveSurfer falla

**Error común:** "Cannot read property 'backend' of null"

**Solución:**
```
Revisar Console:
- Error de formato no soportado
- Problema de permisos de archivo
- Asset protocol no configurado
```

## Siguiente Paso: Tomar Decisión

Después de ejecutar benchmarks:

### Si Rust gana consistentemente
```bash
# Documentar decisión
echo "Mantener implementación Rust" >> docs/decisions.md

# Próximos pasos:
# - Optimizar cache en DB
# - Documentar ventaja
```

### Si WaveSurfer gana
```bash
# Crear plan de migración
# Ver docs/benchmark-summary.md sección "Escenario B"

# Tareas clave:
# - Migrar a HTMLAudioElement
# - Remover Rodio
# - Actualizar IPC
```

### Si empate
```bash
# Evaluar otros factores:
# - Complejidad de código
# - Mantenibilidad
# - Roadmap futuro
# - Experiencia del equipo
```

## Recursos

- **Guía completa:** [benchmark-waveform.md](./benchmark-waveform.md)
- **Template resultados:** [benchmark-results.md](./benchmark-results.md)
- **Resumen ejecutivo:** [benchmark-summary.md](./benchmark-summary.md)

---

**¿Listo?** Ejecuta `make dev` y comienza el benchmark! 🚀
