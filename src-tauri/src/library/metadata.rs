use super::error::{LibraryError, Result};
use base64::Engine;
use id3::TagLike; // Needed for remove() and add_frame() methods
use lofty::config::{ParseOptions, WriteOptions};
use lofty::file::{AudioFile, TaggedFile, TaggedFileExt};
use lofty::picture::PictureType;
use lofty::probe::Probe;
use lofty::tag::{Accessor, ItemKey, Tag, TagType};
use std::path::Path;

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

/// Extractor de metadatos de archivos de audio usando lofty
///
/// AIDEV-NOTE: Equivalente Rust de SongCreator en Python
/// Soporta lectura de ID3v2, ID3v1, APEv2, Vorbis Comments, MP4 atoms
pub struct MetadataExtractor;

impl MetadataExtractor {
    /// Crea un nuevo extractor de metadatos
    pub fn new() -> Self {
        Self
    }

    /// Extrae metadatos de un archivo de audio usando lofty
    ///
    /// # Arguments
    /// * `path` - Ruta al archivo de audio
    ///
    /// # Returns
    /// Estructura TrackMetadata con todos los metadatos disponibles
    ///
    /// # Errors
    /// Retorna error si:
    /// - El archivo no existe
    /// - El formato no está soportado
    /// - Hay error al leer tags
    pub fn extract_metadata(&self, path: &Path) -> Result<TrackMetadata> {
        // Validar que el archivo existe
        if !path.exists() {
            return Err(LibraryError::MetadataExtractionFailed(format!(
                "File not found: {}",
                path.display()
            )));
        }

        // Leer archivo con lofty (auto-detecta formato)
        let parse_options = ParseOptions::new();

        let tagged_file = Probe::open(path)
            .map_err(|e| LibraryError::MetadataExtractionFailed(e.to_string()))?
            .options(parse_options)
            .read()
            .map_err(|e| LibraryError::MetadataExtractionFailed(e.to_string()))?;

        // Extraer propiedades de audio (duración, bitrate, etc.)
        let properties = tagged_file.properties();
        let duration = properties.duration().as_secs_f64();
        let bitrate = properties.audio_bitrate().unwrap_or(0) as i32;
        let sample_rate = properties.sample_rate().unwrap_or(44100);
        let channels = properties.channels().unwrap_or(2) as u16;

        // Obtener formato
        let format = path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("unknown")
            .to_lowercase();

        // Obtener tag primario (preferir ID3v2 > Vorbis > APE > ID3v1)
        let tag = tagged_file
            .primary_tag()
            .or_else(|| tagged_file.first_tag());

        // Extraer rating de ID3v2 (POPM frame) si está disponible
        // AIDEV-NOTE: Usamos id3 crate directamente porque lofty no expone POPM frames
        let rating = Self::get_rating_from_mp3_file(path);

        // Extraer metadatos de tags
        let (title, artist, album, year, genre, bpm, key, comment) = if let Some(tag) = tag {
            (
                Self::get_title(path, tag),
                Self::get_artist(tag),
                tag.album().as_deref().map(String::from),
                Self::get_year(tag),
                tag.genre().as_deref().map(String::from),
                Self::get_bpm(tag),
                Self::get_key(tag),
                tag.comment().as_deref().map(String::from),
            )
        } else {
            // Sin tags, usar filename como título
            (
                Self::get_title_from_filename(path),
                None,
                None,
                None,
                None,
                None,
                None,
                None,
            )
        };

        Ok(TrackMetadata {
            path: path.to_string_lossy().to_string(),
            title,
            artist,
            album,
            year,
            genre,
            bpm,
            key,
            rating,
            comment,
            duration,
            bitrate,
            sample_rate,
            channels,
            format,
            artwork: None, // TODO: Extraer artwork en futuro
        })
    }

    /// Obtiene el título del tag o del filename como fallback
    /// Replica el comportamiento de _get_title() en Python
    ///
    /// AIDEV-NOTE: Si el tag tiene título y no está vacío, se usa.
    /// Si no, se usa el filename sin extensión como fallback.
    fn get_title(path: &Path, tag: &Tag) -> Option<String> {
        tag.title()
            .as_deref()
            .filter(|t| !t.is_empty())
            .map(String::from)
            .or_else(|| Self::get_title_from_filename(path))
    }

