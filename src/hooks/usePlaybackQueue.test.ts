/**
 * Tests para usePlaybackQueue
 *
 * AIDEV-NOTE: Hook para manejar la cola de reproducción:
 * - Se genera al hacer doble click (desde pista seleccionada hasta el final)
 * - next(): avanza al siguiente en la cola
 * - previous(): retrocede al anterior en la cola
 * - No se regenera al navegar, solo al doble click o cambio de orden
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Track } from "../types/library";
import { usePlaybackQueue } from "./usePlaybackQueue";

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
  {
    id: "uuid-4",
    path: "/music/track4.mp3",
    title: "Track 4",
    artist: "Artist 4",
    duration: 220,
    bitrate: 320,
    sampleRate: 44100,
    fileSize: 5800000,
    playCount: 0,
    dateAdded: "2024-01-01",
    dateModified: "2024-01-01",
  },
  {
    id: "uuid-5",
    path: "/music/track5.mp3",
    title: "Track 5",
    artist: "Artist 5",
    duration: 190,
    bitrate: 320,
    sampleRate: 44100,
    fileSize: 5200000,
    playCount: 0,
    dateAdded: "2024-01-01",
    dateModified: "2024-01-01",
  },
];

describe("usePlaybackQueue", () => {
  describe("Estado inicial", () => {
    it("debería iniciar con cola vacía", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      expect(result.current.queue).toEqual([]);
      expect(result.current.currentIndex).toBe(-1);
      expect(result.current.currentTrackId).toBeNull();
      expect(result.current.hasNext).toBe(false);
      expect(result.current.hasPrevious).toBe(false);
    });
  });

  describe("generateQueue", () => {
    it("debería generar cola desde el índice seleccionado hasta el final", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, 2); // Empezar desde Track 3
      });

      expect(result.current.queue).toEqual(["uuid-3", "uuid-4", "uuid-5"]);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.currentTrackId).toBe("uuid-3");
    });

    it("debería generar cola completa si se selecciona la primera pista", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, 0);
      });

      expect(result.current.queue).toEqual(["uuid-1", "uuid-2", "uuid-3", "uuid-4", "uuid-5"]);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.currentTrackId).toBe("uuid-1");
    });

    it("debería generar cola con una sola pista si se selecciona la última", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, 4); // Última pista
      });

      expect(result.current.queue).toEqual(["uuid-5"]);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.currentTrackId).toBe("uuid-5");
      expect(result.current.hasNext).toBe(false);
      expect(result.current.hasPrevious).toBe(false);
    });

    it("debería regenerar la cola completamente al hacer doble click en otra pista", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      // Primera generación desde pista 1
      act(() => {
        result.current.generateQueue(mockTracks, 1);
      });

      expect(result.current.queue).toEqual(["uuid-2", "uuid-3", "uuid-4", "uuid-5"]);

      // Avanzar algunas pistas (cada una en su propio act)
      act(() => {
        result.current.next();
      });
      act(() => {
        result.current.next();
      });

      expect(result.current.currentIndex).toBe(2);

      // Nueva generación desde pista 0 (simula doble click en otra pista)
      act(() => {
        result.current.generateQueue(mockTracks, 0);
      });

      expect(result.current.queue).toEqual(["uuid-1", "uuid-2", "uuid-3", "uuid-4", "uuid-5"]);
      expect(result.current.currentIndex).toBe(0); // Reset a 0
      expect(result.current.currentTrackId).toBe("uuid-1");
    });

    it("no debería hacer nada si el índice está fuera de rango", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, -1);
      });

      expect(result.current.queue).toEqual([]);

      act(() => {
        result.current.generateQueue(mockTracks, 10);
      });

      expect(result.current.queue).toEqual([]);
    });
  });

  describe("next", () => {
    it("debería avanzar a la siguiente pista y retornar su ID", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, 0);
      });

      let nextId: string | null = null;
      act(() => {
        nextId = result.current.next();
      });

      expect(nextId).toBe("uuid-2");
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.currentTrackId).toBe("uuid-2");
    });

    it("debería retornar null si no hay más pistas en la cola", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, 4); // Solo última pista
      });

      let nextId: string | null = null;
      act(() => {
        nextId = result.current.next();
      });

      expect(nextId).toBeNull();
      expect(result.current.currentIndex).toBe(0); // No cambió
    });

    it("debería poder navegar hasta el final de la cola", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, 2); // [uuid-3, uuid-4, uuid-5]
      });

      // Avanzar al final
      act(() => {
        result.current.next(); // uuid-4
      });
      expect(result.current.currentTrackId).toBe("uuid-4");

      act(() => {
        result.current.next(); // uuid-5
      });
      expect(result.current.currentTrackId).toBe("uuid-5");
      expect(result.current.hasNext).toBe(false);

      // Intentar avanzar más allá del final
      let nextId: string | null = null;
      act(() => {
        nextId = result.current.next();
      });
      expect(nextId).toBeNull();
      expect(result.current.currentTrackId).toBe("uuid-5"); // Sigue en la última
    });
  });

  describe("previous", () => {
    it("debería retroceder a la pista anterior y retornar su ID", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, 0);
      });

      // Avanzar primero (cada uno en su propio act)
      act(() => {
        result.current.next();
      });
      act(() => {
        result.current.next();
      });

      expect(result.current.currentTrackId).toBe("uuid-3");

      // Retroceder
      let prevId: string | null = null;
      act(() => {
        prevId = result.current.previous();
      });

      expect(prevId).toBe("uuid-2");
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.currentTrackId).toBe("uuid-2");
    });

    it("debería retornar null si ya estamos en la primera pista de la cola", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, 2); // Cola empieza en Track 3
      });

      expect(result.current.currentIndex).toBe(0);

      let prevId: string | null = null;
      act(() => {
        prevId = result.current.previous();
      });

      expect(prevId).toBeNull();
      expect(result.current.currentIndex).toBe(0); // No cambió
      expect(result.current.hasPrevious).toBe(false);
    });
  });

  describe("hasNext / hasPrevious", () => {
    it("debería indicar correctamente si hay siguiente/anterior", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, 1); // [uuid-2, uuid-3, uuid-4, uuid-5]
      });

      // En la primera posición de la cola
      expect(result.current.hasNext).toBe(true);
      expect(result.current.hasPrevious).toBe(false);

      // Avanzar al medio
      act(() => {
        result.current.next();
      });

      expect(result.current.hasNext).toBe(true);
      expect(result.current.hasPrevious).toBe(true);

      // Avanzar hasta el final (cada uno en su propio act)
      act(() => {
        result.current.next();
      });
      act(() => {
        result.current.next();
      });

      expect(result.current.hasNext).toBe(false);
      expect(result.current.hasPrevious).toBe(true);
    });
  });

  describe("clear", () => {
    it("debería limpiar la cola completamente", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      act(() => {
        result.current.generateQueue(mockTracks, 0);
      });

      expect(result.current.queue.length).toBe(5);

      act(() => {
        result.current.clear();
      });

      expect(result.current.queue).toEqual([]);
      expect(result.current.currentIndex).toBe(-1);
      expect(result.current.currentTrackId).toBeNull();
    });
  });

  describe("Navegación secuencial (simula A/D)", () => {
    it("debería mantener el orden de la cola al navegar", () => {
      const { result } = renderHook(() => usePlaybackQueue());

      // Generar cola desde Track 2
      act(() => {
        result.current.generateQueue(mockTracks, 1); // [uuid-2, uuid-3, uuid-4, uuid-5]
      });

      const initialQueue = [...result.current.queue];

      // Navegar adelante y atrás (cada operación en su propio act)
      act(() => {
        result.current.next(); // -> uuid-3
      });
      act(() => {
        result.current.next(); // -> uuid-4
      });
      act(() => {
        result.current.previous(); // -> uuid-3
      });
      act(() => {
        result.current.next(); // -> uuid-4
      });

      // La cola NO debe haber cambiado
      expect(result.current.queue).toEqual(initialQueue);
      expect(result.current.currentTrackId).toBe("uuid-4");
    });
  });
});
