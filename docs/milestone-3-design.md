# Diseño Técnico - Milestone 3: Playlists y Edición

## Resumen Ejecutivo

Este documento detalla el diseño técnico para la implementación de gestión de playlists y edición de metadatos en Symphony, siguiendo la metodología TDD.

## Requisitos Funcionales Cubiertos

### RF-008: Playlists
- RF-008.1: Creación de playlist
- RF-008.2: Agregar pistas
- RF-008.3: Reordenar pistas
- RF-008.4: Eliminar de playlist

### RF-009: Edición de Metadatos
- RF-009.1: Edición in-app
- RF-009.2: Persistencia
- RF-009.3: Rating de pistas

## Arquitectura Backend (Rust)

### 1. Módulo de Playlists

#### 1.1 Queries de Base de Datos

```rust
// src-tauri/src/db/queries.rs (expansión)

/// Crea una nueva playlist
pub fn create_playlist(
    conn: &Connection,
    name: &str,
    description: Option<&str>,
) -> Result<i64, rusqlite::Error> {
    conn.execute(
        "INSERT INTO playlists (name, description) VALUES (?1, ?2)",
        params![name, description],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Obtiene todas las playlists con conteo de tracks
pub fn get_all_playlists(conn: &Connection) -> Result<Vec<Playlist>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT p.id, p.name, p.description, 
                COUNT(pt.track_id) as track_count,
                p.created_at, p.updated_at
         FROM playlists p
         LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
         GROUP BY p.id
         ORDER BY p.created_at DESC"
    )?;
    
    let playlists = stmt.query_map([], |row| {
        Ok(Playlist {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            track_count: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;
    
    playlists.collect()
}

/// Obtiene una playlist específica por ID
pub fn get_playlist_by_id(
    conn: &Connection,
    id: i64,
) -> Result<Option<Playlist>, rusqlite::Error> {
    conn.query_row(
        "SELECT p.id, p.name, p.description,
                COUNT(pt.track_id) as track_count,
                p.created_at, p.updated_at
         FROM playlists p
         LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
         WHERE p.id = ?1
         GROUP BY p.id",
        params![id],
        |row| {
            Ok(Playlist {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                track_count: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .optional()
}

/// Actualiza una playlist
pub fn update_playlist(
    conn: &Connection,
    id: i64,
    name: &str,
    description: Option<&str>,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE playlists SET name = ?1, description = ?2 WHERE id = ?3",
        params![name, description, id],
    )?;
    Ok(())
}

/// Elimina una playlist (CASCADE elimina tracks asociados)
pub fn delete_playlist(conn: &Connection, id: i64) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM playlists WHERE id = ?1", params![id])?;
    Ok(())
}

/// Agrega un track a una playlist
pub fn add_track_to_playlist(
    conn: &Connection,
    playlist_id: i64,
    track_id: i64,
) -> Result<(), rusqlite::Error> {
    // Obtener posición más alta actual
    let max_position: Option<i32> = conn
        .query_row(
            "SELECT MAX(position) FROM playlist_tracks WHERE playlist_id = ?1",
            params![playlist_id],
            |row| row.get(0),
        )
        .optional()?
        .flatten();
    
    let next_position = max_position.unwrap_or(-1) + 1;
    
    conn.execute(
        "INSERT INTO playlist_tracks (playlist_id, track_id, position)
         VALUES (?1, ?2, ?3)",
        params![playlist_id, track_id, next_position],
    )?;
    Ok(())
}

/// Elimina un track de una playlist
pub fn remove_track_from_playlist(
    conn: &Connection,
    playlist_id: i64,
    track_id: i64,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "DELETE FROM playlist_tracks 
         WHERE playlist_id = ?1 AND track_id = ?2",
        params![playlist_id, track_id],
    )?;
    
    // Reordenar posiciones
    reorder_playlist_tracks(conn, playlist_id)?;
    Ok(())
}

/// Reordena tracks de una playlist
pub fn reorder_playlist_tracks(
    conn: &Connection,
    playlist_id: i64,
) -> Result<(), rusqlite::Error> {
    // Obtener tracks en orden actual
    let mut stmt = conn.prepare(
        "SELECT id, position FROM playlist_tracks 
         WHERE playlist_id = ?1 
         ORDER BY position"
    )?;
    
    let tracks: Vec<(i64, i32)> = stmt
        .query_map(params![playlist_id], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<_>, _>>()?;
    
    // Actualizar posiciones secuencialmente
    for (idx, (id, _)) in tracks.iter().enumerate() {
        conn.execute(
            "UPDATE playlist_tracks SET position = ?1 WHERE id = ?2",
            params![idx as i32, id],
        )?;
    }
    
    Ok(())
}

/// Actualiza el orden de tracks en una playlist
pub fn update_playlist_track_order(
    conn: &Connection,
    playlist_id: i64,
    track_ids: &[i64],
) -> Result<(), rusqlite::Error> {
    let tx = conn.transaction()?;
    
    // Eliminar tracks actuales
    tx.execute(
        "DELETE FROM playlist_tracks WHERE playlist_id = ?1",
        params![playlist_id],
    )?;
    
    // Insertar con nuevo orden
    for (position, track_id) in track_ids.iter().enumerate() {
        tx.execute(
            "INSERT INTO playlist_tracks (playlist_id, track_id, position)
             VALUES (?1, ?2, ?3)",
            params![playlist_id, track_id, position as i32],
        )?;
    }
    
    tx.commit()?;
    Ok(())
}

/// Obtiene tracks de una playlist en orden
pub fn get_playlist_tracks(
    conn: &Connection,
    playlist_id: i64,
) -> Result<Vec<Track>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.path, t.title, t.artist, t.album, t.year, t.genre,
                t.bpm, t.duration, t.bitrate, t.format, t.artwork_path,
                t.rating, t.created_at, t.updated_at
         FROM tracks t
         INNER JOIN playlist_tracks pt ON t.id = pt.track_id
         WHERE pt.playlist_id = ?1
         ORDER BY pt.position"
    )?;
    
    let tracks = stmt.query_map(params![playlist_id], |row| {
        Ok(Track {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            artist: row.get(3)?,
            album: row.get(4)?,
            year: row.get(5)?,
            genre: row.get(6)?,
            bpm: row.get(7)?,
            duration: row.get(8)?,
            bitrate: row.get(9)?,
            format: row.get(10)?,
            artwork_path: row.get(11)?,
            rating: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    })?;
    
    tracks.collect()
}
```

