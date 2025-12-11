---
applyTo: "**/*.md,**/*.ts,**/*.tsx,**/*.rs"
description: "Estándares de documentación en español para Symphony"
---

# Estándares de Documentación

Todo debe estar documentado en **español claro y accesible**.

## Documentación en Código

### JSDoc (TypeScript/JavaScript)
```typescript
/**
 * Importa una biblioteca musical desde la ruta especificada
 * 
 * Escanea recursivamente la carpeta, detecta archivos de audio soportados,
 * extrae metadatos y los sincroniza a la base de datos.
 * 
 * @param libraryPath - Ruta absoluta a la carpeta raíz
 * @param options - Opciones de importación
 * @returns Promesa resuelta con número de pistas importadas
 * @throws {LibraryImportError} Si la carpeta no existe o no hay permisos
 * 
 * @example
 * const result = await importLibrary("/home/user/Música");
 * console.log(`Importadas ${result.count} pistas`);
 */
export async function importLibrary(
  libraryPath: string,
  options?: ImportOptions
): Promise<ImportResult>
```

### Doc Comments (Rust)
```rust
/// Importa una biblioteca musical desde una ruta
/// 
/// Escanea recursivamente la carpeta, detecta archivos de audio soportados,
/// extrae metadatos y los sincroniza a la base de datos.
/// 
/// # Arguments
/// * `path` - Ruta absoluta a la carpeta raíz
/// * `options` - Opciones de importación (opcional)
/// 
/// # Returns
/// Número total de pistas importadas correctamente
/// 
/// # Errors
/// Retorna error si:
/// - La ruta especificada no existe
/// - No hay permisos de lectura en la carpeta
/// - Fallo en la decodificación de archivos de audio
/// 
/// # Examples
/// ```
/// let count = import_library(Path::new("/home/user/Música"), None)?;
/// println!("Importadas {} pistas", count);
/// ```
pub async fn import_library(
    path: &Path,
    options: Option<ImportOptions>,
) -> Result<usize, LibraryError>
```

### Comentarios Inline
- Explica **por qué**, no **qué**
- Evita comentarios obvios
- Cita decisiones arquitectónicas

```typescript
// ✓ Bien: Explica lógica no obvia
const sortedTracks = tracks.sort((a, b) => {
  // Priorizar pistas con beatgrid analizado para optimizar
  // transiciones en DJ mixing
  return (a.hasBeatgrid ? 0 : 1) - (b.hasBeatgrid ? 0 : 1);
});

// ✗ Evita: Obvio
const result = calculateCRC32(data); // Calcula CRC32
```

## Documentación de Proyecto

### README.md
```markdown
# Symphony

Aplicación de escritorio profesional para gestionar y reproducir 
bibliotecas musicales con análisis avanzado de audio.

## Características

- Importación de bibliotecas musicales desde almacenamiento local
- Soporte para múltiples formatos de audio
- Análisis de beatgrids, cue points y loops
- Sincronización automática de metadatos
- Reproducción integrada
- Interfaz oscura optimizada

## Requisitos

- Node.js 18+
- Rust 1.70+
- Tauri 2.0

## Instalación

### Desarrollo
\`\`\`bash
npm install
npm run tauri dev
\`\`\`

### Build
\`\`\`bash
npm run tauri build
\`\`\`

## Testing

\`\`\`bash
# Tests unitarios
npm test
cargo test

# Cobertura
npm run coverage
cargo tarpaulin
\`\`\`

## Documentación

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Arquitectura técnica
- [API.md](./docs/API.md) - API de comandos Tauri
- [CHANGELOG.md](./CHANGELOG.md) - Historial de cambios
```

### ARCHITECTURE.md
Describe la arquitectura general:

```markdown
# Arquitectura de Symphony

## Visión General

Symphony consta de tres capas principales:

### Capa Frontend (React + TypeScript)
- Interfaz de usuario con React 18
- Gestión de estado con Zustand
- Consultas de datos con TanStack Query
- Visualización de waveforms con WaveSurfer.js

### Capa Backend (Tauri + Rust)
- Comandos Tauri para operaciones críticas
- Decodificación de audio con Symphonia
- Reproducción con Rodio
- Persistencia con Rusqlite

### Base de Datos
- SQLite como almacenamiento principal
- Metadatos de pistas y playlists
- Configuración de usuario
- Estado de sincronización

## Flujos Principales

### Importación de Biblioteca
1. Usuario selecciona carpeta
2. Frontend llama comando `import_library` (Tauri)
3. Backend escanea recursivamente
4. Se detectan y validan archivos de audio
5. Se extraen metadatos (ID3, FLAC tags, etc.)
6. Se insertan en base de datos
7. Frontend recibe confirmación y actualiza UI

## Patrones de Comunicación

### Tauri IPC
Frontend → Backend mediante `invoke()`:
\`\`\`typescript
const result = await invoke<ImportResult>("import_library", {
  path: "/home/user/Música"
});
\`\`\`

### Listeners
Backend → Frontend mediante eventos:
\`\`\`typescript
listen<SyncProgress>("library:sync-progress", (event) => {
  updateUI(event.payload);
});
\`\`\`
```

