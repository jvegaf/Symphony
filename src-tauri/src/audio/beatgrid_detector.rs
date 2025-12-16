use crate::audio::decoder::AudioDecoder;
use crate::audio::error::AudioError;
use std::path::Path;

/// Análisis de beatgrid de una pista
#[derive(Debug, Clone)]
pub struct BeatgridAnalysis {
    pub bpm: f64,
    pub offset: f64,
    pub confidence: f64,
}

/// Detector de beatgrids usando onset detection + autocorrelación
pub struct BeatgridDetector;

impl BeatgridDetector {
    /// Analiza una pista y devuelve BPM, offset y confidence
    ///
    /// # Arguments
    /// * `path` - Ruta al archivo de audio
    ///
    /// # Returns
    /// BeatgridAnalysis con bpm, offset y confidence score (0-100)
    ///
    /// # Errors
    /// Retorna AudioError si:
    /// - El archivo no existe o no se puede decodificar
    /// - No se detectan suficientes beats (< 10 onsets)
    /// - No se encuentra tempo consistente
    ///
    /// # Performance
    /// Target: <10s para pista de 5 minutos
    pub fn analyze(path: &Path) -> Result<BeatgridAnalysis, AudioError> {
        // 1. Decodificar audio con samples
        let decoded = AudioDecoder::decode_samples(path)?;

        // 2. Convertir a mono si es estéreo (simplificación)
        let mono_samples = Self::to_mono(&decoded.samples, decoded.channels as usize);

        // 3. Detectar onsets (beats)
        let onsets = Self::detect_onsets(&mono_samples, decoded.sample_rate)?;

        // 4. Calcular BPM y confidence
        let (bpm, confidence) = Self::calculate_bpm(&onsets, decoded.sample_rate)?;

        // 5. Encontrar offset del primer beat
        let offset = Self::find_first_beat(&onsets, bpm, decoded.sample_rate)?;

        Ok(BeatgridAnalysis {
            bpm,
            offset,
            confidence,
        })
    }

    /// Convierte samples multi-canal a mono
    fn to_mono(samples: &[f32], channels: usize) -> Vec<f32> {
        if channels == 1 {
            return samples.to_vec();
        }

        samples
            .chunks(channels)
            .map(|chunk| chunk.iter().sum::<f32>() / channels as f32)
            .collect()
    }

    /// Detecta onsets usando análisis de energía con ventanas
    ///
    /// Algoritmo:
    /// 1. Divide audio en ventanas de 512 samples (hop: 256)
    /// 2. Calcula energía RMS de cada ventana
    /// 3. Detecta picos de energía como onsets
    ///
    /// # Performance
    /// O(n) donde n = número de samples
    fn detect_onsets(samples: &[f32], _sample_rate: u32) -> Result<Vec<usize>, AudioError> {
        const WINDOW_SIZE: usize = 512;
        const HOP_SIZE: usize = 256;

        // Calcular energía por ventana
        let mut energies = Vec::new();
        for i in (0..samples.len().saturating_sub(WINDOW_SIZE)).step_by(HOP_SIZE) {
            let window = &samples[i..i + WINDOW_SIZE];

            // RMS energy
            let energy: f32 = window.iter().map(|&s| s * s).sum::<f32>() / window.len() as f32;

            energies.push((i, energy.sqrt()));
        }

        if energies.is_empty() {
            return Err(AudioError::AnalysisError(
                "Audio demasiado corto para análisis".into(),
            ));
        }

        // Calcular threshold adaptativo (media + 1.5 * desviación estándar)
        let mean_energy: f32 = energies.iter().map(|(_, e)| e).sum::<f32>() / energies.len() as f32;

        let variance: f32 = energies
            .iter()
            .map(|(_, e)| (e - mean_energy).powi(2))
            .sum::<f32>()
            / energies.len() as f32;

        let std_dev = variance.sqrt();
        let threshold = mean_energy + 1.5 * std_dev;

        // Detectar picos de energía
        let mut onsets = Vec::new();
        let mut prev_energy = 0.0;
        let mut in_peak = false;

        for (idx, energy) in &energies {
            // Onset cuando energía cruza threshold hacia arriba
            if *energy > threshold && prev_energy <= threshold && !in_peak {
                onsets.push(*idx);
                in_peak = true;
            } else if *energy <= threshold {
                in_peak = false;
            }

            prev_energy = *energy;
        }

        Ok(onsets)
    }

