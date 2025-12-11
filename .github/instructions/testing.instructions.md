---
applyTo: "**/*.test.ts,**/*.test.tsx,**/*.spec.rs"
description: "Estándares de testing y TDD para Symphony"
---

# Estrategia de Testing

## Principios TDD

### Ciclo Red-Green-Refactor
1. **Red**: Escribe test que falla (comportamiento esperado)
2. **Green**: Escribe código mínimo para pasar el test
3. **Refactor**: Mejora sin cambiar comportamiento
4. **Repeat**: Siguiente característica

### Cobertura
- **Mínimo requerido**: 80% para código nuevo
- **Objetivo**: 90%+ en lógica crítica (audio, base de datos)
- **Excluidos**: Configuración, generated code, tipos puros
- **Métrica**: `npm run coverage` (frontend) y `cargo tarpaulin` (backend)

## Testing Frontend (Vitest + React Testing Library)

### Estructura de Archivos
```
src/
├── components/
│   ├── AudioPlayer.tsx
│   └── AudioPlayer.test.tsx          # Test unitario
├── hooks/
│   ├── useAudioPlayer.ts
│   └── useAudioPlayer.test.ts
├── stores/
│   ├── libraryStore.ts
│   └── libraryStore.test.ts
└── __tests__/
    └── integration/                   # Tests de integración
        └── library-workflow.test.ts
```

### Unit Tests - Componentes
- Testa comportamiento visible del usuario
- No testes implementación interna
- Usa queries accesibles (`getByRole`, `getByLabelText`)

```typescript
// ✓ Bien: Testa comportamiento
describe("AudioPlayer", () => {
  it("debería reproducir pista al hacer click en botón play", () => {
    const { getByRole } = render(
      <AudioPlayer track={mockTrack} />
    );
    
    const playButton = getByRole("button", { name: /play/i });
    userEvent.click(playButton);
    
    expect(mockOnPlay).toHaveBeenCalledWith(mockTrack);
  });

  it("debería mostrar tiempo actual de reproducción", () => {
    const { getByText } = render(
      <AudioPlayer track={mockTrack} currentTime={30} />
    );
    
    expect(getByText("00:30")).toBeInTheDocument();
  });
});

// ✗ Evita: Testa implementación
describe("AudioPlayer", () => {
  it("debería tener className 'audio-player'", () => {
    const { container } = render(<AudioPlayer track={mockTrack} />);
    expect(container.querySelector(".audio-player")).toBeInTheDocument();
  });
});
```

### Unit Tests - Hooks
- Usa `renderHook` de React Testing Library
- Simula cambios de props
- Verifica actualizaciones de estado

```typescript
describe("useAudioPlayer", () => {
  it("debería devolver estado inicial correcto", () => {
    const { result } = renderHook(() => useAudioPlayer("track123"));
    
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
  });

  it("debería actualizar posición al hacer seek", () => {
    const { result } = renderHook(() => useAudioPlayer("track123"));
    
    act(() => {
      result.current.seek(45);
    });
    
    expect(result.current.currentTime).toBe(45);
  });
});
```

### Unit Tests - Stores (Zustand/Jotai)
- Testa acciones del store
- Verifica actualizaciones de estado
- Valida selectors

```typescript
describe("PlaylistStore", () => {
  beforeEach(() => {
    // Reset store antes de cada test
    act(() => {
      usePlaylistStore.setState({ playlists: [] });
    });
  });

  it("debería agregar playlist al store", () => {
    const { result } = renderHook(() => usePlaylistStore());
    const playlist = { id: "1", name: "Mi Playlist", tracks: [] };
    
    act(() => {
      result.current.addPlaylist(playlist);
    });
    
    expect(result.current.playlists).toHaveLength(1);
    expect(result.current.playlists[0]).toEqual(playlist);
  });
});
```

### Integration Tests
- Testa flujos completos de usuario
- Combina múltiples componentes
- Usa datos más realistas

```typescript
describe("Library Workflow", () => {
  it("debería importar biblioteca y mostrar pistas", async () => {
    const { getByRole, getByText } = render(
      <LibraryProvider>
        <LibraryBrowser />
      </LibraryProvider>
    );
    
    const importButton = getByRole("button", { name: /importar/i });
    userEvent.click(importButton);
    
    await waitFor(() => {
      expect(getByText(/pistas importadas/i)).toBeInTheDocument();
    });
  });
});
```

### Mocks
- Mock Tauri commands explícitamente
- Mock TanStack Query cuando necesites control
- Usa `vitest.mock()` en top-level

```typescript
vi.mock("@tauri-apps/api/tauri", () => ({
  invoke: vi.fn(async (command: string, args?: any) => {
    if (command === "get_tracks") {
      return mockTracks;
    }
  }),
}));

describe("TrackList", () => {
  it("debería cargar pistas desde Tauri", async () => {
    const { getByText } = render(<TrackList />);
    
    await waitFor(() => {
      expect(getByText(mockTracks[0].title)).toBeInTheDocument();
    });
  });
});
```

## Testing Backend (Rust + Cargo)

### Estructura
- Tests unitarios en mismo archivo (`#[cfg(test)] mod tests`)
- Tests de integración en `tests/` directorio
- Fixtures en `tests/fixtures/`

