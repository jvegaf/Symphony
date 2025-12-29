# Changelog

Todos los cambios notables de Symphony se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [0.13.0] - 2025-01-28

### Agregado
- **Sistema de tracking de pistas fixeadas con Beatport:**
  - Nueva columna `beatport_id` en la base de datos (migración v5)
  - Indicador visual preciso en TrackTable (verde solo para pistas procesadas con Beatport)
  - Índice de base de datos para optimizar consultas por beatport_id
- **Indicador de duración coincidente en BeatportSelectionModal:**
  - Resalta visualmente candidatos con duración similar (±5s tolerancia)
  - Texto verde + icono de check cuando la duración coincide
  - Ayuda a identificar el match correcto más rápidamente
- **Consolidación de biblioteca mejorada:**
  - Nuevo comando `consolidate_library` para mantenimiento integral
  - Verifica que todos los archivos existan en disco
  - Elimina entradas huérfanas (sin archivo correspondiente)
  - Detecta y elimina tracks duplicados (mismo path)
  - **Detecta y agrega automáticamente archivos nuevos** en carpetas de biblioteca
  - Optimiza la base de datos (VACUUM + ANALYZE)
  - Opción en Settings > Library > Maintenance
- **Búsqueda en menú contextual:**
  - Submenu "Buscar en..." en el menú contextual de tracks
  - Búsqueda rápida en Google y Beatport
  - Abre resultados en el navegador del sistema

### Cambiado
- El indicador de "fixeado" en TrackTable ahora usa `beatportId` en lugar de `label || isrc`
- El comando `apply_selected_tags` ahora guarda el beatport_id al aplicar tags
- Todos los tipos TypeScript y Rust actualizados con el nuevo campo `beatport_id`

### Corregido
- **Falsos positivos en indicador de fixeado:** El indicador ahora solo muestra verde para tracks que realmente fueron procesados con Beatport, no para tracks que tenían label/isrc de otras fuentes

### Técnico
- Migración de base de datos de v4 a v5
- Actualizado modelo Track con campo `beatport_id: Option<i64>` (Rust) y `beatportId?: number` (TypeScript)
- Todas las queries SQL actualizadas para incluir beatport_id
- Todos los tests actualizados con el nuevo campo
- Nuevo tipo `ConsolidateLibraryResult` en Rust y TypeScript

## [0.13.0] - 2025-01-27

### Agregado
- **Selección Manual de Matches de Beatport:** Nueva UI para evitar falsos positivos
  - Modal de selección con hasta 4 candidatos por track
  - Badges de similitud con colores (verde >80%, amarillo 50-80%, rojo <50%)
  - Artwork preview de cada candidato
  - Opción "No está en Beatport" para tracks sin match
  - Auto-selección inteligente para matches con >85% similitud
- Nuevos comandos Tauri: `search_beatport_candidates` y `apply_selected_tags`
- Hook `useSearchCandidates` y `useApplySelectedTags` para el nuevo flujo
- Componente `BeatportSelectionModal` para la interfaz de selección
- Nuevos tipos TypeScript: `BeatportCandidate`, `TrackCandidates`, `TrackSelection`, `SearchCandidatesResult`

### Cambiado
- Flujo de "Fix Tags" ahora usa selección manual en lugar de matching automático
- El comando `fix_tags` original se mantiene pero se marca como deprecado
- Documentación actualizada con el nuevo flujo recomendado

### Corregido
- **Falsos positivos eliminados:** Ya no se aplican tags a tracks que no están en Beatport
- El algoritmo de matching ahora incluye un score mínimo de 0.25 (25%)

## [0.12.0] - 2025-01-26

### Agregado
- **Ordenamiento por Genre y Key:** Ahora las columnas Genre y Key en la tabla de tracks son ordenables
  - Click en header de columna para ordenar
  - Indicador visual de dirección (↑/↓)
  - Tipo `SortColumn` actualizado para incluir 'genre' | 'key'

## [0.11.0] - 2025-01-20

### Agregado
- **Integración con Beatport (Fix Tags):** Nueva funcionalidad para auto-completar metadatos faltantes
  - Click derecho en tracks → "Fix Tags" para buscar en Beatport
  - Completa automáticamente: BPM, Key, Genre, Label, ISRC, Artwork
  - Algoritmo de matching inteligente con ponderación (título 50%, artista 30%, duración 20%)
  - Barra de progreso visual durante el proceso
  - Modal de resultados mostrando canciones encontradas y no encontradas
- Nuevos campos en modelo `Track`: `label` (sello discográfico) e `isrc` (código internacional)
- Hook `useBeatport` para integración frontend con eventos de progreso
- Componente `BeatportResultsModal` para visualizar resultados del proceso
- Migración de base de datos (v4) para añadir columnas `label` e `isrc`

### Cambiado
- Actualizada estructura de base de datos a versión 4
- Queries de tracks actualizados para incluir nuevos campos

### Técnico
- Cliente HTTP para Beatport con extracción de token anónimo desde `__NEXT_DATA__`
- Tagger que aplica lógica de merge de tags (preserva BPM local si existe, key siempre se actualiza)
- Descarga de artwork integrada con detección de MIME type

## [0.10.0] - 2025-01-15

### Agregado
- Sistema de conversión de audio a MP3
- Verificación de FFmpeg instalado
- Batch conversion con eventos de progreso

### Técnico
- Comando `convert_track_to_mp3` y `batch_convert_to_mp3`
- Hook `useConversion` para frontend

## [0.9.0] - 2025-01-10

### Agregado
- Mejoras significativas en waveform:
  - Streaming progresivo con actualización visual
  - Seek visual instantáneo
  - Optimización de rendimiento con throttling

### Corregido
- Performance issues con bibliotecas grandes

## [0.8.0] - 2025-01-05

### Agregado
- Cola de reproducción inteligente
- Atajos de teclado para navegación (A/D/W/S/Espacio)
- Navegación secuencial que respeta orden visual de tabla

### Cambiado
- Doble click genera cola desde posición actual hasta final de lista

## [0.7.0] - 2024-12-28

### Agregado
- Sistema de playlists completo
- Drag & drop para reordenar tracks
- Gestión de playlist tracks en context menu

## [0.6.0] - 2024-12-20

### Agregado
- Análisis de beatgrids automático
- Cue points personalizables
- Loops con posición start/end

## [0.5.0] - 2024-12-15

### Agregado
- Editor de metadatos inline
- Sistema de rating con estrellas
- Lectura de rating POPM desde ID3v2

## [0.4.0] - 2024-12-10

### Agregado
- Filename to tags (extraer metadatos desde nombre de archivo)
- Batch operations para múltiples tracks
- Mejoras UX en editor de rating

## [0.3.0] - 2024-12-05

### Agregado
- Importación de bibliotecas con eventos de progreso
- Escaneo recursivo de carpetas
- Extracción de metadatos con lofty

## [0.2.0] - 2024-11-28

### Agregado
- Reproducción de audio con arquitectura streaming
- Waveform visualization con canvas
- Controles de playback (play/pause/seek)

## [0.1.0] - 2024-11-20

### Agregado
- Estructura inicial del proyecto
- Setup de Tauri 2.0 + React 18 + TypeScript
- Base de datos SQLite con migraciones
- UI base con Tailwind CSS y modo oscuro

---

*Última actualización: Enero 2025*
