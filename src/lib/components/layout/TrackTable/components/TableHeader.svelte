<script lang="ts">
	import { ArrowUp, ArrowDown, Check } from 'lucide-svelte';
	import type { SortColumn, SortDirection } from '@/components/layout/TrackTable/hooks/useTrackSorting';
	import ColumnVisibilityMenu from './ColumnVisibilityMenu.svelte';

	interface Props {
		sortColumn: SortColumn;
		sortDirection: SortDirection;
		onSort: (column: SortColumn) => void;
		visibleColumns: Set<SortColumn>;
		onToggleColumn: (column: SortColumn) => void;
		onResetColumns: () => void;
		/** Indica si estamos mostrando una playlist (cambia columnas visibles) */
		isPlaylistView?: boolean;
		/** Indica si estamos en modo de reordenamiento (muestra columna de grip) */
		reorderMode?: boolean;
	}

	let {
		sortColumn,
		sortDirection,
		onSort,
		visibleColumns,
		onToggleColumn,
		onResetColumns,
		isPlaylistView = false,
		reorderMode = false
	}: Props = $props();

	let menuOpen = $state(false);
	let menuPosition = $state({ x: 0, y: 0 });

	/**
	 * Retorna el icono de ordenamiento para una columna
	 */
	function getSortIcon(column: SortColumn) {
		if (sortColumn !== column) return null;
		return sortDirection === 'asc' ? ArrowUp : ArrowDown;
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		menuPosition = { x: e.clientX, y: e.clientY };
		menuOpen = true;
	}

	function handleCloseMenu() {
		menuOpen = false;
	}
</script>

<!--
Header de tabla con columnas ordenables
Muestra flechas indicando dirección de ordenamiento
Click derecho abre menú para mostrar/ocultar columnas

AIDEV-NOTE: Este componente recibe visibleColumns como prop desde el padre
para mantener sincronización con TrackRow
-->
<thead
	class="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10"
	oncontextmenu={handleContextMenu}
>
	<tr>
		<!-- Columna vacía para grip handle - solo en modo reordenamiento -->
		{#if reorderMode}
			<th class="w-8"></th>
		{/if}

		<!-- Columna de posición - solo en vista de playlist -->
		{#if isPlaylistView}
			<th
				class="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"
				title="Posición en playlist"
			>
				#
			</th>
		{/if}

		<!-- Columna fixed - solo en vista de biblioteca (no playlist) -->
		{#if !isPlaylistView && visibleColumns.has('fixed')}
			<th
				class="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-10"
				onclick={() => onSort('fixed')}
			>
				<span class="inline-flex items-center">
					<Check class="w-4 h-4" />
					{#if getSortIcon('fixed')}
						{@const Icon = getSortIcon('fixed')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- Title -->
		{#if visibleColumns.has('title')}
			<th
				class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
				onclick={() => onSort('title')}
			>
				<span class="inline-flex items-center">
					Title
					{#if getSortIcon('title')}
						{@const Icon = getSortIcon('title')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- Artist -->
		{#if visibleColumns.has('artist')}
			<th
				class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
				onclick={() => onSort('artist')}
			>
				<span class="inline-flex items-center">
					Artist
					{#if getSortIcon('artist')}
						{@const Icon = getSortIcon('artist')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- Album -->
		{#if visibleColumns.has('album')}
			<th
				class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
				onclick={() => onSort('album')}
			>
				<span class="inline-flex items-center">
					Album
					{#if getSortIcon('album')}
						{@const Icon = getSortIcon('album')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- Duration -->
		{#if visibleColumns.has('duration')}
			<th
				class="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-16"
				onclick={() => onSort('duration')}
			>
				<span class="inline-flex items-center">
					Time
					{#if getSortIcon('duration')}
						{@const Icon = getSortIcon('duration')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- BPM -->
		{#if visibleColumns.has('bpm')}
			<th
				class="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-14"
				onclick={() => onSort('bpm')}
			>
				<span class="inline-flex items-center">
					BPM
					{#if getSortIcon('bpm')}
						{@const Icon = getSortIcon('bpm')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- Rating -->
		{#if visibleColumns.has('rating')}
			<th
				class="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-24"
				onclick={() => onSort('rating')}
			>
				<span class="inline-flex items-center">
					Rating
					{#if getSortIcon('rating')}
						{@const Icon = getSortIcon('rating')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- Year -->
		{#if visibleColumns.has('year')}
			<th
				class="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-14"
				onclick={() => onSort('year')}
			>
				<span class="inline-flex items-center">
					Year
					{#if getSortIcon('year')}
						{@const Icon = getSortIcon('year')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- Date Added -->
		{#if visibleColumns.has('dateAdded')}
			<th
				class="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-24"
				onclick={() => onSort('dateAdded')}
			>
				<span class="inline-flex items-center">
					Added
					{#if getSortIcon('dateAdded')}
						{@const Icon = getSortIcon('dateAdded')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- Bitrate -->
		{#if visibleColumns.has('bitrate')}
			<th
				class="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-20"
				onclick={() => onSort('bitrate')}
			>
				<span class="inline-flex items-center">
					Bitrate
					{#if getSortIcon('bitrate')}
						{@const Icon = getSortIcon('bitrate')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- Genre -->
		{#if visibleColumns.has('genre')}
			<th
				class="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-24"
				onclick={() => onSort('genre')}
			>
				<span class="inline-flex items-center truncate">
					Genre
					{#if getSortIcon('genre')}
						{@const Icon = getSortIcon('genre')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}

		<!-- Key -->
		{#if visibleColumns.has('key')}
			<th
				class="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-20"
				onclick={() => onSort('key')}
			>
				<span class="inline-flex items-center">
					Key
					{#if getSortIcon('key')}
						{@const Icon = getSortIcon('key')}
						<Icon class="ml-1 w-3 h-3 inline" />
					{/if}
				</span>
			</th>
		{/if}
	</tr>
</thead>

<ColumnVisibilityMenu
	isOpen={menuOpen}
	position={menuPosition}
	{visibleColumns}
	{onToggleColumn}
	{onResetColumns}
	onClose={handleCloseMenu}
/>
