/**
 * Playlist Hooks - Barrel export (Svelte version)
 * Exporta todos los hooks de playlists desde un único punto
 * 
 * AIDEV-NOTE: Migrado de React hooks a Svelte Query
 * - Queries y mutations ahora disponibles
 */

// Queries
export { useGetPlaylists, useGetPlaylist, useGetPlaylistTracks } from './usePlaylistQueries';

// Mutations
export {
	useCreatePlaylist,
	useUpdatePlaylist,
	useDeletePlaylist,
	useAddTrackToPlaylist,
	useRemoveTrackFromPlaylist,
	useReorderPlaylistTracks,
	type CreatePlaylistRequest,
	type UpdatePlaylistRequest,
	type AddTrackToPlaylistRequest,
	type RemoveTrackFromPlaylistRequest,
	type ReorderPlaylistTracksRequest
} from './usePlaylistMutations';

// Batch operations
export {
	useAddTracksToPlaylist,
	useCreatePlaylistWithTracks,
	type AddTracksToPlaylistRequest,
	type CreatePlaylistWithTracksRequest
} from './useAddTracksToPlaylist';
