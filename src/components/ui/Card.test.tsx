import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('debería renderizar children correctamente', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('debería renderizar título cuando se proporciona', () => {
    render(<Card title="Card Title">Content</Card>);
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('debería renderizar sin título cuando no se proporciona', () => {
    render(<Card>Content without title</Card>);
    
    expect(screen.getByText('Content without title')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('debería aplicar className personalizado al contenedor', () => {
    const { container } = render(
      <Card className="custom-card">Content</Card>
    );
    
    const card = container.firstChild;
    expect(card).toHaveClass('custom-card');
  });

  it('debería tener estilos base correctos', () => {
    const { container } = render(<Card>Content</Card>);
    
    const card = container.firstChild;
    expect(card).toHaveClass('bg-white', 'dark:bg-slate-900', 'rounded-lg');
  });

  it('debería tener el displayName correcto', () => {
    expect(Card.displayName).toBe('Card');
  });

  it('debería renderizar múltiples elementos children', () => {
    render(
      <Card title="Multiple Children">
        <p>First paragraph</p>
        <p>Second paragraph</p>
        <button>Action Button</button>
      </Card>
    );
    
    expect(screen.getByText('First paragraph')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph')).toBeInTheDocument();
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('debería renderizar el título como h3', () => {
    render(<Card title="Card Title">Content</Card>);
    
    const title = screen.getByText('Card Title');
    expect(title.tagName).toBe('H3');
  });

  it('debería separar visualmente el título del contenido', () => {
    const { container } = render(<Card title="Title">Content</Card>);
    
    const titleContainer = container.querySelector('div.border-b');
    expect(titleContainer).toBeInTheDocument();
  });
});
