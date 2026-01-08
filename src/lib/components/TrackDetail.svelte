<script lang="ts">
	import { open as openDialog } from '@tauri-apps/plugin-dialog';
	import { invoke } from '@tauri-apps/api/core';
	import { open as openUrl } from '@tauri-apps/plugin-opener';
	import type { Track } from '../../types/library';
	import { useGetTrack, useUpdateTrackMetadata } from '../hooks/library';

	/**
	 * Componente para ver y editar metadatos de un track individual
	 *
	 * AIDEV-NOTE: Migrado de React a Svelte 5 con todas las features:
	 * - Header con icono, filename y botón Save
	 * - Layout 2 columnas: izquierda (artwork + botones), derecha (campos)
	 * - Inputs con estilo rounded-full y colores oscuros
	 * - Soporte para navegación entre tracks (Previous/Next)
	 * - Confirmación de cambios sin guardar al cerrar con Escape
	 * - Integrado con TanStack Svelte Query para data fetching y mutations
	 * - AIDEV-TODO: Integrate useArtwork hook for artwork loading
	 */

	/**
	 * Props del componente
	 */
	interface Props {
		/** ID del track a mostrar */
		trackId: string;
		/** Lista de tracks para navegación (opcional) */
		tracks?: Track[];
		/** Callback para navegar a otro track */
		onNavigate?: (trackId: string) => void;
		/** Callback para abrir Fix Tags con Beatport */
		onFixTags?: (trackIds: string[]) => void;
		/** Callback para cerrar el modal */
		onClose?: () => void;
	}

	let { trackId, tracks = [], onNavigate, onFixTags, onClose }: Props = $props();

	// TanStack Svelte Query hooks
	const trackQuery = useGetTrack(() => trackId);
	const updateMetadataMutation = useUpdateTrackMetadata();

	// Reactive state from queries
	const isLoading = $derived($trackQuery.isLoading);
	const isError = $derived($trackQuery.isError);
	const track = $derived($trackQuery.data ?? null);
	const updateMutationPending = $derived($updateMetadataMutation.isPending);

	// AIDEV-TODO: Replace with useArtwork hook migration
	let artwork = $state<string | null>(null);
	let isArtworkLoading = $state(false);

	// Estado local para campos editables
	let title = $state('');
	let artist = $state('');
	let album = $state('');
	let year = $state<number>(0);
	let genre = $state('');
	let bpm = $state<number>(0);
	let key = $state('');
	let rating = $state(0);
	let comment = $state('');

	// Estados originales para detectar cambios
	let originalTitle = $state('');
	let originalArtist = $state('');
	let originalAlbum = $state('');
	let originalYear = $state<number>(0);
	let originalGenre = $state('');
	let originalBpm = $state<number>(0);
	let originalKey = $state('');
	let originalRating = $state(0);
	let originalComment = $state('');

	// UI state
	let showSuccess = $state(false);
	let showConfirmDialog = $state(false);

	// Detectar cambios
	const hasChanges = $derived(
		title !== originalTitle ||
			artist !== originalArtist ||
			album !== originalAlbum ||
			year !== originalYear ||
			genre !== originalGenre ||
			bpm !== originalBpm ||
			key !== originalKey ||
			rating !== originalRating ||
			comment !== originalComment
	);

	// Navegación entre tracks
	const currentIndex = $derived(tracks.findIndex((t) => t.id === trackId));
	const hasPrevious = $derived(currentIndex > 0);
	const hasNext = $derived(currentIndex >= 0 && currentIndex < tracks.length - 1);

	// Extraer filename del path
	function getFilename(path: string): string {
		return path.split('/').pop() || path.split('\\').pop() || '';
	}

	const filename = $derived(track ? getFilename(track.path) : '');

	/**
	 * Sincroniza el track cargado con el estado local
	 * Se llama automáticamente cuando el track cambia via $effect
	 */
	function syncTrackToState(t: Track | null) {
		if (!t) return;

		const trackTitle = t.title || '';
		const trackArtist = t.artist || '';
		const trackAlbum = t.album || '';
		const trackYear = t.year || 0;
		const trackGenre = t.genre || '';
		const trackBpm = t.bpm || 0;
		const trackKey = t.key || '';
		const trackRating = t.rating || 0;

		title = trackTitle;
		artist = trackArtist;
		album = trackAlbum;
		year = trackYear;
		genre = trackGenre;
		bpm = trackBpm;
		key = trackKey;
		rating = trackRating;
		comment = '';

		originalTitle = trackTitle;
		originalArtist = trackArtist;
		originalAlbum = trackAlbum;
		originalYear = trackYear;
		originalGenre = trackGenre;
		originalBpm = trackBpm;
		originalKey = trackKey;
		originalRating = trackRating;
		originalComment = '';
	}

	/**
	 * Extrae artista y título del filename usando patrón {artista} - {titulo}
	 */
	function handleExtractFromFilename() {
		if (!track) return;
		const fname = getFilename(track.path);
		// Quitar extensión
		const nameWithoutExt = fname.replace(/\.[^/.]+$/, '');
		// Buscar separador " - "
		const separatorIndex = nameWithoutExt.indexOf(' - ');
		if (separatorIndex > 0) {
			artist = nameWithoutExt.substring(0, separatorIndex).trim();
			title = nameWithoutExt.substring(separatorIndex + 3).trim();
		} else {
			// Sin separador, todo es título
			title = nameWithoutExt.trim();
		}
	}

	/**
	 * Guarda los cambios al servidor usando TanStack Svelte Query mutation
	 */
	function handleSave() {
		const request = {
			id: trackId,
			title,
			artist,
			album,
			year,
			genre,
			rating,
			bpm,
			key
		};

		$updateMetadataMutation.mutate(request, {
			onSuccess: () => {
				// Update original values after successful save
				originalTitle = title;
				originalArtist = artist;
				originalAlbum = album;
				originalYear = year;
				originalGenre = genre;
				originalBpm = bpm;
				originalKey = key;
				originalRating = rating;
				originalComment = comment;

				// Show success message
				showSuccess = true;
				setTimeout(() => {
					showSuccess = false;
				}, 3000);
			},
			onError: (err: Error) => {
				console.error('Error saving track metadata:', err);
				alert(`Error al guardar: ${err.message}`);
			}
		});
	}

	/**
	 * Maneja navegación a track anterior
	 */
	function handlePrevious() {
		if (hasPrevious && onNavigate) {
			const prevTrack = tracks[currentIndex - 1];
			if (prevTrack?.id) onNavigate(prevTrack.id);
		}
	}

	/**
	 * Maneja navegación a track siguiente
	 */
	function handleNext() {
		if (hasNext && onNavigate) {
			const nextTrack = tracks[currentIndex + 1];
			if (nextTrack?.id) onNavigate(nextTrack.id);
		}
	}

	/**
	 * Maneja cambio de rating
	 */
	function handleRatingChange(newRating: number) {
		const clampedRating = Math.max(0, Math.min(5, newRating));
		rating = clampedRating;
	}

	/**
	 * Confirmar y guardar cambios antes de cerrar
	 */
	async function handleConfirmSave() {
		showConfirmDialog = false;
		await handleSave();
		onClose?.();
	}

	/**
	 * Descartar cambios y cerrar
	 */
	function handleDiscardChanges() {
		showConfirmDialog = false;
		title = originalTitle;
		artist = originalArtist;
		album = originalAlbum;
		year = originalYear;
		genre = originalGenre;
		bpm = originalBpm;
		key = originalKey;
		rating = originalRating;
		comment = originalComment;
		onClose?.();
	}

	/**
	 * Manejar tecla Escape para cerrar el modal
	 * AIDEV-NOTE: Usamos capture:true para interceptar el evento antes que TrackTable
	 */
	$effect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation(); // Evita que TrackTable también lo procese
				if (hasChanges) {
					showConfirmDialog = true;
				} else {
					onClose?.();
				}
			}
		}

		// Capturar en la fase de capture para que se ejecute antes que otros listeners
		window.addEventListener('keydown', handleKeyDown, true);
		return () => window.removeEventListener('keydown', handleKeyDown, true);
	});

	/**
	 * Cargar track cuando cambia el trackId
	 */
	// Sync local editable state when track data loads or changes
	$effect(() => {
		if (track) {
			syncTrackToState(track);
		}
	});

	// Estilos comunes para inputs (matching mockup)
	const inputClass =
		'form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-full text-white focus:outline-none focus:ring-2 focus:ring-primary/80 border border-[#55483a] bg-[#2a2a2a] h-14 placeholder:text-[#bbac9b] px-5 text-base font-normal leading-normal';
	const labelClass = 'text-white text-base font-medium leading-normal pb-2';
