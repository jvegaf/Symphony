/**
 * Settings Hooks - Gestión de configuración de la aplicación (Svelte version)
 * 
 * AIDEV-NOTE: Migrado de React hooks a TanStack Svelte Query
 * - createQuery y createMutation en lugar de useQuery/useMutation
 * - Retorna stores reactivos
 * - Compatible con Svelte 5 runes
 */
import { invoke } from '@tauri-apps/api/core';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';

import {
	settingsArrayToAppSettings,
	stringifySettingValue
} from '../../types/settings';

import type { Setting } from '../../types/settings';

/**
 * Hook para obtener un setting específico
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const settingQuery = useGetSetting(() => 'ui.theme');
 *   const theme = $derived($settingQuery.data);
 * </script>
 * ```
 */
export function useGetSetting(key: () => string) {
	return createQuery<Setting | null, Error>(() => ({
		queryKey: ['setting', key()],
		queryFn: async () => {
			const setting = await invoke<Setting | null>('get_setting', { key: key() });
			return setting;
		},
		staleTime: 5 * 60 * 1000 // 5 minutos
	}));
}

/**
 * Hook para obtener todos los settings parseados como AppSettings
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const settingsQuery = useGetAllSettings();
 *   const settings = $derived($settingsQuery.data);
 * </script>
 * 
 * <p>Theme: {settings?.ui.theme}</p>
 * ```
 */
export function useGetAllSettings() {
	return createQuery(() => ({
		queryKey: ['settings'],
		queryFn: async () => {
			const settings = await invoke<Setting[]>('get_all_settings');
			return settingsArrayToAppSettings(settings);
		},
		staleTime: 5 * 60 * 1000
	}));
}

/**
 * Hook para actualizar un setting
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const updateSetting = useUpdateSetting();
 *   
 *   function changeTheme() {
 *     $updateSetting.mutate({
 *       key: 'ui.theme',
 *       value: 'dark',
 *       valueType: 'string'
 *     });
 *   }
 * </script>
 * ```
 */
export function useUpdateSetting() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: async ({
			key,
			value,
			valueType
		}: {
			key: string;
			value: string;
			valueType: Setting['valueType'];
		}) => {
			await invoke('update_setting', { key, value, valueType });
		},
		onSuccess: (_data: unknown, variables: { key: string; value: string; valueType: Setting['valueType'] }) => {
			// Invalidar queries relacionadas para forzar refetch
			queryClient.invalidateQueries({ queryKey: ['settings'] });
			queryClient.invalidateQueries({ queryKey: ['setting', variables.key] });
		}
	}));
}

/**
 * Hook para actualizar múltiples settings a la vez
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const updateSettings = useUpdateSettings();
 *   
 *   function saveSettings() {
 *     $updateSettings.mutate([
 *       { key: 'ui.theme', value: 'dark', valueType: 'string' },
 *       { key: 'ui.language', value: 'es', valueType: 'string' }
 *     ]);
 *   }
 * </script>
 * ```
 */
export function useUpdateSettings() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: async (
			settings: Array<{ key: string; value: unknown; valueType: Setting['valueType'] }>
		) => {
			// Actualizar todos los settings secuencialmente
			for (const setting of settings) {
				const stringValue = stringifySettingValue(setting.value, setting.valueType);
				await invoke('update_setting', {
					key: setting.key,
					value: stringValue,
					valueType: setting.valueType
				});
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['settings'] });
		}
	}));
}

/**
 * Hook para resetear todos los settings a valores por defecto
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const resetSettings = useResetSettings();
 *   
 *   function handleReset() {
 *     if (confirm('Reset all settings?')) {
 *       $resetSettings.mutate();
 *     }
 *   }
 * </script>
 * ```
 */
export function useResetSettings() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: async () => {
			await invoke('reset_settings');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['settings'] });
		}
	}));
}

/**
 * Hook conveniente para gestionar todas las operaciones de settings
 * 
 * AIDEV-NOTE: Este es un wrapper de conveniencia que combina queries y mutations.
 * En Svelte 5, los consumers deben usar $derived para acceder a los datos de los stores.
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const settings = useSettings();
 *   
 *   const appSettings = $derived($settings.query.data);
 *   const isLoading = $derived($settings.query.isLoading);
 *   const isUpdating = $derived($settings.updateMutation.isPending || $settings.updateMultipleMutation.isPending);
 *   
 *   function saveChanges() {
 *     $settings.updateMultipleMutation.mutate([
 *       { key: 'ui.theme', value: 'dark', valueType: 'string' }
 *     ]);
 *   }
 * </script>
 * ```
 */
export function useSettings() {
	const query = useGetAllSettings();
	const updateSetting = useUpdateSetting();
	const updateMultiple = useUpdateSettings();
	const reset = useResetSettings();

	return {
		query,
		updateMutation: updateSetting,
		updateMultipleMutation: updateMultiple,
		resetMutation: reset
	};
}
