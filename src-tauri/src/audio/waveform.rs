use std::path::Path;
use std::fs::File;
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use serde::{Serialize, Deserialize};

use crate::audio::{AudioError, AudioResult};

/// Datos de waveform
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaveformData {
    /// Muestras de amplitud (valores entre 0.0 y 1.0)
    pub samples: Vec<f32>,
    /// Duración total en segundos
    pub duration: f64,
    /// Sample rate original
    pub sample_rate: u32,
    /// Número de canales
    pub channels: u16,
}

/// Genera datos de waveform para una pista de audio
pub fn generate_waveform(path: &Path, target_samples: usize) -> AudioResult<WaveformData> {
    log::info!("🎵 Generating waveform for: {:?}", path);
    log::info!("🎯 Target samples: {}", target_samples);
    
    let start = std::time::Instant::now();
    
    let file = File::open(path).map_err(|e| {
        AudioError::DecodingFailed(format!("Cannot open file: {}", e))
    })?;
    
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    
    let mut hint = Hint::new();
    if let Some(ext) = path.extension() {
        if let Some(ext_str) = ext.to_str() {
            hint.with_extension(ext_str);
        }
    }
    
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .map_err(|e| AudioError::DecodingFailed(format!("Probe failed: {}", e)))?;
    
    let mut format = probed.format;
    
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| AudioError::DecodingFailed("No audio track found".to_string()))?;
    
    let track_id = track.id;
    let codec_params = &track.codec_params;
    
    let sample_rate = codec_params.sample_rate.unwrap_or(44100);
    let channels = codec_params.channels.map(|c| c.count()).unwrap_or(2) as u16;
    
    log::info!("📊 Audio info - Sample rate: {}, Channels: {}", sample_rate, channels);
    
    let mut decoder = symphonia::default::get_codecs()
        .make(&codec_params, &DecoderOptions::default())
        .map_err(|e| AudioError::DecodingFailed(format!("Decoder creation failed: {}", e)))?;
    
    let mut all_samples: Vec<f32> = Vec::new();
    let mut total_frames = 0u64;
    let mut packets_processed = 0;
    
    // Optimización: solo procesar 1 de cada N paquetes para waveforms con pocos samples
    let skip_factor = if target_samples < 100 { 10 } else { 1 };
    
    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(SymphoniaError::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => {
                break;
            }
            Err(_) => break,
        };
        
        if packet.track_id() != track_id {
            continue;
        }
        
        packets_processed += 1;
        
        // Saltar paquetes para acelerar
        if packets_processed % skip_factor != 0 {
            continue;
        }
        
        match decoder.decode(&packet) {
            Ok(decoded) => {
                let samples = convert_to_mono(&decoded);
                total_frames += samples.len() as u64 * skip_factor as u64;
                all_samples.extend(samples);
            }
            Err(_) => continue,
        }
    }
    
    let duration = total_frames as f64 / sample_rate as f64;
    let downsampled = downsample_waveform(&all_samples, target_samples);
    
    let elapsed = start.elapsed();
    log::info!("✅ Waveform generated in {:.2}s: {} samples, duration: {:.2}s", 
        elapsed.as_secs_f64(), downsampled.len(), duration);
    
    Ok(WaveformData {
        samples: downsampled,
        duration,
        sample_rate,
        channels,
    })
}

fn convert_to_mono(audio_buf: &AudioBufferRef) -> Vec<f32> {
    match audio_buf {
        AudioBufferRef::F32(buf) => {
            let num_channels = buf.spec().channels.count();
            let num_frames = buf.frames();
            let mut mono = Vec::with_capacity(num_frames);
            
            for frame_idx in 0..num_frames {
                let mut sum = 0.0f32;
                for ch in 0..num_channels {
                    sum += buf.chan(ch)[frame_idx].abs();
                }
                mono.push(sum / num_channels as f32);
            }
            mono
        }
        AudioBufferRef::S16(buf) => {
            let num_channels = buf.spec().channels.count();
            let num_frames = buf.frames();
            let mut mono = Vec::with_capacity(num_frames);
            
            for frame_idx in 0..num_frames {
                let mut sum = 0.0f32;
                for ch in 0..num_channels {
                    sum += (buf.chan(ch)[frame_idx] as f32 / 32768.0).abs();
                }
                mono.push(sum / num_channels as f32);
            }
            mono
        }
        _ => Vec::new(),
    }
}

fn downsample_waveform(samples: &[f32], target_count: usize) -> Vec<f32> {
    if samples.is_empty() {
        return Vec::new();
    }
    
    if samples.len() <= target_count {
        return samples.to_vec();
    }
    
    let mut result = Vec::with_capacity(target_count);
    let samples_per_pixel = samples.len() as f32 / target_count as f32;
    
    for i in 0..target_count {
        let start = (i as f32 * samples_per_pixel) as usize;
        let end = (((i + 1) as f32 * samples_per_pixel) as usize).min(samples.len());
        
        let peak = samples[start..end]
            .iter()
            .copied()
            .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
            .unwrap_or(0.0);
        
        result.push(peak);
    }
    
    result
}

