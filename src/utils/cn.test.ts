import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('debería combinar clases simples', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('debería manejar valores condicionales', () => {
    expect(cn('base', true && 'active')).toBe('base active');
    expect(cn('base', false && 'inactive')).toBe('base');
  });

  it('debería filtrar valores falsy', () => {
    expect(cn('class1', null, undefined, false, 'class2')).toBe('class1 class2');
  });

  it('debería manejar objetos con valores booleanos', () => {
    expect(cn({ active: true, disabled: false })).toBe('active');
  });

  it('debería combinar arrays de clases', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
  });

  it('debería mantener el orden de clases', () => {
    // clsx no elimina duplicados, solo combina clases
    expect(cn('class1', 'class2', 'class1')).toBe('class1 class2 class1');
  });

  it('debería manejar strings vacíos', () => {
    expect(cn('', 'class1', '')).toBe('class1');
  });

  it('debería manejar casos complejos', () => {
    const isActive = true;
    const isDisabled = false;
    
    expect(
      cn(
        'base-class',
        isActive && 'active',
        isDisabled && 'disabled',
        { hover: true, focus: false }
      )
    ).toBe('base-class active hover');
  });

  it('debería funcionar sin argumentos', () => {
    expect(cn()).toBe('');
  });

  it('debería funcionar con un solo argumento', () => {
    expect(cn('single-class')).toBe('single-class');
  });
});
