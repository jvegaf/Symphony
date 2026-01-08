<script lang="ts">
/**
 * Tabla de tracks de la biblioteca
 *
 * Features:
 * - Selección múltiple con Ctrl+Click (toggle) y Shift+Click (rango)
 * - Navegación con teclado (Ctrl+A, Escape, Arrow keys)
 * - Ratings editables inline
 * - Double-click para reproducir track
 * - Sort estado controlado desde padre (persiste al navegar)
 * - Context menu con opciones: Details, Search, Filename→Tags, Fix Tags, Find Artwork, Delete
 * - Drag and drop para agregar tracks a playlists
 * - Reordenamiento de tracks dentro de playlist seleccionada
 */

import type { Track } from '../../../../types/library';
import TableHeader from './components/TableHeader.svelte';
import TrackRow from './components/TrackRow.svelte';
import EmptyState from './components/EmptyState.svelte';
import LoadingState from './components/LoadingState.svelte';
import { useUpdateTrackRating, useDeleteTrack } from '$lib/hooks/library';
import {
	useReorderPlaylistTracks,
	useRemoveTrackFromPlaylist
} from '$lib/hooks/playlists';

// Re-export types for compatibility
export type SortColumn =
	| 'position'
	| 'fixed'
	| 'title'
	| 'artist'
	| 'album'
	| 'duration'
	| 'bpm'
	| 'rating'
	| 'year'
	| 'dateAdded'
	| 'bitrate'
	| 'genre'
	| 'key';
export type SortDirection = 'asc' | 'desc';

interface Props {
	tracks: Track[];
	selectedTracks: Track[];
	playingTrack: Track | null;
	onTracksSelect: (tracks: Track[]) => void;
	/**
	 * Callback cuando se hace doble click en un track
	 * @param track - Track clickeado
	 * @param sortedTracks - Lista de tracks en el orden visual actual de la tabla
	 * @param index - Índice del track en sortedTracks
	 */
	onTrackDoubleClick: (track: Track, sortedTracks: Track[], index: number) => void;
	onTrackDetails?: (track: Track) => void;
	onBatchFilenameToTags?: (tracks: Track[]) => void;
	onFixTags?: (trackIds: string[]) => void;
	onFindArtwork?: (trackIds: string[]) => void;
	/** Callback para crear nuevo playlist con los tracks seleccionados */
	onAddToNewPlaylist?: (trackIds: string[]) => void;
	isLoading: boolean;
	// Props para sort controlado desde padre (persiste al navegar)
	sortColumn?: SortColumn;
	sortDirection?: SortDirection;
	onSortChange?: (column: SortColumn, direction: SortDirection) => void;
	// Callback para notificar cuando cambian los tracks ordenados
	// Permite al padre regenerar la cola de reproducción cuando cambia el orden
	onSortedTracksChange?: (sortedTracks: Track[], playingTrackIndex: number) => void;
	/** ID de playlist seleccionada (habilita reordenamiento) */
	selectedPlaylistId?: string | null;
	/** Callback cuando se inicia el drag de tracks */
	onDragStart?: (trackIds: string[]) => void;
	/** Callback cuando termina el drag */
	onDragEnd?: () => void;
}

let {
	tracks,
	selectedTracks,
	playingTrack,
	onTracksSelect,
	onTrackDoubleClick,
	onTrackDetails,
	onBatchFilenameToTags,
	onFixTags,
	onFindArtwork,
	onAddToNewPlaylist,
	isLoading,
	sortColumn: externalSortColumn,
	sortDirection: externalSortDirection,
	onSortChange,
	onSortedTracksChange,
	selectedPlaylistId,
	onDragStart,
	onDragEnd
}: Props = $props();

// AIDEV-NOTE: TanStack Svelte Query mutations - llamados al top level
// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
const updateRatingMutation = useUpdateTrackRating();
// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
const deleteTrackMutation = useDeleteTrack();
// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
const reorderTracksMutation = useReorderPlaylistTracks();
// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
const removeFromPlaylistMutation = useRemoveTrackFromPlaylist();

// AIDEV-NOTE: Funciones wrapper para mutations
function updateRating(trackId: string, rating: number) {
	$updateRatingMutation.mutate(
		{ trackId, rating },
		{
			onError: (err: Error) => {
				alert(`Error al actualizar rating: ${err.message}`);
			}
		}
	);
}

