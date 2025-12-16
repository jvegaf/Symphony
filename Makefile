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

db-clean: ## Limpiar SOLO base de datos de desarrollo (src-tauri/symphony.db)
	@echo "$(YELLOW)Limpiando base de datos de desarrollo...$(NC)"
	@if [ -f src-tauri/symphony.db ]; then \
		rm -f src-tauri/symphony.db; \
		echo "$(GREEN)✓ Base de datos de desarrollo eliminada$(NC)"; \
	else \
		echo "$(YELLOW)⚠ No existe base de datos de desarrollo$(NC)"; \
	fi

db-clean-user: ## Limpiar base de datos del usuario (~/.local/share/symphony/)
	@echo "$(YELLOW)Limpiando base de datos del usuario...$(NC)"
	@if [ -f ~/.local/share/symphony/symphony.db ]; then \
		rm -f ~/.local/share/symphony/symphony.db; \
		echo "$(GREEN)✓ Base de datos del usuario eliminada$(NC)"; \
	else \
		echo "$(YELLOW)⚠ No existe base de datos del usuario$(NC)"; \
	fi
	@if [ -f ~/.local/share/symphony/symphony.log ]; then \
		rm -f ~/.local/share/symphony/symphony.log; \
		echo "$(GREEN)✓ Log del usuario eliminado$(NC)"; \
	fi

db-clean-all: ## Limpiar TODAS las bases de datos (desarrollo + usuario) [CUIDADO]
	@echo "$(RED)¿Estás seguro de eliminar TODAS las bases de datos? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(YELLOW)Limpiando todas las bases de datos...$(NC)"
	@$(MAKE) db-clean
	@$(MAKE) db-clean-user
	@echo "$(GREEN)✓ Todas las bases de datos eliminadas$(NC)"

db-backup: ## Crear backup de la base de datos del usuario
	@echo "$(BLUE)Creando backup de base de datos...$(NC)"
	@mkdir -p backups
	@if [ -f ~/.local/share/symphony/symphony.db ]; then \
		BACKUP_FILE="backups/symphony_$$(date +%Y%m%d_%H%M%S).db"; \
		cp ~/.local/share/symphony/symphony.db $$BACKUP_FILE; \
		echo "$(GREEN)✓ Backup creado: $$BACKUP_FILE$(NC)"; \
	else \
		echo "$(YELLOW)⚠ No existe base de datos del usuario para hacer backup$(NC)"; \
	fi

db-restore: ## Restaurar último backup de base de datos
	@echo "$(BLUE)Restaurando último backup...$(NC)"
	@LATEST_BACKUP=$$(ls -t backups/symphony_*.db 2>/dev/null | head -n1); \
	if [ -n "$$LATEST_BACKUP" ]; then \
		mkdir -p ~/.local/share/symphony; \
		cp $$LATEST_BACKUP ~/.local/share/symphony/symphony.db; \
		echo "$(GREEN)✓ Base de datos restaurada desde: $$LATEST_BACKUP$(NC)"; \
	else \
		echo "$(RED)⚠ No se encontraron backups$(NC)"; \
	fi

db-info: ## Mostrar información de las bases de datos
	@echo "$(BLUE)=== Base de datos - Información ===$(NC)"
	@echo ""
	@echo "$(YELLOW)Desarrollo (src-tauri/symphony.db):$(NC)"
	@if [ -f src-tauri/symphony.db ]; then \
		echo "  Tamaño: $$(du -h src-tauri/symphony.db | cut -f1)"; \
		echo "  Modificado: $$(stat -c %y src-tauri/symphony.db 2>/dev/null || stat -f %Sm src-tauri/symphony.db 2>/dev/null)"; \
	else \
		echo "  $(RED)No existe$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Usuario (~/.local/share/symphony/symphony.db):$(NC)"
	@if [ -f ~/.local/share/symphony/symphony.db ]; then \
		echo "  Tamaño: $$(du -h ~/.local/share/symphony/symphony.db | cut -f1)"; \
		echo "  Modificado: $$(stat -c %y ~/.local/share/symphony/symphony.db 2>/dev/null || stat -f %Sm ~/.local/share/symphony/symphony.db 2>/dev/null)"; \
	else \
		echo "  $(RED)No existe$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Backups (backups/):$(NC)"
	@if [ -d backups ] && [ -n "$$(ls -A backups/symphony_*.db 2>/dev/null)" ]; then \
		ls -lh backups/symphony_*.db | awk '{print "  " $$9 " - " $$5}'; \
	else \
		echo "  $(RED)No hay backups$(NC)"; \
	fi

db-reset: db-clean-all ## Resetear base de datos (CUIDADO: elimina todos los datos) [Alias de db-clean-all]

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
