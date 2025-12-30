/**
 * Hooks de mutations para playlists
 * Separados según Single Responsibility Principle
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type {
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  AddTrackToPlaylistRequest,
  RemoveTrackFromPlaylistRequest,
  ReorderPlaylistTracksRequest,
} from "../../types/playlist";

// Re-exportar tipos para compatibilidad con imports existentes
export type {
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  AddTrackToPlaylistRequest,
  RemoveTrackFromPlaylistRequest,
  ReorderPlaylistTracksRequest,
} from "../../types/playlist";

/**
 * Hook para crear una nueva playlist
 */
export const useCreatePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreatePlaylistRequest) => {
      return await invoke<number>("create_playlist", {
        name: request.name,
        description: request.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
};

/**
 * Hook para actualizar una playlist existente
 */
export const useUpdatePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdatePlaylistRequest) => {
      return await invoke("update_playlist", {
        id: request.id,
        name: request.name,
        description: request.description,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlists", variables.id] });
    },
  });
};

/**
 * Hook para eliminar una playlist
 */
export const useDeletePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await invoke("delete_playlist", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
};

/**
 * Hook para agregar un track a una playlist
 */
export const useAddTrackToPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AddTrackToPlaylistRequest) => {
      return await invoke("add_track_to_playlist", {
        playlist_id: request.playlist_id,
        track_id: request.track_id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["playlists", variables.playlist_id, "tracks"],
      });
    },
  });
};

/**
 * Hook para remover un track de una playlist
 */
export const useRemoveTrackFromPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: RemoveTrackFromPlaylistRequest) => {
      return await invoke("remove_track_from_playlist", {
        playlist_id: request.playlist_id,
        track_id: request.track_id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["playlists", variables.playlist_id, "tracks"],
      });
    },
  });
};

/**
 * Hook para reordenar tracks en una playlist
 */
export const useReorderPlaylistTracks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ReorderPlaylistTracksRequest) => {
      return await invoke("reorder_playlist_tracks", {
        playlist_id: request.playlist_id,
        track_ids: request.track_ids,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["playlists", variables.playlist_id, "tracks"],
      });
    },
  });
};
