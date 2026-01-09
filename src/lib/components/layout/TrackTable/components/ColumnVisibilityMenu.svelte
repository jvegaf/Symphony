<script lang="ts">
	import { X, RotateCcw } from 'lucide-svelte';
	import type { SortColumn } from '@/components/layout/TrackTable/hooks/useTrackSorting';

	/**
	 * Menú contextual para gestionar visibilidad de columnas
	 * Aparece con click derecho en headers de tabla
	 * 
	 * AIDEV-NOTE: En Svelte no necesitamos createPortal, usamos position:fixed
	 * con el componente renderizado condicionalmente
	 */

	interface Props {
		/** Si el menú está abierto */
		isOpen: boolean;
		/** Posición del menú (x, y) en píxeles */
		position: { x: number; y: number };
		/** Set de columnas visibles */
		visibleColumns: Set<SortColumn>;
		/** Callback al hacer toggle de una columna */
		onToggleColumn: (column: SortColumn) => void;
		/** Callback al resetear todas las columnas */
		onResetColumns: () => void;
		/** Callback al cerrar el menú */
		onClose: () => void;
	}

	let { isOpen, position, visibleColumns, onToggleColumn, onResetColumns, onClose }: Props =
		$props();

	/** Metadata de columnas para el menú */
	const COLUMN_LABELS: Record<SortColumn, string> = {
		position: '#',
		fixed: 'Fixed',
		title: 'Title',
		artist: 'Artist',
		album: 'Album',
		duration: 'Duration',
		bpm: 'BPM',
		rating: 'Rating',
		year: 'Year',
		dateAdded: 'Date Added',
		bitrate: 'Bitrate',
		genre: 'Genre',
		key: 'Key'
	};

	/** Columnas que no se pueden ocultar */
	const REQUIRED_COLUMNS: Set<SortColumn> = new Set(['title', 'artist']);

	/** Orden de las columnas en el menú */
	const COLUMN_ORDER: SortColumn[] = [
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

	const totalColumns = COLUMN_ORDER.length;
	const visibleCount = $derived(visibleColumns.size);

	function isRequired(column: SortColumn): boolean {
		return REQUIRED_COLUMNS.has(column);
	}

	/**
	 * Manejo de teclas de atajo
	 * - Escape: Cerrar menú
	 * - Ctrl+R: Reset columnas
	 */
	$effect(() => {
		if (!isOpen) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onClose();
			} else if (e.ctrlKey && e.key === 'r') {
				e.preventDefault();
				onResetColumns();
			}
		}

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

<!--
Menú contextual para seleccionar qué columnas mostrar/ocultar

Features:
- Checkboxes para cada columna
- Columnas obligatorias deshabilitadas (title, artist)
- Botón Reset para mostrar todas
- Cierre con Escape o click fuera
- Contador de columnas visibles
- Tooltips para columnas obligatorias
-->
{#if isOpen}
	<!-- Backdrop para cerrar al hacer click fuera -->
	<button
		type="button"
		data-testid="column-visibility-backdrop"
		class="fixed inset-0 z-40 bg-transparent border-none cursor-default"
		onclick={onClose}
		aria-label="Close menu"
	></button>

	<!-- Menú flotante -->
	<div
		data-testid="column-visibility-menu"
		class="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 min-w-[250px]"
		style:left="{position.x}px"
		style:top="{position.y}px"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		tabindex="0"
		aria-label="Column visibility settings"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700"
		>
			<div>
				<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Column Visibility</h3>
				<p class="text-xs text-gray-500 dark:text-gray-400">
					{visibleCount}/{totalColumns} columns visible
				</p>
			</div>
			<button
				type="button"
				onclick={onClose}
				class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
				aria-label="Close"
			>
				<X class="w-4 h-4 text-gray-600 dark:text-gray-300" />
			</button>
		</div>

		<!-- Lista de columnas -->
		<div class="space-y-1 max-h-[400px] overflow-y-auto">
			{#each COLUMN_ORDER as column (column)}
				{@const isVisible = visibleColumns.has(column)}
				{@const required = isRequired(column)}
				<label
					class="flex items-center gap-2 px-2 py-1.5 rounded {required
						? 'opacity-60 cursor-not-allowed'
						: 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'}"
					title={required ? 'Required column - cannot be hidden' : ''}
				>
					<input
						type="checkbox"
						checked={isVisible}
						disabled={required}
						onchange={() => onToggleColumn(column)}
						class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
						aria-label={COLUMN_LABELS[column]}
					/>
					<span class="text-sm text-gray-700 dark:text-gray-300 select-none">
						{COLUMN_LABELS[column]}
					</span>
					{#if required}
						<span class="ml-auto text-xs text-gray-400 dark:text-gray-500">Required</span>
					{/if}
				</label>
			{/each}
		</div>

		<!-- Footer con botón Reset -->
		<div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
			<button
				type="button"
				onclick={onResetColumns}
				class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
			>
				<RotateCcw class="w-4 h-4" />
				Reset to Default
			</button>
		</div>

		<!-- Hint de atajos -->
		<div class="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
			<kbd class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd>
			to close •
			<kbd class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+R</kbd>
			to reset
		</div>
	</div>
{/if}
