/**
 * Tests para el componente Sidebar
 * 
 * Verifica:
 * - Renderizado de búsqueda y navegación
 * - Botón de agregar playlist funcional
 * - Lista de playlists con datos reales
 * - Edición inline de nombre de playlist
 * - Creación de playlist con tracks pendientes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';

// Mock de hooks de playlists
vi.mock('../../hooks/playlists', () => ({
  useGetPlaylists: vi.fn(),
  useCreatePlaylist: vi.fn(),
  useUpdatePlaylist: vi.fn(),
  useDeletePlaylist: vi.fn(),
  useCreatePlaylistWithTracks: vi.fn(),
  useAddTracksToPlaylist: vi.fn(),
}));

import { 
  useGetPlaylists, 
  useCreatePlaylist, 
  useUpdatePlaylist, 
  useDeletePlaylist,
  useCreatePlaylistWithTracks,
  useAddTracksToPlaylist,
} from '../../hooks/playlists';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockPlaylists = [
  { id: 'pl-1', name: 'Mi Playlist 1', description: 'Descripción 1', date_created: '2024-01-01', date_modified: '2024-01-01' },
  { id: 'pl-2', name: 'Mi Playlist 2', description: null, date_created: '2024-01-02', date_modified: '2024-01-02' },
];

describe('Sidebar', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    totalTracks: 100,
    selectedPlaylistId: null as string | null,
    onSelectPlaylist: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(useGetPlaylists).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetPlaylists>);
    
    vi.mocked(useCreatePlaylist).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreatePlaylist>);
    
    vi.mocked(useUpdatePlaylist).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdatePlaylist>);

    vi.mocked(useDeletePlaylist).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeletePlaylist>);
    
    vi.mocked(useCreatePlaylistWithTracks).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreatePlaylistWithTracks>);

    vi.mocked(useAddTracksToPlaylist).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAddTracksToPlaylist>);
  });

  describe('Renderizado básico', () => {
    it('debería renderizar el campo de búsqueda', () => {
      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      expect(screen.getByPlaceholderText('Search... All Tracks')).toBeInTheDocument();
    });

    it('debería mostrar el total de tracks en All Tracks', () => {
      render(<Sidebar {...defaultProps} totalTracks={42} />, { wrapper: createWrapper() });
      
      expect(screen.getByText('All Tracks [42]')).toBeInTheDocument();
    });

    it('debería renderizar las opciones de navegación', () => {
      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      expect(screen.getByText('Queue')).toBeInTheDocument();
      expect(screen.getByText(/All Tracks/)).toBeInTheDocument();
      expect(screen.getByText(/Recently Added/)).toBeInTheDocument();
      expect(screen.getByText(/Watch Folder/)).toBeInTheDocument();
    });

    it('debería renderizar la sección de Playlists', () => {
      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      expect(screen.getByText('Playlists')).toBeInTheDocument();
    });
  });

  describe('Búsqueda', () => {
    it('debería llamar onSearchChange cuando se escribe en el campo', () => {
      const onSearchChange = vi.fn();
      render(<Sidebar {...defaultProps} onSearchChange={onSearchChange} />, { wrapper: createWrapper() });
      
      const input = screen.getByPlaceholderText('Search... All Tracks');
      fireEvent.change(input, { target: { value: 'test query' } });
      
      expect(onSearchChange).toHaveBeenCalledWith('test query');
    });

    it('debería mostrar el valor actual de searchQuery', () => {
      render(<Sidebar {...defaultProps} searchQuery="mi búsqueda" />, { wrapper: createWrapper() });
      
      const input = screen.getByPlaceholderText('Search... All Tracks') as HTMLInputElement;
      expect(input.value).toBe('mi búsqueda');
    });
  });

  describe('Lista de playlists', () => {
    it('debería mostrar mensaje cuando no hay playlists', () => {
      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      expect(screen.getByText('No hay playlists')).toBeInTheDocument();
    });

    it('debería mostrar "Cargando playlists..." cuando isLoading es true', () => {
      vi.mocked(useGetPlaylists).mockReturnValue({
        data: [],
        isLoading: true,
      } as unknown as ReturnType<typeof useGetPlaylists>);

      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      expect(screen.getByText('Cargando playlists...')).toBeInTheDocument();
    });

    it('debería renderizar la lista de playlists', () => {
      vi.mocked(useGetPlaylists).mockReturnValue({
        data: mockPlaylists,
        isLoading: false,
      } as ReturnType<typeof useGetPlaylists>);

      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      expect(screen.getByText('Mi Playlist 1')).toBeInTheDocument();
      expect(screen.getByText('Mi Playlist 2')).toBeInTheDocument();
    });
  });

  describe('Botón agregar playlist', () => {
    it('debería tener un botón para agregar playlist', () => {
      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      const addButton = screen.getByTitle('Crear nuevo playlist');
      expect(addButton).toBeInTheDocument();
    });

    it('debería mostrar input de edición al hacer click en el botón +', () => {
      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      const addButton = screen.getByTitle('Crear nuevo playlist');
      fireEvent.click(addButton);
      
      const input = screen.getByPlaceholderText('Nombre del playlist');
      expect(input).toBeInTheDocument();
      expect((input as HTMLInputElement).value).toBe('Nuevo Playlist');
    });

    it('debería crear playlist vacío al confirmar nombre', async () => {
      const mockMutate = vi.fn();
      vi.mocked(useCreatePlaylist).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof useCreatePlaylist>);

      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      // Click en botón +
      const addButton = screen.getByTitle('Crear nuevo playlist');
      fireEvent.click(addButton);
      
      // Cambiar nombre
      const input = screen.getByPlaceholderText('Nombre del playlist');
      fireEvent.change(input, { target: { value: 'Mi Nueva Playlist' } });
      
      // Presionar Enter
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockMutate).toHaveBeenCalledWith(
        { name: 'Mi Nueva Playlist', description: null },
        expect.any(Object)
      );
    });

    it('debería cancelar edición al presionar Escape', () => {
      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      // Click en botón +
      const addButton = screen.getByTitle('Crear nuevo playlist');
      fireEvent.click(addButton);
      
      // Verificar que aparece el input
      expect(screen.getByPlaceholderText('Nombre del playlist')).toBeInTheDocument();
      
      // Presionar Escape
      const input = screen.getByPlaceholderText('Nombre del playlist');
      fireEvent.keyDown(input, { key: 'Escape' });
      
      // El input debería desaparecer
      expect(screen.queryByPlaceholderText('Nombre del playlist')).not.toBeInTheDocument();
    });
  });

  describe('Edición de playlist existente', () => {
    it('debería mostrar input de edición al hacer doble click en playlist', () => {
      vi.mocked(useGetPlaylists).mockReturnValue({
        data: mockPlaylists,
        isLoading: false,
      } as ReturnType<typeof useGetPlaylists>);

      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      const playlistButton = screen.getByText('Mi Playlist 1');
      fireEvent.doubleClick(playlistButton);
      
      // Debería haber un input con el nombre del playlist
      const input = screen.getByDisplayValue('Mi Playlist 1');
      expect(input).toBeInTheDocument();
    });

    it('debería actualizar playlist al confirmar edición', async () => {
      const mockMutate = vi.fn();
      vi.mocked(useUpdatePlaylist).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof useUpdatePlaylist>);
      
      vi.mocked(useGetPlaylists).mockReturnValue({
        data: mockPlaylists,
        isLoading: false,
      } as ReturnType<typeof useGetPlaylists>);

      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      // Doble click para editar
      const playlistButton = screen.getByText('Mi Playlist 1');
      fireEvent.doubleClick(playlistButton);
      
      // Cambiar nombre
      const input = screen.getByDisplayValue('Mi Playlist 1');
      fireEvent.change(input, { target: { value: 'Nombre Actualizado' } });
      
      // Presionar Enter
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockMutate).toHaveBeenCalledWith(
        { id: 'pl-1', name: 'Nombre Actualizado', description: null },
        expect.any(Object)
      );
    });
  });

  describe('Crear playlist con tracks pendientes (desde context menu)', () => {
    it('debería mostrar input al recibir pendingTracksForNewPlaylist', () => {
      render(
        <Sidebar 
          {...defaultProps} 
          pendingTracksForNewPlaylist={{ trackIds: ['track-1', 'track-2'] }}
        />, 
        { wrapper: createWrapper() }
      );
      
      const input = screen.getByPlaceholderText('Nombre del playlist');
      expect(input).toBeInTheDocument();
      expect((input as HTMLInputElement).value).toBe('Nuevo Playlist');
    });

    it('debería crear playlist con tracks al confirmar', async () => {
      const mockMutate = vi.fn();
      const mockOnComplete = vi.fn();
      
      vi.mocked(useCreatePlaylistWithTracks).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof useCreatePlaylistWithTracks>);

      render(
        <Sidebar 
          {...defaultProps} 
          pendingTracksForNewPlaylist={{ trackIds: ['track-1', 'track-2'] }}
          onPlaylistCreatedWithTracks={mockOnComplete}
        />, 
        { wrapper: createWrapper() }
      );
      
      // Cambiar nombre
      const input = screen.getByPlaceholderText('Nombre del playlist');
      fireEvent.change(input, { target: { value: 'Playlist con Tracks' } });
      
      // Presionar Enter
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockMutate).toHaveBeenCalledWith(
        { 
          name: 'Playlist con Tracks', 
          description: null, 
          trackIds: ['track-1', 'track-2'] 
        },
        expect.any(Object)
      );
    });

    it('debería llamar onPlaylistCreatedWithTracks al cancelar', () => {
      const mockOnComplete = vi.fn();
      
      render(
        <Sidebar 
          {...defaultProps} 
          pendingTracksForNewPlaylist={{ trackIds: ['track-1'] }}
          onPlaylistCreatedWithTracks={mockOnComplete}
        />, 
        { wrapper: createWrapper() }
      );
      
      const input = screen.getByPlaceholderText('Nombre del playlist');
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('Estados de carga', () => {
    it('debería deshabilitar botón + mientras se crea playlist', () => {
      vi.mocked(useCreatePlaylist).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as unknown as ReturnType<typeof useCreatePlaylist>);

      render(<Sidebar {...defaultProps} />, { wrapper: createWrapper() });
      
      const addButton = screen.getByTitle('Crear nuevo playlist');
      expect(addButton).toBeDisabled();
    });
  });

  describe('Selección de playlist', () => {
    it('debería llamar onSelectPlaylist con null al hacer click en All Tracks', () => {
      const onSelectPlaylist = vi.fn();
      render(
        <Sidebar {...defaultProps} selectedPlaylistId="pl-1" onSelectPlaylist={onSelectPlaylist} />, 
        { wrapper: createWrapper() }
      );
      
      const allTracksButton = screen.getByText(/All Tracks/);
      fireEvent.click(allTracksButton);
      
      expect(onSelectPlaylist).toHaveBeenCalledWith(null);
    });

    it('debería mostrar All Tracks como seleccionado cuando selectedPlaylistId es null', () => {
      render(
        <Sidebar {...defaultProps} selectedPlaylistId={null} />, 
        { wrapper: createWrapper() }
      );
      
      const allTracksButton = screen.getByText(/All Tracks/).closest('button');
      // Verifica clases de selección: bg-gray-200/50 dark:bg-gray-700/50 font-semibold
      expect(allTracksButton).toHaveClass('font-semibold');
    });

    it('debería llamar onSelectPlaylist con el id al hacer click en una playlist', () => {
      const onSelectPlaylist = vi.fn();
      vi.mocked(useGetPlaylists).mockReturnValue({
        data: mockPlaylists,
        isLoading: false,
      } as ReturnType<typeof useGetPlaylists>);

      render(
        <Sidebar {...defaultProps} onSelectPlaylist={onSelectPlaylist} />, 
        { wrapper: createWrapper() }
      );
      
      const playlistItem = screen.getByText('Mi Playlist 1');
      fireEvent.click(playlistItem);
      
      expect(onSelectPlaylist).toHaveBeenCalledWith('pl-1');
    });

    it('debería mostrar playlist como seleccionada cuando selectedPlaylistId coincide', () => {
      vi.mocked(useGetPlaylists).mockReturnValue({
        data: mockPlaylists,
        isLoading: false,
      } as ReturnType<typeof useGetPlaylists>);

      render(
        <Sidebar {...defaultProps} selectedPlaylistId="pl-1" />, 
        { wrapper: createWrapper() }
      );
      
      const playlistItem = screen.getByText('Mi Playlist 1').closest('button');
      // Verifica clases de selección: bg-gray-200/50 dark:bg-gray-700/50 font-semibold
      expect(playlistItem).toHaveClass('font-semibold');
    });

    it('no debería mostrar All Tracks como seleccionado cuando hay una playlist seleccionada', () => {
      vi.mocked(useGetPlaylists).mockReturnValue({
        data: mockPlaylists,
        isLoading: false,
      } as ReturnType<typeof useGetPlaylists>);

      render(
        <Sidebar {...defaultProps} selectedPlaylistId="pl-1" />, 
        { wrapper: createWrapper() }
      );
      
      const allTracksButton = screen.getByText(/All Tracks/).closest('button');
      expect(allTracksButton).not.toHaveClass('font-semibold');
    });
  });
});
