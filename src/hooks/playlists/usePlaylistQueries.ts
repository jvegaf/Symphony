/**
 * Hooks de queries para playlists
 * Separados según Single Responsibility Principle
 */
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { Playlist } from "../../types/playlist";
import type { Track } from "../../types/library";

/**
 * Hook para obtener todas las playlists
 * @returns Query con array de playlists
 */
export const useGetPlaylists = () => {
  return useQuery<Playlist[]>({
    queryKey: ["playlists"],
    queryFn: async () => {
      try {
        const result = await invoke<Playlist[]>("get_playlists");
        return result;
      } catch (error) {
        console.error("Error al obtener playlists:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

/**
 * Hook para obtener una playlist específica por ID
 * @param id - ID de la playlist (UUID string)
 * @returns Query con la playlist
 */
export const useGetPlaylist = (id: string) => {
  return useQuery<Playlist>({
    queryKey: ["playlists", id],
    queryFn: async () => {
      const result = await invoke<Playlist>("get_playlist", { id });
      return result;
    },
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

/**
 * Hook para obtener los tracks de una playlist
 * @param playlistId - ID de la playlist (UUID string)
 * @returns Query con array de tracks
 */
export const useGetPlaylistTracks = (playlistId: string) => {
  return useQuery<Track[]>({
    queryKey: ["playlists", playlistId, "tracks"],
    queryFn: async () => {
      try {
        const result = await invoke<Track[]>("get_playlist_tracks_cmd", {
          playlist_id: playlistId,
        });
        return result;
      } catch (error) {
        console.error("Error al obtener tracks de playlist:", error);
        return [];
      }
    },
    enabled: Boolean(playlistId),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};
