# Changelog

Todos los cambios notables de Symphony se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [0.20.0] - 2026-01-06

### Agregado
- **Opción "Eliminar del playlist" en menú contextual:**
  - Nueva opción visible solo cuando se está en vista de playlist
  - Permite eliminar pistas de la playlist sin borrar el archivo
  - Integración con hook `useRemoveTrackFromPlaylist`

### Mejorado
- **Optimización del ancho de tabla TrackTable:**
  - Cambio a layout `table-fixed` para anchos predecibles
  - Anchos fijos por columna para evitar scroll horizontal
  - Clase `truncate` en textos largos con tooltips para ver contenido completo
  - Nombres de columnas abreviados (#, Título, Artista, Álbum, etc.)
  - Padding reducido para mejor aprovechamiento del espacio

- **Alineación de tabla en vista de playlist:**
  - Agregado prop `reorderMode` a TableHeader
  - Columna vacía para el handle de arrastre cuando está en modo reordenar
  - Columnas perfectamente alineadas entre header y filas

- **Altura de filas optimizada:**
  - Clase `whitespace-nowrap` en columna Key para evitar saltos de línea
  - Ancho de columna Key aumentado de `w-14` a `w-20`
  - Filas más compactas y consistentes

- **Actualización de TrackDetail después de Fix Tags:**
  - Invalidación de queries individuales por track en `useApplySelectedTags`
  - El modal TrackDetail se actualiza inmediatamente después de aplicar tags de Beatport
  - Invalidación de artwork también incluida

- **Modal TrackDetail cierra al hacer click fuera:**
  - Agregados onClick handlers en overlay del modal
  - Comportamiento consistente con otros modales de la aplicación

- **Botones de búsqueda en TrackDetail funcionando:**
  - Migración de `window.open` a `openUrl` de `@tauri-apps/plugin-opener`
  - Botones "Buscar en Google" y "Buscar en Beatport" ahora abren el navegador correctamente

- **Menú contextual nativo de Tauri simplificado:**
  - Confirmado uso de API nativa (`Menu`, `MenuItem` de `@tauri-apps/api/menu`)
  - Simplificado `popup()` sin necesidad de `LogicalPosition`
  - Menú aparece automáticamente en posición del cursor

### Cambiado
- **Texto de opción de eliminación en menú contextual:**
  - "Eliminar" → "🗑️ Eliminar y borrar archivo" para mayor claridad
  - Distingue claramente entre eliminar de playlist vs eliminar archivo

### Corregido
- **Columna "fixed" aparecía en vista de playlist:**
  - Agregado prop `selectedPlaylistId` a TrackTable en App.tsx
  - Columna de posición (#) ahora se muestra correctamente en playlists

- **Rating no se actualizaba en vista de playlist:**
  - Agregada invalidación con predicado en `useUpdateTrackRating`
  - Invalida queries de tracks de playlist además de la biblioteca

### Técnico
- Archivos modificados:
  - `src/App.tsx` - Props de playlist y handlers de cierre de modal
  - `src/hooks/library/useLibraryMutations.ts` - Invalidación de playlist tracks
  - `src/hooks/useBeatport.ts` - Invalidación individual de tracks
  - `src/components/layout/TrackTable/index.tsx` - Layout table-fixed, props de contexto
  - `src/components/layout/TrackTable/components/TableHeader.tsx` - reorderMode, anchos fijos
  - `src/components/layout/TrackTable/components/TrackRow.tsx` - truncate, whitespace-nowrap
  - `src/components/TrackDetail.tsx` - openUrl de Tauri
  - `src/components/layout/TrackTable/hooks/useContextMenu.ts` - Menú nativo simplificado

## [0.19.0] - 2026-01-03

### Agregado
- **Sistema de Configuración Persistente para Library Paths:**
  - Nuevo módulo `config.rs` para gestión de configuración de la aplicación
  - Los paths de biblioteca se guardan en `~/.config/symphony/settings.json`
  - Al importar una biblioteca, el path se guarda automáticamente
  - Nuevo comando `get_library_paths` para recuperar paths guardados

### Mejorado
- **Consolidación de Biblioteca Mejorada:**
  - La función "Consolidate Library" en Settings ahora utiliza los paths guardados
  - Detección automática de fecha `date_added` desde carpetas con formato YYMM
  - Ejemplo: archivos en `/Music/BOX/2402/` obtienen `date_added = "2024-02"`
  - Fallback a fecha actual si no se detecta patrón YYMM válido

### Corregido
- **Bug crítico en consolidación de archivos con metadata corrupta:**
  - Archivos con metadata UTF-16 BOM corrupta (común en Beatport) fallaban silenciosamente
  - El campo `artist` es NOT NULL en la base de datos, causando constraint violation
  - Solución: fallback a `artist = "Unknown"` y `title = filename` para archivos con metadata corrupta
  - Los archivos ahora se importan correctamente con metadata básica

### Técnico
- Archivos nuevos:
  - `src-tauri/src/config.rs` - Módulo de configuración persistente
- Archivos modificados:
  - `src-tauri/src/lib.rs` - Exportación del módulo config
  - `src-tauri/src/commands/library.rs` - Integración con config para guardar/leer paths
  - `src-tauri/src/db/queries/tracks/consolidate.rs` - Extracción de fecha del path, fallbacks para metadata
  - `src-tauri/src/utils/mod.rs` - Re-exportación de `extract_date_from_path`
  - `src/pages/Settings/components/MaintenanceActions.tsx` - Uso de `get_library_paths`

## [0.18.1] - 2026-01-03

### Corregido
- **Iconos no se mostraban en AppImage:**
  - Problema: Material Icons se cargaban desde Google Fonts CDN, bloqueado por CSP/red en AppImage
  - Los iconos aparecían como texto: `play_arrow`, `equalizer`, etc.
  - Solución: Bundlear Material Icons localmente usando paquete npm `material-icons`
  - Solución: Bundlear Spline Sans localmente usando `@fontsource/spline-sans`
  - Removidos links externos de `index.html`
  - Agregados imports en `src/styles/globals.css`

### Técnico
- Paquetes agregados:
  - `material-icons@1.13.12` - Fuente de iconos Material Design
  - `@fontsource/spline-sans@5.1.0` - Tipografía principal (pesos 400, 500, 700)
- Archivos modificados:
  - `index.html`: Eliminados `<link>` de Google Fonts
  - `src/styles/globals.css`: Agregados `@import` para fuentes locales
- Todas las fuentes ahora se incluyen en el bundle de la aplicación
- No requiere conexión externa para cargar UI correctamente

## [0.18.0] - 2026-01-03

### Agregado
- **Sistema de Onboarding para Primer Arranque:**
  - Modal de bienvenida que se muestra en el primer arranque de la aplicación
  - Paso 1: Pantalla de bienvenida con 3 tarjetas de características destacadas
  - Paso 2: Progreso de importación en tiempo real con barra animada
  - Paso 3: Pantalla de éxito con contador de pistas importadas
  - Diseño moderno con gradientes (purple → pink → orange)
  - No se puede cerrar hasta completar el proceso (UX intencional)
  - Integración completa con el selector de carpeta y sistema de importación
  - Setting `app.first_run_completed` en base de datos para controlar visibilidad

- **Detección Automática de Fechas desde Rutas:**
  - Symphony detecta automáticamente fechas en nombres de carpetas
  - Formato YYMM: `2401` → Enero 2024
  - Formato YYMMDD: `240125` → 25 Enero 2024
  - Usa la fecha detectada como `date_added` en lugar del timestamp actual
  - Mejora el ordenamiento cronológico de la biblioteca
  - 24 tests cubriendo casos edge (años bisiestos, meses inválidos, etc.)
  - Implementado en `src-tauri/src/utils/path_utils.rs`

- **Nuevo Hook `useFirstRun`:**
  - `isFirstRun` - Detecta si es el primer arranque
  - `completeFirstRun()` - Marca el onboarding como completado
  - `isLoading` / `isUpdating` - Estados de carga
  - 7 tests con 100% de cobertura

- **Nuevo Tipo `AppGeneralSettings`:**
  - Categoría `app` en settings para configuraciones globales de la aplicación
  - Campo `firstRunCompleted: boolean` para controlar el onboarding
  - Integrado en `AppSettings` junto a `ui`, `audio`, `library`, `conversion`

### Cambiado
- **UI de Configuración de Biblioteca Mejorada:**
  - "Carpeta de Importación" → "Carpeta de Música"
  - Input de solo lectura en lugar de editable
  - Botón "Elegir" con diseño degradado para seleccionar carpeta
  - Explicación visual del sistema de detección de fechas YYMM
  - Placeholder actualizado: "Ninguna carpeta seleccionada"

- **API de `useSettingsForm` Refactorizada:**
  - Cambio de 2 funciones callback separadas → objeto de callbacks único
  - `onSaveSuccess`, `onSaveError`, `onResetSuccess`, `onResetError`
  - Mejor tipado y más consistente con convenciones modernas

### Corregido
- TypeScript: Firma incorrecta de `useSettingsForm` en SettingsModal y Settings/index.tsx
- Tests: Labels desactualizados ("Ruta predeterminada" → "Ubicación de tu biblioteca")
- Tests: Selector ambiguo de "Mantenimiento" usando `getByRole('heading')`
- Tests: Count de settings actualizado (14 → 15)
- Tests: Timeout en test de limpieza de caché (agregado `waitFor`)

### Técnico
- **Archivos Creados:**
  - `src/hooks/app/useFirstRun.ts` (59 líneas)
  - `src/hooks/app/useFirstRun.test.tsx` (207 líneas, 7 tests)
  - `src/components/OnboardingModal.tsx` (320 líneas)
  - `src/components/OnboardingModal.test.tsx` (306 líneas, 13 tests)
  - `src-tauri/src/utils/path_utils.rs` (con tests integrados)

- **Tests:**
  - Frontend: 677 tests pasando (✅ 100%)
  - Backend: 191 tests pasando (✅ 100%)
  - Total: 868 tests pasando
  - Cobertura: >80% (cumple requisitos TDD)

- **Base de Datos:**
  - Nueva key en tabla `settings`: `app.first_run_completed`
  - Mapeo: `app.first_run_completed` ↔ `AppSettings.app.firstRunCompleted`

## [0.16.0] - 2025-01-30

### Corregido
- **BPM Fix Tags FUNCIONA:** Corregido bug crítico donde lofty escribía BPM pero no podía leerlo
  - Fix Tags ahora usa `id3` crate para escribir TBPM en archivos MP3
  - MetadataExtractor con fallback dual: lofty → id3 para máxima compatibilidad
  - BPM se escribe correctamente en archivos físicos MP3 después de Beatport Fix Tags
  - BPM se actualiza en base de datos después de Fix Tags
  - ✅ Verificado con tests: escritura con id3, lectura con ambas librerías
  - ✅ 166 tests backend pasando, 618 tests frontend pasando
  - Tipo BPM: `Option<f64>` para soportar decimales (128.5, 174.23)

### Técnico
- Modificado `src-tauri/src/library/beatport/tagger/writer.rs`:
  - Nueva función `write_bpm_mp3()` usa id3 crate para escribir frame TBPM
  - `write_tags()` detecta MP3 y usa `write_bpm_mp3()` en lugar de lofty
  - Otros formatos siguen usando lofty para BPM
- Binario de test `test_write_bpm.rs` actualizado para usar id3
- Documentación actualizada explicando por qué se usa id3 para BPM en MP3

## [0.15.0] - 2025-12-30

### Agregado
- **Logger con Dependency Inversion Principle:**
  - Abstracción Logger con 4 niveles (DEBUG, INFO, WARN, ERROR)
  - Factories: createConsoleLogger, createNullLogger, createLogger
  - Gestión global de logger: setGlobalLogger, getGlobalLogger, resetGlobalLogger
  - 19 tests de cobertura para interfaces y factories
  - Documentación completa con JSDoc en español

- **Documentación viva de convenciones de naming:**
  - Suite de tests conventions.test.ts con 10 tests documentando reglas
  - Valida convenciones: camelCase, snake_case, useXxx, createXxx, isXxx
  - Documenta constantes (UPPER_SNAKE_CASE), tipos (PascalCase), tests (.test.ts(x))
  - Excepciones documentadas: date_created, date_modified (legacy DB)

### Cambiado
- **Consolidación de tipos TypeScript:**
  - Eliminados 5 tipos duplicados de hooks/playlists/usePlaylistMutations.ts
  - Tipos Request (Create/Update/AddTrack/RemoveTrack/Reorder) centralizados en types/playlist.ts
  - Campo description estandarizado a opcional `string | null | undefined`
  - Hooks re-exportan tipos de types/ para backward compatibility

- **Migración de IDs de Playlist:**
  - Todos los IDs migrados de number a string (UUID v4)
  - Actualizado modelo Track para usar string IDs en playlist_tracks
  - Consistencia completa con backend Rust (usa UUID v4)

### Técnico
- **Refactorización de código Rust:**
  - Eliminados 11 warnings de compilación en 9 archivos
  - Imports no usados removidos con atributos `#[cfg(test)]` apropiados
  - Variables no usadas eliminadas o renombradas con prefijo `_`
  - Mutabilidad innecesaria corregida
  - Constantes de test marcadas con `#[allow(dead_code)]`
  - Compilación limpia sin warnings: 0 warnings
- **162 nuevos tests agregados** (total: 618/618 passing)
- **0 errores de TypeScript** después de refactor completo
- Todas las interfaces Request actualizadas con string IDs
- Cobertura de tests documentando patrones arquitectónicos

### Corregido
- **17 errores de tipos TypeScript pre-existentes:**
  - Inconsistencias number vs string en playlist IDs
  - Tipos en logger.test.ts, track.ts, track.test.ts, errorHandling.test.ts
  - Mocks actualizados en PlaylistCard, PlaylistManager
  - Queries y mutations de TanStack Query con tipos correctos

### Técnico
- **162 nuevos tests agregados** (total: 618/618 passing)
- **0 errores de TypeScript** después de refactor completo
- Todas las interfaces Request actualizadas con string IDs
- Cobertura de tests documentando patrones arquitectónicos

## [0.14.0] - 2025-12-29

### Agregado
- **Rediseño visual de Settings:**
  - UI moderna con gradientes, glassmorphism y tarjetas con sombras
  - Header con icono y título estilizados
  - Tabs con indicador animado de selección
  - Cards con hover effects y transiciones suaves
  - Toggle switches modernos para opciones booleanas
  - Inputs y selects con estilos consistentes

### Corregido
- **Layout de Settings:** El contenedor ahora usa `h-full` en lugar de `h-screen`, respetando el contenedor padre flex y ocupando el ancho completo
- **Memory corruption en consolidate_library:** Refactorizado para crear una nueva instancia de `MetadataExtractor` por cada archivo, evitando el error `free(): corrupted unsorted chunks` que ocurría al procesar muchos archivos

### Técnico
- Optimización del procesamiento de archivos en consolidate_library: recolecta primero todos los archivos nuevos y luego procesa cada uno con scope aislado

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
