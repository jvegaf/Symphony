<script lang="ts">
	/**
	 * Modal de selección manual de matches de Beatport
	 *
	 * Muestra los candidatos encontrados en Beatport para cada track local,
	 * permitiendo al usuario seleccionar el correcto o indicar que no está.
	 *
	 * AIDEV-NOTE: Migrado de React a Svelte 5
	 * - Usa $state para selecciones Map
	 * - Usa $derived para contadores
	 * - Auto-selecciona candidatos con >85% similitud
	 * - Sub-componentes (CandidateCard, NotFoundButton, TrackRow) dentro del mismo archivo
	 */

	import type {
		TrackCandidates,
		BeatportCandidate,
		TrackSelection
	} from '../../../types/beatport';
	import { cn } from '../../../utils/cn';

	// Lucide icons (we'll use inline SVGs or material icons instead)
	// For Svelte we'll use simple SVG markup

	/**
	 * Props del componente principal
	 */
	interface Props {
		/** Lista de tracks con sus candidatos de Beatport */
		trackCandidates: TrackCandidates[];
		/** Callback cuando el usuario confirma la selección */
		onConfirm: (selections: TrackSelection[]) => void;
		/** Callback cuando el usuario cancela */
		onCancel: () => void;
		/** Indica si está procesando */
		isLoading?: boolean;
	}

	let { trackCandidates, onConfirm, onCancel, isLoading = false }: Props = $props();

	// Estado de selecciones: Map de local_track_id -> beatport_id (o null)
	let selections = $state<Map<string, number | null>>(new Map());

	// Auto-seleccionar candidatos con alta similitud (>85%) al inicializar
	$effect(() => {
		const initial = new Map<string, number | null>();
		for (const track of trackCandidates) {
			const best = track.candidates[0];
			if (best && best.similarity_score >= 0.85) {
				initial.set(track.local_track_id, best.beatport_id);
			}
		}
		selections = initial;
	});

	// Contadores derivados
	const totalSelections = $derived(selections.size);

	const validMatchCount = $derived(() => {
		let count = 0;
		for (const [, beatportId] of selections) {
			if (beatportId !== null) count++;
		}
		return count;
	});

	const skippedCount = $derived(totalSelections - validMatchCount);

	// Estadísticas
	const totalTracks = $derived(trackCandidates.length);
	const tracksWithCandidates = $derived(
		trackCandidates.filter((t) => t.candidates.length > 0).length
	);

	/**
	 * Handler para cambiar selección
	 */
	function handleSelectionChange(localTrackId: string, beatportId: number | null) {
		selections = new Map(selections).set(localTrackId, beatportId);
	}

	/**
	 * Handler para confirmar
	 */
	function handleConfirm() {
		const result: TrackSelection[] = [];

		for (const [localTrackId, beatportId] of selections) {
			result.push({
				local_track_id: localTrackId,
				beatport_track_id: beatportId
			});
		}

		onConfirm(result);
	}

	// ============================================================================
	// Utility Functions
	// ============================================================================

	/**
	 * Formatea la duración en segundos a formato MM:SS
	 */
	function formatDuration(seconds: number | null | undefined): string {
		if (seconds === null || seconds === undefined || seconds <= 0) return '—';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	/**
	 * Formatea fecha a formato DD/MM/YYYY
	 * Soporta formatos: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SSZ, etc.
	 */
	function formatReleaseDate(dateStr: string | null): string {
		if (!dateStr) return '';

		// Extraer solo la parte de fecha (antes de T si existe)
		const datePart = dateStr.split('T')[0];
		const parts = datePart.split('-');

		if (parts.length !== 3) return dateStr;

		const [year, month, day] = parts;
		return `${day}/${month}/${year}`;
	}

	/**
	 * Devuelve el color de fondo según el score de similitud
	 */
	function getScoreColor(score: number): string {
		if (score >= 0.8) return 'bg-green-500/20 text-green-400 border-green-500/30';
		if (score >= 0.5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
		return 'bg-red-500/20 text-red-400 border-red-500/30';
	}

	/**
	 * Compara duraciones y devuelve si son similares
	 */
	function isDurationMatch(
		localDuration: number | null | undefined,
		candidateDuration: number | null | undefined,
		tolerance = 5
	): boolean {
		if (
			localDuration === null ||
			localDuration === undefined ||
			candidateDuration === null ||
			candidateDuration === undefined
		) {
			return false;
		}
		return Math.abs(localDuration - candidateDuration) <= tolerance;
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
	<div
		class="bg-gray-900 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-gray-700"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-6 py-4 border-b border-gray-700">
			<div>
				<h2 class="text-xl font-semibold text-white">Seleccionar Matches de Beatport</h2>
				<p class="text-sm text-gray-400 mt-1">
					{tracksWithCandidates} de {totalTracks} tracks tienen candidatos
				</p>
			</div>
			<button
				type="button"
				onclick={onCancel}
				class="p-2 hover:bg-gray-800 rounded-lg transition-colors"
				disabled={isLoading}
			>
				<!-- X icon -->
				<svg
					class="w-5 h-5 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Lista de tracks -->
		<div class="flex-1 overflow-y-auto px-6">
			{#each trackCandidates as trackData}
				{@const selection = selections.get(trackData.local_track_id) ?? undefined}
				{@const hasCandidates = trackData.candidates.length > 0}
				{@const hasError = trackData.error !== null}

				<div class="border-b border-gray-700 last:border-b-0 py-4">
					<!-- Header con info del track local -->
					<div class="flex items-center gap-3 mb-3">
						<!-- Music icon -->
						<svg
							class="w-5 h-5 text-gray-400 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
							/>
						</svg>

						<div class="flex-1 min-w-0">
							<p class="font-medium text-white truncate">
								{trackData.local_title}
							</p>
							<p class="text-sm text-gray-400 truncate">
								{trackData.local_artist}
								{#if trackData.local_duration}
									<span class="ml-2 text-gray-500">
										({formatDuration(trackData.local_duration)})
									</span>
								{/if}
							</p>
							<!-- Nombre del archivo -->
							{#if trackData.local_filename}
								<p
									class="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5"
									title={trackData.local_filename}
								>
									<!-- FileAudio icon -->
									<svg
										class="w-3 h-3 flex-shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
										/>
									</svg>
									<span class="truncate">{trackData.local_filename}</span>
								</p>
							{/if}
						</div>

						<!-- Indicador de estado -->
						{#if hasError}
							<div class="flex items-center gap-1 text-red-400 text-xs">
								<!-- AlertCircle icon -->
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<circle cx="12" cy="12" r="10" stroke-width="2" />
									<path stroke-linecap="round" stroke-width="2" d="M12 8v4m0 4h.01" />
								</svg>
								<span>Error</span>
							</div>
						{:else if !hasCandidates}
							<div class="flex items-center gap-1 text-yellow-400 text-xs">
								<!-- AlertCircle icon -->
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<circle cx="12" cy="12" r="10" stroke-width="2" />
									<path stroke-linecap="round" stroke-width="2" d="M12 8v4m0 4h.01" />
								</svg>
								<span>Sin resultados</span>
							</div>
						{/if}
					</div>

					<!-- Candidatos -->
					{#if hasError}
						<div class="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
							{trackData.error}
						</div>
					{:else}
						<div class="flex gap-2 overflow-x-auto pb-2">
							{#each trackData.candidates as candidate}
								{@const scorePercent = Math.round(candidate.similarity_score * 100)}
								{@const durationMatches = isDurationMatch(
									trackData.local_duration,
									candidate.duration_secs
								)}
								{@const fullTitle =
									candidate.mix_name && candidate.mix_name !== 'Original Mix'
										? `${candidate.title} (${candidate.mix_name})`
										: candidate.title}
								{@const isSelected = selection === candidate.beatport_id}

								<!-- CandidateCard -->
								<button
									type="button"
									onclick={() =>
										handleSelectionChange(trackData.local_track_id, candidate.beatport_id)}
									class={cn(
										'relative flex flex-col p-3 rounded-lg border-2 transition-all text-left',
										'hover:border-primary/50 cursor-pointer min-w-[200px] max-w-[220px]',
										isSelected ? 'border-primary bg-primary/10' : 'border-gray-700 bg-gray-800/50'
									)}
								>
									<!-- Indicador de selección -->
									{#if isSelected}
										<div class="absolute top-2 right-2 bg-primary rounded-full p-0.5">
											<!-- Check icon -->
											<svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24">
												<path
													stroke="currentColor"
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="3"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										</div>
									{/if}

									<!-- Header con artwork y título -->
									<div class="flex gap-3 mb-2">
										<!-- Artwork -->
										<div
											class="w-16 h-16 rounded bg-gray-700 overflow-hidden flex-shrink-0"
										>
											{#if candidate.artwork_url}
												<img
													src={candidate.artwork_url}
													alt={candidate.title}
													class="w-full h-full object-cover"
													loading="lazy"
												/>
											{:else}
												<div class="w-full h-full flex items-center justify-center">
													<!-- Disc icon -->
													<svg
														class="w-6 h-6 text-gray-500"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<circle cx="12" cy="12" r="10" stroke-width="2" />
														<circle cx="12" cy="12" r="3" stroke-width="2" />
													</svg>
												</div>
											{/if}
										</div>

										<!-- Título y artista -->
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-white truncate" title={fullTitle}>
												{fullTitle}
											</p>
											<p class="text-xs text-gray-400 truncate" title={candidate.artists}>
												{candidate.artists}
											</p>
											<!-- Mix name badge si no es Original Mix -->
											{#if candidate.mix_name && candidate.mix_name !== 'Original Mix'}
												<span
													class="inline-block mt-1 px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded"
												>
													{candidate.mix_name}
												</span>
											{/if}
										</div>
									</div>

									<!-- Score badge -->
									<div
										class={cn(
											'self-start px-2 py-0.5 rounded-full text-xs font-medium border mb-2',
											getScoreColor(candidate.similarity_score)
										)}
									>
										{scorePercent}% match
									</div>

									<!-- Info grid -->
									<div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
										<!-- Duración - con indicador de match -->
										{#if candidate.duration_secs && candidate.duration_secs > 0}
											<div
												class={cn(
													'flex items-center gap-1',
													durationMatches ? 'text-green-400 font-medium' : 'text-gray-400'
												)}
											>
												<!-- Clock icon -->
												<svg
													class={cn(
														'w-3 h-3 flex-shrink-0',
														durationMatches && 'text-green-400'
													)}
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<circle cx="12" cy="12" r="10" stroke-width="2" />
													<path
														stroke-linecap="round"
														stroke-width="2"
														d="M12 6v6l4 2"
													/>
												</svg>
												<span>{formatDuration(candidate.duration_secs)}</span>
												{#if durationMatches}
													<!-- Check icon -->
													<svg
														class="w-3 h-3 text-green-400 ml-0.5"
														fill="none"
														viewBox="0 0 24 24"
													>
														<path
															stroke="currentColor"
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="3"
															d="M5 13l4 4L19 7"
														/>
													</svg>
												{/if}
											</div>
										{/if}

										<!-- BPM -->
										<div class="flex items-center gap-1 text-gray-400">
											<span class="font-medium">BPM:</span>
											<span>{candidate.bpm ? Math.round(candidate.bpm) : '—'}</span>
										</div>

										<!-- Key -->
										{#if candidate.key}
											<div class="flex items-center gap-1 text-gray-400">
												<span class="font-medium">Key:</span>
												<span>{candidate.key}</span>
											</div>
										{/if}

										<!-- Género -->
										{#if candidate.genre}
											<div
												class={cn(
													'flex items-center gap-1 text-gray-400 truncate',
													!candidate.key && 'col-span-2'
												)}
												title={candidate.genre}
											>
												<span class="font-medium">Genre:</span>
												<span class="truncate">{candidate.genre}</span>
											</div>
										{/if}

										<!-- Release date -->
										{#if candidate.release_date}
											<div class="col-span-2 flex items-center gap-1 text-gray-400">
												<!-- Calendar icon -->
												<svg
													class="w-3 h-3 flex-shrink-0"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<rect
														x="3"
														y="4"
														width="18"
														height="18"
														rx="2"
														ry="2"
														stroke-width="2"
													/>
													<path stroke-linecap="round" stroke-width="2" d="M16 2v4M8 2v4M3 10h18" />
												</svg>
												<span>{formatReleaseDate(candidate.release_date)}</span>
											</div>
										{/if}

										<!-- Label -->
										{#if candidate.label}
											<div
												class="col-span-2 flex items-center gap-1 text-gray-400 truncate"
												title={candidate.label}
											>
												<span class="font-medium">Label:</span>
												<span class="truncate">{candidate.label}</span>
											</div>
										{/if}
									</div>
								</button>
							{/each}

							<!-- NotFoundButton - Siempre mostrar opción "No está en Beatport" -->
							{@const isNotFoundSelected = selection === null}
							<button
								type="button"
								onclick={() => handleSelectionChange(trackData.local_track_id, null)}
								class={cn(
									'relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all',
									'hover:border-red-500/50 cursor-pointer min-w-[200px] max-w-[220px] min-h-[180px]',
									isNotFoundSelected
										? 'border-red-500 bg-red-500/10'
										: 'border-gray-700 bg-gray-800/50'
								)}
							>
								{#if isNotFoundSelected}
									<div class="absolute top-2 right-2 bg-red-500 rounded-full p-0.5">
										<!-- Check icon -->
										<svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24">
											<path
												stroke="currentColor"
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="3"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									</div>
								{/if}

								<!-- X icon -->
								<svg class="w-10 h-10 text-red-400 mb-3" viewBox="0 0 24 24">
									<path
										stroke="currentColor"
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
								<span class="text-sm text-red-400 text-center font-medium">
									No está en<br />Beatport
								</span>
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Footer -->
		<div
			class="flex items-center justify-between px-6 py-4 border-t border-gray-700 bg-gray-800/50"
		>
			<div class="text-sm text-gray-400">
				{#if totalSelections > 0}
					{#if validMatchCount > 0}
						<span class="text-green-400"> ✅ {validMatchCount} para aplicar tags </span>
					{/if}
					{#if validMatchCount > 0 && skippedCount > 0}
						<span> · </span>
					{/if}
					{#if skippedCount > 0}
						<span class="text-gray-500">
							⏭️ {skippedCount}
							saltado{skippedCount !== 1 ? 's' : ''}
						</span>
					{/if}
				{:else}
					Selecciona los tracks correctos
				{/if}
			</div>
			<div class="flex gap-3">
				<button
					type="button"
					onclick={onCancel}
					disabled={isLoading}
					class="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
				>
					Cancelar
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					disabled={isLoading || totalSelections === 0}
					class={cn(
						'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
						totalSelections > 0
							? 'bg-primary text-white hover:bg-primary/90'
							: 'bg-gray-700 text-gray-500 cursor-not-allowed'
					)}
				>
					{#if isLoading}
						<span class="flex items-center gap-2">
							<div
								class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
							></div>
							Aplicando...
						</span>
					{:else}
						Confirmar ({totalSelections})
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>
