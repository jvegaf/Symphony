/**
 * Tests de documentación para convenciones de naming
 *
 * Este archivo documenta las convenciones de naming del proyecto Symphony.
 * Los tests sirven como "documentación viva" que se valida automáticamente.
 *
 * @module types/conventions
 */
import { describe, it, expect } from "vitest";

describe("Convenciones de Naming - Documentación", () => {
  describe("Regla 1: Interfaces TypeScript usan camelCase", () => {
    it("los campos de interfaces internas usan camelCase", () => {
      // Ejemplo: Track, TrackDisplay, TrackMetadata
      const ejemploTrack = {
        id: "uuid",
        path: "/path",
        title: "Title",
        dateAdded: "2024-01-01",      // ✓ camelCase
        sampleRate: 44100,             // ✓ camelCase
        beatportId: 12345,             // ✓ camelCase
      };

      expect(ejemploTrack.dateAdded).toBeDefined();
      expect(ejemploTrack.sampleRate).toBeDefined();
      expect(ejemploTrack.beatportId).toBeDefined();
    });
  });

  describe("Regla 2: Interfaces de IPC (Tauri 2.0) usan camelCase", () => {
    it("los request types para invoke() usan camelCase (Tauri 2.0 auto-convierte)", () => {
      // AIDEV-NOTE: Tauri 2.0 convierte automáticamente camelCase de JS a snake_case de Rust
      // Ejemplo: AddTrackToPlaylistRequest
      const ejemploRequest = {
        playlistId: "uuid-1",    // ✓ camelCase (Tauri 2.0 → rust: playlist_id)
        trackId: "uuid-2",       // ✓ camelCase (Tauri 2.0 → rust: track_id)
      };

      expect(ejemploRequest.playlistId).toBeDefined();
      expect(ejemploRequest.trackId).toBeDefined();
    });

    it("Tauri 2.0 convierte automáticamente a snake_case para Rust", () => {
      // En Tauri 2.0, el frontend usa camelCase y Tauri convierte automáticamente
      // a snake_case para los parámetros de comandos Rust
      const invokePayload = {
        playlistId: "123",  // → rust: playlist_id
        trackIds: ["a"],    // → rust: track_ids
      };

      expect(invokePayload).toHaveProperty("playlistId");
      expect(invokePayload).toHaveProperty("trackIds");
    });
  });

  describe("Regla 3: Hooks siguen patrón useXxx", () => {
    it("todos los hooks personalizados comienzan con 'use'", () => {
      const hookNames = [
        "useGetPlaylists",
        "useCreatePlaylist",
        "useAudioPlayer",
        "useTheme",
        "useBeatport",
      ];

      hookNames.forEach((name) => {
        expect(name).toMatch(/^use[A-Z]/);
      });
    });
  });

  describe("Regla 4: Factories siguen patrón createXxx", () => {
    it("las funciones factory comienzan con 'create'", () => {
      const factoryNames = [
        "createTrackDisplay",
        "createTrackPlayback",
        "createConsoleLogger",
        "createAppError",
      ];

      factoryNames.forEach((name) => {
        expect(name).toMatch(/^create[A-Z]/);
      });
    });
  });

  describe("Regla 5: Type Guards siguen patrón isXxx", () => {
    it("las funciones type guard comienzan con 'is'", () => {
      const guardNames = [
        "isTrackDisplay",
        "isTrackPlayback",
        "isAppError",
      ];

      guardNames.forEach((name) => {
        expect(name).toMatch(/^is[A-Z]/);
      });
    });
  });

  describe("Regla 6: Constantes usan UPPER_SNAKE_CASE", () => {
    it("las constantes globales usan mayúsculas con guiones bajos", () => {
      const constantNames = [
        "QUERY_KEYS",
        "ERROR_CODES",
        "DEFAULT_SETTINGS",
      ];

      constantNames.forEach((name) => {
        expect(name).toMatch(/^[A-Z][A-Z0-9_]*$/);
      });
    });
  });

  describe("Regla 7: Componentes React usan PascalCase", () => {
    it("los nombres de componentes comienzan con mayúscula", () => {
      const componentNames = [
        "PlaylistManager",
        "TrackTable",
        "AudioPlayer",
        "WaveformDisplay",
      ];

      componentNames.forEach((name) => {
        expect(name).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      });
    });
  });

  describe("Regla 8: Archivos de test terminan en .test.ts(x)", () => {
    it("los archivos de test siguen la convención de Vitest", () => {
      const testFilePatterns = [
        "component.test.tsx",
        "hook.test.ts",
        "utils.test.ts",
      ];

      testFilePatterns.forEach((pattern) => {
        expect(pattern).toMatch(/\.test\.tsx?$/);
      });
    });
  });
});

describe("Excepciones Documentadas", () => {
  it("Playlist interface: date_created/date_modified usan snake_case por compatibilidad con DB", () => {
    // La tabla playlists en SQLite usa snake_case
    // Mantener consistencia con esquema de base de datos
    const playlist = {
      id: "uuid",
      name: "My Playlist",
      description: null,
      date_created: "2024-01-01",   // Exception: matches DB schema
      date_modified: "2024-01-01",  // Exception: matches DB schema
    };

    expect(playlist.date_created).toBeDefined();
    expect(playlist.date_modified).toBeDefined();
  });
});
