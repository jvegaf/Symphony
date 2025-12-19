# Makefile - Symphony

Este Makefile proporciona comandos útiles para el desarrollo, testing y deployment de Symphony.

## Uso Rápido

```bash
# Ver todos los comandos disponibles
make help

# Setup inicial
make setup

# Desarrollo
make dev

# Tests
make test

# Build de producción
make build
```

## Categorías de Comandos

### 🚀 Installation
- `make install` - Instalar todas las dependencias (npm + cargo)
- `make deps-update` - Actualizar dependencias
- `make setup` - Setup inicial completo del proyecto

### 💻 Development
- `make dev` - Iniciar servidor de desarrollo con hot-reload
- `make build-dev` - Build de desarrollo (más rápido, sin optimizaciones)

### 🧪 Testing
- `make test` - Ejecutar todos los tests (frontend + backend)
- `make test-frontend` - Ejecutar solo tests de frontend (Vitest)
- `make test-backend` - Ejecutar solo tests de backend (cargo test)
- `make test-watch` - Ejecutar tests en modo watch (frontend)
- `make coverage` - Generar reporte de cobertura (frontend + backend)
- `make coverage-frontend` - Generar reporte de cobertura (frontend)
- `make coverage-backend` - Generar reporte de cobertura (backend)

### ✨ Code Quality
- `make lint` - Ejecutar linters (ESLint + clippy)
- `make lint-fix` - Ejecutar linters con auto-fix
- `make format` - Formatear código (Prettier + rustfmt)
- `make format-check` - Verificar formateo sin modificar
- `make type-check` - Verificar tipos de TypeScript
- `make check` - Verificación completa (lint + types + tests)

### 📦 Build
- `make build` - Build de producción optimizado
- `make build-windows` - Build para Windows (.msi + .exe)
- `make build-linux` - Build para Linux (.deb + .rpm)
- `make build-appimage-docker` - Build AppImage usando Docker (Ubuntu 20.04)

### 📦 AUR Package
- `make aur-build` - Compilar paquete AUR localmente (requiere Arch Linux)
- `make aur-install` - Compilar e instalar paquete AUR localmente
- `make aur-clean` - Limpiar archivos generados por makepkg
- `make aur-srcinfo` - Generar .SRCINFO desde PKGBUILD (requerido para publicar)
- `make aur-test` - Test completo del PKGBUILD (clean + srcinfo + build)
- `make aur-publish-check` - Verificar que todo está listo para publicar a AUR

**📖 Documentación completa**: Ver [AUR_IMPLEMENTATION.md](./AUR_IMPLEMENTATION.md) y [aur/README.md](../aur/README.md)

### 🗄️ Database
- `make db-info` - Mostrar información de todas las bases de datos
- `make db-clean` - Limpiar SOLO base de datos de desarrollo
- `make db-clean-user` - Limpiar SOLO base de datos del usuario
- `make db-clean-all` - Limpiar TODAS las bases de datos (⚠️ requiere confirmación)
- `make db-backup` - Crear backup de la base de datos del usuario
- `make db-restore` - Restaurar último backup disponible
- `make db-migrate` - Ejecutar migraciones de base de datos
- `make db-reset` - Alias de `db-clean-all` (⚠️ elimina todos los datos)

**📖 Documentación completa**: Ver [database-management.md](./database-management.md)

### 🧹 Clean
- `make clean` - Limpiar archivos generados y dependencias
- `make clean-build` - Limpiar solo archivos de build
- `make clean-cache` - Limpiar cache de npm y cargo
- `make clean-aur` - Limpiar archivos AUR (alias de aur-clean)

### 📚 Documentation
- `make docs` - Generar documentación de Rust
- `make docs-frontend` - Abrir documentación de frontend

### 🎁 Release
- `make release` - Preparar release (check + build)
- `make tag-milestone` - Crear tag de milestone

### 🔄 CI/CD
- `make ci-test` - Simular tests de CI localmente
- `make ci-build` - Simular build de CI localmente

