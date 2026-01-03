use chrono::NaiveDate;
use regex::Regex;
use std::path::Path;

/// Extrae una fecha en formato YYYY-MM desde un path que contiene carpetas YYMM
///
/// Busca patrones de 4 dígitos consecutivos (YYMM) en el path y los convierte a YYYY-MM.
/// Asume que YY >= 00 corresponde a años 2000-2099.
///
/// # Ejemplos
/// ```
/// use std::path::Path;
/// use symphony_lib::utils::extract_date_from_path;
///
/// let path = Path::new("/home/user/music/2401/Artist/Track.mp3");
/// assert_eq!(extract_date_from_path(path), Some("2024-01".to_string()));
///
/// let path2 = Path::new("/music/2512/file.mp3");
/// assert_eq!(extract_date_from_path(path2), Some("2025-12".to_string()));
/// ```
pub fn extract_date_from_path(path: &Path) -> Option<String> {
    // Regex para encontrar carpetas con formato YYMM (4 dígitos consecutivos)
    let re = Regex::new(r"\b(\d{2})(\d{2})\b").ok()?;

    let path_str = path.to_str()?;

    // Buscar el primer match
    let captures = re.captures(path_str)?;

    // Extraer YY y MM
    let yy: u32 = captures.get(1)?.as_str().parse().ok()?;
    let mm: u32 = captures.get(2)?.as_str().parse().ok()?;

    // Validar que el mes esté en rango 01-12
    if !(1..=12).contains(&mm) {
        return None;
    }

    // Convertir YY a YYYY (asumimos 2000-2099)
    let year = 2000 + yy;

    // Validar que la fecha sea razonable (no futuro lejano)
    if year > 2099 {
        return None;
    }

    // Construir fecha YYYY-MM
    Some(format!("{:04}-{:02}", year, mm))
}

/// Extrae una fecha completa YYYY-MM-DD desde un path si tiene formato YYMMDD
///
/// Similar a extract_date_from_path pero para paths con día incluido.
///
/// # Ejemplos
/// ```
/// use std::path::Path;
/// use symphony_lib::utils::extract_full_date_from_path;
///
/// let path = Path::new("/home/user/music/240125/Track.mp3");
/// assert_eq!(extract_full_date_from_path(path), Some("2024-01-25".to_string()));
/// ```
pub fn extract_full_date_from_path(path: &Path) -> Option<String> {
    let re = Regex::new(r"\b(\d{2})(\d{2})(\d{2})\b").ok()?;

    let path_str = path.to_str()?;

    let captures = re.captures(path_str)?;

    let yy: u32 = captures.get(1)?.as_str().parse().ok()?;
    let mm: u32 = captures.get(2)?.as_str().parse().ok()?;
    let dd: u32 = captures.get(3)?.as_str().parse().ok()?;

    // Validar mes y día
    if !(1..=12).contains(&mm) || !(1..=31).contains(&dd) {
        return None;
    }

    let year = 2000 + yy;

    // Validar que la fecha sea válida usando chrono
    NaiveDate::from_ymd_opt(year as i32, mm, dd)?;

    Some(format!("{:04}-{:02}-{:02}", year, mm, dd))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_extract_date_from_path_simple() {
        let path = PathBuf::from("/home/user/music/2401/Artist/Track.mp3");
        assert_eq!(
            extract_date_from_path(&path),
            Some("2024-01".to_string()),
            "Debe extraer enero 2024 desde carpeta 2401"
        );
    }

    #[test]
    fn test_extract_date_from_path_december() {
        let path = PathBuf::from("/music/2512/Album/song.flac");
        assert_eq!(
            extract_date_from_path(&path),
            Some("2025-12".to_string()),
            "Debe extraer diciembre 2025 desde carpeta 2512"
        );
    }

    #[test]
    fn test_extract_date_from_path_year_2000() {
        let path = PathBuf::from("/data/0006/file.mp3");
        assert_eq!(
            extract_date_from_path(&path),
            Some("2000-06".to_string()),
            "Debe interpretar 00 como año 2000"
        );
    }

    #[test]
    fn test_extract_date_from_path_invalid_month() {
        let path = PathBuf::from("/music/2413/track.mp3");
        assert_eq!(
            extract_date_from_path(&path),
            None,
            "Debe retornar None para mes inválido (13)"
        );
    }

    #[test]
    fn test_extract_date_from_path_invalid_month_zero() {
        let path = PathBuf::from("/music/2400/track.mp3");
        assert_eq!(
            extract_date_from_path(&path),
            None,
            "Debe retornar None para mes 00"
        );
    }

    #[test]
    fn test_extract_date_from_path_no_pattern() {
        let path = PathBuf::from("/home/user/music/Artist/Album/Track.mp3");
        assert_eq!(
            extract_date_from_path(&path),
            None,
            "Debe retornar None si no hay patrón YYMM"
        );
    }

    #[test]
    fn test_extract_date_from_path_multiple_patterns() {
        // Debe tomar el primer patrón válido
        let path = PathBuf::from("/music/2401/subfolder/2505/track.mp3");
        assert_eq!(
            extract_date_from_path(&path),
            Some("2024-01".to_string()),
            "Debe tomar el primer patrón YYMM encontrado"
        );
    }

    #[test]
    fn test_extract_date_from_path_nested() {
        let path = PathBuf::from("/mnt/storage/library/2310/Electronic/Artist - Track.mp3");
        assert_eq!(
            extract_date_from_path(&path),
            Some("2023-10".to_string()),
            "Debe funcionar con paths anidados"
        );
    }

    #[test]
    fn test_extract_full_date_from_path_valid() {
        let path = PathBuf::from("/music/240125/track.mp3");
        assert_eq!(
            extract_full_date_from_path(&path),
            Some("2024-01-25".to_string()),
            "Debe extraer fecha completa YYMMDD"
        );
    }

    #[test]
    fn test_extract_full_date_from_path_invalid_day() {
        let path = PathBuf::from("/music/240132/track.mp3");
        assert_eq!(
            extract_full_date_from_path(&path),
            None,
            "Debe retornar None para día inválido (32)"
        );
    }

    #[test]
    fn test_extract_full_date_from_path_february_29_non_leap() {
        let path = PathBuf::from("/music/230229/track.mp3");
        assert_eq!(
            extract_full_date_from_path(&path),
            None,
            "Debe retornar None para 29 de febrero en año no bisiesto (2023)"
        );
    }

    #[test]
    fn test_extract_full_date_from_path_february_29_leap() {
        let path = PathBuf::from("/music/240229/track.mp3");
        assert_eq!(
            extract_full_date_from_path(&path),
            Some("2024-02-29".to_string()),
            "Debe aceptar 29 de febrero en año bisiesto (2024)"
        );
    }
}
