/**
 * Tests para BeatgridOverlay
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BeatgridOverlay } from './BeatgridOverlay';

describe('BeatgridOverlay', () => {
  const defaultProps = {
    duration: 180, // 3 minutos
    bpm: 120,
    offset: 0,
    width: 800,
    height: 200,
  };

  it('debería renderizar sin errores', () => {
    const { container } = render(<BeatgridOverlay {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('debería calcular correctamente el número de beats', () => {
    const { container } = render(<BeatgridOverlay {...defaultProps} />);
    const lines = container.querySelectorAll('line');
    
    // 120 BPM = 2 beats/segundo
    // 180 segundos = 360 beats
    expect(lines.length).toBe(360);
  });

  it('debería aplicar offset correctamente', () => {
    const { container } = render(
      <BeatgridOverlay {...defaultProps} offset={0.5} />
    );
    
    const firstLine = container.querySelector('line');
    expect(firstLine).toBeInTheDocument();
    
    // Primer beat en 0.5s = (0.5/180) * 800 = 2.22px
    const x1 = firstLine?.getAttribute('x1');
    expect(parseFloat(x1!)).toBeCloseTo(2.22, 1);
  });

  it('debería destacar downbeats (cada 4 beats)', () => {
    const { container } = render(<BeatgridOverlay {...defaultProps} />);
    const lines = container.querySelectorAll('line');
    
    // Primer beat (downbeat) debe tener strokeWidth=2
    const firstLine = lines[0];
    expect(firstLine.getAttribute('stroke-width')).toBe('2');
    
    // Segundo beat debe tener strokeWidth=1
    const secondLine = lines[1];
    expect(secondLine.getAttribute('stroke-width')).toBe('1');
    
    // Quinto beat (downbeat) debe tener strokeWidth=2
    const fifthLine = lines[4];
    expect(fifthLine.getAttribute('stroke-width')).toBe('2');
  });

  it('debería mostrar números de beat cuando showBeatNumbers=true', () => {
    const { container } = render(
      <BeatgridOverlay {...defaultProps} showBeatNumbers />
    );
    
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
    
    // Primer texto debe ser "1"
    expect(texts[0].textContent).toBe('1');
  });

  it('no debería mostrar números de beat cuando showBeatNumbers=false', () => {
    const { container } = render(
      <BeatgridOverlay {...defaultProps} showBeatNumbers={false} />
    );
    
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBe(0);
  });

  it('debería aplicar confidence a la opacidad', () => {
    const { container: lowConfidence } = render(
      <BeatgridOverlay {...defaultProps} confidence={30} />
    );
    const lowLine = lowConfidence.querySelector('line');
    const lowOpacity = parseFloat(lowLine?.getAttribute('opacity') || '0');
    
    const { container: highConfidence } = render(
      <BeatgridOverlay {...defaultProps} confidence={90} />
    );
    const highLine = highConfidence.querySelector('line');
    const highOpacity = parseFloat(highLine?.getAttribute('opacity') || '0');
    
    // Mayor confidence = mayor opacidad
    expect(highOpacity).toBeGreaterThan(lowOpacity);
  });

  it('no debería renderizar si BPM <= 0', () => {
    const { container } = render(
      <BeatgridOverlay {...defaultProps} bpm={0} />
    );
    
    expect(container.querySelector('svg')).toBeNull();
  });

  it('no debería renderizar si duration <= 0', () => {
    const { container } = render(
      <BeatgridOverlay {...defaultProps} duration={0} />
    );
    
    expect(container.querySelector('svg')).toBeNull();
  });

  it('debería aplicar className personalizado', () => {
    const { container } = render(
      <BeatgridOverlay {...defaultProps} className="custom-class" />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('debería calcular posiciones correctas para diferentes BPMs', () => {
    const { container: bpm60 } = render(
      <BeatgridOverlay {...defaultProps} bpm={60} duration={60} />
    );
    
    // 60 BPM = 1 beat/segundo
    // 60 segundos = 60 beats
    const lines60 = bpm60.querySelectorAll('line');
    expect(lines60.length).toBe(60);
    
    const { container: bpm180 } = render(
      <BeatgridOverlay {...defaultProps} bpm={180} duration={60} />
    );
    
    // 180 BPM = 3 beats/segundo
    // 60 segundos = 180 beats
    const lines180 = bpm180.querySelectorAll('line');
    expect(lines180.length).toBe(180);
  });
});
