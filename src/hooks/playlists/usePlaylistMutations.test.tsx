/**
 * Tests para usePlaylistMutations
 * TDD approach - Tests escritos primero
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import {
  useCreatePlaylist,
  useUpdatePlaylist,
  useDeletePlaylist,
  useAddTrackToPlaylist,
  useRemoveTrackFromPlaylist,
  useReorderPlaylistTracks,
} from "./usePlaylistMutations";

// Mock Tauri
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock console.log para verificar logs
vi.spyOn(console, "log").mockImplementation(() => {});

// Helper para crear QueryClient de test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
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

describe("useCreatePlaylist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe crear una playlist correctamente", async () => {
    vi.mocked(invoke).mockResolvedValue(1);

    const { result } = renderHook(() => useCreatePlaylist(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        name: "Nueva Playlist",
        description: "Descripción de prueba",
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invoke).toHaveBeenCalledWith("create_playlist", {
      name: "Nueva Playlist",
      description: "Descripción de prueba",
    });
  });

  it("debe invalidar queries después de crear", async () => {
    vi.mocked(invoke).mockResolvedValue(1);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreatePlaylist(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        name: "Test",
        description: null,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["playlists"] });
  });

  it("debe manejar errores al crear", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("Database error"));

    const { result } = renderHook(() => useCreatePlaylist(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          name: "Test",
          description: null,
        });
      } catch (error) {
        // Error esperado
      }
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe("useUpdatePlaylist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe actualizar una playlist correctamente", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdatePlaylist(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: "playlist-1",
        name: "Playlist Actualizada",
        description: "Nueva descripción",
      });
    });

    expect(invoke).toHaveBeenCalledWith("update_playlist", {
      id: "playlist-1",
      name: "Playlist Actualizada",
      description: "Nueva descripción",
    });
  });

  it("debe invalidar queries específicas después de actualizar", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdatePlaylist(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: "playlist-5",
        name: "Updated",
        description: null,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["playlists"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["playlists", "playlist-5"] });
  });
});

describe("useDeletePlaylist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe eliminar una playlist correctamente", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeletePlaylist(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("playlist-10");
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invoke).toHaveBeenCalledWith("delete_playlist", { id: "playlist-10" });
  });

  it("debe invalidar queries después de eliminar", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeletePlaylist(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("playlist-3");
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["playlists"] });
  });
});

describe("useAddTrackToPlaylist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe agregar un track a una playlist", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAddTrackToPlaylist(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        playlist_id: "playlist-1",
        track_id: "track-123",
      });
    });

    expect(invoke).toHaveBeenCalledWith("add_track_to_playlist", {
      playlist_id: "playlist-1",
      track_id: "track-123",
    });
  });

  it("debe invalidar tracks de la playlist después de agregar", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAddTrackToPlaylist(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        playlist_id: "playlist-7",
        track_id: "track-456",
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["playlists", "playlist-7", "tracks"],
    });
  });
});

describe("useRemoveTrackFromPlaylist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe remover un track de una playlist", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemoveTrackFromPlaylist(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        playlist_id: "playlist-2",
        track_id: "track-789",
      });
    });

    expect(invoke).toHaveBeenCalledWith("remove_track_from_playlist", {
      playlist_id: "playlist-2",
      track_id: "track-789",
    });
  });

  it("debe invalidar tracks de la playlist después de remover", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRemoveTrackFromPlaylist(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        playlist_id: "playlist-4",
        track_id: "track-999",
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["playlists", "playlist-4", "tracks"],
    });
  });
});

describe("useReorderPlaylistTracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe reordenar tracks en una playlist", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useReorderPlaylistTracks(), {
      wrapper: createWrapper(),
    });

    const newOrder = ["track-3", "track-1", "track-2"];

    await act(async () => {
      await result.current.mutateAsync({
        playlist_id: "playlist-1",
        track_ids: newOrder,
      });
    });

    expect(invoke).toHaveBeenCalledWith("reorder_playlist_tracks", {
      playlist_id: "playlist-1",
      track_ids: newOrder,
    });
  });

  it("debe invalidar tracks de la playlist después de reordenar", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useReorderPlaylistTracks(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        playlist_id: "playlist-6",
        track_ids: ["a", "b", "c"],
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["playlists", "playlist-6", "tracks"],
    });
  });

  it("debe manejar array vacío de track_ids", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useReorderPlaylistTracks(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        playlist_id: "playlist-1",
        track_ids: [],
      });
    });

    expect(invoke).toHaveBeenCalledWith("reorder_playlist_tracks", {
      playlist_id: "playlist-1",
      track_ids: [],
    });
  });
});
