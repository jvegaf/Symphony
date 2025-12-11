---
applyTo: "**/*.ts,**/*.tsx,**/*.rs,**/*.json"
description: "Mejores prácticas de seguridad para Symphony"
---

# Seguridad

## Datos Sensibles

### Nunca Commitear
- Claves API
- Credenciales de base de datos
- Tokens de autenticación
- Paths del usuario (hardcodeados)

### .gitignore
```
# Archivos de configuración local
.env
.env.local
.env.*.local

# Secretos Tauri
src-tauri/.cargo/credentials

# Build artifacts
dist/
target/

# IDE
.vscode/settings.json
.idea/workspace.xml

# OS
.DS_Store
Thumbs.db

# Dependencies
node_modules/
```

### Manejo de Configuración

```typescript
// ✓ Bien: Usar variables de entorno
const API_KEY = import.meta.env.VITE_API_KEY;
const DEBUG = import.meta.env.DEV;

// ✗ Evita: Hardcodear
const API_KEY = "sk_prod_1234567890";
```

```rust
// ✓ Bien: Cargar de archivo de config
let config = Config::from_file("config.local.toml")?;

// ✗ Evita: Hardcodear paths
let db_path = "/home/user/.symphony/db.sqlite";
```

## Validación de Entrada

### Frontend
```typescript
// Valida antes de enviar a Tauri
const importLibrary = async (path: string) => {
  // Validar formato de path
  if (!path || typeof path !== "string") {
    throw new Error("Path inválido");
  }
  
  // Evitar path traversal
  if (path.includes("..")) {
    throw new Error("Path traversal no permitido");
  }
  
  return invoke("import_library", { path });
};
```

### Backend (Rust)
```rust
use std::path::{Path, PathBuf};

fn validate_path(path: &str) -> Result<PathBuf, ValidationError> {
    let path = PathBuf::from(path);
    
    // Evitar path traversal
    if path.components().any(|c| {
        matches!(c, std::path::Component::ParentDir)
    }) {
        return Err(ValidationError::PathTraversal);
    }
    
    // Validar que existe y es carpeta
    if !path.exists() || !path.is_dir() {
        return Err(ValidationError::NotFound);
    }
    
    Ok(path.canonicalize()?)
}
```

## Control de Acceso

### Permisos de Archivo
- Base de datos: `0600` (solo propietario)
- Carpeta de config: `0700`
- Logs públicos: `0644`

```rust
use std::fs;
use std::os::unix::fs::PermissionsExt;

fn create_config_dir(path: &Path) -> Result<()> {
    fs::create_dir_all(path)?;
    
    // Solo propietario puede leer/escribir/ejecutar
    let permissions = fs::Permissions::from_mode(0o700);
    fs::set_permissions(path, permissions)?;
    
    Ok(())
}
```

### Sandbox Tauri
Symphony heredará sandbox de Tauri automáticamente:
- Procesos aislados
- Acceso a filesystem restringido
- Comunicación vía IPC

## Manejo de Archivos de Audio

### Validación de Formato
```rust
pub fn is_supported_format(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_lowercase())
            .as_deref(),
        Some("mp3" | "flac" | "wav" | "ogg" | "m4a" | "aac")
    )
}

pub fn validate_audio_file(path: &Path) -> Result<()> {
    // Validar extensión
    if !is_supported_format(path) {
        return Err(AudioError::UnsupportedFormat);
    }
    
    // Validar magic bytes del archivo
    let file = fs::File::open(path)?;
    let mut header = [0u8; 4];
    io::Read::read_exact(&mut &file, &mut header)?;
    
    match &header {
        b"ID3\x03" | b"ID3\x04" => {}, // MP3
        b"fLaC" => {},                  // FLAC
        b"RIFF" => {},                  // WAV
        b"OggS" => {},                  // OGG
        _ => return Err(AudioError::InvalidFormat),
    }
    
    Ok(())
}
```

## Sincronización Segura de Metadatos

### Race Conditions
```rust
use std::sync::Mutex;

pub struct LibraryState {
    // Protege acceso concurrente a metadatos
    metadata: Mutex<HashMap<String, TrackMetadata>>,
}

impl LibraryState {
    pub fn update_metadata(&self, id: &str, metadata: TrackMetadata) -> Result<()> {
        let mut data = self.metadata.lock().map_err(|_| "Envenenamiento de lock")?;
        data.insert(id.to_string(), metadata);
        Ok(())
    }
}
```

### Transacciones de Base de Datos
```rust
pub fn sync_tracks_atomic(
    conn: &Connection,
    tracks: &[Track],
) -> Result<(), DatabaseError> {
    let tx = conn.transaction()?;
    
    for track in tracks {
        insert_track(&tx, track)?;
        update_metadata(&tx, track)?;
    }
    
    tx.commit()?;
    Ok(())
}
```

## CORS y Comunicación

### Tauri (Seguro por Defecto)
Tauri usa IPC seguro nativo sin HTTP:

```typescript
// ✓ Bien: Tauri invoke (seguro)
const result = await invoke<Track>("get_track", { id: "123" });

// ✗ Evita: HTTP requests si no es necesario
// fetch("http://localhost:54321/api/tracks/123")
```

## Dependencias

### Auditoría Regular
```bash
# Auditar vulnerabilidades conocidas
npm audit
cargo audit

# Actualizar dependencias
npm update
cargo update
```

### Dependencias Sensibles
- `serde` - Parsing JSON
- `rusqlite` - Acceso a BD
- `symphonia` - Decodificación
- `tauri` - Sandbox

Actualiza estas frecuentemente.

## Logging Seguro

### No Loguear Información Sensible
```typescript
// ✓ Bien: Loguea lo necesario sin exponer paths
logger.info("Track imported", { trackId, artist });

// ✗ Evita: Expone rutas completas del usuario
console.log(`Imported from: ${fullPath}/music/file.mp3`);
```

```rust
// ✓ Bien: Datos generales
info!("Syncing {} tracks", count);

// ✗ Evita: Paths completos
info!("Syncing from: {:?}", user_path);
```

## Build Security

### GitHub Actions

```yaml
# .github/workflows/build.yml
- name: Build
  run: npm run build
  env:
    # No expongas secretos en logs
    CI: true
    
# Usa GitHub Secrets para sensibles
- name: Deploy
  uses: actions/deploy-pages@v2
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Checklist Pre-Deploy

- [ ] Sin `console.log` de datos sensibles
- [ ] Sin hardcoded API keys o paths
- [ ] Validación de input en frontend y backend
- [ ] Base de datos con permisos restrictivos (0600)
- [ ] Transacciones para operaciones críticas
- [ ] Error handling sin exponer detalles internos
- [ ] npm audit y cargo audit clean
- [ ] Dependencias actualizadas
- [ ] .gitignore completo y correcto

---

*Referencia: Seguridad en Symphony*