function deleteTrack(trackId: string) {
	$deleteTrackMutation.mutate(trackId, {
		onSuccess: () => {
			// Deseleccionar el track eliminado
			onTracksSelect(selectedTracks.filter((t) => t.id !== trackId));
		},
		onError: (err: Error) => {
			alert(`Error al eliminar track: ${err.message}`);
		}
	});
}

function reorderTracks(playlistId: string, trackIds: string[]) {
	$reorderTracksMutation.mutate(
		{ playlistId, trackIds },
		{
			onError: (err: Error) => {
				alert(`Error al reordenar tracks: ${err.message}`);
			}
		}
	);
}

function removeFromPlaylist(playlistId: string, trackId: string) {
	$removeFromPlaylistMutation.mutate(
		{ playlistId, trackId },
		{
			onSuccess: () => {
				// Deseleccionar el track removido
				onTracksSelect(selectedTracks.filter((t) => t.id !== trackId));
			},
			onError: (err: Error) => {
				alert(`Error al remover track de playlist: ${err.message}`);
			}
		}
	);
}

// AIDEV-TODO: Replace with proper Svelte store when migrated
// Placeholder for column visibility
let visibleColumns = $state<SortColumn[]>([
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
	'key'
]);

function toggleColumn(column: SortColumn) {
	if (column === 'title' || column === 'artist') return; // Required columns
	if (visibleColumns.includes(column)) {
		visibleColumns = visibleColumns.filter((c) => c !== column);
	} else {
		visibleColumns = [...visibleColumns, column];
	}
}

function resetColumns() {
	visibleColumns = [
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
		'key'
	];
}

let visibleColumnsSet = $derived(new Set(visibleColumns));

// Sort state - usar props externas si están disponibles
let sortColumn = $derived<SortColumn>(externalSortColumn ?? 'title');
let sortDirection = $derived<SortDirection>(externalSortDirection ?? 'asc');

// Drag and drop state
let isDragging = $state(false);
let dropTargetIndex = $state<number | null>(null);

// Reorder mode: activo cuando hay playlist seleccionada
let reorderMode = $derived(selectedPlaylistId !== null && selectedPlaylistId !== undefined);

// Track sorting (derived state)
let sortedTracks = $derived.by(() => {
	return [...tracks].sort((a, b) => {
		let aValue: string | number = '';
		let bValue: string | number = '';

		switch (sortColumn) {
			case 'position':
				aValue = tracks.indexOf(a);
				bValue = tracks.indexOf(b);
				break;
			case 'fixed':
				aValue = a.beatportId ? 1 : 0;
				bValue = b.beatportId ? 1 : 0;
				break;
			case 'title':
				aValue = a.title.toLowerCase();
				bValue = b.title.toLowerCase();
				break;
			case 'artist':
				aValue = a.artist.toLowerCase();
				bValue = b.artist.toLowerCase();
				break;
			case 'album':
				aValue = (a.album ?? '').toLowerCase();
				bValue = (b.album ?? '').toLowerCase();
				break;
			case 'duration':
				aValue = a.duration;
				bValue = b.duration;
				break;
			case 'bpm':
				aValue = a.bpm ?? 0;
				bValue = b.bpm ?? 0;
				break;
			case 'rating':
				aValue = a.rating ?? 0;
				bValue = b.rating ?? 0;
				break;
			case 'year':
				aValue = a.year ?? 0;
				bValue = b.year ?? 0;
				break;
			case 'dateAdded':
				aValue = new Date(a.dateAdded).getTime();
				bValue = new Date(b.dateAdded).getTime();
				break;
			case 'bitrate':
				aValue = a.bitrate ?? 0;
				bValue = b.bitrate ?? 0;
				break;
			case 'genre':
				aValue = (a.genre ?? '').toLowerCase();
				bValue = (b.genre ?? '').toLowerCase();
				break;
			case 'key':
				aValue = (a.key ?? '').toLowerCase();
				bValue = (b.key ?? '').toLowerCase();
				break;
		}

		if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
		if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
		return 0;
	});
});

// Track selection state
let lastClickedIndex = $state(-1);
let focusedIndex = $state(0);

// IDs de tracks seleccionados para drag múltiple
let selectedTrackIds = $derived(
	selectedTracks.map((t) => t.id).filter((id): id is string => id !== undefined)
);

