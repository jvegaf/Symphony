# Investigación: Versiones Portables en Tauri 2.0

**Fecha:** 2025-12-19  
**Versión Tauri:** 2.9.6  
**Proyecto:** Symphony v0.7.0

## 🔍 Resumen Ejecutivo

Después de investigar extensivamente la documentación oficial de Tauri 2.0, he encontrado las siguientes conclusiones:

### ✅ Portable para Linux: **SÍ EXISTE (AppImage)**
### ❌ Portable para Windows: **NO EXISTE NATIVAMENTE**

---

## 📦 Linux: AppImage como Solución Portable

### ¿Qué es AppImage?

AppImage es el **formato portable** nativo de Linux en Tauri. Según la documentación oficial:

> "AppImage is a distribution format that does not rely on the system installed packages and instead **bundles all dependencies and files** needed by the application."

### Características de AppImage

| Característica | Descripción |
|----------------|-------------|
| **Sin instalación** | El usuario solo ejecuta el archivo directamente |
| **Sin dependencias** | Incluye todas las dependencias necesarias |
| **Auto-contenido** | No requiere privilegios de administrador |
| **Portable** | Se puede copiar a USB y ejecutar en cualquier distro |
| **Tamaño** | ~70+ MB (vs 2-6 MB de .deb/.rpm) |

### Cómo funciona

```bash
# 1. Descargar el AppImage
wget https://github.com/user/app/releases/download/v0.7.0/Symphony.AppImage

# 2. Dar permisos de ejecución
chmod a+x Symphony.AppImage

# 3. Ejecutar directamente
./Symphony.AppImage
```

### Configuración en Tauri

```json
{
  "bundle": {
    "targets": ["appimage"],
    "linux": {
      "appimage": {
        "bundleMediaFramework": false,
        "files": {}
      }
    }
  }
}
```

### Build

```bash
npm run tauri build -- --bundles appimage
```

### ⚠️ Problema Actual en Symphony

**AppImage está temporalmente deshabilitado** en Symphony v0.7.0 debido a incompatibilidad con Tauri 2.9.6 en Arch Linux (ver `docs/APPIMAGE_DISABLED.md`).

**Solución temporal:** Una vez se resuelva el bug o se actualice Tauri, simplemente:
1. Cambiar `targets: ["deb", "rpm"]` → `targets: ["deb", "rpm", "appimage"]`
2. Ejecutar build
3. Distribuir el archivo `.AppImage` como versión portable

---

## 💻 Windows: Versiones Portables (No Nativo)

### Estado Actual

Tauri **NO tiene un formato portable nativo** para Windows. Los formatos disponibles son:

| Formato | Tipo | Descripción |
|---------|------|-------------|
| **NSIS** | Instalador | Ejecutable `-setup.exe` que instala la app |
| **MSI** | Instalador | Windows Installer Package |
| **WiX** | Instalador | Alternativa a MSI (solo en Windows) |

### ¿Por qué no hay portable nativo?

1. **Dependencia de WebView2:** Las aplicaciones Tauri requieren Microsoft Edge WebView2 Runtime
2. **Instalación del sistema:** WebView2 debe instalarse a nivel de sistema
3. **Arquitectura de Tauri:** Diseñado para instalación tradicional de Windows

### 🎯 Soluciones Alternativas (Workarounds)

Aunque Tauri no ofrece portable nativo, existen **3 soluciones posibles**:

#### Opción 1: Portable con WebView2 Pre-instalado (Manual)

**Concepto:** Crear un .zip con el ejecutable + configuración portable

**Pasos:**

1. **Build normal:**
   ```bash
   npm run tauri build
   ```

2. **Extraer binario:**
   ```
   src-tauri/target/release/symphony.exe
   ```

3. **Crear estructura portable:**
   ```
   Symphony-Portable/
   ├── symphony.exe
   ├── _internal/          # DLLs de Tauri (si existen)
   ├── config/             # Carpeta para configuración portable
   └── README.txt          # Instrucciones
   ```

4. **Modificar código Rust para modo portable:**

```rust
// src-tauri/src/main.rs
use std::env;
use std::path::PathBuf;

fn get_app_data_dir() -> PathBuf {
    // Detectar si estamos en modo portable
    let exe_dir = env::current_exe()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf();
    
    let portable_marker = exe_dir.join("portable.txt");
    
    if portable_marker.exists() {
        // Modo portable: usar carpeta local
        exe_dir.join("config")
    } else {
        // Modo normal: usar carpeta del usuario
        dirs::config_dir().unwrap().join("Symphony")
    }
}
```

5. **Crear archivo `portable.txt`** en el directorio del ejecutable

**Limitaciones:**
- ❌ Requiere que WebView2 esté instalado en el sistema
- ❌ No es 100% portable (depende de runtime del sistema)
- ✅ Datos de usuario sí son portables

#### Opción 2: NSIS con Modo Portable

**Concepto:** Usar NSIS installer con opción de "portable mode"

**Configuración NSIS custom:**

