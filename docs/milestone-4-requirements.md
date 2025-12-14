# Milestone 4 - Requirements (EARS Notation)

**Milestone:** Advanced Analysis (Beatgrids, Cue Points, Loops)  
**Fecha inicio:** 13 de diciembre, 2025  
**Estado:** ANALYZE Phase  
**Confidence Score:** 85% (High Confidence)

---

## 1. Requisitos Funcionales (EARS Notation)

### RF-011: Análisis de Beatgrids

**RF-011.1 - Detección Automática de BPM**
```
WHEN el usuario solicita análisis de beatgrid de una pista,
THE SYSTEM SHALL detectar automáticamente el BPM (tempo) de la pista
  USING algoritmos de detección de tempo
  AND almacenar el resultado en la base de datos
  AND actualizar el campo bpm de la pista.
```

**RF-011.2 - Análisis Manual de Beatgrid**
```
WHEN el usuario visualiza una pista en el editor de waveform,
THE SYSTEM SHALL permitir establecer manualmente el BPM
  BY clicking en beats consecutivos sobre el waveform
  AND calcular el BPM promedio basado en los clicks
  AND ajustar automáticamente la cuadrícula de beats (beatgrid)
  AND persistir el beatgrid en la base de datos.
```

**RF-011.3 - Visualización de Beatgrid**
```
WHEN una pista tiene beatgrid analizado,
THE SYSTEM SHALL mostrar marcadores visuales sobre el waveform
  INDICATING la posición de cada beat
  WITH líneas verticales en la visualización
  AND permitir zoom para verificar precisión.
```

**RF-011.4 - Ajuste Fino de Beatgrid**
```
WHEN el usuario detecta desfase en el beatgrid,
THE SYSTEM SHALL permitir ajustar el offset del primer beat
  BY dragging el primer marcador de beat
  AND re-calcular todos los beats subsecuentes
  AND actualizar visualmente la cuadrícula en tiempo real.
```

**RF-011.5 - Análisis por Lotes**
```
WHERE el usuario selecciona múltiples pistas,
THE SYSTEM SHALL permitir análisis de beatgrid por lotes
  BY procesando pistas en background
  AND mostrando progreso en tiempo real (N de M procesadas)
  AND reportar pistas con análisis fallido.
```

### RF-012: Gestión de Cue Points

**RF-012.1 - Creación de Cue Points**
```
WHEN el usuario hace click en el waveform en modo edición,
THE SYSTEM SHALL crear un cue point en la posición exacta
  WITH etiqueta editable (default: "Cue 1", "Cue 2", etc.)
  AND color configurable (8 colores pre-definidos)
  AND almacenar en base de datos con posición exacta en segundos.
```

**RF-012.2 - Tipos de Cue Points**
```
THE SYSTEM SHALL soportar los siguientes tipos de cue points:
  - Intro: Inicio de pista útil (después de intro largo)
  - Outro: Punto de salida antes del final
  - Drop: Punto de máxima energía (drop, chorus)
  - Break: Sección de break o transición
  - Custom: Punto personalizado con etiqueta libre.
```

**RF-012.3 - Navegación con Cue Points**
```
WHEN el usuario hace click en un cue point en la lista,
THE SYSTEM SHALL saltar a esa posición en la reproducción
  AND resaltar visualmente el cue point activo
  AND permitir reproducción desde ese punto.
```

**RF-012.4 - Edición de Cue Points**
```
WHEN el usuario selecciona un cue point existente,
THE SYSTEM SHALL permitir:
  - Mover la posición arrastrando el marcador sobre el waveform
  - Cambiar etiqueta con input inline
  - Cambiar color desde selector de colores
  - Eliminar con botón de eliminación
  - Ajustar posición con precisión de milisegundos usando input numérico.
```

**RF-012.5 - Hot Cues**
```
THE SYSTEM SHALL asignar hasta 8 hot cues por pista
  WITH atajos de teclado (1-8)
  FOR acceso rápido durante reproducción
  AND resaltar visualmente los hot cues asignados.
```

### RF-013: Gestión de Loops

