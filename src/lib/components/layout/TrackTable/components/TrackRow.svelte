<script lang="ts">
	import { Check, GripVertical } from 'lucide-svelte';
	import StarRating from '@/lib/components/ui/StarRating.svelte';
	import { formatDuration, formatDate } from '@/components/layout/TrackTable/utils/formatters';
	import type { Track } from '@/types/library';
	import type { SortColumn } from '@/components/layout/TrackTable/hooks/useTrackSorting';

	interface Props {
		track: Track;
		index: number;
		isSelected: boolean;
		isPlaying: boolean;
		isFocused: boolean;
		visibleColumns: Set<SortColumn>;
		onClick: (track: Track, index: number, e: MouseEvent) => void;
		onDoubleClick: (track: Track) => void;
		onContextMenu: (e: MouseEvent, track: Track) => void;
		onUpdateRating: (trackId: string, rating: number) => void;
		/** Habilitar drag and drop */
		draggable?: boolean;
		/** IDs de tracks seleccionados (para drag múltiple) */
		selectedTrackIds?: string[];
		/** Callback cuando se inicia el drag */
		onDragStart?: (trackIds: string[], e: DragEvent) => void;
		/** Callback cuando termina el drag */
		onDragEnd?: () => void;
		/** Modo reordenamiento (muestra grip handle) */
		reorderMode?: boolean;
		/** Callback para reordenamiento por drop */
		onDragOver?: (e: DragEvent, index: number) => void;
		/** Callback para drop en reordenamiento */
		onDrop?: (e: DragEvent, targetIndex: number) => void;
		/** Indica si este row es el drop target actual */
		isDropTarget?: boolean;
		/** Indica si estamos mostrando una playlist (muestra posición en lugar de fixed) */
		isPlaylistView?: boolean;
	}

	let {
		track,
		index,
		isSelected,
		isPlaying,
		isFocused,
		visibleColumns,
		onClick,
		onDoubleClick,
		onContextMenu,
		onUpdateRating,
		draggable = false,
		selectedTrackIds = [],
		onDragStart,
		onDragEnd,
		reorderMode = false,
		onDragOver,
		onDrop,
		isDropTarget = false,
		isPlaylistView = false
	}: Props = $props();

	/**
	 * Maneja el inicio del drag
	 * Si el track está seleccionado, arrastra todos los seleccionados
	 * Si no, solo arrastra este track
	 */
	function handleDragStart(e: DragEvent) {
		if (!onDragStart || !track.id) return;

		const trackIds =
			isSelected && selectedTrackIds.length > 0 ? selectedTrackIds : [track.id];

		onDragStart(trackIds, e);
	}

	function handleDragOver(e: DragEvent) {
		if (reorderMode && onDragOver) {
			e.preventDefault();
			onDragOver(e, index);
		}
	}

	function handleDrop(e: DragEvent) {
		if (reorderMode && onDrop) {
			e.preventDefault();
			onDrop(e, index);
		}
	}

	// Computed row classes
	const rowClasses = $derived(
		[
			'border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors',
			isPlaying
				? 'bg-blue-100 dark:bg-blue-950'
				: isSelected
					? 'bg-blue-100/70 dark:bg-blue-800/50'
					: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
			isFocused ? 'ring-2 ring-blue-400 dark:ring-blue-600 ring-inset' : '',
			isDropTarget ? 'border-t-2 border-t-primary' : '',
			draggable ? 'cursor-grab active:cursor-grabbing' : ''
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<!--
Fila de track con todos los datos y estilos visuales
Maneja selección, focus, reproducción activa, y contexto
Solo renderiza columnas visibles según visibleColumns

AIDEV-NOTE: El orden de las columnas debe coincidir EXACTAMENTE con TableHeader
AIDEV-NOTE: Svelte 5 optimiza automáticamente el re-render, no necesita React.memo
-->
<tr
	data-track-id={track.id}
	{draggable}
	ondragstart={handleDragStart}
	ondragend={onDragEnd}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	class={rowClasses}
	onclick={(e) => onClick(track, index, e)}
	ondblclick={() => onDoubleClick(track)}
	oncontextmenu={(e) => onContextMenu(e, track)}
>
	<!-- Grip handle para reordenamiento -->
	{#if reorderMode}
		<td class="px-1 py-2 w-8 text-gray-400 dark:text-gray-500">
			<GripVertical class="w-4 h-4" />
		</td>
	{/if}

	<!-- Columna de posición - solo en vista de playlist -->
	{#if isPlaylistView}
		<td class="px-2 py-2 text-sm text-center text-gray-500 dark:text-gray-400 w-10">
			{index + 1}
		</td>
	{/if}

	<!-- Fixed indicator - solo en vista de biblioteca (no playlist) -->
	{#if !isPlaylistView && visibleColumns.has('fixed')}
		<td class="px-2 py-2 text-sm text-center w-10">
			{#if track.beatportId}
				<span class="inline-flex items-center justify-center">
					<Check class="w-4 h-4 text-green-600 dark:text-green-400" />
				</span>
			{/if}
		</td>
	{/if}

	<!-- Title -->
	{#if visibleColumns.has('title')}
		<td
			class="px-2 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
			title={track.title}
		>
			{track.title}
		</td>
	{/if}

	<!-- Artist -->
	{#if visibleColumns.has('artist')}
		<td
			class="px-2 py-2 text-sm text-gray-700 dark:text-gray-300 truncate"
			title={track.artist}
		>
			{track.artist}
		</td>
	{/if}

	<!-- Album -->
	{#if visibleColumns.has('album')}
		<td
			class="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 truncate"
			title={track.album || '-'}
		>
			{track.album || '-'}
		</td>
	{/if}

	<!-- Duration -->
	{#if visibleColumns.has('duration')}
		<td class="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-16">
			{formatDuration(track.duration)}
		</td>
	{/if}

	<!-- BPM -->
	{#if visibleColumns.has('bpm')}
		<td class="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-14">
			{track.bpm ?? '-'}
		</td>
	{/if}

	<!-- Rating -->
	{#if visibleColumns.has('rating')}
		<td class="px-2 py-2 text-sm w-24">
			<StarRating
				value={track.rating ?? 0}
				onchange={(newRating: number) => onUpdateRating(track.id ?? '', newRating)}
				size="sm"
			/>
		</td>
	{/if}

	<!-- Year -->
	{#if visibleColumns.has('year')}
		<td class="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-14">
			{track.year ?? '-'}
		</td>
	{/if}

	<!-- Date Added -->
	{#if visibleColumns.has('dateAdded')}
		<td class="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-24">
			{formatDate(track.dateAdded)}
		</td>
	{/if}

	<!-- Bitrate -->
	{#if visibleColumns.has('bitrate')}
		<td class="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-20">
			{track.bitrate ? `${track.bitrate}` : '-'}
		</td>
	{/if}

	<!-- Genre -->
	{#if visibleColumns.has('genre')}
		<td
			class="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-24 truncate"
			title={track.genre ?? '-'}
		>
			{track.genre ?? '-'}
		</td>
	{/if}

	<!-- Key -->
	{#if visibleColumns.has('key')}
		<td
			class="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-20 whitespace-nowrap"
			title={track.key ?? '-'}
		>
			{track.key ?? '-'}
		</td>
	{/if}
</tr>
