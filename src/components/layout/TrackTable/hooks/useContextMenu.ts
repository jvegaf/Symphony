import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { confirm } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import type { Track } from '../../../../types/library';

export interface UseContextMenuProps {
  selectedTracks: Track[];
  onTracksSelect: (tracks: Track[]) => void;
  onTrackDetails?: (track: Track) => void;
  onBatchFilenameToTags?: (tracks: Track[]) => void;
  onFixTags?: (trackIds: string[]) => void;
  onFindArtwork?: (trackIds: string[]) => void;
  /** Callback para crear nuevo playlist con los tracks seleccionados */
  onAddToNewPlaylist?: (trackIds: string[]) => void;
  deleteTrack: (trackId: string) => void;
  /** ID de playlist seleccionada (para mostrar opción de eliminar del playlist) */
  selectedPlaylistId?: string | null;
  /** Callback para eliminar track de playlist */
  onRemoveFromPlaylist?: (playlistId: string, trackId: string) => void;
}

/**
 * Hook para manejar menú contextual de tracks
 * Construye MenuItem array con todas las opciones disponibles
 */
export const useContextMenu = ({
  selectedTracks,
  onTracksSelect,
  onTrackDetails,
  onBatchFilenameToTags,
  onFixTags,
  onFindArtwork,
  onAddToNewPlaylist,
  deleteTrack,
  selectedPlaylistId,
  onRemoveFromPlaylist,
}: UseContextMenuProps) => {
  const handleContextMenu = async (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    
    // Si el track clickeado no está en la selección, seleccionarlo solo
    const isTrackSelected = selectedTracks.some(t => t.id === track.id);
    if (!isTrackSelected) {
      onTracksSelect([track]);
    }

    const menuItems: MenuItem[] = [];

    // Opción "Details" - siempre usar el track clickeado
    if (onTrackDetails) {
      const detailsItem = await MenuItem.new({
        id: 'details',
        text: 'Details',
        action: () => {
          // Usar el track del parámetro, no selectedTracks[0] que puede estar desactualizado
          onTrackDetails(track);
        }
      });
      menuItems.push(detailsItem);
    }

    // Opciones de búsqueda - usar el track clickeado
    const currentTrack = track;
    const hasSearchableData = currentTrack.artist && currentTrack.title;

    if (hasSearchableData) {
      // Separador antes de búsquedas
      const separator1 = await MenuItem.new({
        id: 'separator1',
        text: '─────── Search ───────'
      });
      menuItems.push(separator1);

      const googleSearchItem = await MenuItem.new({
        id: 'search-google',
        text: '🔍 Search on Google',
        action: async () => {
          const query = encodeURIComponent(`${currentTrack.artist} ${currentTrack.title}`);
          await openUrl(`https://www.google.com/search?q=${query}`);
        }
      });
      menuItems.push(googleSearchItem);

      const beatportSearchItem = await MenuItem.new({
        id: 'search-beatport',
        text: '🎵 Search on Beatport',
        action: async () => {
          const query = encodeURIComponent(`${currentTrack.artist} ${currentTrack.title}`);
          await openUrl(`https://www.beatport.com/search?q=${query}`);
        }
      });
      menuItems.push(beatportSearchItem);

      // Separador después de búsquedas
      const separator2 = await MenuItem.new({
        id: 'separator2',
        text: '─────────────────────'
      });
      menuItems.push(separator2);
    }

    // Opción "Filename→Tags" para batch edit
    if (selectedTracks.length > 0 && onBatchFilenameToTags) {
      const batchFilenameItem = await MenuItem.new({
        id: 'batch-filename-tags',
        text: `Filename→Tags (${selectedTracks.length} track${selectedTracks.length > 1 ? 's' : ''})`,
        action: () => {
          onBatchFilenameToTags(isTrackSelected ? selectedTracks : [track]);
        }
      });
      menuItems.push(batchFilenameItem);
    }

    // Opción "Fix Tags" - buscar en Beatport y completar metadatos
    if (selectedTracks.length > 0 && onFixTags) {
      const tracksToFix = isTrackSelected ? selectedTracks : [track];
      const fixTagsItem = await MenuItem.new({
        id: 'fix-tags',
        text: `Fix Tags (${tracksToFix.length} track${tracksToFix.length > 1 ? 's' : ''})`,
        action: () => {
          const trackIds = tracksToFix
            .filter(t => t.id !== undefined)
            .map(t => t.id as string);
          onFixTags(trackIds);
        }
      });
      menuItems.push(fixTagsItem);
    }

    // Opción "Find Artwork" - buscar SOLO artwork en Beatport
    if (selectedTracks.length > 0 && onFindArtwork) {
      const tracksForArtwork = isTrackSelected ? selectedTracks : [track];
      const findArtworkItem = await MenuItem.new({
        id: 'find-artwork',
        text: `Find Artwork (${tracksForArtwork.length} track${tracksForArtwork.length > 1 ? 's' : ''})`,
        action: () => {
          const trackIds = tracksForArtwork
            .filter(t => t.id !== undefined)
            .map(t => t.id as string);
          onFindArtwork(trackIds);
        }
      });
      menuItems.push(findArtworkItem);
    }

    // AIDEV-NOTE: Separador antes de opciones de playlist
    const playlistSeparator = await MenuItem.new({
      id: 'separator-playlist',
      text: '─────── Playlists ───────'
    });
    menuItems.push(playlistSeparator);

    // Opción "Eliminar del playlist" - solo en vista de playlist
    if (selectedPlaylistId && onRemoveFromPlaylist) {
      const tracksToRemove = isTrackSelected ? selectedTracks : [track];
      const removeFromPlaylistItem = await MenuItem.new({
        id: 'remove-from-playlist',
        text: `Eliminar del playlist (${tracksToRemove.length} track${tracksToRemove.length > 1 ? 's' : ''})`,
        action: async () => {
          for (const t of tracksToRemove) {
            if (t.id) {
              onRemoveFromPlaylist(selectedPlaylistId, t.id);
            }
          }
          // Limpiar selección después de eliminar
          onTracksSelect([]);
        }
      });
      menuItems.push(removeFromPlaylistItem);
    }

    // Opción "Agregar a nuevo playlist" - crear nuevo playlist con tracks seleccionados
    if (onAddToNewPlaylist) {
      const tracksForPlaylist = isTrackSelected ? selectedTracks : [track];
      const trackIds = tracksForPlaylist
        .filter(t => t.id !== undefined)
        .map(t => t.id as string);
      
      const addToPlaylistItem = await MenuItem.new({
        id: 'add-to-new-playlist',
        text: `Agregar a nuevo playlist (${tracksForPlaylist.length} track${tracksForPlaylist.length > 1 ? 's' : ''})`,
        action: () => {
          onAddToNewPlaylist(trackIds);
        }
      });
      menuItems.push(addToPlaylistItem);
    }

    // Opción "Eliminar y borrar archivo" - elimina de DB y borra archivo del disco
    const tracksToDelete = isTrackSelected ? selectedTracks : [track];
    const deleteItem = await MenuItem.new({
      id: 'delete-track',
      text: `🗑️ Eliminar y borrar archivo${tracksToDelete.length > 1 ? ` (${tracksToDelete.length})` : ''}`,
      action: async () => {
        // Confirmar antes de eliminar
        const trackNames = tracksToDelete.slice(0, 3).map(t => `"${t.title}"`).join(', ');
        const moreText = tracksToDelete.length > 3 ? ` y ${tracksToDelete.length - 3} más` : '';
        
        const confirmed = await confirm(
          `¿Estás seguro de eliminar ${trackNames}${moreText}?\n\nEsto eliminará ${tracksToDelete.length > 1 ? 'las pistas' : 'la pista'} de la biblioteca Y borrará ${tracksToDelete.length > 1 ? 'los archivos' : 'el archivo'} del disco.`,
          { title: 'Eliminar y borrar archivo', kind: 'warning' }
        );
        
        if (confirmed) {
          // Eliminar cada track seleccionado
          for (const t of tracksToDelete) {
            if (t.id) {
              deleteTrack(t.id);
            }
          }
          // Limpiar selección después de eliminar
          onTracksSelect([]);
        }
      }
    });
    menuItems.push(deleteItem);

    // Opción "Open in File Browser" - abre el explorador de archivos con el archivo seleccionado
    const openInBrowserItem = await MenuItem.new({
      id: 'open-in-browser',
      text: '📂 Open in File Browser',
      action: async () => {
        try {
          await invoke('open_in_file_browser', { filePath: track.path });
        } catch (error) {
          console.error('Error abriendo explorador de archivos:', error);
        }
      }
    });
    menuItems.push(openInBrowserItem);

    const menu = await Menu.new({ items: menuItems });
    // Usar popup sin argumentos: Tauri posiciona automáticamente en el cursor
    await menu.popup();
  };

  return { handleContextMenu };
};