**RF-013.1 - Creación de Loops**
```
WHEN el usuario selecciona una región del waveform,
THE SYSTEM SHALL crear un loop con:
  - Punto de inicio (loop_start)
  - Punto de fin (loop_end)
  - Duración calculada automáticamente
  - Etiqueta editable (default: "Loop 1", etc.)
  - Estado activo/inactivo
  AND almacenar en base de datos.
```

**RF-013.2 - Detección Automática de Loops**
```
WHERE una pista tiene beatgrid analizado,
THE SYSTEM SHALL sugerir loops automáticamente
  BASED ON beatgrid (4, 8, 16, 32 beats)
  AND permitir crear loop con 1 click
  AND ajustar automáticamente al beat más cercano.
```

**RF-013.3 - Activación de Loops**
```
WHEN el usuario activa un loop durante reproducción,
THE SYSTEM SHALL:
  - Reproducir la sección en bucle indefinidamente
  - Mostrar indicador visual de loop activo
  - Permitir desactivar loop con 1 click
  - Mantener reproducción continua al desactivar.
```

**RF-013.4 - Edición de Loops**
```
WHEN el usuario selecciona un loop existente,
THE SYSTEM SHALL permitir:
  - Ajustar inicio arrastrando borde izquierdo
  - Ajustar fin arrastrando borde derecho
  - Mover todo el loop manteniendo duración
  - Cambiar etiqueta con input inline
  - Eliminar loop
  - Ajustar con precisión de milisegundos.
```

**RF-013.5 - Snap to Grid**
```
WHERE una pista tiene beatgrid analizado,
THE SYSTEM SHALL ofrecer snap-to-grid para loops
  BY ajustando automáticamente inicio y fin al beat más cercano
  WHEN el usuario arrastra bordes del loop
  AND permitir deshabilitar snap temporalmente con tecla modificadora (Shift).
```

---

## 2. Requisitos No Funcionales

### RNF-006: Performance de Análisis

```
THE SYSTEM SHALL analizar beatgrid de una pista de 5 minutos
  IN LESS THAN 10 segundos
  USING algoritmos optimizados de detección de tempo.
```

```
THE SYSTEM SHALL soportar análisis por lotes de hasta 100 pistas
  WITHOUT bloquear la UI
  BY procesando en background threads
  AND permitir cancelar análisis en cualquier momento.
```

### RNF-007: Precisión de Análisis

```
THE SYSTEM SHALL detectar BPM con precisión de ±1 BPM
  FOR pistas con tempo constante
  AND reportar confidence score (0-100%)
  FOR tempos variables o ambiguos.
```

```
THE SYSTEM SHALL permitir edición de cue points y loops
  WITH precisión de milisegundos
  AND mostrar timestamps en formato MM:SS.mmm.
```

### RNF-008: Usabilidad

```
THE SYSTEM SHALL permitir crear cue points
  WITH 1 click durante reproducción
  AND permitir edición inline sin diálogos modales
  AND ofrecer undo/redo para operaciones de edición.
```

```
THE SYSTEM SHALL mostrar feedback visual inmediato
  WHEN el usuario edita beatgrids, cue points o loops
  WITH actualizaciones en <16ms (60 FPS).
```

---

## 3. Casos de Uso Principales

### CU-011: Análisis Automático de Beatgrid

**Actor:** Usuario  
**Precondiciones:** Pista importada sin beatgrid analizado  
**Flujo Principal:**
1. Usuario selecciona pista en TrackList
2. Usuario hace click en "Analizar Beatgrid" en TrackDetail
3. Sistema ejecuta detección de BPM en background
4. Sistema muestra barra de progreso
5. Sistema actualiza campo BPM en base de datos
6. Sistema genera cuadrícula de beats (beatgrid)
7. Sistema muestra beatgrid sobre waveform
8. Usuario verifica visualmente la precisión
9. Usuario ajusta offset si es necesario

**Flujo Alternativo 1:** BPM ambiguo
- Sistema reporta confidence score bajo (<70%)
- Usuario opta por análisis manual
- Sistema permite tap tempo con clicks

**Flujo Alternativo 2:** Pista con tempo variable
- Sistema detecta cambios de tempo
- Sistema crea múltiples secciones de beatgrid
- Usuario revisa y ajusta secciones individualmente

