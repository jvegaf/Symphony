---
applyTo: ".git,*.md"
description: "Workflow Git y Conventional Commits para Symphony"
---

# Git Workflow & Conventional Commits

## Conventional Commits

Todos los commits deben seguir el formato:

```
<tipo>(<alcance>): <descripción>

[cuerpo opcional - párrafos separados por línea en blanco]

[pie opcional - breaking changes, issues cerradas, etc.]
```

### Tipos de Commit

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `feat` | Nueva característica | `feat(audio): agregar soporte para crossfade` |
| `fix` | Corrección de bug | `fix(library): resolver sincronización de FLAC` |
| `docs` | Cambios en documentación | `docs: actualizar README con instrucciones setup` |
| `style` | Formato, sin cambios lógicos | `style(ui): alinear imports según ESLint` |
| `refactor` | Refactorización sin cambios | `refactor(store): simplificar lógica de estado` |
| `perf` | Mejoras de performance | `perf(waveform): cachear análisis de 60s` |
| `test` | Agregar/actualizar tests | `test(audio): agregar cobertura a decoder` |
| `chore` | Cambios en dependencias/herramientas | `chore: actualizar Tauri a 2.0.1` |
| `ci` | Cambios en CI/CD | `ci: agregar test de cobertura a workflow` |

### Alcances

Usa alcances que reflejen la estructura del proyecto:

```
<tipo>(alcance): <descripción>
```

**Alcances típicos:**
- `audio` - Reproducción, decodificación, análisis
- `library` - Importación, sincronización, gestión
- `ui` - Componentes, estilos, UX
- `db` - Base de datos, esquema
- `settings` - Configuración, preferencias
- `waveform` - Visualización de formas de onda
- `metadata` - Metadatos de pistas
- `ci` - Flujos CI/CD
- Sin alcance - Cambios transversales

### Descripción

- Usa **presente imperativo** ("agregar" no "agregando" o "agregado")
- No capitalices la primera letra
- Sin punto final
- Máximo 50 caracteres

### Cuerpo (Opcional)

- Explica **qué** cambia y **por qué**, no **cómo**
- Separa del header con línea en blanco
- Máximo 72 caracteres por línea
- Incluye contexto importante

```
feat(library): agregar análisis automático de beatgrids

Implementa análisis de beatgrid al importar pistas nuevas.
Utiliza algoritmo de detección de tempo en backend Rust
para mejor accuracy. Cachea resultados para no re-analizar.

Breaking change: Requiere migración de DB para nuevo campo.
```

### Pie (Opcional)

Referencia issues, breaking changes y co-autores:

```
feat(audio): migrar a decodificador Symphonia v0.5

BREAKING CHANGE: Drops soporte para MP2 (descontinuado)
Fixes #123
Refs #456
Co-authored-by: Persona <persona@example.com>
```

## Ramas

### Naming Convention

```
<tipo>/<descripcion-corta>
```

**Ejemplos:**
```
feat/beatgrid-analysis
fix/metadata-sync-race
docs/setup-instructions
refactor/store-structure
```

### Tipos de Rama

- **Feature**: `feat/...` - Nueva característica
- **Bug fix**: `fix/...` - Corrección de bug
- **Hotfix**: `hotfix/...` - Fix urgente en producción
- **Docs**: `docs/...` - Cambios en documentación
- **Refactor**: `refactor/...` - Refactorización
- **Experimental**: `exp/...` - Experimentos, no merge a main

## Workflow

### 1. Crear Rama Local

```bash
# Actualiza main
git checkout main
git pull origin main

# Crea nueva rama
git checkout -b feat/nueva-caracteristica
```

### 2. Desarrollar y Testear

```bash
# Escribe tests primero (TDD)
npm test
cargo test

# Implementa la característica
# ...código...

# Verifica calidad
npm run lint
npm run type-check
npm run coverage

# Verifica cobertura >= 80%
```

### 3. Commit

```bash
# Revisa cambios
git status
git diff

# Stage cambios
git add src/components/NewComponent.tsx

# Commit con mensaje conventional
git commit -m "feat(ui): agregar componente nuevo

Descripción opcional del cambio
y razones detrás."

# Verifica commit
git log --oneline -n 1
```

**Reglas de Commit:**
- Un commit = un cambio lógico
- Commits frecuentes (cada 30 mins max)
- Nunca commits parciales sin testing
- Revert vs. nuevo fix según contexto

### 4. Sincronizar con Main

