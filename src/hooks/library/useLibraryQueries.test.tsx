/**
 * Tests para useLibraryQueries
 * TDD: Tests escritos primero antes de implementación
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { Track, LibraryStats } from "../../types/library";
import {
  useGetAllTracks,
  useSearchTracks,
  useGetTrack,
  useLibraryStats,
} from "./useLibraryQueries";

// Mock Tauri
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockTracks: Track[] = [
  {
    id: "track-1",
    path: "/music/track1.mp3",
    title: "Test Track 1",
    artist: "Test Artist",
    duration: 180,
    bitrate: 320,
    sampleRate: 44100,
    fileSize: 5000000,
    playCount: 0,
    dateAdded: "2024-01-01",
    dateModified: "2024-01-01",
  },
  {
    id: "track-2",
    path: "/music/track2.mp3",
    title: "Test Track 2",
    artist: "Test Artist",
    duration: 200,
    bitrate: 320,
    sampleRate: 44100,
    fileSize: 6000000,
    playCount: 5,
    dateAdded: "2024-01-02",
    dateModified: "2024-01-02",
  },
];

const mockStats: LibraryStats = {
  totalTracks: 100,
  totalArtists: 50,
  totalAlbums: 30,
  totalDurationHours: 10.5,
  totalSizeGb: 5.2,
  ratingDistribution: [10, 15, 20, 25, 20, 10],
};

// Helper para crear QueryClient con configuración de test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Helper para wrapper con QueryClient
const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useGetAllTracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe obtener todas las pistas correctamente", async () => {
    vi.mocked(invoke).mockResolvedValue(mockTracks);

    const { result } = renderHook(() => useGetAllTracks(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTracks);
    expect(invoke).toHaveBeenCalledWith("get_all_tracks");
  });

  it("debe retornar array vacío si hay error", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("Database error"));

    const { result } = renderHook(() => useGetAllTracks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it("debe usar cache con staleTime de 5 minutos", async () => {
    vi.mocked(invoke).mockResolvedValue(mockTracks);

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(() => useGetAllTracks(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Primera llamada
    expect(invoke).toHaveBeenCalledTimes(1);

    // Rerender (debería usar cache)
    rerender();

    // No debe llamar invoke de nuevo por el cache
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});

describe("useSearchTracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe buscar pistas con query", async () => {
    const searchResults = [mockTracks[0]];
    vi.mocked(invoke).mockResolvedValue(searchResults);

    const { result } = renderHook(() => useSearchTracks("Test Track", true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(searchResults);
    expect(invoke).toHaveBeenCalledWith("search_tracks", { query: "Test Track" });
  });

  it("NO debe ejecutar query si enabled=false", async () => {
    const { result } = renderHook(() => useSearchTracks("Test", false), {
      wrapper: createWrapper(),
    });

    // Debe estar en estado inicial
    expect(result.current.isLoading).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("NO debe ejecutar query si query está vacío", async () => {
    const { result } = renderHook(() => useSearchTracks("", true), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe("useGetTrack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe obtener un track por ID", async () => {
    vi.mocked(invoke).mockResolvedValue(mockTracks[0]);

    const { result } = renderHook(() => useGetTrack("track-1", true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTracks[0]);
    expect(invoke).toHaveBeenCalledWith("get_track_by_id", { id: "track-1" });
  });

  it("NO debe ejecutar query si ID es inválido (0)", async () => {
    const { result } = renderHook(() => useGetTrack("0", true), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("NO debe ejecutar query si enabled=false", async () => {
    const { result } = renderHook(() => useGetTrack("track-1", false), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe("useLibraryStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe obtener estadísticas de la biblioteca", async () => {
    vi.mocked(invoke).mockResolvedValue(mockStats);

    const { result } = renderHook(() => useLibraryStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockStats);
    expect(invoke).toHaveBeenCalledWith("get_library_stats");
  });

  it("debe retornar estadísticas vacías si hay error", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("Database error"));

    const { result } = renderHook(() => useLibraryStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

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
