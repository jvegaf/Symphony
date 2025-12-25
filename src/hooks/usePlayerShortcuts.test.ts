/**
 * Tests para usePlayerShortcuts
 *
 * AIDEV-NOTE: Hook para atajos de teclado del reproductor:
 * - A: Ir al inicio de la canción, si se pulsa otra vez antes de 3 seg → pista anterior
 * - D: Siguiente pista (usa la cola de reproducción)
 * - S: Avanzar 10 segundos
 * - W: Retroceder 10 segundos
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Track } from "../types/library";
import { usePlayerShortcuts } from "./usePlayerShortcuts";

// Mock de tracks para tests
const mockTracks: Track[] = [
  {
    id: "uuid-1",
    path: "/music/track1.mp3",
    title: "Track 1",
    artist: "Artist 1",
    duration: 180,
    bitrate: 320,
    sampleRate: 44100,
    fileSize: 5000000,
    playCount: 0,
    dateAdded: "2024-01-01",
    dateModified: "2024-01-01",
  },
  {
    id: "uuid-2",
    path: "/music/track2.mp3",
    title: "Track 2",
    artist: "Artist 2",
    duration: 240,
    bitrate: 320,
    sampleRate: 44100,
    fileSize: 6000000,
    playCount: 0,
    dateAdded: "2024-01-01",
    dateModified: "2024-01-01",
  },
  {
    id: "uuid-3",
    path: "/music/track3.mp3",
    title: "Track 3",
    artist: "Artist 3",
    duration: 200,
    bitrate: 320,
    sampleRate: 44100,
    fileSize: 5500000,
    playCount: 0,
    dateAdded: "2024-01-01",
    dateModified: "2024-01-01",
  },
];

// Helper para crear el mapa de tracks por ID
const createTracksById = (tracks: Track[]): Map<string, Track> => {
  const map = new Map<string, Track>();
  for (const track of tracks) {
    if (track.id) {
      map.set(track.id, track);
    }
  }
  return map;
};

describe("usePlayerShortcuts", () => {
  let mockSeek: (position: number) => void;
  let mockPlay: (path: string) => Promise<void>;
  let mockOnTrackChange: (track: Track) => void;
  let mockQueueNext: () => string | null;
  let mockQueuePrevious: () => string | null;
  let tracksById: Map<string, Track>;

  beforeEach(() => {
    mockSeek = vi.fn();
    mockPlay = vi.fn().mockResolvedValue(undefined);
    mockOnTrackChange = vi.fn();
    mockQueueNext = vi.fn().mockReturnValue(null);
    mockQueuePrevious = vi.fn().mockReturnValue(null);
    tracksById = createTracksById(mockTracks);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Tecla W - Retroceder 10 segundos", () => {
    it("debería retroceder 10 segundos cuando se presiona W", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1],
          tracksById,
          position: 60,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      act(() => {
        result.current.handleKeyPress("w");
      });

      expect(mockSeek).toHaveBeenCalledWith(50); // 60 - 10 = 50
    });

    it("debería ir al inicio si la posición es menor a 10 segundos", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1],
          tracksById,
          position: 5,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      act(() => {
        result.current.handleKeyPress("w");
      });

      expect(mockSeek).toHaveBeenCalledWith(0);
    });

    it("no debería hacer nada si no hay track reproduciéndose", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: null,
          tracksById,
          position: 60,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: false,
          hasPrevious: false,
        })
      );

      act(() => {
        result.current.handleKeyPress("w");
      });

      expect(mockSeek).not.toHaveBeenCalled();
    });
  });

  describe("Tecla S - Avanzar 10 segundos", () => {
    it("debería avanzar 10 segundos cuando se presiona S", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1],
          tracksById,
          position: 60,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      act(() => {
        result.current.handleKeyPress("s");
      });

      expect(mockSeek).toHaveBeenCalledWith(70); // 60 + 10 = 70
    });

    it("debería ir al final si quedan menos de 10 segundos", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1],
          tracksById,
          position: 235,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      act(() => {
        result.current.handleKeyPress("s");
      });

      expect(mockSeek).toHaveBeenCalledWith(240); // No puede pasar de duration
    });
  });

  describe("Tecla D - Siguiente pista (usa cola)", () => {
    it("debería reproducir la siguiente pista de la cola cuando se presiona D", async () => {
      // Mock: la cola retorna el ID de la siguiente pista
      mockQueueNext = vi.fn().mockReturnValue("uuid-3");

      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1], // Track 2
          tracksById,
          position: 60,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      await act(async () => {
        await result.current.handleKeyPress("d");
      });

      expect(mockQueueNext).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalledWith("/music/track3.mp3");
      expect(mockOnTrackChange).toHaveBeenCalledWith(mockTracks[2]);
    });

    it("no debería hacer nada si la cola retorna null (no hay más pistas)", async () => {
      mockQueueNext = vi.fn().mockReturnValue(null);

      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[2], // Última pista
          tracksById,
          position: 60,
          duration: 200,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: false,
          hasPrevious: true,
        })
      );

      await act(async () => {
        await result.current.handleKeyPress("d");
      });

      expect(mockQueueNext).toHaveBeenCalled();
      expect(mockPlay).not.toHaveBeenCalled();
      expect(mockOnTrackChange).not.toHaveBeenCalled();
    });
  });

  describe("Tecla A - Ir al inicio / pista anterior", () => {
    it("debería ir al inicio de la canción la primera vez que se presiona A", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1],
          tracksById,
          position: 60,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      act(() => {
        result.current.handleKeyPress("a");
      });

      expect(mockSeek).toHaveBeenCalledWith(0);
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it("debería ir a la pista anterior si se presiona A dos veces en menos de 3 segundos", async () => {
      mockQueuePrevious = vi.fn().mockReturnValue("uuid-1");

      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1], // Track 2
          tracksById,
          position: 60,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      // Primera pulsación - ir al inicio
      act(() => {
        result.current.handleKeyPress("a");
      });

      expect(mockSeek).toHaveBeenCalledWith(0);

      // Segunda pulsación antes de 3 segundos - ir a pista anterior
      act(() => {
        vi.advanceTimersByTime(2000); // 2 segundos
      });

      await act(async () => {
        await result.current.handleKeyPress("a");
      });

      expect(mockQueuePrevious).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalledWith("/music/track1.mp3");
      expect(mockOnTrackChange).toHaveBeenCalledWith(mockTracks[0]);
    });

    it("debería ir al inicio de nuevo si se presiona A después de 3 segundos", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1],
          tracksById,
          position: 60,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      // Primera pulsación
      act(() => {
        result.current.handleKeyPress("a");
      });

      expect(mockSeek).toHaveBeenCalledWith(0);
      vi.mocked(mockSeek).mockClear();

      // Esperar más de 3 segundos
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Segunda pulsación - debería ir al inicio de nuevo
      act(() => {
        result.current.handleKeyPress("a");
      });

      expect(mockSeek).toHaveBeenCalledWith(0);
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it("no debería ir a la pista anterior si hasPrevious es false", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[0], // Primera pista
          tracksById,
          position: 60,
          duration: 180,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: false, // No hay pista anterior
        })
      );

      // Primera pulsación - ir al inicio
      act(() => {
        result.current.handleKeyPress("a");
      });

      expect(mockSeek).toHaveBeenCalledWith(0);
      vi.mocked(mockSeek).mockClear();

      // Segunda pulsación antes de 3 segundos
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        result.current.handleKeyPress("a");
      });

      // Debería ir al inicio de nuevo, no a pista anterior
      expect(mockSeek).toHaveBeenCalledWith(0);
      expect(mockQueuePrevious).not.toHaveBeenCalled();
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe("Teclas en mayúsculas", () => {
    it("debería funcionar igual con teclas mayúsculas (A, D, S, W)", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1],
          tracksById,
          position: 60,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      // W mayúscula - retroceder
      act(() => {
        result.current.handleKeyPress("W");
      });
      expect(mockSeek).toHaveBeenCalledWith(50);

      vi.mocked(mockSeek).mockClear();

      // S mayúscula - avanzar
      act(() => {
        result.current.handleKeyPress("S");
      });
      expect(mockSeek).toHaveBeenCalledWith(70);
    });
  });

  describe("Teclas no válidas", () => {
    it("no debería hacer nada con teclas no válidas", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1],
          tracksById,
          position: 60,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      act(() => {
        result.current.handleKeyPress("x");
        result.current.handleKeyPress("1");
        result.current.handleKeyPress("Enter");
      });

      expect(mockSeek).not.toHaveBeenCalled();
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe("isShortcutKey", () => {
    it("debería identificar correctamente las teclas de atajos", () => {
      const { result } = renderHook(() =>
        usePlayerShortcuts({
          currentTrack: mockTracks[1],
          tracksById,
          position: 60,
          duration: 240,
          seek: mockSeek,
          play: mockPlay,
          onTrackChange: mockOnTrackChange,
          queueNext: mockQueueNext,
          queuePrevious: mockQueuePrevious,
          hasNext: true,
          hasPrevious: true,
        })
      );

      expect(result.current.isShortcutKey("a")).toBe(true);
      expect(result.current.isShortcutKey("A")).toBe(true);
      expect(result.current.isShortcutKey("d")).toBe(true);
      expect(result.current.isShortcutKey("D")).toBe(true);
      expect(result.current.isShortcutKey("s")).toBe(true);
      expect(result.current.isShortcutKey("S")).toBe(true);
      expect(result.current.isShortcutKey("w")).toBe(true);
      expect(result.current.isShortcutKey("W")).toBe(true);
      expect(result.current.isShortcutKey("x")).toBe(false);
      expect(result.current.isShortcutKey("Space")).toBe(false);
    });
  });
});