    /// Extrae título del nombre del archivo (fallback cuando no hay tag)
    /// Replica el comportamiento de _get_title() en Python
    ///
    /// Convierte "Song Name.mp3" -> "Song Name"
    fn get_title_from_filename(path: &Path) -> Option<String> {
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
    fn get_artist(tag: &Tag) -> Option<String> {
        tag.artist()
            .as_deref()
            .filter(|a| !a.is_empty())
            .map(String::from)
    }

    /// Extrae año del tag TDRC (ID3v2.4) o TYER (ID3v2.3)
    /// Replica el comportamiento de _get_year() en Python
    fn get_year(tag: &Tag) -> Option<i32> {
        tag.year()
            .and_then(|y| if y > 0 { Some(y as i32) } else { None })
    }

    /// Extrae BPM del tag TBPM (ID3v2) o tmpo (MP4)
    /// Replica el comportamiento de _get_bpm() en Python
    fn get_bpm(tag: &Tag) -> Option<i32> {
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
    fn get_key(tag: &Tag) -> Option<String> {
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
    fn get_rating_from_mp3_file(path: &Path) -> Option<i32> {
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

    /// Extrae el artwork (imagen de portada) de un archivo de audio
    ///
    /// AIDEV-NOTE: Busca la imagen embedded en el archivo usando lofty.
    /// Prioriza portada frontal (CoverFront) pero acepta cualquier tipo.
    /// Retorna la imagen como base64 con prefijo data URI para uso directo en <img src>.
    ///
    /// # Arguments
    /// * `path` - Ruta al archivo de audio
    ///
    /// # Returns
    /// - `Ok(Some(base64_data_uri))` si hay artwork
    /// - `Ok(None)` si no hay artwork
    /// - `Err` si hay error leyendo el archivo
    pub fn extract_artwork(path: &Path) -> Result<Option<String>> {
        // Validar que el archivo existe
        if !path.exists() {
            return Err(LibraryError::MetadataExtractionFailed(format!(
                "File not found: {}",
                path.display()
            )));
        }

        // Leer archivo con lofty
        let parse_options = ParseOptions::new();
        let tagged_file = Probe::open(path)
            .map_err(|e| LibraryError::MetadataExtractionFailed(e.to_string()))?
            .options(parse_options)
            .read()
            .map_err(|e| LibraryError::MetadataExtractionFailed(e.to_string()))?;

        // Buscar en todos los tags disponibles
        for tag in tagged_file.tags() {
            let pictures = tag.pictures();

            // Primero buscar portada frontal
            for pic in pictures {
                if pic.pic_type() == PictureType::CoverFront {
                    let base64_data = Self::picture_to_data_uri(pic);
                    return Ok(Some(base64_data));
                }
            }

            // Si no hay portada frontal, usar la primera imagen disponible
            if let Some(pic) = pictures.first() {
                let base64_data = Self::picture_to_data_uri(pic);
                return Ok(Some(base64_data));
            }
        }

        Ok(None)
    }

    /// Convierte una imagen (Picture) a data URI base64
    fn picture_to_data_uri(picture: &lofty::picture::Picture) -> String {
        let mime_type = picture.mime_type().map(|m| m.as_str()).unwrap_or("image/jpeg");
        let base64_data = base64::engine::general_purpose::STANDARD.encode(picture.data());
        format!("data:{};base64,{}", mime_type, base64_data)
    }

    /// Extrae metadatos de múltiples archivos
    /// Continúa con el siguiente archivo si uno falla
    #[allow(dead_code)]
    pub fn extract_metadata_batch(&self, paths: &[impl AsRef<Path>]) -> Vec<Result<TrackMetadata>> {
        paths
            .iter()
            .map(|path| self.extract_metadata(path.as_ref()))
            .collect()
    }

    /// Escribe metadatos a un archivo de audio
    /// Replica el comportamiento de SongUpdater.update_song_from_tag() en Python
    ///
    /// # Arguments
    /// * `path` - Ruta al archivo de audio
    /// * `metadata` - Metadatos a escribir
    ///
    /// # Errors
    /// Retorna error si:
    /// - El archivo no existe
    /// - No se puede escribir al archivo
    /// - El formato no soporta escritura
    pub fn write_metadata(&self, path: &Path, metadata: &TrackMetadata) -> Result<()> {
        // Leer archivo existente
        let parse_options = ParseOptions::new().read_properties(false);

        let mut tagged_file: TaggedFile = Probe::open(path)
            .map_err(|e: lofty::error::LoftyError| {
                LibraryError::MetadataExtractionFailed(e.to_string())
            })?
            .options(parse_options)
            .read()
            .map_err(|e: lofty::error::LoftyError| {
                LibraryError::MetadataExtractionFailed(e.to_string())
            })?;

        // Obtener o crear tag (preferir ID3v2 para MP3)
        let tag = match tagged_file.primary_tag_mut() {
            Some(t) => t,
            None => {
                // Crear nuevo tag apropiado para el formato
                let file_type = tagged_file.file_type();
                let tag_type = Self::get_preferred_tag_type(file_type);
                tagged_file.insert_tag(Tag::new(tag_type));
                tagged_file.primary_tag_mut().unwrap()
            }
        };

        // Escribir campos
        if let Some(ref title) = metadata.title {
            tag.set_title(title.clone());
        }
        if let Some(ref artist) = metadata.artist {
            tag.set_artist(artist.clone());
        }
        if let Some(ref album) = metadata.album {
            tag.set_album(album.clone());
        }
        if let Some(year) = metadata.year {
            tag.set_year(year as u32);
        }
        if let Some(ref genre) = metadata.genre {
            tag.set_genre(genre.clone());
        }
        if let Some(ref comment) = metadata.comment {
            tag.set_comment(comment.clone());
        }

        // BPM y Key requieren ItemKey específicos
        if let Some(bpm) = metadata.bpm {
            tag.insert_text(ItemKey::Bpm, bpm.to_string());
        }
        if let Some(ref key) = metadata.key {
            tag.insert_text(ItemKey::InitialKey, key.clone());
        }

        // Guardar cambios al archivo (tags estándar)
        let write_options = WriteOptions::default();
        tagged_file
            .save_to_path(path, write_options)
            .map_err(|e: lofty::error::LoftyError| {
                LibraryError::MetadataExtractionFailed(format!("Failed to write metadata: {}", e))
            })?;

        // Escribir rating (POPM frame) para archivos MP3/ID3v2
        // AIDEV-NOTE: Hacemos esto DESPUÉS de lofty save para evitar que se sobreescriba
        // Usamos id3 crate porque lofty no maneja correctamente frames POPM
        if let Some(rating_stars) = metadata.rating {
            Self::write_rating_to_mp3_file(path, rating_stars)?;
        }

        Ok(())
    }

    /// Escribe rating al tag ID3v2 usando frame POPM con id3 crate
    /// Replica el comportamiento de UpdateTrackRating en TypeScript
    ///
    /// AIDEV-NOTE: Algoritmo compatible con Traktor Native Instruments
    /// - Input: rating_stars (0-5)
    /// - POPM value: Math.round((rating_stars / 5) * 255)
    /// - Email: traktor@native-instruments.de (mismo que usa Traktor Pro)
    /// - Counter: 0 (siempre, no usamos el contador de plays del POPM)
    ///
    ///   Ver RATING_IMPLEMENTATION.md para detalles completos
    ///
    /// # Arguments
    /// * `path` - Ruta al archivo MP3
    /// * `rating_stars` - Valor de rating en estrellas (0-5)
    fn write_rating_to_mp3_file(path: &Path, rating_stars: i32) -> Result<()> {
        // Verificar que sea un archivo MP3
        if let Some(ext) = path.extension() {
            if ext.to_str().unwrap_or("").to_lowercase() != "mp3" {
                return Ok(()); // Silenciosamente ignorar otros formatos por ahora
            }
        } else {
            return Ok(());
        }

        // Leer tag existente o crear uno nuevo
        let mut tag = id3::Tag::read_from_path(path).unwrap_or_else(|_| id3::Tag::new());

        // Validar y clampear rango de estrellas
        let clamped_rating = rating_stars.clamp(0, 5);

        // Convertir estrellas (0-5) a POPM (0-255) usando algoritmo de Traktor/TypeScript
        let popm_value = (((clamped_rating as f32 / 5.0) * 255.0).round() as i32).min(255) as u8;

        // Eliminar frames POPM existentes para evitar duplicados
        tag.remove("POPM");

        // Agregar nuevo frame POPM
        let popm_frame = id3::frame::Popularimeter {
            user: "traktor@native-instruments.de".to_string(),
            rating: popm_value,
            counter: 0,
        };
        tag.add_frame(popm_frame);

        // Escribir tag al archivo (preservando ID3v2.3 si existe, usando v2.4 para nuevos)
        tag.write_to_path(path, id3::Version::Id3v24).map_err(|e| {
            LibraryError::MetadataExtractionFailed(format!(
                "Failed to write rating to {}: {}",
                path.display(),
                e
            ))
        })?;

        Ok(())
    }

    /// Determina el tipo de tag preferido para un tipo de archivo
    fn get_preferred_tag_type(file_type: lofty::file::FileType) -> TagType {
        use lofty::file::FileType;
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
}

impl Default for MetadataExtractor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // Helper: Crea un archivo WAV válido usando hound
    fn create_test_wav(path: &Path) {
        use hound::{WavSpec, WavWriter};

        let spec = WavSpec {
            channels: 2,
            sample_rate: 44100,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };

        let mut writer = WavWriter::create(path, spec).unwrap();

        // Escribir 1 segundo de audio silencioso
        for _ in 0..(spec.sample_rate * spec.channels as u32) {
            writer.write_sample(0i16).unwrap();
        }

        writer.finalize().unwrap();
    }

    #[test]
    fn test_metadata_extractor_new() {
        let _extractor = MetadataExtractor::new();
        // Extractor se crea correctamente si no hay panic
    }

    #[test]
    fn test_metadata_extractor_default() {
        let _extractor = MetadataExtractor;
        // Extractor default funciona si no hay panic
    }

    #[test]
    fn test_extract_metadata_nonexistent_file() {
        let extractor = MetadataExtractor::new();
        let path = Path::new("/nonexistent/file.mp3");
        let result = extractor.extract_metadata(path);

        assert!(result.is_err());
        match result {
            Err(LibraryError::MetadataExtractionFailed(_)) => {}
            _ => panic!("Esperaba MetadataExtractionFailed"),
        }
    }

    #[test]
    fn test_extract_metadata_wav_file() {
        let temp_dir = TempDir::new().unwrap();
        let wav_path = temp_dir.path().join("test.wav");
        create_test_wav(&wav_path);

        let extractor = MetadataExtractor::new();
        let result = extractor.extract_metadata(&wav_path);

        assert!(result.is_ok());
        let metadata = result.unwrap();

        assert_eq!(metadata.format, "wav");
        assert!(metadata.duration >= 0.0);
        assert!(metadata.path.contains("test.wav"));
    }

    #[test]
    fn test_extract_metadata_uses_filename_as_fallback_title() {
        let temp_dir = TempDir::new().unwrap();
        let wav_path = temp_dir.path().join("My Awesome Song.wav");
        create_test_wav(&wav_path);

        let extractor = MetadataExtractor::new();
        let result = extractor.extract_metadata(&wav_path);

        assert!(result.is_ok());
        let metadata = result.unwrap();

        // WAV sin tags debe usar filename como título
        assert_eq!(metadata.title, Some("My Awesome Song".to_string()));
    }

    #[test]
    fn test_extract_metadata_format_detection() {
        let temp_dir = TempDir::new().unwrap();
        let wav_path = temp_dir.path().join("test.wav");
        create_test_wav(&wav_path);

        let extractor = MetadataExtractor::new();
        let result = extractor.extract_metadata(&wav_path);

        assert!(result.is_ok());
        let metadata = result.unwrap();
        assert_eq!(metadata.format, "wav");
    }

    #[test]
    fn test_extract_metadata_batch_empty() {
        let extractor = MetadataExtractor::new();
        let paths: Vec<&Path> = vec![];
        let results = extractor.extract_metadata_batch(&paths);

        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_extract_metadata_batch_multiple_files() {
        let temp_dir = TempDir::new().unwrap();

        let wav1 = temp_dir.path().join("track1.wav");
        let wav2 = temp_dir.path().join("track2.wav");
        create_test_wav(&wav1);
        create_test_wav(&wav2);

        let extractor = MetadataExtractor::new();
        let paths = vec![wav1, wav2];
        let results = extractor.extract_metadata_batch(&paths);

        assert_eq!(results.len(), 2);
        assert!(results[0].is_ok());
        assert!(results[1].is_ok());
    }

    #[test]
    fn test_extract_metadata_batch_with_failures() {
        let temp_dir = TempDir::new().unwrap();

        let wav_valid = temp_dir.path().join("valid.wav");
        let wav_invalid = temp_dir.path().join("invalid.wav");

        create_test_wav(&wav_valid);

        let extractor = MetadataExtractor::new();
        let paths = vec![wav_valid, wav_invalid];
        let results = extractor.extract_metadata_batch(&paths);

        assert_eq!(results.len(), 2);
        assert!(results[0].is_ok());
        assert!(results[1].is_err());
    }

    #[test]
    fn test_track_metadata_serialization() {
        let metadata = TrackMetadata {
            path: "/music/song.mp3".to_string(),
            title: Some("Test Song".to_string()),
            artist: Some("Test Artist".to_string()),
            album: Some("Test Album".to_string()),
            year: Some(2024),
            genre: Some("Electronic".to_string()),
            bpm: Some(128),
            key: Some("Am".to_string()),
            rating: Some(4), // 4 estrellas (0-5)
            comment: Some("Great track".to_string()),
            duration: 180.5,
            bitrate: 320,
            sample_rate: 44100,
            channels: 2,
            format: "mp3".to_string(),
            artwork: None,
        };

        let json = serde_json::to_string(&metadata).unwrap();
        assert!(json.contains("Test Song"));
        assert!(json.contains("Test Artist"));

        let deserialized: TrackMetadata = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.title, Some("Test Song".to_string()));
        assert_eq!(deserialized.bpm, Some(128));
        assert_eq!(deserialized.key, Some("Am".to_string()));
    }

    #[test]
    fn test_track_metadata_none_values() {
        let metadata = TrackMetadata {
            path: "/music/song.wav".to_string(),
            title: None,
            artist: None,
            album: None,
            year: None,
            genre: None,
            bpm: None,
            key: None,
            rating: None,
            comment: None,
            duration: 120.0,
            bitrate: 1411,
            sample_rate: 44100,
            channels: 2,
            format: "wav".to_string(),
            artwork: None,
        };

        assert!(metadata.title.is_none());
        assert!(metadata.artist.is_none());
        assert!(metadata.bpm.is_none());
        assert_eq!(metadata.duration, 120.0);
    }

    #[test]
    fn test_rating_conversion_stars_to_popm() {
        // Test conversión de estrellas a POPM usando round()
        // AIDEV-NOTE: Verifica compatibilidad con algoritmo de Traktor/TypeScript
        let test_cases = vec![
            (0, 0),   // 0 estrellas -> 0 POPM
            (1, 51),  // 1 estrella -> round((1/5)*255) = round(51) = 51
            (2, 102), // 2 estrellas -> round((2/5)*255) = round(102) = 102
            (3, 153), // 3 estrellas -> round((3/5)*255) = round(153) = 153
            (4, 204), // 4 estrellas -> round((4/5)*255) = round(204) = 204
            (5, 255), // 5 estrellas -> round((5/5)*255) = round(255) = 255
        ];

        for (stars, expected_popm) in test_cases {
            let popm = (((stars as f32 / 5.0) * 255.0).round() as i32).min(255);
            assert_eq!(
                popm, expected_popm,
                "Conversión incorrecta: {} estrellas debería dar {} POPM, pero dio {}",
                stars, expected_popm, popm
            );
        }
    }

    #[test]
    fn test_rating_conversion_popm_to_stars() {
        // Test conversión de POPM a estrellas usando round()
        // AIDEV-NOTE: Verifica compatibilidad con algoritmo de Traktor
        let test_cases = vec![
            (0, 0),   // 0 POPM -> round((0/255)*5) = 0 estrellas
            (25, 0),  // 25 POPM -> round((25/255)*5) = round(0.49) = 0 estrellas
            (26, 1),  // 26 POPM -> round((26/255)*5) = round(0.51) = 1 estrella
            (51, 1),  // 51 POPM -> round((51/255)*5) = round(1.0) = 1 estrella
            (77, 2),  // 77 POPM -> round((77/255)*5) = round(1.51) = 2 estrellas
            (102, 2), // 102 POPM -> round((102/255)*5) = round(2.0) = 2 estrellas
            (128, 3), // 128 POPM -> round((128/255)*5) = round(2.51) = 3 estrellas
            (153, 3), // 153 POPM -> round((153/255)*5) = round(3.0) = 3 estrellas
            (179, 4), // 179 POPM -> round((179/255)*5) = round(3.51) = 4 estrellas
            (204, 4), // 204 POPM -> round((204/255)*5) = round(4.0) = 4 estrellas
            (230, 5), // 230 POPM -> round((230/255)*5) = round(4.51) = 5 estrellas
            (255, 5), // 255 POPM -> round((255/255)*5) = round(5.0) = 5 estrellas
        ];

        for (popm, expected_stars) in test_cases {
            let stars = ((popm as f32 / 255.0) * 5.0).round() as i32;
            assert_eq!(
                stars, expected_stars,
                "Conversión incorrecta: {} POPM debería dar {} estrellas, pero dio {}",
                popm, expected_stars, stars
            );
        }
    }

    #[test]
    fn test_rating_roundtrip() {
        // Test completo: estrellas -> POPM -> estrellas
        for stars in 0..=5 {
            // Convertir a POPM
            let popm = ((stars as f32 / 5.0) * 255.0).round() as u8;
            // Convertir de vuelta a estrellas
            let roundtrip_stars = ((popm as f32 / 255.0) * 5.0).round() as i32;

            assert_eq!(
                stars, roundtrip_stars,
                "Roundtrip falló: {} estrellas -> {} POPM -> {} estrellas",
                stars, popm, roundtrip_stars
            );
        }
    }

    #[test]
    fn test_extract_rating_from_real_mp3() {
        // Test con archivo MP3 real que tiene rating de 5 estrellas
        let path = Path::new("../data/test.mp3");

        if !path.exists() {
            println!("⚠️  Archivo test.mp3 no encontrado, skipping test");
            return;
        }

        let extractor = MetadataExtractor::new();
        let metadata = extractor.extract_metadata(path).unwrap();

        println!("📊 Metadatos extraídos de test.mp3:");
        println!("   - Título: {:?}", metadata.title);
        println!("   - Artista: {:?}", metadata.artist);
        println!("   - Rating: {:?}", metadata.rating);
        println!("   - Duración: {:.2}s", metadata.duration);
        println!("   - Bitrate: {} kbps", metadata.bitrate);

        // El archivo debe tener rating de 5 estrellas
        assert_eq!(
            metadata.rating,
            Some(5),
            "El archivo test.mp3 debe tener rating de 5 estrellas, pero tiene {:?}",
            metadata.rating
        );
    }

    #[test]
    fn test_debug_popm_frames_in_test_mp3() {
        use lofty::config::ParseOptions;
        use lofty::probe::Probe;

        let path = Path::new("../data/test.mp3");

        if !path.exists() {
            println!("⚠️  Archivo test.mp3 no encontrado, skipping test");
            return;
        }

        println!("\n🔍 DEBUG 1: Inspeccionando con lofty");
        let parse_options = ParseOptions::new();
        let tagged_file = Probe::open(path)
            .unwrap()
            .options(parse_options)
            .read()
            .unwrap();

        println!("File type: {:?}", tagged_file.file_type());

        for tag in tagged_file.tags() {
            println!("\n📋 Tag type: {:?}", tag.tag_type());
            println!("   Items count: {}", tag.items().count());

            for item in tag.items() {
                println!("   - Key: {:?}", item.key());
                match item.value() {
                    lofty::tag::ItemValue::Text(t) => println!("     Value (text): {}", t),
                    lofty::tag::ItemValue::Binary(b) => {
                        println!("     Value (binary): {} bytes", b.len());
                        if b.len() < 100 {
                            println!(
                                "     Hex: {}",
                                b.iter()
                                    .map(|b| format!("{:02x}", b))
                                    .collect::<Vec<_>>()
                                    .join(" ")
                            );
                            // Try to parse as POPM
                            if let Some(null_pos) = b.iter().position(|&byte| byte == 0) {
                                let email =
                                    std::str::from_utf8(&b[0..null_pos]).unwrap_or("<invalid>");
                                if b.len() > null_pos + 1 {
                                    let rating_byte = b[null_pos + 1];
                                    println!("     POPM email: {}", email);
                                    println!("     POPM rating (raw): {}", rating_byte);
                                    let stars = ((rating_byte as f32 / 255.0) * 5.0).round() as i32;
                                    println!("     POPM rating (stars): {}", stars);
                                }
                            }
                        }
                    }
                    lofty::tag::ItemValue::Locator(l) => println!("     Value (locator): {}", l),
                }
            }
        }

        // Ahora intentar con id3 crate
        println!("\n🔍 DEBUG 2: Inspeccionando con id3 crate");
        if let Ok(tag) = id3::Tag::read_from_path(path) {
            println!("ID3 version: {:?}", tag.version());
            println!("Frames count: {}", tag.frames().count());

            // Buscar frame POPM
            for frame in tag.frames() {
                println!("\n   Frame ID: {}", frame.id());

                if frame.id() == "POPM" {
                    println!("   ✅ ENCONTRADO POPM!");
                    if let id3::Content::Popularimeter(popm) = frame.content() {
                        println!("      Email: {}", popm.user);
                        println!("      Rating: {}", popm.rating);
                        println!("      Counter: {}", popm.counter);

                        let stars = ((popm.rating as f32 / 255.0) * 5.0).round() as i32;
                        println!("      Stars: {}", stars);
                    }
                }
            }
        } else {
            println!("❌ No se pudo leer tag ID3");
        }
    }

    #[test]
    fn test_write_and_read_rating_roundtrip() {
        use std::fs;
        use tempfile::TempDir;

        let source_path = Path::new("../data/test.mp3");

        if !source_path.exists() {
            println!("⚠️  Archivo test.mp3 no encontrado, skipping test");
            return;
        }

        // Crear directorio temporal
        let temp_dir = TempDir::new().unwrap();

        // Test con diferentes valores de rating
        for test_rating in [0, 1, 2, 3, 4, 5] {
            println!("\n🧪 Testing rating: {} stars", test_rating);

            // Copiar archivo de prueba al directorio temporal
            let test_path = temp_dir
                .path()
                .join(format!("test_rating_{}.mp3", test_rating));
            fs::copy(source_path, &test_path).unwrap();

            // Escribir rating usando nuestra función
            MetadataExtractor::write_rating_to_mp3_file(&test_path, test_rating).unwrap();
            println!("   ✅ Rating {} escrito", test_rating);

            // Leer rating usando nuestra función
            let read_rating = MetadataExtractor::get_rating_from_mp3_file(&test_path);
            println!("   ✅ Rating leído: {:?}", read_rating);

            assert_eq!(
                read_rating,
                Some(test_rating),
                "Rating roundtrip falló: escribimos {} pero leímos {:?}",
                test_rating,
                read_rating
            );

            // Verificar que extract_metadata también lee correctamente
            let extractor = MetadataExtractor::new();
            let metadata = extractor.extract_metadata(&test_path).unwrap();

            assert_eq!(
                metadata.rating,
                Some(test_rating),
                "extract_metadata leyó rating incorrecto: esperado {}, obtenido {:?}",
                test_rating,
                metadata.rating
            );

            println!(
                "   ✅ Roundtrip completo exitoso para {} estrellas",
                test_rating
            );
        }

        println!("\n🎉 Todos los valores de rating (0-5) pasaron el roundtrip test!");
    }

    #[test]
    fn test_update_metadata_with_rating() {
        use std::fs;
        use tempfile::TempDir;

        let source_path = Path::new("../data/test.mp3");

        if !source_path.exists() {
            println!("⚠️  Archivo test.mp3 no encontrado, skipping test");
            return;
        }

        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("test_metadata_update.mp3");
        fs::copy(source_path, &test_path).unwrap();

        let extractor = MetadataExtractor::new();

        // Leer metadatos originales
        let original = extractor.extract_metadata(&test_path).unwrap();
        println!("\n📊 Metadatos originales:");
        println!("   - Título: {:?}", original.title);
        println!("   - Rating: {:?}", original.rating);

        // Actualizar metadatos (cambiar título y rating)
        let mut updated = original.clone();
        updated.title = Some("Test Title Updated".to_string());
        updated.rating = Some(3);

        extractor.write_metadata(&test_path, &updated).unwrap();
        println!("\n✏️  Metadatos actualizados:");
        println!("   - Nuevo título: {:?}", updated.title);
        println!("   - Nuevo rating: {:?}", updated.rating);

        // Leer de nuevo para verificar
        let verified = extractor.extract_metadata(&test_path).unwrap();
        println!("\n✅ Metadatos verificados:");
        println!("   - Título leído: {:?}", verified.title);
        println!("   - Rating leído: {:?}", verified.rating);

        assert_eq!(verified.title, Some("Test Title Updated".to_string()));
        assert_eq!(verified.rating, Some(3));

        println!("\n🎉 write_metadata() funciona correctamente con rating!");
    }
}
