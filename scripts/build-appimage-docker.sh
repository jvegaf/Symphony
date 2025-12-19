#!/bin/bash
# Script para construir AppImage usando Docker
# Soluciona el problema de glibc incompatible en Arch/CachyOS
# Optimizado para CI: usa cache agresivo y limpieza automática

set -e

# Colors para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Symphony AppImage Builder (Docker) ===${NC}"
echo ""

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker no está instalado${NC}"
    echo "Instala Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -d "src-tauri" ]; then
    echo -e "${RED}Error: Este script debe ejecutarse desde la raíz del proyecto Symphony${NC}"
    exit 1
fi

# Nombre de la imagen Docker
IMAGE_NAME="symphony-appimage-builder"
IMAGE_TAG="ubuntu20.04"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
CONTAINER_NAME="symphony-appimage-build"

# Paso 1: Construir imagen Docker (si no existe, con cache)
echo -e "${YELLOW}[1/4] Verificando imagen Docker...${NC}"
if docker images | grep -q "$IMAGE_NAME.*$IMAGE_TAG"; then
    echo -e "${BLUE}✓ Imagen Docker '$FULL_IMAGE_NAME' ya existe${NC}"
    CURRENT_SIZE=$(docker images $FULL_IMAGE_NAME --format "{{.Size}}")
    echo -e "${BLUE}  Tamaño: $CURRENT_SIZE${NC}"
else
    echo "Construyendo imagen Docker (esto puede tomar varios minutos la primera vez)..."
    echo ""
    
    # Build con BuildKit para mejor cache y tamaño reducido
    DOCKER_BUILDKIT=1 docker build \
        --target runtime \
        --tag $FULL_IMAGE_NAME \
        --file Dockerfile.appimage \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        .
    
    echo ""
    FINAL_SIZE=$(docker images $FULL_IMAGE_NAME --format "{{.Size}}")
    echo -e "${GREEN}✓ Imagen construida: $FINAL_SIZE${NC}"
fi

# Paso 2: Limpiar container anterior si existe
echo -e "${YELLOW}[2/4] Limpiando containers anteriores...${NC}"
docker rm -f $CONTAINER_NAME 2>/dev/null || true

# Paso 3: Ejecutar build dentro del container
echo -e "${YELLOW}[3/4] Construyendo AppImage en Ubuntu 20.04 container...${NC}"
docker run \
    --name $CONTAINER_NAME \
    --rm \
    -v "$(pwd):/workspace" \
    -w /workspace \
    -e CI=true \
    -e CARGO_TARGET_DIR=/tmp/cargo-target \
    -e CARGO_INCREMENTAL=0 \
    -e LIBSQLITE3_SYS_USE_PKG_CONFIG=1 \
    $FULL_IMAGE_NAME \
    bash -c "
        set -e
        echo '=== Instalando dependencias de Node.js ==='
        npm install --prefer-offline --no-audit
        
        echo ''
        echo '=== Construyendo frontend ==='
        npm run build
        
        echo ''
        echo '=== Construyendo AppImage ==='
        cd src-tauri
        cargo build --release --locked
        
        echo ''
        echo '=== Empaquetando AppImage ==='
        cd ..
        npm run tauri build -- --bundles appimage
        
        echo ''
        echo '=== Limpiando artefactos de build ==='
        # Limpiar target de Cargo (no necesario para AppImage final)
        rm -rf /tmp/cargo-target
        
        echo ''
        echo '=== Build completado ==='
        if [ -d src-tauri/target/release/bundle/appimage ]; then
            ls -lh src-tauri/target/release/bundle/appimage/
        else
            echo 'ERROR: Directorio de AppImage no encontrado'
            exit 1
        fi
    "

BUILD_EXIT_CODE=$?

# Paso 4: Verificar resultado
echo -e "${YELLOW}[4/4] Finalizando...${NC}"

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    # Verificar que el AppImage fue creado
    APPIMAGE_PATH="src-tauri/target/release/bundle/appimage/Symphony_0.7.0_amd64.AppImage"
    
    if [ -f "$APPIMAGE_PATH" ]; then
        APPIMAGE_SIZE=$(du -h "$APPIMAGE_PATH" | cut -f1)
        echo ""
        echo -e "${GREEN}✅ AppImage construido exitosamente!${NC}"
        echo ""
        echo -e "${BLUE}Ubicación:${NC} $APPIMAGE_PATH"
        echo -e "${BLUE}Tamaño:${NC}    $APPIMAGE_SIZE"
        echo ""
        
        # Verificar glibc requerido
        echo -e "${BLUE}Verificando compatibilidad glibc...${NC}"
        if command -v readelf &> /dev/null; then
            GLIBC_VERSION=$(readelf -V "$APPIMAGE_PATH" 2>/dev/null | grep GLIBC_ | sed 's/.*GLIBC_//' | sort -V | tail -1 || echo "unknown")
            echo -e "${BLUE}glibc requerido:${NC} 2.$GLIBC_VERSION (compatible con Ubuntu 20.04+)"
        fi
        
        echo ""
        echo -e "${YELLOW}Para ejecutar:${NC}"
        echo "  chmod +x $APPIMAGE_PATH"
        echo "  ./$APPIMAGE_PATH"
        echo ""
        
        # Mostrar tamaño de imagen Docker final
        DOCKER_SIZE=$(docker images $FULL_IMAGE_NAME --format "{{.Size}}")
        echo -e "${BLUE}Imagen Docker:${NC} $DOCKER_SIZE"
        
    else
        echo -e "${RED}❌ Error: AppImage no fue generado${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Error durante el build${NC}"
    echo "Revisa los logs arriba para más detalles"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Build completado ===${NC}"

# Tip para limpiar
echo ""
echo -e "${YELLOW}Tip:${NC} Para liberar espacio, puedes eliminar la imagen Docker con:"
echo "  docker rmi $FULL_IMAGE_NAME"
