import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('debería renderizar correctamente con texto', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('debería renderizar con variante primary por defecto', () => {
    render(<Button>Primary Button</Button>);
    const button = screen.getByText('Primary Button');
    expect(button).toHaveClass('bg-primary-600');
  });

  it('debería renderizar con variante secondary cuando se especifica', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByText('Secondary Button');
    expect(button).toHaveClass('bg-gray-200');
  });

  it('debería llamar onClick cuando se hace click', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByText('Click me');
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('debería estar deshabilitado cuando disabled es true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByText('Disabled Button');
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('no debería llamar onClick cuando está deshabilitado', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(
      <Button onClick={handleClick} disabled>
        Disabled Button
      </Button>
    );
    
    const button = screen.getByText('Disabled Button');
    await user.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('debería aplicar className personalizado', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    const button = screen.getByText('Custom Button');
    
    expect(button).toHaveClass('custom-class');
  });

  it('debería tener el displayName correcto', () => {
    expect(Button.displayName).toBe('Button');
  });

  it('debería funcionar como submit button en formularios', () => {
    render(
      <form>
        <Button type="submit">Submit</Button>
      </form>
    );
    
    const button = screen.getByText('Submit');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
