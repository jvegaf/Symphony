# Symphony - AI Agent Quick Reference

**Stack:** Tauri 2.0 + React 18 + TypeScript (strict) + Rust | **TDD Required** | **80%+ Coverage**

## Commands

```bash
# Run single test (frontend)
npm test -- <path/to/file.test.tsx>          # vitest run <file>
npm test -- -t "test name pattern"            # filter by name

# Run single test (backend)
cd src-tauri && cargo test <test_name>        # specific test
cd src-tauri && cargo test --lib <module>     # module tests

# Common workflows
make test           # all tests (frontend + backend)
make check          # lint + type-check + test
npm run type-check  # TypeScript validation
cargo clippy        # Rust linting
```

## Code Style

### TypeScript/React
- **Strict mode ON:** No `any`, explicit types, no unused vars
- **Imports:** Group by: React → external → Tauri → @/ (absolute) → ../ (relative)
- **Components:** Functional + hooks, typed props, JSDoc comments (Spanish), `displayName` for debugging
- **Naming:** PascalCase (components), camelCase (functions/vars), UPPER_SNAKE_CASE (constants)
- **Error handling:** Typed `Result<T, string>` from Tauri commands, explicit error states in UI
- **Hooks:** Custom hooks in `src/hooks/`, prefix with `use`, proper dependency arrays

### Rust
- **Style:** `rustfmt` + `clippy`, `Result<T, String>` for errors, `///` doc comments (Spanish)
- **Commands:** Use `#[tauri::command]`, async when needed, explicit error strings
- **Modules:** `mod.rs` exports public API, tests alongside code (`#[cfg(test)]`)
- **Naming:** snake_case (functions/vars), PascalCase (types), match `rustfmt` defaults

### Patterns
- **State:** TanStack Query for server state, hooks for Tauri commands
- **Components:** Max 200 LOC, co-locate tests (`.test.tsx`), use `cn()` utility for classNames
- **DB:** SQLite with migrations, indices for frequent queries, sync types with TypeScript
- **Tests:** TDD workflow - test first, then implement, ≥80% coverage enforced by CI

## Git Workflow
- **Commits:** Conventional Commits (`feat(scope): description`, `fix(scope): description`)
- **Branches:** `feat/<name>`, `fix/<name>`, work from `main`
- **Language:** All documentation/comments in Spanish, code in English

**Full docs:** `.github/copilot-instructions.md` | **Makefile:** `make help`
