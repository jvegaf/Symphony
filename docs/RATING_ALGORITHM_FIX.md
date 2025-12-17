# Fix: Rating Algorithm Inconsistency

## Problema Detectado

El algoritmo antiguo de Python tenía una **inconsistencia** entre lectura y escritura:

```python
# ESCRITURA (Python antiguo)
def _stars_to_rating(stars: int) -> int:
    return min(max(stars, 0), 5) * 51
# 1 estrella → 51 POPM ✅

# LECTURA (Python antiguo)
def _rating_to_stars(rating_raw: int) -> int:
    if rating_raw < 1: return 0
    if rating_raw < 51: return 1    # 1-50
    if rating_raw < 102: return 2   # 51-101 ⚠️
#   ^^^^^^^^^^^^
# 51 POPM → 2 estrellas ❌ (debería ser 1!)
```

**Problema**: Escribir 1 estrella genera 51 POPM, pero leer 51 POPM devuelve 2 estrellas.

## Solución Implementada

Usar el **algoritmo de Traktor/TypeScript** con `round()` que es consistente:

```rust
// ESCRITURA (Rust nuevo)
let popm_value = ((rating_stars as f32 / 5.0) * 255.0).round() as u8;
// 0→0, 1→51, 2→102, 3→153, 4→204, 5→255

// LECTURA (Rust nuevo)
let stars = ((popm_rating as f32 / 255.0) * 5.0).round() as i32;
// 0→0, 51→1, 102→2, 153→3, 204→4, 255→5
```

### Test de Roundtrip

```rust
#[test]
fn test_rating_roundtrip() {
    for stars in 0..=5 {
        let popm = ((stars as f32 / 5.0) * 255.0).round() as i32;
        let stars_back = ((popm as f32 / 255.0) * 5.0).round() as i32;
        assert_eq!(stars, stars_back); // ✅ Todos pasan
    }
}
```

## Tabla de Conversión Final

| Estrellas | POPM (escritura) | POPM (lectura) | Roundtrip |
|-----------|------------------|----------------|-----------|
| 0         | 0                | 0-25           | ✅ 0      |
| 1         | 51               | 26-76          | ✅ 1      |
| 2         | 102              | 77-127         | ✅ 2      |
| 3         | 153              | 128-178        | ✅ 3      |
| 4         | 204              | 179-229        | ✅ 4      |
| 5         | 255              | 230-255        | ✅ 5      |

## Compatibilidad

- ✅ **Traktor Pro**: 100% compatible (usa el mismo algoritmo round)
- ✅ **TypeScript/Electron** (versión antigua): Compatible
- ⚠️ **Python antiguo**: Tenía bug, ahora corregido en Rust
- ✅ **Frontend**: Transparente, sigue usando 0-5 estrellas

## Tests Implementados

1. **test_rating_conversion_stars_to_popm**: Verifica escritura
2. **test_rating_conversion_popm_to_stars**: Verifica lectura
3. **test_rating_roundtrip**: Verifica ida y vuelta (idempotencia)

Todos pasan exitosamente.
