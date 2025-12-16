import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import {
  useGetPlaylists,
  useGetPlaylist,
  useCreatePlaylist,
  useUpdatePlaylist,
  useDeletePlaylist,
  useAddTrackToPlaylist,
  useRemoveTrackFromPlaylist,
  useReorderPlaylistTracks,
  useUpdateTrackMetadata,
} from "./usePlaylists";
import type { Playlist } from "../types/playlist";

// Mock de Tauri
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

// Datos de prueba
const mockPlaylists: Playlist[] = [
  {
    id: "1",
    name: "My Playlist",
    description: "Test playlist",
    date_created: "2024-01-01",
    date_modified: "2024-01-01",
  },
  {
    id: "2",
    name: "Another Playlist",
    description: null,
    date_created: "2024-01-02",
    date_modified: "2024-01-02",
  },
];

const mockPlaylist: Playlist = mockPlaylists[0];

// Wrapper para React Query
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

describe("usePlaylists hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useGetPlaylists", () => {
    it("debería obtener todas las playlists correctamente", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(mockPlaylists);

      const { result } = renderHook(() => useGetPlaylists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("get_playlists");
      expect(result.current.data).toEqual(mockPlaylists);
    });

    it("debería manejar errores al obtener playlists", async () => {
      vi.mocked(mockInvoke).mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useGetPlaylists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it("debería mostrar loading state inicialmente", () => {
      vi.mocked(mockInvoke).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useGetPlaylists(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("useGetPlaylist", () => {
    it("debería obtener una playlist por ID", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(mockPlaylist);

      const { result } = renderHook(() => useGetPlaylist("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("get_playlist", { id: "1" });
      expect(result.current.data).toEqual(mockPlaylist);
    });

    it("debería manejar playlist no encontrada", async () => {
      vi.mocked(mockInvoke).mockRejectedValue(new Error("Playlist not found"));

      const { result } = renderHook(() => useGetPlaylist("999"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useCreatePlaylist", () => {
    it("debería crear una nueva playlist", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(3);

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        name: "New Playlist",
        description: "Test description",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("create_playlist", {
        name: "New Playlist",
        description: "Test description",
      });
      expect(result.current.data).toBe(3);
    });

    it("debería crear playlist sin descripción", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(4);

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "Minimal Playlist" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("create_playlist", {
        name: "Minimal Playlist",
        description: undefined,
      });
    });

    it("debería manejar errores al crear playlist", async () => {
      vi.mocked(mockInvoke).mockRejectedValue(new Error("Creation failed"));

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "Test Playlist" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdatePlaylist", () => {
    it("debería actualizar una playlist existente", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdatePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: "1",
        name: "Updated Playlist",
        description: "Updated description",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("update_playlist", {
        id: "1",
        name: "Updated Playlist",
        description: "Updated description",
      });
    });

    it("debería actualizar solo el nombre", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdatePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: "1",
        name: "New Name",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("update_playlist", {
        id: "1",
        name: "New Name",
        description: undefined,
      });
    });

    it("debería manejar errores al actualizar", async () => {
      vi.mocked(mockInvoke).mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUpdatePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "1", name: "Failed" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useDeletePlaylist", () => {
    it("debería eliminar una playlist", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("delete_playlist", { id: "1" });
    });

    it("debería manejar errores al eliminar", async () => {
      vi.mocked(mockInvoke).mockRejectedValue(
        new Error("Playlist not found")
      );

      const { result } = renderHook(() => useDeletePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("999");

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useAddTrackToPlaylist", () => {
    it("debería agregar track a playlist", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAddTrackToPlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ playlist_id: "1", track_id: "5" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("add_track_to_playlist", {
        playlist_id: "1",
        track_id: "5",
      });
    });

    it("debería manejar errores al agregar track", async () => {
      vi.mocked(mockInvoke).mockRejectedValue(new Error("Track not found"));

      const { result } = renderHook(() => useAddTrackToPlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ playlist_id: "1", track_id: "999" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useRemoveTrackFromPlaylist", () => {
    it("debería remover track de playlist", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRemoveTrackFromPlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ playlist_id: "1", track_id: "5" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("remove_track_from_playlist", {
        playlist_id: "1",
        track_id: "5",
      });
    });

    it("debería manejar errores al remover track", async () => {
      vi.mocked(mockInvoke).mockRejectedValue(
        new Error("Track not in playlist")
      );

      const { result } = renderHook(() => useRemoveTrackFromPlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ playlist_id: "1", track_id: "999" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useReorderPlaylistTracks", () => {
    it("debería reordenar tracks en playlist", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useReorderPlaylistTracks(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ playlist_id: "1", track_ids: ["3", "1", "2"] });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("reorder_playlist_tracks", {
        playlist_id: "1",
        track_ids: ["3", "1", "2"],
      });
    });

    it("debería manejar lista vacía de tracks", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useReorderPlaylistTracks(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ playlist_id: "1", track_ids: [] });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("reorder_playlist_tracks", {
        playlist_id: "1",
        track_ids: [],
      });
    });

    it("debería manejar errores al reordenar", async () => {
      vi.mocked(mockInvoke).mockRejectedValue(new Error("Reorder failed"));

      const { result } = renderHook(() => useReorderPlaylistTracks(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ playlist_id: "1", track_ids: ["1", "2"] });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateTrackMetadata", () => {
    it("debería actualizar metadatos de track", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateTrackMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: "1",
        title: "New Title",
        artist: "New Artist",
        rating: 5,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("update_track_metadata", {
        id: "1",
        title: "New Title",
        artist: "New Artist",
        rating: 5,
      });
    });

    it("debería actualizar solo rating", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateTrackMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "1", rating: 3 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith("update_track_metadata", {
        id: "1",
        rating: 3,
      });
    });

    it("debería actualizar todos los campos", async () => {
      vi.mocked(mockInvoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateTrackMetadata(), {
        wrapper: createWrapper(),
      });

      const fullUpdate = {
        id: "1",
        title: "Full Title",
        artist: "Full Artist",
        album: "Full Album",
        genre: "Electronic",
        year: 2024,
        bpm: 128.5,
        key: "Am",
        rating: 5,
      };

      result.current.mutate(fullUpdate);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockInvoke).toHaveBeenCalledWith(
        "update_track_metadata",
        fullUpdate
      );
    });

    it("debería manejar errores al actualizar metadatos", async () => {
      vi.mocked(mockInvoke).mockRejectedValue(
        new Error("Invalid rating value")
      );

      const { result } = renderHook(() => useUpdateTrackMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "1", rating: 10 }); // Invalid rating

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
