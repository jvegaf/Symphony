/**
 * Library Mutations - Hooks de escritura para biblioteca
 * Separado siguiendo Single Responsibility Principle
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

/**
 * Payload para actualizar metadatos de un track
 * AIDEV-NOTE: Debe coincidir con UpdateTrackMetadataRequest en Rust
 */
export interface UpdateTrackMetadataRequest {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  bpm?: number;
  key?: string;
  rating?: number; // 0-5 estrellas
}

/**
 * Resultado de la eliminación de un track
 * AIDEV-NOTE: Debe coincidir con DeleteTrackResult en Rust
 */
export interface DeleteTrackResult {
  trackId: string;
  fileDeleted: boolean;
  filePath: string;
}

/**
 * Hook para actualizar rating de un track
 * 
 * AIDEV-NOTE: Actualiza tanto la DB como el archivo físico MP3 (frame POPM)
 * El backend convierte automáticamente 0-5 estrellas → 0-255 POPM
 * 
 * @example
 * ```tsx
 * const { mutate: updateRating } = useUpdateTrackRating();
 * 
 * const handleRatingChange = (trackId: string, rating: number) => {
 *   updateRating({ trackId, rating });
 * };
 * ```
 */
export const useUpdateTrackRating = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { trackId: string; rating: number }
  >({
    mutationFn: async ({ trackId, rating }) => {
      // Validar rating en frontend (0-5)
      const clampedRating = Math.max(0, Math.min(rating, 5));
      
      const request: UpdateTrackMetadataRequest = {
        id: trackId,
        rating: clampedRating,
      };

      await invoke<void>("update_track_metadata", { request });
    },
    onSuccess: (_, variables) => {
      // Invalidar queries para refrescar UI
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({
        queryKey: ["tracks", "byId", variables.trackId],
      });
      // Invalidar tracks de playlists (key: ["playlists", playlistId, "tracks"])
      // Usamos partial match para invalidar todos los tracks de todas las playlists
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === "playlists" &&
            key[2] === "tracks"
          );
        },
      });
    },
    onError: (error) => {
      console.error("Error updating track rating:", error);
    },
  });
};

/**
 * Hook para actualizar metadatos completos de un track
 * 
 * @example
 * ```tsx
 * const { mutate: updateMetadata } = useUpdateTrackMetadata();
 * 
 * updateMetadata({
 *   id: "uuid",
 *   title: "New Title",
 *   artist: "New Artist",
 *   rating: 5
 * });
 * ```
 */
export const useUpdateTrackMetadata = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    UpdateTrackMetadataRequest
  >({
    mutationFn: async (request) => {
      await invoke<void>("update_track_metadata", { request });
    },
    onSuccess: (_, variables) => {
      // Invalidar queries para refrescar UI
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({
        queryKey: ["tracks", "byId", variables.id],
      });
    },
    onError: (error) => {
      console.error("Error updating track metadata:", error);
    },
  });
};

/**
 * Hook para eliminar un track de la biblioteca y del disco
 * 
 * AIDEV-NOTE: Este hook elimina:
 * 1. El registro de la base de datos
 * 2. El archivo físico del disco
 * 
 * @example
 * ```tsx
 * const { mutate: deleteTrack, isPending } = useDeleteTrack();
 * 
 * const handleDelete = (trackId: string) => {
 *   deleteTrack(trackId, {
 *     onSuccess: (result) => {
 *       if (result.fileDeleted) {
 *         console.log(`Track y archivo eliminados: ${result.filePath}`);
 *       }
 *     }
 *   });
 * };
 * ```
 */
export const useDeleteTrack = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteTrackResult, Error, string>({
    mutationFn: async (trackId: string) => {
      const result = await invoke<DeleteTrackResult>("delete_track", { id: trackId });
      return result;
    },
    onSuccess: (result) => {
      // Invalidar queries para refrescar UI
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({ queryKey: ["library-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tracks", "byId", result.trackId] });
      
      console.log(`Track eliminado: ${result.trackId}, archivo borrado: ${result.fileDeleted}`);
    },
    onError: (error) => {
      console.error("Error deleting track:", error);
    },
  });
};
