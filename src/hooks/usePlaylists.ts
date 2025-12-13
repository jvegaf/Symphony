import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type {
  Playlist,
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  UpdateTrackMetadataRequest,
  AddTrackToPlaylistRequest,
  RemoveTrackFromPlaylistRequest,
  ReorderPlaylistTracksRequest,
} from "../types/playlist";
import type { Track } from "../types/library";

/**
 * Hook para obtener todas las playlists
 */
export const useGetPlaylists = () => {
  return useQuery<Playlist[]>({
    queryKey: ["playlists"],
    queryFn: async () => {
      const playlists = await invoke<Playlist[]>("get_playlists");
      return playlists;
    },
  });
};

/**
 * Hook para obtener una playlist por ID
 */
export const useGetPlaylist = (id: number) => {
  return useQuery<Playlist>({
    queryKey: ["playlists", id],
    queryFn: async () => {
      const playlist = await invoke<Playlist>("get_playlist", { id });
      return playlist;
    },
    enabled: !!id,
  });
};

/**
 * Hook para obtener tracks de una playlist
 */
export const useGetPlaylistTracks = (playlistId: number) => {
  return useQuery<Track[]>({
    queryKey: ["playlists", playlistId, "tracks"],
    queryFn: async () => {
      const tracks = await invoke<Track[]>("get_playlist_tracks_cmd", {
        playlist_id: playlistId,
      });
      return tracks;
    },
    enabled: !!playlistId,
  });
};

/**
 * Hook para crear nueva playlist
 */
export const useCreatePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePlaylistRequest) => {
      const id = await invoke<number>("create_playlist", {
        name: data.name,
        description: data.description,
      });
      return id;
    },
    onSuccess: () => {
      // Invalidar cache de playlists para recargar la lista
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
};

/**
 * Hook para actualizar playlist existente
 */
export const useUpdatePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePlaylistRequest) => {
      await invoke("update_playlist", {
        id: data.id,
        name: data.name,
        description: data.description,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidar cache de playlists y de la playlist específica
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlists", variables.id] });
    },
  });
};

/**
 * Hook para eliminar playlist
 */
export const useDeletePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("delete_playlist", { id });
    },
    onSuccess: () => {
      // Invalidar cache de playlists
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
};

/**
 * Hook para agregar track a playlist
 */
export const useAddTrackToPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddTrackToPlaylistRequest) => {
      await invoke("add_track_to_playlist", {
        playlist_id: data.playlist_id,
        track_id: data.track_id,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidar tracks de la playlist
      queryClient.invalidateQueries({
        queryKey: ["playlists", variables.playlist_id, "tracks"],
      });
    },
  });
};

/**
 * Hook para remover track de playlist
 */
export const useRemoveTrackFromPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RemoveTrackFromPlaylistRequest) => {
      await invoke("remove_track_from_playlist", {
        playlist_id: data.playlist_id,
        track_id: data.track_id,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidar tracks de la playlist
      queryClient.invalidateQueries({
        queryKey: ["playlists", variables.playlist_id, "tracks"],
      });
    },
  });
};

/**
 * Hook para reordenar tracks en playlist
 */
export const useReorderPlaylistTracks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ReorderPlaylistTracksRequest) => {
      await invoke("reorder_playlist_tracks", {
        playlist_id: data.playlist_id,
        track_ids: data.track_ids,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidar tracks de la playlist para recargar con nuevo orden
      queryClient.invalidateQueries({
        queryKey: ["playlists", variables.playlist_id, "tracks"],
      });
    },
  });
};

/**
 * Hook para actualizar metadatos de track
 */
export const useUpdateTrackMetadata = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTrackMetadataRequest) => {
      await invoke("update_track_metadata", data);
    },
    onSuccess: (_, variables) => {
      // Invalidar tracks para actualizar en todas las listas
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({ queryKey: ["tracks", variables.id] });
      // También invalidar playlists que pueden contener este track
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
};
