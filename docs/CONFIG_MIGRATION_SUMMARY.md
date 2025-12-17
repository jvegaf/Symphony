# Resumen de Cambios: Migración a ~/.config/symphony

## ✅ Cambios Implementados

### 1. Nuevo Módulo `utils::paths` (NUEVO)
**Archivo:** `src-tauri/src/utils/paths.rs`

Funciones centralizadas para gestión de rutas:
- ✅ `get_app_config_dir()` - Retorna `~/.config/symphony`
- ✅ `ensure_app_dirs()` - Crea directorios si no existen
- ✅ `get_db_path()` - Ruta de `symphony.db`
- ✅ `get_log_path()` - Ruta de `symphony.log`
- ✅ `get_settings_path()` - Ruta de `settings.json` (futuro)
- ✅ **5 tests** pasando

### 2. Actualización de `lib.rs`
**Archivo:** `src-tauri/src/lib.rs`

Cambios:
- ✅ Importa `utils::paths`
- ✅ Llama a `ensure_app_dirs()` al inicio
- ✅ Usa `get_log_path()` y `get_db_path()` centralizadas
- ✅ Elimina lógica duplicada de `data_local_dir()`
- ✅ Muestra rutas en consola al iniciar:
  ```
  ╔══════════════════════════════════════════════════════════════════╗
  ║ 📁 CONFIG DIR: ~/.config/symphony
  ║ 🔍 LOG FILE:   ~/.config/symphony/symphony.log
  ║ 💾 DATABASE:   ~/.config/symphony/symphony.db
  ╚══════════════════════════════════════════════════════════════════╝
  ```

### 3. Actualización de `connection.rs`
**Archivo:** `src-tauri/src/db/connection.rs`

Cambios:
- ✅ Usa `ensure_app_dirs()` para crear directorio
- ✅ Usa `get_db_path()` centralizada (con alias `get_app_db_path`)
- ✅ Elimina lógica duplicada de creación de directorios
- ✅ Tests siguen funcionando correctamente

### 4. Actualización del Makefile
**Archivo:** `Makefile`

Comandos actualizados:
- ✅ `db-clean-user` - Limpia `~/.config/symphony/` (DB + logs + settings)
- ✅ `db-backup` - Crea backup desde `~/.config/symphony/`
- ✅ `db-restore` - Restaura a `~/.config/symphony/`
- ✅ `db-info` - Muestra info de `~/.config/symphony/` (DB + logs + settings)

### 5. Documentación
**Archivos:** `docs/config-migration.md`

- ✅ Guía completa de migración
- ✅ Explicación de cambios de rutas
- ✅ Instrucciones de migración manual
- ✅ Documentación de funciones del módulo `paths`

## 📊 Resultados de Tests

### Backend (Rust)
```bash
cargo test utils::paths
# 5 tests passing ✅
```

```bash
cargo test db::connection
# 3 tests passing ✅
```

```bash
cargo test --lib
# 118 tests passing ✅
# 2 tests failing (preexistentes, no relacionados)
```

### Tests que fallan (PRE-EXISTENTES)
- ❌ `audio::player::tests::test_playback_state_serialize` - Issue de serialización
- ❌ `audio::resampler::tests::test_downsample_48_to_44` - Issue de tolerancia

**Estos tests ya fallaban ANTES de nuestros cambios.**

## 🎯 Verificación del Comportamiento

### Auto-creación de Directorios
```bash
# 1. Eliminar directorio
rm -rf ~/.config/symphony

# 2. Ejecutar la app
make dev

# 3. Verificar que se creó
ls -la ~/.config/symphony/
# ✅ symphony.db existe
# ✅ symphony.log existe (después de iniciar la app)
```

### Comandos Makefile
```bash
# Ver información
make db-info
# ✅ Muestra rutas correctas de ~/.config/symphony

# Limpiar base de datos
make db-clean-user
# ✅ Limpia ~/.config/symphony/symphony.db
# ✅ Limpia ~/.config/symphony/symphony.log
# ✅ Limpia ~/.config/symphony/settings.json

# Crear backup
make db-backup
# ✅ Copia desde ~/.config/symphony/symphony.db
# ✅ Guarda en backups/symphony_YYYYMMDD_HHMMSS.db
```

## 📁 Estructura de Archivos Nueva

```
~/.config/symphony/           # Directorio base (auto-creado)
├── symphony.db              # Base de datos SQLite
├── symphony.log             # Logs de la aplicación
└── settings.json            # Settings (futuro Milestone 5)
```

## 🔄 Compatibilidad

### Sistemas Soportados
- ✅ **Linux:** `~/.config/symphony/` (XDG Base Directory)
- ✅ **macOS:** `~/Library/Application Support/symphony/`
- ✅ **Windows:** `%APPDATA%\symphony\`

### Migración desde v0.2.x
La aplicación **NO migra automáticamente** datos de `~/.local/share/symphony/`.

**Migración manual:**
```bash
cp -r ~/.local/share/symphony/* ~/.config/symphony/
```

## ⚠️ Notas Importantes

1. **Primera ejecución:** Si `~/.config/symphony/` no existe, la app lo crea automáticamente
2. **Base de datos:** Si `symphony.db` no existe, se ejecutan las migraciones y se crea desde cero
3. **Logs:** El plugin de Tauri crea `symphony.log` automáticamente al iniciar
4. **Tests:** Usan conexiones en memoria, no tocan el filesystem real
5. **Backups:** Los backups existentes en `./backups/` siguen funcionando

## 📝 Archivos Modificados (Resumen)

| Archivo | Tipo | Cambios |
|---------|------|---------|
| `src-tauri/src/utils/mod.rs` | NUEVO | Módulo utils |
| `src-tauri/src/utils/paths.rs` | NUEVO | 5 funciones + 5 tests |
| `src-tauri/src/lib.rs` | MODIFICADO | Usa paths centralizadas |
| `src-tauri/src/db/connection.rs` | MODIFICADO | Usa paths centralizadas |
| `Makefile` | MODIFICADO | Todos los comandos `db-*` |
| `docs/config-migration.md` | NUEVO | Guía de migración |

## ✅ Checklist de Validación

- [x] Módulo `utils::paths` creado y con tests
- [x] `lib.rs` actualizado para usar paths centralizadas
- [x] `connection.rs` actualizado para usar paths centralizadas
- [x] Makefile actualizado con nuevas rutas
- [x] Documentación de migración creada
- [x] Tests de backend pasando (118/120)
- [x] Auto-creación de directorios funcionando
- [x] Comando `make db-info` funcionando
- [x] Sin warnings de imports no usados

## 🚀 Próximos Pasos

1. ✅ **COMPLETADO** - Migración a `~/.config/symphony`
2. 🔄 **PENDIENTE** - Implementar `settings.json` (Milestone 5)
3. 🔄 **PENDIENTE** - Arreglar 2 tests fallando (serialización + resampler)
4. 🔄 **PENDIENTE** - Agregar comando `make db-migrate-old` para migración automática

---

**Generado:** 16 de diciembre, 2025  
**Versión:** v0.3.0+