</script>

{#if isLoading}
	<div class="flex items-center justify-center h-64">
		<p class="text-gray-600 dark:text-gray-400">Cargando track...</p>
	</div>
{:else if isError}
	<div class="flex items-center justify-center h-64">
		<p class="text-red-600 dark:text-red-400">Error al cargar el track</p>
	</div>
{:else}
	<div class="w-full rounded-lg bg-[#231a0f] text-white">
		<!-- Header -->
		<header
			class="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#3a3127] px-6 py-4"
		>
			<div class="flex items-center gap-4 min-w-0 flex-1">
				<div class="size-6 text-primary flex-shrink-0">
					<span class="material-icons text-3xl">music_note</span>
				</div>
				<h2
					class="text-white text-lg font-bold leading-tight tracking-[-0.015em] truncate"
				>
					{filename}
				</h2>
			</div>

			<!-- Botones de navegación (si hay tracks) -->
			{#if tracks.length > 1 && onNavigate}
				<div class="flex items-center gap-2 mx-4 flex-shrink-0">
					<button
						type="button"
						onclick={handlePrevious}
						disabled={!hasPrevious}
						class="p-2 rounded-full hover:bg-[#3a3127] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						title="Track anterior"
					>
						<span class="material-icons text-white">chevron_left</span>
					</button>
					<span class="text-sm text-[#bbac9b]">
						{currentIndex + 1} / {tracks.length}
					</span>
					<button
						type="button"
						onclick={handleNext}
						disabled={!hasNext}
						class="p-2 rounded-full hover:bg-[#3a3127] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						title="Track siguiente"
					>
						<span class="material-icons text-white">chevron_right</span>
					</button>
				</div>
			{/if}

			<!-- Botón Save -->
			<div class="hidden md:flex gap-2 flex-shrink-0">
				<button
					type="button"
					onclick={handleSave}
					disabled={!hasChanges || updateMutationPending}
					class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-primary text-[#181511] text-sm font-bold leading-normal tracking-[0.015em] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
				>
					<span class="truncate">
						{updateMutationPending ? 'Saving...' : 'Save Changes'}
					</span>
				</button>
			</div>
		</header>

		<!-- Main content -->
		<main class="px-6 py-4">
			<!-- Success message -->
			{#if showSuccess}
				<div class="mb-4 p-3 rounded-lg bg-green-500/20 text-green-400 text-sm">
					✓ Guardado correctamente
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
				<!-- Columna izquierda: Artwork + Botones -->
				<div class="flex flex-col gap-4 lg:col-span-2">
					<!-- Artwork -->
					<div
						class="relative group aspect-square w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-[#2a2a2a] rounded-lg"
						style={artwork ? `background-image: url("${artwork}")` : ''}
					>
						{#if !artwork && !isArtworkLoading}
							<div class="absolute inset-0 flex items-center justify-center">
								<div class="text-center">
									<span class="material-icons text-6xl text-[#55483a]">album</span>
									<p class="text-sm text-[#bbac9b] mt-2">Sin artwork</p>
								</div>
							</div>
						{/if}
						{#if isArtworkLoading}
							<div class="absolute inset-0 flex items-center justify-center">
								<div
									class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
								></div>
							</div>
						{/if}
						<!-- Hover overlay para cambiar artwork -->
						<div
							class="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<div class="flex flex-col items-center text-white">
								<span class="material-icons text-4xl">upload_file</span>
								<span class="text-sm font-semibold">Change Art</span>
							</div>
						</div>
					</div>

					<!-- Botones de acción -->
					<div class="flex flex-col gap-2">
						<!-- Fix Tags button -->
						{#if onFixTags}
							<button
								type="button"
								onclick={() => onFixTags?.([trackId])}
								class="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-purple-600 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-purple-700 transition-colors"
							>
								<span class="material-icons text-lg">search</span>
								<span class="truncate">Fix Tags (Beatport)</span>
							</button>
						{/if}

						<!-- Filename to Tags button -->
						<button
							type="button"
							onclick={handleExtractFromFilename}
							class="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-[#3a3127] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#4a4137] transition-colors"
						>
							<span class="material-icons text-lg">drive_file_rename_outline</span>
							<span class="truncate">Filename → Tags</span>
						</button>

						<!-- Search buttons row -->
						<div class="grid grid-cols-2 gap-2">
							<!-- Search in Google -->
							<button
								type="button"
								onclick={() => {
									const query = encodeURIComponent(`${artist} ${title}`.trim());
									openUrl(`https://www.google.com/search?q=${query}`);
								}}
								disabled={!artist && !title}
								class="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-blue-600 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Buscar en Google"
							>
								<span class="material-icons text-lg">travel_explore</span>
								<span class="truncate">Google</span>
							</button>

							<!-- Search in Beatport -->
							<button
								type="button"
								onclick={() => {
									const query = encodeURIComponent(`${artist} ${title}`.trim());
									openUrl(`https://www.beatport.com/search?q=${query}`);
								}}
								disabled={!artist && !title}
								class="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-green-600 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Buscar en Beatport"
							>
								<span class="material-icons text-lg">library_music</span>
								<span class="truncate">Beatport</span>
							</button>
						</div>
					</div>

					<!-- Rating -->
					<div class="flex flex-col gap-2">
						<p class={labelClass}>Rating</p>
						<div class="flex items-center gap-1">
							{#each [1, 2, 3, 4, 5] as star}
								<button
									type="button"
									onclick={() => handleRatingChange(star === rating ? 0 : star)}
									class="text-2xl transition-colors hover:scale-110"
								>
									<span
										class={`material-icons ${
											star <= rating ? 'text-yellow-400' : 'text-[#55483a]'
										}`}
									>
										{star <= rating ? 'star' : 'star_border'}
									</span>
								</button>
							{/each}
						</div>
					</div>
				</div>

				<!-- Columna derecha: Todos los campos -->
				<div class="flex flex-col gap-4 lg:col-span-3">
					<!-- Title y Artist -->
					<div class="grid grid-cols-1 gap-3">
						<div class="flex flex-col w-full">
							<p class={labelClass}>Title</p>
							<div class="relative flex items-center">
								<input
									class={inputClass}
									bind:value={title}
									placeholder="Title"
								/>
								{#if title}
									<button
										type="button"
										onclick={() => (title = '')}
										class="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
										title="Borrar título"
									>
										<span class="material-icons text-lg">close</span>
									</button>
								{/if}
							</div>
						</div>

						<div class="flex flex-col w-full">
							<p class={labelClass}>Artist</p>
							<div class="relative flex items-center">
								<input
									class={inputClass}
									bind:value={artist}
									placeholder="Artist"
								/>
								{#if artist}
									<button
										type="button"
										onclick={() => (artist = '')}
										class="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
										title="Borrar artista"
									>
										<span class="material-icons text-lg">close</span>
									</button>
								{/if}
							</div>
						</div>
					</div>

					<!-- Album -->
					<div class="flex flex-col w-full">
						<p class={labelClass}>Album</p>
						<div class="relative flex items-center">
							<input class={inputClass} bind:value={album} placeholder="Album" />
							{#if album}
								<button
									type="button"
									onclick={() => (album = '')}
									class="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
									title="Borrar álbum"
								>
									<span class="material-icons text-lg">close</span>
								</button>
							{/if}
						</div>
					</div>

					<!-- Year y Genre -->
					<div class="grid grid-cols-2 gap-4">
						<div class="flex flex-col w-full">
							<p class={labelClass}>Year</p>
							<div class="relative flex items-center">
								<input
									class={inputClass}
									type="number"
									bind:value={year}
									placeholder="Year"
								/>
								{#if year > 0}
									<button
										type="button"
										onclick={() => (year = 0)}
										class="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
										title="Borrar año"
									>
										<span class="material-icons text-lg">close</span>
									</button>
								{/if}
							</div>
						</div>

						<div class="flex flex-col w-full">
							<p class={labelClass}>Genre</p>
							<div class="relative flex items-center">
								<input
									class={inputClass}
									bind:value={genre}
									placeholder="Genre"
								/>
								{#if genre}
									<button
										type="button"
										onclick={() => (genre = '')}
										class="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
										title="Borrar género"
									>
										<span class="material-icons text-lg">close</span>
									</button>
								{/if}
							</div>
						</div>
					</div>

					<!-- BPM y Key -->
					<div class="grid grid-cols-2 gap-4">
						<div class="flex flex-col w-full">
							<p class={labelClass}>BPM</p>
							<div class="relative flex items-center">
								<input
									class={inputClass}
									type="number"
									bind:value={bpm}
									placeholder="BPM"
								/>
								{#if bpm > 0}
									<button
										type="button"
										onclick={() => (bpm = 0)}
										class="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
										title="Borrar BPM"
									>
										<span class="material-icons text-lg">close</span>
									</button>
								{/if}
							</div>
						</div>

						<div class="flex flex-col w-full">
							<p class={labelClass}>Key</p>
							<div class="relative flex items-center">
								<input
									class={inputClass}
									bind:value={key}
									placeholder="Am, C#m..."
								/>
								{#if key}
									<button
										type="button"
										onclick={() => (key = '')}
										class="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
										title="Borrar key"
									>
										<span class="material-icons text-lg">close</span>
									</button>
								{/if}
							</div>
						</div>
					</div>

					<!-- Comments -->
					<div class="flex flex-col w-full">
						<p class={labelClass}>Comments</p>
						<div class="relative">
							<textarea
								class="form-textarea flex w-full min-w-0 flex-1 resize-y overflow-hidden rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/80 border border-[#55483a] bg-[#2a2a2a] min-h-24 placeholder:text-[#bbac9b] p-4 pr-10 text-base font-normal leading-normal"
								bind:value={comment}
								placeholder="Add comments..."
							></textarea>
							{#if comment}
								<button
									type="button"
									onclick={() => (comment = '')}
									class="absolute right-3 top-3 text-[#bbac9b] hover:text-white transition-colors"
									title="Borrar comentarios"
								>
									<span class="material-icons text-lg">close</span>
								</button>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</main>

		<!-- Footer móvil - Solo botón Save -->
		<footer class="flex md:hidden gap-2 px-6 pb-4">
			<button
				type="button"
				onclick={handleSave}
				disabled={!hasChanges || updateMutationPending}
				class="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-4 bg-primary text-[#181511] text-sm font-bold leading-normal tracking-[0.015em] disabled:opacity-50"
			>
				<span class="truncate">
					{updateMutationPending ? 'Saving...' : 'Save Changes'}
				</span>
			</button>
		</footer>

		<!-- Diálogo de confirmación para cambios sin guardar -->
		{#if showConfirmDialog}
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
				<div
					class="bg-[#231a0f] border border-[#3a3127] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
				>
					<div class="flex items-center gap-3 mb-4">
						<span class="material-icons text-yellow-500 text-2xl">warning</span>
						<h3 class="text-white text-lg font-bold">Cambios sin guardar</h3>
					</div>
					<p class="text-[#bbac9b] mb-6">
						Tienes cambios sin guardar. ¿Qué deseas hacer?
					</p>
					<div class="flex flex-col gap-2">
						<button
							type="button"
							onclick={handleConfirmSave}
							disabled={updateMutationPending}
							class="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-primary text-[#181511] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors disabled:opacity-50"
						>
							<span class="material-icons text-lg">save</span>
							<span>{updateMutationPending ? 'Guardando...' : 'Guardar cambios'}</span>
						</button>
						<button
							type="button"
							onclick={handleDiscardChanges}
							class="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-red-600 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors"
						>
							<span class="material-icons text-lg">delete</span>
							<span>Descartar cambios</span>
						</button>
						<button
							type="button"
							onclick={() => (showConfirmDialog = false)}
							class="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-[#3a3127] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#4a4137] transition-colors"
						>
							<span>Seguir editando</span>
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
