/**
 * Barrel export para hooks de playlists
 * Estructura modular siguiendo SRP
 */

// Queries
export {
  useGetPlaylists,
  useGetPlaylist,
  useGetPlaylistTracks,
} from "./usePlaylistQueries";

// Mutations
export {
  useCreatePlaylist,
  useUpdatePlaylist,
  useDeletePlaylist,
  useAddTrackToPlaylist,
  useRemoveTrackFromPlaylist,
  useReorderPlaylistTracks,
} from "./usePlaylistMutations";

// Types
export type {
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  AddTrackToPlaylistRequest,
  RemoveTrackFromPlaylistRequest,
  ReorderPlaylistTracksRequest,
} from "./usePlaylistMutations";
