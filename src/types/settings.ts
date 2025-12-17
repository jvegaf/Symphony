/**
 * Modelo de setting individual
 */
export interface Setting {
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
}

/**
 * Settings agrupados por categoría
 */
export interface AppSettings {
  ui: UISettings;
  audio: AudioSettings;
  library: LibrarySettings;
  conversion: ConversionSettings;
}

/**
 * Configuración de interfaz de usuario
 */
export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  waveformResolution: number;
}

/**
 * Configuración de audio
 */
export interface AudioSettings {
  outputDevice: string;
  sampleRate: 44100 | 48000 | 96000;
  bufferSize: number;
}

/**
 * Configuración de biblioteca
 */
export interface LibrarySettings {
  autoScanOnStartup: boolean;
  scanIntervalHours: number;
  importFolder: string;
}

/**
 * Configuración de conversión MP3
 */
export interface ConversionSettings {
  enabled: boolean;
  autoConvert: boolean;
  bitrate: 128 | 192 | 256 | 320;
  outputFolder: string;
  preserveStructure: boolean;
}

/**
 * Opciones de conversión para un proceso específico
 */
export interface ConversionOptions {
  bitrate: 128 | 192 | 256 | 320;
  outputFolder: string;
  preserveStructure: boolean;
}

/**
 * Resultado de conversión de un archivo
 */
export interface ConversionResult {
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

/**
 * Progreso de conversión en tiempo real
 */
export interface ConversionProgress {
  currentFile: string;
  currentIndex: number;
  totalFiles: number;
  percentage: number;
  status: 'starting' | 'converting' | 'complete' | 'failed';
}

/**
 * Valores por defecto para settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  ui: {
    theme: 'system',
    language: 'es',
    waveformResolution: 512,
  },
  audio: {
    outputDevice: 'default',
    sampleRate: 44100,
    bufferSize: 2048,
  },
  library: {
    autoScanOnStartup: false,
    scanIntervalHours: 24,
    importFolder: '',
  },
  conversion: {
    enabled: false,
    autoConvert: false,
    bitrate: 320,
    outputFolder: '',
    preserveStructure: true,
  },
};

/**
 * Helper para parsear el valor de un setting según su tipo
 */
export function parseSettingValue(setting: Setting): unknown {
  switch (setting.valueType) {
    case 'number':
      return Number(setting.value);
    case 'boolean':
      return setting.value === 'true';
    case 'json':
      try {
        return JSON.parse(setting.value);
      } catch {
        return null;
      }
    default:
      return setting.value;
  }
}

/**
 * Helper para convertir un valor a string según su tipo
 */
export function stringifySettingValue(value: unknown, valueType: Setting['valueType']): string {
  if (valueType === 'json') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Helper para convertir array de Settings a AppSettings
 */
export function settingsArrayToAppSettings(settings: Setting[]): AppSettings {
  // AIDEV-NOTE: Deep copy para evitar mutación del objeto DEFAULT_SETTINGS
  const result: AppSettings = {
    ui: { ...DEFAULT_SETTINGS.ui },
    audio: { ...DEFAULT_SETTINGS.audio },
    library: { ...DEFAULT_SETTINGS.library },
    conversion: { ...DEFAULT_SETTINGS.conversion },
  };

  // AIDEV-NOTE: Las keys en la DB usan snake_case (ej: waveform_resolution)
  // pero las propiedades TypeScript usan camelCase (waveformResolution)
  const keyMap: Record<string, { category: keyof AppSettings; field: string }> = {
    'ui.theme': { category: 'ui', field: 'theme' },
    'ui.language': { category: 'ui', field: 'language' },
    'ui.waveform_resolution': { category: 'ui', field: 'waveformResolution' },
    'audio.output_device': { category: 'audio', field: 'outputDevice' },
    'audio.sample_rate': { category: 'audio', field: 'sampleRate' },
    'audio.buffer_size': { category: 'audio', field: 'bufferSize' },
    'library.auto_scan_on_startup': { category: 'library', field: 'autoScanOnStartup' },
    'library.scan_interval_hours': { category: 'library', field: 'scanIntervalHours' },
    'library.import_folder': { category: 'library', field: 'importFolder' },
    'conversion.enabled': { category: 'conversion', field: 'enabled' },
    'conversion.auto_convert': { category: 'conversion', field: 'autoConvert' },
    'conversion.bitrate': { category: 'conversion', field: 'bitrate' },
    'conversion.output_folder': { category: 'conversion', field: 'outputFolder' },
    'conversion.preserve_structure': { category: 'conversion', field: 'preserveStructure' },
  };

  settings.forEach((setting) => {
    const mapping = keyMap[setting.key];
    if (mapping) {
      const value = parseSettingValue(setting);
      // @ts-expect-error - Dynamic key access
      result[mapping.category][mapping.field] = value;
    }
  });

  return result;
}

/**
 * Helper para convertir AppSettings a array de Settings
 */
export function appSettingsToSettingsArray(appSettings: AppSettings): Setting[] {
  const settings: Setting[] = [];

  // UI settings
  settings.push(
    { key: 'ui.theme', value: appSettings.ui.theme, valueType: 'string' },
    { key: 'ui.language', value: appSettings.ui.language, valueType: 'string' },
    { key: 'ui.waveform_resolution', value: String(appSettings.ui.waveformResolution), valueType: 'number' }
  );

  // Audio settings
  settings.push(
    { key: 'audio.output_device', value: appSettings.audio.outputDevice, valueType: 'string' },
    { key: 'audio.sample_rate', value: String(appSettings.audio.sampleRate), valueType: 'number' },
    { key: 'audio.buffer_size', value: String(appSettings.audio.bufferSize), valueType: 'number' }
  );

  // Library settings
  settings.push(
    { key: 'library.auto_scan_on_startup', value: String(appSettings.library.autoScanOnStartup), valueType: 'boolean' },
    { key: 'library.scan_interval_hours', value: String(appSettings.library.scanIntervalHours), valueType: 'number' },
    { key: 'library.import_folder', value: appSettings.library.importFolder, valueType: 'string' }
  );

  // Conversion settings
  settings.push(
    { key: 'conversion.enabled', value: String(appSettings.conversion.enabled), valueType: 'boolean' },
    { key: 'conversion.auto_convert', value: String(appSettings.conversion.autoConvert), valueType: 'boolean' },
    { key: 'conversion.bitrate', value: String(appSettings.conversion.bitrate), valueType: 'number' },
    { key: 'conversion.output_folder', value: appSettings.conversion.outputFolder, valueType: 'string' },
    { key: 'conversion.preserve_structure', value: String(appSettings.conversion.preserveStructure), valueType: 'boolean' }
  );

  return settings;
}