// Determinar si estamos en vista de playlist
let isPlaylistView = $derived(selectedPlaylistId !== null && selectedPlaylistId !== undefined);

// Función para manejar click en header (cambiar ordenamiento)
function handleSort(column: SortColumn) {
	const newDirection = sortColumn === column ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';

	if (onSortChange) {
		onSortChange(column, newDirection);
	}
}

// Manejar selección con Ctrl (toggle) y Shift (rango)
function handleTrackClick(track: Track, index: number, e: MouseEvent) {
	// Prevenir que el double-click también ejecute el single-click
	if (e.detail === 2) return;

	if (e.ctrlKey || e.metaKey) {
		// Ctrl+Click: toggle individual
		const isSelected = selectedTracks.some((t) => t.id === track.id);
		if (isSelected) {
			onTracksSelect(selectedTracks.filter((t) => t.id !== track.id));
		} else {
			onTracksSelect([...selectedTracks, track]);
		}
		lastClickedIndex = index;
	} else if (e.shiftKey && lastClickedIndex !== -1) {
		// Shift+Click: seleccionar rango
		const start = Math.min(lastClickedIndex, index);
		const end = Math.max(lastClickedIndex, index);
		const rangeSelection = sortedTracks.slice(start, end + 1);

		// Merge con selección existente (union)
		const newSelection = [...selectedTracks];
		rangeSelection.forEach((t) => {
			if (!newSelection.some((s) => s.id === t.id)) {
				newSelection.push(t);
			}
		});
		onTracksSelect(newSelection);
	} else {
		// Click normal: seleccionar solo este track
		onTracksSelect([track]);
		lastClickedIndex = index;
	}

	focusedIndex = index;
}

// Double-click handler - deselecciona todos y reproduce el track
function handleDoubleClick(track: Track, index: number) {
	onTracksSelect([]); // Deseleccionar todos
	onTrackDoubleClick(track, sortedTracks, index);
}

// Context menu handler
async function handleContextMenu(e: MouseEvent, track: Track) {
	e.preventDefault();

	// Si el track clickeado no está en la selección, seleccionarlo solo
	const isTrackSelected = selectedTracks.some((t) => t.id === track.id);
	if (!isTrackSelected) {
		onTracksSelect([track]);
	}

	// AIDEV-TODO: Implement full Tauri context menu with all options
	// This will require migrating useContextMenu hook logic
	// For now, just log
	console.log('AIDEV-TODO: Context menu for track', track, {
		onTrackDetails,
		onBatchFilenameToTags,
		onFixTags,
		onFindArtwork,
		onAddToNewPlaylist,
		deleteTrack,
		removeFromPlaylist,
		selectedPlaylistId
	});
}

// Drag and drop handlers
function handleDragStartRow(trackIds: string[], e: DragEvent) {
	isDragging = true;
	e.dataTransfer!.setData(
		'application/json',
		JSON.stringify({
			type: reorderMode ? 'playlist-track' : 'tracks',
			trackIds,
			sourceIndex: sortedTracks.findIndex((t) => t.id === trackIds[0])
		})
	);
	e.dataTransfer!.effectAllowed = 'move';
	onDragStart?.(trackIds);
}

function handleDragEndRow() {
	isDragging = false;
	dropTargetIndex = null;
	onDragEnd?.();
}

function handleDragOverRow(e: DragEvent, index: number) {
	if (reorderMode) {
		e.preventDefault();
		dropTargetIndex = index;
	}
}

function handleDropRow(e: DragEvent, targetIndex: number) {
	if (!reorderMode || !selectedPlaylistId) return;

	e.preventDefault();
	dropTargetIndex = null;

	try {
		const data = JSON.parse(e.dataTransfer!.getData('application/json'));
		if (data.type === 'playlist-track' && data.sourceIndex !== undefined) {
			const sourceIndex = data.sourceIndex as number;
			if (sourceIndex === targetIndex) return;

			// Crear nuevo orden de tracks
			const newOrder = [...sortedTracks];
			const [movedTrack] = newOrder.splice(sourceIndex, 1);
			newOrder.splice(targetIndex, 0, movedTrack);

			// Extraer IDs en nuevo orden
			const trackIds = newOrder.map((t) => t.id).filter((id): id is string => id !== undefined);

			// Llamar al backend para persistir el nuevo orden
			reorderTracks(selectedPlaylistId, trackIds);
		}
	} catch {
		// Ignorar errores de parsing
	}
}

