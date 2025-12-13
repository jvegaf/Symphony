use std::path::Path;
use std::fs::File;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::probe::Hint;
use symphonia::core::formats::FormatOptions;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::codecs::CODEC_TYPE_NULL;
use symphonia::default::get_probe;
use serde::{Serialize, Deserialize};

use crate::audio::{AudioError, AudioResult};

/// Metadatos de audio extraídos
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AudioMetadata {
    pub duration: f64,
    pub sample_rate: u32,
    pub channels: u16,
    pub bitrate: Option<u32>,
    pub codec: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub year: Option<i32>,
    pub genre: Option<String>,
}

/// Decodificador de audio
pub struct AudioDecoder;

impl AudioDecoder {
    /// Decodifica un archivo de audio y extrae metadatos
    pub fn decode(path: &Path) -> AudioResult<AudioMetadata> {
        // Validar que el archivo existe
        if !path.exists() {
            return Err(AudioError::FileNotFound(path.display().to_string()));
        }

        // Validar extensión soportada
        Self::validate_format(path)?;

        // Abrir archivo
        let file = File::open(path)?;
        let mss = MediaSourceStream::new(Box::new(file), Default::default());

        // Crear hint de formato desde extensión
        let mut hint = Hint::new();
        if let Some(ext) = path.extension() {
            if let Some(ext_str) = ext.to_str() {
                hint.with_extension(ext_str);
            }
        }

        // Probe del formato
        let probe_result = get_probe().format(
            &hint,
            mss,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )?;

        let mut format = probe_result.format;

        // Obtener primer track
        let track = format
            .tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or_else(|| AudioError::DecodingFailed("No audio tracks found".to_string()))?;

        // Extraer metadatos
        let codec_params = &track.codec_params;

        let sample_rate = codec_params.sample_rate
            .ok_or_else(|| AudioError::DecodingFailed("Sample rate not found".to_string()))?;

        let channels = codec_params.channels
            .ok_or_else(|| AudioError::DecodingFailed("Channels not found".to_string()))?
            .count() as u16;

        // Calcular duración desde n_frames o time_base
        let duration = if let Some(n_frames) = codec_params.n_frames {
            n_frames as f64 / sample_rate as f64
        } else if let Some(tb) = codec_params.time_base {
            // Estimar duración desde formato
            if let Some(track_duration) = track.codec_params.n_frames {
                (track_duration as f64 * tb.numer as f64) / tb.denom as f64
            } else {
                0.0
            }
        } else {
            0.0
        };

        // El bitrate no está directamente disponible en CodecParameters
        // Se puede calcular desde el tamaño del archivo y la duración
        let bitrate = None; // TODO: Calcular desde file_size / duration

        let codec = codec_params.codec.to_string();

        // Extraer tags de metadatos
        let mut title = None;
        let mut artist = None;
        let mut album = None;
        let mut year = None;
        let mut genre = None;

        if let Some(metadata) = format.metadata().current() {
            for tag in metadata.tags() {
                match tag.std_key {
                    Some(symphonia::core::meta::StandardTagKey::TrackTitle) => title = Some(tag.value.to_string()),
                    Some(symphonia::core::meta::StandardTagKey::Artist) => artist = Some(tag.value.to_string()),
                    Some(symphonia::core::meta::StandardTagKey::Album) => album = Some(tag.value.to_string()),
                    Some(symphonia::core::meta::StandardTagKey::Date) => {
                        // Intentar parsear el año (puede venir como "2024" o "2024-01-01")
                        let val = tag.value.to_string();
                        if let Ok(y) = val.parse::<i32>() {
                            year = Some(y);
                        } else if val.len() >= 4 {
                            if let Ok(y) = val[0..4].parse::<i32>() {
                                year = Some(y);
                            }
                        }
                    },
                    Some(symphonia::core::meta::StandardTagKey::Genre) => genre = Some(tag.value.to_string()),
                    _ => {},
                }
            }
        }

        Ok(AudioMetadata {
            duration,
            sample_rate,
            channels,
            bitrate,
            codec,
            title,
            artist,
            album,
            year,
            genre,
        })
    }

    /// Valida que el formato de archivo sea soportado
    fn validate_format(path: &Path) -> AudioResult<()> {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_lowercase());

        match ext.as_deref() {
            Some("mp3") | Some("flac") | Some("wav") | Some("ogg") | Some("m4a") | Some("aac") => Ok(()),
            Some(fmt) => Err(AudioError::UnsupportedFormat(fmt.to_string())),
            None => Err(AudioError::UnsupportedFormat("unknown".to_string())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_validate_format_supported() {
        let path = PathBuf::from("test.mp3");
        assert!(AudioDecoder::validate_format(&path).is_ok());

        let path = PathBuf::from("test.flac");
        assert!(AudioDecoder::validate_format(&path).is_ok());

        let path = PathBuf::from("test.wav");
        assert!(AudioDecoder::validate_format(&path).is_ok());
    }

    #[test]
    fn test_validate_format_unsupported() {
        let path = PathBuf::from("test.xyz");
        let result = AudioDecoder::validate_format(&path);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AudioError::UnsupportedFormat(_)));
    }

    #[test]
    fn test_validate_format_no_extension() {
        let path = PathBuf::from("test");
        let result = AudioDecoder::validate_format(&path);
        assert!(result.is_err());
    }

    #[test]
    fn test_decode_nonexistent_file() {
        let path = PathBuf::from("/nonexistent/file.mp3");
        let result = AudioDecoder::decode(&path);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AudioError::FileNotFound(_)));
    }
}
