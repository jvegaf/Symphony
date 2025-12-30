import { useState, useEffect } from 'react';
import type { Track } from '../../../../types/library';

export interface UseTrackSelectionProps {
  sortedTracks: Track[];
  selectedTracks: Track[];
  onTracksSelect: (tracks: Track[]) => void;
}

/**
 * Hook para manejar selección de tracks con Ctrl/Shift y navegación con teclado
 * Maneja: Ctrl+Click (toggle), Shift+Click (rango), Ctrl+A, Escape, Arrow keys
 */
export const useTrackSelection = ({
  sortedTracks,
  selectedTracks,
  onTracksSelect,
}: UseTrackSelectionProps) => {
  const [lastClickedIndex, setLastClickedIndex] = useState<number>(-1);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Keyboard shortcuts (Ctrl+A, Escape, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+A o Cmd+A: Select All
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        onTracksSelect(sortedTracks);
        return;
      }

      // Escape: Deselect All (solo si hay selección)
      if (e.key === 'Escape' && selectedTracks.length > 0) {
        e.preventDefault();
        onTracksSelect([]);
        return;
      }

      // Navegación con arrow keys (sin Shift = mover foco, con Shift = seleccionar)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        let newIndex = focusedIndex;
        if (e.key === 'ArrowDown' && focusedIndex < sortedTracks.length - 1) {
          newIndex = focusedIndex + 1;
        } else if (e.key === 'ArrowUp' && focusedIndex > 0) {
          newIndex = focusedIndex - 1;
        }

        setFocusedIndex(newIndex);

        if (e.shiftKey) {
          // Shift+Arrow: Agregar a selección
          const trackToAdd = sortedTracks[newIndex];
          const isAlreadySelected = selectedTracks.some(t => t.id === trackToAdd.id);
          if (!isAlreadySelected) {
            onTracksSelect([...selectedTracks, trackToAdd]);
          }
        } else {
          // Arrow sin Shift: Seleccionar solo el track con foco
          onTracksSelect([sortedTracks[newIndex]]);
        }

        setLastClickedIndex(newIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedTracks, selectedTracks, onTracksSelect, focusedIndex]);

  // Manejar selección con Ctrl (toggle) y Shift (rango)
  const handleTrackClick = (track: Track, index: number, e: React.MouseEvent) => {
    // Prevenir que el double-click también ejecute el single-click
    if (e.detail === 2) return;

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click: toggle individual
      const isSelected = selectedTracks.some(t => t.id === track.id);
      if (isSelected) {
        onTracksSelect(selectedTracks.filter(t => t.id !== track.id));
      } else {
        onTracksSelect([...selectedTracks, track]);
      }
      setLastClickedIndex(index);
    } else if (e.shiftKey && lastClickedIndex !== -1) {
      // Shift+Click: seleccionar rango
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeSelection = sortedTracks.slice(start, end + 1);
      
      // Merge con selección existente (union)
      const newSelection = [...selectedTracks];
      rangeSelection.forEach(t => {
        if (!newSelection.some(s => s.id === t.id)) {
          newSelection.push(t);
        }
      });
      onTracksSelect(newSelection);
    } else {
      // Click normal: seleccionar solo este track
      onTracksSelect([track]);
      setLastClickedIndex(index);
    }

    setFocusedIndex(index);
  };

  return { focusedIndex, handleTrackClick };
};
