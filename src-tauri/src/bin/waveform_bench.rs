//! Benchmark de generación de waveform
//!
//! Ejecutar con: cargo run --bin waveform_bench --release

use std::fs::File;
use std::path::Path;
use std::time::Instant;
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

const TEST_FILE: &str = "../test-data/bang.mp3";
const TARGET_PEAKS: usize = 800;

fn main() {
    println!("🎵 Waveform Generation Benchmark");
    println!("================================\n");

    let path = Path::new(TEST_FILE);
    if !path.exists() {
        eprintln!("❌ Archivo no encontrado: {}", TEST_FILE);
        std::process::exit(1);
    }

    println!("📁 Archivo: {}", TEST_FILE);

    // Obtener duración primero
    let duration = get_duration(path).unwrap_or(0.0);
    println!("⏱️  Duración: {:.2}s ({:.0} minutos)", duration, duration / 60.0);
    println!();

    // Benchmark con diferentes estrategias
    println!("🔬 Ejecutando benchmarks...\n");

    // Estrategia 1: Procesar TODO (baseline)
    let (peaks1, time1) = benchmark_full_decode(path);
    println!("📊 FULL DECODE (baseline):");
    println!("   Peaks: {}", peaks1);
    println!("   Tiempo: {:.2}s", time1);
    println!("   Ratio: {:.1}x realtime\n", duration / time1);

    // Estrategia 2: Downsampling con ventana grande
    let (peaks2, time2) = benchmark_downsampled(path, duration, TARGET_PEAKS);
    println!("📊 DOWNSAMPLED (target {} peaks):", TARGET_PEAKS);
    println!("   Peaks: {}", peaks2);
    println!("   Tiempo: {:.2}s", time2);
    println!("   Ratio: {:.1}x realtime", duration / time2);
    println!("   Mejora: {:.1}x vs baseline\n", time1 / time2);

    // Estrategia 3: Skip de paquetes
    let (peaks3, time3) = benchmark_packet_skip(path, 10);
    println!("📊 PACKET SKIP (1 de cada 10):");
    println!("   Peaks: {}", peaks3);
    println!("   Tiempo: {:.2}s", time3);
    println!("   Ratio: {:.1}x realtime", duration / time3);
    println!("   Mejora: {:.1}x vs baseline\n", time1 / time3);

    // Estrategia 4: Seek sampling (más agresivo)
    let (peaks4, time4) = benchmark_seek_sampling(path, duration, TARGET_PEAKS);
    println!("📊 SEEK SAMPLING (target {} peaks):", TARGET_PEAKS);
    println!("   Peaks: {}", peaks4);
    println!("   Tiempo: {:.2}s", time4);
    println!("   Ratio: {:.1}x realtime", duration / time4);
    println!("   Mejora: {:.1}x vs baseline\n", time1 / time4);

    println!("✅ Benchmark completado");
}

fn get_duration(path: &Path) -> Option<f64> {
    let file = File::open(path).ok()?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    hint.with_extension("mp3");

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .ok()?;

    let track = probed.format.tracks().first()?;
    let time_base = track.codec_params.time_base?;
    let n_frames = track.codec_params.n_frames?;

    Some(time_base.calc_time(n_frames).seconds as f64 + time_base.calc_time(n_frames).frac)
}

/// Baseline: decodifica TODO el archivo
fn benchmark_full_decode(path: &Path) -> (usize, f64) {
    let start = Instant::now();

    let file = File::open(path).unwrap();
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    hint.with_extension("mp3");

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .unwrap();

    let mut format = probed.format;
    let track = format.tracks().iter().find(|t| t.codec_params.codec != CODEC_TYPE_NULL).unwrap();
    let track_id = track.id;

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .unwrap();

    let mut peaks = Vec::new();
    let mut buffer: Vec<f32> = Vec::new();
    let window_size = 8192;

    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(_) => break,
        };

        if packet.track_id() != track_id { continue; }

        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(_) => continue,
        };

        let mono = convert_to_mono(&decoded);
        buffer.extend(mono);

        while buffer.len() >= window_size {
            let window: Vec<f32> = buffer.drain(..window_size).collect();
            let peak = calculate_rms(&window);
            peaks.push(peak);
        }
    }

    if !buffer.is_empty() {
        peaks.push(calculate_rms(&buffer));
    }

    (peaks.len(), start.elapsed().as_secs_f64())
}

/// Downsampling: ventana dinámica para target peaks
fn benchmark_downsampled(path: &Path, duration: f64, target_peaks: usize) -> (usize, f64) {
    let start = Instant::now();

    let file = File::open(path).unwrap();
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    hint.with_extension("mp3");

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .unwrap();

    let mut format = probed.format;
    let track = format.tracks().iter().find(|t| t.codec_params.codec != CODEC_TYPE_NULL).unwrap();
    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.unwrap_or(44100) as f64;

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .unwrap();

    let total_samples = (duration * sample_rate) as usize;
    let window_size = (total_samples / target_peaks).max(8192);

    let mut peaks = Vec::with_capacity(target_peaks);
    let mut buffer: Vec<f32> = Vec::with_capacity(window_size * 2);

    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(_) => break,
        };

        if packet.track_id() != track_id { continue; }

        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(_) => continue,
        };

        let mono = convert_to_mono(&decoded);
        buffer.extend(mono);

        while buffer.len() >= window_size {
            let window: Vec<f32> = buffer.drain(..window_size).collect();
            let peak = calculate_rms(&window);
            peaks.push(peak);
        }

        // Salir temprano si tenemos suficientes peaks
        if peaks.len() >= target_peaks {
            break;
        }
    }

    if !buffer.is_empty() && peaks.len() < target_peaks {
        peaks.push(calculate_rms(&buffer));
    }

    (peaks.len(), start.elapsed().as_secs_f64())
}

