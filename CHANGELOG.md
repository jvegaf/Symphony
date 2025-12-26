# Changelog

Todos los cambios notables de Symphony se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

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
