import { useState } from 'react';
import { useBeatport } from '../useBeatport';
import type { BatchFixResult, SearchCandidatesResult, TrackSelection } from '../../types/beatport';

/**
 * Hook para manejar operaciones de Beatport
 * Agrupa handlers de Fix Tags, selección manual y búsqueda de artwork
 */
export const useBeatportHandlers = () => {
  const [beatportResult, setBeatportResult] = useState<BatchFixResult | null>(null);
  const [beatportCandidates, setBeatportCandidates] = useState<SearchCandidatesResult | null>(null);

  const { findArtwork, searchCandidates, applySelectedTags, progress, isFixing, isSearching, isApplying } = useBeatport();

  /**
   * Fase 1: Busca candidatos en Beatport (hasta 4 por track)
   * Abre modal de selección para que el usuario elija
   */
  const handleFixTags = (trackIds: string[]) => {
    searchCandidates.mutate(trackIds, {
      onSuccess: (result) => {
        setBeatportCandidates(result);
      },
      onError: (error) => {
        alert(`❌ Error al buscar en Beatport: ${error}`);
      }
    });
  };

  /**
   * Fase 2: Aplica tags de las selecciones confirmadas por el usuario
   */
  const handleApplySelectedTags = (selections: TrackSelection[]) => {
    // Cerrar modal de selección
    setBeatportCandidates(null);
    
    // Solo aplicar tags para selecciones con beatport_track_id
    const validSelections = selections.filter(s => s.beatport_track_id !== null);
    
    if (validSelections.length === 0) {
      // Sin selecciones válidas, mostrar resultado vacío
      setBeatportResult({
        total: selections.length,
        success_count: 0,
        failed_count: selections.length,
        results: selections.map(s => ({
          track_id: s.local_track_id,
          success: false,
          error: "No seleccionado"
        }))
      });
      return;
    }
    
    applySelectedTags.mutate(validSelections, {
      onSuccess: (result) => {
        setBeatportResult(result);
      },
      onError: (error) => {
        alert(`❌ Error al aplicar tags: ${error}`);
      }
    });
  };

  /**
   * Buscar solo artwork en Beatport (sin modificar otros tags)
   */
  const handleFindArtwork = (trackIds: string[]) => {
    findArtwork.mutate(trackIds, {
      onSuccess: (result) => {
        setBeatportResult(result);
      },
      onError: (error) => {
        alert(`❌ Error al buscar artwork: ${error}`);
      }
    });
  };

  /**
   * Cerrar modal de candidatos
   */
  const handleCloseCandidates = () => {
    setBeatportCandidates(null);
  };

  /**
   * Cerrar modal de resultados
   */
  const handleCloseResults = () => {
    setBeatportResult(null);
  };

  return {
    // Estado
    beatportResult,
    beatportCandidates,
    beatportProgress: progress,
    isFixing,
    isSearching,
    isApplying,
    // Handlers
    handleFixTags,
    handleApplySelectedTags,
    handleFindArtwork,
    handleCloseCandidates,
    handleCloseResults,
  };
};
