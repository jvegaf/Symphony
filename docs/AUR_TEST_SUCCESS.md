# AUR PKGBUILD - Test Exitoso ✅

## Resumen del Test

**Fecha:** 19 dic 2025  
**Versión:** 0.7.0-1  
**Estado:** ✅ Compilación exitosa

---

## Resultados

### Paquete Generado
```
Nombre:  symphony-bin-0.7.0-1-x86_64.pkg.tar.zst
Tamaño:  4.5 MB (comprimido)
Binario: 16 MB (sin comprimir)
```

### Contenido Verificado
```
✅ /usr/bin/symphony                           (16 MB)
✅ /usr/share/applications/symphony.desktop
✅ /usr/share/icons/hicolor/32x32/apps/symphony.png
✅ /usr/share/icons/hicolor/128x128/apps/symphony.png
✅ /usr/share/icons/hicolor/256x256/apps/symphony.png
✅ /usr/share/licenses/symphony-bin/LICENSE
✅ /usr/share/doc/symphony-bin/README.md
```

---

## Problema Resuelto

### Error Inicial
```
rust-lld: error: undefined symbol: sqlite3_open_v2
rust-lld: error: undefined symbol: sqlite3_close_v2
... (muchos símbolos de SQLite no definidos)
```

###  Causa Raíz
El crate `libsqlite3-sys` intentaba compilar SQLite estáticamente en lugar de usar la biblioteca del sistema.

### Solución Aplicada
Agregada variable de entorno en `aur/PKGBUILD`:

```bash
build() {
    cd "$srcdir/Symphony-$pkgver"
    
    # Build frontend
    npm run build
    
    # Build Rust backend with Tauri
    cd src-tauri
    export LIBSQLITE3_SYS_USE_PKG_CONFIG=1  # ← Esta línea resuelve el problema
    cargo build --release --locked --all-features
}
```

Esta variable le indica a `libsqlite3-sys` que use `pkg-config` para encontrar la biblioteca SQLite del sistema en lugar de compilarla estáticamente.

---

## Tiempo de Compilación

```
Frontend (npm + vite):  ~30 segundos
Backend (cargo):        ~12 minutos
Empaquetado:            ~5 segundos
---
Total:                  ~13 minutos
```

---

## Dependencias Verificadas

### Runtime
- ✅ webkit2gtk
- ✅ gtk3
- ✅ libayatana-appindicator
- ✅ sqlite (se vincula correctamente con PKG_CONFIG)
- ✅ alsa-lib

### Build-time
- ✅ rust
- ✅ cargo
- ✅ npm (desde mise, no pacman)
- ✅ webkit2gtk

---

## Comandos de Test

### Test Local (sin GitHub release)
```bash
# Crear tarball local
git archive --format=tar.gz --prefix=Symphony-0.7.0/ -o /tmp/symphony-0.7.0.tar.gz HEAD

# Preparar directorio de test
TEST_DIR="/tmp/aur-test-symphony"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# Copiar archivos
cp aur/PKGBUILD "$TEST_DIR/"
cp aur/symphony.desktop "$TEST_DIR/"
cp /tmp/symphony-0.7.0.tar.gz "$TEST_DIR/"

# Compilar
cd "$TEST_DIR"
makepkg -fd --skipinteg --noconfirm

# Verificar
ls -lh symphony-bin-*.pkg.tar.zst
```

### Test con Makefile (requiere GitHub release)
```bash
make aur-test
```

---

## Instalación del Paquete de Test

```bash
# Instalar
sudo pacman -U /tmp/aur-test-symphony/symphony-bin-0.7.0-1-x86_64.pkg.tar.zst

# Verificar
which symphony
symphony --version  # (si implementado)
symphony            # Ejecutar aplicación

# Desinstalar
sudo pacman -R symphony-bin
```

---

## Advertencia de makepkg

```
==> WARNING: Package contains reference to $srcdir
usr/bin/symphony
```

**Explicación:** Esta advertencia es común y generalmente inofensiva. Ocurre porque el binario contiene rutas de compilación en los símbolos de debug. No afecta la funcionalidad.

**Solución (opcional):** Se puede agregar `options=('!debug')` al PKGBUILD para eliminar símbolos de debug y reducir tamaño del binario.

---

## Próximos Pasos

1. ✅ **PKGBUILD funciona correctamente**
2. ⏳ **Probar instalación local del paquete**
3. ⏳ **Crear tag v0.7.0 en GitHub**
4. ⏳ **Actualizar SHA256 en PKGBUILD**
5. ⏳ **Publicar a AUR**

---

## Notas Técnicas

### Por qué `makepkg -fd` en lugar de `makepkg -si`?
- `-f`: Force (sobrescribe paquetes existentes)
- `-d`: Skip dependency checks (porque npm está instalado via mise, no pacman)
- `-s`: Sync dependencies (queremos evitar esto en test local)
- `-i`: Install (solo para instalación final)

### Por qué `--skipinteg`?
- En test local, usamos un tarball generado localmente
- El PKGBUILD tiene `sha256sums=('SKIP')` de todos modos
- Para producción, se debe actualizar con el SHA256 real del tarball de GitHub

---

*Test realizado el 19 dic 2025 en CachyOS (Arch Linux)*
