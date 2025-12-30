//! Lógica de decodificación de audio con Symphonia

use std::path::Path;
use std::thread;
use std::time::Duration;

use rb::{Producer, RbProducer};
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::{FormatOptions, SeekMode, SeekTo};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;

use crate::audio::error::{AudioError, AudioResult};
use crate::audio::output::AudioOutput;

use super::state::{DecodeResult, DecoderState};

/// Obtiene el sample rate y número de canales de un archivo sin crear el decoder completo
///
/// AIDEV-NOTE: Usado para determinar qué sample rate y canales configurar en el dispositivo
/// antes de crear el output. Estilo Musicat.
///
/// Retorna: (sample_rate, channels)
pub fn probe_file_sample_rate(path: &str) -> AudioResult<(u32, u16)> {
    let file = std::fs::File::open(path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = Path::new(path).extension() {
        hint.with_extension(&ext.to_string_lossy());
    }

    let format_opts = FormatOptions {
        enable_gapless: false,
        ..Default::default()
    };
    let metadata_opts = MetadataOptions::default();

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &format_opts, &metadata_opts)
        .map_err(|e| AudioError::DecodingFailed(format!("Error probando formato: {}", e)))?;

    let format_reader = probed.format;

    let track = format_reader
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| AudioError::DecodingFailed("No se encontró track de audio".to_string()))?;

    let sample_rate = track.codec_params.sample_rate.ok_or_else(|| {
        AudioError::DecodingFailed("No se pudo determinar sample rate".to_string())
    })?;

    let channels = track
        .codec_params
        .channels
        .map(|ch| ch.count() as u16)
        .unwrap_or(2); // Default a stereo si no se puede determinar

    Ok((sample_rate, channels))
}

/// Abre un archivo de audio y prepara el decodificador
pub fn open_audio_file(
    path: &str,
    seek: Option<f64>,
    output: &dyn AudioOutput,
) -> AudioResult<(DecoderState, f64)> {
    let file = std::fs::File::open(path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    // Hint basado en extensión
    let mut hint = Hint::new();
    if let Some(ext) = Path::new(path).extension() {
        hint.with_extension(&ext.to_string_lossy());
    }

    // Probar formato
    let format_opts = FormatOptions {
        enable_gapless: false,
        ..Default::default()
    };
    let metadata_opts = MetadataOptions::default();

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &format_opts, &metadata_opts)
        .map_err(|e| AudioError::DecodingFailed(format!("Error probando formato: {}", e)))?;

    let format_reader = probed.format;

    // Encontrar track de audio
    let track = format_reader
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| AudioError::DecodingFailed("No se encontró track de audio".to_string()))?;

    let track_id = track.id;
    let codec_params = &track.codec_params;

    // Obtener time_base y sample rates
    let time_base = codec_params
        .time_base
        .unwrap_or(symphonia::core::units::TimeBase::new(1, 44100));
    let codec_sample_rate = codec_params.sample_rate.unwrap_or(44100);
    let output_sample_rate = output.sample_rate();
    let output_channels = output.channels() as usize;

    log::info!("========== AUDIO STREAM INFO ==========");
    log::info!("Codec sample rate: {:?}", codec_params.sample_rate);
    log::info!("Output device sample rate: {}", output_sample_rate);
    log::info!("Output channels: {}", output_channels);
    log::info!("Codec channels: {:?}", codec_params.channels);

    // AIDEV-NOTE: NO crear resampler aquí.
    // Confiamos en que el dispositivo está configurado al sample rate correcto del archivo.
    // Si los sample rates no coinciden, es porque el dispositivo NO soporta el sample rate del archivo,
    // y en ese caso el audio sonará más rápido/lento (bug conocido que necesita implementación
    // de resampler personalizado estilo Musicat, no rubato).
    if codec_sample_rate != output_sample_rate {
        log::warn!(
            "⚠️ SAMPLE RATE MISMATCH: codec {} Hz vs device {} Hz",
            codec_sample_rate,
            output_sample_rate
        );
        log::warn!("⚠️ Audio puede sonar a velocidad incorrecta - el dispositivo debería haberse configurado al sample rate del archivo");
    } else {
        log::info!("✅ Sample rates match - no resampling needed");
    }

    // Para duración y otros cálculos, usamos el sample rate del codec
    let sample_rate = codec_sample_rate;

    // Calcular duración
    let duration = if let Some(n_frames) = codec_params.n_frames {
        time_base.calc_time(n_frames).seconds as f64
    } else {
        0.0
    };

    // Crear decodificador
    let decoder_opts = DecoderOptions::default();
    let decoder = symphonia::default::get_codecs()
        .make(codec_params, &decoder_opts)
        .map_err(|e| AudioError::DecodingFailed(format!("Error creando decodificador: {}", e)))?;

    let mut decoder_state = DecoderState {
        format_reader,
        decoder,
        track_id,
        time_base,
        sample_rate,
    };

    // Seek inicial si se especificó
    if let Some(seek_pos) = seek {
        seek_to_position(&mut decoder_state, seek_pos)?;
    }

    Ok((decoder_state, duration))
}

