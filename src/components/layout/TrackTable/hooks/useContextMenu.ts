import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { confirm } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Track } from '../../../../types/library';

export interface UseContextMenuProps {
  selectedTracks: Track[];
  onTracksSelect: (tracks: Track[]) => void;
  onTrackDetails?: (track: Track) => void;
  onBatchFilenameToTags?: (tracks: Track[]) => void;
  onFixTags?: (trackIds: string[]) => void;
  onFindArtwork?: (trackIds: string[]) => void;
  deleteTrack: (trackId: string) => void;
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
  deleteTrack,
}: UseContextMenuProps) => {
  const handleContextMenu = async (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    
    // Si el track clickeado no está en la selección, seleccionarlo solo
    const isTrackSelected = selectedTracks.some(t => t.id === track.id);
    if (!isTrackSelected) {
      onTracksSelect([track]);
    }

    const menuItems: MenuItem[] = [];

    // Opción "Details" solo si hay 1 track seleccionado
    if (selectedTracks.length === 1 && onTrackDetails) {
      const detailsItem = await MenuItem.new({
        id: 'details',
        text: 'Details',
        action: () => {
          onTrackDetails(selectedTracks[0]);
        }
      });
      menuItems.push(detailsItem);
    }

    // Opciones de búsqueda - solo si hay 1 track seleccionado
    if (selectedTracks.length === 1) {
      const currentTrack = selectedTracks[0];
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

    // Opción "Delete Track" - elimina de DB y borra archivo
    const tracksToDelete = isTrackSelected ? selectedTracks : [track];
    const deleteItem = await MenuItem.new({
      id: 'delete-track',
      text: `Delete Track${tracksToDelete.length > 1 ? `s (${tracksToDelete.length})` : ''}`,
      action: async () => {
        // Confirmar antes de eliminar
        const trackNames = tracksToDelete.slice(0, 3).map(t => `"${t.title}"`).join(', ');
        const moreText = tracksToDelete.length > 3 ? ` and ${tracksToDelete.length - 3} more` : '';
        
        const confirmed = await confirm(
          `Are you sure you want to delete ${trackNames}${moreText}?\n\nThis will remove the track${tracksToDelete.length > 1 ? 's' : ''} from the library AND delete the file${tracksToDelete.length > 1 ? 's' : ''} from disk.`,
          { title: 'Delete Track', kind: 'warning' }
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

    // Opción DevTools
    const devToolsItem = await MenuItem.new({
      id: 'devtools',
      text: 'Open DevTools (F12)',
      action: () => {
        alert('Press F12 to open DevTools\n\nOr use:\n- Windows/Linux: Ctrl+Shift+I\n- macOS: Cmd+Option+I');
      }
    });
    menuItems.push(devToolsItem);

    const menu = await Menu.new({ items: menuItems });
    await menu.popup(new LogicalPosition(e.clientX, e.clientY));
  };

  return { handleContextMenu };
};
