/**
 * Modal de selección manual de matches de Beatport
 *
 * Muestra los candidatos encontrados en Beatport para cada track local,
 * permitiendo al usuario seleccionar el correcto o indicar que no está.
 */

import { useState, useMemo } from "react";
import { X, Music, Clock, Check, AlertCircle, Disc, Calendar, FileAudio } from "lucide-react";
import type { TrackCandidates, BeatportCandidate, TrackSelection } from "../../types/beatport";
import { cn } from "../../utils/cn";

interface BeatportSelectionModalProps {
  /** Lista de tracks con sus candidatos de Beatport */
  trackCandidates: TrackCandidates[];
  /** Callback cuando el usuario confirma la selección */
  onConfirm: (selections: TrackSelection[]) => void;
  /** Callback cuando el usuario cancela */
  onCancel: () => void;
  /** Indica si está procesando */
  isLoading?: boolean;
}

/**
 * Formatea la duración en segundos a formato MM:SS
 */
function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formatea fecha a formato DD/MM/YYYY
 * Soporta formatos: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SSZ, etc.
 */
function formatReleaseDate(dateStr: string | null): string {
  if (!dateStr) return "";

  // Extraer solo la parte de fecha (antes de T si existe)
  const datePart = dateStr.split("T")[0];
  const parts = datePart.split("-");

  if (parts.length !== 3) return dateStr;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/**
 * Devuelve el color de fondo según el score de similitud
 */
function getScoreColor(score: number): string {
  if (score >= 0.8) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (score >= 0.5) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

/**
 * Compara duraciones y devuelve si son similares
 * @param localDuration Duración del track local en segundos
 * @param candidateDuration Duración del candidato en segundos
 * @param tolerance Tolerancia en segundos (default: 5)
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

/**
 * Componente para mostrar un candidato de Beatport
 */
function CandidateCard({
  candidate,
  isSelected,
  onSelect,
  localDuration,
}: {
  candidate: BeatportCandidate;
  isSelected: boolean;
  onSelect: () => void;
  /** Duración del track local para comparar */
  localDuration?: number | null;
}) {
  const scorePercent = Math.round(candidate.similarity_score * 100);
  const durationMatches = isDurationMatch(localDuration, candidate.duration_secs);

  // Construir el título completo con mix_name si existe
  const fullTitle = candidate.mix_name && candidate.mix_name !== "Original Mix"
    ? `${candidate.title} (${candidate.mix_name})`
    : candidate.title;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col p-3 rounded-lg border-2 transition-all text-left",
        "hover:border-primary/50 cursor-pointer min-w-[200px] max-w-[220px]",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-gray-700 bg-gray-800/50"
      )}
    >
      {/* Indicador de selección */}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Header con artwork y título */}
      <div className="flex gap-3 mb-2">
        {/* Artwork */}
        <div className="w-16 h-16 rounded bg-gray-700 overflow-hidden flex-shrink-0">
          {candidate.artwork_url ? (
            <img
              src={candidate.artwork_url}
              alt={candidate.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc className="w-6 h-6 text-gray-500" />
            </div>
          )}
        </div>

        {/* Título y artista */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate" title={fullTitle}>
            {fullTitle}
          </p>
          <p className="text-xs text-gray-400 truncate" title={candidate.artists}>
            {candidate.artists}
          </p>
          {/* Mix name badge si no es Original Mix */}
          {candidate.mix_name && candidate.mix_name !== "Original Mix" && (
            <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded">
              {candidate.mix_name}
            </span>
          )}
        </div>
      </div>

      {/* Score badge */}
      <div className={cn(
        "self-start px-2 py-0.5 rounded-full text-xs font-medium border mb-2",
        getScoreColor(candidate.similarity_score)
      )}>
        {scorePercent}% match
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {/* Duración - con indicador de match */}
        {candidate.duration_secs && candidate.duration_secs > 0 ? (
          <div className={cn(
            "flex items-center gap-1",
            durationMatches
              ? "text-green-400 font-medium"
              : "text-gray-400"
          )}>
            <Clock className={cn(
              "w-3 h-3 flex-shrink-0",
              durationMatches && "text-green-400"
            )} />
            <span>{formatDuration(candidate.duration_secs)}</span>
            {durationMatches && (
              <Check className="w-3 h-3 text-green-400 ml-0.5" />
            )}
          </div>
        ) : null}

        {/* BPM */}
        <div className="flex items-center gap-1 text-gray-400">
          <span className="font-medium">BPM:</span>
          <span>{candidate.bpm ? Math.round(candidate.bpm) : "—"}</span>
        </div>

        {/* Key */}
        {candidate.key && (
          <div className="flex items-center gap-1 text-gray-400">
            <span className="font-medium">Key:</span>
            <span>{candidate.key}</span>
          </div>
        )}

        {/* Género */}
        {candidate.genre && (
          <div className={cn(
            "flex items-center gap-1 text-gray-400 truncate",
            !candidate.key && "col-span-2"
          )} title={candidate.genre}>
            <span className="font-medium">Genre:</span>
            <span className="truncate">{candidate.genre}</span>
          </div>
        )}

        {/* Release date */}
        {candidate.release_date && (
          <div className="col-span-2 flex items-center gap-1 text-gray-400">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{formatReleaseDate(candidate.release_date)}</span>
          </div>
        )}

        {/* Label */}
        {candidate.label && (
          <div className="col-span-2 flex items-center gap-1 text-gray-400 truncate" title={candidate.label}>
            <span className="font-medium">Label:</span>
            <span className="truncate">{candidate.label}</span>
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Botón "No está en Beatport"
 */
function NotFoundButton({
  isSelected,
  onSelect,
}: {
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
        "hover:border-red-500/50 cursor-pointer min-w-[200px] max-w-[220px] min-h-[180px]",
        isSelected
          ? "border-red-500 bg-red-500/10"
          : "border-gray-700 bg-gray-800/50"
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 bg-red-500 rounded-full p-0.5">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      <X className="w-10 h-10 text-red-400 mb-3" />
      <span className="text-sm text-red-400 text-center font-medium">
        No está en<br />Beatport
      </span>
    </button>
  );
}

/**
 * Fila de un track local con sus candidatos
 */
function TrackRow({
  trackData,
  selection,
  onSelectionChange,
}: {
  trackData: TrackCandidates;
  selection: number | null | undefined; // beatport_id, null (no está), o undefined (sin selección)
  onSelectionChange: (beatportId: number | null) => void;
}) {
  const hasCandidates = trackData.candidates.length > 0;
  const hasError = trackData.error !== null;

  // Pre-seleccionar automáticamente el mejor candidato si tiene >85% de similitud
  const bestCandidate = trackData.candidates[0];
  const shouldAutoSelect = bestCandidate && bestCandidate.similarity_score >= 0.85;

  // Si no hay selección pero debería auto-seleccionar, hacerlo
  useMemo(() => {
    if (selection === undefined && shouldAutoSelect) {
      onSelectionChange(bestCandidate.beatport_id);
    }
  }, [selection, shouldAutoSelect, bestCandidate, onSelectionChange]);

  return (
    <div className="border-b border-gray-700 last:border-b-0 py-4">
      {/* Header con info del track local */}
      <div className="flex items-center gap-3 mb-3">
        <Music className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">
            {trackData.local_title}
          </p>
          <p className="text-sm text-gray-400 truncate">
            {trackData.local_artist}
            {trackData.local_duration && (
              <span className="ml-2 text-gray-500">
                ({formatDuration(trackData.local_duration)})
              </span>
            )}
          </p>
          {/* Nombre del archivo */}
          {trackData.local_filename && (
            <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5" title={trackData.local_filename}>
              <FileAudio className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{trackData.local_filename}</span>
            </p>
          )}
        </div>

        {/* Indicador de estado */}
        {hasError && (
          <div className="flex items-center gap-1 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>Error</span>
          </div>
        )}
        {!hasCandidates && !hasError && (
          <div className="flex items-center gap-1 text-yellow-400 text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>Sin resultados</span>
          </div>
        )}
      </div>

      {/* Candidatos */}
      {hasError ? (
        <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
          {trackData.error}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {trackData.candidates.map((candidate: BeatportCandidate) => (
            <CandidateCard
              key={candidate.beatport_id}
              candidate={candidate}
              isSelected={selection === candidate.beatport_id}
              onSelect={() => onSelectionChange(candidate.beatport_id)}
              localDuration={trackData.local_duration}
            />
          ))}

          {/* Siempre mostrar opción "No está en Beatport" */}
          <NotFoundButton
            isSelected={selection === null}
            onSelect={() => onSelectionChange(null)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Modal principal de selección de matches de Beatport
 */
export function BeatportSelectionModal({
  trackCandidates,
  onConfirm,
  onCancel,
  isLoading = false,
}: BeatportSelectionModalProps) {
  // Estado de selecciones: Map de local_track_id -> beatport_id (o null)
  const [selections, setSelections] = useState<Map<string, number | null>>(() => {
    const initial = new Map<string, number | null>();

    // Auto-seleccionar candidatos con alta similitud (>85%)
    for (const track of trackCandidates) {
      const best = track.candidates[0];
      if (best && best.similarity_score >= 0.85) {
        initial.set(track.local_track_id, best.beatport_id);
      }
    }

    return initial;
  });

  // Contar tracks con selección (cualquier selección hecha)
  const totalSelections = selections.size;

  // Contar tracks con match válido (beatport_id no null)
  const validMatchCount = useMemo(() => {
    let count = 0;
    for (const [, beatportId] of selections) {
      if (beatportId !== null) count++;
    }
    return count;
  }, [selections]);

  // Contar "No está en Beatport" seleccionados
  const skippedCount = totalSelections - validMatchCount;

  // Handler para cambiar selección
  const handleSelectionChange = (localTrackId: string, beatportId: number | null) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(localTrackId, beatportId);
      return next;
    });
  };

  // Handler para confirmar
  const handleConfirm = () => {
    const result: TrackSelection[] = [];

    for (const [localTrackId, beatportId] of selections) {
      result.push({
        local_track_id: localTrackId,
        beatport_track_id: beatportId,
      });
    }

    onConfirm(result);
  };

  // Estadísticas
  const totalTracks = trackCandidates.length;
  const tracksWithCandidates = trackCandidates.filter(t => t.candidates.length > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Seleccionar Matches de Beatport
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {tracksWithCandidates} de {totalTracks} tracks tienen candidatos
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Lista de tracks */}
        <div className="flex-1 overflow-y-auto px-6">
          {trackCandidates.map((trackData) => (
            <TrackRow
              key={trackData.local_track_id}
              trackData={trackData}
              selection={selections.get(trackData.local_track_id) ?? undefined}
              onSelectionChange={(beatportId) =>
                handleSelectionChange(trackData.local_track_id, beatportId)
              }
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700 bg-gray-800/50">
          <div className="text-sm text-gray-400">
            {totalSelections > 0 ? (
              <>
                {validMatchCount > 0 && (
                  <span className="text-green-400">
                    ✅ {validMatchCount} para aplicar tags
                  </span>
                )}
                {validMatchCount > 0 && skippedCount > 0 && " · "}
                {skippedCount > 0 && (
                  <span className="text-gray-500">
                    ⏭️ {skippedCount} saltado{skippedCount !== 1 ? 's' : ''}
                  </span>
                )}
              </>
            ) : (
              "Selecciona los tracks correctos"
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || totalSelections === 0}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                totalSelections > 0
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Aplicando...
                </span>
              ) : (
                `Confirmar (${totalSelections})`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

BeatportSelectionModal.displayName = "BeatportSelectionModal";
