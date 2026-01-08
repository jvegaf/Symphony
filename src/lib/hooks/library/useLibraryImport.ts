/**
 * Library Import - Hook para importación de biblioteca (Svelte version)
 * 
 * AIDEV-NOTE: Migrado de React hooks a TanStack Svelte Query + Svelte 5 runes
 * - createMutation para la operación de importación
 * - Writable store para progress state (reactivo)
 * - $effect para escuchar eventos de Tauri
 * - Compatible con Svelte 5 runes
 */
import type { UnlistenFn } from '@tauri-apps/api/event';
import { listen } from '@tauri-apps/api/event';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { writable } from 'svelte/store';
import type { ImportProgress, ImportResult } from '../../../types/library';

/**
 * Hook para importar biblioteca musical
 * 
 * AIDEV-NOTE: Este hook combina:
 * 1. createMutation para la operación async de importación
 * 2. Writable store para el progreso (actualizado por eventos de Tauri)
 * 3. Setup de listeners en un efecto
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useImportLibrary } from '$lib/hooks/library';
 *   
 *   const { mutation, progress, setupListeners, cleanup } = useImportLibrary();
 *   
 *   // Setup listeners cuando el componente monta
 *   $effect(() => {
 *     setupListeners();
 *     return cleanup;
 *   });
 *   
 *   function handleImport() {
 *     $mutation.mutate("/path/to/music", {
 *       onSuccess: (result) => {
 *         console.log(`Importadas ${result.imported} pistas`);
 *       }
 *     });
 *   }
 *   
 *   const currentProgress = $derived($progress);
 *   const isImporting = $derived($mutation.isPending);
 * </script>
 * 
 * {#if isImporting}
 *   <p>Importando: {currentProgress.current} / {currentProgress.total}</p>
 * {/if}
 * ```
 */
export const useImportLibrary = () => {
	// Store reactivo para el progreso
	const progress = writable<ImportProgress>({
		current: 0,
		total: 0,
		phase: 'scanning'
	});

	const queryClient = useQueryClient();

	// Mutation para la operación de importación
	const mutation = createMutation<ImportResult, Error, string>(() => ({
		mutationFn: async (path: string) => {
			const result = await invoke<ImportResult>('import_library', { path });
			return result;
		},
		onSuccess: () => {
			// Reset progress después de éxito
			progress.set({ current: 0, total: 0, phase: 'complete' });
		}
	}));

	// Función para setup de listeners (debe ser llamada en $effect)
	let unlistenProgress: UnlistenFn | undefined;
	let unlistenComplete: UnlistenFn | undefined;

	const setupListeners = async () => {
		// Listener para progreso
		unlistenProgress = await listen<ImportProgress>('library:import-progress', (event) => {
			progress.set(event.payload);
		});

		// Listener para completado
		unlistenComplete = await listen<ImportResult>('library:import-complete', () => {
			// Invalidar queries para refrescar datos
			queryClient.invalidateQueries({ queryKey: ['tracks'] });
			queryClient.invalidateQueries({ queryKey: ['library-stats'] });
		});
	};

	// Función de cleanup
	const cleanup = () => {
		unlistenProgress?.();
		unlistenComplete?.();
	};

	return {
		mutation,
		progress,
		setupListeners,
		cleanup
	};
};
