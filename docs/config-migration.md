# Migración de Configuración a XDG Base Directory

**Fecha:** 16 de diciembre, 2025  
**Versión:** v0.3.0+

## Resumen de Cambios

Symphony ha migrado su directorio de configuración para seguir el estándar **XDG Base Directory Specification**.

### Antes (v0.2.x)
```
~/.local/share/symphony/
├── symphony.db
└── symphony.log
```

### Ahora (v0.3.0+)
```
~/.config/symphony/
├── symphony.db        # Base de datos SQLite
├── symphony.log       # Logs de la aplicación
└── settings.json      # Configuración (futuro)
```

## Ubicaciones por Sistema Operativo

| Sistema | Ruta de Configuración |
|---------|----------------------|
| **Linux** | `~/.config/symphony/` |
| **macOS** | `~/Library/Application Support/symphony/` |
| **Windows** | `%APPDATA%\symphony\` |

## Migración Manual (si es necesario)

Si tienes datos en la ubicación antigua, puedes migrarlos manualmente:

```bash
# Linux/macOS
cp -r ~/.local/share/symphony/* ~/.config/symphony/

# Verificar que los archivos se copiaron correctamente
ls -la ~/.config/symphony/

# Opcional: limpiar ubicación antigua
rm -rf ~/.local/share/symphony/
```

## Comandos Makefile Actualizados

Todos los comandos del Makefile han sido actualizados para usar la nueva ruta:

```bash
# Ver información de la base de datos
make db-info

# Limpiar base de datos del usuario
make db-clean-user

# Crear backup
make db-backup

# Restaurar backup
make db-restore
```

## Comportamiento de Auto-Creación

La aplicación ahora crea automáticamente el directorio de configuración si no existe:

1. Al iniciar, verifica si `~/.config/symphony/` existe
2. Si no existe, crea el directorio con permisos apropiados
3. Inicializa la base de datos con el esquema actual (v3)
4. Los logs comienzan a escribirse automáticamente

## Implementación Técnica

### Nuevo Módulo: `utils::paths`

```rust
// src-tauri/src/utils/paths.rs

/// Obtiene el directorio de configuración (~/.config/symphony)
pub fn get_app_config_dir() -> PathBuf

/// Asegura que todos los directorios existan
pub fn ensure_app_dirs() -> std::io::Result<PathBuf>

/// Obtiene la ruta completa del archivo de base de datos
pub fn get_db_path() -> PathBuf

/// Obtiene la ruta completa del archivo de logs
pub fn get_log_path() -> PathBuf

/// Obtiene la ruta completa del archivo de settings
pub fn get_settings_path() -> PathBuf
```

### Archivos Modificados

1. **`src-tauri/src/utils/mod.rs`** - Módulo nuevo con `paths.rs`
2. **`src-tauri/src/utils/paths.rs`** - Funciones centralizadas de rutas (5 tests)
3. **`src-tauri/src/lib.rs`** - Usa `ensure_app_dirs()` al iniciar
4. **`src-tauri/src/db/connection.rs`** - Usa `get_db_path()` centralizada
5. **`Makefile`** - Todos los comandos `db-*` actualizados

## Verificación

Para verificar que la migración fue exitosa:

```bash
# Ejecutar la aplicación
make dev

# En otra terminal, verificar que los archivos se crean
ls -la ~/.config/symphony/
tail -f ~/.config/symphony/symphony.log
```

## Notas Importantes

- **Compatibilidad hacia atrás:** La aplicación NO migra automáticamente los datos antiguos
- **Inicio limpio:** Si borras `~/.config/symphony/`, la app lo recreará automáticamente
- **Tests:** Los tests usan conexiones en memoria, no tocan el sistema de archivos
- **Backups:** Siempre usa `make db-backup` antes de hacer cambios importantes

## Ventajas del Cambio

1. ✅ **Estándar XDG:** Sigue las convenciones de Linux/Unix
2. ✅ **Organización:** Separa configuración de datos de aplicación
3. ✅ **Portabilidad:** Funciona en Linux, macOS y Windows
4. ✅ **Auto-creación:** No más errores de "archivo no encontrado"
5. ✅ **Centralizado:** Todas las rutas en un solo módulo (`utils::paths`)

## Próximos Pasos

- [ ] Implementar `settings.json` para persistir configuración de usuario
- [ ] Agregar comando `make db-migrate-old` para migración automática
- [ ] Documentar ubicación de backups (`./backups/`)
- [ ] Considerar rotación automática de logs

---

**Documentación generada automáticamente** | Symphony v0.3.0
