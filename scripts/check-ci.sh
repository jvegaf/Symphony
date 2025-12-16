#!/usr/bin/env bash

# AIDEV-NOTE: Script para validar workflows de GitHub Actions localmente
# antes de hacer push. Ejecuta los mismos pasos que CI para el SO actual.
#
# Uso:
#   ./scripts/check-ci.sh              # Ejecuta todos los checks
#   ./scripts/check-ci.sh --frontend   # Solo checks de frontend
#   ./scripts/check-ci.sh --backend    # Solo checks de backend
#   ./scripts/check-ci.sh --fast       # Modo rápido (sin coverage ni build)

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Icons
CHECK="✅"
CROSS="❌"
ARROW="→"
CLOCK="⏱"

# Configuration
RUN_FRONTEND=true
RUN_BACKEND=true
RUN_BUILD=true
RUN_COVERAGE=true
FAST_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --frontend)
      RUN_BACKEND=false
      RUN_BUILD=false
      shift
      ;;
    --backend)
      RUN_FRONTEND=false
      RUN_BUILD=false
      shift
      ;;
    --fast)
      FAST_MODE=true
      RUN_BUILD=false
      RUN_COVERAGE=false
      shift
      ;;
    --help|-h)
      echo "Uso: $0 [opciones]"
      echo ""
      echo "Opciones:"
      echo "  --frontend    Solo ejecutar checks de frontend"
      echo "  --backend     Solo ejecutar checks de backend"
      echo "  --fast        Modo rápido (sin coverage ni build)"
      echo "  --help, -h    Mostrar esta ayuda"
      echo ""
      echo "Sin opciones, ejecuta todos los checks (frontend + backend + build)"
      exit 0
      ;;
    *)
      echo -e "${RED}Opción desconocida: $1${NC}"
      exit 1
      ;;
  esac
done

# Header
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           🚀 SYMPHONY CI CHECK - LOCAL VALIDATION              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="ubuntu-latest"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="windows-latest"
fi

echo -e "${BLUE}📋 Configuración:${NC}"
echo "  Sistema operativo: $OS"
echo "  Frontend checks:   $RUN_FRONTEND"
echo "  Backend checks:    $RUN_BACKEND"
echo "  Build app:         $RUN_BUILD"
echo "  Coverage:          $RUN_COVERAGE"
echo ""

# Check if we're in project root
if [ ! -f "package.json" ] || [ ! -d "src-tauri" ]; then
    echo -e "${RED}${CROSS} Error: Este script debe ejecutarse desde la raíz del proyecto${NC}"
    exit 1
fi

# Track failures
FAILURES=()

# Helper function to run step
run_step() {
    local name="$1"
    local command="$2"
    
    echo ""
    echo -e "${BLUE}${ARROW} ${name}${NC}"
    
    START_TIME=$(date +%s)
    
    if eval "$command"; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "${GREEN}${CHECK} ${name} - Completado (${DURATION}s)${NC}"
        return 0
    else
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo -e "${RED}${CROSS} ${name} - FALLÓ (${DURATION}s)${NC}"
        FAILURES+=("$name")
        return 1
    fi
}

# ============================================================================
# FRONTEND TESTS
# ============================================================================

if [ "$RUN_FRONTEND" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}📦 FRONTEND CHECKS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠ node_modules no encontrado, ejecutando npm ci...${NC}"
        run_step "Install dependencies" "npm ci" || true
    fi
    
    # Type check
    run_step "Type check (TypeScript)" "npm run type-check" || true
    
    # Linter
    run_step "Linter (ESLint)" "npm run lint" || true
    
    # Tests
    run_step "Unit tests (Frontend)" "npm run test:run" || true
    
    # Coverage (only if not in fast mode)
    if [ "$RUN_COVERAGE" = true ]; then
        run_step "Coverage check" "npm run test:coverage" || true
    fi
fi

# ============================================================================
# BACKEND TESTS
# ============================================================================

if [ "$RUN_BACKEND" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}🦀 BACKEND CHECKS (RUST)${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check system dependencies (Ubuntu only)
    if [ "$OS" = "ubuntu-latest" ]; then
        echo ""
        echo -e "${BLUE}${ARROW} Verificando dependencias del sistema (Ubuntu)${NC}"
        
        MISSING_DEPS=()
        
        # Check for required packages
        for pkg in libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf; do
            if ! dpkg -s "$pkg" &> /dev/null; then
                MISSING_DEPS+=("$pkg")
            fi
        done
        
        if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
            echo -e "${YELLOW}⚠ Las siguientes dependencias no están instaladas:${NC}"
            for dep in "${MISSING_DEPS[@]}"; do
                echo "  - $dep"
            done
            echo ""
            echo -e "${YELLOW}Instálalas con:${NC}"
            echo "  sudo apt-get update"
            echo "  sudo apt-get install -y ${MISSING_DEPS[*]}"
            echo ""
            read -p "¿Deseas continuar de todas formas? [y/N] " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        else
            echo -e "${GREEN}${CHECK} Todas las dependencias están instaladas${NC}"
        fi
    fi
    
    # Formatting check
    run_step "Format check (rustfmt)" "cd src-tauri && cargo fmt --all -- --check" || true
    
    # Clippy
    run_step "Clippy (linter)" "cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings" || true
    
    # Tests
    run_step "Unit tests (Backend)" "cd src-tauri && cargo test --all-features" || true
fi

# ============================================================================
# BUILD
# ============================================================================

if [ "$RUN_BUILD" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}🔨 BUILD${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Backend build (release mode)
    run_step "Build backend (release)" "cd src-tauri && cargo build --release" || true
    
    # Full Tauri build (optional, commented out by default - takes long time)
    # echo ""
    # echo -e "${YELLOW}⚠ Full Tauri build omitido (toma ~5-10 min)${NC}"
    # echo -e "${YELLOW}  Para ejecutarlo manualmente: npm run tauri build${NC}"
    # run_step "Build Tauri app" "npm run tauri build" || true
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 RESUMEN${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ${#FAILURES[@]} -eq 0 ]; then
    echo -e "${GREEN}${CHECK} ¡TODOS LOS CHECKS PASARON!${NC}"
    echo ""
    echo -e "${GREEN}✓ Tu código está listo para hacer push${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}${CROSS} ${#FAILURES[@]} CHECK(S) FALLARON:${NC}"
    echo ""
    for failure in "${FAILURES[@]}"; do
        echo -e "  ${RED}✗${NC} $failure"
    done
    echo ""
    echo -e "${RED}⚠ Por favor corrige los errores antes de hacer push${NC}"
    echo ""
    exit 1
fi
