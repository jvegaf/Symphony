import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import * as useSettingsHook from '../useSettings';
import { useFirstRun } from './useFirstRun';

import type { AppSettings } from '../../types/settings';

// Mock del hook useGetAllSettings
const mockUseGetAllSettings = vi.fn();
const mockUpdateMutate = vi.fn();

vi.spyOn(useSettingsHook, 'useGetAllSettings').mockImplementation(mockUseGetAllSettings);
vi.spyOn(useSettingsHook, 'useUpdateSetting').mockReturnValue({
  mutate: mockUpdateMutate,
  isPending: false,
} as any);

/**
 * Helper para crear un QueryClient wrapper para los tests
 */
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

describe('useFirstRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Estado de carga', () => {
    it('debería retornar isLoading=true mientras se cargan los settings', () => {
      mockUseGetAllSettings.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { result } = renderHook(() => useFirstRun(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFirstRun).toBe(false);
    });
  });

  describe('Detección de primer arranque', () => {
    it('debería retornar isFirstRun=true cuando firstRunCompleted es false', () => {
      const mockSettings: AppSettings = {
        app: { firstRunCompleted: false },
        ui: { theme: 'system', language: 'es', waveformResolution: 512 },
        audio: { outputDevice: 'default', sampleRate: 44100, bufferSize: 2048 },
        library: { autoScanOnStartup: false, scanIntervalHours: 24, importFolder: '' },
        conversion: {
          enabled: false,
          autoConvert: false,
          bitrate: 320,
          outputFolder: '',
          preserveStructure: true,
        },
      };

      mockUseGetAllSettings.mockReturnValue({
        data: mockSettings,
        isLoading: false,
      });

      const { result } = renderHook(() => useFirstRun(), { wrapper: createWrapper() });

      expect(result.current.isFirstRun).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('debería retornar isFirstRun=false cuando firstRunCompleted es true', () => {
      const mockSettings: AppSettings = {
        app: { firstRunCompleted: true },
        ui: { theme: 'system', language: 'es', waveformResolution: 512 },
        audio: { outputDevice: 'default', sampleRate: 44100, bufferSize: 2048 },
        library: { autoScanOnStartup: false, scanIntervalHours: 24, importFolder: '' },
        conversion: {
          enabled: false,
          autoConvert: false,
          bitrate: 320,
          outputFolder: '',
          preserveStructure: true,
        },
      };

      mockUseGetAllSettings.mockReturnValue({
        data: mockSettings,
        isLoading: false,
      });

      const { result } = renderHook(() => useFirstRun(), { wrapper: createWrapper() });

      expect(result.current.isFirstRun).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Completar primer arranque', () => {
    it('debería llamar updateSetting con los parámetros correctos', () => {
      const mockSettings: AppSettings = {
        app: { firstRunCompleted: false },
        ui: { theme: 'system', language: 'es', waveformResolution: 512 },
        audio: { outputDevice: 'default', sampleRate: 44100, bufferSize: 2048 },
        library: { autoScanOnStartup: false, scanIntervalHours: 24, importFolder: '' },
        conversion: {
          enabled: false,
          autoConvert: false,
          bitrate: 320,
          outputFolder: '',
          preserveStructure: true,
        },
      };

      mockUseGetAllSettings.mockReturnValue({
        data: mockSettings,
        isLoading: false,
      });

      const { result } = renderHook(() => useFirstRun(), { wrapper: createWrapper() });

      // Llamar a la función
      result.current.completeFirstRun();

      // Verificar que se llamó al mutate con los parámetros correctos
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        key: 'app.first_run_completed',
        value: 'true',
        valueType: 'boolean',
      });
    });

    it('debería indicar isUpdating=true mientras se actualiza el setting', () => {
      const mockSettings: AppSettings = {
        app: { firstRunCompleted: false },
        ui: { theme: 'system', language: 'es', waveformResolution: 512 },
        audio: { outputDevice: 'default', sampleRate: 44100, bufferSize: 2048 },
        library: { autoScanOnStartup: false, scanIntervalHours: 24, importFolder: '' },
        conversion: {
          enabled: false,
          autoConvert: false,
          bitrate: 320,
          outputFolder: '',
          preserveStructure: true,
        },
      };

      mockUseGetAllSettings.mockReturnValue({
        data: mockSettings,
        isLoading: false,
      });

      // Mock isPending = true
      vi.spyOn(useSettingsHook, 'useUpdateSetting').mockReturnValue({
        mutate: mockUpdateMutate,
        isPending: true,
      } as any);

      const { result } = renderHook(() => useFirstRun(), { wrapper: createWrapper() });

      expect(result.current.isUpdating).toBe(true);
    });
  });

  describe('Casos edge', () => {
    it('debería manejar correctamente cuando settings es null', () => {
      mockUseGetAllSettings.mockReturnValue({
        data: null,
        isLoading: false,
      });

      const { result } = renderHook(() => useFirstRun(), { wrapper: createWrapper() });

      expect(result.current.isFirstRun).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('debería manejar correctamente cuando settings es undefined', () => {
      mockUseGetAllSettings.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      const { result } = renderHook(() => useFirstRun(), { wrapper: createWrapper() });

      expect(result.current.isFirstRun).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
