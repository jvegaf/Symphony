import { useState, useEffect } from 'react';
import { useSettings } from '../../../hooks/useSettings';
import { DEFAULT_SETTINGS } from '../../../types/settings';
import type { AppSettings } from '../../../types/settings';

export interface UseSettingsFormReturn {
  /** Settings locales siendo editados */
  localSettings: AppSettings;
  /** Actualiza settings locales */
  setLocalSettings: (settings: AppSettings) => void;
  /** Guarda cambios en el servidor */
  handleSave: () => Promise<void>;
  /** Resetea a valores por defecto */
  handleReset: () => void;
  /** Loading states */
  isLoading: boolean;
  error: Error | null;
  isUpdating: boolean;
  isResetting: boolean;
}

export interface UseSettingsFormCallbacks {
  onSaveSuccess?: () => void;
  onSaveError?: (error: string) => void;
  onResetSuccess?: () => void;
  onResetError?: (error: string) => void;
}

/**
 * Hook para manejar el estado y lógica del formulario de Settings
 * 
 * Encapsula:
 * - Estado local de edición (localSettings)
 * - Sincronización con settings del servidor
 * - Conversión de AppSettings a array de updates
 * - Callbacks de save/reset
 * 
 * @param callbacks - Callbacks para eventos de save/reset
 */
export const useSettingsForm = (
  callbacks?: UseSettingsFormCallbacks
) => {
  const { settings, isLoading, error, updateSettings, resetSettings, isUpdating, isResetting } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings ?? DEFAULT_SETTINGS);

  // Sincronizar local state cuando cambien settings del servidor
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!localSettings) return;

    // Convertir AppSettings a array de updates
    const updates: Array<{ key: string; value: unknown; valueType: 'string' | 'number' | 'boolean' }> = [];

    // UI settings
    updates.push(
      { key: 'ui.theme', value: localSettings.ui.theme, valueType: 'string' },
      { key: 'ui.language', value: localSettings.ui.language, valueType: 'string' },
      { key: 'ui.waveform_resolution', value: localSettings.ui.waveformResolution, valueType: 'number' }
    );

    // Audio settings
    updates.push(
      { key: 'audio.output_device', value: localSettings.audio.outputDevice, valueType: 'string' },
      { key: 'audio.sample_rate', value: localSettings.audio.sampleRate, valueType: 'number' },
      { key: 'audio.buffer_size', value: localSettings.audio.bufferSize, valueType: 'number' }
    );

    // Library settings
    updates.push(
      { key: 'library.auto_scan_on_startup', value: localSettings.library.autoScanOnStartup, valueType: 'boolean' },
      { key: 'library.scan_interval_hours', value: localSettings.library.scanIntervalHours, valueType: 'number' },
      { key: 'library.import_folder', value: localSettings.library.importFolder, valueType: 'string' }
    );

    // Conversion settings
    updates.push(
      { key: 'conversion.enabled', value: localSettings.conversion.enabled, valueType: 'boolean' },
      { key: 'conversion.auto_convert', value: localSettings.conversion.autoConvert, valueType: 'boolean' },
      { key: 'conversion.bitrate', value: localSettings.conversion.bitrate, valueType: 'number' },
      { key: 'conversion.output_folder', value: localSettings.conversion.outputFolder, valueType: 'string' },
      { key: 'conversion.preserve_structure', value: localSettings.conversion.preserveStructure, valueType: 'boolean' }
    );

    updateSettings(updates, {
      onSuccess: () => {
        callbacks?.onSaveSuccess?.();
      },
      onError: (error) => {
        callbacks?.onSaveError?.(String(error));
      },
    });
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de que quieres resetear todos los ajustes a sus valores por defecto?')) {
      resetSettings(undefined, {
        onSuccess: () => {
          setLocalSettings(DEFAULT_SETTINGS);
          callbacks?.onResetSuccess?.();
        },
        onError: (error) => {
          callbacks?.onResetError?.(String(error));
        },
      });
    }
  };

  return {
    localSettings,
    setLocalSettings,
    handleSave,
    handleReset,
    isLoading,
    error,
    isUpdating,
    isResetting,
  };
};