```bash
# Trae cambios de main
git fetch origin

# Rebase sobre main (preferred)
git rebase origin/main

# Si hay conflictos
git status  # Ver conflictos
# ... resuelve manualmente ...
git add archivo-resuelto
git rebase --continue

# O merge si rebase es muy complejo
git merge origin/main
```

### 5. Push y Pull Request

```bash
# Push rama
git push -u origin feat/nueva-caracteristica

# Abre PR en GitHub con descripción
```

**Descripción de PR:**

```markdown
## Descripción
Agrega análisis automático de beatgrids al importar pistas.

## Tipo de Cambio
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [x] Unit tests (80% coverage)
- [x] Integration tests
- [x] Manual testing on Windows + Linux

## Checklist
- [x] Follows Conventional Commits
- [x] Tests passing
- [x] No console errors/warnings
- [x] Documentation updated

Fixes #123
```

### 6. Code Review & Merge

```bash
# Después de aprobaciones, merge
git checkout main
git pull origin main
git merge feat/nueva-caracteristica

# Opción: Squash commits si hay muchos pequeños
git merge --squash feat/nueva-caracteristica
git commit -m "feat(audio): ..."

# Push
git push origin main

# Elimina rama local y remota
git branch -d feat/nueva-caracteristica
git push origin --delete feat/nueva-caracteristica
```

## Versionado Semántico

Sigue [semver.org](https://semver.org/es/):

```
MAJOR.MINOR.PATCH

ej: v1.2.3
```

### Incrementos

- **MAJOR** (v1.0.0 → v2.0.0): Breaking changes
- **MINOR** (v1.0.0 → v1.1.0): Nuevas features (compatible)
- **PATCH** (v1.0.0 → v1.0.1): Bug fixes (compatible)

### Tags

```bash
# Crea tag
git tag -a v1.2.0 -m "Versión 1.2.0"

# Push tags
git push origin --tags

# Crea release en GitHub (automático via workflow)
```

## Decisiones de Commit

### Cuándo Hacer Commit

```
Bueno (lógicamente relacionado):
- feat(ui): agregar botón de reproducción
- feat(ui): agregar slider de volumen
- → Ambos son "controles de audio"

Mejor (commits separados):
commit 1: feat(ui): agregar botón de reproducción
commit 2: feat(audio): implementar lógica de volumen
```

### Squashing vs. Merge Commits

```bash
# Para feature completa: squash commits pequeños
git merge --squash feat/something
git commit -m "feat(scope): descripción"

# Para cambios mayores: preserva history
git merge --no-ff feat/something
```

### Reverting

```bash
# Revert de commit específico
git revert <commit-hash>

# Revert de últimos N commits
git revert HEAD~2..HEAD

# Mensaje:
# revert: "feat(audio): agregar crossfade"
# This reverts commit <hash> porque causaba
# problemas en pistas largas (issue #456)
```

## Aliases Útiles

```bash
# Agregar a ~/.gitconfig o git config --global

[alias]
  st = status
  co = checkout
  br = branch
  ci = commit
  unstage = reset HEAD --
  last = log -1 HEAD
  visual = log --graph --oneline --all
  amend = commit --amend --no-edit
  force = push --force-with-lease
```

## Hooks Git Locales (Opcional)

### Pre-commit
Previene commits con problemas:

```bash
#!/bin/bash
# .git/hooks/pre-commit

npm run lint
npm run type-check
npm test -- --coverage --passWithNoTests

# Si cualquiera falla, aborta commit
```

### Pre-push
Verifica antes de push:

```bash
#!/bin/bash
# .git/hooks/pre-push

# Asegura que todos los tests pasen
cargo test --all
npm test

# Verifica cobertura >= 80%
npm run coverage
```

## Troubleshooting

### Revertir último commit (no pusheado)
```bash
git reset --soft HEAD~1
# Cambios quedan en staging
```

### Cambiar mensaje de último commit
```bash
git commit --amend -m "nuevo mensaje"
```

### Mover commits entre ramas
```bash
# Cherry-pick un commit específico
git cherry-pick <commit-hash>

# Cherry-pick rango
git cherry-pick <hash1>..<hash2>
```

### Fusionar dos commits
```bash
# Rebase interactivo
git rebase -i HEAD~3

# En editor: squash, fixup, pick
# squash = fusiona manteniendo mensaje
# fixup = fusiona descartando mensaje
```

---

*Referencia: Conventional Commits para Symphony*
