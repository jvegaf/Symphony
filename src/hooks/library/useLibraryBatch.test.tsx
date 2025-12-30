/**
 * Tests para useLibraryBatch
 * TDD: Tests escritos primero antes de implementación
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { Track } from "../../types/library";
import {
  useBatchFilenameToTags,
  extractMetadataFromFilename,
} from "./useLibraryBatch";

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

describe("extractMetadataFromFilename", () => {
  it("debe extraer artista y título con patrón válido", () => {
    const result = extractMetadataFromFilename("/music/Artist Name - Track Title.mp3");
    
    expect(result).toEqual({
      artist: "Artist Name",
      title: "Track Title",
      matched: true,
    });
  });

  it("debe manejar paths de Windows", () => {
    const result = extractMetadataFromFilename("C:\\Music\\The Beatles - Hey Jude.mp3");
    
    expect(result).toEqual({
      artist: "The Beatles",
      title: "Hey Jude",
      matched: true,
    });
  });

  it("debe retornar matched=false si no hay separador", () => {
    const result = extractMetadataFromFilename("/music/track_without_separator.mp3");
    
    expect(result).toEqual({
      artist: "",
      title: "track_without_separator",
      matched: false,
    });
  });

  it("debe retornar matched=false si artista está vacío", () => {
    const result = extractMetadataFromFilename("/music/ - Track Title.mp3");
    
    expect(result).toEqual({
      artist: "",
      title: "Track Title",
      matched: false,
    });
  });

  it("debe retornar matched=false si título está vacío", () => {
    const result = extractMetadataFromFilename("/music/Artist Name - .mp3");
    
    expect(result).toEqual({
      artist: "Artist Name",
      title: "",
      matched: false,
    });
  });

  it("debe trimear espacios extras", () => {
    const result = extractMetadataFromFilename("/music/  Artist Name  -  Track Title  .mp3");
    
    expect(result).toEqual({
      artist: "Artist Name",
      title: "Track Title",
      matched: true,
    });
  });

  it("debe manejar múltiples guiones (solo primer guión es separador)", () => {
    const result = extractMetadataFromFilename("/music/AC-DC - Back In Black.mp3");
    
    expect(result).toEqual({
      artist: "AC",
      title: "DC - Back In Black",
      matched: true,
    });
  });
});

describe("useBatchFilenameToTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe actualizar múltiples tracks en batch", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const mockTracks: Track[] = [
      {
        id: "track-1",
        path: "/music/Artist1 - Title1.mp3",
        title: "Old Title 1",
        artist: "Old Artist 1",
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
        path: "/music/Artist2 - Title2.mp3",
        title: "Old Title 2",
        artist: "Old Artist 2",
        duration: 200,
        bitrate: 320,
        sampleRate: 44100,
        fileSize: 6000000,
        playCount: 0,
        dateAdded: "2024-01-02",
        dateModified: "2024-01-02",
      },
    ];

    const { result } = renderHook(() => useBatchFilenameToTags(), {
      wrapper: createWrapper(),
    });

    const progressCallback = vi.fn();

    result.current.mutate({
      tracks: mockTracks,
      onProgress: progressCallback,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Debe actualizar ambos tracks
    expect(invoke).toHaveBeenCalledTimes(2);
    
    // Verificar que se llamó con los metadatos correctos
    expect(invoke).toHaveBeenCalledWith("update_track_metadata", {
      request: {
        id: "track-1",
        title: "Title1",
        artist: "Artist1",
      },
    });

    expect(invoke).toHaveBeenCalledWith("update_track_metadata", {
      request: {
        id: "track-2",
        title: "Title2",
        artist: "Artist2",
      },
    });

    // Verificar progreso
    expect(progressCallback).toHaveBeenCalledWith(1, 2);
    expect(progressCallback).toHaveBeenCalledWith(2, 2);

    // Verificar resultado
    expect(result.current.data).toEqual({
      success: 2,
      failed: 0,
      skipped: 0,
      errors: [],
    });
  });

  it("debe saltar tracks sin patrón válido", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    const mockTracks: Track[] = [
      {
        id: "track-1",
        path: "/music/Artist - Title.mp3",
        title: "Title",
        artist: "Artist",
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
        path: "/music/no_pattern.mp3", // Sin patrón válido
        title: "no_pattern",
        artist: "Unknown",
        duration: 200,
        bitrate: 320,
        sampleRate: 44100,
        fileSize: 6000000,
        playCount: 0,
        dateAdded: "2024-01-02",
        dateModified: "2024-01-02",
      },
    ];

    const { result } = renderHook(() => useBatchFilenameToTags(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ tracks: mockTracks });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Solo debe actualizar 1 track (el primero)
    expect(invoke).toHaveBeenCalledTimes(1);

    // Verificar resultado
    expect(result.current.data).toEqual({
      success: 1,
      failed: 0,
      skipped: 1,
      errors: [],
    });
  });

  it("debe continuar procesando aunque algunos fallen", async () => {
    // Track 1 exitoso, track 2 falla, track 3 exitoso
    vi.mocked(invoke)
      .mockResolvedValueOnce(undefined) // track-1 success
      .mockRejectedValueOnce(new Error("Database error")) // track-2 fail
      .mockResolvedValueOnce(undefined); // track-3 success

    const mockTracks: Track[] = [
      {
        id: "track-1",
        path: "/music/Artist1 - Title1.mp3",
        title: "Title1",
        artist: "Artist1",
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
        path: "/music/Artist2 - Title2.mp3",
        title: "Title2",
        artist: "Artist2",
        duration: 200,
        bitrate: 320,
        sampleRate: 44100,
        fileSize: 6000000,
        playCount: 0,
        dateAdded: "2024-01-02",
        dateModified: "2024-01-02",
      },
      {
        id: "track-3",
        path: "/music/Artist3 - Title3.mp3",
        title: "Title3",
        artist: "Artist3",
        duration: 220,
        bitrate: 320,
        sampleRate: 44100,
        fileSize: 7000000,
        playCount: 0,
        dateAdded: "2024-01-03",
        dateModified: "2024-01-03",
      },
    ];

    const { result } = renderHook(() => useBatchFilenameToTags(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ tracks: mockTracks });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Debe haber intentado 3 updates
    expect(invoke).toHaveBeenCalledTimes(3);

    // Verificar resultado
    expect(result.current.data).toEqual({
      success: 2,
      failed: 1,
      skipped: 0,
      errors: expect.arrayContaining([expect.stringContaining("Database error")]),
    });
  });

  it("debe lanzar error si un track no tiene ID", async () => {
    const mockTracks: Track[] = [
      {
        path: "/music/Artist - Title.mp3",
        title: "Title",
        artist: "Artist",
        duration: 180,
        bitrate: 320,
        sampleRate: 44100,
        fileSize: 5000000,
        playCount: 0,
        dateAdded: "2024-01-01",
        dateModified: "2024-01-01",
        // No tiene id!
      } as Track,
    ];

    const { result } = renderHook(() => useBatchFilenameToTags(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ tracks: mockTracks });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verificar que falló
    expect(result.current.data?.failed).toBe(1);
    expect(result.current.data?.errors).toHaveLength(1);
    expect(result.current.data?.errors[0]).toContain("Track sin ID");
  });
});
