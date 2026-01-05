/**
 * Hook para agregar múltiples tracks a una playlist
 * AIDEV-NOTE: Usa el comando batch add_tracks_to_playlist para mejor rendimiento
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface AddTracksToPlaylistRequest {
  /** ID de la playlist destino */
  playlistId: string;
  /** IDs de los tracks a agregar */
  trackIds: string[];
}

export interface CreatePlaylistWithTracksRequest {
  /** Nombre de la nueva playlist */
  name: string;
  /** Descripción opcional */
  description?: string | null;
  /** IDs de los tracks a agregar */
  trackIds: string[];
}

/**
 * Hook para agregar múltiples tracks a una playlist existente
 * Retorna el número de tracks agregados exitosamente
 */
export const useAddTracksToPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, trackIds }: AddTracksToPlaylistRequest): Promise<number> => {
      // AIDEV-NOTE: Tauri 2.0 usa camelCase para los parámetros en JavaScript
      return await invoke<number>("add_tracks_to_playlist", {
        playlistId,
        trackIds,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidar cache de tracks de la playlist
      queryClient.invalidateQueries({
        queryKey: ["playlists", variables.playlistId, "tracks"],
      });
      // También invalidar la lista de playlists (por si mostramos track count)
      queryClient.invalidateQueries({
        queryKey: ["playlists"],
      });
    },
  });
};

/**
 * Hook para crear una playlist y agregar tracks en una sola operación
 * Retorna el ID de la playlist creada
 */
export const useCreatePlaylistWithTracks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description, trackIds }: CreatePlaylistWithTracksRequest): Promise<string> => {
      // AIDEV-NOTE: Tauri 2.0 usa camelCase para los parámetros en JavaScript
      return await invoke<string>("create_playlist_with_tracks", {
        name,
        description: description ?? null,
        trackIds,
      });
    },
    onSuccess: () => {
      // Invalidar cache de playlists
      queryClient.invalidateQueries({
        queryKey: ["playlists"],
      });
    },
  });
};
