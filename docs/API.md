# API de Comandos Tauri - Symphony

Esta documentación describe todos los comandos Tauri disponibles para interactuar con el backend de Symphony desde el frontend React.

## Audio

### Especificación de Eventos Tauri (Audio)

Todos los eventos emitidos por el backend de audio:

- `audio:timestamp` → `{ position: number, duration: number }`
- `audio:state` → `{ is_playing: boolean }`
- `audio:end_of_track` → `{}`
- `audio:error` → `{ message: string, is_critical: boolean }`
- `audio:device_changed` → `{ device_name: string }`

Ejemplo de suscripción en React:
```typescript
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  const unlisten = await listen<{ position: number, duration: number }>('audio:timestamp', (event) => {
    setPosition(event.payload.position);
  });
  return () => { unlisten(); };
}, []);
```

---

### Nuevo uso recomendado: useAudioPlayer

Todos los componentes deben usar el hook `useAudioPlayer` para controlar la reproducción y escuchar eventos:

```typescript
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

const player = useAudioPlayer();

// player.play(path), player.pause(), player.seek(time), etc.
```

---

### play_track

Inicia la reproducción de una pista de audio.

**Parámetros:**
- `path`: `string` - Ruta absoluta al archivo de audio

**Retorno:**
- `Promise<void>` - Promesa que se resuelve cuando la reproducción comienza

**Ejemplo:**
```typescript
import { invoke } from "@tauri-apps/api/core";

await invoke("play_track", { path: "/home/user/music/song.mp3" });
```

**Errores:**
- `"Archivo no encontrado"` - El archivo no existe
- `"Error al decodificar"` - El formato no es soportado o el archivo está corrupto
- `"No se pudo inicializar dispositivo de audio"` - No hay dispositivo de audio disponible

---

### pause_playback

Pausa la reproducción actual.

**Parámetros:** Ninguno

**Retorno:**
- `Promise<void>` - Promesa que se resuelve cuando se pausa

**Ejemplo:**
```typescript
await invoke("pause_playback");
```

**Errores:**
- `"No hay reproductor activo"` - No hay ninguna pista en reproducción

---

### resume_playback

Reanuda la reproducción pausada.

**Parámetros:** Ninguno

**Retorno:**
- `Promise<void>` - Promesa que se resuelve cuando se reanuda

**Ejemplo:**
```typescript
await invoke("resume_playback");
```

**Errores:**
- `"No hay reproductor activo"` - No hay ninguna pista pausada

---

### stop_playback

Detiene completamente la reproducción.

**Parámetros:** Ninguno

**Retorno:**
- `Promise<void>` - Promesa que se resuelve cuando se detiene

**Ejemplo:**
```typescript
await invoke("stop_playback");
```

**Errores:**
- `"No hay reproductor activo"` - No hay ninguna pista en reproducción

---

### get_playback_state

Obtiene el estado actual del reproductor.

**Parámetros:** Ninguno

**Retorno:**
```typescript
interface PlaybackStateResponse {
  state: "playing" | "paused" | "stopped";
  is_playing: boolean;
}
```

**Ejemplo:**
```typescript
const state = await invoke<PlaybackStateResponse>("get_playback_state");
console.log(state.state); // "playing" | "paused" | "stopped"
console.log(state.is_playing); // true | false
```

**Errores:** No genera errores

---

### decode_audio_metadata

Decodifica metadatos de un archivo de audio sin reproducirlo.

**Parámetros:**
- `path`: `string` - Ruta absoluta al archivo de audio

**Retorno:**
```typescript
interface AudioMetadata {
  duration: number;
  sample_rate: number;
  channels: number;
  bitrate: number | null;
  codec: string;
}
```

**Ejemplo:**
```typescript
const metadata = await invoke<AudioMetadata>("decode_audio_metadata", {
  path: "/home/user/music/song.mp3"
});

console.log(`Duración: ${metadata.duration}s`);
console.log(`Sample Rate: ${metadata.sample_rate}Hz`);
console.log(`Canales: ${metadata.channels}`);
console.log(`Codec: ${metadata.codec}`);
```

**Errores:**
- `"Archivo no encontrado"` - El archivo no existe
- `"Formato no soportado"` - El formato no es MP3, FLAC, WAV, OGG o AAC
- `"Error de decodificación"` - El archivo está corrupto

---

## Uso con TanStack Query (Recomendado)

Para mejor manejo de estado y cache, se recomienda usar TanStack Query:

```typescript
import { useMutation, useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

// Query para obtener metadatos
export const useAudioMetadata = (path: string) => {
  return useQuery({
    queryKey: ["audio-metadata", path],
    queryFn: () => invoke<AudioMetadata>("decode_audio_metadata", { path }),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
};

// Mutation para reproducir
export const usePlayTrack = () => {
  return useMutation({
    mutationFn: (path: string) => invoke("play_track", { path }),
    onSuccess: () => {
      console.log("Pista reproduciendo");
    },
    onError: (error) => {
      console.error("Error al reproducir:", error);
    },
  });
};

// Query para estado del reproductor
export const usePlaybackState = () => {
  return useQuery({
    queryKey: ["playback-state"],
    queryFn: () => invoke<PlaybackStateResponse>("get_playback_state"),
    refetchInterval: 1000, // Actualizar cada segundo
  });
};
```

---

## Formatos de Audio Soportados

- **MP3** - MPEG Audio Layer 3
- **FLAC** - Free Lossless Audio Codec
- **WAV** - Waveform Audio File Format
- **OGG** - Ogg Vorbis
- **AAC** - Advanced Audio Coding (M4A)

---

## Notas de Implementación

1. **Thread Safety**: El estado del reproductor se gestiona con `Arc<Mutex<>>` para garantizar acceso thread-safe.

