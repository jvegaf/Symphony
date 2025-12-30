import { useMemo } from 'react';
import type { Track } from '../../../../types/library';

export type SortColumn = 'fixed' | 'title' | 'artist' | 'album' | 'duration' | 'bpm' | 'rating' | 'year' | 'dateAdded' | 'bitrate' | 'genre' | 'key';
export type SortDirection = 'asc' | 'desc';

export interface UseTrackSortingProps {
  tracks: Track[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}

/**
 * Hook para ordenar tracks según columna y dirección
 * Usa useMemo para evitar crear array nuevo en cada render
 */
export const useTrackSorting = ({ tracks, sortColumn, sortDirection }: UseTrackSortingProps) => {
  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortColumn) {
        case 'fixed':
          aValue = a.beatportId ? 1 : 0;
          bValue = b.beatportId ? 1 : 0;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'artist':
          aValue = a.artist.toLowerCase();
          bValue = b.artist.toLowerCase();
          break;
        case 'album':
          aValue = (a.album ?? '').toLowerCase();
          bValue = (b.album ?? '').toLowerCase();
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'bpm':
          aValue = a.bpm ?? 0;
          bValue = b.bpm ?? 0;
          break;
        case 'rating':
          aValue = a.rating ?? 0;
          bValue = b.rating ?? 0;
          break;
        case 'year':
          aValue = a.year ?? 0;
          bValue = b.year ?? 0;
          break;
        case 'dateAdded':
          aValue = new Date(a.dateAdded).getTime();
          bValue = new Date(b.dateAdded).getTime();
          break;
        case 'bitrate':
          aValue = a.bitrate ?? 0;
          bValue = b.bitrate ?? 0;
          break;
        case 'genre':
          aValue = (a.genre ?? '').toLowerCase();
          bValue = (b.genre ?? '').toLowerCase();
          break;
        case 'key':
          aValue = (a.key ?? '').toLowerCase();
          bValue = (b.key ?? '').toLowerCase();
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tracks, sortColumn, sortDirection]);

  return sortedTracks;
};
