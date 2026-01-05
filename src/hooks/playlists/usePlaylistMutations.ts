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
  Playlist,
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
 * 
 * AIDEV-NOTE: Usa optimistic update para respuesta UI instantánea.
 * El nombre se actualiza visualmente de inmediato.
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
    onMutate: async (updatedPlaylist: UpdatePlaylistRequest) => {
      // Cancelar queries en vuelo
      await queryClient.cancelQueries({ queryKey: ["playlists"] });

      // Snapshot del estado anterior
      const previousPlaylists = queryClient.getQueryData<Playlist[]>(["playlists"]);

      // Optimistic update: actualizar nombre inmediatamente
      queryClient.setQueryData<Playlist[]>(["playlists"], (old) =>
        old?.map((p) =>
          p.id === updatedPlaylist.id
            ? { ...p, name: updatedPlaylist.name, description: updatedPlaylist.description ?? p.description }
            : p
        ) ?? []
      );

      return { previousPlaylists };
    },
    onError: (_err, _variables, context) => {
      // Rollback al estado anterior si hay error
      if (context?.previousPlaylists) {
        queryClient.setQueryData(["playlists"], context.previousPlaylists);
      }
    },
    onSettled: (_, __, variables) => {
      // Refetch para sincronizar
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlists", variables.id] });
    },
  });
};

/**
 * Hook para eliminar una playlist
 * 
 * AIDEV-NOTE: Usa optimistic update para respuesta UI instantánea.
 * El playlist se elimina visualmente de inmediato, y si hay error
 * se restaura el estado anterior.
 */
export const useDeletePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await invoke("delete_playlist", { id });
    },
    onMutate: async (deletedId: string) => {
      // Cancelar queries en vuelo para evitar sobrescribir optimistic update
      await queryClient.cancelQueries({ queryKey: ["playlists"] });

      // Snapshot del estado anterior (para rollback si hay error)
      const previousPlaylists = queryClient.getQueryData<Playlist[]>(["playlists"]);

      // Optimistic update: eliminar inmediatamente del cache
      queryClient.setQueryData<Playlist[]>(["playlists"], (old) => 
        old?.filter((p) => p.id !== deletedId) ?? []
      );

      return { previousPlaylists };
    },
    onError: (_err, _deletedId, context) => {
      // Rollback al estado anterior si hay error
      if (context?.previousPlaylists) {
        queryClient.setQueryData(["playlists"], context.previousPlaylists);
      }
    },
    onSettled: () => {
      // Refetch para sincronizar con el backend
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
      // AIDEV-NOTE: Tauri 2.0 usa camelCase para parámetros en JavaScript
      return await invoke("add_track_to_playlist", {
        playlistId: request.playlistId,
        trackId: request.trackId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["playlists", variables.playlistId, "tracks"],
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
      // AIDEV-NOTE: Tauri 2.0 usa camelCase para parámetros en JavaScript
      return await invoke("remove_track_from_playlist", {
        playlistId: request.playlistId,
        trackId: request.trackId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["playlists", variables.playlistId, "tracks"],
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
      // AIDEV-NOTE: Tauri 2.0 usa camelCase para parámetros en JavaScript
      return await invoke("reorder_playlist_tracks", {
        playlistId: request.playlistId,
        trackIds: request.trackIds,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["playlists", variables.playlistId, "tracks"],
      });
    },
  });
};
