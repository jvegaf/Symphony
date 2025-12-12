# Makefile para Symphony
# Aplicación de escritorio para gestión de bibliotecas musicales
# Stack: Tauri 2.0 + React 18 + TypeScript + Rust

.PHONY: help install dev build test coverage lint clean format check release deps-update

# Colores para output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Variables
NPM := npm
CARGO := cargo
TAURI := npm run tauri

##@ General

help: ## Mostrar esta ayuda
	@echo "$(BLUE)Symphony - Makefile Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make $(CYAN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Installation

install: ## Instalar todas las dependencias (npm + cargo)
	@echo "$(GREEN)Instalando dependencias de frontend...$(NC)"
	$(NPM) install
	@echo "$(GREEN)Verificando dependencias de Rust...$(NC)"
	$(CARGO) check
	@echo "$(GREEN)✓ Dependencias instaladas$(NC)"

deps-update: ## Actualizar dependencias
	@echo "$(YELLOW)Actualizando dependencias de frontend...$(NC)"
	$(NPM) update
	@echo "$(YELLOW)Actualizando dependencias de Rust...$(NC)"
	$(CARGO) update
	@echo "$(GREEN)✓ Dependencias actualizadas$(NC)"

##@ Development

dev: ## Iniciar servidor de desarrollo con hot-reload
	@echo "$(BLUE)Iniciando Tauri en modo desarrollo...$(NC)"
	$(TAURI) dev

build-dev: ## Build de desarrollo (más rápido, sin optimizaciones)
	@echo "$(BLUE)Building en modo desarrollo...$(NC)"
	$(TAURI) build --debug

##@ Testing

test: ## Ejecutar todos los tests (frontend + backend)
	@echo "$(BLUE)Ejecutando tests de frontend...$(NC)"
	$(NPM) test
	@echo "$(BLUE)Ejecutando tests de backend...$(NC)"
	cd src-tauri && $(CARGO) test
	@echo "$(GREEN)✓ Todos los tests completados$(NC)"

test-frontend: ## Ejecutar solo tests de frontend (Vitest)
	@echo "$(BLUE)Ejecutando tests de frontend...$(NC)"
	$(NPM) test

test-backend: ## Ejecutar solo tests de backend (cargo test)
	@echo "$(BLUE)Ejecutando tests de backend...$(NC)"
	cd src-tauri && $(CARGO) test

test-watch: ## Ejecutar tests en modo watch (frontend)
	@echo "$(BLUE)Ejecutando tests en modo watch...$(NC)"
	$(NPM) test -- --watch

coverage: ## Generar reporte de cobertura (frontend + backend)
	@echo "$(BLUE)Generando cobertura de frontend...$(NC)"
	$(NPM) run coverage
	@echo "$(BLUE)Generando cobertura de backend...$(NC)"
	$(CARGO) tarpaulin --out Html --output-dir coverage/backend
	@echo "$(GREEN)✓ Reportes de cobertura generados$(NC)"
	@echo "$(YELLOW)Frontend: coverage/index.html$(NC)"
	@echo "$(YELLOW)Backend: coverage/backend/index.html$(NC)"

coverage-frontend: ## Generar reporte de cobertura (frontend)
	@echo "$(BLUE)Generando cobertura de frontend...$(NC)"
	$(NPM) run coverage

coverage-backend: ## Generar reporte de cobertura (backend)
	@echo "$(BLUE)Generando cobertura de backend...$(NC)"
	$(CARGO) tarpaulin --out Html --output-dir coverage/backend

##@ Code Quality

lint: ## Ejecutar linters (ESLint + clippy)
	@echo "$(BLUE)Ejecutando ESLint...$(NC)"
	$(NPM) run lint
	@echo "$(BLUE)Ejecutando clippy...$(NC)"
	$(CARGO) clippy -- -D warnings
	@echo "$(GREEN)✓ Linting completado$(NC)"

lint-fix: ## Ejecutar linters con auto-fix
	@echo "$(BLUE)Ejecutando ESLint con fix...$(NC)"
	$(NPM) run lint -- --fix
	@echo "$(BLUE)Ejecutando clippy con fix...$(NC)"
	$(CARGO) clippy --fix --allow-dirty --allow-staged
	@echo "$(GREEN)✓ Linting con fix completado$(NC)"

format: ## Formatear código (Prettier + rustfmt)
	@echo "$(BLUE)Formateando código frontend...$(NC)"
	$(NPM) run format
	@echo "$(BLUE)Formateando código backend...$(NC)"
	$(CARGO) fmt
	@echo "$(GREEN)✓ Código formateado$(NC)"

format-check: ## Verificar formateo sin modificar
	@echo "$(BLUE)Verificando formato de frontend...$(NC)"
	$(NPM) run format -- --check
	@echo "$(BLUE)Verificando formato de backend...$(NC)"
	$(CARGO) fmt -- --check
	@echo "$(GREEN)✓ Verificación de formato completada$(NC)"

type-check: ## Verificar tipos de TypeScript
	@echo "$(BLUE)Verificando tipos de TypeScript...$(NC)"
	$(NPM) run type-check
	@echo "$(GREEN)✓ Tipos verificados$(NC)"

check: lint type-check test ## Verificación completa (lint + types + tests)
	@echo "$(GREEN)✓ Verificación completa exitosa$(NC)"

##@ Build

build: ## Build de producción optimizado
	@echo "$(BLUE)Building Symphony para producción...$(NC)"
	$(TAURI) build
	@echo "$(GREEN)✓ Build completado$(NC)"
	@echo "$(YELLOW)Binarios en: src-tauri/target/release/bundle/$(NC)"

