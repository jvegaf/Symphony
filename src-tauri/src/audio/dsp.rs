/// Procesamiento de señales digitales (DSP) para análisis de audio
/// 
/// Este módulo contiene funciones de bajo nivel para calcular características
/// de waveform usando diferentes métodos de peak detection.
/// 
/// AIDEV-NOTE: Basado en la implementación de Musicat
/// Ref: https://github.com/basharovV/musicat/blob/main/src/data/WaveformGenerator.ts

use serde::{Deserialize, Serialize};

/// Método para calcular los peaks de waveform
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum PeakMethod {
    /// Máximo valor absoluto en la ventana
    Peak,
    /// Root Mean Square (RMS) - más suave y perceptualmente relevante
    Rms,
}

/// Calcula el peak value de un conjunto de samples usando el método especificado
///
/// # Argumentos
/// * `samples` - Slice de samples de audio (valores flotantes)
/// * `method` - Método de cálculo (Peak o RMS)
///
/// # Retorna
/// Valor del peak (0.0 a 1.0+)
pub fn calculate_peak_value(samples: &[f32], method: PeakMethod) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }

    match method {
        PeakMethod::Peak => calculate_peak(samples),
        PeakMethod::Rms => calculate_rms(samples),
    }
}

/// Calcula el máximo valor absoluto (peak simple)
fn calculate_peak(samples: &[f32]) -> f32 {
    samples
        .iter()
        .map(|&s| s.abs())
        .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
        .unwrap_or(0.0)
}

/// Calcula el Root Mean Square (RMS)
/// 
/// RMS es más perceptualmente relevante que el peak simple porque
/// representa mejor cómo percibimos el "volumen" del audio.
/// 
/// Formula: sqrt(sum(x^2) / n)
fn calculate_rms(samples: &[f32]) -> f32 {
    let sum_of_squares: f32 = samples.iter().map(|&s| s * s).sum();
    (sum_of_squares / samples.len() as f32).sqrt()
}

/// Normaliza un conjunto de peaks al rango 0.0-1.0
///
/// # Argumentos
/// * `peaks` - Slice mutable de valores de peak
pub fn normalize_peaks(peaks: &mut [f32]) {
    if peaks.is_empty() {
        return;
    }

    // Encontrar el máximo valor
    let max_value = peaks
        .iter()
        .copied()
        .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
        .unwrap_or(1.0);

    // Evitar división por cero
    if max_value > 0.0 {
        for peak in peaks.iter_mut() {
            *peak /= max_value;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_peak_empty() {
        let samples: Vec<f32> = vec![];
        assert_eq!(calculate_peak_value(&samples, PeakMethod::Peak), 0.0);
        assert_eq!(calculate_peak_value(&samples, PeakMethod::Rms), 0.0);
    }

    #[test]
    fn test_calculate_peak_simple() {
        let samples = vec![0.5, -0.8, 0.3, -0.2];
        let peak = calculate_peak_value(&samples, PeakMethod::Peak);
        assert_eq!(peak, 0.8);
    }

    #[test]
    fn test_calculate_rms() {
        let samples = vec![0.5, 0.5, 0.5, 0.5];
        let rms = calculate_peak_value(&samples, PeakMethod::Rms);
        assert_eq!(rms, 0.5);
    }

    #[test]
    fn test_normalize_peaks() {
        let mut peaks = vec![0.5, 1.0, 0.25, 0.75];
        normalize_peaks(&mut peaks);
        
        assert_eq!(peaks[0], 0.5);
        assert_eq!(peaks[1], 1.0); // máximo
        assert_eq!(peaks[2], 0.25);
        assert_eq!(peaks[3], 0.75);
    }

    #[test]
    fn test_normalize_peaks_empty() {
        let mut peaks: Vec<f32> = vec![];
        normalize_peaks(&mut peaks);
        assert_eq!(peaks.len(), 0);
    }

    #[test]
    fn test_rms_vs_peak() {
        // RMS debería ser menor que peak para señales con picos
        let samples = vec![0.0, 0.0, 1.0, 0.0];
        let peak = calculate_peak_value(&samples, PeakMethod::Peak);
        let rms = calculate_peak_value(&samples, PeakMethod::Rms);
        
        assert_eq!(peak, 1.0);
        assert!(rms < peak);
        assert_eq!(rms, 0.5); // sqrt(1/4) = 0.5
    }
}
