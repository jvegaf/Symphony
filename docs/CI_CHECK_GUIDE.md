# CI Check Script - Validación Local de Workflows

Script para validar localmente los workflows de GitHub Actions antes de hacer push.

## 📋 Propósito

Este script ejecuta los mismos checks que se ejecutarían en GitHub Actions CI, permitiéndote:
- ✅ Detectar errores **antes** de hacer push
- ✅ Evitar commits que fallan en CI
- ✅ Ahorrar tiempo de espera en GitHub Actions
- ✅ Validar solo para tu sistema operativo actual

## 🚀 Uso

### Ejecutar todos los checks (recomendado antes de push)

```bash
./scripts/check-ci.sh
```

Este comando ejecuta:
- Type check (TypeScript)
- Linter (ESLint)
- Tests frontend (Vitest)
- Coverage check
- Format check backend (rustfmt)
- Clippy (Rust linter)
- Tests backend (Cargo)
- Build release (Rust)

### Modo rápido (sin coverage ni build)

```bash
./scripts/check-ci.sh --fast
```

Útil para iteraciones rápidas durante desarrollo. Omite:
- Coverage check
- Build en modo release

### Solo checks de frontend

```bash
./scripts/check-ci.sh --frontend
```

Ejecuta:
- Type check
- Linter
- Tests
- Coverage

### Solo checks de backend

```bash
./scripts/check-ci.sh --backend
```

Ejecuta:
- rustfmt check
- Clippy
- Cargo tests

### Ver ayuda

```bash
./scripts/check-ci.sh --help
```

## 🔧 Requisitos

### Frontend
- Node.js 22
- npm dependencies instaladas (`npm ci`)

### Backend (Linux)
- Rust toolchain (stable)
- System dependencies (el script detectará automáticamente tu distribución):

**Ubuntu/Debian:**
  ```bash
  sudo apt-get update
  sudo apt-get install -y \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf
  ```

**Arch Linux/Manjaro/CachyOS:**
  ```bash
  sudo pacman -S gtk3 webkit2gtk libappindicator-gtk3 librsvg
  ```

**Fedora/RHEL:**
  ```bash
  sudo dnf install gtk3-devel webkit2gtk4.0-devel libappindicator-gtk3-devel librsvg2-devel
  ```

El script verificará automáticamente si las dependencias están instaladas y te proporcionará los comandos específicos para tu distribución.

## 📊 Output

El script muestra:
- ✅ **Verde** - Check pasado
- ❌ **Rojo** - Check fallado
- ⏱ Tiempo de ejecución de cada paso
- 📋 Resumen final con lista de fallos

### Ejemplo de output exitoso:

```
╔════════════════════════════════════════════════════════════════╗
║           🚀 SYMPHONY CI CHECK - LOCAL VALIDATION              ║
╚════════════════════════════════════════════════════════════════╝

📋 Configuración:
  Sistema operativo: linux (arch)
  Frontend checks:   true
  Backend checks:    true
  Build app:         true
  Coverage:          true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 FRONTEND CHECKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ Type check (TypeScript)
✅ Type check (TypeScript) - Completado (3s)

→ Linter (ESLint)
✅ Linter (ESLint) - Completado (2s)

→ Unit tests (Frontend)
✅ Unit tests (Frontend) - Completado (5s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🦀 BACKEND CHECKS (RUST)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ Format check (rustfmt)
✅ Format check (rustfmt) - Completado (1s)

→ Clippy (linter)
✅ Clippy (linter) - Completado (8s)

→ Unit tests (Backend)
✅ Unit tests (Backend) - Completado (12s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ¡TODOS LOS CHECKS PASARON!

✓ Tu código está listo para hacer push
```

### Ejemplo de output con fallos:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 2 CHECK(S) FALLARON:

  ✗ Type check (TypeScript)
  ✗ Clippy (linter)

⚠ Por favor corrige los errores antes de hacer push
```

## 🔄 Integración con Git

### Pre-push hook (recomendado)

Puedes configurar un git hook para ejecutar automáticamente antes de push:

```bash
# Crear pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
echo "Ejecutando CI checks antes de push..."
./scripts/check-ci.sh --fast
EOF

chmod +x .git/hooks/pre-push
```

### Pre-commit hook (modo rápido)

Para checks más frecuentes durante commits:

```bash
# Crear pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Ejecutando checks rápidos..."
./scripts/check-ci.sh --fast
EOF

chmod +x .git/hooks/pre-commit
```

## 📝 Notas

### Diferencias con GitHub Actions

- **Sistema operativo:** Solo valida para tu OS actual (no matriz multi-OS)
- **Distribución:** Detecta automáticamente Ubuntu, Debian, Arch, Manjaro, CachyOS, Fedora, RHEL
- **Full build:** No ejecuta `npm run tauri build` por defecto (toma 5-10 min)
- **Coverage upload:** No sube a Codecov (solo verifica threshold local)
- **Artifacts:** No genera artifacts

### Limitaciones

- No valida workflows de `release.yml` (solo CI)
- No simula multi-OS matrix (Ubuntu + Windows)
- No ejecuta en contenedor aislado

## 🎯 Workflow Recomendado

1. **Durante desarrollo:**
   ```bash
   ./scripts/check-ci.sh --fast
   ```

2. **Antes de commit:**
   ```bash
   ./scripts/check-ci.sh --frontend  # Si solo cambiaste frontend
   ./scripts/check-ci.sh --backend   # Si solo cambiaste backend
   ```

3. **Antes de push:**
   ```bash
   ./scripts/check-ci.sh  # Todos los checks
   ```

4. **Si todo pasa:**
   ```bash
   git push
   ```

## 🐛 Troubleshooting

### "command not found: cargo"
Instala Rust toolchain:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### "package.json not found"
Ejecuta desde la raíz del proyecto:
```bash
cd /path/to/Symphony
./scripts/check-ci.sh
```

### Dependencias del sistema faltantes
El script detecta automáticamente tu distribución Linux y te proporciona los comandos específicos.

**Para Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev ...
```

**Para Arch Linux:**
```bash
sudo pacman -S gtk3 webkit2gtk libappindicator-gtk3 librsvg
```

### Tests muy lentos
Usa modo fast:
```bash
./scripts/check-ci.sh --fast
```

## 🔗 Referencias

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Makefile shortcuts: `make check` (alias)
- Testing docs: `docs/testing.md`

## 💡 Tips

- **Cache Cargo:** El script usa el cache de Cargo, pero la primera ejecución será lenta
- **Parallel runs:** Frontend y backend pueden ejecutarse en paralelo manualmente:
  ```bash
  # Terminal 1
  ./scripts/check-ci.sh --frontend
  
  # Terminal 2
  ./scripts/check-ci.sh --backend
  ```

- **CI vs Local:** Si algo pasa localmente pero falla en CI:
  - Verifica versiones de Node/Rust
  - Limpia cache: `rm -rf node_modules target`
  - Re-instala: `npm ci && cargo clean`

---

**Made with 💙 for Symphony contributors**
