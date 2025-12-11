import { useState } from "react";
import { Card } from "../components/ui/Card";
import { AudioPlayer } from "../components/AudioPlayer";
import { WaveformViewer } from "../components/WaveformViewer";
import { useGetTrack } from "../hooks/useLibrary";
import type { Track } from "../types/library";

interface PlayerPageProps {
  trackId?: string;
}

export const Player = ({ trackId }: PlayerPageProps) => {
  const [currentTrackId, setCurrentTrackId] = useState<string | undefined>(trackId);
  const { data: track, isLoading } = useGetTrack(currentTrackId || "", !!currentTrackId);

  if (!currentTrackId) {
    return (
      <div className="h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎧</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            No hay pista seleccionada
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Selecciona una pista desde tu biblioteca para reproducir
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !track) {
    return (
      <div className="h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin text-4xl">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">
            Cargando pista...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Reproductor
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Track Info */}
        <Card>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {track.title}
            </h2>
            <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
              <span className="font-medium">{track.artist}</span>
              {track.album && (
                <>
                  <span>•</span>
                  <span>{track.album}</span>
                </>
              )}
              {track.year && (
                <>
                  <span>•</span>
                  <span>{track.year}</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-500">
              <span>{track.format.toUpperCase()}</span>
              <span>•</span>
              <span>{track.bitrate} kbps</span>
              <span>•</span>
              <span>{track.sampleRate / 1000} kHz</span>
              {track.bpm && (
                <>
                  <span>•</span>
                  <span>{track.bpm} BPM</span>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Waveform Viewer */}
        <Card title="Forma de Onda">
          <WaveformViewer track={track} />
        </Card>

        {/* Audio Player */}
        <Card title="Controles de Reproducción">
          <AudioPlayer track={track} />
        </Card>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Información Técnica">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Formato:</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">
                  {track.format.toUpperCase()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Bitrate:</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">
                  {track.bitrate} kbps
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Sample Rate:</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">
                  {track.sampleRate / 1000} kHz
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Canales:</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">
                  {track.channels === 2 ? "Stereo" : "Mono"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Tamaño:</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">
                  {(track.fileSize / (1024 * 1024)).toFixed(2)} MB
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Metadatos">
            <dl className="space-y-2 text-sm">
              {track.album && (
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Álbum:</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium">
                    {track.album}
                  </dd>
                </div>
              )}
              {track.year && (
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Año:</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium">
                    {track.year}
                  </dd>
                </div>
              )}
              {track.genre && (
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Género:</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium">
                    {track.genre}
                  </dd>
                </div>
              )}
              {track.trackNumber && (
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Pista:</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium">
                    #{track.trackNumber}
                  </dd>
                </div>
              )}
              {track.bpm && (
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">BPM:</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium">
                    {track.bpm}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Rating:</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">
                  {track.rating > 0 ? "⭐".repeat(track.rating) : "Sin rating"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
};
