/// Lógica de merge de tags de Beatport con metadatos locales
/// 
/// Reglas de merge:
/// - Title: Siempre se aplica (corrige nombres mal escritos)
/// - Artist: Siempre se aplica (corrige artistas incorrectos)
/// - Genre: Siempre se aplica (corrige géneros incorrectos)
/// - Key: Siempre se aplica (reemplaza el existente)
/// - Album: Siempre se aplica (corrige álbumes)
/// - Year: Siempre se aplica (corrige años)
/// - BPM: Solo se aplica si el track local NO tiene BPM
/// - Label, ISRC: Siempre se aplican (generalmente no existen en local)
/// - Artwork: Siempre se aplica si está disponible

use super::super::models::BeatportTags;

/// Aplica la lógica de merge de tags
/// 
/// # Arguments
/// * `beatport` - Tags de Beatport a aplicar
/// * `local_bpm` - BPM actual del track local (si existe)
/// * `_local_genre` - Género local (ignorado - siempre aplicamos de Beatport)
/// * `_local_album` - Álbum local (ignorado - siempre aplicamos de Beatport)
/// * `_local_year` - Año local (ignorado - siempre aplicamos de Beatport)
/// 
/// # Returns
/// Tags merged según las reglas establecidas
pub fn merge_tags(
    beatport: &BeatportTags,
    local_bpm: Option<f64>,
    _local_genre: Option<&str>,  // Ignorado - siempre aplicamos genre de Beatport
    _local_album: Option<&str>,  // Ignorado - siempre aplicamos album de Beatport
    _local_year: Option<i32>,    // Ignorado - siempre aplicamos year de Beatport
) -> BeatportTags {
    BeatportTags {
        // Title: Siempre se aplica (corrige nombres)
        title: beatport.title.clone(),
        // Artist: Siempre se aplica (corrige artistas)
        artist: beatport.artist.clone(),
        // BPM: Solo si local no tiene
        bpm: if local_bpm.is_some() {
            None
        } else {
            beatport.bpm
        },
        // Key: Siempre se aplica
        key: beatport.key.clone(),
        // Genre: Siempre se aplica (corrige géneros incorrectos)
        genre: beatport.genre.clone(),
        // Album: Siempre se aplica (corrige álbumes)
        album: beatport.album.clone(),
        // Year: Siempre se aplica (corrige años)
        year: beatport.year,
        // Label: Siempre se aplica (generalmente no hay en local)
        label: beatport.label.clone(),
        // ISRC: Siempre se aplica (generalmente no hay en local)
        isrc: beatport.isrc.clone(),
        // Catalog: Siempre se aplica
        catalog_number: beatport.catalog_number.clone(),
        // Artwork: Siempre se aplica si disponible
        artwork_url: beatport.artwork_url.clone(),
        artwork_data: beatport.artwork_data.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_tags_bpm_preserved() {
        let beatport = BeatportTags {
            title: Some("Test Track".to_string()),
            artist: Some("Test Artist".to_string()),
            bpm: Some(128.0),
            key: Some("A minor".to_string()),
            genre: Some("Techno".to_string()),
            label: None,
            album: Some("Test Album".to_string()),
            year: Some(2024),
            isrc: None,
            catalog_number: None,
            artwork_url: None,
            artwork_data: None,
        };

        // Si local tiene BPM, se ignora el de Beatport
        let merged = merge_tags(&beatport, Some(125.0), None, None, None);
        assert!(merged.bpm.is_none()); // BPM de Beatport no se aplica
        assert_eq!(merged.key, Some("A minor".to_string())); // Key siempre se aplica
        assert_eq!(merged.title, Some("Test Track".to_string())); // Title siempre se aplica
        assert_eq!(merged.artist, Some("Test Artist".to_string())); // Artist siempre se aplica
        assert_eq!(merged.genre, Some("Techno".to_string())); // Genre siempre se aplica
        assert_eq!(merged.album, Some("Test Album".to_string())); // Album siempre se aplica
        assert_eq!(merged.year, Some(2024)); // Year siempre se aplica
    }

    #[test]
    fn test_merge_tags_bpm_applied() {
        let beatport = BeatportTags {
            title: None,
            artist: None,
            bpm: Some(128.0),
            key: Some("A minor".to_string()),
            genre: None,
            label: None,
            album: None,
            year: None,
            isrc: None,
            catalog_number: None,
            artwork_url: None,
            artwork_data: None,
        };

        // Si local NO tiene BPM, se aplica el de Beatport
        let merged = merge_tags(&beatport, None, None, None, None);
        assert_eq!(merged.bpm, Some(128.0));
    }

    #[test]
    fn test_merge_tags_key_always_applied() {
        let beatport = BeatportTags {
            title: None,
            artist: None,
            bpm: None,
            key: Some("8A".to_string()),
            genre: None,
            label: None,
            album: None,
            year: None,
            isrc: None,
            catalog_number: None,
            artwork_url: None,
            artwork_data: None,
        };

        // Key siempre se aplica, independiente del valor local
        let merged = merge_tags(&beatport, None, None, None, None);
        assert_eq!(merged.key, Some("8A".to_string()));
    }

    #[test]
    fn test_merge_tags_all_always_applied() {
        let beatport = BeatportTags {
            title: Some("Correct Title".to_string()),
            artist: Some("Correct Artist".to_string()),
            bpm: None,
            key: None,
            genre: Some("Techno".to_string()),
            label: None,
            album: Some("Correct Album".to_string()),
            year: Some(2024),
            isrc: None,
            catalog_number: None,
            artwork_url: None,
            artwork_data: None,
        };

        // Todos estos campos siempre se aplican, incluso si local tiene valores
        let merged = merge_tags(
            &beatport,
            None,
            Some("House"),
            Some("Old Album"),
            Some(2020),
        );
        assert_eq!(merged.title, Some("Correct Title".to_string()));
        assert_eq!(merged.artist, Some("Correct Artist".to_string()));
        assert_eq!(merged.genre, Some("Techno".to_string()));
        assert_eq!(merged.album, Some("Correct Album".to_string()));
        assert_eq!(merged.year, Some(2024));
    }
}