#### 1.2 Actualización de Modelos

```rust
// src-tauri/src/db/models.rs (expansión)

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub track_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistWithTracks {
    pub playlist: Playlist,
    pub tracks: Vec<Track>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePlaylistRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePlaylistRequest {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReorderTracksRequest {
    pub playlist_id: i64,
    pub track_ids: Vec<i64>,
}
```

### 2. Comandos Tauri de Playlists

```rust
// src-tauri/src/commands/playlists.rs

use crate::db::{models::*, queries::*};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub async fn create_playlist(
    name: String,
    description: Option<String>,
    db: State<'_, Mutex<Connection>>,
) -> Result<i64, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    create_playlist(&conn, &name, description.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_playlists(
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<Playlist>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    get_all_playlists(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_playlist_by_id(
    id: i64,
    db: State<'_, Mutex<Connection>>,
) -> Result<Option<Playlist>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    get_playlist_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_playlist_with_tracks(
    id: i64,
    db: State<'_, Mutex<Connection>>,
) -> Result<Option<PlaylistWithTracks>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    
    let playlist = get_playlist_by_id(&conn, id).map_err(|e| e.to_string())?;
    
    match playlist {
        Some(p) => {
            let tracks = get_playlist_tracks(&conn, id).map_err(|e| e.to_string())?;
            Ok(Some(PlaylistWithTracks {
                playlist: p,
                tracks,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn update_playlist(
    id: i64,
    name: String,
    description: Option<String>,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    update_playlist(&conn, id, &name, description.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_playlist(
    id: i64,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    delete_playlist(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_track_to_playlist(
    playlist_id: i64,
    track_id: i64,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    add_track_to_playlist(&conn, playlist_id, track_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_track_from_playlist(
    playlist_id: i64,
    track_id: i64,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    remove_track_from_playlist(&conn, playlist_id, track_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn reorder_playlist_tracks(
    playlist_id: i64,
    track_ids: Vec<i64>,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    update_playlist_track_order(&conn, playlist_id, &track_ids)
        .map_err(|e| e.to_string())
}
```

### 3. Comandos Tauri de Edición de Metadatos

