/**
 * Library Hooks - Barrel export (Svelte version)
 * Exporta todos los hooks de biblioteca desde un único punto
 * 
 * AIDEV-NOTE: Migrado de React hooks a Svelte Query
 * - Queries y mutations ahora disponibles
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

// TODO: Migrate these when needed
// Batch operations
// export {
//   useBatchFilenameToTags,
//   extractMetadataFromFilename,
// } from "./useLibraryBatch";

// Import
// export { useImportLibrary } from "./useLibraryImport";