```rust
// src/audio/decoder.rs
pub fn decode_audio(path: &Path) -> Result<AudioData> {
    // Implementación
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_decode_valid_mp3() {
        let path = PathBuf::from("tests/fixtures/sample.mp3");
        let result = decode_audio(&path);
        
        assert!(result.is_ok());
        let data = result.unwrap();
        assert_eq!(data.channels, 2);
    }

    #[test]
    fn test_decode_invalid_file() {
        let path = PathBuf::from("tests/fixtures/invalid.txt");
        let result = decode_audio(&path);
        
        assert!(result.is_err());
        match result {
            Err(AudioError::DecodingFailed(_)) => {},
            _ => panic!("Esperaba DecodingFailed"),
        }
    }
}
```

### Async Tests
- Usa `#[tokio::test]` para async
- Usa `tokio::time` para timeout testing

```rust
#[tokio::test]
async fn test_import_library_large() {
    let path = PathBuf::from("tests/fixtures/large_library");
    let result = import_library(&path).await;
    
    assert!(result.is_ok());
    let count = result.unwrap();
    assert!(count > 1000);
}
```

### Database Testing
- Usa transacciones para aislamiento
- Limpia entre tests
- Usa fixtures mínimas

```rust
#[test]
fn test_insert_track() {
    let conn = Connection::open_in_memory().unwrap();
    setup_schema(&conn).unwrap();
    
    let track = Track {
        id: 1,
        title: "Test".to_string(),
        artist: "Artist".to_string(),
        duration: 180.0,
        // ... otros campos
    };
    
    let result = insert_track(&conn, &track);
    assert!(result.is_ok());
    
    let loaded = get_track(&conn, 1).unwrap();
    assert_eq!(loaded.title, "Test");
}
```

### Property-Based Testing
- Usa `proptest` para tests generativos
- Valida invariantes del sistema
- Especialmente útil para parsing y algoritmos

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_duration_parsing_any_input(s in ".*") {
        // parse_duration debería manejar cualquier string sin panic
        let _ = parse_duration(&s);
    }
}
```

## E2E Testing (Cypress/Playwright)

### Estructura
```
tests/
├── e2e/
│   ├── library.cy.ts
│   ├── playback.cy.ts
│   └── settings.cy.ts
└── fixtures/
    └── test-library/
```

### Patrón Page Object
- Encapsula selectores en classes
- Reutiliza entre tests
- Centraliza cambios de UI

```typescript
// tests/e2e/pages/LibraryPage.ts
export class LibraryPage {
  visitLibrary() {
    cy.visit("/library");
  }

  importLibrary(path: string) {
    cy.get("[data-testid=import-button]").click();
    cy.get("[data-testid=path-input]").type(path);
    cy.get("[data-testid=confirm-button]").click();
  }

  getTrackCount() {
    return cy.get("[data-testid=track-item]").should("exist");
  }
}

// tests/e2e/library.cy.ts
describe("Library Management", () => {
  it("debería importar biblioteca correctamente", () => {
    const page = new LibraryPage();
    page.visitLibrary();
    page.importLibrary("/test/library");
    page.getTrackCount().should("have.length.greaterThan", 0);
  });
});
```

## Test Data & Fixtures

### Mocks en Frontend
```typescript
// __tests__/mocks/data.ts
export const mockTrack: Track = {
  id: "1",
  title: "Awesome Track",
  artist: "Cool Artist",
  duration: 180,
  artwork: null,
  // ... otros campos
};

export const mockPlaylist: Playlist = {
  id: "pl1",
  name: "My Playlist",
  tracks: [mockTrack],
};
```

### Fixtures en Backend
```
tests/fixtures/
├── sample.mp3          # Audio válido
├── invalid.txt         # Formato no soportado
├── large_library/      # Biblioteca de prueba
└── metadata.json       # Datos de prueba
```

## Coverage

### Frontend
```bash
# Generar reporte
npm run coverage

# Mostrar en HTML
npm run coverage -- --reporter=html
```

### Backend
```bash
# Instalar tarpaulin
cargo install cargo-tarpaulin

# Generar reporte
cargo tarpaulin --out Html --output-dir coverage
```

### Exclusiones
- `#[cfg(test)]` blocks
- Mock data helpers
- Config files
- Generated types

## Checklist Pre-Commit

Antes de hacer commit:
- [ ] Todos los tests pasan (`npm test` / `cargo test`)
- [ ] Cobertura ≥ 80% en código nuevo
- [ ] No hay tests skipped/pending (`.skip`, `.only`)
- [ ] Tests son determinísticos (no flaky)
- [ ] Nombres de tests describen comportamiento
- [ ] Mocks son simples y realistas

## Debugging Tests

### Frontend
```typescript
// Usa screen.debug() para ver el DOM
const { debug } = render(<Component />);
debug();

// Pausa ejecución
it("test", () => {
  debugger; // Chrome DevTools
});
```

### Backend
```rust
// Usa println! o eprintln!
println!("Debug: {:?}", variable);

// Usa dbg! macro
let result = dbg!(some_function());

// Ejecuta con output
cargo test -- --nocapture
```

---

*Referencia: TDD con 80%+ cobertura para Symphony*
