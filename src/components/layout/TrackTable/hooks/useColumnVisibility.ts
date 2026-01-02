/**
 * Hook para manejar visibilidad de columnas en TrackTable
 * Persistencia en settings DB (ui.table_columns_visibility)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SortColumn } from './useTrackSorting';

/** Configuración de visibilidad de columnas */
export interface ColumnVisibilityConfig {
  fixed: boolean;
  title: boolean;
  artist: boolean;
  album: boolean;
  duration: boolean;
  bpm: boolean;
  rating: boolean;
  year: boolean;
  dateAdded: boolean;
  bitrate: boolean;
  genre: boolean;
  key: boolean;
}

/** Columnas que siempre deben ser visibles */
const REQUIRED_COLUMNS: Set<SortColumn> = new Set(['title', 'artist']);

/** Configuración por defecto - todas las columnas visibles */
const DEFAULT_CONFIG: ColumnVisibilityConfig = {
  fixed: true,
  title: true,
  artist: true,
  album: true,
  duration: true,
  bpm: true,
  rating: true,
  year: true,
  dateAdded: true,
  bitrate: true,
  genre: true,
  key: true,
};

/**
 * Tipo de setting almacenado en DB
 */
interface Setting {
  key: string;
  value: string;
  value_type: string;
}

/**
 * Hook para manejar visibilidad de columnas con persistencia en DB
 * 
 * Features:
 * - Carga configuración desde settings DB al montar
 * - Guarda cambios automáticamente en DB
 * - No permite ocultar columnas obligatorias (title, artist)
 * - Proporciona helpers para mostrar/ocultar/toggle columnas
 * 
 * @returns Estado y funciones para manejar visibilidad de columnas
 */
export const useColumnVisibility = () => {
  const [config, setConfig] = useState<ColumnVisibilityConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Carga configuración desde DB al montar
   */
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const setting = await invoke<Setting | null>('get_setting', {
          key: 'ui.table_columns_visibility',
        });

        if (setting && setting.value) {
          try {
            const parsed = JSON.parse(setting.value) as Partial<ColumnVisibilityConfig>;
            
            // Merge con defaults para asegurar todas las columnas
            const loadedConfig: ColumnVisibilityConfig = {
              ...DEFAULT_CONFIG,
              ...parsed,
            };

            // Forzar columnas obligatorias a true
            loadedConfig.title = true;
            loadedConfig.artist = true;

            setConfig(loadedConfig);
          } catch (error) {
            console.error('Error parsing column visibility config:', error);
            // Usar defaults si hay error de parsing
          }
        }
      } catch (error) {
        console.error('Error loading column visibility config:', error);
        // Usar defaults si hay error de carga
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  /**
   * Guarda configuración en DB
   */
  const saveConfig = useCallback(async (newConfig: ColumnVisibilityConfig) => {
    try {
      await invoke('update_setting', {
        key: 'ui.table_columns_visibility',
        value: JSON.stringify(newConfig),
        valueType: 'json',
      });
    } catch (error) {
      console.error('Error saving column visibility config:', error);
    }
  }, []);

  /**
   * Verifica si una columna está visible
   */
  const isColumnVisible = useCallback(
    (column: SortColumn): boolean => {
      return config[column];
    },
    [config],
  );

  /**
   * Verifica si una columna es obligatoria (no se puede ocultar)
   */
  const isRequiredColumn = useCallback((column: SortColumn): boolean => {
    return REQUIRED_COLUMNS.has(column);
  }, []);

  /**
   * Oculta una columna (si no es obligatoria)
   */
  const hideColumn = useCallback(
    async (column: SortColumn) => {
      // No permitir ocultar columnas obligatorias
      if (isRequiredColumn(column)) {
        return;
      }

      const newConfig = {
        ...config,
        [column]: false,
      };

      setConfig(newConfig);
      await saveConfig(newConfig);
    },
    [config, isRequiredColumn, saveConfig],
  );

  /**
   * Muestra una columna oculta
   */
  const showColumn = useCallback(
    async (column: SortColumn) => {
      const newConfig = {
        ...config,
        [column]: true,
      };

      setConfig(newConfig);
      await saveConfig(newConfig);
    },
    [config, saveConfig],
  );

  /**
   * Alterna la visibilidad de una columna (si no es obligatoria)
   */
  const toggleColumn = useCallback(
    async (column: SortColumn) => {
      // No permitir toggle en columnas obligatorias
      if (isRequiredColumn(column)) {
        return;
      }

      const newConfig = {
        ...config,
        [column]: !config[column],
      };

      setConfig(newConfig);
      await saveConfig(newConfig);
    },
    [config, isRequiredColumn, saveConfig],
  );

  /**
   * Resetea todas las columnas a visibles
   */
  const resetColumns = useCallback(async () => {
    setConfig(DEFAULT_CONFIG);
    await saveConfig(DEFAULT_CONFIG);
  }, [saveConfig]);

  /**
   * Lista de columnas visibles
   */
  const visibleColumns = useMemo((): SortColumn[] => {
    return (Object.entries(config) as Array<[SortColumn, boolean]>)
      .filter(([_, visible]) => visible)
      .map(([column, _]) => column);
  }, [config]);

  return {
    // Estado
    isLoading,
    visibleColumns,
    
    // Helpers
    isColumnVisible,
    isRequiredColumn,
    
    // Acciones
    hideColumn,
    showColumn,
    toggleColumn,
    resetColumns,
  };
};