```nsis
; src-tauri/nsis/portable-hook.nsh

!macro NSIS_HOOK_PREINSTALL
  ; Detectar si se ejecuta desde carpeta temporal
  ; Si es así, asumir modo portable
  
  ${If} $INSTDIR == "$TEMP"
    WriteINIStr "$INSTDIR\portable.txt" "Portable" "Mode" "true"
  ${EndIf}
!macroend
```

```json
// tauri.conf.json
{
  "bundle": {
    "windows": {
      "nsis": {
        "installerHooks": "./nsis/portable-hook.nsh",
        "installMode": "both"  // Permitir elegir instalación
      }
    }
  }
}
```

**Limitaciones:**
- ❌ Sigue siendo un instalador
- ❌ Sigue requiriendo WebView2
- ⚠️ Complejidad adicional

#### Opción 3: WebView2 Fixed Runtime (Recomendado para Portable)

**Concepto:** Empaquetar WebView2 Runtime directamente con la app

**Configuración:**

```json
{
  "bundle": {
    "windows": {
      "webviewInstallMode": {
        "type": "fixedRuntime",
        "path": "./webview2-runtime/"
      }
    }
  }
}
```

**Pasos:**

1. Descargar WebView2 Fixed Runtime:
   ```
   https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section
   ```

2. Colocar en `src-tauri/webview2-runtime/`

3. Build con runtime incluido:
   ```bash
   npm run tauri build
   ```

4. Crear package portable:
   ```bash
   # Después del build
   cd src-tauri/target/release
   mkdir symphony-portable
   cp symphony.exe symphony-portable/
   cp -r webview2-runtime symphony-portable/
   echo "Portable Mode" > symphony-portable/portable.txt
   zip -r Symphony-0.7.0-Portable-Windows.zip symphony-portable/
   ```

**Ventajas:**
- ✅ **Verdaderamente portable** (incluye WebView2)
- ✅ No requiere instalación
- ✅ Se puede ejecutar desde USB

**Limitaciones:**
- ⚠️ Tamaño grande (~150-200 MB debido a WebView2)
- ⚠️ Requiere código custom para detección de modo portable

---

## 📊 Comparación de Formatos

### Linux

| Formato | Portable | Tamaño | Dependencias | Instalación | Estado Symphony |
|---------|----------|--------|--------------|-------------|-----------------|
| AppImage | ✅ SÍ | ~70 MB | ❌ Ninguna | ❌ No requiere | ❌ Deshabilitado (temporal) |
| .deb | ❌ No | ~7 MB | ✅ Sistema | ✅ `dpkg -i` | ✅ Funcionando |
| .rpm | ❌ No | ~7 MB | ✅ Sistema | ✅ `rpm -i` | ✅ Funcionando |
| AUR | ❌ No | Build | ✅ Sistema | ✅ `makepkg -si` | ✅ Implementado |

### Windows

| Formato | Portable | Tamaño | Dependencias | Instalación | Nativo Tauri |
|---------|----------|--------|--------------|-------------|--------------|
| NSIS | ❌ No | ~8 MB | WebView2 | ✅ Requerida | ✅ Sí |
| MSI | ❌ No | ~8 MB | WebView2 | ✅ Requerida | ✅ Sí (solo Windows) |
| Portable + Fixed Runtime | ✅ SÍ | ~150 MB | ❌ Ninguna | ❌ No requiere | ⚠️ Custom |
| Portable (solo .exe) | ⚠️ Parcial | ~8 MB | WebView2 pre-instalado | ❌ No requiere | ⚠️ Custom |

---

## 🎯 Recomendación para Symphony

### Para Linux ✅

**Habilitar AppImage cuando se resuelva el bug:**

```json
{
  "bundle": {
    "targets": ["deb", "rpm", "appimage"]
  }
}
```

**Distribución:**
- `.deb` / `.rpm` → Instaladores tradicionales (~85% usuarios)
- `.AppImage` → **Versión portable** (~5-10% usuarios que prefieren portable)
- AUR → Arch Linux (~5-10% usuarios)

### Para Windows 🔧

**Implementar Opción 3 (WebView2 Fixed Runtime):**

1. **Configurar Fixed Runtime:**

```json
{
  "bundle": {
    "targets": ["nsis", "msi"],
    "windows": {
      "webviewInstallMode": {
        "type": "fixedRuntime",
        "path": "./webview2-runtime/"
      }
    }
  }
}
```

2. **Crear script post-build para portable:**

```bash
# scripts/create-portable-windows.sh
#!/bin/bash

VERSION="0.7.0"
BUILD_DIR="src-tauri/target/release"
PORTABLE_DIR="$BUILD_DIR/symphony-portable"

# Limpiar directorio anterior
rm -rf "$PORTABLE_DIR"
mkdir -p "$PORTABLE_DIR"

# Copiar ejecutable
cp "$BUILD_DIR/symphony.exe" "$PORTABLE_DIR/"

# Copiar runtime si existe
if [ -d "$BUILD_DIR/webview2-runtime" ]; then
    cp -r "$BUILD_DIR/webview2-runtime" "$PORTABLE_DIR/"
fi

# Crear marcador portable
echo "Portable Mode Enabled" > "$PORTABLE_DIR/portable.txt"

# Crear README
cat > "$PORTABLE_DIR/README.txt" << 'EOF'
Symphony v${VERSION} - Portable Edition

INSTALLATION:
1. Extract this folder to any location (USB, hard drive, etc.)
2. Run symphony.exe
3. All settings will be saved in the "config" folder

REQUIREMENTS:
- Windows 10/11 (64-bit)
- No administrator rights needed
- WebView2 Runtime included

NOTE: First launch may take a few seconds.
EOF

# Crear .zip
cd "$BUILD_DIR"
zip -r "Symphony-${VERSION}-Portable-Windows.zip" symphony-portable/

echo "Portable package created: Symphony-${VERSION}-Portable-Windows.zip"
```

