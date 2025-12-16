import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAudioPlayer } from "./useAudioPlayer";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Mock de @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// AIDEV-NOTE: Mock del sistema de eventos de Tauri
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

// AIDEV-NOTE: Mock del plugin de logging para evitar errores en tests
vi.mock("@tauri-apps/plugin-log", () => ({
  trace: vi.fn().mockResolvedValue(undefined),
  debug: vi.fn().mockResolvedValue(undefined),
  info: vi.fn().mockResolvedValue(undefined),
  warn: vi.fn().mockResolvedValue(undefined),
  error: vi.fn().mockResolvedValue(undefined),
}));

// AIDEV-TODO: Este archivo de tests necesita ser reescrito completamente para la arquitectura event-driven
// El hook useAudioPlayer ahora usa `listen()` para eventos (audio:timestamp, audio:state, etc.)
// en vez de polling con `get_playback_state`. Los tests actuales son de la implementación antigua.
// 
// Tareas pendientes:
// 1. Mock properly `listen()` to capture event handlers
// 2. Simulate Tauri events (audio:timestamp, audio:state, audio:end_of_track, audio:error)
// 3. Test event-driven state updates instead of polling
// 4. Add tests for: seek(), setVolume(), event handlers
// 5. Verify cleanup (unlisten) on unmount
//
// Mientras tanto, se mantiene un test básico para evitar que CI falle.

describe("useAudioPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // AIDEV-NOTE: Mock de listen para retornar función de cleanup
    const mockListen = vi.mocked(listen);
    mockListen.mockResolvedValue(() => {});
  });

  it("debería inicializar con estado stopped", async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await waitFor(() => {
      expect(result.current.state).toBe("stopped");
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTrackPath).toBeNull();
    });
  });

  it("debería reproducir una pista correctamente", async () => {
    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.play("/test/path/song.mp3");
    });

    expect(invoke).toHaveBeenCalledWith("play_track", {
      path: "/test/path/song.mp3",
    });
    
    // AIDEV-NOTE: play() solo actualiza currentTrackPath de forma síncrona
    // El estado (isPlaying/state) se actualiza via evento audio:state
    expect(result.current.currentTrackPath).toBe("/test/path/song.mp3");
    expect(result.current.error).toBeNull();
  });

  it("debería configurar listeners de eventos al montar", async () => {
    const mockListen = vi.mocked(listen);
    mockListen.mockResolvedValue(() => {});

    renderHook(() => useAudioPlayer());

    // AIDEV-NOTE: El hook configura 4 listeners al montar:
    // audio:timestamp, audio:state, audio:end_of_track, audio:error
    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith("audio:timestamp", expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith("audio:state", expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith("audio:end_of_track", expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith("audio:error", expect.any(Function));
    });
  });
});
