# Checklist: Después de hacer público el repositorio

## ✅ Pasos a seguir (en orden)

### 1. Verificar acceso público al tarball
```bash
# Ejecutar desde el directorio del proyecto
bash /tmp/verify_public.sh
```

**Resultado esperado:**
- HTTP/2 200 (no 404)
- SHA256 debe coincidir con el PKGBUILD

### 2. Limpiar builds previos de AUR
```bash
make aur-clean
# o manualmente:
cd aur && rm -rf pkg/ src/ *.pkg.tar.zst
```

### 3. Test completo del PKGBUILD
```bash
make aur-test
# Esto ejecuta: aur-clean → aur-srcinfo → aur-build
```

**Verificaciones durante el build:**
- ✅ Descarga del tarball exitosa
- ✅ `npm install` funciona
- ✅ `npm run build` funciona
- ✅ `cargo build --release` funciona
- ✅ Paquete .pkg.tar.zst se genera

### 4. Instalar localmente para probar
```bash
make aur-install
# o manualmente:
cd aur && makepkg -si
```

**Pruebas después de instalar:**
- Ejecutar: `symphony`
- Verificar que la aplicación abre
- Importar una carpeta de música
- Reproducir una pista
- Si todo funciona → ✅ Listo para publicar

### 5. Preparar para publicación en AUR

```bash
# Verificar que todo esté correcto
make aur-publish-check
```

**Checklist de publicación:**
- [x] Tag v0.7.0 existe y es público
- [x] PKGBUILD tiene URL correcta
- [x] SHA256 es correcto (no 'SKIP')
- [x] .SRCINFO está actualizado
- [ ] Paquete instalado y probado localmente
- [ ] README.md del AUR está actualizado

### 6. Publicar en AUR (primera vez)

```bash
# 1. Clonar tu repositorio AUR (creado en aur.archlinux.org)
git clone ssh://aur@aur.archlinux.org/symphony-bin.git aur-publish

# 2. Copiar archivos necesarios
cp aur/PKGBUILD aur-publish/
cp aur/.SRCINFO aur-publish/
cp aur/symphony.desktop aur-publish/
cp aur/README.md aur-publish/ # si existe

# 3. Commit y push
cd aur-publish
git add PKGBUILD .SRCINFO symphony.desktop
git commit -m "Initial release: Symphony v0.7.0"
git push
```

### 7. Actualizar documentación del proyecto

Actualizar README.md con instrucciones AUR públicas:
```markdown
### Arch Linux (AUR)
```bash
# Con yay
yay -S symphony-bin

# Con paru
paru -S symphony-bin
```
```

## 🔧 Troubleshooting

### Problema: SHA256 no coincide después de hacer público
**Solución:**
```bash
# Descargar tarball público
curl -L "https://github.com/jvegaf/Symphony/archive/refs/tags/v0.7.0.tar.gz" -o /tmp/symphony-0.7.0.tar.gz

# Calcular SHA256 real
sha256sum /tmp/symphony-0.7.0.tar.gz

# Actualizar en PKGBUILD (línea 32)
# Regenerar .SRCINFO
cd aur && makepkg --printsrcinfo > .SRCINFO
```

### Problema: makepkg falla en npm install
**Posibles causas:**
- Node.js versión incompatible
- Dependencias faltantes

**Solución:**
```bash
# Verificar versión Node.js
node --version  # Debe ser 18+

# Instalar dependencias manualmente y probar
cd /tmp
tar xzf symphony-0.7.0.tar.gz
cd Symphony-0.7.0
npm install
```

### Problema: cargo build falla por SQLite
**Solución:**
El PKGBUILD ya incluye `export LIBSQLITE3_SYS_USE_PKG_CONFIG=1` para usar SQLite del sistema.

Si aún falla:
```bash
# Verificar que sqlite está instalado
pacman -Q sqlite
```

## 📝 Notas importantes

1. **Primera publicación en AUR**: Necesitas crear una cuenta en https://aur.archlinux.org
2. **SSH Key**: Configura tu SSH key en tu perfil AUR
3. **Naming**: `symphony-bin` indica que es un paquete binario (compila desde fuente)
4. **Mantenimiento**: Actualizar el PKGBUILD cada vez que haya un nuevo release

## 🎯 Estado actual

- [x] PKGBUILD creado y configurado
- [x] .SRCINFO generado
- [x] symphony.desktop creado
- [x] URL corregida a `/refs/tags/`
- [ ] Repositorio hecho público
- [ ] Tarball accesible verificado
- [ ] Build local exitoso
- [ ] Instalación local probada
- [ ] Publicado en AUR

## 📚 Referencias

- Guía oficial AUR: https://wiki.archlinux.org/title/AUR_submission_guidelines
- PKGBUILD tutorial: https://wiki.archlinux.org/title/PKGBUILD
- .SRCINFO: https://wiki.archlinux.org/title/.SRCINFO

---

**Próximo paso:** Hacer el repositorio público y ejecutar `bash /tmp/verify_public.sh`