/// Packet skip: solo procesa 1 de cada N paquetes
fn benchmark_packet_skip(path: &Path, skip_ratio: usize) -> (usize, f64) {
    let start = Instant::now();

    let file = File::open(path).unwrap();
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    hint.with_extension("mp3");

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .unwrap();

    let mut format = probed.format;
    let track = format.tracks().iter().find(|t| t.codec_params.codec != CODEC_TYPE_NULL).unwrap();
    let track_id = track.id;

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .unwrap();

    let mut peaks = Vec::new();
    let mut buffer: Vec<f32> = Vec::new();
    let window_size = 8192;
    let mut packet_count = 0usize;

    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(_) => break,
        };

        if packet.track_id() != track_id { continue; }

        packet_count += 1;

        // Skip packets
        if packet_count % skip_ratio != 0 {
            continue;
        }

        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(_) => continue,
        };

        let mono = convert_to_mono(&decoded);
        buffer.extend(mono);

        while buffer.len() >= window_size {
            let window: Vec<f32> = buffer.drain(..window_size).collect();
            let peak = calculate_rms(&window);
            peaks.push(peak);
        }
    }

    if !buffer.is_empty() {
        peaks.push(calculate_rms(&buffer));
    }

    (peaks.len(), start.elapsed().as_secs_f64())
}

/// Seek sampling: hace seek a posiciones específicas
fn benchmark_seek_sampling(path: &Path, duration: f64, target_peaks: usize) -> (usize, f64) {
    let start = Instant::now();

    let file = File::open(path).unwrap();
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    hint.with_extension("mp3");

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .unwrap();

    let mut format = probed.format;
    let track = format.tracks().iter().find(|t| t.codec_params.codec != CODEC_TYPE_NULL).unwrap();
    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.unwrap_or(44100) as f64;
    let time_base = track.codec_params.time_base.unwrap_or(symphonia::core::units::TimeBase::new(1, sample_rate as u32));

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .unwrap();

    let mut peaks = Vec::with_capacity(target_peaks);
    let time_step = duration / target_peaks as f64;
    let samples_per_peak = 4096; // Solo necesitamos unos pocos samples por posición

    for i in 0..target_peaks {
        let seek_time = i as f64 * time_step;
        let seek_ts = time_base.calc_timestamp(symphonia::core::units::Time::new(seek_time as u64, seek_time.fract()));

        // Intentar seek
        if format.seek(
            symphonia::core::formats::SeekMode::Coarse,
            symphonia::core::formats::SeekTo::TimeStamp { ts: seek_ts, track_id },
        ).is_err() {
            continue;
        }

        // Decodificar unos pocos paquetes en esta posición
        let mut samples: Vec<f32> = Vec::with_capacity(samples_per_peak);

        for _ in 0..3 { // Solo 3 paquetes por posición
            let packet = match format.next_packet() {
                Ok(p) => p,
                Err(_) => break,
            };

            if packet.track_id() != track_id { continue; }

            let decoded = match decoder.decode(&packet) {
                Ok(d) => d,
                Err(_) => continue,
            };

            let mono = convert_to_mono(&decoded);
            samples.extend(mono);

            if samples.len() >= samples_per_peak {
                break;
            }
        }

        if !samples.is_empty() {
            let peak = calculate_rms(&samples[..samples.len().min(samples_per_peak)]);
            peaks.push(peak);
        }
    }

    (peaks.len(), start.elapsed().as_secs_f64())
}

fn convert_to_mono(audio: &AudioBufferRef) -> Vec<f32> {
    match audio {
        AudioBufferRef::F32(buf) => {
            let channels = buf.spec().channels.count();
            let frames = buf.frames();
            (0..frames)
                .map(|i| {
                    let sum: f32 = (0..channels).map(|ch| buf.chan(ch)[i].abs()).sum();
                    sum / channels as f32
                })
                .collect()
        }
        AudioBufferRef::S16(buf) => {
            let channels = buf.spec().channels.count();
            let frames = buf.frames();
            (0..frames)
                .map(|i| {
                    let sum: f32 = (0..channels)
                        .map(|ch| (buf.chan(ch)[i] as f32 / 32768.0).abs())
                        .sum();
                    sum / channels as f32
                })
                .collect()
        }
        AudioBufferRef::S32(buf) => {
            let channels = buf.spec().channels.count();
            let frames = buf.frames();
            (0..frames)
                .map(|i| {
                    let sum: f32 = (0..channels)
                        .map(|ch| (buf.chan(ch)[i] as f32 / 2147483648.0).abs())
                        .sum();
                    sum / channels as f32
                })
                .collect()
        }
        _ => Vec::new(),
    }
}

fn calculate_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() { return 0.0; }
    let sum_sq: f32 = samples.iter().map(|s| s * s).sum();
    (sum_sq / samples.len() as f32).sqrt()
}
