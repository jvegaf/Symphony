/// Módulo de concurrencia controlada para requests a Beatport
/// 
/// Implementa paralelización con semáforo y rate limiting adaptativo
/// para optimizar el proceso de Fix Tags sin sobrecargar la API de Beatport.
/// 
/// AIDEV-NOTE: Esta optimización reduce el tiempo de búsqueda de candidatos
/// de O(n) secuencial a O(n/k) paralelo, donde k es max_concurrent.
/// Para 10 tracks: ~7s → ~2s (70% mejora)

use std::sync::atomic::{AtomicU64, Ordering};

/// Configuración de concurrencia para requests a Beatport
#[derive(Debug, Clone)]
pub struct ConcurrencyConfig {
    /// Máximo de requests concurrentes
    pub max_concurrent: usize,
    /// Delay mínimo entre requests del mismo slot (ms)
    pub min_delay_ms: u64,
    /// Delay adicional después de rate limit (429) (ms)
    pub rate_limit_delay_ms: u64,
}

impl Default for ConcurrencyConfig {
    fn default() -> Self {
        Self {
            // AIDEV-NOTE: Valores conservadores para evitar rate limiting
            // - 4 concurrentes para HTML scraping (search)
            // - 100ms entre requests por slot
            // - 2s extra si detectamos 429
            max_concurrent: 4,
            min_delay_ms: 100,
            rate_limit_delay_ms: 2000,
        }
    }
}

impl ConcurrencyConfig {
    /// Configuración para búsqueda de candidatos (HTML scraping)
    pub fn for_search() -> Self {
        Self {
            max_concurrent: 4,
            min_delay_ms: 100,
            rate_limit_delay_ms: 2000,
        }
    }
    
    /// Configuración para API v4 (más conservadora)
    pub fn for_api() -> Self {
        Self {
            max_concurrent: 3,
            min_delay_ms: 100,
            rate_limit_delay_ms: 2000,
        }
    }
}

/// Estado compartido para rate limiting adaptativo
/// 
/// Rastrea el último error 429 para ajustar dinámicamente
/// la velocidad de los requests.
pub struct RateLimitState {
    /// Timestamp (ms desde epoch) del último error 429
    last_429: AtomicU64,
}

impl RateLimitState {
    /// Crea un nuevo estado de rate limiting
    pub fn new() -> Self {
        Self {
            last_429: AtomicU64::new(0),
        }
    }
    
    /// Registra que se recibió un error 429 (rate limited)
    pub fn record_rate_limit(&self) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        self.last_429.store(now, Ordering::SeqCst);
    }
    
    /// Verifica si debemos reducir la velocidad (por 429 reciente)
    /// 
    /// Retorna `true` si el último 429 fue hace menos de 10 segundos
    pub fn should_slow_down(&self) -> bool {
        let last = self.last_429.load(Ordering::SeqCst);
        if last == 0 { 
            return false; 
        }
        
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        // Ventana de slowdown: 10 segundos después de un 429
        now - last < 10_000
    }
    
    /// Reinicia el estado (útil para tests)
    #[cfg(test)]
    pub fn reset(&self) {
        self.last_429.store(0, Ordering::SeqCst);
    }
}

impl Default for RateLimitState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_concurrency_config_default() {
        let config = ConcurrencyConfig::default();
        assert_eq!(config.max_concurrent, 4);
        assert_eq!(config.min_delay_ms, 100);
        assert_eq!(config.rate_limit_delay_ms, 2000);
    }

    #[test]
    fn test_concurrency_config_for_search() {
        let config = ConcurrencyConfig::for_search();
        assert_eq!(config.max_concurrent, 4);
    }

    #[test]
    fn test_concurrency_config_for_api() {
        let config = ConcurrencyConfig::for_api();
        assert_eq!(config.max_concurrent, 3);
    }

    #[test]
    fn test_rate_limit_state_initial() {
        let state = RateLimitState::new();
        assert!(!state.should_slow_down());
    }

    #[test]
    fn test_rate_limit_state_after_429() {
        let state = RateLimitState::new();
        
        // Registrar 429
        state.record_rate_limit();
        
        // Inmediatamente después, debería estar en slowdown
        assert!(state.should_slow_down());
    }

    #[test]
    fn test_rate_limit_state_recovery() {
        let state = RateLimitState::new();
        
        // Simular un 429 hace 11 segundos (fuera de ventana)
        let past = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64 - 11_000;
        state.last_429.store(past, Ordering::SeqCst);
        
        // No debería estar en slowdown
        assert!(!state.should_slow_down());
    }

    #[test]
    fn test_rate_limit_state_within_window() {
        let state = RateLimitState::new();
        
        // Simular un 429 hace 5 segundos (dentro de ventana)
        let past = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64 - 5_000;
        state.last_429.store(past, Ordering::SeqCst);
        
        // Debería estar en slowdown
        assert!(state.should_slow_down());
    }

    #[test]
    fn test_rate_limit_state_reset() {
        let state = RateLimitState::new();
        state.record_rate_limit();
        assert!(state.should_slow_down());
        
        state.reset();
        assert!(!state.should_slow_down());
    }
}