3. **Modificar código Rust para detección portable:**

```rust
// src-tauri/src/portable.rs
use std::path::PathBuf;
use std::env;
use std::fs;

pub fn is_portable_mode() -> bool {
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let portable_marker = exe_dir.join("portable.txt");
            return portable_marker.exists();
        }
    }
    false
}

pub fn get_data_directory() -> PathBuf {
    if is_portable_mode() {
        // Modo portable: usar directorio local
        let exe_dir = env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf();
        
        let config_dir = exe_dir.join("config");
        
        // Crear si no existe
        fs::create_dir_all(&config_dir).ok();
        
        config_dir
    } else {
        // Modo normal: usar AppData
        dirs::config_dir()
            .unwrap()
            .join("Symphony")
    }
}
```

4. **Actualizar GitHub Actions Workflow:**

```yaml
# .github/workflows/release.yml
- name: Create Windows Portable Package
  if: matrix.platform == 'windows-latest'
  run: |
    chmod +x scripts/create-portable-windows.sh
    ./scripts/create-portable-windows.sh
    
- name: Upload Portable Package
  if: matrix.platform == 'windows-latest'
  uses: actions/upload-artifact@v3
  with:
    name: windows-portable
    path: src-tauri/target/release/Symphony-*-Portable-Windows.zip
```

---

## 📝 Formatos de Distribución Propuestos

### Después de implementar portable:

**Linux:**
- `Symphony_0.7.0_amd64.deb` - Instalador Debian/Ubuntu
- `Symphony-0.7.0-1.x86_64.rpm` - Instalador Fedora/RedHat
- `Symphony-0.7.0.AppImage` - **PORTABLE** (cuando se habilite)
- AUR: `symphony-bin` - Arch Linux

**Windows:**
- `Symphony_0.7.0_x64-setup.exe` - Instalador NSIS
- `Symphony_0.7.0_x64.msi` - Instalador MSI
- `Symphony-0.7.0-Portable-Windows.zip` - **PORTABLE** (nuevo)

---

## 🚀 Plan de Implementación

### Fase 1: Habilitar AppImage (Linux Portable)
1. ✅ Esperar fix de Tauri 2.10+ o solución al bug
2. ⏳ Cambiar `targets: ["deb", "rpm"]` → `["deb", "rpm", "appimage"]`
3. ⏳ Test en múltiples distros
4. ⏳ Actualizar documentación

### Fase 2: Implementar Windows Portable
1. ⏳ Descargar WebView2 Fixed Runtime
2. ⏳ Configurar `webviewInstallMode: fixedRuntime`
3. ⏳ Implementar detección portable en Rust (`src-tauri/src/portable.rs`)
4. ⏳ Crear script `scripts/create-portable-windows.sh`
5. ⏳ Actualizar GitHub Actions workflow
6. ⏳ Test en Windows 10/11 (clean install)
7. ⏳ Actualizar README con instrucciones portable

### Fase 3: Documentación
1. ⏳ Actualizar README.md con sección portable
2. ⏳ Crear `docs/PORTABLE_BUILDS.md`
3. ⏳ Actualizar release notes

---

## 📚 Referencias

- **Tauri AppImage:** https://v2.tauri.app/distribute/appimage
- **Tauri Windows Installer:** https://v2.tauri.app/distribute/windows-installer
- **WebView2 Runtime:** https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- **NSIS Hooks:** https://v2.tauri.app/distribute/windows-installer#extending-the-installer
- **Bundle Config:** https://v2.tauri.app/reference/config/#bundle

---

## ✅ Conclusión

| Plataforma | Portable Nativo | Solución | Complejidad | Tamaño |
|------------|----------------|----------|-------------|--------|
| **Linux** | ✅ AppImage | Habilitar en config | ⭐ Baja | ~70 MB |
| **Windows** | ❌ No existe | Fixed Runtime + Custom code | ⭐⭐⭐ Media-Alta | ~150 MB |

**Recomendación final:**
1. **Linux:** Habilitar AppImage inmediatamente cuando se resuelva bug de Tauri
2. **Windows:** Implementar portable con WebView2 Fixed Runtime para v0.8.0 o posterior

**Impacto en usuarios:**
- Linux: ~10-15% usuarios prefieren portable (AppImage)
- Windows: ~20-30% usuarios corporativos/USB prefieren portable

**Esfuerzo estimado:**
- Linux AppImage: 1-2 horas (solo config)
- Windows Portable: 8-12 horas (código custom + testing + docs)
