# GitHub Actions Workflows

Este directorio contiene los workflows de CI/CD para Symphony.

## Workflows

### CI (`ci.yml`)

Ejecuta en cada push y pull request a `main` y `develop`.

**Jobs:**

1. **test-frontend**: Tests de React/TypeScript
   - Type checking con `tsc --noEmit`
   - Tests con Vitest
   - Cobertura con threshold 80%
   - Upload a Codecov (opcional)

2. **test-backend**: Tests de Rust
   - Ejecuta en Ubuntu y Windows
   - `cargo fmt --check`
   - `cargo clippy` con warnings como errores
   - `cargo test`
   - Build release

3. **lint**: Linting de código
   - ESLint (pendiente de configuración)

4. **build**: Build completo de la aplicación
   - Ejecuta después de tests exitosos
   - Genera artifacts para Linux (.deb, .AppImage)
   - Genera artifacts para Windows (.msi, .exe)

### Release (`release.yml`)

Ejecuta automáticamente al crear un tag con formato `v*.*.*` (ej: `v1.0.0`).

**Jobs:**

1. **create-release**: Crea el release en GitHub
   - Extrae versión del tag
   - Genera release notes automáticos

2. **build-release**: Compila y sube artifacts
   - Ejecuta tests antes de compilar
   - Genera instaladores para Windows y Linux
   - Sube artifacts al release

## Uso

### Ejecutar CI manualmente

Los workflows se ejecutan automáticamente, pero puedes activarlos manualmente desde la pestaña "Actions" en GitHub.

### Crear un Release

```bash
# Actualizar versión en package.json y src-tauri/Cargo.toml
# Commitear cambios
git add -A
git commit -m "chore: bump version to 1.0.0"

# Crear y pushear tag
git tag v1.0.0
git push origin v1.0.0
```

El workflow `release.yml` se ejecutará automáticamente y creará el release con los instaladores.

## Variables de Entorno

### Secrets Requeridos

- `GITHUB_TOKEN`: Automático, provisto por GitHub Actions
- `CODECOV_TOKEN`: (Opcional) Para upload de cobertura a Codecov

### Variables de Entorno

- `CARGO_TERM_COLOR`: always (para output coloreado de Cargo)

## Caching

Los workflows usan caching para acelerar builds:

- **npm**: Cache automático con `actions/setup-node@v4`
- **cargo**: Cache con `Swatinem/rust-cache@v2`

## Plataformas Soportadas

### CI
- Ubuntu Latest
- Windows Latest

### Release
- Ubuntu Latest (genera .deb y .AppImage)
- Windows Latest (genera .msi y .exe)

## Troubleshooting

### Build falla en Windows

Si el build falla en Windows por dependencias, verifica que todas las dependencias estén en `Cargo.toml` con features correctos.

### Tests fallan en CI pero pasan localmente

- Verifica que no haya paths absolutos en tests
- Asegúrate de que todos los mocks estén correctos
- Revisa que no haya dependencias de entorno local

### Artifacts no se suben

Los paths de artifacts pueden variar según la versión. Verifica los paths en `src-tauri/target/release/bundle/` después de un build local.

## Mejoras Futuras

- [ ] Agregar MacOS a CI y Release
- [ ] Configurar ESLint y agregarlo al workflow
- [ ] Agregar E2E tests con Playwright/Cypress
- [ ] Implementar semantic-release para versionado automático
- [ ] Agregar notificaciones de Discord/Slack
- [ ] Implementar code signing para Windows y MacOS
