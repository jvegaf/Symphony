/**
 * Tests para types/analysis.ts
 */

import { describe, it, expect } from 'vitest';
import {
  validateCuePoint,
  validateLoop,
  validateBeatgrid,
  type CreateCuePointRequest,
  type CreateLoopRequest,
  type Beatgrid,
} from './analysis';

describe('validateCuePoint', () => {
  it('debería validar cue point válido', () => {
    const cue: Partial<CreateCuePointRequest> = {
      trackId: 1,
      position: 30.5,
      type: 'cue',
      hotkey: 1,
    };

    const errors = validateCuePoint(cue);
    expect(errors).toHaveLength(0);
  });

  it('debería rechazar position negativa', () => {
    const cue: Partial<CreateCuePointRequest> = {
      position: -1,
    };

    const errors = validateCuePoint(cue);
    expect(errors).toContain('Position must be >= 0');
  });

  it('debería rechazar hotkey fuera de rango', () => {
    const cue1: Partial<CreateCuePointRequest> = { hotkey: 0 };
    expect(validateCuePoint(cue1)).toContain('Hotkey must be between 1 and 8');

    const cue2: Partial<CreateCuePointRequest> = { hotkey: 9 };
    expect(validateCuePoint(cue2)).toContain('Hotkey must be between 1 and 8');
  });

  it('debería aceptar hotkey null', () => {
    const cue: Partial<CreateCuePointRequest> = {
      position: 30,
      type: 'cue',
      hotkey: undefined,
    };

    const errors = validateCuePoint(cue);
    expect(errors).toHaveLength(0);
  });

  it('debería rechazar tipo de cue point inválido', () => {
    const cue = {
      type: 'invalid' as any,
    };

    const errors = validateCuePoint(cue);
    expect(errors).toContain('Invalid cue point type');
  });
});

describe('validateLoop', () => {
  it('debería validar loop válido', () => {
    const loop: Partial<CreateLoopRequest> = {
      trackId: 1,
      loopStart: 10.0,
      loopEnd: 20.0,
    };

    const errors = validateLoop(loop);
    expect(errors).toHaveLength(0);
  });

  it('debería rechazar loop start negativo', () => {
    const loop: Partial<CreateLoopRequest> = {
      loopStart: -1,
      loopEnd: 10,
    };

    const errors = validateLoop(loop);
    expect(errors).toContain('Loop start must be >= 0');
  });

  it('debería rechazar loop end negativo', () => {
    const loop: Partial<CreateLoopRequest> = {
      loopStart: 0,
      loopEnd: -1,
    };

    const errors = validateLoop(loop);
    expect(errors).toContain('Loop end must be >= 0');
  });

  it('debería rechazar loop con end <= start', () => {
    const loop: Partial<CreateLoopRequest> = {
      loopStart: 20,
      loopEnd: 10,
    };

    const errors = validateLoop(loop);
    expect(errors).toContain('Loop end must be greater than loop start');
  });

  it('debería rechazar loop con duración < 100ms', () => {
    const loop: Partial<CreateLoopRequest> = {
      loopStart: 10.0,
      loopEnd: 10.05, // Solo 50ms
    };

    const errors = validateLoop(loop);
    expect(errors).toContain('Loop duration must be at least 100ms');
  });

  it('debería aceptar loop con duración exacta de 100ms', () => {
    const loop: Partial<CreateLoopRequest> = {
      loopStart: 10.0,
      loopEnd: 10.1,
    };

    const errors = validateLoop(loop);
    expect(errors).toHaveLength(0);
  });
});

describe('validateBeatgrid', () => {
  it('debería validar beatgrid válido', () => {
    const beatgrid: Partial<Beatgrid> = {
      trackId: 1,
      bpm: 120,
      offset: 0.5,
      confidence: 95,
    };

    const errors = validateBeatgrid(beatgrid);
    expect(errors).toHaveLength(0);
  });

  it('debería rechazar BPM fuera de rango', () => {
    const beatgrid1: Partial<Beatgrid> = { bpm: 50 };
    expect(validateBeatgrid(beatgrid1)).toContain('BPM must be between 60 and 200');

    const beatgrid2: Partial<Beatgrid> = { bpm: 250 };
    expect(validateBeatgrid(beatgrid2)).toContain('BPM must be between 60 and 200');
  });

  it('debería aceptar BPM en límites válidos', () => {
    const beatgrid1: Partial<Beatgrid> = { bpm: 60 };
    expect(validateBeatgrid(beatgrid1)).toHaveLength(0);

    const beatgrid2: Partial<Beatgrid> = { bpm: 200 };
    expect(validateBeatgrid(beatgrid2)).toHaveLength(0);
  });

  it('debería rechazar offset negativo', () => {
    const beatgrid: Partial<Beatgrid> = { offset: -0.1 };
    const errors = validateBeatgrid(beatgrid);
    expect(errors).toContain('Offset must be >= 0');
  });

  it('debería rechazar confidence fuera de rango', () => {
    const beatgrid1: Partial<Beatgrid> = { confidence: -1 };
    expect(validateBeatgrid(beatgrid1)).toContain('Confidence must be between 0 and 100');

    const beatgrid2: Partial<Beatgrid> = { confidence: 101 };
    expect(validateBeatgrid(beatgrid2)).toContain('Confidence must be between 0 and 100');
  });

  it('debería aceptar confidence en límites válidos', () => {
    const beatgrid1: Partial<Beatgrid> = { confidence: 0 };
    expect(validateBeatgrid(beatgrid1)).toHaveLength(0);

    const beatgrid2: Partial<Beatgrid> = { confidence: 100 };
    expect(validateBeatgrid(beatgrid2)).toHaveLength(0);
  });
});