### CU-012: Creación de Cue Points durante Reproducción

**Actor:** Usuario  
**Precondiciones:** Pista en reproducción  
**Flujo Principal:**
1. Usuario reproduce pista
2. Usuario escucha e identifica punto de interés (drop, break, etc.)
3. Usuario presiona hotkey (Shift+1) o click en "Add Cue"
4. Sistema crea cue point en posición actual de reproducción
5. Sistema asigna etiqueta default "Cue 1"
6. Sistema asigna color default (azul)
7. Sistema muestra marcador visual en waveform
8. Usuario edita etiqueta inline ("Drop")
9. Usuario selecciona color (rojo para drops)
10. Sistema persiste cue point en base de datos

**Flujo Alternativo:** Edición después de crear
- Usuario arrastra marcador para ajustar posición exacta
- Sistema actualiza posición en tiempo real
- Usuario verifica y confirma

### CU-013: Definición de Loop de 8 Beats

**Actor:** Usuario  
**Precondiciones:** Pista con beatgrid analizado  
**Flujo Principal:**
1. Usuario visualiza pista con beatgrid
2. Usuario identifica sección para loop (intro, break)
3. Usuario selecciona región con click y drag sobre waveform
4. Sistema snap inicio y fin al beat más cercano (8 beats)
5. Sistema crea loop con etiqueta "Loop 1"
6. Sistema muestra región coloreada en waveform
7. Usuario activa loop con click
8. Sistema reproduce sección en bucle
9. Usuario desactiva loop para continuar reproducción
10. Sistema persiste loop en base de datos

**Flujo Alternativo:** Ajuste manual de duración
- Usuario arrastra borde derecho del loop
- Sistema snap a beats (4, 8, 16, 32)
- Usuario confirma duración deseada (16 beats)
- Sistema actualiza loop

---

## 4. Edge Cases y Validaciones

### Beatgrids

**Edge Case 1: Pista sin beats detectables**
- Validación: Reportar error "No se detectaron beats"
- Solución: Permitir análisis manual con tap tempo

**Edge Case 2: Tempo extremadamente rápido (>200 BPM)**
- Validación: Confirmar con usuario si BPM es correcto
- Solución: Permitir división por 2 si fue detectado como doble tempo

**Edge Case 3: Tempo extremadamente lento (<60 BPM)**
- Validación: Confirmar con usuario si BPM es correcto
- Solución: Permitir multiplicación por 2 si fue detectado como mitad

**Edge Case 4: Pista con cambios de tempo**
- Validación: Detectar secciones con diferentes tempos
- Solución: Crear beatgrid por secciones o usar tempo promedio

### Cue Points

**Edge Case 5: Máximo de cue points alcanzado**
- Validación: Límite de 64 cue points por pista
- Solución: Mostrar alerta y sugerir eliminar cue points no usados

**Edge Case 6: Cue points superpuestos**
- Validación: Mínimo 100ms de separación
- Solución: Snap al cue point más cercano o alertar al usuario

**Edge Case 7: Cue point fuera de rango**
- Validación: position >= 0 && position <= track.duration
- Solución: Rechazar con error de validación

### Loops

**Edge Case 8: Loop más largo que la pista**
- Validación: loop_end <= track.duration
- Solución: Ajustar automáticamente loop_end al final de la pista

**Edge Case 9: Loop de duración cero**
- Validación: loop_end > loop_start + 0.1 (mínimo 100ms)
- Solución: Rechazar con error de validación

**Edge Case 10: Loops superpuestos**
- Validación: Permitir múltiples loops superpuestos
- Solución: Marcar visualmente loops activos vs inactivos

**Edge Case 11: Activar loop fuera de su rango**
- Validación: Verificar si reproducción está dentro del loop
- Solución: Saltar automáticamente al inicio del loop al activar

---

## 5. Dependencias y Constraints

### Dependencias Técnicas

**Backend (Rust):**
- `aubio` o `librosa-rs` para detección de BPM (alternativa: implementación manual con FFT)
- `dasp` para procesamiento de señales de audio
- Tablas existentes: `beatgrids`, `cue_points`, `loops`
- Queries CRUD completas para las 3 tablas