// Keyboard shortcuts (Ctrl+A, Escape, Arrow keys)
$effect(() => {
	const handleKeyDown = (e: KeyboardEvent) => {
		// Ignorar si el usuario está escribiendo en un input
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			return;
		}

		// Ctrl+A o Cmd+A: Select All
		if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
			e.preventDefault();
			onTracksSelect(sortedTracks);
			return;
		}

		// Escape: Deselect All (solo si hay selección)
		if (e.key === 'Escape' && selectedTracks.length > 0) {
			e.preventDefault();
			onTracksSelect([]);
			return;
		}

		// Navegación con arrow keys (sin Shift = mover foco, con Shift = seleccionar)
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();

			let newIndex = focusedIndex;
			if (e.key === 'ArrowDown' && focusedIndex < sortedTracks.length - 1) {
				newIndex = focusedIndex + 1;
			} else if (e.key === 'ArrowUp' && focusedIndex > 0) {
				newIndex = focusedIndex - 1;
			}

			focusedIndex = newIndex;

			if (e.shiftKey) {
				// Shift+Arrow: Agregar a selección
				const trackToAdd = sortedTracks[newIndex];
				const isAlreadySelected = selectedTracks.some((t) => t.id === trackToAdd.id);
				if (!isAlreadySelected) {
					onTracksSelect([...selectedTracks, trackToAdd]);
				}
			} else {
				// Arrow sin Shift: Seleccionar solo el track con foco
				onTracksSelect([sortedTracks[newIndex]]);
			}

			lastClickedIndex = newIndex;
		}
	};

	window.addEventListener('keydown', handleKeyDown);
	return () => window.removeEventListener('keydown', handleKeyDown);
});

// Notificar al padre cuando cambian los tracks ordenados
let lastNotifiedState = $state<{
	sortColumn: SortColumn;
	sortDirection: SortDirection;
	playingId: string | undefined;
} | null>(null);

$effect(() => {
	if (!onSortedTracksChange || !playingTrack) return;

	const currentState = {
		sortColumn,
		sortDirection,
		playingId: playingTrack.id
	};

	// Comparar con el último estado notificado
	if (
		lastNotifiedState &&
		lastNotifiedState.sortColumn === currentState.sortColumn &&
		lastNotifiedState.sortDirection === currentState.sortDirection &&
		lastNotifiedState.playingId === currentState.playingId
	) {
		return; // No ha cambiado nada relevante
	}

	const playingIndex = sortedTracks.findIndex((t) => t.id === playingTrack.id);
	if (playingIndex !== -1) {
		lastNotifiedState = currentState;
		onSortedTracksChange(sortedTracks, playingIndex);
	}
});
</script>

{#if isLoading}
	<LoadingState />
{:else if tracks.length === 0}
	<EmptyState />
{:else}
	<div class="flex-1 overflow-auto flex flex-col select-none" data-testid="track-table">
		<table class="w-full table-fixed text-left text-sm">
			<TableHeader
				{sortColumn}
				{sortDirection}
				onSort={handleSort}
				visibleColumns={visibleColumnsSet}
				onToggleColumn={toggleColumn}
				onResetColumns={resetColumns}
				{isPlaylistView}
				{reorderMode}
			/>
			<tbody class={isDragging ? 'opacity-75' : ''}>
				{#each sortedTracks as track, index (track.id ?? track.path)}
					{@const isSelected = selectedTracks.some((t) => t.id === track.id)}
					{@const isPlaying = playingTrack?.id === track.id}
					{@const isFocused = index === focusedIndex}
					<TrackRow
						{track}
						{index}
						{isSelected}
						{isPlaying}
						{isFocused}
						visibleColumns={visibleColumnsSet}
						onClick={handleTrackClick}
						onDoubleClick={() => handleDoubleClick(track, index)}
						onContextMenu={handleContextMenu}
						onUpdateRating={(trackId, rating) => {
							updateRating(trackId, rating);
						}}
						draggable={true}
						{selectedTrackIds}
						onDragStart={handleDragStartRow}
						onDragEnd={handleDragEndRow}
						{reorderMode}
						onDragOver={(e) => handleDragOverRow(e, index)}
						onDrop={(e) => handleDropRow(e, index)}
						isDropTarget={dropTargetIndex === index}
						{isPlaylistView}
					/>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
