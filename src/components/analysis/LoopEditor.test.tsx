/**
 * Tests para LoopEditor
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoopEditor } from './LoopEditor';
import type { Loop } from '../../types/analysis';

describe('LoopEditor', () => {
  const mockLoops: Loop[] = [
    {
      id: "1",
      trackId: 'track1',
      label: 'Verse',
      loopStart: 30,
      loopEnd: 60,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: "2",
      trackId: 'track1',
      label: 'Chorus',
      loopStart: 90,
      loopEnd: 120,
      isActive: false,
      createdAt: '2024-01-01T00:01:00Z',
    },
    {
      id: "3",
      trackId: 'track1',
      label: "Loop 3",
      loopStart: 150,
      loopEnd: 165,
      isActive: true,
      createdAt: '2024-01-01T00:02:00Z',
    },
  ];

  const defaultProps = {
    loops: mockLoops,
    duration: 180,
    width: 800,
    height: 200,
  };

  it('debería renderizar sin errores', () => {
    const { container } = render(<LoopEditor {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('debería renderizar todos los loops', () => {
    const { container } = render(<LoopEditor {...defaultProps} />);
    const rects = container.querySelectorAll('rect');
    
    // Cada loop tiene varios rectángulos (región + handles + label bg)
    // Al menos 1 rectángulo por loop
    expect(rects.length).toBeGreaterThanOrEqual(3);
  });

  it('debería calcular posiciones y anchos correctos', () => {
    const { container } = render(<LoopEditor {...defaultProps} />);
    const rects = container.querySelectorAll('rect');
    
    // Primer loop: 30s-60s de 180s
    // x = (30/180) * 800 = 133.33
    // width = (30/180) * 800 = 133.33
    const firstRect = rects[0];
    const x = parseFloat(firstRect.getAttribute('x') || '0');
    const width = parseFloat(firstRect.getAttribute('width') || '0');
    
    expect(x).toBeCloseTo(133.33, 1);
    expect(width).toBeCloseTo(133.33, 1);
  });

  it('debería usar color verde para loops activos', () => {
    const { container } = render(<LoopEditor {...defaultProps} />);
    const rects = container.querySelectorAll('rect');
    
    // Primer loop es activo, debe ser verde (#10b981)
    expect(rects[0].getAttribute('fill')).toBe('#10b981');
  });

  it('debería usar color gris para loops inactivos', () => {
    const { container } = render(<LoopEditor {...defaultProps} />);
    const rects = container.querySelectorAll('rect');
    
    // Segundo loop es inactivo, debe ser gris (#6b7280)
    // Buscar el segundo rectángulo de loop
    const inactiveLoop = Array.from(rects).find(
      rect => rect.getAttribute('fill') === '#6b7280'
    );
    expect(inactiveLoop).toBeInTheDocument();
  });

  it('debería mostrar labels de loops', () => {
    const { container } = render(<LoopEditor {...defaultProps} />);
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map(t => t.textContent);
    
    expect(textContents).toContain('Verse');
    expect(textContents).toContain('Chorus');
    // AIDEV-NOTE: El tercer loop tiene label "Loop 3", no "Loop"
    expect(textContents).toContain('Loop 3');
  });

  it('debería mostrar duración de loops formateada', () => {
    const { container } = render(<LoopEditor {...defaultProps} />);
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map(t => t.textContent);
    
    // Primer loop: 30s de duración = 0:30
    expect(textContents).toContain('0:30');
    
    // Segundo loop: 30s de duración = 0:30
    expect(textContents.filter(t => t === '0:30').length).toBe(2);
    
    // Tercer loop: 15s de duración = 0:15
    expect(textContents).toContain('0:15');
  });

  it('debería renderizar marcadores de inicio y fin', () => {
    const { container } = render(<LoopEditor {...defaultProps} />);
    const lines = container.querySelectorAll('line');
    
    // Cada loop tiene 2 líneas (inicio y fin)
    expect(lines.length).toBe(mockLoops.length * 2);
  });

  it('debería llamar onLoopClick cuando se hace click', async () => {
    const user = userEvent.setup();
    const onLoopClick = vi.fn();
    
    const { container } = render(
      <LoopEditor {...defaultProps} onLoopClick={onLoopClick} />
    );
    
    const firstRect = container.querySelectorAll('rect')[0];
    await user.click(firstRect);
    
    // AIDEV-NOTE: IDs son strings (UUID), no números
    expect(onLoopClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        label: 'Verse',
      })
    );
  });

  it('debería resaltar loop seleccionado', () => {
    const { container } = render(
      <LoopEditor {...defaultProps} selectedLoopId="2" />
    );
    
    const rects = container.querySelectorAll('rect');
    
    // Loop seleccionado debe tener stroke-width=2
    // Buscar rectángulos con stroke-width="2"
    const selectedRects = Array.from(rects).filter(
      rect => rect.getAttribute('stroke-width') === '2'
    );
    expect(selectedRects.length).toBeGreaterThan(0);
  });

  it('no debería renderizar si no hay loops', () => {
    const { container } = render(
      <LoopEditor {...defaultProps} loops={[]} />
    );
    
    expect(container.querySelector('svg')).toBeNull();
  });

  it('debería aplicar className personalizado', () => {
    const { container } = render(
      <LoopEditor {...defaultProps} className="custom-class" />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('debería calcular duración correctamente para loops cortos', () => {
    const shortLoop: Loop = {
      id: "4",
      trackId: 'track1',
      label: 'Short',
      loopStart: 0,
      loopEnd: 0.1, // 100ms = mínimo válido
      isActive: true,
      createdAt: '2024-01-01T00:03:00Z',
    };
    
    const { container } = render(
      <LoopEditor {...defaultProps} loops={[shortLoop]} />
    );
    
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map(t => t.textContent);
    
    // 0.1s = 0:00
    expect(textContents).toContain('0:00');
  });
});
