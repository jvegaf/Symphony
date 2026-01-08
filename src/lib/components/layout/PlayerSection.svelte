<script lang="ts">
/**
 * Sección del reproductor con waveform y análisis
 *
 * AIDEV-NOTE: Integra los componentes de análisis (Milestone 4):
 * - BeatgridOverlay: muestra grid de beats sobre el waveform
 * - Control de volumen: slider inline en la sección de controles (play/pause/stop)
 * - Tags (BPM, Key, Year, Genre): ubicadas debajo de los controles de reproducción
 * - Auto-play: cuando termina un track, reproduce automáticamente el siguiente de la lista
 *   - Usa el evento audio:end_of_track del backend
 *   - Requiere props opcionales: tracks[] y onTrackChange callback
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import type { Track } from '../../../types/library';
import WaveformCanvas from '../../WaveformCanvas.svelte';
import BeatgridOverlay from '../../analysis/BeatgridOverlay.svelte';
import Toast from '../../Toast.svelte';
import { useGetBeatgrid, useAnalyzeBeatgrid } from '$lib/hooks/useAnalysis';
import type { Beatgrid } from '@/types/analysis';

interface Props {
	track: Track | null;
	tracks?: Track[];
	onTrackChange?: (track: Track) => void;
}

let { track = null, tracks = [], onTrackChange }: Props = $props();

// AIDEV-NOTE: TanStack Svelte Query hooks para beatgrid analysis
// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
const beatgridQuery = useGetBeatgrid(() => track?.id ?? '');
// biome-ignore lint/correctness/useHookAtTopLevel: False positive - hooks ARE at top level
const analyzeBeatgridMutation = useAnalyzeBeatgrid();

// AIDEV-NOTE: Reactive derived state para beatgrid
const beatgrid = $derived<Beatgrid | null>($beatgridQuery.data ?? null);
const analyzingBeatgrid = $derived(analyzeBeatgridMutation.isPending);

// AIDEV-TODO: Replace with Svelte audio player store when migrated
// Placeholder state for audio player
let isPlaying = $state(false);
let position = $state(0);
let duration = $state(0);
let volume = $state(1.0);
let state = $state<'playing' | 'paused' | 'stopped'>('stopped');
let error = $state<string | null>(null);

// AIDEV-TODO: Replace with Svelte artwork hook/store when migrated
// Placeholder for artwork
let artwork = $state<string | null>(null);

// Waveform dimensions
let waveformContainerRef: HTMLDivElement | undefined = $state();
let waveformDimensions = $state({ width: 0, height: 64 });

const formatDuration = (seconds: number): string => {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// AIDEV-NOTE: Audio player commands - these will be moved to a Svelte store
async function play(path: string) {
	try {
		await invoke('play_track', { path });
		error = null;
	} catch (err) {
		console.error('Error al reproducir pista:', err);
		error = err instanceof Error ? err.message : String(err);
		throw err;
	}
}

async function pause() {
	try {
		await invoke('pause_playback');
	} catch (err) {
		console.error('Error al pausar reproducción:', err);
		error = err instanceof Error ? err.message : String(err);
		throw err;
	}
}

async function resume() {
	try {
		await invoke('resume_playback');
	} catch (err) {
		console.error('Error al reanudar reproducción:', err);
		error = err instanceof Error ? err.message : String(err);
		throw err;
	}
}

async function stop() {
	try {
		await invoke('stop_playback');
		isPlaying = false;
		state = 'stopped';
		position = 0;
		duration = 0;
	} catch (err) {
		console.error('Error al detener reproducción:', err);
		error = err instanceof Error ? err.message : String(err);
		throw err;
	}
}

async function seek(newPosition: number) {
	try {
		await invoke('seek_to_position', { position: newPosition });
	} catch (err) {
		console.error('Error al buscar posición:', err);
		error = err instanceof Error ? err.message : String(err);
		throw err;
	}
}

async function setVolume(newVolume: number) {
	try {
		await invoke('set_playback_volume', { volume: newVolume });
		volume = newVolume;
	} catch (err) {
		console.error('Error al cambiar volumen:', err);
		error = err instanceof Error ? err.message : String(err);
		throw err;
	}
}

const handlePlayPause = async () => {
	if (!track) return;

	try {
		if (isPlaying) {
			await pause();
		} else if (state === 'paused') {
			await resume();
		} else {
			await play(track.path);
		}
	} catch (err) {
		console.error('Error al controlar reproducción:', err);
	}
};

// Analizar beatgrid
const handleAnalyzeBeatgrid = async () => {
	if (!track) return;

	$analyzeBeatgridMutation.mutate(
		{
			trackId: track.id,
			trackPath: track.path
		},
		{
			onError: (err: Error) => {
				console.error('Error analizando beatgrid:', err);
				alert(`Error al analizar beatgrid: ${err.message}`);
			}
		}
	);
};

// Update waveform dimensions on resize
$effect(() => {
	const updateDimensions = () => {
		if (waveformContainerRef) {
			const rect = waveformContainerRef.getBoundingClientRect();
			waveformDimensions = { width: rect.width, height: 64 };
		}
	};

	updateDimensions();
	window.addEventListener('resize', updateDimensions);
	return () => window.removeEventListener('resize', updateDimensions);
});

// AIDEV-NOTE: Setup Tauri event listeners for audio player
$effect(() => {
	let unlistenTimestamp: UnlistenFn | undefined;
	let unlistenState: UnlistenFn | undefined;
	let unlistenEndOfTrack: UnlistenFn | undefined;
	let unlistenError: UnlistenFn | undefined;

	const setupListeners = async () => {
		// audio:timestamp - Update position/duration every 100ms
		unlistenTimestamp = await listen<{ position: number; duration: number }>(
			'audio:timestamp',
			(event) => {
				position = event.payload.position;
				duration = event.payload.duration;
			}
		);

		// audio:state - Update isPlaying/state when changed
		unlistenState = await listen<{
			is_playing: boolean;
			state: 'playing' | 'paused' | 'stopped';
		}>('audio:state', (event) => {
			isPlaying = event.payload.is_playing;
			state = event.payload.state;
		});

		// audio:end_of_track - Track ended
		unlistenEndOfTrack = await listen('audio:end_of_track', () => {
			isPlaying = false;
			state = 'stopped';
			position = 0;
			duration = 0;
		});

		// audio:error - Error in decode thread
		unlistenError = await listen<{ message: string; is_critical: boolean }>(
			'audio:error',
			(event) => {
				const { message, is_critical } = event.payload;
				console.error(`Audio error: ${message} (critical: ${is_critical})`);

				error = message;

				// If critical error, reset player
				if (is_critical) {
					isPlaying = false;
					state = 'stopped';
					position = 0;
					duration = 0;
					volume = 1.0;
				}
			}
		);
	};

	setupListeners();

	// Cleanup
	return () => {
		unlistenTimestamp?.();
		unlistenState?.();
		unlistenEndOfTrack?.();
		unlistenError?.();
	};
});

// AIDEV-NOTE: Auto-play siguiente track cuando termina el actual
$effect(() => {
	if (!track || !onTrackChange || tracks.length === 0) return;

	const currentIndex = tracks.findIndex((t) => t.id === track.id);
	if (currentIndex === -1) return;

	const handleAutoPlay = async () => {
		const nextIndex = currentIndex + 1;
		if (nextIndex < tracks.length) {
			const nextTrack = tracks[nextIndex];
			try {
				await play(nextTrack.path);
				onTrackChange(nextTrack);
			} catch (error) {
				console.error('Error al reproducir siguiente track:', error);
			}
		}
	};

	let unlisten: UnlistenFn | undefined;

	const setupListener = async () => {
		unlisten = await listen('audio:end_of_track', handleAutoPlay);
	};

	setupListener();

	return () => {
		unlisten?.();
	};
});

// AIDEV-NOTE: Load artwork when track changes
$effect(() => {
	if (!track) {
		artwork = null;
		return;
	}

	// AIDEV-TODO: Replace with proper Svelte artwork store/hook
	const loadArtwork = async () => {
		try {
			const result = await invoke<string | null>('get_track_artwork', { id: track.id });
			artwork = result;
		} catch (err) {
			console.error('Error loading artwork:', err);
			artwork = null;
		}
	};

	loadArtwork();
});

// AIDEV-NOTE: Beatgrid se carga automáticamente via useGetBeatgrid query
// cuando cambia el track.id. No necesitamos $effect manual

</script>

<!-- AIDEV-NOTE: Siempre renderizar el mismo layout (altura fija) -->
<!-- Si track es null, mostrar placeholders vacíos pero mantener estructura -->
<div class="p-4 border-b border-gray-200/50 dark:border-gray-700/50" data-testid="player-section">
	<!-- Error Toast -->
	{#if error}
		<Toast
			message={error}
			type="error"
			duration={5000}
			onClose={() => {
				error = null;
			}}
		/>
	{/if}

	<!-- Track Info -->
	<div class="flex items-start">
		<!-- Album Art -->
		<div
			class="w-16 h-16 rounded mr-4 bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden"
			data-testid="player-album-art"
		>
			{#if artwork}
				<img
					src={artwork}
					alt="Artwork de {track?.title || 'track'}"
					class="w-full h-full object-cover"
				/>
			{:else}
				<span class="material-icons text-3xl text-gray-400">
					{track ? 'album' : 'library_music'}
				</span>
			{/if}
		</div>

		<!-- Track Details - ALTURA FIJA -->
		<div class="flex-1">
			<h1
				class="text-2xl font-bold text-gray-900 dark:text-white truncate"
				data-testid="player-track-title"
			>
				{track ? track.title : ''}
			</h1>
			<p class="text-gray-500 dark:text-gray-400 truncate" data-testid="player-track-artist">
				{track ? track.artist : ' '}
			</p>
		</div>

		<!-- Controls -->
		<div class="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
			<button
				type="button"
				data-testid="play-pause-button"
				onclick={handlePlayPause}
				disabled={!track}
				class="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span class="material-icons">
					{isPlaying ? 'pause' : 'play_arrow'}
				</span>
			</button>
			<button
				type="button"
				data-testid="stop-button"
				onclick={() => stop()}
				disabled={!track}
				class="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span class="material-icons">stop</span>
			</button>
			<!-- Analyze Beatgrid Button -->
			<button
				type="button"
				data-testid="analyze-beatgrid-button"
				onclick={handleAnalyzeBeatgrid}
				disabled={!track || analyzingBeatgrid}
				title="Analizar BPM"
				class="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span class="material-icons">
					{analyzingBeatgrid ? 'hourglass_top' : 'speed'}
				</span>
			</button>
			<button
				type="button"
				data-testid="info-button"
				disabled={!track}
				class="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span class="material-icons">info_outline</span>
			</button>

			<!-- Volume Control - AIDEV-NOTE: Alineado a la derecha con los demás controles -->
			<div class="flex items-center space-x-2 ml-4">
				<span class="material-icons text-lg">
					{volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
				</span>
				<input
					type="range"
					min="0"
					max="100"
					value={volume * 100}
					oninput={(e) => setVolume(Number(e.currentTarget.value) / 100)}
					data-testid="volume-slider"
					class="w-24 h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
					title="Volumen: {Math.round(volume * 100)}%"
				/>
			</div>
		</div>
	</div>

	<!-- Tags - Debajo de los controles -->
	<div class="flex space-x-2 text-xs mt-3">
		<!-- Mostrar BPM del beatgrid analizado o del metadata -->
		{#if beatgrid?.bpm || track?.bpm}
			<div
				class={beatgrid?.bpm
					? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded px-2 py-1'
					: 'bg-gray-200 dark:bg-gray-800 rounded px-2 py-1'}
			>
				{beatgrid?.bpm?.toFixed(1) || track?.bpm}BPM
				{#if beatgrid?.confidence}
					<span class="ml-1 text-xs opacity-75">
						({beatgrid.confidence.toFixed(0)}%)
					</span>
				{/if}
			</div>
		{/if}
		{#if track?.key}
			<div class="bg-primary/20 text-primary border border-primary/50 rounded px-2 py-1">
				{track.key}
			</div>
		{/if}
		{#if track?.year}
			<div class="bg-gray-200 dark:bg-gray-800 text-primary rounded px-2 py-1">
				{track.year}
			</div>
		{/if}
		{#if track?.genre}
			<div class="bg-gray-200 dark:bg-gray-800 text-primary rounded px-2 py-1">
				{track.genre}
			</div>
		{/if}
	</div>

	<!-- Waveform con overlays - CONTENEDOR RELATIVO -->
	<!-- AIDEV-NOTE: El contenedor es relative para que los overlays se posicionen absolute -->
	<div bind:this={waveformContainerRef} class="mt-3 relative" data-testid="waveform-container">
		<!-- Waveform Canvas -->
		<WaveformCanvas
			trackId={track?.id}
			trackPath={track?.path}
			duration={track?.duration}
			currentTime={position}
			height={96}
			onSeek={seek}
			shouldGenerate={!!track && (state === 'playing' || state === 'paused')}
		/>

		<!-- Beatgrid Overlay - solo si hay beatgrid -->
		{#if beatgrid && waveformDimensions.width > 0}
			<BeatgridOverlay
				duration={track?.duration ?? 0}
				bpm={beatgrid.bpm}
				offset={beatgrid.offset}
				width={waveformDimensions.width}
				height={waveformDimensions.height}
				confidence={beatgrid.confidence}
				showBeatNumbers={false}
				className="pointer-events-none"
			/>
		{/if}
	</div>

	<!-- Time - ALTURA FIJA -->
	<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
		<span class="font-mono font-bold text-blue-600" data-testid="player-current-time">
			{formatDuration(position)}
		</span>
		<span class="font-mono" data-testid="player-duration">
			{formatDuration(duration > 0 ? duration : track?.duration ?? 0)}
		</span>
	</div>
</div>