### API.md
Documenta todos los comandos Tauri:

```markdown
# API de Comandos Tauri

## Audio

### play_track
Inicia reproducción de una pista

**Parámetros:**
- `track_id`: string - ID de la pista

**Retorno:**
- `success`: boolean - Éxito de la operación

### pause
Pausa la reproducción actual

**Parámetros:** Ninguno

**Retorno:**
- `position`: number - Posición en segundos

### get_waveform
Obtiene datos de waveform de una pista (cacheado)

**Parámetros:**
- `track_id`: string - ID de la pista

**Retorno:**
```
{
  "samples": number[],
  "duration": number,
  "sampleRate": number
}
```

## Library

### import_library
Importa biblioteca desde ruta local

**Parámetros:**
- `path`: string - Ruta a carpeta

**Retorno:**
```
{
  "imported": number,
  "failed": number,
  "duration": number
}
```

[... más comandos ...]
```

### CHANGELOG.md
Registra cambios siguiendo versionado semántico:

```markdown
# Changelog

Todos los cambios notables de Symphony se documentan aquí.

## [1.2.0] - 2024-01-15

### Agregado
- Soporte para loops personalizados
- Análisis automático de beatgrids
- Exportación de playlists a JSON

### Corregido
- [#123] Error al sincronizar metadatos FLAC
- [#125] Crash al reproducir archivos muy largos
- [#128] Performance al cargar bibliotecas > 10000 pistas

### Cambiado
- Interfaz de importación rediseñada
- Algoritmo de análisis de waveform optimizado

## [1.1.0] - 2023-12-01

### Agregado
- Soporte para formato OGG Vorbis
- Configuración de preferencias de usuario

[... versiones anteriores ...]
```

## Documentación Técnica

### Design Documents
Para decisiones arquitectónicas importantes:

```markdown
# Design Document: Análisis de Beatgrid en Tiempo Real

## Problema
Analizar beatgrids de pistas largas (> 30 min) sin bloquear UI

## Opciones Evaluadas
1. **Análisis en thread separado** - Costo de sincronización
2. **Análisis progresivo** - Complejidad, interrupciones
3. **Análisis en backend Rust** - Aislamiento completo ✓

## Solución Elegida
Implementar análisis en Tauri backend como comando largo:
- No bloquea UI frontend
- Progreso reportado vía eventos
- Cacheo de resultados

## Implementación
[detalles técnicos]

## Trade-offs
- Mayor latencia inicial vs. mejor responsiveness
```

## Comentarios en Código

### Contexto de Decisiones
Cuando algo no es obvio, explica la decisión:

```typescript
// Usamos AbortController en lugar de simple flag porque
// cancellations en workers Rust requieren cleanup de recursos
const abortController = new AbortController();
```

```rust
// Se ordena por (hasBeatgrid, duration) para optimizar
// transiciones en DJ mixing: pistas analizadas primero,
// luego ordenadas por duración para mezclas consistentes
let sorted: Vec<_> = tracks
    .iter()
    .sort_by(|a, b| {
        (a.has_beatgrid, a.duration)
            .cmp(&(b.has_beatgrid, b.duration))
    })
    .collect();
```

## Documentación de Errores

Cuando defines errores, documenta casos de uso:

```typescript
/**
 * Error cuando falla la importación de biblioteca
 * 
 * Casos comunes:
 * - PERMISSION_DENIED: No hay acceso a la carpeta
 * - INVALID_FORMAT: Archivos corruptos o no soportados
 * - DISK_SPACE: Espacio insuficiente para metadatos
 */
export class LibraryImportError extends Error {
  constructor(
    code: ErrorCode,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
```

## Convenciones de Lenguaje

### Terminología Consistente
- **Pista** (track)
- **Beatgrid** (no "beat grid")
- **Cue point** (punto de referencia)
- **Loop** (bucle de reproducción)
- **Waveform** (forma de onda)
- **Metadatos** (información de pista)
- **Biblioteca** (colección de música)
- **Playlist** (lista de reproducción)

### Verbos
- Usa infinitivo para documentación
- Usa imperativo para instrucciones

```markdown
# Importar Biblioteca ✓
Para importar tu música...

# Cómo importar ✓
1. Haz click en Importar
2. Selecciona la carpeta
3. Espera a completarse
```

## Checklist Documentación

Antes de PR, verifica:
- [ ] Funciones/métodos públicos tienen JSDoc/Doc comments
- [ ] Comportamientos complejos explicados en comentarios
- [ ] README actualizado si hay cambios de UX
- [ ] API.md actualizado si hay nuevos comandos
- [ ] CHANGELOG.md con entrada
- [ ] Términos consistentes con glosario del proyecto
- [ ] Ejemplos funcionales cuando sea aplicable
- [ ] Sin typos en documentación

---

*Referencia: Documentación en español para Symphony*