    /// Calcula BPM usando autocorrelación de intervalos entre onsets
    ///
    /// # Algorithm
    /// 1. Calcula intervalos entre onsets consecutivos
    /// 2. Filtra intervalos fuera de rango (0.3s - 2.0s = 30-200 BPM)
    /// 3. Calcula BPM promedio: 60 / intervalo_promedio
    /// 4. Calcula confidence basado en desviación estándar
    ///
    /// # Returns
    /// (bpm, confidence) donde confidence está en rango 0-100
    fn calculate_bpm(onsets: &[usize], sample_rate: u32) -> Result<(f64, f64), AudioError> {
        if onsets.len() < 10 {
            return Err(AudioError::AnalysisError(
                "No se detectaron suficientes beats".into(),
            ));
        }

        // Calcular intervalos entre onsets
        let intervals: Vec<f64> = onsets
            .windows(2)
            .map(|pair| {
                let diff = pair[1] - pair[0];
                diff as f64 / sample_rate as f64
            })
            .collect();

        // Filtrar intervalos fuera de rango razonable (0.3s - 2.0s = 30-200 BPM)
        let valid_intervals: Vec<f64> = intervals
            .iter()
            .filter(|&&interval| (0.3..=2.0).contains(&interval))
            .copied()
            .collect();

        if valid_intervals.is_empty() {
            return Err(AudioError::AnalysisError(
                "No se encontró tempo consistente".into(),
            ));
        }

        // Calcular BPM promedio
        let avg_interval = valid_intervals.iter().sum::<f64>() / valid_intervals.len() as f64;
        let bpm = 60.0 / avg_interval;

        // Calcular confidence basado en desviación estándar
        let variance: f64 = valid_intervals
            .iter()
            .map(|&i| (i - avg_interval).powi(2))
            .sum::<f64>()
            / valid_intervals.len() as f64;

        let std_dev = variance.sqrt();
        let confidence = ((1.0 - (std_dev / avg_interval).min(1.0)) * 100.0).max(0.0);

        Ok((bpm, confidence))
    }

    /// Encuentra el offset del primer beat
    ///
    /// # Returns
    /// Offset en segundos desde el inicio de la pista
    fn find_first_beat(onsets: &[usize], _bpm: f64, sample_rate: u32) -> Result<f64, AudioError> {
        if onsets.is_empty() {
            return Ok(0.0);
        }

        // El primer onset detectado es el primer beat
        let first_onset_seconds = onsets[0] as f64 / sample_rate as f64;

        Ok(first_onset_seconds)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_mono_stereo() {
        let stereo = vec![0.5, -0.5, 1.0, -1.0];
        let mono = BeatgridDetector::to_mono(&stereo, 2);

        assert_eq!(mono.len(), 2);
        assert_eq!(mono[0], 0.0); // (0.5 + -0.5) / 2
        assert_eq!(mono[1], 0.0); // (1.0 + -1.0) / 2
    }

    #[test]
    fn test_to_mono_already_mono() {
        let mono_input = vec![0.5, 1.0, -0.5];
        let mono_output = BeatgridDetector::to_mono(&mono_input, 1);

        assert_eq!(mono_output, mono_input);
    }

    #[test]
    fn test_detect_onsets_empty() {
        let result = BeatgridDetector::detect_onsets(&[], 44100);
        assert!(result.is_err());

        match result {
            Err(AudioError::AnalysisError(msg)) => {
                assert!(msg.contains("demasiado corto"));
            }
            _ => panic!("Expected AnalysisError"),
        }
    }

    #[test]
    fn test_detect_onsets_simple_peaks() {
        // Crear señal con picos de energía
        let mut samples = vec![0.0; 10000];

        // Pico 1 en sample 1000
        samples[1000..1100].fill(0.8);

        // Pico 2 en sample 3000
        samples[3000..3100].fill(0.9);

        // Pico 3 en sample 5000
        samples[5000..5100].fill(0.85);

        let onsets = BeatgridDetector::detect_onsets(&samples, 44100).unwrap();

        // Debería detectar al menos algunos picos
        assert!(!onsets.is_empty());
    }

    #[test]
    fn test_calculate_bpm_insufficient_onsets() {
        let onsets = vec![0, 1000, 2000]; // Solo 3 onsets
        let result = BeatgridDetector::calculate_bpm(&onsets, 44100);

        assert!(result.is_err());
        match result {
            Err(AudioError::AnalysisError(msg)) => {
                assert!(msg.contains("suficientes beats"));
            }
            _ => panic!("Expected AnalysisError"),
        }
    }

    #[test]
    fn test_calculate_bpm_consistent_tempo() {
        // Simular 120 BPM (0.5s entre beats = 22050 samples @ 44100 Hz)
        let onsets: Vec<usize> = (0..20).map(|i| i * 22050).collect();

        let (bpm, confidence) = BeatgridDetector::calculate_bpm(&onsets, 44100).unwrap();

        // BPM debería estar cerca de 120
        assert!(bpm > 115.0 && bpm < 125.0);

        // Confidence debería ser alta (tempo perfecto)
        assert!(confidence > 90.0);
    }

    #[test]
    fn test_calculate_bpm_variable_tempo() {
        // Simular tempo variable (alternando entre 120 y 130 BPM)
        let mut onsets = Vec::new();
        let mut pos = 0;

        for i in 0..20 {
            onsets.push(pos);
            // Alternar intervalos - mayor variación
            pos += if i % 2 == 0 { 22050 } else { 18400 };
        }

        let (bpm, confidence) = BeatgridDetector::calculate_bpm(&onsets, 44100).unwrap();

        // BPM debería estar en rango esperado
        assert!(bpm > 115.0 && bpm < 145.0);

        // Confidence debería ser válido (0-100)
        assert!((0.0..=100.0).contains(&confidence));
    }

    #[test]
    fn test_find_first_beat() {
        let onsets = vec![1000, 2000, 3000];
        let offset = BeatgridDetector::find_first_beat(&onsets, 120.0, 44100).unwrap();

        // Offset debería ser ~0.0227s (1000 / 44100)
        assert!((offset - 0.0227).abs() < 0.001);
    }

    #[test]
    fn test_find_first_beat_empty() {
        let onsets = vec![];
        let offset = BeatgridDetector::find_first_beat(&onsets, 120.0, 44100).unwrap();

        assert_eq!(offset, 0.0);
    }
}
