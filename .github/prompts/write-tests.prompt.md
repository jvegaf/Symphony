---
agent: 'agent'
model: Claude Haiku 4.5
tools: ['search/codebase', 'web/githubRepo']
description: 'Escribir tests unitarios siguiendo TDD'
---

# Escribir Tests (TDD)

Tu objetivo es generar tests unitarios de alta calidad para componentes, hooks o funciones Rust.

## Información Necesaria

Si no está proporcionada, pregunta por:
1. **Qué se está testeando** (componente, hook, función, comando)
2. **Comportamiento esperado** - casos principales
3. **Casos edge** - situaciones especiales
4. **Dependencias** - qué mockear

## Proceso TDD

1. **Entiende la especificación** - Qué debe hacer
2. **Define casos de prueba** - Normal, error, edge cases
3. **Escribe tests que fallen** - Red phase
4. **Implementación mínima** - Green phase
5. **Verifica cobertura** - Mínimo 80%

## Requisitos

### Frontend (Vitest + React Testing Library)
- Organiza con `describe` blocks
- Testa comportamiento, no implementación
- Usa `userEvent` en lugar de `fireEvent`
- Query por accessibility roles
- Mock Tauri y TanStack Query

```typescript
describe("AudioPlayer", () => {
  it("debería reproducir pista al hacer click en botón play", () => {
    render(<AudioPlayer track={mockTrack} />);
    const playButton = screen.getByRole("button", { name: /play/i });
    userEvent.click(playButton);
    expect(mockOnPlay).toHaveBeenCalled();
  });

  it("debería mostrar error cuando falla reproducción", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("Device error"));
    render(<AudioPlayer track={mockTrack} />);
    const playButton = screen.getByRole("button", { name: /play/i });
    userEvent.click(playButton);
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Backend (Cargo + Rust)
- Tests en `#[cfg(test)] mod tests`
- Usa `#[tokio::test]` para async
- Fixtures en `tests/fixtures`
- Property-based testing con `proptest`

```rust
#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_decode_valid_audio() {
    let path = PathBuf::from("tests/fixtures/sample.mp3");
    let result = decode_audio(&path);
    assert!(result.is_ok());
  }

  #[tokio::test]
  async fn test_import_large_library() {
    let path = PathBuf::from("tests/fixtures/library");
    let result = import_library(&path).await;
    assert!(result.is_ok());
    assert!(result.unwrap().count > 100);
  }
}
```

## Coverage

- Target: 80%+ para código nuevo
- Evita: Coverage solo por coverage
- Prioriza: Lógica crítica > boilerplate

```bash
# Frontend
npm run coverage

# Backend
cargo tarpaulin --out Html
```

## Mocks Comunes

### Tauri
```typescript
vi.mock("@tauri-apps/api", () => ({
  invoke: vi.fn(),
  listen: vi.fn(),
}));
```

### TanStack Query
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

<QueryClientProvider client={queryClient}>
  <Component />
</QueryClientProvider>
```

### Stores (Zustand)
```typescript
beforeEach(() => {
  act(() => {
    usePlaylistStore.setState({ playlists: [] });
  });
});
```

## Checklist

- [ ] Tests describen comportamiento
- [ ] Cobertura >= 80%
- [ ] Tests son determinísticos (no flaky)
- [ ] No hay tests skipped (.skip, .only)
- [ ] Nombres claros y descriptivos
- [ ] Mocks son simples y realistas
