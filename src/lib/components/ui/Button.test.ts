import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Button from './Button.svelte';

/**
 * Tests para el componente Button (Svelte 5)
 * 
 * AIDEV-NOTE: Migrado de React Testing Library a Svelte Testing Library
 * - render(<Component />) → render(Component, { props: {...} })
 * - onClick → onclick (lowercase en Svelte)
 * - className → class
 * - No displayName en Svelte (no es necesario)
 */
describe('Button', () => {
  it('debería renderizar correctamente con texto', () => {
    render(Button, {
      props: {
        children: () => 'Click me'
      }
    });
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('debería renderizar con variante primary por defecto', () => {
    render(Button, {
      props: {
        children: () => 'Primary Button'
      }
    });
    const button = screen.getByText('Primary Button');
    expect(button).toHaveClass('bg-primary-600');
  });

  it('debería renderizar con variante secondary cuando se especifica', () => {
    render(Button, {
      props: {
        variant: 'secondary',
        children: () => 'Secondary Button'
      }
    });
    const button = screen.getByText('Secondary Button');
    expect(button).toHaveClass('bg-gray-200');
  });

  it('debería llamar onclick cuando se hace click', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(Button, {
      props: {
        onclick: handleClick,
        children: () => 'Click me'
      }
    });
    
    const button = screen.getByText('Click me');
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('debería estar deshabilitado cuando disabled es true', () => {
    render(Button, {
      props: {
        disabled: true,
        children: () => 'Disabled Button'
      }
    });
    const button = screen.getByText('Disabled Button');
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('no debería llamar onclick cuando está deshabilitado', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(Button, {
      props: {
        onclick: handleClick,
        disabled: true,
        children: () => 'Disabled Button'
      }
    });
    
    const button = screen.getByText('Disabled Button');
    await user.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('debería aplicar class personalizado', () => {
    render(Button, {
      props: {
        class: 'custom-class',
        children: () => 'Custom Button'
      }
    });
    const button = screen.getByText('Custom Button');
    
    expect(button).toHaveClass('custom-class');
  });

  it('debería funcionar como submit button en formularios', () => {
    render(Button, {
      props: {
        type: 'submit',
        children: () => 'Submit'
      }
    });
    
    const button = screen.getByText('Submit');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
