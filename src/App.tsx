import { useState } from "react";

import { open } from "@tauri-apps/plugin-dialog";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header, PlayerSection, Sidebar, TrackTable } from "./components/layout";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useGetAllTracks, useImportLibrary } from "./hooks/useLibrary";
import { BenchmarkPage } from "./pages/Benchmark";
import { Settings } from "./pages/Settings";
import type { ImportProgress, Track } from "./types/library";
import { logger } from "./utils/logger";
// AIDEV-NOTE: Import waveform debugger to expose window.debugWaveform()
import "./utils/waveform-debug";

function App() {
  const [activeTab, setActiveTab] = useState<"library" | "settings" | "import" | "export" | "tools" | "benchmark">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  // AIDEV-NOTE: playingTrack es la pista que está reproduciéndose (double click)
  // selectedTrack es la pista resaltada en la tabla (single click)
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    phase: "scanning"
  });

  const { data: tracks = [], isLoading } = useGetAllTracks();
  const importMutation = useImportLibrary();
  const { play } = useAudioPlayer();

  const handleImport = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Selecciona carpeta de música",
      });

      if (selected) {
        setIsImporting(true);
        setImportProgress({ current: 0, total: 100, phase: "scanning" });

        // Simulate progress (in real app, backend would emit progress events)
        const progressInterval = setInterval(() => {
          setImportProgress(prev => ({
            ...prev,
            current: Math.min(prev.current + 10, 90),
            phase: prev.current < 50 ? "scanning" : "importing"
          }));
        }, 500);

        await importMutation.mutateAsync(selected);

        clearInterval(progressInterval);
        setImportProgress({ current: 100, total: 100, phase: "complete" });
        
        setTimeout(() => {
          setIsImporting(false);
          setImportProgress({ current: 0, total: 0, phase: "scanning" });
        }, 1000);
      }
    } catch (error) {
      console.error("Error al importar:", error);
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0, phase: "scanning" });
    }
  };

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track);
  };

  const handleTrackDoubleClick = async (track: Track) => {
    const timestamp = new Date().toISOString();
    console.log(`%c[${timestamp}] ========== APP.TSX DOUBLE CLICK ==========`, 'background: #ff0000; color: #fff; font-weight: bold; padding: 4px;');
    console.log(`%c[${timestamp}] Track: ${track.title}`, 'background: #0088ff; color: #fff; padding: 2px;');
    console.log(`%c[${timestamp}] Path: ${track.path}`, 'background: #0088ff; color: #fff; padding: 2px;');
    
    await logger.info(`[${timestamp}] ========== APP.TSX DOUBLE CLICK ==========`);
    await logger.info(`[${timestamp}] Track: ${track.title}`);
    await logger.info(`[${timestamp}] Path: ${track.path}`);
    
    try {
      console.log(`%c[${timestamp}] Calling play() with path: ${track.path}`, 'background: #00ff00; color: #000; padding: 2px;');
      await logger.info(`[${timestamp}] Calling play() with path: ${track.path}`);
      await play(track.path);
      // AIDEV-NOTE: Solo actualizar playingTrack (no selectedTrack) en double click
      // Esto hace que PlayerSection solo muestre info de la pista reproduciéndose
      setPlayingTrack(track);
      console.log(`%c[${timestamp}] ✅ Play successful`, 'background: #00ff00; color: #000; font-weight: bold; padding: 4px;');
      await logger.info(`[${timestamp}] ✅ Play successful`);
    } catch (error) {
      console.error(`%c[${timestamp}] ❌ Play failed: ${JSON.stringify(error)}`, 'background: #ff0000; color: #fff; font-weight: bold; padding: 4px;');
      await logger.error(`[${timestamp}] ❌ Play failed: ${JSON.stringify(error)}`);
      console.error("Error al reproducir:", error);
    }
  };

  const filteredTracks = tracks.filter((track) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      (track.album && track.album.toLowerCase().includes(query))
    );
  });

  return (
    <ErrorBoundary>
      <div className="h-screen bg-background-dark flex flex-col overflow-hidden relative">
        {/* Indicador de versión nueva */}
        <div className="absolute top-2 right-2 z-50 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
          🔴 CÓDIGO NUEVO v2.0
        </div>
        
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onImport={handleImport}
          isImporting={isImporting}
          progress={importProgress}
        />
        
        {activeTab === "benchmark" ? (
          <BenchmarkPage />
        ) : activeTab === "settings" ? (
          <Settings />
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalTracks={tracks.length}
            />
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <PlayerSection track={playingTrack} />
              
              <TrackTable
                tracks={filteredTracks}
                selectedTrack={selectedTrack}
                onTrackSelect={handleTrackSelect}
                onTrackDoubleClick={handleTrackDoubleClick}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
