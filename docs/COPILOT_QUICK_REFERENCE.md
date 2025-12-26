---
description: "Referencia rápida de GitHub Copilot para Symphony"
---

# Referencia Rápida - GitHub Copilot Symphony

## Accesos Rápidos

| Necesito... | Haz... | Archivo |
|------------|--------|---------|
| Crear componente React | `@workspace create-component` | [create-component.prompt.md](../.github/prompts/create-component.prompt.md) |
| Escribir tests (TDD) | `@workspace write-tests` | [write-tests.prompt.md](../.github/prompts/write-tests.prompt.md) |
| Revisar código | `@reviewer mode` | [reviewer.agent.md](../.github/agents/reviewer.agent.md) |
| Planificar arquitectura | `@architect mode` | [architect.agent.md](../.github/agents/architect.agent.md) |
| Debuggear problema | `@debugger mode` | [debugger.agent.md](../.github/agents/debugger.agent.md) |
| Generar documentación | `@workspace generate-docs` | [generate-docs.prompt.md](../.github/prompts/generate-docs.prompt.md) |

## Convenciones Quick Reference

### Commits
```
feat(audio): agregar soporte para crossfade
fix(library): corregir sync de FLAC
test(waveform): aumentar cobertura al 85%
docs: actualizar README
```

### Estructura de Carpetas
```
src/components/          React components
src/stores/             Zustand/Jotai stores
src/hooks/              Custom hooks
src-tauri/src/          Rust backend
src-tauri/src/audio/    Audio processing
src-tauri/src/library/  Library management
```

### Estándares de Código

**TypeScript:**
- Modo strict siempre
- Interfaces para props
- JSDoc en públicos
- Tests 80%+ cobertura

**Rust:**
- Result<T> para errores
- Doc comments (///)
- Tests en mismo archivo
- Clippy warnings ✓

**React:**
- Componentes funcionales
- < 200 líneas por componente
- Tailwind CSS
- Modo oscuro integrado

## Checklist Pre-Push

```bash
[ ] npm test              # Tests pasan
[ ] npm run coverage      # >= 80% frontend
[ ] npm run lint          # Sin errores
[ ] npm run type-check    # TypeScript ✓
[ ] npm run build         # Build exitoso
[ ] cargo test            # Tests Rust pasan
[ ] cargo clippy          # Sin warnings
```

## Comandos Útiles

```bash
# Development
npm run tauri dev          # Dev con hot reload

# Testing
npm test                   # Run all tests
npm run coverage           # Coverage report
cargo test                 # Rust tests

# Building
npm run build              # Build frontend
cargo build                # Build Rust
npm run tauri build        # Build app

# Quality
npm run lint               # Linter
npm run type-check         # TypeScript check
cargo clippy               # Rust linter
```

## Flujo TDD Típico

1. **Planifica** - Usa `@architect mode`
   ```
   Quiero agregar [feature]. ¿Cómo arquitecturizaría?
   ```

2. **Tests Primero** - Usa `@workspace write-tests`
   ```
   Crear tests para [feature]
   ```

3. **Implementa** - Usa estándares en [react-typescript.instructions.md](../.github/instructions/react-typescript.instructions.md)
   ```
   El test pasa cuando se implementa [X]
   ```

4. **Revisa** - Usa `@reviewer mode`
   ```
   Revisar mi código de [archivo]
   ```

5. **Documenta** - Usa `@workspace generate-docs`
   ```
   Documentar nueva feature
   ```

## Recursos Principales

| Documento | Para |
|-----------|------|
| [copilot-instructions.md](../.github/copilot-instructions.md) | Overview del proyecto |
| [react-typescript.instructions.md](../.github/instructions/react-typescript.instructions.md) | Guía frontend (React + TypeScript) |
| [tauri-rust.instructions.md](../.github/instructions/tauri-rust.instructions.md) | Guía backend (Tauri + Rust) |
| [testing.instructions.md](../.github/instructions/testing.instructions.md) | Estrategia de testing (TDD) |
| [documentation.instructions.md](../.github/instructions/documentation.instructions.md) | Estándares de documentación |
| [git-workflow.instructions.md](../.github/instructions/git-workflow.instructions.md) | Git & Conventional Commits |
| [security.instructions.md](../.github/instructions/security.instructions.md) | Seguridad y buenas prácticas |
| Prompts (plantillas) | [create-component.prompt.md](../.github/prompts/create-component.prompt.md) |
| Agentes y guías | [architect.agent.md](../.github/agents/architect.agent.md) |

## Debugging Común

| Problema | Solución |
|----------|----------|
| Componente no renderiza | `@debugger mode` → Revisar console |
| Test falla | `@debugger mode` → Ejecutar con --verbose |
| Rust panic | `RUST_BACKTRACE=1 cargo run` |
| Tauri command no funciona | Verificar tipos TypeScript ↔ Rust coinciden |
| Performance lento | `@reviewer mode` → Buscar optimizaciones |

## Stack en Pocas Palabras

```
Frontend: React 18 + TypeScript + Tailwind CSS + TanStack Query
Backend:  Tauri 2.0 + Rust + Symphonia (audio) + SQLite
Testing:  Vitest + React Testing Library + cargo test
Build:    Vite + Tauri + GitHub Actions (releases automáticas)
```

## Términos del Proyecto

| Término | Significa |
|---------|-----------|
| Pista | Track (canción) |
| Beatgrid | Grid de detectado de tempo |
| Cue point | Punto de referencia en pista |
| Waveform | Forma de onda visual |
| Loop | Bucle de reproducción |
| Metadatos | Info de pista (ID3, FLAC tags) |
| Biblioteca | Colección de música |

---

**Más info:** Lee [../.github/SETUP.md](../.github/SETUP.md) para setup completo.
