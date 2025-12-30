//! Conversión de audio a mono

use symphonia::core::audio::{AudioBufferRef, Signal};

/// Convierte AudioBufferRef a mono (promedio de canales)
pub fn convert_to_mono(audio_buf: &AudioBufferRef) -> Vec<f32> {
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
