#!/bin/bash
# Script para verificar y testear el PKGBUILD después de hacer público el repositorio
# Uso: ./scripts/test-aur-after-public.sh

set -e  # Exit on error

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Symphony AUR - Verificación Post-Público                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Variables
VERSION="0.7.0"
REPO_URL="https://github.com/jvegaf/Symphony"
TARBALL_URL="$REPO_URL/archive/refs/tags/v$VERSION.tar.gz"
EXPECTED_SHA="0019dfc4b32d63c1392aa264aed2253c1e0c2fb09216f8e2cc269bbfb8bb49b5"

# Paso 1: Verificar acceso público al repositorio
echo -e "${YELLOW}[1/5] Verificando acceso público al repositorio...${NC}"
HTTP_CODE=$(curl -sI "$TARBALL_URL" | grep "^HTTP" | awk '{print $2}')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Repositorio es público (HTTP 200)${NC}"
elif [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ Repositorio es público (HTTP 302 - redirect)${NC}"
else
    echo -e "${RED}❌ ERROR: Repositorio NO es público (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}   Asegúrate de hacer público el repo en GitHub Settings${NC}"
    exit 1
fi

# Paso 2: Descargar y verificar SHA256
echo ""
echo -e "${YELLOW}[2/5] Descargando tarball y verificando SHA256...${NC}"
cd /tmp
rm -f symphony-test-$VERSION.tar.gz
curl -sL "$TARBALL_URL" -o symphony-test-$VERSION.tar.gz

if [ ! -f "symphony-test-$VERSION.tar.gz" ]; then
    echo -e "${RED}❌ ERROR: No se pudo descargar el tarball${NC}"
    exit 1
fi

ACTUAL_SHA=$(sha256sum symphony-test-$VERSION.tar.gz | cut -d' ' -f1)

echo "   SHA256 esperado:  $EXPECTED_SHA"
echo "   SHA256 descargado: $ACTUAL_SHA"

if [ "$ACTUAL_SHA" = "$EXPECTED_SHA" ]; then
    echo -e "${GREEN}✅ SHA256 coincide perfectamente${NC}"
else
    echo -e "${RED}❌ ERROR: SHA256 NO coincide${NC}"
    echo -e "${YELLOW}   Necesitas actualizar el PKGBUILD con el nuevo SHA256:${NC}"
    echo -e "${YELLOW}   sed -i \"s/$EXPECTED_SHA/$ACTUAL_SHA/\" aur/PKGBUILD${NC}"
    echo -e "${YELLOW}   cd aur && makepkg --printsrcinfo > .SRCINFO${NC}"
    rm -f symphony-test-$VERSION.tar.gz
    exit 1
fi

rm -f symphony-test-$VERSION.tar.gz

# Paso 3: Verificar estructura del tarball
echo ""
echo -e "${YELLOW}[3/5] Verificando estructura del tarball...${NC}"
TARBALL_FILES=$(curl -sL "$TARBALL_URL" | tar -tzf - | head -10)
if echo "$TARBALL_FILES" | grep -q "Symphony-$VERSION/"; then
    echo -e "${GREEN}✅ Estructura del tarball correcta${NC}"
    echo "   Primeros archivos:"
    echo "$TARBALL_FILES" | head -5 | sed 's/^/   - /'
else
    echo -e "${RED}❌ ERROR: Estructura del tarball incorrecta${NC}"
    exit 1
fi

# Paso 4: Limpiar builds previos
echo ""
echo -e "${YELLOW}[4/5] Limpiando builds previos de AUR...${NC}"
cd - > /dev/null
if [ -d "aur/pkg" ] || [ -d "aur/src" ] || ls aur/*.pkg.tar.zst 2>/dev/null; then
    make aur-clean
    echo -e "${GREEN}✅ Limpieza completada${NC}"
else
    echo -e "${GREEN}✅ No hay archivos previos para limpiar${NC}"
fi

# Paso 5: Verificar PKGBUILD
echo ""
echo -e "${YELLOW}[5/5] Verificando PKGBUILD...${NC}"
cd aur

# Verificar que el PKGBUILD existe
if [ ! -f "PKGBUILD" ]; then
    echo -e "${RED}❌ ERROR: PKGBUILD no encontrado${NC}"
    exit 1
fi

# Verificar que .SRCINFO existe
if [ ! -f ".SRCINFO" ]; then
    echo -e "${YELLOW}⚠️  .SRCINFO no existe, generando...${NC}"
    makepkg --printsrcinfo > .SRCINFO
fi

# Verificar que la URL es correcta
if grep -q "archive/refs/tags/v\$pkgver.tar.gz" PKGBUILD; then
    echo -e "${GREEN}✅ URL del source correcta${NC}"
else
    echo -e "${RED}❌ ERROR: URL del source incorrecta${NC}"
    exit 1
fi

# Verificar SHA256
if grep -q "sha256sums=('$EXPECTED_SHA')" PKGBUILD; then
    echo -e "${GREEN}✅ SHA256 configurado correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  SHA256 en PKGBUILD no coincide con el esperado${NC}"
fi

cd ..

# Resumen final
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Verificación Completada                                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Todas las verificaciones pasaron exitosamente${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "  1. ${BLUE}make aur-build${NC}     - Compilar el paquete localmente"
echo -e "  2. ${BLUE}make aur-install${NC}   - Instalar y probar la aplicación"
echo -e "  3. ${BLUE}make aur-publish-check${NC} - Verificar preparación para AUR"
echo ""
echo -e "${YELLOW}Para publicar en AUR (primera vez):${NC}"
echo -e "  Ver guía en: ${BLUE}aur/POST_PUBLIC_CHECKLIST.md${NC}"
echo ""
