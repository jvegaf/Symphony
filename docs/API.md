# API de Comandos Tauri - Symphony

Esta documentación describe todos los comandos Tauri disponibles para interactuar con el backend de Symphony desde el frontend React.

## Audio

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

## Próximas Funciones (Roadmap)

### En desarrollo:
- `seek` - Saltar a una posición específica en la pista
- `get_position` - Obtener posición actual de reproducción
- `set_volume` - Ajustar volumen de reproducción
- `generate_waveform` - Generar datos de waveform para visualización

### Planeadas:
- `analyze_beatgrid` - Análisis de BPM y beatgrid
- `set_cue_point` - Gestionar cue points
- `generate_waveform` - Generar datos de waveform para visualización avanzada

---

*Última actualización: Diciembre 2025 (Milestone 3)*