2. **Estado Global**: Hay un único reproductor activo por aplicación. Reproducir una nueva pista detiene la anterior.

3. **Gestión de Recursos**: El reproductor mantiene el dispositivo de audio abierto mientras hay una pista activa. Al detener, se liberan los recursos.

4. **Bitrate**: El campo `bitrate` en metadatos puede ser `null` si no está disponible en el archivo.

---

## Library (Milestone 2)

### import_library

Importa una biblioteca musical desde una carpeta especificada. Escanea recursivamente, extrae metadatos y los almacena en la base de datos. Emite eventos de progreso durante el proceso.

**Parámetros:**
- `path`: `string` - Ruta absoluta a la carpeta raíz de la biblioteca

**Retorno:**
```typescript
interface ImportResult {
  imported: number;
  failed: number;
  totalFiles: number;
}
```

**Eventos emitidos:**
```typescript
// Emitido cada 100 pistas o cada segundo
interface ImportProgress {
  current: number;
  total: number;
  phase: "scanning" | "importing" | "complete";
}
listen<ImportProgress>("library:import-progress", (event) => {
  console.log(`${event.payload.current}/${event.payload.total}`);
});

// Emitido al completar
listen<ImportResult>("library:import-complete", (event) => {
  console.log(`Importadas: ${event.payload.imported}`);
});
```

**Ejemplo:**
```typescript
import { invoke, listen } from "@tauri-apps/api/core";

// Escuchar eventos de progreso
const unlisten = await listen<ImportProgress>("library:import-progress", (event) => {
  const { current, total, phase } = event.payload;
  console.log(`Fase: ${phase}, Progreso: ${current}/${total}`);
});

// Iniciar importación
const result = await invoke<ImportResult>("import_library", {
  path: "/home/user/Music"
});

console.log(`Importadas ${result.imported} pistas`);
console.log(`Fallidas: ${result.failed}`);

// Limpiar listener
unlisten();
```

**Errores:**
- `"PathNotFound"` - La ruta especificada no existe
- `"PermissionDenied"` - Sin permisos de lectura en la carpeta
- `"IoError"` - Error de sistema de archivos
- `"DatabaseError"` - Error al guardar en base de datos

---

### get_all_tracks

Obtiene todas las pistas de la biblioteca.

**Parámetros:** Ninguno

**Retorno:**
```typescript
interface Track {
  id: string;
  path: string;
  title: string;
  artist: string | null;
  album: string | null;
  duration: number;
  bpm: number | null;
  fileSize: number;
  format: string;
  sampleRate: number;
  bitrate: number;
  channels: number;
}

// Retorna array de pistas
Track[]
```

**Ejemplo:**
```typescript
const tracks = await invoke<Track[]>("get_all_tracks");
console.log(`Total de pistas: ${tracks.length}`);
```

**Errores:**
- `"DatabaseError"` - Error al consultar base de datos

---

### search_tracks

Busca pistas por título, artista o álbum.

**Parámetros:**
- `query`: `string` - Término de búsqueda (mínimo 2 caracteres recomendado)

**Retorno:**
```typescript
Track[] // Array de pistas que coinciden
```

**Ejemplo:**
```typescript
const results = await invoke<Track[]>("search_tracks", {
  query: "beatles"
});

results.forEach(track => {
  console.log(`${track.title} - ${track.artist}`);
});
```

**Errores:**
- `"DatabaseError"` - Error al consultar base de datos

---

### get_track_by_id

Obtiene una pista específica por su ID.

**Parámetros:**
- `id`: `string` - ID de la pista

**Retorno:**
```typescript
Track // Pista encontrada
```

**Ejemplo:**
```typescript
const track = await invoke<Track>("get_track_by_id", {
  id: "track-uuid-123"
});

console.log(`Título: ${track.title}`);
console.log(`Duración: ${track.duration}s`);
```

**Errores:**
- `"TrackNotFound"` - No se encontró pista con ese ID
- `"DatabaseError"` - Error al consultar base de datos

---

### get_library_stats

Obtiene estadísticas de la biblioteca.

**Parámetros:** Ninguno

**Retorno:**
```typescript
interface LibraryStats {
  totalTracks: number;
  totalDuration: number;
  totalSize: number;
  formatDistribution: Record<string, number>;
}
```

