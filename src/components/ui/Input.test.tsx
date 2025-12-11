import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('debería renderizar correctamente', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('debería renderizar con label cuando se proporciona', () => {
    render(<Input label="Username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('debería mostrar mensaje de error cuando se proporciona', () => {
    render(<Input label="Email" error="Email es requerido" />);
    expect(screen.getByText('Email es requerido')).toBeInTheDocument();
  });

  it('debería aplicar estilos de error cuando hay error', () => {
    render(<Input error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  it('debería actualizar el valor cuando el usuario escribe', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Type here" />);
    
    const input = screen.getByPlaceholderText('Type here');
    await user.type(input, 'Hello World');
    
    expect(input).toHaveValue('Hello World');
  });

  it('debería estar deshabilitado cuando disabled es true', () => {
    render(<Input disabled placeholder="Disabled" />);
    const input = screen.getByPlaceholderText('Disabled');
    
    expect(input).toBeDisabled();
  });

  it('debería generar id automático desde el label', () => {
    render(<Input label="User Name" />);
    const input = screen.getByLabelText('User Name');
    
    expect(input).toHaveAttribute('id', 'user-name');
  });

  it('debería usar id personalizado cuando se proporciona', () => {
    render(<Input label="Email" id="custom-id" />);
    const input = screen.getByLabelText('Email');
    
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('debería aplicar className personalizado', () => {
    render(<Input className="custom-input" />);
    const input = screen.getByRole('textbox');
    
    expect(input).toHaveClass('custom-input');
  });

  it('debería tener el displayName correcto', () => {
    expect(Input.displayName).toBe('Input');
  });

  it('debería soportar diferentes tipos de input', () => {
    render(<Input type="password" placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    
    expect(input).toHaveAttribute('type', 'password');
  });

  it('debería renderizar label y error juntos', () => {
    render(<Input label="Username" error="Username es requerido" />);
    
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByText('Username es requerido')).toBeInTheDocument();
  });
});
