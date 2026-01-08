/**
 * Library Hooks - Barrel export (Svelte version)
 * Exporta todos los hooks de biblioteca desde un único punto
 * 
 * AIDEV-NOTE: Migrado de React hooks a Svelte Query
 * - Solo queries por ahora (mutations y batch pendientes)
 */

// Queries
export { useGetAllTracks, useSearchTracks, useGetTrack, useLibraryStats } from './useLibraryQueries';

// TODO: Migrate these when needed
// Mutations
// export {
//   useUpdateTrackRating,
//   useUpdateTrackMetadata,
//   useDeleteTrack,
//   type UpdateTrackMetadataRequest,
//   type DeleteTrackResult,
// } from "./useLibraryMutations";

// Batch operations
// export {
//   useBatchFilenameToTags,
//   extractMetadataFromFilename,
// } from "./useLibraryBatch";

// Import
// export { useImportLibrary } from "./useLibraryImport";
