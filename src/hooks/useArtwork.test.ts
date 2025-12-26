/**
 * Tests para el hook useArtwork
 *
 * AIDEV-NOTE: Tests unitarios para extracción de artwork on-demand
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useArtwork, clearArtworkCache } from "./useArtwork";

// Mock de Tauri
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

describe("useArtwork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearArtworkCache(); // Limpiar cache antes de cada test
  });

  afterEach(() => {
    clearArtworkCache();
  });

  it("debería retornar null y no cargar sin trackId", async () => {
    const { result } = renderHook(() => useArtwork(null));

    expect(result.current.artwork).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("debería retornar null para undefined trackId", async () => {
    const { result } = renderHook(() => useArtwork(undefined));

    expect(result.current.artwork).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("debería cargar artwork correctamente", async () => {
    const mockArtwork = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    mockInvoke.mockResolvedValueOnce(mockArtwork);

    const { result } = renderHook(() => useArtwork("track-123"));

    // Inicialmente está cargando
    expect(result.current.isLoading).toBe(true);

    // Esperar a que cargue
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.artwork).toBe(mockArtwork);
    expect(result.current.error).toBeNull();
    expect(mockInvoke).toHaveBeenCalledWith("get_track_artwork", { id: "track-123" });
  });

  it("debería manejar track sin artwork (null)", async () => {
    mockInvoke.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useArtwork("track-456"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.artwork).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("debería manejar errores de extracción", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("File not found"));

    const { result } = renderHook(() => useArtwork("track-789"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.artwork).toBeNull();
    expect(result.current.error).toBe("File not found");
  });

  it("debería usar cache para evitar re-extracciones", async () => {
    const mockArtwork = "data:image/png;base64,iVBORw0KGg==";
    mockInvoke.mockResolvedValueOnce(mockArtwork);

    // Primera carga
    const { result: result1 } = renderHook(() => useArtwork("track-cache"));
    await waitFor(() => expect(result1.current.isLoading).toBe(false));
    expect(result1.current.artwork).toBe(mockArtwork);

    // Segunda carga - debe usar cache
    const { result: result2 } = renderHook(() => useArtwork("track-cache"));
    
    // No debería estar cargando porque está en cache
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.artwork).toBe(mockArtwork);

    // invoke solo debería haberse llamado una vez
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("debería refetch artwork manualmente", async () => {
    const mockArtwork1 = "data:image/jpeg;base64,first==";
    const mockArtwork2 = "data:image/jpeg;base64,second==";
    mockInvoke.mockResolvedValueOnce(mockArtwork1);

    const { result } = renderHook(() => useArtwork("track-refetch"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.artwork).toBe(mockArtwork1);

    // Limpiar cache y preparar nuevo mock
    clearArtworkCache("track-refetch");
    mockInvoke.mockResolvedValueOnce(mockArtwork2);

    // Refetch manual
    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.artwork).toBe(mockArtwork2);
    });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("debería cambiar artwork cuando cambia trackId", async () => {
    const artwork1 = "data:image/jpeg;base64,track1==";
    const artwork2 = "data:image/png;base64,track2==";
    mockInvoke.mockResolvedValueOnce(artwork1);

    const { result, rerender } = renderHook(
      ({ id }) => useArtwork(id),
      { initialProps: { id: "track-1" } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.artwork).toBe(artwork1);

    // Cambiar a otro track
    mockInvoke.mockResolvedValueOnce(artwork2);
    rerender({ id: "track-2" });

    await waitFor(() => {
      expect(result.current.artwork).toBe(artwork2);
    });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "get_track_artwork", { id: "track-1" });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "get_track_artwork", { id: "track-2" });
  });
});

describe("clearArtworkCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearArtworkCache();
  });

  it("debería limpiar cache específico de un track", async () => {
    const mockArtwork = "data:image/jpeg;base64,cached==";
    mockInvoke.mockResolvedValue(mockArtwork);

    // Cargar en cache
    const { result } = renderHook(() => useArtwork("track-to-clear"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verificar que está en cache (no llama a invoke de nuevo)
    const { result: result2 } = renderHook(() => useArtwork("track-to-clear"));
    expect(result2.current.artwork).toBe(mockArtwork);
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    // Limpiar cache específico
    clearArtworkCache("track-to-clear");

    // Nueva llamada debería invocar de nuevo
    const { result: result3 } = renderHook(() => useArtwork("track-to-clear"));
    await waitFor(() => expect(result3.current.isLoading).toBe(false));
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("debería limpiar todo el cache sin parámetro", async () => {
    mockInvoke.mockResolvedValue("data:image/jpeg;base64,any==");

    // Cargar múltiples tracks en cache
    const { result: r1 } = renderHook(() => useArtwork("track-a"));
    await waitFor(() => expect(r1.current.isLoading).toBe(false));
    
    const { result: r2 } = renderHook(() => useArtwork("track-b"));
    await waitFor(() => expect(r2.current.isLoading).toBe(false));

    expect(mockInvoke).toHaveBeenCalledTimes(2);

    // Limpiar todo el cache
    clearArtworkCache();

    // Nuevas cargas deberían invocar de nuevo
    const { result: r3 } = renderHook(() => useArtwork("track-a"));
    await waitFor(() => expect(r3.current.isLoading).toBe(false));

    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });
});
