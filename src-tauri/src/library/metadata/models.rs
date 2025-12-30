/// Metadatos extraídos de un archivo de audio
///
/// AIDEV-NOTE: Esta estructura replica los campos que extraíamos en Python con mutagen/TinyTag
/// Soporta lectura y escritura de tags ID3v2 (MP3), MP4 (M4A), Vorbis, APE, etc.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackMetadata {
    /// Ruta completa del archivo
    pub path: String,

    /// Título de la pista
    pub title: Option<String>,

    /// Artista
    pub artist: Option<String>,

    /// Álbum
    pub album: Option<String>,

    /// Año de lanzamiento
    pub year: Option<i32>,

    /// Género musical
    pub genre: Option<String>,

    /// BPM (beats por minuto) - extraído de tag TBPM/tmpo
    pub bpm: Option<i32>,

    /// Tonalidad musical (Initial Key) - extraído de tag TKEY/key
    pub key: Option<String>,

    /// Rating/Popularidad (0-5 estrellas, se convierte a/desde POPM 0-255)
    pub rating: Option<i32>,

    /// Comentarios
    pub comment: Option<String>,

    /// Duración en segundos
    pub duration: f64,

    /// Bitrate en kbps
    pub bitrate: i32,

    /// Sample rate en Hz
    pub sample_rate: u32,

    /// Número de canales
    pub channels: u16,

    /// Formato de audio (mp3, flac, wav, etc.)
    pub format: String,

    /// Artwork (imagen de portada) en base64
    pub artwork: Option<String>,
}