build-windows: ## Build para Windows (.msi + .exe)
	@echo "$(BLUE)Building para Windows...$(NC)"
	$(TAURI) build --target x86_64-pc-windows-msvc
	@echo "$(GREEN)✓ Build Windows completado$(NC)"

build-linux: ## Build para Linux (.deb + .AppImage)
	@echo "$(BLUE)Building para Linux...$(NC)"
	$(TAURI) build
	@echo "$(GREEN)✓ Build Linux completado$(NC)"

##@ Database

db-migrate: ## Ejecutar migraciones de base de datos
	@echo "$(BLUE)Ejecutando migraciones...$(NC)"
	$(CARGO) run --bin migrate
	@echo "$(GREEN)✓ Migraciones completadas$(NC)"

db-reset: ## Resetear base de datos (CUIDADO: elimina todos los datos)
	@echo "$(RED)¿Estás seguro de resetear la base de datos? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(YELLOW)Eliminando base de datos...$(NC)"
	rm -f src-tauri/symphony.db
	@echo "$(GREEN)✓ Base de datos eliminada$(NC)"

##@ Clean

clean: ## Limpiar archivos generados y dependencias
	@echo "$(YELLOW)Limpiando archivos generados...$(NC)"
	rm -rf node_modules
	rm -rf dist
	rm -rf coverage
	rm -rf src-tauri/target
	rm -f src-tauri/symphony.db
	@echo "$(GREEN)✓ Limpieza completada$(NC)"

clean-build: ## Limpiar solo archivos de build
	@echo "$(YELLOW)Limpiando builds...$(NC)"
	rm -rf dist
	rm -rf src-tauri/target/release
	rm -rf src-tauri/target/debug
	@echo "$(GREEN)✓ Builds limpiados$(NC)"

clean-cache: ## Limpiar cache de npm y cargo
	@echo "$(YELLOW)Limpiando cache...$(NC)"
	$(NPM) cache clean --force
	$(CARGO) clean
	@echo "$(GREEN)✓ Cache limpiado$(NC)"

##@ Documentation

docs: ## Generar documentación de Rust
	@echo "$(BLUE)Generando documentación de Rust...$(NC)"
	$(CARGO) doc --no-deps --open
	@echo "$(GREEN)✓ Documentación generada$(NC)"

docs-frontend: ## Abrir documentación de frontend
	@echo "$(BLUE)Abriendo documentación...$(NC)"
	open docs/API.md || xdg-open docs/API.md

##@ Release

release: check build ## Preparar release (check + build)
	@echo "$(GREEN)✓ Release preparado$(NC)"
	@echo "$(YELLOW)Próximo paso: git tag -a vX.Y.Z -m 'Version X.Y.Z'$(NC)"

tag-milestone: ## Crear tag de milestone (ejemplo: make tag-milestone VERSION=3)
	@read -p "Milestone number: " milestone; \
	git tag -a milestone-$$milestone -m "Milestone $$milestone completado"; \
	echo "$(GREEN)✓ Tag milestone-$$milestone creado$(NC)"; \
	echo "$(YELLOW)Push con: git push origin milestone-$$milestone$(NC)"

##@ CI/CD

ci-test: ## Simular tests de CI localmente
	@echo "$(BLUE)Simulando CI/CD tests...$(NC)"
	$(MAKE) lint
	$(MAKE) type-check
	$(MAKE) test
	@echo "$(GREEN)✓ CI tests completados$(NC)"

ci-build: ## Simular build de CI localmente
	@echo "$(BLUE)Simulando CI/CD build...$(NC)"
	$(MAKE) clean-build
	$(MAKE) build
	@echo "$(GREEN)✓ CI build completado$(NC)"

##@ Utilities

info: ## Mostrar información del proyecto
	@echo "$(BLUE)=== Symphony Project Info ===$(NC)"
	@echo "Node version: $$(node --version)"
	@echo "npm version: $$(npm --version)"
	@echo "Rust version: $$(rustc --version)"
	@echo "Cargo version: $$(cargo --version)"
	@echo ""
	@echo "$(YELLOW)Milestones completados:$(NC)"
	@git tag -l "milestone-*" | sort -V
	@echo ""
	@echo "$(YELLOW)Tests totales:$(NC)"
	@echo "Frontend: $$(npm test -- --run 2>&1 | grep -o '[0-9]* passed' | head -1 || echo '?')"
	@echo "Backend: $$(cargo test --quiet 2>&1 | grep -o '[0-9]* passed' | head -1 || echo '?')"

status: ## Ver estado del proyecto (git + tests)
	@echo "$(BLUE)=== Git Status ===$(NC)"
	@git status -s
	@echo ""
	@echo "$(BLUE)=== Última versión ===$(NC)"
	@git describe --tags --abbrev=0 2>/dev/null || echo "Sin tags"
	@echo ""
	@echo "$(BLUE)=== Último commit ===$(NC)"
	@git log -1 --oneline

setup: install ## Setup inicial completo del proyecto
	@echo "$(BLUE)Setup inicial de Symphony...$(NC)"
	@echo "$(GREEN)✓ Dependencias instaladas$(NC)"
	@echo "$(YELLOW)Verificando instalación de herramientas...$(NC)"
	@which cargo-tarpaulin > /dev/null || echo "$(RED)⚠ cargo-tarpaulin no instalado. Instalar con: cargo install cargo-tarpaulin$(NC)"
	@echo "$(GREEN)✓ Setup completado$(NC)"
	@echo ""
	@echo "$(YELLOW)Próximos pasos:$(NC)"
	@echo "  make dev     - Iniciar servidor de desarrollo"
	@echo "  make test    - Ejecutar tests"
	@echo "  make build   - Build de producción"

.DEFAULT_GOAL := help
