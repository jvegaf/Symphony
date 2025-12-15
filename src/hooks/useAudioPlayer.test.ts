import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAudioPlayer } from "./useAudioPlayer";
import { invoke } from "@tauri-apps/api/core";

// Mock de @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("useAudioPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock por defecto para get_playback_state
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((command: string) => {
      if (command === "get_playback_state") {
        return Promise.resolve({
          state: "stopped",
          is_playing: false,
        });
      }
      return Promise.resolve(undefined);
    });
  });

  it("debería inicializar con estado stopped", async () => {
    // Mock get_playback_state
    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      state: "stopped",
      is_playing: false,
    });

    const { result } = renderHook(() => useAudioPlayer());

    await waitFor(() => {
      expect(result.current.state).toBe("stopped");
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTrackPath).toBeNull();
    });
  });

  it("debería reproducir una pista correctamente", async () => {
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((command: string) => {
      if (command === "get_playback_state") {
        return Promise.resolve({ state: "stopped", is_playing: false });
      }
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.play("/test/path/song.mp3");
    });

    expect(invoke).toHaveBeenCalledWith("play_track", {
      path: "/test/path/song.mp3",
    });
    expect(result.current.state).toBe("playing");
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentTrackPath).toBe("/test/path/song.mp3");
  });

  it("debería pausar la reproducción", async () => {
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((command: string) => {
      if (command === "get_playback_state") {
        return Promise.resolve({ state: "stopped", is_playing: false });
      }
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useAudioPlayer());

    // Primero reproducir
    await act(async () => {
      await result.current.play("/test/song.mp3");
    });

    // Luego pausar
    await act(async () => {
      await result.current.pause();
    });

    expect(invoke).toHaveBeenCalledWith("pause_playback");
    expect(result.current.state).toBe("paused");
    expect(result.current.isPlaying).toBe(false);
  });

  it("debería reanudar la reproducción", async () => {
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((command: string) => {
      if (command === "get_playback_state") {
        return Promise.resolve({ state: "stopped", is_playing: false });
      }
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useAudioPlayer());

    // Reproducir y pausar
    await act(async () => {
      await result.current.play("/test/song.mp3");
      await result.current.pause();
    });

    // Reanudar
    await act(async () => {
      await result.current.resume();
    });

    expect(invoke).toHaveBeenCalledWith("resume_playback");
    expect(result.current.state).toBe("playing");
    expect(result.current.isPlaying).toBe(true);
  });

  it("debería detener la reproducción y resetear el estado", async () => {
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((command: string) => {
      if (command === "get_playback_state") {
        return Promise.resolve({ state: "stopped", is_playing: false });
      }
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useAudioPlayer());

    // Reproducir primero
    await act(async () => {
      await result.current.play("/test/song.mp3");
    });

    // Detener
    await act(async () => {
      await result.current.stop();
    });

    expect(invoke).toHaveBeenCalledWith("stop_playback");
    expect(result.current.state).toBe("stopped");
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTrackPath).toBeNull();
  });

  // AIDEV-NOTE: Test removido - refreshState() ya no existe porque el estado
  // se actualiza automáticamente via eventos Tauri (audio:state, audio:timestamp)

  it("debería manejar errores al reproducir", async () => {
    const mockError = new Error("Archivo no encontrado");
    (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

    const { result } = renderHook(() => useAudioPlayer());

    await expect(async () => {
      await act(async () => {
        await result.current.play("/nonexistent/file.mp3");
      });
    }).rejects.toThrow("Archivo no encontrado");
  });

  it("debería sincronizar estado al montar", async () => {
    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      state: "paused",
      is_playing: false,
    });

    renderHook(() => useAudioPlayer());

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("get_playback_state");
    });
  });
});
