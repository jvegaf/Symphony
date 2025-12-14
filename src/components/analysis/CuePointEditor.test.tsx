/**
 * Tests para CuePointEditor
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CuePointEditor } from './CuePointEditor';
import type { CuePoint } from '@/types/analysis';

describe('CuePointEditor', () => {
  const mockCuePoints: CuePoint[] = [
    {
      id: 1,
      trackId: 'track1',
      position: 30,
      label: 'Intro',
      color: null,
      type: 'intro',
      hotkey: 1,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      trackId: 'track1',
      position: 90,
      label: 'Drop',
      color: '#ff0000',
      type: 'drop',
      hotkey: 2,
      createdAt: '2024-01-01T00:01:00Z',
    },
    {
      id: 3,
      trackId: 'track1',
      position: 150,
      label: 'Outro',
      color: null,
      type: 'outro',
      hotkey: null,
      createdAt: '2024-01-01T00:02:00Z',
    },
  ];

  const defaultProps = {
    cuePoints: mockCuePoints,
    duration: 180,
    width: 800,
    height: 200,
  };

  it('debería renderizar sin errores', () => {
    const { container } = render(<CuePointEditor {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('debería renderizar todos los cue points', () => {
    const { container } = render(<CuePointEditor {...defaultProps} />);
    const groups = container.querySelectorAll('g');
    
    // Cada cue point tiene un grupo <g>
    // Más grupos internos para hotkey, etc.
    expect(groups.length).toBeGreaterThan(0);
  });

  it('debería calcular posiciones correctas', () => {
    const { container } = render(<CuePointEditor {...defaultProps} />);
    const lines = container.querySelectorAll('line');
    
    // Primer cue en 30s de 180s = (30/180) * 800 = 133.33px
    const firstLine = lines[0];
    const x1 = parseFloat(firstLine.getAttribute('x1') || '0');
    expect(x1).toBeCloseTo(133.33, 1);
  });

  it('debería usar color predeterminado por tipo', () => {
    const { container } = render(<CuePointEditor {...defaultProps} />);
    const polygons = container.querySelectorAll('polygon');
    
    // Primer cue (intro) debe ser verde (#10b981)
    expect(polygons[0].getAttribute('fill')).toBe('#10b981');
  });

  it('debería usar color personalizado si está definido', () => {
    const { container } = render(<CuePointEditor {...defaultProps} />);
    const polygons = container.querySelectorAll('polygon');
    
    // Segundo cue tiene color personalizado #ff0000
    expect(polygons[1].getAttribute('fill')).toBe('#ff0000');
  });

  it('debería renderizar hotkey badge', () => {
    const { container } = render(<CuePointEditor {...defaultProps} />);
    const circles = container.querySelectorAll('circle');
    const texts = container.querySelectorAll('text');
    
    // Debe haber al menos 2 círculos (para hotkeys 1 y 2)
    expect(circles.length).toBeGreaterThanOrEqual(2);
    
    // Textos deben incluir "1" y "2"
    const textContents = Array.from(texts).map(t => t.textContent);
    expect(textContents).toContain('1');
    expect(textContents).toContain('2');
  });

  it('debería renderizar labels', () => {
    const { container } = render(<CuePointEditor {...defaultProps} />);
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map(t => t.textContent);
    
    expect(textContents).toContain('Intro');
    expect(textContents).toContain('Drop');
    expect(textContents).toContain('Outro');
  });

  it('debería llamar onCuePointClick cuando se hace click', async () => {
    const user = userEvent.setup();
    const onCuePointClick = vi.fn();
    
    const { container } = render(
      <CuePointEditor {...defaultProps} onCuePointClick={onCuePointClick} />
    );
    
    const groups = container.querySelectorAll('g');
    const firstCueGroup = groups[0];
    
    await user.click(firstCueGroup);
    
    expect(onCuePointClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        label: 'Intro',
      })
    );
  });

  it('debería resaltar cue point seleccionado', () => {
    const { container } = render(
      <CuePointEditor {...defaultProps} selectedCuePointId={2} />
    );
    
    const lines = container.querySelectorAll('line');
    const polygons = container.querySelectorAll('polygon');
    
    // Segundo cue point debe tener strokeWidth=3
    expect(lines[1].getAttribute('stroke-width')).toBe('3');
    
    // Segundo polygon debe tener opacity=1
    expect(polygons[1].getAttribute('opacity')).toBe('1');
  });

  it('no debería renderizar si no hay cue points', () => {
    const { container } = render(
      <CuePointEditor {...defaultProps} cuePoints={[]} />
    );
    
    expect(container.querySelector('svg')).toBeNull();
  });

  it('debería aplicar className personalizado', () => {
    const { container } = render(
      <CuePointEditor {...defaultProps} className="custom-class" />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });
});
