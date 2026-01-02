/**
 * Tests para useColumnVisibility hook
 * Maneja el estado de visibilidad de columnas en TrackTable
 * Persistencia en settings DB (ui.table_columns_visibility)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useColumnVisibility } from './useColumnVisibility';
import type { SortColumn } from './useTrackSorting';

// Mock de comandos Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Import después del mock
import { invoke } from '@tauri-apps/api/core';

describe('useColumnVisibility', () => {
  const mockInvoke = invoke as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock por defecto: no hay configuración guardada
    mockInvoke.mockResolvedValue(null);
  });

  describe('Estado inicial', () => {
    it('debe tener todas las columnas visibles por defecto si no hay configuración', async () => {
      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Todas las columnas deben estar visibles inicialmente
      const allColumns: SortColumn[] = [
        'fixed',
        'title',
        'artist',
        'album',
        'duration',
        'bpm',
        'rating',
        'year',
        'dateAdded',
        'bitrate',
        'genre',
        'key',
      ];

      allColumns.forEach((column) => {
        expect(result.current.isColumnVisible(column)).toBe(true);
      });
    });

    it('debe cargar configuración desde DB al inicializar', async () => {
      // Simular configuración guardada en DB
      const savedConfig = {
        key: 'ui.table_columns_visibility',
        value: JSON.stringify({
          fixed: true,
          title: true,
          artist: true,
          album: true,
          duration: true,
          bpm: false,
          rating: true,
          year: false,
          dateAdded: true,
          bitrate: false,
          genre: false,
          key: true,
        }),
        value_type: 'json',
      };

      mockInvoke.mockResolvedValue(savedConfig);

      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verificar que se invocó get_setting con la clave correcta
      expect(mockInvoke).toHaveBeenCalledWith('get_setting', {
        key: 'ui.table_columns_visibility',
      });

      // Verificar que se aplicó la configuración
      expect(result.current.isColumnVisible('bpm')).toBe(false);
      expect(result.current.isColumnVisible('year')).toBe(false);
      expect(result.current.isColumnVisible('genre')).toBe(false);
      expect(result.current.isColumnVisible('bitrate')).toBe(false);
      expect(result.current.isColumnVisible('title')).toBe(true);
      expect(result.current.isColumnVisible('rating')).toBe(true);
    });

    it('debe manejar configuración corrupta sin romper', async () => {
      // Simular configuración con JSON inválido
      const corruptedConfig = {
        key: 'ui.table_columns_visibility',
        value: 'invalid-json{]',
        value_type: 'json',
      };

      mockInvoke.mockResolvedValue(corruptedConfig);

      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Debe usar valores por defecto
      expect(result.current.visibleColumns).toHaveLength(12);
    });

    it('debe devolver lista de columnas visibles correctamente', async () => {
      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.visibleColumns).toHaveLength(12);
      expect(result.current.visibleColumns).toContain('title');
      expect(result.current.visibleColumns).toContain('artist');
    });
  });

  describe('Ocultar columnas', () => {
    it('debe ocultar una columna y persistir en DB', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.hideColumn('genre');
      });

      expect(result.current.isColumnVisible('genre')).toBe(false);
      expect(result.current.isColumnVisible('title')).toBe(true);

      // Verificar que se guardó en DB
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('update_setting', {
          key: 'ui.table_columns_visibility',
          value: expect.any(String),
          valueType: 'json',
        });
      });
    });

    it('debe ocultar múltiples columnas', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.hideColumn('genre');
      });

      await act(async () => {
        await result.current.hideColumn('key');
      });

      await act(async () => {
        await result.current.hideColumn('bitrate');
      });

      await waitFor(() => {
        expect(result.current.isColumnVisible('genre')).toBe(false);
        expect(result.current.isColumnVisible('key')).toBe(false);
        expect(result.current.isColumnVisible('bitrate')).toBe(false);
        expect(result.current.visibleColumns).toHaveLength(9);
      });
    });

    it('NO debe permitir ocultar title (columna obligatoria)', async () => {
      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.hideColumn('title');
      });

      // Title debe seguir visible
      expect(result.current.isColumnVisible('title')).toBe(true);
    });

    it('NO debe permitir ocultar artist (columna obligatoria)', async () => {
      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.hideColumn('artist');
      });

      // Artist debe seguir visible
      expect(result.current.isColumnVisible('artist')).toBe(true);
    });
  });

  describe('Mostrar columnas', () => {
    it('debe mostrar una columna oculta y persistir en DB', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Ocultar primero
      await act(async () => {
        await result.current.hideColumn('genre');
      });

      expect(result.current.isColumnVisible('genre')).toBe(false);

      // Mostrar de nuevo
      await act(async () => {
        await result.current.showColumn('genre');
      });

      expect(result.current.isColumnVisible('genre')).toBe(true);

      // Verificar que se guardó en DB
      await waitFor(() => {
        const calls = mockInvoke.mock.calls.filter(
          (call) => call[0] === 'update_setting',
        );
        expect(calls.length).toBeGreaterThan(0);
      });
    });

    it('debe mostrar múltiples columnas ocultas', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Ocultar varias
      await act(async () => {
        await result.current.hideColumn('genre');
      });

      await act(async () => {
        await result.current.hideColumn('key');
      });

      await act(async () => {
        await result.current.hideColumn('bitrate');
      });

      await waitFor(() => {
        expect(result.current.visibleColumns).toHaveLength(9);
      });

      // Mostrar de nuevo
      await act(async () => {
        await result.current.showColumn('genre');
      });

      await act(async () => {
        await result.current.showColumn('key');
      });

      await waitFor(() => {
        expect(result.current.isColumnVisible('genre')).toBe(true);
        expect(result.current.isColumnVisible('key')).toBe(true);
        expect(result.current.isColumnVisible('bitrate')).toBe(false);
        expect(result.current.visibleColumns).toHaveLength(11);
      });
    });
  });

  describe('Toggle columnas', () => {
    it('debe alternar visibilidad de columna', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Inicialmente visible
      expect(result.current.isColumnVisible('genre')).toBe(true);

      // Toggle -> oculta
      await act(async () => {
        await result.current.toggleColumn('genre');
      });

      expect(result.current.isColumnVisible('genre')).toBe(false);

      // Toggle -> muestra
      await act(async () => {
        await result.current.toggleColumn('genre');
      });

      expect(result.current.isColumnVisible('genre')).toBe(true);
    });

    it('NO debe permitir toggle en columnas obligatorias', async () => {
      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleColumn('title');
        await result.current.toggleColumn('artist');
      });

      // Deben seguir visibles
      expect(result.current.isColumnVisible('title')).toBe(true);
      expect(result.current.isColumnVisible('artist')).toBe(true);
    });
  });

  describe('Resetear columnas', () => {
    it('debe resetear todas las columnas a visibles', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Ocultar varias
      await act(async () => {
        await result.current.hideColumn('genre');
      });

      await act(async () => {
        await result.current.hideColumn('key');
      });

      await act(async () => {
        await result.current.hideColumn('bitrate');
      });

      await act(async () => {
        await result.current.hideColumn('year');
      });

      await waitFor(() => {
        expect(result.current.visibleColumns).toHaveLength(8);
      });

      // Resetear
      await act(async () => {
        await result.current.resetColumns();
      });

      await waitFor(() => {
        expect(result.current.visibleColumns).toHaveLength(12);
        expect(result.current.isColumnVisible('genre')).toBe(true);
        expect(result.current.isColumnVisible('key')).toBe(true);
        expect(result.current.isColumnVisible('bitrate')).toBe(true);
      });
    });
  });

  describe('Columnas obligatorias', () => {
    it('debe identificar title y artist como obligatorias', () => {
      const { result } = renderHook(() => useColumnVisibility());

      expect(result.current.isRequiredColumn('title')).toBe(true);
      expect(result.current.isRequiredColumn('artist')).toBe(true);
    });

    it('debe identificar otras columnas como no obligatorias', () => {
      const { result } = renderHook(() => useColumnVisibility());

      expect(result.current.isRequiredColumn('genre')).toBe(false);
      expect(result.current.isRequiredColumn('key')).toBe(false);
      expect(result.current.isRequiredColumn('bpm')).toBe(false);
    });
  });

  describe('Estado de loading', () => {
    it('debe mostrar loading=true mientras carga configuración', () => {
      // Simular carga lenta
      mockInvoke.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(null), 100);
          }),
      );

      const { result } = renderHook(() => useColumnVisibility());

      expect(result.current.isLoading).toBe(true);
    });

    it('debe cambiar loading=false después de cargar', async () => {
      mockInvoke.mockResolvedValue(null);

      const { result } = renderHook(() => useColumnVisibility());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
