use lofty::tag::{Accessor, ItemKey, Tag};
use std::path::Path;

/// Obtiene el título del tag o del filename como fallback
/// Replica el comportamiento de _get_title() en Python
///
/// AIDEV-NOTE: Si el tag tiene título y no está vacío, se usa.
/// Si no, se usa el filename sin extensión como fallback.
pub fn get_title(path: &Path, tag: &Tag) -> Option<String> {
    tag.title()
        .as_deref()
        .filter(|t| !t.is_empty())
        .map(String::from)
        .or_else(|| get_title_from_filename(path))
}

/// Extrae título del nombre del archivo (fallback cuando no hay tag)
/// Replica el comportamiento de _get_title() en Python
///
/// Convierte "Song Name.mp3" -> "Song Name"
pub fn get_title_from_filename(path: &Path) -> Option<String> {
    path.file_stem()
        .and_then(|name| name.to_str())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
}

/// Obtiene el artista del tag
/// Replica el comportamiento de extracción en Python
///
/// AIDEV-NOTE: Si no hay artista en el tag, retorna None (no "Unknown")
/// El frontend puede decidir cómo mostrar artistas vacíos
pub fn get_artist(tag: &Tag) -> Option<String> {
    tag.artist()
        .as_deref()
        .filter(|a| !a.is_empty())
        .map(String::from)
}

/// Extrae año del tag TDRC (ID3v2.4) o TYER (ID3v2.3)
/// Replica el comportamiento de _get_year() en Python
pub fn get_year(tag: &Tag) -> Option<i32> {
    tag.year()
        .and_then(|y| if y > 0 { Some(y as i32) } else { None })
}

/// Extrae BPM del tag TBPM (ID3v2) o tmpo (MP4)
/// Replica el comportamiento de _get_bpm() en Python
pub fn get_bpm(tag: &Tag) -> Option<i32> {
    // Buscar en items del tag por clave "BPM" o "TBPM"
    if let Some(bpm_str) = tag.get_string(&ItemKey::Bpm) {
        if let Ok(bpm) = bpm_str.parse::<i32>() {
            if bpm > 0 {
                return Some(bpm);
            }
        }
    }
    None
}

/// Extrae tonalidad musical del tag TKEY (ID3v2) o clave (MP4)
/// Replica el comportamiento de _get_key() en Python
pub fn get_key(tag: &Tag) -> Option<String> {
    tag.get_string(&ItemKey::InitialKey).map(|s| s.to_string())
}

/// Extrae rating del tag POPM (Popularimeter en ID3v2)
/// Replica el comportamiento de _get_rating() en Python
///
/// AIDEV-NOTE: Algoritmo compatible con Traktor Native Instruments
/// POPM rating en ID3v2 está en rango 0-255, lo convertimos a 0-5 estrellas
/// Usa round() para evitar inconsistencia del algoritmo antiguo de Python
/// Algoritmo correcto: Math.round((popm / 255) * 5)
/// Ver RATING_IMPLEMENTATION.md para detalles completos
///
/// Extrae rating de un archivo MP3 usando id3 crate
///
/// AIDEV-NOTE: Reemplaza get_rating_from_id3v2() porque lofty no expone frames POPM correctamente
/// Ver test_debug_popm_frames_in_test_mp3() para evidencia diagnóstica
pub fn get_rating_from_mp3_file(path: &Path) -> Option<i32> {
    // Intentar leer tag ID3 del archivo
    let tag = id3::Tag::read_from_path(path).ok()?;

    // Buscar frame POPM (Popularimeter)
    for frame in tag.frames() {
        if frame.id() == "POPM" {
            if let id3::Content::Popularimeter(popm) = frame.content() {
                // Convertir de 0-255 (POPM) a 0-5 (estrellas) usando round
                let stars = ((popm.rating as f32 / 255.0) * 5.0).round() as i32;
                return Some(stars.clamp(0, 5));
            }
        }
    }

    None
}

/// Determina el tipo de tag preferido para un tipo de archivo
pub fn get_preferred_tag_type(file_type: lofty::file::FileType) -> lofty::tag::TagType {
    use lofty::file::FileType;
    use lofty::tag::TagType;
    
    match file_type {
        FileType::Mpeg => TagType::Id3v2,
        FileType::Mp4 => TagType::Mp4Ilst,
        FileType::Flac => TagType::VorbisComments,
        FileType::Opus => TagType::VorbisComments,
        FileType::Vorbis => TagType::VorbisComments,
        FileType::Wav => TagType::RiffInfo,
        _ => TagType::Id3v2, // Fallback
    }
}
