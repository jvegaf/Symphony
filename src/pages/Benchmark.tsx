/**
 * Página de Benchmark para comparación de rendimiento
 * Rust (Symphonia) vs WaveSurfer.js
 */

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { WaveformBenchmark } from "../components/WaveformBenchmark";
import { Card } from "../components/ui/Card";

interface Track {
  id: number;
  path: string;
  title: string;
  artist: string;
  duration: number;
}

export const BenchmarkPage: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      const allTracks = await invoke<Track[]>("get_all_tracks");
      // Tomar solo las primeras 10 para el benchmark
      setTracks(allTracks.slice(0, 10));
      if (allTracks.length > 0) {
        setSelectedTrack(allTracks[0]);
      }
    } catch (error) {
      console.error("Error cargando tracks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando tracks...</p>
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold">No hay tracks disponibles</h2>
          <p className="text-muted-foreground">
            Importa algunos archivos de audio primero para ejecutar el
            benchmark.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Generación de Waveform</h1>
        <p className="text-muted-foreground">
          Usando HTMLAudioElement + WaveSurfer.js (solución Museeks)
        </p>
      </div>

      {/* Selector de track */}
      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">
          Selecciona un track para benchmark:
        </label>
        <select
          className="w-full p-2 rounded-md border border-input bg-background"
          value={selectedTrack?.id || ""}
          onChange={(e) => {
            const track = tracks.find(
              (t) => t.id === parseInt(e.target.value)
            );
            if (track) setSelectedTrack(track);
          }}
        >
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.title} - {track.artist} (
              {Math.floor(track.duration / 60)}:
              {String(Math.floor(track.duration % 60)).padStart(2, "0")})
            </option>
          ))}
        </select>
      </Card>

      {/* Benchmark Component */}
      {selectedTrack && <WaveformBenchmark trackPath={selectedTrack.path} />}

      {/* Información adicional */}
      <Card className="p-6 space-y-4 bg-muted/30">
        <h3 className="text-lg font-semibold">📊 Sobre esta implementación</h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong>⚡ HTMLAudioElement + WaveSurfer.js:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
              <li>Decodificación nativa del navegador (optimizada)</li>
              <li>Procesamiento con Web Audio API</li>
              <li>Seeking instantáneo con audio.currentTime</li>
              <li>Sin freeze de UI (no bloquea el thread principal)</li>
              <li>Soporte nativo para todos los formatos del navegador</li>
            </ul>
          </div>

          <div className="pt-2 border-t">
            <strong>🎯 Ventajas sobre Rust backend:</strong>
            <p className="text-muted-foreground mt-1">
              Elimina el freeze de seeking que teníamos con Rodio, reduce
              complejidad del código (sin IPC), y aprovecha optimizaciones
              nativas del sistema operativo para decodificación de audio.
            </p>
          </div>
        </div>
      </Card>

      {/* Notas técnicas */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Nota:</strong> Los resultados pueden variar según el hardware
          y el formato del archivo.
        </p>
        <p>
          <strong>Formatos probados:</strong> MP3, FLAC, WAV, OGG, AAC, M4A
        </p>
        <p>
          <strong>Arquitectura:</strong> Tauri 2.0 con React 19 + TypeScript
        </p>
      </div>
    </div>
  );
};
