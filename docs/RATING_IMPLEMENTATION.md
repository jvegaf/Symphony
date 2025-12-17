# Rating Implementation - Compatibilidad Traktor

## Resumen

Symphony implementa el mismo algoritmo de rating que Traktor Native Instruments para garantizar compatibilidad total con librerías existentes.

## Formato de Almacenamiento

### Base de Datos (SQLite)
- **Campo**: `tracks.rating`
- **Tipo**: `INTEGER NULL`
- **Rango**: 0-5 (estrellas)
- **Validación**: Se valida en `update_track_metadata()` que esté entre 0-5

### Tags ID3v2 (POPM Frame)
- **Frame**: `POPM` (Popularimeter)
- **Email**: `traktor@native-instruments.de`
- **Rating**: 0-255 (byte único)
- **Counter**: 0 (4 bytes, siempre en 0)

## Algoritmo de Conversión

### Escritura (Estrellas → POPM)
```rust
// Rust implementation
let popm_value = ((rating_stars as f32 / 5.0) * 255.0).round() as u8;
```

```typescript
// TypeScript original (Node.js/Electron)
const mappedRating = Math.round((rating / 5) * 255);
```

**Tabla de conversión**:
| Estrellas | POPM Value |
|-----------|------------|
| 0         | 0          |
| 1         | 51         |
| 2         | 102        |
| 3         | 153        |
| 4         | 204        |
| 5         | 255        |

### Lectura (POPM → Estrellas)
```rust
// Rust implementation
let stars = ((popm_rating as f32 / 255.0) * 5.0).round() as i32;
```

**Rango clamped**: El resultado se asegura que esté entre 0-5 usando `.clamp(0, 5)`

## Estructura del Frame POPM

```
[email bytes...] [0x00] [rating] [counter (4 bytes)]
```

### Ejemplo real:
```
traktor@native-instruments.de\0\xCC\x00\x00\x00\x00
└─────────────────┬────────────┘ │  │  └──┬───────┘
              Email (33 bytes)   │  │     Counter (0)
                          Null term  Rating (204 = 4★)
```

## Implementación en Código

### Extracción (metadata.rs)
```rust
fn get_rating_from_id3v2(tagged_file: &TaggedFile) -> Option<i32> {
    // Busca frame POPM en tags ID3v2
    // Extrae byte de rating después del null-terminator del email
    // Convierte 0-255 → 0-5
}
```

### Escritura (metadata.rs)
```rust
fn write_rating_to_id3v2(tagged_file: &mut TaggedFile, rating_stars: i32) -> Result<()> {
    // Valida rango 0-5
    // Convierte 0-5 → 0-255
    // Construye frame POPM con email de Traktor
    // Elimina POPM existentes
    // Inserta nuevo POPM
}
```

### Actualización desde Frontend (commands/library.rs)
```rust
#[tauri::command]
pub async fn update_track_metadata(request: UpdateTrackMetadataRequest) -> Result<(), String> {
    // 1. Actualiza DB con rating (0-5)
    // 2. Escribe tags físicamente al archivo MP3
    // 3. MetadataExtractor convierte automáticamente a POPM
}
```

## Compatibilidad

### Formatos Soportados
- **MP3 (ID3v2)**: ✅ Completo (lectura + escritura)
- **FLAC**: ❌ No soportado (usa otros mecanismos)
- **M4A/MP4**: ❌ No soportado (usa rating atoms diferentes)
- **WAV**: ❌ No tiene tags estándar para rating

### Software Compatible
- ✅ Traktor Pro (Native Instruments)
- ✅ MixVibes Cross DJ
- ✅ Virtual DJ (parcial, depende de config)
- ✅ Rekordbox (solo lectura si usa mismo email)

## Testing

### Test Manual
```bash
# 1. Importar track con rating existente
make dev

# 2. Verificar lectura de POPM
sqlite3 ~/.config/symphony/symphony.db "SELECT title, rating FROM tracks WHERE rating IS NOT NULL;"

# 3. Actualizar rating desde UI
# (Usar componente de estrellas en TrackList)

# 4. Verificar escritura a archivo
exiftool -POPM path/to/track.mp3
# Debe mostrar: traktor@native-instruments.de, rating=<valor>, counter=0
```

### Unit Tests
```bash
cd src-tauri
cargo test library::metadata::tests::test_track_metadata_serialization -- --nocapture
```

## Frontend Integration

El frontend debe:
1. Mostrar rating como estrellas (0-5)
2. Enviar valores 0-5 al backend
3. **NO** hacer conversión a POPM (el backend lo maneja)

```typescript
// ❌ INCORRECTO
const popmValue = Math.round((rating / 5) * 255);
await invoke('update_track_metadata', { rating: popmValue });

// ✅ CORRECTO
await invoke('update_track_metadata', { rating: stars }); // 0-5 directo
```

## Limitaciones Conocidas

1. **Solo MP3**: Otros formatos ignoran silenciosamente el rating
2. **Email fijo**: Siempre usa `traktor@native-instruments.de`, no lee otros emails POPM
3. **Counter ignorado**: Siempre se escribe como 0 (no se usa play count del POPM)
4. **Un solo rating**: Si el archivo tiene múltiples frames POPM con diferentes emails, solo se lee el primero encontrado

## Migración desde Versión Anterior

Si tenías ratings almacenados como 0-255 en DB:

```sql
-- Convertir ratings de POPM (0-255) a estrellas (0-5)
UPDATE tracks SET rating = ROUND((CAST(rating AS REAL) / 255.0) * 5.0) WHERE rating IS NOT NULL;
```

## Referencias

- ID3v2.3 Spec: https://id3.org/id3v2.3.0#Popularimeter
- Lofty Crate: https://docs.rs/lofty/latest/lofty/
- Traktor POPM Format: Reverse-engineered from Traktor Pro 3.x