**Ejemplo:**
```typescript
const stats = await invoke<LibraryStats>("get_library_stats");

console.log(`Total de pistas: ${stats.totalTracks}`);
console.log(`Duración total: ${(stats.totalDuration / 3600).toFixed(2)} horas`);
console.log(`Tamaño total: ${(stats.totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`Formatos:`, stats.formatDistribution);
```

**Errores:**
- `"DatabaseError"` - Error al consultar base de datos

---

### get_track_artwork

Obtiene el artwork (imagen de portada) de una pista de audio.

**Parámetros:**
- `id`: `string` - UUID de la pista

**Retorno:**
```typescript
string | null // Base64 data URI o null si no hay artwork
```

**Ejemplo:**
```typescript
const artwork = await invoke<string | null>("get_track_artwork", { id: "track-uuid" });

if (artwork) {
  // artwork es data URI lista para usar en <img src>
  // ej: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  document.getElementById("album-art").src = artwork;
} else {
  console.log("Track sin artwork embebido");
}
```

**Uso con React Hook (recomendado):**
```typescript
import { useArtwork } from "@/hooks/useArtwork";

const MyComponent = ({ trackId }) => {
  const { artwork, isLoading, error } = useArtwork(trackId);

  if (isLoading) return <Spinner />;
  if (!artwork) return <PlaceholderIcon />;
  
  return <img src={artwork} alt="Album art" />;
};
```

**Notas:**
- Extrae imágenes embebidas de archivos MP3 (ID3), FLAC, OGG, M4A
- Prioriza portada frontal (CoverFront) sobre otros tipos
- Retorna data URI con MIME type correcto (image/jpeg, image/png, etc.)
- El hook `useArtwork` incluye cache en memoria para evitar re-extracciones

**Errores:**
- `"Track not found"` - No existe pista con ese ID
- `"Error extracting artwork"` - No se pudo leer el archivo

---

### consolidate_library

Consolida la biblioteca verificando archivos, eliminando huérfanos, duplicados y agregando archivos nuevos.

**Parámetros:**
- `library_paths`: `string[]` - Array de rutas a carpetas de biblioteca

**Retorno:**
```typescript
interface ConsolidateLibraryResult {
  orphansRemoved: number;      // Tracks sin archivo físico
  duplicatesRemoved: number;    // Tracks duplicados (mismo path)
  newTracksAdded: number;       // Archivos nuevos detectados e importados
  totalTracks: number;          // Total de tracks después de consolidar
  initialTracks: number;        // Total de tracks antes de consolidar
}
```

**Ejemplo:**
```typescript
// Obtener rutas de biblioteca
const tracks = await invoke<Track[]>("get_all_tracks");
const libraryPaths = [...new Set(
  tracks.map(t => t.path.split('/').slice(0, -1).join('/'))
)];

const result = await invoke<ConsolidateLibraryResult>("consolidate_library", {
  libraryPaths
});

console.log(`Huérfanos eliminados: ${result.orphansRemoved}`);
console.log(`Duplicados eliminados: ${result.duplicatesRemoved}`);
console.log(`Nuevas pistas agregadas: ${result.newTracksAdded}`);
console.log(`Pistas antes: ${result.initialTracks}`);
console.log(`Pistas ahora: ${result.totalTracks}`);
```

**Operaciones realizadas:**
1. **Verifica archivos:** Comprueba que cada track tenga su archivo físico en disco
2. **Elimina huérfanos:** Borra entradas de la BD cuyos archivos no existen
3. **Elimina duplicados:** Detecta y elimina tracks con el mismo path (mantiene el más antiguo)
4. **Detecta archivos nuevos:** Escanea las carpetas de biblioteca buscando archivos no importados
5. **Importa archivos nuevos:** Extrae metadatos e inserta en la base de datos
6. **Optimiza BD:** Ejecuta VACUUM y ANALYZE para mejorar el rendimiento

**Notas:**
- **Operación segura:** Solo elimina entradas de la base de datos, nunca archivos físicos
- **No destructiva:** Mantiene la integridad de tu colección musical en disco
- **Auto-detección:** Encuentra y agrega automáticamente archivos nuevos
- **Recomendado:** Ejecutar después de mover, reorganizar o agregar archivos manualmente
- **Duración:** Puede tomar varios minutos en bibliotecas grandes (>10,000 tracks)
- **Formatos soportados:** MP3, FLAC, WAV, OGG, M4A, AAC

**Uso con Hook (Recomendado):**
```typescript
import { invoke } from "@tauri-apps/api/core";
import { useMutation } from "@tanstack/react-query";

const useConsolidateLibrary = () => {
  return useMutation({
    mutationFn: () => invoke<ConsolidateLibraryResult>("consolidate_library"),
    onSuccess: (result) => {
      console.log(`Biblioteca consolidada: ${result.orphansRemoved + result.duplicatesRemoved} elementos eliminados`);
    },
  });
};
```

**Errores:**
- `"DatabaseError"` - Error al acceder a la base de datos
- `"Error al consolidar biblioteca"` - Error durante la consolidación

---

## Playlists (Milestone 3)

### get_playlists

Obtiene todas las playlists existentes.

**Parámetros:** Ninguno

**Retorno:**
```typescript
interface Playlist {
  id: number;
  name: string;
  description: string | null;
  track_count: number;
  created_at: string;
  updated_at: string;
}

Playlist[] // Array de playlists
```

**Ejemplo:**
```typescript
const playlists = await invoke<Playlist[]>("get_playlists");
console.log(`Total de playlists: ${playlists.length}`);
```

**Errores:**
- `"DatabaseError"` - Error al consultar base de datos

---

### get_playlist

Obtiene una playlist específica por su ID.

**Parámetros:**
- `id`: `number` - ID de la playlist

**Retorno:**
```typescript
Playlist // Playlist encontrada
```

**Ejemplo:**
```typescript
const playlist = await invoke<Playlist>("get_playlist", { id: 1 });
console.log(`Nombre: ${playlist.name}`);
console.log(`Pistas: ${playlist.track_count}`);
```

**Errores:**
- `"PlaylistNotFound"` - No se encontró playlist con ese ID
- `"DatabaseError"` - Error al consultar base de datos

---

### get_playlist_tracks_cmd

Obtiene todas las pistas de una playlist específica.

**Parámetros:**
- `playlist_id`: `number` - ID de la playlist

**Retorno:**
```typescript
interface PlaylistTrack extends Track {
  position: number;        // Posición en la playlist
  added_at: string;       // Fecha de agregación
}

PlaylistTrack[] // Array de pistas ordenadas por posición
```

**Ejemplo:**
```typescript
const tracks = await invoke<PlaylistTrack[]>("get_playlist_tracks_cmd", {
  playlist_id: 1
});

tracks.forEach(track => {
  console.log(`${track.position}: ${track.title} - ${track.artist}`);
});
```

**Errores:**
- `"PlaylistNotFound"` - No se encontró playlist con ese ID
- `"DatabaseError"` - Error al consultar base de datos

---

### create_playlist

Crea una nueva playlist.

**Parámetros:**
- `name`: `string` - Nombre de la playlist (requerido)
- `description`: `string | null` - Descripción opcional

**Retorno:**
```typescript
Playlist // Playlist creada con su ID
```

**Ejemplo:**
```typescript
const newPlaylist = await invoke<Playlist>("create_playlist", {
  name: "Mi Playlist",
  description: "Las mejores canciones de 2024"
});

console.log(`Playlist creada con ID: ${newPlaylist.id}`);
```

**Errores:**
- `"InvalidInput"` - Nombre vacío o inválido
- `"DatabaseError"` - Error al guardar en base de datos

---

### update_playlist

Actualiza el nombre y/o descripción de una playlist.

**Parámetros:**
- `id`: `number` - ID de la playlist a actualizar
- `name`: `string` - Nuevo nombre (requerido)
- `description`: `string | null` - Nueva descripción opcional

**Retorno:**
```typescript
Playlist // Playlist actualizada
```

**Ejemplo:**
```typescript
const updated = await invoke<Playlist>("update_playlist", {
  id: 1,
  name: "Mi Playlist Actualizada",
  description: "Nueva descripción"
});

console.log(`Playlist actualizada: ${updated.name}`);
```

**Errores:**
- `"PlaylistNotFound"` - No se encontró playlist con ese ID
- `"InvalidInput"` - Nombre vacío o inválido
- `"DatabaseError"` - Error al actualizar base de datos

---

### delete_playlist

Elimina una playlist de forma permanente.

**Parámetros:**
- `id`: `number` - ID de la playlist a eliminar

**Retorno:**
```typescript
{ success: boolean } // Confirmación de eliminación
```

**Ejemplo:**
```typescript
const result = await invoke<{ success: boolean }>("delete_playlist", {
  id: 1
});

if (result.success) {
  console.log("Playlist eliminada correctamente");
}
```

**Errores:**
- `"PlaylistNotFound"` - No se encontró playlist con ese ID
- `"DatabaseError"` - Error al eliminar de base de datos

---

### add_track_to_playlist

Agrega una pista a una playlist.

**Parámetros:**
- `playlist_id`: `number` - ID de la playlist
- `track_id`: `number` - ID de la pista a agregar

**Retorno:**
```typescript
{ success: boolean } // Confirmación de agregación
```

**Ejemplo:**
```typescript
const result = await invoke<{ success: boolean }>("add_track_to_playlist", {
  playlist_id: 1,
  track_id: 42
});

if (result.success) {
  console.log("Pista agregada a la playlist");
}
```

**Errores:**
- `"PlaylistNotFound"` - No se encontró playlist con ese ID
- `"TrackNotFound"` - No se encontró pista con ese ID
- `"TrackAlreadyInPlaylist"` - La pista ya existe en la playlist
- `"DatabaseError"` - Error al guardar en base de datos

---

### remove_track_from_playlist

Elimina una pista de una playlist.

**Parámetros:**
- `playlist_id`: `number` - ID de la playlist
- `track_id`: `number` - ID de la pista a eliminar

**Retorno:**
```typescript
{ success: boolean } // Confirmación de eliminación
```

**Ejemplo:**
```typescript
const result = await invoke<{ success: boolean }>("remove_track_from_playlist", {
  playlist_id: 1,
  track_id: 42
});

if (result.success) {
  console.log("Pista eliminada de la playlist");
}
```

**Errores:**
- `"PlaylistNotFound"` - No se encontró playlist con ese ID
- `"TrackNotInPlaylist"` - La pista no está en la playlist
- `"DatabaseError"` - Error al eliminar de base de datos

---

### reorder_playlist_tracks

Reordena las pistas en una playlist especificando el nuevo orden completo.

**Parámetros:**
- `playlist_id`: `number` - ID de la playlist
- `track_ids`: `number[]` - Array con los IDs de las pistas en el nuevo orden

**Retorno:**
```typescript
{ success: boolean } // Confirmación de reordenamiento
```

**Ejemplo:**
```typescript
// Mover segunda pista a primera posición
const currentOrder = [10, 20, 30, 40];
const newOrder = [20, 10, 30, 40]; // 20 ahora primero

const result = await invoke<{ success: boolean }>("reorder_playlist_tracks", {
  playlist_id: 1,
  track_ids: newOrder
});

if (result.success) {
  console.log("Playlist reordenada correctamente");
}
```

**Errores:**
- `"PlaylistNotFound"` - No se encontró playlist con ese ID
- `"InvalidInput"` - El array de IDs está vacío o contiene IDs inválidos
- `"TrackMismatch"` - Los IDs no coinciden con las pistas de la playlist
- `"DatabaseError"` - Error al actualizar base de datos

---

### update_track_metadata

Actualiza los metadatos de una pista específica.

**Parámetros:**
- `track_id`: `number` - ID de la pista a actualizar
- `metadata`: `object` - Objeto con los campos a actualizar:
  - `title`: `string` - Título de la pista
  - `artist`: `string` - Artista
  - `album`: `string` - Álbum
  - `year`: `number` - Año de lanzamiento
  - `genre`: `string` - Género musical
  - `rating`: `number` - Rating de 0 a 5 estrellas

**Retorno:**
```typescript
{ success: boolean } // Confirmación de actualización
```

**Ejemplo:**
```typescript
const result = await invoke<{ success: boolean }>("update_track_metadata", {
  track_id: 42,
  metadata: {
    title: "Nuevo Título",
    artist: "Nuevo Artista",
    album: "Nuevo Álbum",
    year: 2024,
    genre: "Rock",
    rating: 5
  }
});

if (result.success) {
  console.log("Metadatos actualizados correctamente");
}
```

**Errores:**
- `"TrackNotFound"` - No se encontró pista con ese ID
- `"InvalidInput"` - Datos inválidos (ej: rating fuera del rango 0-5)
- `"DatabaseError"` - Error al actualizar base de datos

---

## Análisis Avanzado (Milestone 4)

### analyze_beatgrid

Analiza una pista de audio para detectar automáticamente el BPM y generar un beatgrid.

**Parámetros:**
- `track_path`: `string` - Ruta absoluta al archivo de audio
- `params`: `AnalyzeBeatgridParams` (opcional)
  - `min_bpm`: `number` - BPM mínimo (default: 60)
  - `max_bpm`: `number` - BPM máximo (default: 200)

**Retorno:**
```typescript
interface Beatgrid {
  trackId: string;
  bpm: number;           // BPM detectado
  offset: number;        // Offset del primer beat (segundos)
  confidence: number;    // Confianza del análisis (0-100)
  analyzedAt: string;    // Timestamp ISO 8601
}
```

**Ejemplo:**
```typescript
const beatgrid = await invoke<Beatgrid>("analyze_beatgrid", {
  trackPath: "/home/user/music/track.mp3",
  params: { minBpm: 80, maxBpm: 180 }
});

console.log(`BPM: ${beatgrid.bpm}, Confidence: ${beatgrid.confidence}%`);
```

**Errores:**
- `"Archivo no encontrado"` - El archivo no existe
- `"Error al decodificar"` - No se pudo decodificar el audio
- `"Análisis fallido"` - No se pudo detectar BPM

---

### get_beatgrid

Obtiene el beatgrid analizado de una pista.

**Parámetros:**
- `track_id`: `string` - ID de la pista

**Retorno:**
- `Promise<Beatgrid | null>` - Beatgrid si existe, null si no ha sido analizada

**Ejemplo:**
```typescript
const beatgrid = await invoke<Beatgrid | null>("get_beatgrid", {
  trackId: "track-123"
});

if (beatgrid) {
  console.log(`BPM: ${beatgrid.bpm}`);
} else {
  console.log("Pista no analizada");
}
```

---

### update_beatgrid_offset

Actualiza el offset de un beatgrid (ajuste manual).

**Parámetros:**
- `track_id`: `string` - ID de la pista
- `offset`: `number` - Nuevo offset en segundos (≥0)

**Retorno:**
- `Promise<Beatgrid>` - Beatgrid actualizado

**Ejemplo:**
```typescript
const updated = await invoke<Beatgrid>("update_beatgrid_offset", {
  trackId: "track-123",
  offset: 0.5 // Ajustar 500ms
});
```

---

### delete_beatgrid

Elimina el beatgrid de una pista.

**Parámetros:**
- `track_id`: `string` - ID de la pista

**Retorno:**
- `Promise<void>`

**Ejemplo:**
```typescript
await invoke("delete_beatgrid", { trackId: "track-123" });
```

---

### create_cue_point

Crea un nuevo cue point en una pista.

**Parámetros:**
```typescript
interface CreateCuePointRequest {
  trackId: string;
  position: number;      // Posición en segundos (≥0)
  label?: string;
  color?: string;        // Hex color (ej: "#ff0000")
  type: CuePointType;    // 'cue' | 'intro' | 'outro' | 'drop' | 'vocal' | 'break' | 'custom'
  hotkey?: number;       // 1-8 (opcional)
}
```

**Retorno:**
- `Promise<number>` - ID del cue point creado

**Ejemplo:**
```typescript
const cuePointId = await invoke<number>("create_cue_point", {
  trackId: "track-123",
  position: 30.5,
  label: "Drop",
  type: "drop",
  hotkey: 1
});
```

**Validaciones:**
- position ≥ 0
- hotkey entre 1-8 (si se especifica)
- Máximo 64 cue points por pista

---

### get_cue_points

Obtiene todos los cue points de una pista.

**Parámetros:**
- `track_id`: `string` - ID de la pista

**Retorno:**
```typescript
interface CuePoint {
  id: number;
  trackId: string;
  position: number;
  label: string | null;
  color: string | null;
  type: CuePointType;
  hotkey: number | null;
  createdAt: string;
}

Promise<CuePoint[]>
```

**Ejemplo:**
```typescript
const cuePoints = await invoke<CuePoint[]>("get_cue_points", {
  trackId: "track-123"
});

cuePoints.forEach(cue => {
  console.log(`${cue.label} @ ${cue.position}s (hotkey: ${cue.hotkey})`);
});
```

---

### update_cue_point

Actualiza un cue point existente.

**Parámetros:**
- `id`: `number` - ID del cue point
- `request`: `UpdateCuePointRequest`
  - `position`: `number` (opcional)
  - `label`: `string | null` (opcional)
  - `color`: `string | null` (opcional)
  - `type`: `CuePointType` (opcional)
  - `hotkey`: `number | null` (opcional)

**Retorno:**
- `Promise<CuePoint>` - Cue point actualizado

**Ejemplo:**
```typescript
const updated = await invoke<CuePoint>("update_cue_point", {
  id: 42,
  request: {
    label: "Nuevo Label",
    hotkey: 2
  }
});
```

---

### delete_cue_point

Elimina un cue point.

**Parámetros:**
- `id`: `number` - ID del cue point

**Retorno:**
- `Promise<void>`

**Ejemplo:**
```typescript
await invoke("delete_cue_point", { id: 42 });
```

---

### create_loop

Crea un nuevo loop en una pista.

**Parámetros:**
```typescript
interface CreateLoopRequest {
  trackId: string;
  label?: string;
  loopStart: number;     // Inicio en segundos (≥0)
  loopEnd: number;       // Fin en segundos (> loopStart)
  isActive?: boolean;    // Default: false
}
```

**Retorno:**
- `Promise<number>` - ID del loop creado

**Ejemplo:**
```typescript
const loopId = await invoke<number>("create_loop", {
  trackId: "track-123",
  label: "Chorus",
  loopStart: 60.0,
  loopEnd: 90.0,
  isActive: true
});
```

**Validaciones:**
- loopStart ≥ 0
- loopEnd > loopStart
- (loopEnd - loopStart) ≥ 0.1 (mínimo 100ms)

---

### get_loops

Obtiene todos los loops de una pista.

**Parámetros:**
- `track_id`: `string` - ID de la pista

**Retorno:**
```typescript
interface Loop {
  id: number;
  trackId: string;
  label: string | null;
  loopStart: number;
  loopEnd: number;
  isActive: boolean;
  createdAt: string;
}

Promise<Loop[]>
```

**Ejemplo:**
```typescript
const loops = await invoke<Loop[]>("get_loops", {
  trackId: "track-123"
});

loops.forEach(loop => {
  const duration = loop.loopEnd - loop.loopStart;
  console.log(`${loop.label}: ${duration.toFixed(2)}s`);
});
```

---

### update_loop

Actualiza un loop existente.

**Parámetros:**
- `id`: `number` - ID del loop
- `request`: `UpdateLoopRequest`
  - `label`: `string | null` (opcional)
  - `loopStart`: `number` (opcional)
  - `loopEnd`: `number` (opcional)
  - `isActive`: `boolean` (opcional)

**Retorno:**
- `Promise<Loop>` - Loop actualizado

**Ejemplo:**
```typescript
const updated = await invoke<Loop>("update_loop", {
  id: 10,
  request: {
    isActive: true,
    loopEnd: 95.0  // Extender loop
  }
});
```

**Validación:** Si se actualizan loopStart o loopEnd, se valida que la duración sea ≥100ms

---

## Settings (Configuración)

### get_setting

Obtiene un ajuste de configuración específico por clave.

**Parámetros:**
- `key`: `string` - Clave del ajuste (ej: `"ui.theme"`, `"audio.sample_rate"`)

**Retorno:**
- `Promise<Setting>` - Objeto de configuración con `{ key, value, valueType }`
- Lanza error si la clave no existe

**Ejemplo:**
```typescript
const themeSetting = await invoke<Setting>("get_setting", {
  key: "ui.theme"
});
console.log(themeSetting.value); // "dark" | "light" | "system"
```

---

### get_all_settings

Obtiene todos los ajustes de configuración.

**Retorno:**
- `Promise<Setting[]>` - Array de todos los ajustes

**Ejemplo:**
```typescript
const allSettings = await invoke<Setting[]>("get_all_settings");
// [{ key: "ui.theme", value: "dark", valueType: "string" }, ...]
```

---

### update_setting

Actualiza o crea un ajuste de configuración.

**Parámetros:**
- `key`: `string` - Clave del ajuste
- `value`: `string` - Valor como string (se convertirá según valueType)
- `valueType`: `"string" | "number" | "boolean" | "json"` - Tipo del valor

**Retorno:**
- `Promise<void>`

**Ejemplo:**
```typescript
await invoke("update_setting", {
  key: "ui.theme",
  value: "dark",
  valueType: "string"
});

await invoke("update_setting", {
  key: "audio.sample_rate",
  value: "96000",
  valueType: "number"
});

await invoke("update_setting", {
  key: "library.auto_scan_on_startup",
  value: "true",
  valueType: "boolean"
});
```

**Notas:**
- Si el ajuste no existe, se crea
- Los valores se almacenan como strings en la BD pero se parsean según `valueType`

---

### update_settings (batch)

Actualiza múltiples ajustes en una sola transacción.

**Parámetros:**
- `updates`: `Array<{ key: string, value: string, valueType: string }>`

**Retorno:**
- `Promise<void>`

**Ejemplo:**
```typescript
await invoke("update_settings", {
  updates: [
    { key: "ui.theme", value: "dark", valueType: "string" },
    { key: "ui.language", value: "es", valueType: "string" },
    { key: "audio.sample_rate", value: "48000", valueType: "number" }
  ]
});
```

**Ventajas:**
- Operación atómica (todo o nada)
- Más eficiente que múltiples llamadas individuales

---

### reset_settings

Resetea todos los ajustes a sus valores por defecto.

**Retorno:**
- `Promise<void>`

**Ejemplo:**
```typescript
await invoke("reset_settings");
// Todos los ajustes vuelven a valores por defecto (ej: theme="system", bitrate=320)
```

**Valores por defecto:**
```typescript
{
  ui: {
    theme: "system",
    language: "es",
    waveformResolution: 512
  },
  audio: {
    outputDevice: "default",
    sampleRate: 44100,
    bufferSize: 2048
  },
  library: {
    autoScanOnStartup: false,
    scanIntervalHours: 24,
    importFolder: ""
  },
  conversion: {
    enabled: false,
    autoConvert: false,
    bitrate: 320,
    outputFolder: "",
    preserveStructure: true
  }
}
```

---

## Conversion (Conversión de Audio)

### Eventos Tauri (Conversión)

- `conversion:progress` → `{ current_file: string, current_index: number, total_files: number, percentage: number, status: string }`

**Ejemplo de suscripción:**
```typescript
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  const unlisten = await listen<ConversionProgress>('conversion:progress', (event) => {
    setProgress(event.payload);
  });
  return () => { unlisten(); };
}, []);
```

---

### check_ffmpeg_installed

Verifica si ffmpeg está instalado y disponible en el sistema.

**Retorno:**
- `Promise<boolean>` - `true` si ffmpeg está disponible, `false` en caso contrario

**Ejemplo:**
```typescript
const hasFFmpeg = await invoke<boolean>("check_ffmpeg_installed");
if (!hasFFmpeg) {
  alert("Por favor instala ffmpeg para usar la conversión");
}
```

**Notas:**
- La conversión requiere ffmpeg instalado en el sistema
- En Linux/macOS: `ffmpeg` debe estar en PATH
- En Windows: `ffmpeg.exe` debe estar en PATH

---

### convert_track_to_mp3

Convierte un archivo de audio a formato MP3.

**Parámetros:**
- `inputPath`: `string` - Ruta absoluta del archivo de entrada
- `bitrate`: `number` - Bitrate en kbps (128, 192, 256, 320)
- `outputFolder`: `string` - Carpeta de salida
- `preserveStructure`: `boolean` - Si true, preserva el nombre del archivo original

**Retorno:**
- `Promise<ConversionResult>`
  ```typescript
  {
    inputPath: string;
    outputPath: string;  // Vacío si falló
    success: boolean;
    error?: string;      // Presente si success=false
    durationMs: number;  // Tiempo que tomó la conversión
  }
  ```

**Ejemplo:**
```typescript
const result = await invoke<ConversionResult>("convert_track_to_mp3", {
  inputPath: "/music/song.flac",
  bitrate: 320,
  outputFolder: "/output/mp3",
  preserveStructure: true
});

