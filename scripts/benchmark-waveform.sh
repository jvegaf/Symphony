#!/bin/bash
# Script para benchmark de generación de waveform
# 
# Uso:
#   ./scripts/benchmark-waveform.sh                    # Usa archivo de test por defecto
#   ./scripts/benchmark-waveform.sh /ruta/archivo.mp3  # Usa archivo específico
#
# AIDEV-NOTE: Ejecuta el test de benchmark en modo release para mediciones realistas

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       WAVEFORM GENERATION BENCHMARK - Symphony             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar archivo de test
if [ -n "$1" ]; then
    TEST_FILE="$1"
    if [ ! -f "$TEST_FILE" ]; then
        echo -e "${YELLOW}⚠️  Archivo no encontrado: $TEST_FILE${NC}"
        exit 1
    fi
else
    # Buscar archivo de test por defecto
    TEST_FILE="${PROJECT_ROOT}/e2e/fixtures/test-music/sample-01.mp3"
    if [ ! -f "$TEST_FILE" ]; then
        TEST_FILE="${PROJECT_ROOT}/data/test.mp3"
    fi
fi

if [ -f "$TEST_FILE" ]; then
    echo -e "${GREEN}📁 Archivo de test: ${TEST_FILE}${NC}"
    
    # Mostrar info del archivo
    if command -v ffprobe &> /dev/null; then
        DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TEST_FILE" 2>/dev/null || echo "N/A")
        echo -e "   Duración: ${DURATION}s"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  No se encontró archivo de test${NC}"
    echo "   Uso: $0 /ruta/a/archivo.mp3"
    exit 1
fi

# Ir al directorio del proyecto Rust
cd "${PROJECT_ROOT}/src-tauri"

echo -e "${BLUE}🔧 Compilando en modo release...${NC}"
cargo build --release --quiet

echo ""
echo -e "${BLUE}🚀 Ejecutando benchmark...${NC}"
echo ""

# Ejecutar test de benchmark
cargo test waveform_generation_benchmark --release -- --nocapture 2>&1

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Benchmark completado${NC}"
echo ""
echo "Para probar con un archivo más grande (recomendado 3+ minutos):"
echo "  $0 /ruta/a/cancion.mp3"
echo ""
echo "Para limpiar cache de waveforms existentes:"
echo "  ./scripts/clear-waveform-cache.sh"