```rust
// src-tauri/src/commands/library.rs (expansión)

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTrackMetadataRequest {
    pub id: i64,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub year: Option<i32>,
    pub genre: Option<String>,
    pub bpm: Option<f64>,
    pub rating: Option<i32>,
}

#[tauri::command]
pub async fn update_track_metadata(
    request: UpdateTrackMetadataRequest,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    // Validar rating (0-5)
    if let Some(rating) = request.rating {
        if rating < 0 || rating > 5 {
            return Err("Rating debe estar entre 0 y 5".to_string());
        }
    }
    
    let conn = db.lock().map_err(|e| e.to_string())?;
    
    // Construir query dinámica basada en campos presentes
    let mut updates = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(title) = &request.title {
        updates.push("title = ?");
        params.push(Box::new(title.clone()));
    }
    if let Some(artist) = &request.artist {
        updates.push("artist = ?");
        params.push(Box::new(artist.clone()));
    }
    if let Some(album) = &request.album {
        updates.push("album = ?");
        params.push(Box::new(album.clone()));
    }
    if let Some(year) = request.year {
        updates.push("year = ?");
        params.push(Box::new(year));
    }
    if let Some(genre) = &request.genre {
        updates.push("genre = ?");
        params.push(Box::new(genre.clone()));
    }
    if let Some(bpm) = request.bpm {
        updates.push("bpm = ?");
        params.push(Box::new(bpm));
    }
    if let Some(rating) = request.rating {
        updates.push("rating = ?");
        params.push(Box::new(rating));
    }
    
    if updates.is_empty() {
        return Ok(());
    }
    
    let query = format!(
        "UPDATE tracks SET {} WHERE id = ?",
        updates.join(", ")
    );
    params.push(Box::new(request.id));
    
    conn.execute(&query, params.as_slice())
        .map_err(|e| e.to_string())?;
    
    Ok(())
}
```

## Arquitectura Frontend (React + TypeScript)

### 1. Tipos TypeScript

```typescript
// src/types/playlist.ts

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  track_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistWithTracks {
  playlist: Playlist;
  tracks: Track[];
}

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
}

export interface UpdatePlaylistRequest {
  id: number;
  name: string;
  description?: string;
}

export interface UpdateTrackMetadataRequest {
  id: number;
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  bpm?: number;
  rating?: number;
}
```

### 2. Custom Hooks (TanStack Query)

```typescript
// src/hooks/usePlaylists.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import type { Playlist, PlaylistWithTracks, CreatePlaylistRequest, UpdatePlaylistRequest } from '@/types/playlist';

// Obtener todas las playlists
export const useGetPlaylists = () => {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: () => invoke<Playlist[]>('get_all_playlists'),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

// Obtener playlist con tracks
export const useGetPlaylistWithTracks = (id: number | null) => {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: () => invoke<PlaylistWithTracks | null>('get_playlist_with_tracks', { id }),
    enabled: id !== null,
    staleTime: 2 * 60 * 1000,
  });
};

// Crear playlist
export const useCreatePlaylist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CreatePlaylistRequest) =>
      invoke<number>('create_playlist', { 
        name: request.name, 
        description: request.description 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
};

// Actualizar playlist
export const useUpdatePlaylist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: UpdatePlaylistRequest) =>
      invoke<void>('update_playlist', {
        id: request.id,
        name: request.name,
        description: request.description,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.id] });
    },
  });
};

// Eliminar playlist
export const useDeletePlaylist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => invoke<void>('delete_playlist', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
};

// Agregar track a playlist
export const useAddTrackToPlaylist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: number; trackId: number }) =>
      invoke<void>('add_track_to_playlist', { 
        playlist_id: playlistId, 
        track_id: trackId 
      }),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
};

// Eliminar track de playlist
export const useRemoveTrackFromPlaylist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: number; trackId: number }) =>
      invoke<void>('remove_track_from_playlist', {
        playlist_id: playlistId,
        track_id: trackId,
      }),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
};

// Reordenar tracks en playlist
export const useReorderPlaylistTracks = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ playlistId, trackIds }: { playlistId: number; trackIds: number[] }) =>
      invoke<void>('reorder_playlist_tracks', {
        playlist_id: playlistId,
        track_ids: trackIds,
      }),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
    },
  });
};
```

```typescript
// src/hooks/useTrackMetadata.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import type { UpdateTrackMetadataRequest } from '@/types/playlist';

export const useUpdateTrackMetadata = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: UpdateTrackMetadataRequest) =>
      invoke<void>('update_track_metadata', { request }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['playlist'] });
    },
  });
};
```

### 3. Componentes UI

#### 3.1 PlaylistManager

```typescript
// src/components/PlaylistManager.tsx

interface PlaylistManagerProps {
  onSelectPlaylist?: (playlist: Playlist) => void;
}

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({ onSelectPlaylist }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  
  const { data: playlists, isLoading } = useGetPlaylists();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();
  
  const handleCreatePlaylist = (name: string, description?: string) => {
    createPlaylist.mutate({ name, description });
    setIsCreateDialogOpen(false);
  };
  
  const handleDeletePlaylist = (id: number) => {
    if (confirm('¿Eliminar esta playlist?')) {
      deletePlaylist.mutate(id);
    }
  };
  
  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylistId(playlist.id);
    onSelectPlaylist?.(playlist);
  };
  
  return (
    <div className="playlist-manager">
      {/* UI implementation */}
    </div>
  );
};
```

