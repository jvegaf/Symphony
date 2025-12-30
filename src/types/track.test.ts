/**
 * Tests para tipos Track con Interface Segregation Principle (ISP)
 * 
 * Verifica que las interfaces segregadas funcionan correctamente
 * y que los type guards validan adecuadamente
 */
import { describe, it, expect } from "vitest";
import {
  type TrackIdentity,
  type TrackDisplay,
  type TrackPlayback,
  type TrackMetadata,
  type TrackBeatport,
  type Track,
  isTrackDisplay,
  isTrackPlayback,
  isTrackMetadata,
  createTrackDisplay,
  createTrackPlayback,
} from "./track";

describe("Track Interface Segregation", () => {
  // Datos de prueba
  const fullTrack: Track = {
    id: "test-uuid-123",
    path: "/music/test.mp3",
    title: "Test Song",
    artist: "Test Artist",
    album: "Test Album",
    genre: "Electronic",
    year: 2024,
    duration: 180,
    bitrate: 320,
    sampleRate: 44100,
    fileSize: 5242880,
    bpm: 128,
    key: "Am",
    rating: 4,
    playCount: 10,
    dateAdded: "2024-01-01T00:00:00Z",
    dateModified: "2024-01-15T00:00:00Z",
    label: "Test Label",
    isrc: "TEST12345678",
    beatportId: 12345,
  };

  describe("TrackIdentity", () => {
    it("debería requerir solo id y path", () => {
      const identity: TrackIdentity = {
        id: "test-123",
        path: "/music/track.mp3",
      };
      expect(identity.id).toBe("test-123");
      expect(identity.path).toBe("/music/track.mp3");
    });
  });

  describe("TrackDisplay", () => {
    it("debería contener campos para visualización en tabla", () => {
      const display: TrackDisplay = {
        id: "test-123",
        path: "/music/track.mp3",
        title: "Song Title",
        artist: "Artist Name",
        album: "Album Name",
        duration: 200,
        bpm: 125,
        key: "Cm",
        rating: 5,
        genre: "House",
        year: 2023,
        dateAdded: "2024-01-01",
        bitrate: 320,
        beatportId: 999,
      };
      expect(display.title).toBe("Song Title");
      expect(display.duration).toBe(200);
    });

    it("debería permitir campos opcionales como undefined", () => {
      const display: TrackDisplay = {
        id: "test-123",
        path: "/music/track.mp3",
        title: "Song",
        artist: "Artist",
        duration: 100,
        bitrate: 256,
        dateAdded: "2024-01-01",
      };
      expect(display.bpm).toBeUndefined();
      expect(display.key).toBeUndefined();
    });
  });

  describe("TrackPlayback", () => {
    it("debería contener campos necesarios para reproducción", () => {
      const playback: TrackPlayback = {
        id: "test-123",
        path: "/music/track.mp3",
        title: "Song",
        artist: "Artist",
        duration: 180,
      };
      expect(playback.path).toBe("/music/track.mp3");
      expect(playback.duration).toBe(180);
    });
  });

  describe("TrackMetadata", () => {
    it("debería contener todos los campos editables", () => {
      const metadata: TrackMetadata = {
        id: "test-123",
        path: "/music/track.mp3",
        title: "Song",
        artist: "Artist",
        album: "Album",
        genre: "Rock",
        year: 2020,
        duration: 240,
        bitrate: 320,
        sampleRate: 48000,
        fileSize: 8000000,
        bpm: 140,
        key: "G",
        rating: 3,
        playCount: 5,
        dateAdded: "2024-01-01",
        dateModified: "2024-02-01",
        label: "Label",
        isrc: "ISRC123",
      };
      expect(metadata.sampleRate).toBe(48000);
      expect(metadata.fileSize).toBe(8000000);
    });
  });

  describe("TrackBeatport", () => {
    it("debería contener campos para integración con Beatport", () => {
      const beatport: TrackBeatport = {
        id: "test-123",
        path: "/music/track.mp3",
        title: "Track",
        artist: "DJ",
        duration: 300,
        bpm: 130,
        key: "Dm",
        label: "Records",
        isrc: "ISRC999",
        beatportId: 54321,
      };
      expect(beatport.beatportId).toBe(54321);
      expect(beatport.label).toBe("Records");
    });
  });

  describe("Type Guards", () => {
    describe("isTrackDisplay", () => {
      it("debería retornar true para objeto con campos requeridos", () => {
        const obj = {
          id: "1",
          path: "/a.mp3",
          title: "T",
          artist: "A",
          duration: 100,
          bitrate: 320,
          dateAdded: "2024-01-01",
        };
        expect(isTrackDisplay(obj)).toBe(true);
      });

      it("debería retornar false si falta campo requerido", () => {
        const obj = {
          id: "1",
          title: "T",
          artist: "A",
          // falta path, duration, bitrate, dateAdded
        };
        expect(isTrackDisplay(obj)).toBe(false);
      });

      it("debería retornar false para null o undefined", () => {
        expect(isTrackDisplay(null)).toBe(false);
        expect(isTrackDisplay(undefined)).toBe(false);
      });
    });

    describe("isTrackPlayback", () => {
      it("debería retornar true para objeto válido", () => {
        const obj = {
          id: "1",
          path: "/music/song.mp3",
          title: "Song",
          artist: "Artist",
          duration: 200,
        };
        expect(isTrackPlayback(obj)).toBe(true);
      });

      it("debería retornar false si falta path", () => {
        const obj = {
          id: "1",
          title: "Song",
          artist: "Artist",
          duration: 200,
        };
        expect(isTrackPlayback(obj)).toBe(false);
      });
    });

    describe("isTrackMetadata", () => {
      it("debería retornar true para Track completo", () => {
        expect(isTrackMetadata(fullTrack)).toBe(true);
      });

      it("debería retornar false si falta sampleRate", () => {
        const obj = { ...fullTrack };
        delete (obj as Record<string, unknown>).sampleRate;
        expect(isTrackMetadata(obj)).toBe(false);
      });
    });
  });

  describe("Factory Functions", () => {
    describe("createTrackDisplay", () => {
      it("debería crear TrackDisplay desde Track completo", () => {
        const display = createTrackDisplay(fullTrack);
        expect(display.title).toBe("Test Song");
        expect(display.artist).toBe("Test Artist");
        expect(display.bpm).toBe(128);
        expect(display.key).toBe("Am");
        // No debe incluir campos de metadata completa
        expect((display as unknown as Record<string, unknown>).sampleRate).toBeUndefined();
        expect((display as unknown as Record<string, unknown>).fileSize).toBeUndefined();
      });
    });

    describe("createTrackPlayback", () => {
      it("debería crear TrackPlayback desde Track", () => {
        const playback = createTrackPlayback(fullTrack);
        expect(playback.path).toBe("/music/test.mp3");
        expect(playback.title).toBe("Test Song");
        expect(playback.duration).toBe(180);
        // No debe incluir campos innecesarios
        expect((playback as unknown as Record<string, unknown>).bpm).toBeUndefined();
        expect((playback as unknown as Record<string, unknown>).rating).toBeUndefined();
      });
    });
  });

  describe("Track (interface completa)", () => {
    it("debería extender todas las interfaces segregadas", () => {
      // Verificar que Track tiene todos los campos
      const track: Track = fullTrack;
      
      // De TrackIdentity
      expect(track.id).toBeDefined();
      expect(track.path).toBeDefined();
      
      // De TrackDisplay
      expect(track.title).toBeDefined();
      expect(track.artist).toBeDefined();
      expect(track.duration).toBeDefined();
      
      // De TrackMetadata
      expect(track.sampleRate).toBeDefined();
      expect(track.fileSize).toBeDefined();
      
      // De TrackBeatport
      expect(track.beatportId).toBeDefined();
    });
  });
});