if (result.success) {
  console.log(`Convertido a: ${result.outputPath}`);
} else {
  console.error(`Error: ${result.error}`);
}
```

**Notas:**
- Emite eventos `conversion:progress` durante la conversión
- `preserveStructure: true` mantiene el nombre base del archivo
- `preserveStructure: false` podría agregar sufijos (aún no implementado)

---

### batch_convert_to_mp3

Convierte múltiples archivos a MP3 en lote.

**Parámetros:**
- `inputPaths`: `string[]` - Array de rutas absolutas de archivos
- `bitrate`: `number` - Bitrate en kbps
- `outputFolder`: `string` - Carpeta de salida
- `preserveStructure`: `boolean` - Preservar estructura de nombres

**Retorno:**
- `Promise<ConversionResult[]>` - Array de resultados, uno por cada archivo

**Ejemplo:**
```typescript
const results = await invoke<ConversionResult[]>("batch_convert_to_mp3", {
  inputPaths: [
    "/music/song1.flac",
    "/music/song2.wav",
    "/music/song3.aiff"
  ],
  bitrate: 320,
  outputFolder: "/output/mp3",
  preserveStructure: true
});

const successful = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;
console.log(`✅ ${successful} exitosos, ❌ ${failed} fallidos`);
```

**Ventajas:**
- Procesa archivos en paralelo (mejora rendimiento)
- Emite eventos de progreso para cada archivo
- Continúa procesando aunque algunos archivos fallen

**Formatos de entrada soportados:**
- FLAC, WAV, AIFF, AAC, OGG, M4A, WMA, etc. (cualquier formato soportado por ffmpeg)

---

## Beatport Integration (Milestone 5)

### Flujo de Selección Manual (Recomendado)

A partir de v0.13.0, el flujo recomendado es la **selección manual de candidatos**, que evita falsos positivos:

1. **Fase 1 - Búsqueda:** Llamar `search_beatport_candidates` para obtener hasta 4 candidatos por track
2. **Fase 2 - Selección:** El usuario elige el match correcto (o "No está en Beatport")
3. **Fase 3 - Aplicación:** Llamar `apply_selected_tags` con las selecciones confirmadas

Este flujo permite al usuario verificar visualmente cada match antes de aplicar los tags.

---

### search_beatport_candidates

Busca candidatos en Beatport para una lista de tracks locales. Retorna hasta 4 candidatos por track con un score de similitud.

**Parámetros:**
- `trackIds`: `string[]` - Array de UUIDs de tracks locales

**Retorno:**
```typescript
interface BeatportCandidate {
  beatport_id: number;
  title: string;
  artists: string;
  bpm: number | null;
  key: string | null;
  duration_secs: number | null;
  artwork_url: string | null;
  similarity_score: number;  // 0.0 - 1.0
  genre: string | null;
  label: string | null;
}