**Frontend:**
- WaveformViewer existente (extender para marcadores)
- Interacción con Canvas 2D para overlays
- Drag & drop para edición de regiones
- Inputs numéricos con precisión de milisegundos

### Constraints

1. **Performance:**
   - Análisis de beatgrid: máximo 10s por pista de 5 min
   - Renderizado de beatgrid: 60 FPS con 1000+ beats visible
   - Edición de cue points: latencia <16ms

2. **Usabilidad:**
   - Máximo 3 clicks para crear cue point
   - Feedback visual inmediato en todas las operaciones
   - Undo/redo para todas las ediciones

3. **Almacenamiento:**
   - Beatgrid: ~1KB por pista (beats + BPM + offset)
   - Cue points: ~100 bytes por cue point
   - Loops: ~150 bytes por loop

4. **Compatibilidad:**
   - Beatgrid compatible con formato Rekordbox/Serato (opcional)
   - Export/import de cue points y loops en formato estándar

---

## 6. Data Models (Validación de Esquema DB)

### Tabla `beatgrids`
```sql
CREATE TABLE beatgrids (
    id INTEGER PRIMARY KEY,
    track_id INTEGER NOT NULL UNIQUE,
    bpm REAL NOT NULL,                -- BPM detectado (ej: 128.5)
    offset REAL NOT NULL DEFAULT 0,   -- Offset del primer beat en segundos
    confidence REAL,                  -- Confidence score 0-100%
    analyzed_at TEXT NOT NULL,        -- Timestamp de análisis
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
```

**Validaciones:**
- `bpm`: >= 40 AND <= 300 (rango razonable)
- `offset`: >= 0 AND < duración de la pista
- `confidence`: >= 0 AND <= 100

### Tabla `cue_points`
```sql
CREATE TABLE cue_points (
    id INTEGER PRIMARY KEY,
    track_id INTEGER NOT NULL,
    position REAL NOT NULL,           -- Posición en segundos (precisión milisegundos)
    label TEXT NOT NULL,              -- Etiqueta (ej: "Drop", "Intro")
    color TEXT NOT NULL DEFAULT '#3b82f6', -- Color hex
    type TEXT NOT NULL DEFAULT 'custom',   -- Tipo: intro, outro, drop, break, custom
    hotkey INTEGER,                   -- Hot cue number (1-8) o NULL
    created_at TEXT NOT NULL,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
```

