/**
 * Sidebar - Panel lateral con navegación y playlists
 * 
 * Features:
 * - Búsqueda de tracks
 * - Navegación principal (Queue, All Tracks, Recently Added, Watch Folder)
 * - Lista de playlists con creación inline
 * - Edición de nombre de playlist inline (doble click)
 * - Context menu para eliminar playlist (click derecho)
 * - Drag and drop de tracks a playlists
 */
import { useState, useRef, useEffect, useCallback, KeyboardEvent, MouseEvent, DragEvent } from "react";
import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { confirm } from "@tauri-apps/plugin-dialog";
import { 
  useGetPlaylists, 
  useCreatePlaylist, 
  useUpdatePlaylist, 
  useDeletePlaylist,
  useCreatePlaylistWithTracks,
  useAddTracksToPlaylist,
} from "../../hooks/playlists";
import type { Playlist } from "../../types/playlist";

interface SidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalTracks: number;
  /** Tracks pendientes para agregar a nuevo playlist (desde context menu) */
  pendingTracksForNewPlaylist?: { trackIds: string[] } | null;
  /** Callback cuando se completa la creación del playlist con tracks */
  onPlaylistCreatedWithTracks?: () => void;
  /** ID de la playlist actualmente seleccionada (null = "All Tracks") */
  selectedPlaylistId?: string | null;
  /** Callback cuando se selecciona una playlist o se vuelve a "All Tracks" */
  onSelectPlaylist?: (playlistId: string | null) => void;
}

interface EditingPlaylist {
  /** ID de playlist existente, o null si es nuevo */
  id: string | null;
  /** Nombre actual del input */
  name: string;
  /** IDs de tracks a agregar (solo para nuevos playlists) */
  trackIds?: string[];
}

