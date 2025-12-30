//! Estado interno del decodificador

/// Estado del decodificador
pub struct DecoderState {
    pub format_reader: Box<dyn symphonia::core::formats::FormatReader>,
    pub decoder: Box<dyn symphonia::core::codecs::Decoder>,
    pub track_id: u32,
    pub time_base: symphonia::core::units::TimeBase,
    pub sample_rate: u32,
}

/// Resultado de decodificación
pub enum DecodeResult {
    /// Continuar decodificando (con posición actual en segundos)
    Continue(f64),
    /// Fin del track
    EndOfTrack,
}
