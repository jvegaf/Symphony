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

// Batch operations
export {
  useAddTracksToPlaylist,
  useCreatePlaylistWithTracks,
} from "./useAddTracksToPlaylist";

// Types
export type {
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  AddTrackToPlaylistRequest,
  RemoveTrackFromPlaylistRequest,
  ReorderPlaylistTracksRequest,
} from "./usePlaylistMutations";

export type {
  AddTracksToPlaylistRequest,
  CreatePlaylistWithTracksRequest,
} from "./useAddTracksToPlaylist";
