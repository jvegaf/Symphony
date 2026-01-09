import { useState } from 'react';
import { open } from "@tauri-apps/plugin-opener";
import { useImportLibrary } from '../library';
import type { ImportProgress, Track } from '../../types/library';

export interface UseLibraryHandlersProps {
  onImportSuccess?: () => void;
}

/**
 * Hook para manejar operaciones de biblioteca
 * Agrupa handlers de importación y selección de tracks
 */
export const useLibraryHandlers = ({ onImportSuccess }: UseLibraryHandlersProps = {}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    phase: "scanning",
  });
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);

  const importMutation = useImportLibrary();

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

        // Simulate progress (en app real, backend emitiría eventos de progreso)
        const progressInterval = setInterval(() => {
          setImportProgress((prev) => ({
            ...prev,
            current: Math.min(prev.current + 10, 90),
            phase: prev.current < 50 ? "scanning" : "importing",
          }));
        }, 500);

        await importMutation.mutateAsync(selected);

        clearInterval(progressInterval);
        setImportProgress({ current: 100, total: 100, phase: "complete" });

        setTimeout(() => {
          setIsImporting(false);
          setImportProgress({ current: 0, total: 0, phase: "scanning" });
          onImportSuccess?.();
        }, 1000);
      }
    } catch (error) {
      console.error("Error al importar:", error);
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0, phase: "scanning" });
    }
  };

  const handleTracksSelect = (tracks: Track[]) => {
    setSelectedTracks(tracks);
  };

  return {
    // Estado
    isImporting,
    importProgress,
    selectedTracks,
    // Handlers
    handleImport,
    handleTracksSelect,
  };
};
