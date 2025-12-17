import { invoke } from '@tauri-apps/api/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { settingsArrayToAppSettings, stringifySettingValue } from '../types/settings';

import type { Setting } from '../types/settings';

/**
 * Hook para obtener un setting específico
 */
export function useGetSetting(key: string) {
  return useQuery({
    queryKey: ['setting', key],
    queryFn: async () => {
      const setting = await invoke<Setting | null>('get_setting', { key });
      return setting;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener todos los settings parseados como AppSettings
 */
export function useGetAllSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const settings = await invoke<Setting[]>('get_all_settings');
      return settingsArrayToAppSettings(settings);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para actualizar un setting
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
      valueType,
    }: {
      key: string;
      value: string;
      valueType: Setting['valueType'];
    }) => {
      await invoke('update_setting', { key, value, valueType });
    },
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas para forzar refetch
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['setting', variables.key] });
    },
  });
}

/**
 * Hook para actualizar múltiples settings a la vez
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Array<{ key: string; value: unknown; valueType: Setting['valueType'] }>) => {
      // Actualizar todos los settings secuencialmente
      for (const setting of settings) {
        const stringValue = stringifySettingValue(setting.value, setting.valueType);
        await invoke('update_setting', {
          key: setting.key,
          value: stringValue,
          valueType: setting.valueType,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

/**
 * Hook para resetear todos los settings a valores por defecto
 */
export function useResetSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await invoke('reset_settings');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

/**
 * Hook conveniente para gestionar todas las operaciones de settings
 */
export function useSettings() {
  const { data: settings, isLoading, error } = useGetAllSettings();
  const updateSetting = useUpdateSetting();
  const updateMultiple = useUpdateSettings();
  const reset = useResetSettings();

  return {
    settings: settings ?? null,
    isLoading,
    error,
    updateSetting: updateSetting.mutate,
    updateSettings: updateMultiple.mutate,
    resetSettings: reset.mutate,
    isUpdating: updateSetting.isPending || updateMultiple.isPending,
    isResetting: reset.isPending,
  };
}
