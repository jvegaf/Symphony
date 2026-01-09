<script lang="ts">
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
	import { Menu, MenuItem } from '@tauri-apps/api/menu';
	import { LogicalPosition } from '@tauri-apps/api/dpi';
	import { confirm } from '@tauri-apps/plugin-dialog';
	import {
		useGetPlaylists,
		useCreatePlaylist,
		useUpdatePlaylist,
		useDeletePlaylist,
		useAddTracksToPlaylist,
		useCreatePlaylistWithTracks
	} from '@/lib/hooks/playlists';
	import type { Playlist } from '@/types/playlist';

	interface Props {
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

	let {
		searchQuery = $bindable(),
		onSearchChange,
		totalTracks,
		pendingTracksForNewPlaylist,
		onPlaylistCreatedWithTracks,
		selectedPlaylistId,
		onSelectPlaylist
	}: Props = $props();

	interface EditingPlaylist {
		/** ID de playlist existente, o null si es nuevo */
		id: string | null;
		/** Nombre actual del input */
		name: string;
		/** IDs de tracks a agregar (solo para nuevos playlists) */
		trackIds?: string[];
	}

	// AIDEV-NOTE: TanStack Svelte Query hooks - llamados al top level
	// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
	const playlistsQuery = useGetPlaylists();
	// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
	const createPlaylistMutation = useCreatePlaylist();
	// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
	const updatePlaylistMutation = useUpdatePlaylist();
	// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
	const deletePlaylistMutation = useDeletePlaylist();
	// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
	const addTracksToPlaylistMutation = useAddTracksToPlaylist();
	// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
	const createPlaylistWithTracksMutation = useCreatePlaylistWithTracks();

	// AIDEV-NOTE: Reactive derived state - usa $ para queries, no para mutations
	const isLoadingPlaylists = $derived($playlistsQuery.isLoading);
	const playlists = $derived($playlistsQuery.data ?? []);
	const isPending = $derived(
		createPlaylistMutation.isPending ||
			updatePlaylistMutation.isPending ||
			deletePlaylistMutation.isPending ||
			addTracksToPlaylistMutation.isPending ||
			createPlaylistWithTracksMutation.isPending
	);

	// AIDEV-NOTE: Estado para playlist en edición (nuevo o existente)
	let editingPlaylist = $state<EditingPlaylist | null>(null);

	// AIDEV-NOTE: Estado para drag and drop - playlist sobre la que se está haciendo hover
	let dropTargetPlaylistId = $state<string | null>(null);

	let inputElement: HTMLInputElement | undefined = $state();

	// AIDEV-NOTE: Flag para evitar doble submit (Enter + onBlur)
	let isSubmitting = $state(false);

	// AIDEV-NOTE: Flag para evitar re-focus cuando el usuario está escribiendo
	let hasFocused = $state(false);

	// AIDEV-NOTE: Auto-focus en el input cuando se inicia edición (solo una vez)
	$effect(() => {
		// Solo hacer focus si hay un playlist en edición y no hemos hecho focus aún
		if (editingPlaylist && inputElement && !hasFocused) {
			hasFocused = true;

			// Pequeño delay para asegurar que el DOM está listo
			const timer = setTimeout(() => {
				if (inputElement) {
					inputElement.focus();
					// Siempre poner cursor al final (funciona bien tanto para nuevo como para edición)
					const len = inputElement.value.length;
					inputElement.setSelectionRange(len, len);
				}
			}, 0);

			return () => clearTimeout(timer);
		}

		// Resetear flag cuando se termina la edición
		if (!editingPlaylist) {
			hasFocused = false;
		}
	});

	// AIDEV-NOTE: Cuando llegan tracks pendientes desde context menu, crear nuevo playlist
	$effect(() => {
		if (
			pendingTracksForNewPlaylist &&
			pendingTracksForNewPlaylist.trackIds.length > 0 &&
			!editingPlaylist
		) {
			editingPlaylist = {
				id: null,
				name: 'Nuevo Playlist',
				trackIds: pendingTracksForNewPlaylist.trackIds
			};
			// Limpiamos inmediatamente para evitar re-triggers
			onPlaylistCreatedWithTracks?.();
		}
	});

	/**
	 * Inicia la creación de un nuevo playlist vacío (botón +)
	 */
	function handleAddPlaylistClick() {
		editingPlaylist = {
			id: null,
			name: 'Nuevo Playlist'
		};
	}

	/**
	 * Inicia la edición del nombre de un playlist existente (doble click)
	 */
	function handlePlaylistDoubleClick(playlist: Playlist) {
		if (playlist.id) {
			editingPlaylist = {
				id: playlist.id,
				name: playlist.name
			};
		}
	}

	/**
	 * Muestra context menu para playlist (click derecho)
	 */
	async function handlePlaylistContextMenu(e: MouseEvent, playlist: Playlist) {
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
					$deletePlaylistMutation.mutate(playlist.id, {
						onSuccess: () => {
							// AIDEV-NOTE: Si la playlist eliminada estaba seleccionada, volver a All Tracks
							if (selectedPlaylistId === playlist.id) {
								onSelectPlaylist?.(null);
							}
						},
						onError: (err: Error) => {
							alert(`Error al eliminar playlist: ${err.message}`);
						}
					});
				}
			}
		});
		menuItems.push(deleteItem);

		const menu = await Menu.new({ items: menuItems });
		await menu.popup(new LogicalPosition(e.clientX, e.clientY));
	}

	/**
	 * Confirma la creación/edición del playlist
	 * AIDEV-NOTE: Usa isSubmitting para evitar doble submit cuando
	 * Enter dispara onBlur también
	 */
	async function handleConfirmEdit() {
		if (!editingPlaylist) return;

		// Evitar doble submit
		if (isSubmitting) return;
		isSubmitting = true;

		const name = editingPlaylist.name.trim();

		if (!name) {
			// Si el nombre está vacío, cancelar
			editingPlaylist = null;
			isSubmitting = false;
			return;
		}

		if (editingPlaylist.id === null) {
			// Crear nuevo playlist
			if (editingPlaylist.trackIds && editingPlaylist.trackIds.length > 0) {
				// AIDEV-NOTE: Crear playlist con tracks (desde context menu)
				$createPlaylistWithTracksMutation.mutate(
					{
						name,
						description: null,
						trackIds: editingPlaylist.trackIds
					},
					{
						onSuccess: () => {
							// Limpiar estado de edición
							editingPlaylist = null;
							isSubmitting = false;
						},
						onError: (err: Error) => {
							alert(`Error al crear playlist: ${err.message}`);
							isSubmitting = false;
						}
					}
				);
			} else {
				// AIDEV-NOTE: Crear playlist vacío (desde botón +)
				$createPlaylistMutation.mutate(
					{
						name,
						description: null
					},
					{
						onSuccess: () => {
							// Limpiar estado de edición
							editingPlaylist = null;
							isSubmitting = false;
						},
						onError: (err: Error) => {
							alert(`Error al crear playlist: ${err.message}`);
							isSubmitting = false;
						}
					}
				);
			}
		} else {
			// AIDEV-NOTE: Actualizar nombre de playlist existente
			$updatePlaylistMutation.mutate(
				{
					id: editingPlaylist.id,
					name
				},
				{
					onSuccess: () => {
						// Limpiar estado de edición
						editingPlaylist = null;
						isSubmitting = false;
					},
					onError: (err: Error) => {
						alert(`Error al actualizar playlist: ${err.message}`);
						isSubmitting = false;
					}
				}
			);
		}

		// AIDEV-NOTE: No ejecutar editingPlaylist = null aquí - lo hace onSuccess/onError
		// para evitar race conditions con el async mutation
	}

	/**
	 * Cancela la edición
	 */
	function handleCancelEdit() {
		editingPlaylist = null;
	}

	/**
	 * Maneja teclas en el input de edición
	 */
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleConfirmEdit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			handleCancelEdit();
		}
	}

	/**
	 * Maneja el evento dragEnter sobre una playlist
	 * AIDEV-NOTE: Solo acepta drops si el payload es de tipo "tracks"
	 */
	function handlePlaylistDragEnter(e: DragEvent, playlistId: string) {
		e.preventDefault();
		e.stopPropagation();
		dropTargetPlaylistId = playlistId;
	}

	/**
	 * Maneja el evento dragOver sobre una playlist
	 */
	function handlePlaylistDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
	}

	/**
	 * Maneja el evento dragLeave sobre una playlist
	 */
	function handlePlaylistDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		// Solo resetear si el mouse realmente salió del elemento
		// (evita flickering cuando el mouse pasa sobre elementos hijos)
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = e.clientX;
		const y = e.clientY;
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			dropTargetPlaylistId = null;
		}
	}

	/**
	 * Maneja el drop de tracks sobre una playlist
	 * AIDEV-NOTE: Parsea el JSON del dataTransfer y llama al backend
	 */
	function handlePlaylistDrop(e: DragEvent, playlistId: string) {
		e.preventDefault();
		e.stopPropagation();
		dropTargetPlaylistId = null;

		try {
			if (!e.dataTransfer) return;
			const data = JSON.parse(e.dataTransfer.getData('application/json'));
			if (data.type === 'tracks' && data.trackIds && data.trackIds.length > 0) {
				// AIDEV-NOTE: Agregar múltiples tracks a playlist (drag and drop)
				$addTracksToPlaylistMutation.mutate(
					{
						playlistId,
						trackIds: data.trackIds
					},
					{
						onSuccess: (count: number) => {
							console.log(`${count} tracks agregados a playlist ${playlistId}`);
						},
						onError: (err: Error) => {
							alert(`Error al agregar tracks: ${err.message}`);
						}
					}
				);
			}
		} catch {
			// Ignorar errores de parsing (drag desde otra fuente)
		}
	}
