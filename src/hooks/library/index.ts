/**
 * Library Hooks - Barrel export
 * Exporta todos los hooks de biblioteca desde un único punto
 */

// Queries
export {
  useGetAllTracks,
  useSearchTracks,
  useGetTrack,
  useLibraryStats,
} from "./useLibraryQueries";

// Mutations
export {
  useUpdateTrackRating,
  useUpdateTrackMetadata,
  useDeleteTrack,
  type UpdateTrackMetadataRequest,
  type DeleteTrackResult,
} from "./useLibraryMutations";

// Batch operations
export {
  useBatchFilenameToTags,
  extractMetadataFromFilename,
} from "./useLibraryBatch";

// Import
export { useImportLibrary } from "./useLibraryImport";
