/**
 * Library Hooks - Barrel export (Svelte version)
 * Exporta todos los hooks de biblioteca desde un único punto
 * 
 * AIDEV-NOTE: Migrado de React hooks a Svelte Query
 * - Queries, mutations e import ahora disponibles
 */

// Queries
export { useGetAllTracks, useSearchTracks, useGetTrack, useLibraryStats } from './useLibraryQueries';

// Mutations
export {
	useUpdateTrackRating,
	useUpdateTrackMetadata,
	useDeleteTrack,
	type UpdateTrackMetadataRequest,
	type DeleteTrackResult
} from './useLibraryMutations';

// Import
export { useImportLibrary } from './useLibraryImport';

// TODO: Migrate batch operations when needed
// export {
//   useBatchFilenameToTags,
//   extractMetadataFromFilename,
// } from "./useLibraryBatch";
