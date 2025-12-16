# Database Management - Gestión de Base de Datos

Este documento describe los comandos disponibles para gestionar la base de datos de Symphony.

## 📍 Ubicaciones de la Base de Datos

Symphony utiliza **dos ubicaciones** para la base de datos SQLite:

1. **Desarrollo**: `src-tauri/symphony.db` - Usada durante desarrollo (`make dev`)
2. **Producción**: `~/.local/share/symphony/symphony.db` - Usada en builds de producción

## 🛠️ Comandos Disponibles

### Información

```bash
make db-info
```
Muestra información sobre todas las bases de datos:
- Ubicación y tamaño de DB de desarrollo
- Ubicación y tamaño de DB de usuario
- Lista de backups disponibles

**Ejemplo de salida:**
```
=== Base de datos - Información ===

Desarrollo (src-tauri/symphony.db):
  Tamaño: 12K
  Modificado: 2025-12-16 04:30:15

Usuario (~/.local/share/symphony/symphony.db):
  Tamaño: 24K
  Modificado: 2025-12-16 03:15:42

Backups (backups/):
  backups/symphony_20251216_043225.db - 24K
  backups/symphony_20251215_120000.db - 20K
```

---

### Limpieza Selectiva

#### Limpiar solo DB de desarrollo
```bash
make db-clean
```
- ✅ Elimina: `src-tauri/symphony.db`
- ❌ No afecta: DB del usuario
- **Uso**: Reiniciar desarrollo desde cero

#### Limpiar solo DB del usuario
```bash
make db-clean-user
```
- ✅ Elimina: `~/.local/share/symphony/symphony.db`
- ✅ Elimina: `~/.local/share/symphony/symphony.log`
- ❌ No afecta: DB de desarrollo
- **Uso**: Limpiar datos de prueba en build de producción

#### Limpiar TODAS las bases de datos
```bash
make db-clean-all
```
- ⚠️ **CUIDADO**: Pide confirmación (y/N)
- ✅ Elimina: DB de desarrollo
- ✅ Elimina: DB del usuario + logs
- **Uso**: Reset completo del sistema

---

### Backups y Restauración

#### Crear backup
```bash
make db-backup
```
- Crea backup de la DB del usuario en `backups/symphony_YYYYMMDD_HHMMSS.db`
- Solo hace backup si existe DB del usuario
- Crea directorio `backups/` automáticamente

**Ejemplo:**
```bash
$ make db-backup
Creando backup de base de datos...
✓ Backup creado: backups/symphony_20251216_043225.db
```

#### Restaurar último backup
```bash
make db-restore
```
- Restaura el backup **más reciente** automáticamente
- Sobrescribe la DB del usuario actual
- Muestra el archivo restaurado

**Ejemplo:**
```bash
$ make db-restore
Restaurando último backup...
✓ Base de datos restaurada desde: backups/symphony_20251216_043225.db
```

---

### Migraciones

```bash
make db-migrate
```
Ejecuta las migraciones de base de datos (si existen).

---

### Alias

```bash
make db-reset
```
**Alias de** `make db-clean-all` - Mantiene compatibilidad con versiones anteriores.

---

## 🔄 Flujos de Trabajo Comunes

### Reiniciar desarrollo desde cero
```bash
make db-clean          # Elimina solo DB de desarrollo
make dev               # La DB se recrea automáticamente
```

### Probar con datos limpios en producción
```bash
make db-backup         # Primero hacer backup por seguridad
make db-clean-user     # Limpiar DB del usuario
make build             # Rebuild
./src-tauri/target/release/symphony  # Ejecutar
```

### Recuperar después de error
```bash
make db-backup         # Siempre hacer backup antes de probar
# ... hacer cambios/pruebas ...
make db-restore        # Si algo sale mal, restaurar
```

### Reset completo del sistema
```bash
make db-backup         # Backup de seguridad
make db-clean-all      # Limpieza total (requiere confirmación)
make dev               # Reiniciar
```

---

## ⚙️ Integración con .gitignore

El directorio `backups/` está excluido en `.gitignore` para evitar commitear bases de datos locales:

```gitignore
# Database backups
backups/
```

---

## 🔍 Troubleshooting

### No se encuentran backups
```bash
$ make db-restore
Restaurando último backup...
⚠ No se encontraron backups
```

**Solución**: Ejecutar `make db-backup` primero.

### Base de datos no existe
```bash
$ make db-clean
Limpiando base de datos de desarrollo...
⚠ No existe base de datos de desarrollo
```

**Esto es normal** si nunca has ejecutado `make dev` o si ya fue limpiada.

### Error al restaurar
Si `make db-restore` falla, puedes restaurar manualmente:
```bash
ls -lh backups/             # Ver backups disponibles
cp backups/symphony_YYYYMMDD_HHMMSS.db ~/.local/share/symphony/symphony.db
```

---

## 📝 Notas Importantes

1. **Backups son locales**: No se sincronizan con git
2. **DB se recrea automáticamente**: Al ejecutar `make dev` o builds, si no existe DB se crea vacía
3. **Confirmación requerida**: `db-clean-all` pide confirmación para evitar pérdidas accidentales
4. **Logs también se limpian**: `db-clean-user` elimina tanto DB como logs del usuario

---

## 🎯 Quick Reference

| Comando | Descripción | Requiere confirmación |
|---------|-------------|----------------------|
| `make db-info` | Ver estado de todas las DBs | ❌ |
| `make db-clean` | Limpiar DB desarrollo | ❌ |
| `make db-clean-user` | Limpiar DB usuario | ❌ |
| `make db-clean-all` | Limpiar TODAS las DBs | ✅ Sí |
| `make db-backup` | Crear backup | ❌ |
| `make db-restore` | Restaurar último backup | ❌ |
| `make db-migrate` | Ejecutar migraciones | ❌ |
| `make db-reset` | Alias de db-clean-all | ✅ Sí |

---

**Última actualización**: 2025-12-16  
**Versión**: Symphony v0.2.0