interface TrackCandidates {
  local_track_id: string;
  local_title: string;
  local_artist: string;
  local_duration: number | null;
  candidates: BeatportCandidate[];  // Máximo 4
  error: string | null;
}

interface SearchCandidatesResult {
  tracks: TrackCandidates[];
  total: number;
  with_candidates: number;
  without_candidates: number;
}

Promise<SearchCandidatesResult>
```

**Ejemplo:**
```typescript
const result = await invoke<SearchCandidatesResult>("search_beatport_candidates", {
  trackIds: ["uuid-1", "uuid-2", "uuid-3"]
});

result.tracks.forEach(track => {
  console.log(`${track.local_title} - ${track.local_artist}`);
  track.candidates.forEach(candidate => {
    console.log(`  ${candidate.title} (${Math.round(candidate.similarity_score * 100)}%)`);
  });
});
```

**Notas:**
- `min_score` por defecto: 0.25 (25% similitud mínima)
- `max_results` por defecto: 4 candidatos
- Candidatos ordenados por `similarity_score` descendente
- Tracks sin candidatos tendrán `candidates: []`

---

### apply_selected_tags

Aplica tags de Beatport a tracks locales basándose en las selecciones del usuario.

**Parámetros:**
- `selections`: `TrackSelection[]` - Array de selecciones del usuario

```typescript
interface TrackSelection {
  local_track_id: string;       // UUID del track local
  beatport_track_id: number | null;  // ID de Beatport o null si "No está"
}
```

**Retorno:**
```typescript
interface BatchFixResult {
  total: number;
  success_count: number;
  failed_count: number;
  results: FixTagsResult[];
}
```

**Ejemplo:**
```typescript
// Usuario seleccionó candidatos en el modal
const selections: TrackSelection[] = [
  { local_track_id: "uuid-1", beatport_track_id: 12345678 },
  { local_track_id: "uuid-2", beatport_track_id: null },  // No está en Beatport
  { local_track_id: "uuid-3", beatport_track_id: 87654321 },
];

