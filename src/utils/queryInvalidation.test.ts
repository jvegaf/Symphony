/**
 * Tests para utilidades de invalidación de queries
 * @module utils/queryInvalidation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  invalidateLibrary,
  invalidatePlaylists,
  invalidatePlaylistTracks,
  invalidateTrack,
  invalidateAnalysis,
  createQueryInvalidator,
  QUERY_KEYS,
} from "./queryInvalidation";

describe("queryInvalidation", () => {
  let queryClient: QueryClient;
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  });

  describe("QUERY_KEYS", () => {
    it("debería exportar todas las claves de query", () => {
      expect(QUERY_KEYS.tracks).toBe("tracks");
      expect(QUERY_KEYS.libraryStats).toBe("library-stats");
      expect(QUERY_KEYS.playlists).toBe("playlists");
      expect(QUERY_KEYS.playlistTracks).toBe("playlist-tracks");
      expect(QUERY_KEYS.analysis).toBe("analysis");
    });

    it("debería tener claves inmutables", () => {
      expect(Object.isFrozen(QUERY_KEYS)).toBe(true);
    });
  });

  describe("invalidateLibrary", () => {
    it("debería invalidar tracks y library-stats", async () => {
      await invalidateLibrary(queryClient);

      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tracks"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["library-stats"] });
    });
  });

  describe("invalidatePlaylists", () => {
    it("debería invalidar todas las playlists", async () => {
      await invalidatePlaylists(queryClient);

      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["playlists"] });
    });

    it("debería invalidar playlist específica si se provee ID", async () => {
      await invalidatePlaylists(queryClient, 42);

      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["playlists"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["playlists", 42] });
    });
  });

  describe("invalidatePlaylistTracks", () => {
    it("debería invalidar tracks de una playlist específica", async () => {
      await invalidatePlaylistTracks(queryClient, 123);

      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["playlist-tracks", 123],
      });
    });
  });

  describe("invalidateTrack", () => {
    it("debería invalidar track específico por ID", async () => {
      await invalidateTrack(queryClient, "track-uuid-123");

      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["tracks", "byId", "track-uuid-123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["track", "track-uuid-123"],
      });
    });

    it("debería invalidar también la lista de tracks si includeList es true", async () => {
      await invalidateTrack(queryClient, "track-uuid-123", { includeList: true });

      expect(invalidateSpy).toHaveBeenCalledTimes(3);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tracks"] });
    });
  });

  describe("invalidateAnalysis", () => {
    it("debería invalidar beatgrid de un track", async () => {
      await invalidateAnalysis(queryClient, "track-123", "beatgrid");

      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["analysis", "beatgrids", "track-123"],
      });
    });

    it("debería invalidar cue points de un track", async () => {
      await invalidateAnalysis(queryClient, "track-123", "cuePoints");

      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["analysis", "cuePoints", "track-123"],
      });
    });

    it("debería invalidar loops de un track", async () => {
      await invalidateAnalysis(queryClient, "track-123", "loops");

      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["analysis", "loops", "track-123"],
      });
    });

    it("debería invalidar todo el análisis si no se especifica tipo", async () => {
      await invalidateAnalysis(queryClient, "track-123");

      expect(invalidateSpy).toHaveBeenCalledTimes(3);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["analysis", "beatgrids", "track-123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["analysis", "cuePoints", "track-123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["analysis", "loops", "track-123"],
      });
    });
  });

  describe("createQueryInvalidator", () => {
    it("debería crear un invalidador con el queryClient inyectado", async () => {
      const invalidator = createQueryInvalidator(queryClient);

      expect(invalidator.library).toBeDefined();
      expect(invalidator.playlists).toBeDefined();
      expect(invalidator.playlistTracks).toBeDefined();
      expect(invalidator.track).toBeDefined();
      expect(invalidator.analysis).toBeDefined();
    });

    it("debería permitir invalidar library sin pasar queryClient", async () => {
      const invalidator = createQueryInvalidator(queryClient);
      await invalidator.library();

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tracks"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["library-stats"] });
    });

    it("debería permitir invalidar playlists con ID opcional", async () => {
      const invalidator = createQueryInvalidator(queryClient);
      await invalidator.playlists(99);

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["playlists"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["playlists", 99] });
    });

    it("debería permitir invalidar track con opciones", async () => {
      const invalidator = createQueryInvalidator(queryClient);
      await invalidator.track("my-track", { includeList: true });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tracks"] });
    });
  });
});