export const Sidebar = ({ 
  searchQuery, 
  onSearchChange, 
  totalTracks,
  pendingTracksForNewPlaylist,
  onPlaylistCreatedWithTracks,
  selectedPlaylistId,
  onSelectPlaylist,
}: SidebarProps) => {
  const { data: playlists = [], isLoading: isLoadingPlaylists } = useGetPlaylists();
  const createPlaylist = useCreatePlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const deletePlaylist = useDeletePlaylist();
  const createPlaylistWithTracks = useCreatePlaylistWithTracks();
  const addTracksToPlaylist = useAddTracksToPlaylist();
  
  // AIDEV-NOTE: Estado para playlist en edición (nuevo o existente)
  const [editingPlaylist, setEditingPlaylist] = useState<EditingPlaylist | null>(null);
  
  // AIDEV-NOTE: Estado para drag and drop - playlist sobre la que se está haciendo hover
  const [dropTargetPlaylistId, setDropTargetPlaylistId] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // AIDEV-NOTE: Flag para evitar doble submit (Enter + onBlur)
  const isSubmittingRef = useRef(false);
  
  // AIDEV-NOTE: Flag para evitar re-focus cuando el usuario está escribiendo
  // Se resetea a false cuando editingPlaylist se vuelve null
  const hasFocusedRef = useRef(false);

  // AIDEV-NOTE: Auto-focus en el input cuando se inicia edición (solo una vez)
  useEffect(() => {
    // Solo hacer focus si hay un playlist en edición y no hemos hecho focus aún
    if (editingPlaylist && inputRef.current && !hasFocusedRef.current) {
      hasFocusedRef.current = true;
      
      // Pequeño delay para asegurar que el DOM está listo
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Siempre poner cursor al final (funciona bien tanto para nuevo como para edición)
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 0);
      
      return () => clearTimeout(timer);
    }
    
    // Resetear flag cuando se termina la edición
    if (!editingPlaylist) {
      hasFocusedRef.current = false;
    }
    
    return undefined;
  }, [editingPlaylist]);

  // AIDEV-NOTE: Cuando llegan tracks pendientes desde context menu, crear nuevo playlist
  // Solo se ejecuta cuando pendingTracksForNewPlaylist cambia a un valor no-null con tracks
  useEffect(() => {
    if (pendingTracksForNewPlaylist && pendingTracksForNewPlaylist.trackIds.length > 0 && !editingPlaylist) {
      setEditingPlaylist({
        id: null,
        name: "Nuevo Playlist",
        trackIds: pendingTracksForNewPlaylist.trackIds,
      });
      // Limpiamos inmediatamente para evitar re-triggers del useEffect
      // Los trackIds ya están guardados en editingPlaylist
      onPlaylistCreatedWithTracks?.();
    }
  }, [pendingTracksForNewPlaylist, editingPlaylist, onPlaylistCreatedWithTracks]);

  /**
   * Inicia la creación de un nuevo playlist vacío (botón +)
   */
  const handleAddPlaylistClick = () => {
    setEditingPlaylist({
      id: null,
      name: "Nuevo Playlist",
    });
  };

  /**
   * Inicia la edición del nombre de un playlist existente (doble click)
   */
  const handlePlaylistDoubleClick = (playlist: Playlist) => {
    if (playlist.id) {
      setEditingPlaylist({
        id: playlist.id,
        name: playlist.name,
      });
    }
  };

  /**
   * Muestra context menu para playlist (click derecho)
   */
  const handlePlaylistContextMenu = async (e: MouseEvent, playlist: Playlist) => {
    e.preventDefault();
    
    if (!playlist.id) return;

    const menuItems: MenuItem[] = [];

    // Opción renombrar
    const renameItem = await MenuItem.new({
      id: 'rename-playlist',
      text: 'Renombrar',
      action: () => {
        handlePlaylistDoubleClick(playlist);
      }
    });
    menuItems.push(renameItem);

    // Opción eliminar
    const deleteItem = await MenuItem.new({
      id: 'delete-playlist',
      text: 'Eliminar playlist',
      action: async () => {
        const confirmed = await confirm(
          `¿Estás seguro de que quieres eliminar "${playlist.name}"?\n\nEsta acción no se puede deshacer.`,
          { title: 'Eliminar Playlist', kind: 'warning' }
        );
        
        if (confirmed && playlist.id) {
          deletePlaylist.mutate(playlist.id);
        }
      }
    });
    menuItems.push(deleteItem);

    const menu = await Menu.new({ items: menuItems });
    await menu.popup(new LogicalPosition(e.clientX, e.clientY));
  };

  /**
   * Confirma la creación/edición del playlist
   * AIDEV-NOTE: Usa isSubmittingRef para evitar doble submit cuando
   * Enter dispara onBlur también
   */
  const handleConfirmEdit = useCallback(async () => {
    if (!editingPlaylist) return;
    
    // Evitar doble submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const name = editingPlaylist.name.trim();
    
    if (!name) {
      // Si el nombre está vacío, cancelar
      setEditingPlaylist(null);
      isSubmittingRef.current = false;
      return;
    }

    if (editingPlaylist.id === null) {
      // Crear nuevo playlist
      if (editingPlaylist.trackIds && editingPlaylist.trackIds.length > 0) {
        // Crear con tracks (desde context menu)
        createPlaylistWithTracks.mutate(
          { name, description: null, trackIds: editingPlaylist.trackIds },
          {
            onSettled: () => {
              setEditingPlaylist(null);
              isSubmittingRef.current = false;
            },
          }
        );
      } else {
        // Crear vacío (desde botón +)
        createPlaylist.mutate(
          { name, description: null },
          {
            onSettled: () => {
              setEditingPlaylist(null);
              isSubmittingRef.current = false;
            },
          }
        );
      }
    } else {
      // Actualizar nombre de playlist existente
      updatePlaylist.mutate(
        { id: editingPlaylist.id, name, description: null },
        {
          onSettled: () => {
            setEditingPlaylist(null);
            isSubmittingRef.current = false;
          },
        }
      );
    }
  }, [editingPlaylist, createPlaylist, createPlaylistWithTracks, updatePlaylist]);

  /**
   * Cancela la edición
   */
  const handleCancelEdit = () => {
    setEditingPlaylist(null);
  };

  /**
   * Maneja teclas en el input de edición
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  /**
   * Maneja el evento dragEnter sobre una playlist
   * AIDEV-NOTE: Solo acepta drops si el payload es de tipo "tracks"
   */
  const handlePlaylistDragEnter = useCallback((e: DragEvent, playlistId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetPlaylistId(playlistId);
  }, []);

  /**
   * Maneja el evento dragOver sobre una playlist
   */
  const handlePlaylistDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  /**
   * Maneja el evento dragLeave sobre una playlist
   */
  const handlePlaylistDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Solo resetear si el mouse realmente salió del elemento
    // (evita flickering cuando el mouse pasa sobre elementos hijos)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropTargetPlaylistId(null);
    }
  }, []);

  /**
   * Maneja el drop de tracks sobre una playlist
   * AIDEV-NOTE: Parsea el JSON del dataTransfer y llama al backend
   */
  const handlePlaylistDrop = useCallback((e: DragEvent, playlistId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetPlaylistId(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data.type === "tracks" && data.trackIds && data.trackIds.length > 0) {
        // Agregar tracks a la playlist
        addTracksToPlaylist.mutate({
          playlistId,
          trackIds: data.trackIds,
        });
      }
    } catch {
      // Ignorar errores de parsing (drag desde otra fuente)
    }
  }, [addTracksToPlaylist]);

  const isPending = createPlaylist.isPending || updatePlaylist.isPending || createPlaylistWithTracks.isPending || deletePlaylist.isPending || addTracksToPlaylist.isPending;

  return (
    <aside className="w-64 bg-gray-100/30 dark:bg-gray-900/40 p-4 space-y-4 flex-shrink-0">
      {/* Search */}
      <div className="relative">
        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-gray-200/50 dark:bg-gray-800/60 border-none rounded pl-10 pr-3 py-2 text-sm focus:ring-primary focus:ring-1 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Search... All Tracks"
        />
      </div>

      {/* Navigation */}
      <nav className="space-y-1 text-sm">
        <button
          type="button"
          className="w-full flex justify-between items-center px-3 py-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-left"
        >
          <span>Queue</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectPlaylist?.(null)}
          className={`w-full flex justify-between items-center px-3 py-1.5 rounded text-left ${
            selectedPlaylistId === null 
              ? "bg-gray-200/50 dark:bg-gray-700/50 font-semibold text-gray-800 dark:text-gray-200" 
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
          }`}
        >
          <span>All Tracks [{totalTracks}]</span>
          {selectedPlaylistId === null && (
            <span className="material-icons text-primary text-lg">equalizer</span>
          )}
        </button>
        <button
          type="button"
          className="w-full flex justify-between items-center px-3 py-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-left"
        >
          <span>Recently Added [{totalTracks}]</span>
        </button>
        <button
          type="button"
          className="w-full flex justify-between items-center px-3 py-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-left"
        >
          <span>
            Watch Folder <span className="text-gray-500">[Inactive]</span>
          </span>
        </button>
      </nav>

      <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-2" />

      {/* Playlists */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
            Playlists
          </h3>
          <button 
            type="button"
            onClick={handleAddPlaylistClick}
            disabled={isPending || editingPlaylist !== null}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Crear nuevo playlist"
          >
            <span className="material-icons text-lg">add</span>
          </button>
        </div>

        {/* Lista de playlists */}
        <div className="space-y-1 text-sm">
          {/* Input para nuevo playlist (al principio de la lista) */}
          {editingPlaylist?.id === null && (
            <div className="px-2">
              <input
                ref={inputRef}
                type="text"
                value={editingPlaylist.name}
                onChange={(e) => setEditingPlaylist((prev) => prev ? { ...prev, name: e.target.value } : null)}
                onKeyDown={handleKeyDown}
                onBlur={handleConfirmEdit}
                disabled={isPending}
                className="w-full bg-white dark:bg-gray-800 border border-primary rounded px-2 py-1 text-sm focus:ring-primary focus:ring-1 focus:outline-none text-gray-800 dark:text-gray-200"
                placeholder="Nombre del playlist"
              />
            </div>
          )}

          {isLoadingPlaylists ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 px-3">
              Cargando playlists...
            </p>
          ) : playlists.length === 0 && !editingPlaylist ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 px-3">
              No hay playlists
            </p>
          ) : (
            playlists.map((playlist: Playlist) => (
              <div key={playlist.id}>
                {editingPlaylist?.id === playlist.id ? (
                  // Modo edición para playlist existente
                  <div className="px-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingPlaylist.name}
                      onChange={(e) => setEditingPlaylist((prev) => prev ? { ...prev, name: e.target.value } : null)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleConfirmEdit}
                      disabled={isPending}
                      className="w-full bg-white dark:bg-gray-800 border border-primary rounded px-2 py-1 text-sm focus:ring-primary focus:ring-1 focus:outline-none text-gray-800 dark:text-gray-200"
                    />
                  </div>
                ) : (
                  // Modo visualización con context menu y drop zone
                  <button
                    type="button"
                    onClick={() => onSelectPlaylist?.(playlist.id)}
                    onDoubleClick={() => handlePlaylistDoubleClick(playlist)}
                    onContextMenu={(e) => handlePlaylistContextMenu(e, playlist)}
                    onDragEnter={(e) => playlist.id && handlePlaylistDragEnter(e, playlist.id)}
                    onDragOver={handlePlaylistDragOver}
                    onDragLeave={handlePlaylistDragLeave}
                    onDrop={(e) => playlist.id && handlePlaylistDrop(e, playlist.id)}
                    className={`w-full flex items-center px-3 py-1.5 rounded text-left transition-all ${
                      dropTargetPlaylistId === playlist.id
                        ? "bg-primary/20 ring-2 ring-primary ring-opacity-50"
                        : selectedPlaylistId === playlist.id
                          ? "bg-gray-200/50 dark:bg-gray-700/50 font-semibold text-gray-800 dark:text-gray-200"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                    }`}
                    title="Click para ver tracks, doble click para renombrar, click derecho para más opciones"
                  >
                    <span className={`material-icons text-sm mr-2 ${
                      dropTargetPlaylistId === playlist.id 
                        ? "text-primary" 
                        : selectedPlaylistId === playlist.id 
                          ? "text-primary" 
                          : "text-gray-400"
                    }`}>
                      {dropTargetPlaylistId === playlist.id ? "add_circle" : "queue_music"}
                    </span>
                    <span className="truncate flex-1">{playlist.name}</span>
                    {selectedPlaylistId === playlist.id && (
                      <span className="material-icons text-primary text-lg ml-1">equalizer</span>
                    )}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};

Sidebar.displayName = "Sidebar";
