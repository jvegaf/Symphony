<script lang="ts">
	import { cn } from '@/utils/cn';
	import type { CuePoint } from '@/types/analysis';

	/**
	 * Editor de cue points
	 * Muestra y permite editar cue points en el waveform
	 */

	interface Props {
		/** Lista de cue points */
		cuePoints: CuePoint[];
		/** Duración total de la pista en segundos */
		duration: number;
		/** Ancho del contenedor en pixels */
		width: number;
		/** Alto del contenedor en pixels */
		height: number;
		/** Callback cuando se hace click en un cue point */
		onCuePointClick?: (cuePoint: CuePoint) => void;
		/** Callback cuando se arrastra un cue point */
		onCuePointDrag?: (cuePointId: string, newPosition: number) => void;
		/** ID del cue point seleccionado */
		selectedCuePointId?: string;
		/** Clase CSS adicional */
		class?: string;
	}

	let {
		cuePoints,
		duration,
		width,
		height,
		onCuePointClick,
		onCuePointDrag,
		selectedCuePointId,
		class: className
	}: Props = $props();

	/**
	 * Colores por tipo de cue point
	 */
	const CUE_POINT_COLORS: Record<string, string> = {
		cue: '#3b82f6', // blue-500
		intro: '#10b981', // green-500
		outro: '#ef4444', // red-500
		drop: '#f59e0b', // amber-500
		vocal: '#8b5cf6', // violet-500
		break: '#06b6d4', // cyan-500
		custom: '#6b7280' // gray-500
	};

	/**
	 * Calcula la posición X de un cue point en pixels
	 */
	function calculateCuePointPosition(
		position: number,
		duration: number,
		width: number
	): number {
		if (duration <= 0 || width <= 0) return 0;
		return (position / duration) * width;
	}

	// Compute markers with positions and colors
	const markers = $derived(
		cuePoints.map((cue) => ({
			...cue,
			x: calculateCuePointPosition(cue.position, duration, width),
			color: cue.color || CUE_POINT_COLORS[cue.type] || CUE_POINT_COLORS.custom
		}))
	);
</script>

<!--
AIDEV-NOTE: Patrón de pointer-events para overlays SVG:
- SVG container: pointer-events-none → pasa clicks al waveform debajo
- Elementos <g>: pointer-events-auto → captura clicks en marcadores
Esto permite seek en el waveform y clicks en cue points simultáneamente
-->
{#if markers.length > 0}
	<svg
		class={cn('absolute inset-0 pointer-events-none', className)}
		{width}
		{height}
		xmlns="http://www.w3.org/2000/svg"
	>
		{#each markers as marker (marker.id)}
			{@const isSelected = selectedCuePointId === marker.id}
			{@const markerHeight = isSelected ? 20 : 16}
			<g
				onclick={() => onCuePointClick?.(marker)}
				class={cn(
					'cursor-pointer transition-all pointer-events-auto',
					onCuePointDrag && 'hover:opacity-80'
				)}
			>
				<!-- Línea vertical -->
				<line
					x1={marker.x}
					y1={0}
					x2={marker.x}
					y2={height}
					stroke={marker.color}
					stroke-width={isSelected ? 3 : 2}
					opacity={0.6}
				/>

				<!-- Marcador superior -->
				<polygon
					points="{marker.x},0 {marker.x - 6},{markerHeight} {marker.x + 6},{markerHeight}"
					fill={marker.color}
					opacity={isSelected ? 1 : 0.8}
				/>

				<!-- Hotkey badge -->
				{#if marker.hotkey}
					<g>
						<circle
							cx={marker.x}
							cy={markerHeight + 12}
							r={10}
							fill={marker.color}
							opacity={0.9}
						/>
						<text
							x={marker.x}
							y={markerHeight + 16}
							font-size={10}
							fill="white"
							text-anchor="middle"
							font-weight="bold"
						>
							{marker.hotkey}
						</text>
					</g>
				{/if}

				<!-- Label -->
				{#if marker.label}
					<text
						x={marker.x + 8}
						y={14}
						font-size={11}
						fill={marker.color}
						opacity={0.9}
						class="select-none"
					>
						{marker.label}
					</text>
				{/if}
			</g>
		{/each}
	</svg>
{/if}