</script>

<aside class="w-64 bg-gray-100/30 dark:bg-gray-900/40 p-4 space-y-4 flex-shrink-0">
	<!-- Search -->
	<div class="relative">
		<span
			class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg"
		>
			search
		</span>
		<input
			type="text"
			bind:value={searchQuery}
			onchange={() => onSearchChange(searchQuery)}
			class="w-full bg-gray-200/50 dark:bg-gray-800/60 border-none rounded pl-10 pr-3 py-2 text-sm focus:ring-primary focus:ring-1 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
			placeholder="Search... All Tracks"
		/>
	</div>

	<!-- Navigation -->
	<nav class="space-y-1 text-sm">
		<button
			type="button"
			class="w-full flex justify-between items-center px-3 py-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-left"
		>
			<span>Queue</span>
		</button>
		<button
			type="button"
			onclick={() => onSelectPlaylist?.(null)}
			class="w-full flex justify-between items-center px-3 py-1.5 rounded text-left {selectedPlaylistId ===
			null
				? 'bg-gray-200/50 dark:bg-gray-700/50 font-semibold text-gray-800 dark:text-gray-200'
				: 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}"
		>
			<span>All Tracks [{totalTracks}]</span>
			{#if selectedPlaylistId === null}
				<span class="material-icons text-primary text-lg">equalizer</span>
			{/if}
		</button>
		<button
			type="button"
			class="w-full flex justify-between items-center px-3 py-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-left"
		>
			<span>Recently Added [{totalTracks}]</span>
		</button>
		<button
			type="button"
			class="w-full flex justify-between items-center px-3 py-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-left"
		>
			<span>
				Watch Folder <span class="text-gray-500">[Inactive]</span>
			</span>
		</button>
	</nav>

	<div class="border-t border-gray-200/50 dark:border-gray-700/50 my-2"></div>

	<!-- Playlists -->
	<div>
		<div class="flex justify-between items-center mb-2">
			<h3
				class="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider"
			>
				Playlists
			</h3>
			<button
				type="button"
				onclick={handleAddPlaylistClick}
				disabled={isPending || editingPlaylist !== null}
				class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
				title="Crear nuevo playlist"
			>
				<span class="material-icons text-lg">add</span>
			</button>
		</div>

		<!-- Lista de playlists -->
		<div class="space-y-1 text-sm">
			<!-- Input para nuevo playlist (al principio de la lista) -->
			{#if editingPlaylist?.id === null}
				<div class="px-2">
					<input
						bind:this={inputElement}
						type="text"
						bind:value={editingPlaylist.name}
						onkeydown={handleKeyDown}
						onblur={handleConfirmEdit}
						disabled={isPending}
						class="w-full bg-white dark:bg-gray-800 border border-primary rounded px-2 py-1 text-sm focus:ring-primary focus:ring-1 focus:outline-none text-gray-800 dark:text-gray-200"
						placeholder="Nombre del playlist"
					/>
				</div>
			{/if}

			{#if isLoadingPlaylists}
				<p class="text-xs text-gray-400 dark:text-gray-500 px-3">Cargando playlists...</p>
			{:else if playlists.length === 0 && !editingPlaylist}
				<p class="text-xs text-gray-400 dark:text-gray-500 px-3">No hay playlists</p>
			{:else}
				{#each playlists as playlist (playlist.id)}
					<div>
						{#if editingPlaylist?.id === playlist.id}
							<!-- Modo edición para playlist existente -->
							<div class="px-2">
								<input
									bind:this={inputElement}
									type="text"
									bind:value={editingPlaylist.name}
									onkeydown={handleKeyDown}
									onblur={handleConfirmEdit}
									disabled={isPending}
									class="w-full bg-white dark:bg-gray-800 border border-primary rounded px-2 py-1 text-sm focus:ring-primary focus:ring-1 focus:outline-none text-gray-800 dark:text-gray-200"
								/>
							</div>
						{:else}
							<!-- Modo visualización con context menu y drop zone -->
							<button
								type="button"
								onclick={() => onSelectPlaylist?.(playlist.id)}
								ondblclick={() => handlePlaylistDoubleClick(playlist)}
								oncontextmenu={(e) => handlePlaylistContextMenu(e, playlist)}
								ondragenter={(e) => playlist.id && handlePlaylistDragEnter(e, playlist.id)}
								ondragover={handlePlaylistDragOver}
								ondragleave={handlePlaylistDragLeave}
								ondrop={(e) => playlist.id && handlePlaylistDrop(e, playlist.id)}
								class="w-full flex items-center px-3 py-1.5 rounded text-left transition-all {dropTargetPlaylistId ===
								playlist.id
									? 'bg-primary/20 ring-2 ring-primary ring-opacity-50'
									: selectedPlaylistId === playlist.id
										? 'bg-gray-200/50 dark:bg-gray-700/50 font-semibold text-gray-800 dark:text-gray-200'
										: 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}"
								title="Click para ver tracks, doble click para renombrar, click derecho para más opciones"
							>
								<span
									class="material-icons text-sm mr-2 {dropTargetPlaylistId === playlist.id
										? 'text-primary'
										: selectedPlaylistId === playlist.id
											? 'text-primary'
											: 'text-gray-400'}"
								>
									{dropTargetPlaylistId === playlist.id ? 'add_circle' : 'queue_music'}
								</span>
								<span class="truncate flex-1">{playlist.name}</span>
								{#if selectedPlaylistId === playlist.id}
									<span class="material-icons text-primary text-lg ml-1">equalizer</span>
								{/if}
							</button>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
</aside>