/// Salta a una posición específica
pub fn seek_to_position(ds: &mut DecoderState, position: f64) -> AudioResult<()> {
    let seek_to = SeekTo::Time {
        time: Time::new(position as u64, position.fract()),
        track_id: Some(ds.track_id),
    };

    ds.format_reader
        .seek(SeekMode::Accurate, seek_to)
        .map_err(|e| AudioError::PlaybackFailed(format!("Error en seek: {}", e)))?;

    // Reset del decodificador para limpiar buffers internos
    ds.decoder.reset();

    Ok(())
}

/// Decodifica el siguiente frame y lo escribe al ring buffer
pub fn decode_next_frame(
    ds: &mut DecoderState,
    output: &dyn AudioOutput,
) -> AudioResult<DecodeResult> {
    // Leer siguiente paquete
    let packet = match ds.format_reader.next_packet() {
        Ok(p) => p,
        Err(symphonia::core::errors::Error::IoError(e))
            if e.kind() == std::io::ErrorKind::UnexpectedEof =>
        {
            return Ok(DecodeResult::EndOfTrack);
        }
        Err(e) => {
            return Err(AudioError::DecodingFailed(format!(
                "Error leyendo paquete: {}",
                e
            )));
        }
    };

    // Ignorar paquetes de otros tracks
    if packet.track_id() != ds.track_id {
        let pos = ds.time_base.calc_time(packet.ts()).seconds as f64;
        return Ok(DecodeResult::Continue(pos));
    }

    // Decodificar
    let decoded = ds
        .decoder
        .decode(&packet)
        .map_err(|e| AudioError::DecodingFailed(format!("Error decodificando: {}", e)))?;

    // Convertir a f32 interleaved
    let spec = *decoded.spec();
    let duration = decoded.capacity() as u64;

    let mut sample_buf = SampleBuffer::<f32>::new(duration, spec);
    sample_buf.copy_interleaved_ref(decoded);

    let samples = sample_buf.samples();

    // AIDEV-NOTE: Sin resampling - confiamos en que el dispositivo está configurado
    // al sample rate correcto del archivo (ver probe_file_sample_rate + CpalAudioOutput::new)

    // Escribir al ring buffer
    // AIDEV-NOTE: Si el buffer está lleno, esto bloqueará brevemente.
    // Esto es intencional para sincronizar decode con playback.
    let producer = output.get_producer();
    let mut written = 0;
    while written < samples.len() {
        let n = producer.write(&samples[written..]).unwrap_or(0);
        if n == 0 {
            // Buffer lleno, esperar un poco
            thread::sleep(Duration::from_micros(100));
        }
        written += n;
    }

    // Calcular posición actual
    let pos = ds.time_base.calc_time(packet.ts()).seconds as f64;

    Ok(DecodeResult::Continue(pos))
}
