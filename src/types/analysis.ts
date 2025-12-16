/**
 * Types para análisis avanzado de audio (Milestone 4)
 * 
 * AIDEV-NOTE: Migrado de number a string (UUID v4) para todos los IDs
 * Interfaces sincronizadas con Rust backend (commands/analysis.rs)
 * Usa camelCase para serialización automática con serde
 */

// ============================================================================
// Beatgrid Types
// ============================================================================

/**
 * Beatgrid de una pista con BPM y offset
 */
export interface Beatgrid {
  trackId: string;
  bpm: number;
  offset: number;
  confidence?: number;
  analyzedAt: string;
}

/**
 * Request para analizar beatgrid (sin request body, solo params)
 */
export interface AnalyzeBeatgridParams {
  trackId: string;
  trackPath: string;
}

/**
 * Request para actualizar offset de beatgrid
 */
export interface UpdateBeatgridOffsetParams {
  trackId: string;
  offset: number;
}

// ============================================================================
// Cue Point Types
// ============================================================================

/**
 * Tipos de cue point
 */
export type CuePointType = 'cue' | 'intro' | 'outro' | 'drop' | 'vocal' | 'break' | 'custom';

/**
 * Cue point de una pista
 */
export interface CuePoint {
  id: string;
  trackId: string;
  position: number;
  label: string;
  color: string;
  type: CuePointType;
  hotkey?: number;
  createdAt: string;
}

/**
 * Request para crear cue point
 */
export interface CreateCuePointRequest {
  trackId: string;
  position: number;
  label?: string;
  color?: string;
  type: CuePointType;
  hotkey?: number;
}

/**
 * Request para actualizar cue point
 */
export interface UpdateCuePointRequest {
  position?: number;
  label?: string;
  color?: string;
  type?: CuePointType;
  hotkey?: number | null;
}

// ============================================================================
// Loop Types
// ============================================================================

/**
 * Loop de una pista
 */
export interface Loop {
  id: string;
  trackId: string;
  label: string;
  loopStart: number;
  loopEnd: number;
  isActive: boolean;
  createdAt: string;
}

/**
 * Request para crear loop
 */
export interface CreateLoopRequest {
  trackId: string;
  label?: string;
  loopStart: number;
  loopEnd: number;
  isActive?: boolean;
}

/**
 * Request para actualizar loop
 */
export interface UpdateLoopRequest {
  label?: string;
  loopStart?: number;
  loopEnd?: number;
  isActive?: boolean;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Valida que un cue point sea válido
 */
export const validateCuePoint = (cue: Partial<CreateCuePointRequest>): string[] => {
  const errors: string[] = [];

  if (cue.position !== undefined && cue.position < 0) {
    errors.push('Position must be >= 0');
  }

  if (cue.hotkey !== undefined && cue.hotkey !== null) {
    if (cue.hotkey < 1 || cue.hotkey > 8) {
      errors.push('Hotkey must be between 1 and 8');
    }
  }

  if (cue.type && !['cue', 'intro', 'outro', 'drop', 'vocal', 'break', 'custom'].includes(cue.type)) {
    errors.push('Invalid cue point type');
  }

  return errors;
};

/**
 * Valida que un loop sea válido
 */
export const validateLoop = (loop: Partial<CreateLoopRequest>): string[] => {
  const errors: string[] = [];

  if (loop.loopStart !== undefined && loop.loopStart < 0) {
    errors.push('Loop start must be >= 0');
  }

  if (loop.loopEnd !== undefined && loop.loopEnd < 0) {
    errors.push('Loop end must be >= 0');
  }

  if (loop.loopStart !== undefined && loop.loopEnd !== undefined) {
    if (loop.loopEnd <= loop.loopStart) {
      errors.push('Loop end must be greater than loop start');
    }

    const duration = loop.loopEnd - loop.loopStart;
    // Epsilon de 0.001 para manejar precisión de punto flotante
    if (duration < 0.1 - 0.001) {
      errors.push('Loop duration must be at least 100ms');
    }
  }

  return errors;
};

/**
 * Valida que un beatgrid sea válido
 */
export const validateBeatgrid = (beatgrid: Partial<Beatgrid>): string[] => {
  const errors: string[] = [];

  if (beatgrid.bpm !== undefined) {
    if (beatgrid.bpm < 60 || beatgrid.bpm > 200) {
      errors.push('BPM must be between 60 and 200');
    }
  }

  if (beatgrid.offset !== undefined && beatgrid.offset < 0) {
    errors.push('Offset must be >= 0');
  }

  if (beatgrid.confidence !== undefined) {
    if (beatgrid.confidence < 0 || beatgrid.confidence > 100) {
      errors.push('Confidence must be between 0 and 100');
    }
  }

  return errors;
};
