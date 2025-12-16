import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import React from "react";
import {
  useImportLibrary,
  useGetAllTracks,
  useSearchTracks,
  useGetTrack,
  useLibraryStats,
} from "./useLibrary";
import type { Track, ImportResult, LibraryStats } from "../types/library";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useImportLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(vi.fn());
  });

  it("debería inicializar con progreso en 0", () => {
    const { result } = renderHook(() => useImportLibrary(), {
      wrapper: createWrapper(),
    });

    expect(result.current.progress.current).toBe(0);
    expect(result.current.progress.total).toBe(0);
    expect(result.current.progress.phase).toBe("scanning");
  });

  it("debería llamar comando import_library", async () => {
    const mockResult: ImportResult = {
      totalFiles: 100,
      imported: 95,
      failed: 5,
      durationSecs: 30.5,
    };
    mockInvoke.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useImportLibrary(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("/test/path");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInvoke).toHaveBeenCalledWith("import_library", {
      path: "/test/path",
    });
    expect(result.current.data).toEqual(mockResult);
  });

  it("debería manejar errores de importación", async () => {
    const mockError = new Error("Ruta no encontrada");
    mockInvoke.mockRejectedValue(mockError);

    const { result } = renderHook(() => useImportLibrary(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("/invalid/path");

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Ruta no encontrada");
  });

  it("debería resetear progreso después de éxito", async () => {
    const mockResult: ImportResult = {
      totalFiles: 10,
      imported: 10,
      failed: 0,
      durationSecs: 5.0,
    };
    mockInvoke.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useImportLibrary(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("/test/path");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.progress.phase).toBe("complete");
  });
});

describe("useGetAllTracks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const createWrapperWithClient = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("debería obtener todas las pistas", async () => {
    const mockTracks: Track[] = [
      {
        id: "1",
        path: "/music/track1.mp3",
        title: "Track 1",
        artist: "Artist 1",
        duration: 180.0,
        bitrate: 320,
        sampleRate: 44100,
        fileSize: 5000000,
        playCount: 0,
        dateAdded: "2024-01-01T00:00:00Z",
        dateModified: "2024-01-01T00:00:00Z",
      },
    ];
    mockInvoke.mockResolvedValue(mockTracks);

    const { result } = renderHook(() => useGetAllTracks(), {
      wrapper: createWrapperWithClient(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInvoke).toHaveBeenCalledWith("get_all_tracks");
    expect(result.current.data).toEqual(mockTracks);
  });

  it("debería manejar error al obtener pistas", async () => {
    mockInvoke.mockRejectedValue(new Error("Database error"));

    const { result } = renderHook(() => useGetAllTracks(), {
      wrapper: createWrapperWithClient(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // El hook captura el error y devuelve array vacío
    expect(result.current.data).toEqual([]);
  });
});

describe("useSearchTracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debería buscar pistas con query", async () => {
    const mockTracks: Track[] = [
      {
        id: "1",
        path: "/music/test.mp3",
        title: "Test Song",
        artist: "Test Artist",
        duration: 200.0,
        bitrate: 256,
        sampleRate: 44100,
        fileSize: 4000000,
        playCount: 0,
        dateAdded: "2024-01-01T00:00:00Z",
        dateModified: "2024-01-01T00:00:00Z",
      },
    ];
    mockInvoke.mockResolvedValue(mockTracks);

    const { result } = renderHook(() => useSearchTracks("Test"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInvoke).toHaveBeenCalledWith("search_tracks", { query: "Test" });
    expect(result.current.data).toEqual(mockTracks);
  });

  it("no debería buscar con query vacío", () => {
    const { result } = renderHook(() => useSearchTracks(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("no debería buscar si enabled es false", () => {
    const { result } = renderHook(() => useSearchTracks("test", false), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe("useGetTrack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debería obtener pista por ID", async () => {
    const mockTrack: Track = {
      id: "42",
      path: "/music/song.flac",
      title: "Amazing Song",
      artist: "Great Artist",
      album: "Best Album",
      duration: 300.0,
      bitrate: 1411,
      sampleRate: 44100,
      fileSize: 30000000,
      playCount: 5,
      dateAdded: "2024-01-01T00:00:00Z",
      dateModified: "2024-01-01T00:00:00Z",
    };
    mockInvoke.mockResolvedValue(mockTrack);

    const { result } = renderHook(() => useGetTrack("42"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInvoke).toHaveBeenCalledWith("get_track_by_id", { id: "42" });
    expect(result.current.data).toEqual(mockTrack);
  });

  it("no debería buscar con ID inválido", () => {
    const { result } = renderHook(() => useGetTrack("0"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("no debería buscar si enabled es false", () => {
    const { result } = renderHook(() => useGetTrack("1", false), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe("useLibraryStats", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const createWrapperWithClient = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("debería obtener estadísticas de biblioteca", async () => {
    const mockStats: LibraryStats = {
      totalTracks: 1000,
      totalArtists: 150,
      totalAlbums: 200,
      totalDurationHours: 72.5,
      totalSizeGb: 8.3,
      ratingDistribution: [100, 200, 300, 250, 100, 50], // 0-5 stars
    };
    mockInvoke.mockResolvedValue(mockStats);

    const { result } = renderHook(() => useLibraryStats(), {
      wrapper: createWrapperWithClient(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInvoke).toHaveBeenCalledWith("get_library_stats");
    expect(result.current.data).toEqual(mockStats);
  });

  it("debería manejar error al obtener stats", async () => {
    mockInvoke.mockRejectedValue(new Error("Stats error"));

    const { result } = renderHook(() => useLibraryStats(), {
      wrapper: createWrapperWithClient(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // El hook captura el error y devuelve estadísticas vacías
    expect(result.current.data).toEqual({
      totalTracks: 0,
      totalArtists: 0,
      totalAlbums: 0,
      totalDurationHours: 0,
      totalSizeGb: 0,
      ratingDistribution: [0, 0, 0, 0, 0, 0],
    });
  });
});
