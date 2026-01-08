<script lang="ts">
	import Toast from './Toast.svelte';
	import type { AppSettings } from '../../types/settings';
	import { DEFAULT_SETTINGS } from '../../types/settings';

	// AIDEV-TODO: Import settings tabs when migrated
	// import UISettingsTab from '../pages/Settings/tabs/UISettingsTab.svelte';
	// import AudioSettingsTab from '../pages/Settings/tabs/AudioSettingsTab.svelte';
	// import LibrarySettingsTab from '../pages/Settings/tabs/LibrarySettingsTab.svelte';
	// import ConversionSettingsTab from '../pages/Settings/tabs/ConversionSettingsTab.svelte';

	/**
	 * Props del componente SettingsModal
	 */
	interface Props {
		/** Modal está abierto */
		isOpen: boolean;
		/** Callback para cerrar el modal */
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	// Estado local
	type TabId = 'ui' | 'audio' | 'library' | 'conversion';
	let activeTab = $state<TabId>('ui');
	let toastVisible = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error' | 'info' | 'warning'>('success');

	// AIDEV-TODO: Replace with actual TanStack Svelte Query hook
	// import { useSettings } from '../../hooks/useSettings';
	// const { settings, isLoading, error, updateSettings, resetSettings, isUpdating, isResetting } = useSettings();
	let isLoading = $state(false);
	let error = $state<Error | null>(null);
	let isUpdating = $state(false);
	let isResetting = $state(false);
	let localSettings = $state<AppSettings>(DEFAULT_SETTINGS);

	// Definición de tabs
	const tabs: Array<{ id: TabId; label: string; icon: string }> = [
		{ id: 'ui', label: '🎨 Interfaz', icon: '🎨' },
		{ id: 'audio', label: '🔊 Audio', icon: '🔊' },
		{ id: 'library', label: '📚 Biblioteca', icon: '📚' },
		{ id: 'conversion', label: '💿 Conversión', icon: '💿' }
	];

	/**
	 * Muestra un toast con el mensaje especificado
	 * Usado por tabs que necesitan mostrar notificaciones
	 */
	function showToast(message: string) {
		toastMessage = message;
		toastType = message.startsWith('✅') ? 'success' : 'error';
		toastVisible = true;
	}

	/**
	 * Guarda los cambios al servidor
	 * AIDEV-TODO: Implement with TanStack Svelte Query mutation
	 */
	async function handleSave() {
		console.log('AIDEV-TODO: Implement settings save with TanStack Svelte Query');
		console.log('Settings to save:', localSettings);

		// Simulate API call
		isUpdating = true;
		try {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			showToast('✅ Configuración guardada correctamente');
			isUpdating = false;
		} catch (err) {
			showToast(`❌ Error: ${err}`);
			isUpdating = false;
		}
	}

	/**
	 * Reinicia configuración a valores por defecto
	 * AIDEV-TODO: Implement with TanStack Svelte Query mutation
	 */
	async function handleReset() {
		if (
			confirm(
				'¿Estás seguro de que quieres resetear todos los ajustes a sus valores por defecto?'
			)
		) {
			console.log('AIDEV-TODO: Implement settings reset with TanStack Svelte Query');

			isResetting = true;
			try {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				localSettings = { ...DEFAULT_SETTINGS };
				showToast('✅ Configuración restablecida a valores predeterminados');
				isResetting = false;
			} catch (err) {
				showToast(`❌ Error al restablecer: ${err}`);
				isResetting = false;
			}
		}
	}

	/**
	 * Maneja tecla Escape para cerrar modal
	 */
	$effect(() => {
		if (!isOpen) return;

		function handleEscape(e: KeyboardEvent) {
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		}

		window.addEventListener('keydown', handleEscape);
		return () => window.removeEventListener('keydown', handleEscape);
	});
</script>

{#if isOpen}
	<!-- Backdrop -->
	<button
		type="button"
		class="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm border-0 w-full h-full cursor-default"
		onclick={onClose}
		data-testid="settings-modal-backdrop"
		aria-label="Cerrar modal de configuración"
	></button>

	<!-- Modal Container -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
		data-testid="settings-modal-container"
	>
		<div
			class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col pointer-events-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-modal-title"
			data-testid="settings-modal"
		>
			<!-- Header -->
			<div
				class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 py-4 rounded-t-xl"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<div class="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
							<svg
								class="w-5 h-5 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<title>Configuración</title>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width={2}
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width={2}
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</div>
						<h2
							id="settings-modal-title"
							class="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent"
						>
							Configuración
						</h2>
					</div>
					<button
						type="button"
						onclick={onClose}
						class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
						data-testid="settings-modal-close"
						aria-label="Cerrar configuración"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<title>Cerrar</title>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Loading/Error States -->
			{#if isLoading}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-gray-500 dark:text-gray-400">Cargando configuración...</div>
				</div>
			{:else if error}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-red-600 dark:text-red-400">
						Error al cargar configuración: {error.message}
					</div>
				</div>
			{:else}
				<!-- Main Content -->
				<div class="flex-1 flex overflow-hidden">
					<!-- Sidebar - Tabs Navigation -->
					<div
						class="w-56 flex-shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-r border-gray-200 dark:border-gray-800 p-3"
					>
						<nav class="space-y-2">
							{#each tabs as tab}
								<button
									type="button"
									data-testid={`settings-tab-${tab.id}`}
									onclick={() => (activeTab = tab.id)}
									class={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
										activeTab === tab.id
											? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
											: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
									}`}
								>
									<span class="text-lg">{tab.icon}</span>
									<span class="font-medium text-sm">{tab.label}</span>
								</button>
							{/each}
						</nav>
					</div>

					<!-- Content Area -->
					<div class="flex-1 overflow-y-auto p-4">
						<div class="w-full">
							<!-- AIDEV-TODO: Replace with actual tab components when migrated -->
							{#if activeTab === 'ui'}
								<div class="p-8 text-center text-gray-500 dark:text-gray-400">
									<h3 class="text-lg font-semibold mb-2">🎨 Configuración de Interfaz</h3>
									<p class="text-sm">
										AIDEV-TODO: Migrar UISettingsTab.tsx a Svelte<br />
										Incluye: Tema, Idioma, Resolución de waveform
									</p>
								</div>
							{:else if activeTab === 'audio'}
								<div class="p-8 text-center text-gray-500 dark:text-gray-400">
									<h3 class="text-lg font-semibold mb-2">🔊 Configuración de Audio</h3>
									<p class="text-sm">
										AIDEV-TODO: Migrar AudioSettingsTab.tsx a Svelte<br />
										Incluye: Dispositivo de salida, Sample rate, Buffer size
									</p>
								</div>
							{:else if activeTab === 'library'}
								<div class="p-8 text-center text-gray-500 dark:text-gray-400">
									<h3 class="text-lg font-semibold mb-2">📚 Configuración de Biblioteca</h3>
									<p class="text-sm">
										AIDEV-TODO: Migrar LibrarySettingsTab.tsx a Svelte<br />
										Incluye: Auto-scan, Intervalo de scan, Carpeta de importación
									</p>
								</div>
							{:else if activeTab === 'conversion'}
								<div class="p-8 text-center text-gray-500 dark:text-gray-400">
									<h3 class="text-lg font-semibold mb-2">💿 Configuración de Conversión</h3>
									<p class="text-sm">
										AIDEV-TODO: Migrar ConversionSettingsTab.tsx a Svelte<br />
										Incluye: Auto-conversión, Bitrate, Carpeta de salida
									</p>
								</div>
							{/if}

							<!-- Action Buttons -->
							<div
								class="mt-6 flex items-center space-x-4 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl"
							>
								<button
									type="button"
									data-testid="settings-save-button"
									onclick={handleSave}
									disabled={isUpdating || isResetting}
									class="flex-1 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
								>
									{#if isUpdating}
										<span class="flex items-center justify-center space-x-2">
											<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
												<title>Guardando</title>
												<circle
													class="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													stroke-width="4"
												/>
												<path
													class="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												/>
											</svg>
											<span>Guardando...</span>
										</span>
									{:else}
										💾 Guardar Cambios
									{/if}
								</button>

								<button
									type="button"
									data-testid="settings-reset-button"
									onclick={handleReset}
									disabled={isUpdating || isResetting}
									class="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
								>
									{#if isResetting}
										<span class="flex items-center space-x-2">
											<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
												<title>Reiniciando</title>
												<circle
													class="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													stroke-width="4"
												/>
												<path
													class="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												/>
											</svg>
											<span>Reiniciando...</span>
										</span>
									{:else}
										🔄 Reiniciar
									{/if}
								</button>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Toast Notifications -->
	{#if toastVisible}
		<Toast message={toastMessage} type={toastType} onClose={() => (toastVisible = false)} />
	{/if}
{/if}