const result = await invoke<BatchFixResult>("apply_selected_tags", {
  selections: selections.filter(s => s.beatport_track_id !== null)
});

console.log(`✅ Aplicados: ${result.success_count}`);
```

**Notas:**
- Solo enviar selecciones con `beatport_track_id !== null`
- Emite eventos `beatport:progress` durante el proceso
- Descarga artwork y aplica todos los tags disponibles

---

### fix_tags (Automático - Legacy)

> **⚠️ Deprecado:** Usar `search_beatport_candidates` + `apply_selected_tags` para evitar falsos positivos.

Busca tracks en Beatport y completa automáticamente los metadatos faltantes (BPM, Key, Genre, Label, ISRC, Artwork).

**Parámetros:**
- `trackIds`: `string[]` - Array de UUIDs de tracks a procesar

**Retorno:**
```typescript
interface BeatportTags {
  bpm: number | null;
  key: string | null;
  genre: string | null;
  label: string | null;
  album: string | null;
  year: number | null;
  isrc: string | null;
  catalog_number: string | null;
  artwork_url: string | null;
}

interface FixTagsResult {
  track_id: string;
  success: boolean;
  beatport_track_id?: number;
  tags_applied?: BeatportTags;
  error?: string;
}

interface BatchFixResult {
  total: number;
  success_count: number;
  failed_count: number;
  results: FixTagsResult[];
}

