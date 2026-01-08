<script lang="ts">
/**
 * Overlay de beatgrid sobre waveform
 * Muestra grid vertical de beats basado en BPM y offset
 */

import { cn } from '../../../utils/cn';

interface Props {
	/** Duración total de la pista en segundos */
	duration: number;
	/** BPM de la pista */
	bpm: number;
	/** Offset del primer beat en segundos */
	offset: number;
	/** Ancho del contenedor en pixels */
	width: number;
	/** Alto del contenedor en pixels */
	height: number;
	/** Mostrar números de beat */
	showBeatNumbers?: boolean;
	/** Confidence del análisis (0-100) */
	confidence?: number;
	/** Clase CSS adicional */
	className?: string;
}

let {
	duration,
	bpm,
	offset,
	width,
	height,
	showBeatNumbers = false,
	confidence,
	className
}: Props = $props();

/**
 * Calcula posiciones de beats en el timeline
 */
const calculateBeatPositions = (
	duration: number,
	bpm: number,
	offset: number,
	width: number
): Array<{ position: number; beatNumber: number }> => {
	if (bpm <= 0 || duration <= 0 || width <= 0) {
		return [];
	}

	const beatInterval = 60 / bpm; // Segundos entre beats
	const beats: Array<{ position: number; beatNumber: number }> = [];

	let beatTime = offset;
	let beatNumber = 1;

	while (beatTime < duration) {
		const position = (beatTime / duration) * width;
		beats.push({ position, beatNumber });

		beatTime += beatInterval;
		beatNumber++;
	}

	return beats;
};

// Derived state for beat positions
let beats = $derived(calculateBeatPositions(duration, bpm, offset, width));

// Color de las líneas basado en confidence
let lineOpacity = $derived(
	confidence !== undefined ? Math.max(0.2, (confidence / 100) * 0.5) : 0.3
);
</script>

{#if beats.length > 0}
	<svg
		class={cn('absolute inset-0 pointer-events-none', className)}
		{width}
		{height}
		xmlns="http://www.w3.org/2000/svg"
	>
		{#each beats as { position, beatNumber }}
			{@const isDownbeat = beatNumber % 4 === 1}
			{@const strokeWidth = isDownbeat ? 2 : 1}
			{@const opacity = isDownbeat ? lineOpacity * 1.5 : lineOpacity}
			<g>
				<line
					x1={position}
					y1={0}
					x2={position}
					y2={height}
					stroke="currentColor"
					stroke-width={strokeWidth}
					{opacity}
					class="text-blue-500"
				/>
				{#if showBeatNumbers && isDownbeat}
					<text
						x={position + 2}
						y={12}
						font-size={10}
						fill="currentColor"
						{opacity}
						class="text-blue-500"
					>
						{beatNumber}
					</text>
				{/if}
			</g>
		{/each}
	</svg>
{/if}