### 🛠️ Utilities
- `make info` - Mostrar información del proyecto
- `make status` - Ver estado del proyecto (git + tests)

## Workflows Comunes

### Comenzar a desarrollar
```bash
make setup
make dev
```

### Reiniciar con base de datos limpia
```bash
make db-backup         # Backup de seguridad
make db-clean          # Solo desarrollo
make dev
```

### Antes de hacer commit
```bash
make check
```

### Preparar release
```bash
make release
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0
```

### Limpiar todo y empezar de cero
```bash
make clean
make setup
```

### Reset completo (desarrollo + datos)
```bash
make db-backup         # Siempre hacer backup primero
make db-clean-all      # Limpia todas las DBs
make clean             # Limpia builds
make setup             # Reinstala
```

### Ver cobertura de tests
```bash
make coverage
# Abre coverage/index.html (frontend)
# Abre coverage/backend/index.html (backend)
```

### Testing continuo durante desarrollo
```bash
make test-watch
```

### Compilar AppImage con Docker
```bash
# Primera vez (15-20 min)
make build-appimage-docker

# Subsecuentes (3-5 min, reutiliza imagen Docker)
make build-appimage-docker
```

### Probar paquete AUR localmente (solo Arch Linux)
```bash
# Test completo
make aur-test

# O paso por paso
make aur-clean
make aur-srcinfo
make aur-build

# Instalar localmente
make aur-install
```

### Preparar publicación AUR
```bash
# 1. Verificar estado
make aur-publish-check

# 2. Crear tag de versión (si no existe)
git tag v0.7.0
git push origin v0.7.0

# 3. Actualizar SHA256 en aur/PKGBUILD
# (descargar tarball de GitHub y calcular SHA256)
sha256sum symphony-0.7.0.tar.gz

# 4. Publicar (ver aur/README.md para instrucciones completas)
git clone ssh://aur@aur.archlinux.org/symphony-bin.git aur-publish
cp aur/PKGBUILD aur/symphony.desktop aur-publish/
cd aur-publish
makepkg --printsrcinfo > .SRCINFO
git add PKGBUILD .SRCINFO symphony.desktop
git commit -m "Initial release: v0.7.0"
git push
```

## Notas

- El comando `make` sin argumentos muestra la ayuda completa
- Los colores en la terminal indican el tipo de mensaje:
  - 🔵 Azul: Información
  - 🟢 Verde: Éxito
  - 🟡 Amarillo: Advertencia
  - 🔴 Rojo: Error/Confirmación requerida

## Requisitos

### Básicos
- Node.js 18+
- Rust 1.70+
- npm
- cargo

### Opcionales
- **cargo-tarpaulin** - Para cobertura de backend
  ```bash
  cargo install cargo-tarpaulin
  ```

- **makepkg** - Para compilar paquetes AUR (solo Arch Linux)
  ```bash
  # Ya viene instalado en Arch Linux
  sudo pacman -S base-devel
  ```

- **Docker** - Para compilar AppImage con compatibilidad máxima
  ```bash
  # Arch Linux
  sudo pacman -S docker
  sudo systemctl enable --now docker
  sudo usermod -aG docker $USER
  # Cerrar sesión y volver a entrar
  ```

## Estructura del Makefile

El Makefile está organizado en categorías con el formato `##@`:
- Cada sección agrupa comandos relacionados
- Cada comando tiene una descripción clara con `##`
- El comando `help` muestra automáticamente todas las opciones

## Contribuir

Al agregar nuevos comandos al Makefile:
1. Usa el formato `.PHONY` para comandos que no generan archivos
2. Agrega comentarios `##@` para categorías
3. Agrega comentarios `##` para descripciones de comandos
4. Mantén el orden alfabético dentro de cada categoría
5. Usa variables para comandos repetidos (NPM, CARGO, etc.)

---

*Última actualización: 19 dic 2025*
