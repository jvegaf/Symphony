/**
 * Tests para useLibraryMutations
 * TDD: Tests escritos primero antes de implementación
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
  useUpdateTrackRating,
  useUpdateTrackMetadata,
  useDeleteTrack,
} from "./useLibraryMutations";

// Mock Tauri
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useUpdateTrackRating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe actualizar rating de un track", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateTrackRating(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ trackId: "track-123", rating: 5 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith("update_track_metadata", {
      request: { id: "track-123", rating: 5 },
    });
  });

  it("debe clampear rating a rango 0-5", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateTrackRating(), {
      wrapper: createWrapper(),
    });

    // Rating > 5 debe clampear a 5
    result.current.mutate({ trackId: "track-123", rating: 10 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith("update_track_metadata", {
      request: { id: "track-123", rating: 5 },
    });
  });

  it("debe clampear rating negativo a 0", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateTrackRating(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ trackId: "track-123", rating: -1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith("update_track_metadata", {
      request: { id: "track-123", rating: 0 },
    });
  });

  it("debe manejar errores correctamente", async () => {
    const error = new Error("Database error");
    vi.mocked(invoke).mockRejectedValue(error);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useUpdateTrackRating(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ trackId: "track-123", rating: 5 });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(consoleError).toHaveBeenCalledWith(
      "Error updating track rating:",
      error
    );

    consoleError.mockRestore();
  });
});

describe("useUpdateTrackMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe actualizar metadatos completos de un track", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateTrackMetadata(), {
      wrapper: createWrapper(),
    });

    const request = {
      id: "track-123",
      title: "New Title",
      artist: "New Artist",
      album: "New Album",
      rating: 5,
    };

    result.current.mutate(request);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith("update_track_metadata", { request });
  });

  it("debe manejar errores correctamente", async () => {
    const error = new Error("Update failed");
    vi.mocked(invoke).mockRejectedValue(error);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useUpdateTrackMetadata(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "track-123", title: "New Title" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(consoleError).toHaveBeenCalledWith(
      "Error updating track metadata:",
      error
    );

    consoleError.mockRestore();
  });
});

describe("useDeleteTrack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe eliminar un track correctamente", async () => {
    const deleteResult = {
      trackId: "track-123",
      fileDeleted: true,
      filePath: "/music/test.mp3",
    };

    vi.mocked(invoke).mockResolvedValue(deleteResult);

    const { result } = renderHook(() => useDeleteTrack(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("track-123");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith("delete_track", { id: "track-123" });
    expect(result.current.data).toEqual(deleteResult);
  });

  it("debe manejar caso donde archivo no se pudo eliminar", async () => {
    const deleteResult = {
      trackId: "track-123",
      fileDeleted: false,
      filePath: "/music/test.mp3",
    };

    vi.mocked(invoke).mockResolvedValue(deleteResult);

    const { result } = renderHook(() => useDeleteTrack(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("track-123");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.fileDeleted).toBe(false);
  });

  it("debe manejar errores correctamente", async () => {
    const error = new Error("Delete failed");
    vi.mocked(invoke).mockRejectedValue(error);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useDeleteTrack(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("track-123");

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(consoleError).toHaveBeenCalledWith("Error deleting track:", error);

    consoleError.mockRestore();
  });
});
