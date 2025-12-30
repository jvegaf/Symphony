import { useEffect, useMemo, useState } from "react";

import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  Header,
  PlayerSection,
  Sidebar,
  TrackTable,
} from "./components/layout";
import type { SortColumn, SortDirection } from "./components/layout/TrackTable";
import { TrackDetail } from "./components/TrackDetail";
import { BeatportResultsModal } from "./components/ui/BeatportResultsModal";
import { BeatportSelectionModal } from "./components/ui/BeatportSelectionModal";
import { useLibraryHandlers, useBeatportHandlers, useTrackActions } from "./hooks/app";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useGetAllTracks } from "./hooks/library";
import { usePlaybackQueue } from "./hooks/usePlaybackQueue";
import { usePlayerShortcuts } from "./hooks/usePlayerShortcuts";
import { Settings } from "./pages/Settings/index";
// AIDEV-NOTE: Import waveform debugger to expose window.debugWaveform()
// import "./utils/waveform-debug";

function App() {
  const [activeTab, setActiveTab] = useState<
    "library" | "settings" | "import" | "export" | "tools" | "benchmark"
  >("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null);

  // AIDEV-NOTE: Estado de ordenamiento levantado para persistir al navegar
  const [sortColumn, setSortColumn] = useState<SortColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: tracks = [], isLoading } = useGetAllTracks();
  const { play, pause, resume, isPlaying, seek, position, duration } = useAudioPlayer();
  
  // AIDEV-NOTE: Hooks de handlers agrupados por funcionalidad
  const {
    isImporting,
    importProgress,
    selectedTracks,
    handleImport,
    handleTracksSelect,
  } = useLibraryHandlers();

  const {
    beatportResult,
    beatportCandidates,
    beatportProgress,
    isFixing,
    isSearching,
    isApplying,
    handleFixTags,
    handleApplySelectedTags,
    handleFindArtwork,
    handleCloseCandidates,
    handleCloseResults,
  } = useBeatportHandlers();

  const playbackQueue = usePlaybackQueue();

  const {
    trackDetailsId,
    batchProgress,
    handleTrackDoubleClick,
    handleTrackDetails,
    handleCloseDetails,
    handleBatchFilenameToTags,
  } = useTrackActions({
    play,
    playbackQueue,
    onPlayingTrackChange: setPlayingTrack,
  });

  // AIDEV-NOTE: filteredTracks se calcula para la búsqueda en la tabla
  const filteredTracks = tracks.filter((track) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.album?.toLowerCase().includes(query)
    );
  });

  // AIDEV-NOTE: Mapa de ID -> Track para búsqueda rápida O(1)
  const tracksById = useMemo(() => {
    const map = new Map<string, Track>();
    for (const track of tracks) {
      if (track.id) {
        map.set(track.id, track);
      }
    }
    return map;
  }, [tracks]);

  // AIDEV-NOTE: Hook para atajos de navegación de pistas (A, D, S, W)
  // - A: Ir al inicio, doble pulsación en < 3seg → pista anterior (de la cola)
  // - D: Siguiente pista (de la cola)
  // - S: Avanzar 10 segundos
  // - W: Retroceder 10 segundos
  const { handleKeyPress, isShortcutKey } = usePlayerShortcuts({
    currentTrack: playingTrack,
    tracksById,
    position,
    duration,
    seek,
    play,
    onTrackChange: setPlayingTrack,
    queueNext: playbackQueue.next,
    queuePrevious: playbackQueue.previous,
    hasNext: playbackQueue.hasNext,
    hasPrevious: playbackQueue.hasPrevious,
  });

  // AIDEV-NOTE: Keyboard shortcuts para el reproductor
  // - Espacio: Pausar/Reanudar
  // - A/D/S/W: Navegación (ver usePlayerShortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Espacio: Pausar/Reanudar
      if (e.code === 'Space' && playingTrack) {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          resume();
        }
        return;
      }

      // Atajos de navegación (A, D, S, W)
      if (playingTrack && isShortcutKey(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playingTrack, isPlaying, pause, resume, handleKeyPress, isShortcutKey]);

  return (
    <ErrorBoundary>
      <div
        className="h-screen bg-background-dark flex flex-col overflow-hidden relative"
        data-testid="app-root"
      >
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onImport={handleImport}
          isImporting={isImporting}
          progress={importProgress}
          selectedTracksCount={selectedTracks.length}
        />

        {/* AIDEV-NOTE: Usamos hidden en lugar de condicional para evitar desmontaje
            Esto preserva el estado del waveform cuando navegamos a Settings */}
        <div className={activeTab === "settings" ? "flex flex-1 overflow-hidden" : "hidden"}>
          <Settings />
        </div>

        <div className={activeTab !== "settings" ? "flex flex-1 overflow-hidden" : "hidden"}>
          <Sidebar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalTracks={tracks.length}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <PlayerSection 
              track={playingTrack} 
              tracks={filteredTracks}
              onTrackChange={setPlayingTrack}
            />

            <TrackTable
              tracks={filteredTracks}
              selectedTracks={selectedTracks}
              playingTrack={playingTrack}
              onTracksSelect={handleTracksSelect}
              onTrackDoubleClick={handleTrackDoubleClick}
              onTrackDetails={handleTrackDetails}
              onBatchFilenameToTags={handleBatchFilenameToTags}
              onFixTags={handleFixTags}
              onFindArtwork={handleFindArtwork}
              isLoading={isLoading}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSortChange={(column, direction) => {
                setSortColumn(column);
                setSortDirection(direction);
              }}
              onSortedTracksChange={(sortedTracks, playingIndex) => {
                // AIDEV-NOTE: Regenerar cola de reproducción cuando cambia el orden
                // Esto mantiene la cola sincronizada con el orden visual de la tabla
                playbackQueue.generateQueue(sortedTracks, playingIndex);
              }}
            />
          </div>
        </div>

        {/* Modal de detalles del track */}
        {trackDetailsId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="max-w-6xl w-full max-h-[95vh] overflow-auto rounded-lg">
              <TrackDetail 
                trackId={trackDetailsId} 
                tracks={filteredTracks}
                onNavigate={setTrackDetailsId}
                onFixTags={handleFixTags}
                onClose={handleCloseDetails}
              />
            </div>
          </div>
        )}

        {/* AIDEV-NOTE: Barra de progreso para operaciones batch (Filename→Tags) */}
        {batchProgress && (
          <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 min-w-[300px] z-50 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="material-icons text-primary animate-spin">sync</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Actualizando pistas...
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {batchProgress.current}/{batchProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AIDEV-NOTE: Notificación de progreso de Beatport (Fix Tags / Selección Manual) */}
        {(isFixing || isSearching || isApplying) && beatportProgress && (
          <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 min-w-[350px] z-50 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="material-icons text-primary animate-spin">sync</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {isSearching ? "Buscando candidatos..." : isApplying ? "Aplicando tags..." : `Completadas ${beatportProgress.current} de ${beatportProgress.total} Tracks`}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
                  {beatportProgress.phase === 'searching' && `Buscando: ${beatportProgress.current_track_title}`}
                  {beatportProgress.phase === 'downloading' && `Descargando artwork...`}
                  {beatportProgress.phase === 'applying_tags' && `Aplicando tags...`}
                  {beatportProgress.phase === 'complete' && `✅ Completado`}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(beatportProgress.current / beatportProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AIDEV-NOTE: Modal de selección manual de candidatos de Beatport */}
        {beatportCandidates && (
          <BeatportSelectionModal
            trackCandidates={beatportCandidates.tracks}
            onConfirm={handleApplySelectedTags}
            onCancel={handleCloseCandidates}
          />
        )}

        {/* AIDEV-NOTE: Modal de resultados de Beatport (canciones no encontradas) */}
        {beatportResult && (
          <BeatportResultsModal
            result={beatportResult}
            onClose={handleCloseResults}
            trackTitles={tracksById && new Map(
              Array.from(tracksById.entries()).map(([id, track]) => [id, `${track.title} - ${track.artist}`])
            )}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
