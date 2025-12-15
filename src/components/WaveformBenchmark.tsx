/**
 * WaveformBenchmark Component
 * 
 * Muestra generación de waveform usando:
 * HTMLAudioElement + WaveSurfer.js (solución Museeks)
 * 
 * Métricas:
 * - Tiempo de generación
 * - Uso de memoria (aproximado)
 * - Número de samples generados
 */

import { useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { convertFileSrc } from "@tauri-apps/api/core";

interface BenchmarkResult {
  duration: number; // ms
  samples: number;
  memoryEstimate?: number; // bytes
  error?: string;
}

export const WaveformBenchmark: React.FC<{ trackPath: string }> = ({
  trackPath,
}) => {
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState("");

  // Configuración: WaveSurfer por defecto usa ~1000-2000 samples
  const TARGET_SAMPLES = 1000;

  /**
   * Benchmark: WaveSurfer.js con HTMLAudioElement
   */
  const benchmarkWaveSurfer = async (): Promise<BenchmarkResult> => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    return new Promise((resolve) => {
      try {
        // Crear contenedor temporal
        const container = document.createElement("div");
        container.style.display = "none";
        document.body.appendChild(container);

        const wavesurfer = WaveSurfer.create({
          container,
          height: 100,
          waveColor: "#4a9eff",
          progressColor: "#1e3a8a",
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          normalize: true,
          backend: "MediaElement", // HTMLAudioElement (como Museeks)
        });

        wavesurfer.on("ready", () => {
          const endTime = performance.now();
          const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

          // Obtener backend y peaks
          const backend = (wavesurfer as any).backend;
          const peaks = backend?.getPeaks ? backend.getPeaks(TARGET_SAMPLES, 0, backend.getDuration()) : [];

          // Cleanup
          wavesurfer.destroy();
          document.body.removeChild(container);

          resolve({
            duration: endTime - startTime,
            samples: peaks?.length || 0,
            memoryEstimate: endMemory - startMemory,
          });
        });

        wavesurfer.on("error", (error) => {
          const endTime = performance.now();
          wavesurfer.destroy();
          document.body.removeChild(container);

          resolve({
            duration: endTime - startTime,
            samples: 0,
            error: String(error),
          });
        });

        // Cargar archivo usando Tauri asset protocol
        const audioSrc = convertFileSrc(trackPath);
        wavesurfer.load(audioSrc);
      } catch (error) {
        resolve({
          duration: performance.now() - startTime,
          samples: 0,
          error: String(error),
        });
      }
    });
  };

  /**
   * Ejecutar benchmark (3 iteraciones para promedio)
   */
  const runBenchmark = async () => {
    setIsRunning(true);
    setResult(null);
    setProgress("Ejecutando benchmark (3 iteraciones)...");

    const results: BenchmarkResult[] = [];
    
    for (let i = 0; i < 3; i++) {
      const res = await benchmarkWaveSurfer();
      results.push(res);
      setProgress(`Iteración ${i + 1}/3 completada...`);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Cooldown
    }

    // Promedio
    const avgResult: BenchmarkResult = {
      duration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      samples: results[0].samples,
      memoryEstimate: results.reduce((sum, r) => sum + (r.memoryEstimate || 0), 0) / results.length,
      error: results.find(r => r.error)?.error,
    };

    setResult(avgResult);
    setProgress("¡Benchmark completado!");
    setIsRunning(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Generación de Waveform - HTMLAudioElement
        </h3>
        <p className="text-sm text-muted-foreground">
          Archivo: {trackPath.split("/").pop()}
        </p>
      </div>

      <Button onClick={runBenchmark} disabled={isRunning} className="w-full">
        {isRunning ? "Ejecutando..." : "Generar Waveform"}
      </Button>

      {progress && (
        <div className="text-sm text-muted-foreground animate-pulse">
          {progress}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-foreground">Métrica</th>
                  <th className="text-right py-2 px-3 text-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium text-foreground">Tiempo</td>
                  <td className={`text-right py-2 px-3 ${result.error ? "text-destructive" : "text-foreground"}`}>
                    {result.error ? "Error" : `${result.duration.toFixed(2)} ms`}
                  </td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium text-foreground">Samples</td>
                  <td className="text-right py-2 px-3 text-foreground">{result.samples}</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium text-foreground">Memoria</td>
                  <td className="text-right py-2 px-3 text-foreground">
                    {result.memoryEstimate ? `${(result.memoryEstimate / 1024).toFixed(2)} KB` : "N/A"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {result.error && (
            <div className="p-3 bg-destructive/10 rounded-lg text-sm">
              <p className="font-semibold text-destructive">Error:</p>
              <p className="text-xs text-muted-foreground">{result.error}</p>
            </div>
          )}

          {!result.error && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm space-y-2">
              <p className="font-semibold text-foreground">✅ Ventajas de HTMLAudioElement:</p>
              <ul className="text-foreground space-y-1 ml-4">
                <li>🎯 <strong>Seeking instantáneo</strong> - Sin freeze de UI</li>
                <li>⚡ <strong>Decodificación nativa del navegador</strong> - Optimizada por sistema</li>
                <li>🔄 <strong>Sin IPC overhead</strong> - Todo en frontend</li>
                <li>🎵 <strong>Soporta todos los formatos</strong> - Del navegador</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
