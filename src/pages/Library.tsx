import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ImportDialog } from "../components/ImportDialog";
import { TrackList } from "../components/TrackList";
import { useGetAllTracks, useLibraryStats } from "../hooks/useLibrary";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import type { Track } from "../types/library";

export const Library = () => {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  const { data: tracks = [], isLoading } = useGetAllTracks();
  const { data: stats } = useLibraryStats();
  const { play, isPlaying, currentTrackPath } = useAudioPlayer();

  const handleImportComplete = () => {
    setShowImportDialog(false);
  };

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
  };

  const handleTrackDoubleClick = async (track: Track) => {
    try {
      await play(track.path);
      console.log("Reproduciendo:", track.title);
    } catch (error) {
      console.error("Error al reproducir pista:", error);
    }
  };

  return (
    <div className="h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Biblioteca Musical
            </h1>
            {stats && stats.totalTracks > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {stats.totalTracks} pistas • {stats.totalSizeGb?.toFixed(2) ?? '0.00'} GB
              </p>
            )}
          </div>
          <Button
            variant="primary"
            onClick={() => setShowImportDialog(true)}
          >
            📁 Importar Biblioteca
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        <Card className="h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            {tracks.length === 0 && !isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="text-6xl">🎵</div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    No hay pistas en tu biblioteca
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Importa tu colección de música para comenzar
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowImportDialog(true)}
                  >
                    Importar Biblioteca
                  </Button>
                </div>
              </div>
            ) : (
              <TrackList
                tracks={tracks}
                onTrackClick={handleTrackClick}
                onTrackDoubleClick={handleTrackDoubleClick}
                loading={isLoading}
                height={window.innerHeight - 240}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Selected Track Info */}
      {selectedTrack && (
        <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-3 bg-gray-50 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedTrack.title}
                </span>
                <span className="text-gray-600 dark:text-gray-400 mx-2">•</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {selectedTrack.artist}
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => handleTrackDoubleClick(selectedTrack)}
              disabled={isPlaying && currentTrackPath === selectedTrack.path}
            >
              {isPlaying && currentTrackPath === selectedTrack.path ? "⏸️ Reproduciendo..." : "▶️ Reproducir"}
            </Button>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full mx-4">
            <ImportDialog
              onComplete={handleImportComplete}
              onError={(error) => {
                console.error("Error en importación:", error);
                setShowImportDialog(false);
              }}
            />
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <Button
                variant="secondary"
                onClick={() => setShowImportDialog(false)}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
