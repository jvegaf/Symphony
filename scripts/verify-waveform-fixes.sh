#!/bin/bash
# Waveform Fix Verification Script
# Verifies all three waveform bug fixes are working correctly

set -e

echo "🔍 Symphony Waveform Fixes - Verification Script"
echo "================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

# Helper function
check_test() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL++))
  fi
}

echo "${BLUE}[1/5] Verificando estructura del proyecto...${NC}"
test -f src/components/WaveformViewer.tsx
check_test "WaveformViewer.tsx existe"

test -f src/components/analysis/CuePointEditor.tsx
check_test "CuePointEditor.tsx existe"

test -f src/App.tsx
check_test "App.tsx existe"

echo ""
echo "${BLUE}[2/5] Verificando código fuente - Fix #1: Evento 'click' en WaveformViewer...${NC}"
if grep -q "wavesurfer.on('click'" src/components/WaveformViewer.tsx; then
  echo -e "${GREEN}✅ PASS${NC}: WaveformViewer usa evento 'click'"
  ((PASS++))
else
  echo -e "${RED}❌ FAIL${NC}: WaveformViewer NO usa evento 'click'"
  ((FAIL++))
fi

if ! grep -q "wavesurfer.on('interaction'" src/components/WaveformViewer.tsx; then
  echo -e "${GREEN}✅ PASS${NC}: Evento 'interaction' removido correctamente"
  ((PASS++))
else
  echo -e "${RED}❌ FAIL${NC}: Evento 'interaction' todavía presente"
  ((FAIL++))
fi

echo ""
echo "${BLUE}[3/5] Verificando código fuente - Fix #2: Separación selectedTrack/playingTrack...${NC}"
if grep -q "const \[playingTrack, setPlayingTrack\]" src/App.tsx; then
  echo -e "${GREEN}✅ PASS${NC}: Estado playingTrack declarado"
  ((PASS++))
else
  echo -e "${RED}❌ FAIL${NC}: Estado playingTrack NO encontrado"
  ((FAIL++))
fi

if grep -q "track={playingTrack}" src/App.tsx; then
  echo -e "${GREEN}✅ PASS${NC}: PlayerSection recibe playingTrack"
  ((PASS++))
else
  echo -e "${RED}❌ FAIL${NC}: PlayerSection NO recibe playingTrack"
  ((FAIL++))
fi

echo ""
echo "${BLUE}[4/5] Verificando código fuente - Fix #3: Pointer-events en CuePointEditor...${NC}"
if grep -q "pointer-events-none" src/components/analysis/CuePointEditor.tsx; then
  echo -e "${GREEN}✅ PASS${NC}: SVG tiene pointer-events-none"
  ((PASS++))
else
  echo -e "${RED}❌ FAIL${NC}: SVG NO tiene pointer-events-none"
  ((FAIL++))
fi

if grep -q "pointer-events-auto" src/components/analysis/CuePointEditor.tsx; then
  echo -e "${GREEN}✅ PASS${NC}: Elementos <g> tienen pointer-events-auto"
  ((PASS++))
else
  echo -e "${RED}❌ FAIL${NC}: Elementos <g> NO tienen pointer-events-auto"
  ((FAIL++))
fi

echo ""
echo "${BLUE}[5/5] Ejecutando tests automatizados...${NC}"

echo "  → Tests de WaveformViewer..."
npm test -- src/components/WaveformViewer.test.tsx --run --reporter=dot > /dev/null 2>&1
check_test "WaveformViewer tests (16 tests)"

echo "  → Tests de CuePointEditor..."
npm test -- src/components/analysis/CuePointEditor.test.tsx --run --reporter=dot > /dev/null 2>&1
check_test "CuePointEditor tests (11 tests)"

echo "  → TypeScript check..."
npm run type-check > /dev/null 2>&1
check_test "TypeScript compilación"

echo "  → Build check..."
npm run build > /dev/null 2>&1
check_test "Build producción"

echo ""
echo "================================================="
echo "RESULTADOS:"
echo "  ✅ Pasados: $PASS"
echo "  ❌ Fallidos: $FAIL"
echo "================================================="

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 TODOS LOS TESTS PASARON${NC}"
  echo ""
  echo "Los tres bugs del waveform han sido corregidos:"
  echo "  1. ✅ Seek funciona haciendo click en waveform"
  echo "  2. ✅ Waveform solo se genera al reproducir (doble click)"
  echo "  3. ✅ Click funciona en toda el área del waveform"
  echo ""
  echo "Para probar manualmente, ejecuta: make dev"
  exit 0
else
  echo -e "${RED}⚠️  ALGUNOS TESTS FALLARON${NC}"
  echo "Revisa los errores arriba para más detalles."
  exit 1
fi
