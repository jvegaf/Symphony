use std::path::Path;
use hound::{WavReader, SampleFormat};
use serde::{Serialize, Deserialize};

use crate::audio::{AudioError, AudioResult};

/// Datos de waveform
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaveformData {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub duration: f64,
}

/// Generador de waveforms
#[allow(dead_code)]
pub struct WaveformGenerator;

impl WaveformGenerator {
    /// Genera datos de waveform desde un archivo WAV
    #[allow(dead_code)]
    pub fn generate(path: &Path, resolution: usize) -> AudioResult<WaveformData> {
        // Validar que el archivo existe
        if !path.exists() {
            return Err(AudioError::FileNotFound(path.display().to_string()));
        }

        // Leer archivo WAV
        let reader = WavReader::open(path)
            .map_err(|e| AudioError::WaveformGenerationFailed(format!("Error al leer WAV: {}", e)))?;

        let spec = reader.spec();
        let sample_rate = spec.sample_rate;
        let channels = spec.channels;

        // Leer todas las muestras
        let samples: Vec<f32> = match spec.sample_format {
            SampleFormat::Float => {
                reader.into_samples::<f32>()
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|e| AudioError::WaveformGenerationFailed(format!("Error al leer muestras: {}", e)))?
            }
            SampleFormat::Int => {
                reader.into_samples::<i16>()
                    .map(|s| s.map(|v| v as f32 / i16::MAX as f32))
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|e| AudioError::WaveformGenerationFailed(format!("Error al leer muestras: {}", e)))?
            }
        };

        // Calcular duración
        let duration = samples.len() as f64 / (sample_rate as f64 * channels as f64);

        // Reducir resolución si es necesario
        let downsampled = Self::downsample(&samples, resolution);

        Ok(WaveformData {
            samples: downsampled,
            sample_rate,
            duration,
        })
    }

    /// Reduce la resolución de las muestras
    #[allow(dead_code)]
    fn downsample(samples: &[f32], target_resolution: usize) -> Vec<f32> {
        if samples.len() <= target_resolution {
            return samples.to_vec();
        }

        let chunk_size = samples.len() / target_resolution;
        samples
            .chunks(chunk_size)
            .map(|chunk| {
                // Calcular RMS de cada chunk
                let sum: f32 = chunk.iter().map(|s| s * s).sum();
                (sum / chunk.len() as f32).sqrt()
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_downsample() {
        let samples = vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
        let result = WaveformGenerator::downsample(&samples, 3);
        assert_eq!(result.len(), 3);
    }

    #[test]
    fn test_downsample_no_reduction() {
        let samples = vec![1.0, 2.0, 3.0];
        let result = WaveformGenerator::downsample(&samples, 5);
        assert_eq!(result.len(), 3);
        assert_eq!(result, samples);
    }

    #[test]
    fn test_generate_nonexistent_file() {
        let path = PathBuf::from("/nonexistent/file.wav");
        let result = WaveformGenerator::generate(&path, 100);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AudioError::FileNotFound(_)));
    }
}
