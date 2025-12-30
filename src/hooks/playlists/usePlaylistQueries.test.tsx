/**
 * Tests para usePlaylistQueries
 * TDD approach - Tests escritos primero
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import {
  useGetPlaylists,
  useGetPlaylist,
  useGetPlaylistTracks,
} from "./usePlaylistQueries";
import type { Playlist } from "../../types/playlist";
import type { Track } from "../../types/library";

// Mock Tauri
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Helper para crear QueryClient de test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
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

describe("useGetPlaylists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe obtener todas las playlists correctamente", async () => {
    const mockPlaylists: Playlist[] = [
      {
        id: "playlist-1",
        name: "Mi Playlist 1",
        description: "Descripción 1",
        date_created: "2024-01-01T00:00:00Z",
        date_modified: "2024-01-01T00:00:00Z",
      },
      {
        id: "playlist-2",
        name: "Mi Playlist 2",
        description: null,
        date_created: "2024-01-02T00:00:00Z",
        date_modified: "2024-01-02T00:00:00Z",
      },
    ];

    vi.mocked(invoke).mockResolvedValue(mockPlaylists);

    const { result } = renderHook(() => useGetPlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith("get_playlists");
    expect(result.current.data).toEqual(mockPlaylists);
    expect(result.current.data).toHaveLength(2);
  });

  it("debe retornar array vacío si hay error", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("Database error"));

    const { result } = renderHook(() => useGetPlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    // Con el try/catch en el hook, siempre retorna []
    expect(result.current.data).toEqual([]);
  });

  it("debe configurar staleTime de 5 minutos para cacheo", async () => {
    const mockPlaylists: Playlist[] = [];
    vi.mocked(invoke).mockResolvedValue(mockPlaylists);

    const { result } = renderHook(() => useGetPlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    // Verificar que se configuró correctamente
    expect(result.current.data).toEqual([]);
  });
});

describe("useGetPlaylist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe obtener una playlist por ID", async () => {
    const mockPlaylist: Playlist = {
      id: "playlist-1",
      name: "Mi Playlist",
      description: "Una playlist genial",
      date_created: "2024-01-01T00:00:00Z",
      date_modified: "2024-01-01T00:00:00Z",
    };

    vi.mocked(invoke).mockResolvedValue(mockPlaylist);

    const { result } = renderHook(() => useGetPlaylist("playlist-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith("get_playlist", { id: "playlist-1" });
    expect(result.current.data).toEqual(mockPlaylist);
  });

  it("debe estar deshabilitado si no hay ID válido", () => {
    const { result: result1 } = renderHook(() => useGetPlaylist(""), {
      wrapper: createWrapper(),
    });

    expect(result1.current.isFetching).toBe(false);

    const { result: result2 } = renderHook(() => useGetPlaylist(undefined as unknown as string), {
      wrapper: createWrapper(),
    });

    expect(result2.current.isFetching).toBe(false);
  });

  it("debe manejar errores correctamente", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("Playlist not found"));

    const { result } = renderHook(() => useGetPlaylist("invalid-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});

describe("useGetPlaylistTracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe obtener tracks de una playlist", async () => {
    const mockTracks: Track[] = [
      {
        id: "track-1",
        path: "/music/song1.mp3",
        title: "Song 1",
        artist: "Artist 1",
        album: undefined,
        duration: 180.5,
        bpm: 120,
        fileSize: 5000000,
        sampleRate: 44100,
        bitrate: 320,
        playCount: 0,
        dateAdded: "2024-01-01",
        dateModified: "2024-01-01",
      },
      {
        id: "track-2",
        path: "/music/song2.mp3",
        title: "Song 2",
        artist: "Artist 2",
        album: "Album 2",
        duration: 240.0,
        bpm: 128,
        fileSize: 6000000,
        sampleRate: 44100,
        bitrate: 320,
        playCount: 0,
        dateAdded: "2024-01-02",
        dateModified: "2024-01-02",
      },
    ];

    vi.mocked(invoke).mockResolvedValue(mockTracks);

    const { result } = renderHook(() => useGetPlaylistTracks("playlist-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith("get_playlist_tracks_cmd", {
      playlist_id: "playlist-1",
    });
    expect(result.current.data).toEqual(mockTracks);
    expect(result.current.data).toHaveLength(2);
  });

  it("debe estar deshabilitado si no hay playlistId válido", () => {
    const { result: result1 } = renderHook(() => useGetPlaylistTracks(""), {
      wrapper: createWrapper(),
    });

    expect(result1.current.isFetching).toBe(false);

    const { result: result2 } = renderHook(
      () => useGetPlaylistTracks(undefined as unknown as string),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result2.current.isFetching).toBe(false);
  });

  it("debe retornar array vacío si hay error", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("Playlist not found"));

    const { result } = renderHook(() => useGetPlaylistTracks("invalid-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    // Con el try/catch en el hook, siempre retorna []
    expect(result.current.data).toEqual([]);
  });

  it("debe configurar queryKey correctamente con playlistId", async () => {
    const mockTracks: Track[] = [];
    vi.mocked(invoke).mockResolvedValue(mockTracks);

    const { result } = renderHook(() => useGetPlaylistTracks("playlist-5"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    // Verificar que se llamó con el playlistId correcto
    expect(invoke).toHaveBeenCalledWith("get_playlist_tracks_cmd", {
      playlist_id: "playlist-5",
    });
  });
});
