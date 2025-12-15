# Benchmark: Generación de Waveform

## 🎯 Objetivo

Comparar el rendimiento de dos enfoques para generar waveforms:

1. **Backend Rust (Symphonia)** - Actual implementación
2. **Frontend WaveSurfer.js** - Alternativa JavaScript

## 📊 Métricas Evaluadas

### 1. Tiempo de Generación (ms)
- Tiempo desde inicio hasta obtener peaks completos
- Promedio de 3 iteraciones por método
- **Menor = Mejor**

### 2. Número de Samples
- Cantidad de puntos de datos generados
- Target: 50 samples
- Debe ser consistente entre métodos

### 3. Uso de Memoria (KB)
- Diferencia en heap JS antes/después
- **Menor = Mejor**
- ⚠️ Aproximado (solo heap de JavaScript)

## 🚀 Cómo Ejecutar el Benchmark

### Paso 1: Acceder al Benchmark

1. Abrir Symphony
2. Click en la pestaña **"🔬 Benchmark"** en el header
3. Importar algunos tracks si no hay ninguno

### Paso 2: Seleccionar Track

- Usar el dropdown para elegir un archivo de prueba
- **Recomendado**: Probar con diferentes formatos:
  - MP3 (común, comprimido)
  - FLAC (sin pérdida, más pesado)
  - WAV (sin comprimir)
  - OGG, AAC, M4A

### Paso 3: Ejecutar Benchmark

1. Click en **"Iniciar Benchmark"**
2. Esperar a que complete (6 iteraciones: 3 Rust + 3 WaveSurfer)
3. Revisar resultados en la tabla

### Paso 4: Interpretar Resultados

La tabla muestra:

| Método | Tiempo (ms) | Samples | Memoria (KB) |
|--------|-------------|---------|--------------|
| Rust (Symphonia) | X.XX ms | 50 | Y.YY KB |
| WaveSurfer.js | X.XX ms | 50 | Y.YY KB |

**Conclusión Automática:**

- **Diferencia < 100ms**: Performance similar, ambos viables
- **Rust más rápido**: ✅ Mantener backend actual
- **WaveSurfer más rápido**: 🤔 Considerar migración a frontend

## 🔬 Detalles Técnicos

### Rust (Symphonia)

```rust
// src-tauri/src/audio/waveform.rs
pub fn generate_waveform_data(
    track_path: &str,
    target_samples: usize,
) -> Result<WaveformData, String> {
    // 1. Decodificar con Symphonia
    // 2. Skip 9/10 packets (optimización)
    // 3. Extraer peaks (max amplitude por segmento)
    // 4. Retornar vía IPC
}
```

**Ventajas:**
- ✅ Procesamiento paralelo nativo
- ✅ Soporte multi-formato (Symphonia)
- ✅ No bloquea UI (IPC asíncrono)

**Desventajas:**
- ❌ Overhead de comunicación IPC
- ❌ Requiere compilación Rust
- ❌ Mayor complejidad de debugging

### WaveSurfer.js

```typescript
// src/components/WaveformBenchmark.tsx
const wavesurfer = WaveSurfer.create({
  container,
  backend: "WebAudio", // Web Audio API
});

wavesurfer.load(convertFileSrc(trackPath));
```

**Ventajas:**
- ✅ Sin overhead de IPC
- ✅ Más simple (solo TypeScript)
- ✅ DevTools para debugging
- ✅ Librería madura y mantenida

**Desventajas:**
- ❌ Ejecuta en thread principal (puede bloquear UI)
- ❌ Limitado por capacidad de JS
- ❌ Mayor uso de memoria (heap JS)

## 📈 Resultados Esperados

### Escenario 1: Archivos Pequeños (< 5 MB)

**Predicción:** WaveSurfer probablemente más rápido
- Sin overhead de IPC
- Decodificación simple con Web Audio API
- Menos tiempo de comunicación

### Escenario 2: Archivos Grandes (> 50 MB)

**Predicción:** Rust probablemente más rápido
- Procesamiento nativo más eficiente
- Skip_factor reduce trabajo significativamente
- Mejor manejo de memoria

### Escenario 3: FLAC sin pérdida

**Predicción:** Rust significativamente más rápido
- Symphonia optimizado para FLAC
- Web Audio API puede tener overhead de decodificación

## 🎯 Decisión Arquitectónica

### Si Rust gana por >100ms:
✅ **Mantener backend actual**
- Ya optimizado con skip_factor
- Performance superior comprobada
- Vale la pena la complejidad

### Si WaveSurfer gana por >100ms:
🤔 **Considerar migración**

Beneficios adicionales:
1. Simplifica arquitectura
2. Permite `HTMLAudioElement` para playback (seeking instantáneo)
3. Mismo contexto para waveform + reproducción
4. Menos dependencias Rust

### Si diferencia < 100ms:
⚖️ **Otros factores deciden**

Considerar:
- Complejidad de mantenimiento
- Uso de memoria
- Experiencia del equipo
- Roadmap futuro (análisis avanzado requiere Rust)

## 🧪 Casos de Prueba Recomendados

Para una evaluación completa, ejecutar con:

1. **MP3 pequeño** (3-5 MB, 128kbps)
2. **MP3 grande** (10-15 MB, 320kbps)
3. **FLAC** (30-50 MB)
4. **WAV** (40-60 MB)
5. **OGG** (5-10 MB)

## 📝 Notas

- **Performance.memory**: Solo disponible en Chrome/Edge con flag
- **Resultados varían**: Dependen de hardware, formato, tamaño
- **Promedio de 3**: Reduce variabilidad de mediciones
- **Cooldown de 500ms**: Entre iteraciones para evitar throttling

## 🔮 Próximos Pasos

Basado en resultados del benchmark:

### Opción A: Mantener Rust
- Documentar ventaja de performance
- Optimizar aún más si es necesario
- Considerar cache en base de datos

### Opción B: Migrar a WaveSurfer
1. Migrar playback a `HTMLAudioElement`
2. Usar WaveSurfer para waveform
3. Eliminar `rodio`, `hound` de Cargo.toml (ahora usamos cpal + rb para audio)
4. Simplificar IPC commands

### Opción C: Híbrido
- Rust para análisis complejo (beatgrid, cue points)
- WaveSurfer para visualización simple
- Lo mejor de ambos mundos

---

**Documentación creada:** $(date)
**Versión Symphony:** 0.1.0
**Stack:** Tauri 2.0 + React 19 + TypeScript