**Validaciones:**
- `position`: >= 0 AND <= duración de la pista
- `label`: 1-50 caracteres
- `color`: formato hex válido (#RRGGBB)
- `type`: uno de ['intro', 'outro', 'drop', 'break', 'custom']
- `hotkey`: NULL OR (>= 1 AND <= 8)
- Constraint: máximo 64 cue points por track_id

### Tabla `loops`
```sql
CREATE TABLE loops (
    id INTEGER PRIMARY KEY,
    track_id INTEGER NOT NULL,
    label TEXT NOT NULL,              -- Etiqueta (ej: "Loop 1", "Intro Loop")
    loop_start REAL NOT NULL,         -- Inicio en segundos
    loop_end REAL NOT NULL,           -- Fin en segundos
    is_active INTEGER NOT NULL DEFAULT 0, -- Activo/Inactivo (0/1)
    created_at TEXT NOT NULL,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    CHECK (loop_end > loop_start)
);
```

**Validaciones:**
- `loop_start`: >= 0 AND < duración de la pista
- `loop_end`: > loop_start AND <= duración de la pista
- `loop_end - loop_start`: >= 0.1 (mínimo 100ms)
- `label`: 1-50 caracteres
- `is_active`: 0 o 1

---

## 7. Confidence Score Analysis

### Factores de Confianza

**Alto (85%):**
- ✅ Esquema de base de datos ya existe (beatgrids, cue_points, loops)
- ✅ Componente WaveformViewer ya implementado
- ✅ Sistema de reproducción funcional (AudioPlayer)
- ✅ Patrón de TDD ya establecido (Milestone 1-3)
- ✅ Experiencia con Tauri commands e IPC

**Riesgos Identificados (-15%):**
- ⚠️ Algoritmos de detección de BPM (complejidad alta)
  - Mitigación: Usar librería existente (aubio) o implementación básica con FFT
- ⚠️ Renderizado de beatgrid sobre waveform (performance crítica)
  - Mitigación: Canvas offscreen + requestAnimationFrame
- ⚠️ Drag & drop para edición de loops y cue points (interacción compleja)
  - Mitigación: Reutilizar experiencia de PlaylistDetail con @dnd-kit

### Complexity Score

| Área | Complejidad | Justificación |
|------|-------------|---------------|
| Backend - Beatgrid Detection | **Alta** | Algoritmos DSP, FFT, detección de onset |
| Backend - CRUD (cue/loops) | **Baja** | Similar a playlists (M3) |
| Frontend - Overlay en Canvas | **Media** | Renderizado eficiente, hit detection |
| Frontend - Drag & Drop | **Media** | Edición de regiones, snap to grid |
| Testing | **Media** | Mocks de audio processing, validaciones |

---

## 8. Acceptance Criteria

### Criterio 1: Análisis de Beatgrid
- [ ] Usuario puede analizar beatgrid de una pista
- [ ] BPM detectado con precisión ±2 BPM (test con pistas conocidas)
- [ ] Beatgrid visible sobre waveform con líneas verticales
- [ ] Usuario puede ajustar offset del primer beat
- [ ] Análisis completa en <10s para pista de 5 min

### Criterio 2: Gestión de Cue Points
- [ ] Usuario puede crear cue point con 1 click sobre waveform
- [ ] Usuario puede editar etiqueta y color inline
- [ ] Usuario puede mover cue point con drag & drop
- [ ] Usuario puede asignar hot cues (1-8)
- [ ] Usuario puede navegar a cue point con 1 click
- [ ] Máximo 64 cue points por pista validado

### Criterio 3: Gestión de Loops
- [ ] Usuario puede crear loop seleccionando región
- [ ] Usuario puede activar/desactivar loop durante reproducción
- [ ] Loop reproduce sección en bucle correctamente
- [ ] Usuario puede ajustar inicio/fin con drag
- [ ] Snap to grid funciona cuando hay beatgrid
- [ ] Duración mínima de 100ms validada

### Criterio 4: Testing y Calidad
- [ ] Tests de backend: ≥80% cobertura en módulos de análisis
- [ ] Tests de frontend: ≥80% cobertura en componentes de edición
- [ ] Tests de integración para análisis completo
- [ ] Performance: beatgrid rendering a 60 FPS con 1000+ beats

### Criterio 5: Documentación
- [ ] API.md actualizado con comandos de análisis
- [ ] CHANGELOG.md con entrada de Milestone 4
- [ ] milestone-4-summary.md con detalles técnicos
- [ ] README con ejemplos de uso de análisis

---

## 9. Out of Scope (para Milestone 4)

**NO incluido en este milestone:**
- ❌ Detección automática de key/tonalidad musical
- ❌ Análisis de loudness/LUFS
- ❌ Exportación de beatgrid a formatos Rekordbox/Serato
- ❌ Sincronización de beatgrid entre pistas (beatmatching automático)
- ❌ Cuantización automática de cue points al beatgrid
- ❌ Loops automáticos basados en estructura de la canción
- ❌ AI/ML para sugerencias de cue points
- ❌ Soporte para waveforms de color (solo monocromo)

**Razón:** Estos features serán considerados para Milestones posteriores o mejoras futuras.

---

## 10. Próximos Pasos

1. ✅ **ANALYZE completado** - Requirements documentados
2. ⏳ **DESIGN** - Crear milestone-4-design.md con arquitectura técnica
3. ⏳ **IMPLEMENT Backend** - Beatgrid detection + CRUD queries
4. ⏳ **IMPLEMENT Frontend** - Overlays en WaveformViewer + editores
5. ⏳ **VALIDATE** - Tests y validación de cobertura
6. ⏳ **REFLECT** - Documentación y refactoring
7. ⏳ **HANDOFF** - Commit, tag y release

---

**Fecha de creación:** 13 de diciembre, 2025  
**Autor:** GitHub Copilot - Spec-Driven Workflow Agent  
**Versión:** 1.0