#### 3.2 PlaylistDetail (con Drag & Drop)

```typescript
// src/components/PlaylistDetail.tsx

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PlaylistDetailProps {
  playlistId: number;
}

export const PlaylistDetail: React.FC<PlaylistDetailProps> = ({ playlistId }) => {
  const { data, isLoading } = useGetPlaylistWithTracks(playlistId);
  const reorderTracks = useReorderPlaylistTracks();
  const removeTrack = useRemoveTrackFromPlaylist();
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && data) {
      const oldIndex = data.tracks.findIndex(t => t.id === active.id);
      const newIndex = data.tracks.findIndex(t => t.id === over.id);
      
      const newOrder = arrayMove(data.tracks, oldIndex, newIndex);
      reorderTracks.mutate({
        playlistId,
        trackIds: newOrder.map(t => t.id),
      });
    }
  };
  
  return (
    <div className="playlist-detail">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={data?.tracks || []} strategy={verticalListSortingStrategy}>
          {data?.tracks.map(track => (
            <SortableTrackItem key={track.id} track={track} onRemove={handleRemove} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};
```

#### 3.3 TrackDetail (Editor de Metadatos)

```typescript
// src/components/TrackDetail.tsx

interface TrackDetailProps {
  track: Track;
  onClose?: () => void;
}

export const TrackDetail: React.FC<TrackDetailProps> = ({ track, onClose }) => {
  const updateMetadata = useUpdateTrackMetadata();
  const [formData, setFormData] = useState({
    title: track.title,
    artist: track.artist,
    album: track.album || '',
    year: track.year || '',
    genre: track.genre || '',
    bpm: track.bpm || '',
    rating: track.rating,
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateMetadata.mutate({
      id: track.id,
      title: formData.title !== track.title ? formData.title : undefined,
      artist: formData.artist !== track.artist ? formData.artist : undefined,
      album: formData.album || undefined,
      year: formData.year ? parseInt(formData.year) : undefined,
      genre: formData.genre || undefined,
      bpm: formData.bpm ? parseFloat(formData.bpm) : undefined,
      rating: formData.rating !== track.rating ? formData.rating : undefined,
    });
    
    onClose?.();
  };
  
  return (
    <form onSubmit={handleSubmit} className="track-detail">
      {/* Form fields */}
    </form>
  );
};
```

## Estrategia de Testing (TDD)

### Backend Tests

1. **Queries de Playlists** (16 tests)
   - `test_create_playlist`
   - `test_get_all_playlists`
   - `test_get_playlist_by_id`
   - `test_update_playlist`
   - `test_delete_playlist`
   - `test_add_track_to_playlist`
   - `test_remove_track_from_playlist`
   - `test_reorder_playlist_tracks`
   - `test_get_playlist_tracks`
   - Edge cases: playlist no existente, track duplicado, etc.

2. **Edición de Metadatos** (8 tests)
   - `test_update_track_metadata_title`
   - `test_update_track_metadata_rating`
   - `test_update_track_metadata_invalid_rating`
   - `test_update_track_metadata_multiple_fields`
   - `test_update_track_metadata_no_changes`

### Frontend Tests

1. **Hooks de Playlists** (20 tests)
   - Tests para cada hook (get, create, update, delete, add, remove, reorder)
   - Mock de invoke
   - Verificar invalidación de cache

2. **Componente PlaylistManager** (15 tests)
   - Renderizado de lista
   - Creación de playlist
   - Eliminación de playlist
   - Selección de playlist

3. **Componente PlaylistDetail** (18 tests)
   - Drag & drop
   - Reordenamiento
   - Eliminación de tracks

4. **Componente TrackDetail** (12 tests)
   - Edición de campos
   - Validación de rating
   - Persistencia

## Métricas de Éxito

- Cobertura: >= 80% (backend y frontend)
- Tests totales esperados: ~90 nuevos tests
- Performance: CRUD de playlists < 100ms
- UX: Drag & drop fluido (60fps)

## Próximos Pasos

Después de completar Milestone 3:
1. Milestone 4 - Análisis Avanzado (beatgrids, cue points, loops)
2. Milestone 5 - Settings y Polish
3. Milestone 6 - Testing E2E y Release v1.0.0
