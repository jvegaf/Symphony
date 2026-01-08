<script lang="ts">
	/**
	 * Waveform renderer con Canvas nativo
	 *
	 * AIDEV-NOTE: Implementación propia en lugar de WaveSurfer.js para:
	 * - Control total del rendering progresivo (chunks sin estirar)
	 * - Progreso basado en tiempo real (no en peaks)
	 * - Hover y seek sin dependencias externas
	 * - Más simple y eficiente
	 *
	 * MODO PROPORCIONAL (streaming):
	 * Durante la generación, el waveform ocupa solo el % del canvas
	 * correspondiente al progreso de generación. Esto da una sensación
	 * visual más natural del progreso real.
	 * 
	 * AIDEV-TODO: Migrar useWaveform hook a Svelte store cuando sea necesario
	 */

	// AIDEV-NOTE: Temporalmente importando desde React hasta que migremos el hook
	// import { useWaveform } from '@/hooks/useWaveform';

	interface Props {
		/** UUID de la pista */
		trackId?: string;
		/** Ruta completa al archivo de audio */
		trackPath?: string;
		/** Duración en segundos (del metadata) */
		duration?: number;
		/** Posición actual de reproducción en segundos */
		currentTime?: number;
		/** Altura del waveform en píxeles */
		height?: number;
		/** Color del waveform no reproducido */
		waveColor?: string;
		/** Color del waveform ya reproducido */
		progressColor?: string;
		/** Color del cursor hover */
		hoverColor?: string;
		/** Callback cuando se hace click para seek */
		onSeek?: (time: number) => void;
		/** Si debe generar el waveform */
		shouldGenerate?: boolean;
	}

	let {
		trackId: _trackId, // eslint-disable-line @typescript-eslint/no-unused-vars
		trackPath: _trackPath, // eslint-disable-line @typescript-eslint/no-unused-vars
		duration = 0,
		currentTime = 0,
		height = 64,
		waveColor = '#3b82f6',
		progressColor = '#1e40af',
		hoverColor = '#60a5fa',
		onSeek,
		shouldGenerate: _shouldGenerate = false // eslint-disable-line @typescript-eslint/no-unused-vars
	}: Props = $props();

	let canvasElement: HTMLCanvasElement | undefined = $state();
	let containerElement: HTMLDivElement | undefined = $state();
	let hoverX = $state<number | null>(null);
	let hoverTime = $state<number | null>(null);

	// AIDEV-TODO: Replace with Svelte store when useWaveform is migrated
	// For now, using placeholder values
	let peaks = $state<number[]>([]);
	let generationProgress = $state(0);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Ajustar canvas al tamaño del contenedor
	$effect(() => {
		function updateSize() {
			if (containerElement && canvasElement) {
				const rect = containerElement.getBoundingClientRect();
				const dpr = window.devicePixelRatio || 1;

				// Set canvas size considering DPR for crisp rendering
				canvasElement.width = rect.width * dpr;
				canvasElement.height = height * dpr;
				canvasElement.style.width = `${rect.width}px`;
				canvasElement.style.height = `${height}px`;
			}
		}

		updateSize();
		window.addEventListener('resize', updateSize);

		return () => window.removeEventListener('resize', updateSize);
	});

	// Renderizar waveform
	$effect(() => {
		if (!canvasElement || !peaks || peaks.length === 0) return;

		const canvas = canvasElement;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const totalWidth = canvas.width / dpr;
		const canvasHeight = canvas.height / dpr;

		// Limpiar canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.scale(dpr, dpr);

		const peaksCount = peaks.length;

		if (peaksCount === 0) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			return;
		}

		// AIDEV-NOTE: MODO PROPORCIONAL
		// Durante streaming (isLoading=true), el waveform ocupa solo el % del canvas
		// correspondiente al progreso de generación. Una vez completo, usa todo el ancho.
		const isComplete = !isLoading && generationProgress >= 1.0;
		const effectiveWidth = isComplete
			? totalWidth
			: totalWidth * Math.max(generationProgress, 0.01);

		const barWidth = 2;
		const minBarGap = 1;

		// Calcular cuántas barras caben en el ancho efectivo
		const maxBars = Math.floor(effectiveWidth / (barWidth + minBarGap));

		// Si tenemos más peaks que barras disponibles, necesitamos resamplear
		const needsResampling = peaksCount > maxBars;
		const barsToRender = needsResampling ? maxBars : peaksCount;

		if (barsToRender === 0) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			return;
		}

		// Calcular el espaciado real entre barras para ocupar el ancho efectivo
		const totalBarSpace = barsToRender * barWidth;
		const totalGapSpace = effectiveWidth - totalBarSpace;
		const barGap = barsToRender > 1 ? totalGapSpace / (barsToRender - 1) : 0;
		const barStep = barWidth + barGap;

		// AIDEV-NOTE: Progreso de reproducción basado en TIEMPO
		// Se calcula sobre el ancho TOTAL, no el efectivo
		const progressX = duration > 0 ? (currentTime / duration) * totalWidth : 0;

		// Renderizar barras
		for (let i = 0; i < barsToRender; i++) {
			// Calcular qué peak(s) corresponden a esta barra
			let peakValue: number;

			if (needsResampling) {
				// Resamplear: tomar el máximo de los peaks que corresponden a esta barra
				const startIdx = Math.floor((i / barsToRender) * peaksCount);
				const endIdx = Math.floor(((i + 1) / barsToRender) * peaksCount);

				let maxPeak = 0;
				for (let j = startIdx; j < endIdx && j < peaksCount; j++) {
					maxPeak = Math.max(maxPeak, peaks[j]);
				}
				peakValue = maxPeak;
			} else {
				// Sin resamplear: usar el peak directamente
				peakValue = peaks[i];
			}

			// Posición X de la barra
			const x = i * barStep;

			// Altura de la barra (mínimo 2px para silencios)
			const barHeight = Math.max(2, peakValue * canvasHeight * 0.9);
			const y = (canvasHeight - barHeight) / 2;

			// Color según progreso de reproducción (comparar con posición real en canvas completo)
			// Durante streaming, las barras que están antes del progressX se colorean
			const barRealX = isComplete ? x : (x / effectiveWidth) * totalWidth;
			ctx.fillStyle = barRealX < progressX ? progressColor : waveColor;

			// Dibujar barra redondeada
			ctx.beginPath();
			ctx.roundRect(x, y, barWidth, barHeight, 1);
			ctx.fill();
		}

		// Dibujar línea de progreso de reproducción
		// Durante streaming, la línea se muestra en la posición proporcional
		if (progressX > 0 && progressX <= totalWidth) {
			const displayProgressX = isComplete
				? progressX
				: (progressX / totalWidth) * effectiveWidth;
			if (displayProgressX <= effectiveWidth) {
				ctx.fillStyle = progressColor;
				ctx.fillRect(displayProgressX - 1, 0, 2, canvasHeight);
			}
		}

		// Dibujar hover line
		if (hoverX !== null && hoverX >= 0 && hoverX <= totalWidth) {
			ctx.strokeStyle = hoverColor;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(hoverX, 0);
			ctx.lineTo(hoverX, canvasHeight);
			ctx.stroke();
		}

		// Reset transform
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	});

	// Manejar hover
	function handleMouseMove(e: MouseEvent) {
		if (!containerElement) return;
		const rect = containerElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		hoverX = x;

		// Calcular tiempo en la posición del hover
		if (duration > 0) {
			const progress = x / rect.width;
			const time = progress * duration;
			hoverTime = time;
		}
	}

	function handleMouseLeave() {
		hoverX = null;
		hoverTime = null;
	}

	// Manejar click para seek
	function handleClick(e: MouseEvent) {
		if (!containerElement || !duration || !onSeek) return;
		const rect = containerElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const progress = x / rect.width;
		const time = progress * duration;
		onSeek(time);
	}

	// Detectar error de codec
	const isUnsupportedCodec = $derived(
		error?.includes('unsupported codec') || error?.includes('unsupported feature')
	);

	// Formatear tiempo para el tooltip
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<div class="space-y-2" style:min-height="96px">
	<!-- Canvas container -->
	<div
		bind:this={containerElement}
		class="w-full bg-surface rounded-lg border-app cursor-pointer relative"
		style:height="{height}px"
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
		onclick={handleClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				// Simulate click at center of element
				if (containerElement) {
					const rect = containerElement.getBoundingClientRect();
					const fakeEvent = new MouseEvent('click', {
						clientX: rect.left + rect.width / 2,
						clientY: rect.top + rect.height / 2
					});
					handleClick(fakeEvent);
				}
			}
		}}
		role="button"
		tabindex="0"
	>
		<canvas bind:this={canvasElement} class="w-full h-full" />

		<!-- Tooltip de tiempo al hacer hover -->
		{#if hoverTime !== null && hoverX !== null}
			<div
				class="absolute bottom-0 bg-tooltip text-tooltip text-xs px-2 py-1 rounded pointer-events-none"
				style:left="{hoverX}px"
				style:transform="translateX(-50%)"
				style:margin-bottom="4px"
			>
				{formatTime(hoverTime)}
			</div>
		{/if}
	</div>

	<!-- Error Message - Codec no soportado -->
	{#if error && isUnsupportedCodec}
		<div class="text-center text-xs text-yellow-600 dark:text-yellow-400" style:min-height="24px">
			⚠️ Formato de audio no soportado para waveform (M4A/AAC)
		</div>
	{/if}

	<!-- Error Message - Otros errores -->
	{#if error && !isUnsupportedCodec && !error.includes('Cancelled')}
		<div class="text-center text-xs text-red-600 dark:text-red-400" style:min-height="24px">
			❌ Error: {error}
		</div>
	{/if}
</div>