Promise<BatchFixResult>
```

**Eventos emitidos:**
```typescript
// Emitido para cada track procesado
interface FixTagsProgress {
  current: number;
  total: number;
  current_track_title: string;
  phase: 'searching' | 'downloading' | 'applying_tags' | 'complete';
}

listen<FixTagsProgress>("beatport:progress", (event) => {
  console.log(`${event.payload.current}/${event.payload.total}: ${event.payload.current_track_title}`);
});
```

**Ejemplo:**
```typescript
import { invoke, listen } from "@tauri-apps/api/core";

// Escuchar progreso
const unlisten = await listen<FixTagsProgress>("beatport:progress", (event) => {
  const { current, total, current_track_title, phase } = event.payload;
  console.log(`[${phase}] ${current}/${total}: ${current_track_title}`);
});

// Ejecutar fix_tags
const result = await invoke<BatchFixResult>("fix_tags", {
  trackIds: ["uuid-1", "uuid-2", "uuid-3"]
});

console.log(`✅ Encontrados: ${result.success_count}`);
console.log(`❌ No encontrados: ${result.failed_count}`);

// Mostrar tracks fallidos
result.results
  .filter(r => !r.success)
  .forEach(r => console.log(`- ${r.track_id}: ${r.error}`));

// Limpiar listener
unlisten();
```

**Lógica de Merge de Tags:**
- **Title:** Siempre se aplica (corrige nombres mal escritos)
- **Artist:** Siempre se aplica (corrige artistas incorrectos)
- **Genre:** Siempre se aplica (corrige géneros incorrectos)
- **Key:** Siempre se aplica (reemplaza el existente)
- **Album:** Siempre se aplica (corrige álbumes)
- **Year:** Siempre se aplica (corrige años)
- **BPM:** Solo se aplica si el track local NO tiene BPM
- **Label, ISRC:** Siempre se aplican (generalmente no existen en local)
- **Artwork:** Siempre se aplica si está disponible

**Algoritmo de Matching:**
- Ponderación: 50% similitud de título, 30% similitud de artista, 20% coincidencia de duración
- Tolerancia de duración: ≤5s = match perfecto, ≤15s = aceptable, >30s = penalización

**Errores:**
- `"No se seleccionaron tracks"` - Array vacío
- `"Track no encontrado: {artist} - {title}"` - No hay resultados en Beatport
- `"Error de red: {mensaje}"` - Problema de conexión
- `"Rate limited"` - Demasiadas peticiones (esperar y reintentar)

**Uso con Hook (Recomendado):**
```typescript
import { useBeatport } from "@/hooks/useBeatport";

// Flujo de selección manual (recomendado)
const { searchCandidates, applySelectedTags, progress, isSearching, isApplying } = useBeatport();

const handleFixTagsWithSelection = async (trackIds: string[]) => {
  // Fase 1: Buscar candidatos
  const candidates = await searchCandidates.mutateAsync(trackIds);
  
  // Fase 2: Mostrar modal de selección (el usuario elige)
  // ... UI logic ...
  
  // Fase 3: Aplicar tags seleccionados
  const selections = getUserSelections(); // Del modal
  await applySelectedTags.mutateAsync(selections);
};

// Flujo automático (legacy - no recomendado)
const { fixTags } = useBeatport();

const handleFixTagsAutomatic = async (trackIds: string[]) => {
  await fixTags.mutateAsync(trackIds);
};
```

---

## Próximas Funciones (Roadmap)

### Planeadas (Milestone 6+):
- `normalize_audio` - Normalización de volumen
- `export_playlist_m3u` - Exportar playlist a formato M3U
- Análisis de tempo/BPM automático
- Detección de clave musical (key detection)

---

*Última actualización: Enero 2025 (Milestone 5 - Beatport Integration con Selección Manual)*
