import { describe, it, expect } from 'vitest';
import {
  parseSettingValue,
  stringifySettingValue,
  settingsArrayToAppSettings,
  appSettingsToSettingsArray,
  DEFAULT_SETTINGS,
  type Setting,
} from './settings';

describe('settings types', () => {
  describe('parseSettingValue', () => {
    it('should parse string values', () => {
      const setting: Setting = { key: 'test', value: 'hello', valueType: 'string' };
      expect(parseSettingValue(setting)).toBe('hello');
    });

    it('should parse number values', () => {
      const setting: Setting = { key: 'test', value: '42', valueType: 'number' };
      expect(parseSettingValue(setting)).toBe(42);
    });

    it('should parse boolean true', () => {
      const setting: Setting = { key: 'test', value: 'true', valueType: 'boolean' };
      expect(parseSettingValue(setting)).toBe(true);
    });

    it('should parse boolean false', () => {
      const setting: Setting = { key: 'test', value: 'false', valueType: 'boolean' };
      expect(parseSettingValue(setting)).toBe(false);
    });

    it('should parse JSON values', () => {
      const setting: Setting = {
        key: 'test',
        value: '{"foo":"bar"}',
        valueType: 'json',
      };
      expect(parseSettingValue(setting)).toEqual({ foo: 'bar' });
    });

    it('should return null for invalid JSON', () => {
      const setting: Setting = { key: 'test', value: 'invalid json', valueType: 'json' };
      expect(parseSettingValue(setting)).toBeNull();
    });
  });

  describe('stringifySettingValue', () => {
    it('should stringify string values', () => {
      expect(stringifySettingValue('hello', 'string')).toBe('hello');
    });

    it('should stringify number values', () => {
      expect(stringifySettingValue(42, 'number')).toBe('42');
    });

    it('should stringify boolean values', () => {
      expect(stringifySettingValue(true, 'boolean')).toBe('true');
      expect(stringifySettingValue(false, 'boolean')).toBe('false');
    });

    it('should stringify JSON values', () => {
      expect(stringifySettingValue({ foo: 'bar' }, 'json')).toBe('{"foo":"bar"}');
    });
  });

  describe('settingsArrayToAppSettings', () => {
    it('should convert settings array to AppSettings', () => {
      const settings: Setting[] = [
        { key: 'ui.theme', value: 'dark', valueType: 'string' },
        { key: 'ui.language', value: 'es', valueType: 'string' },
        { key: 'ui.waveform_resolution', value: '1024', valueType: 'number' },
        { key: 'audio.sample_rate', value: '48000', valueType: 'number' },
        { key: 'library.auto_scan_on_startup', value: 'true', valueType: 'boolean' },
        { key: 'conversion.bitrate', value: '256', valueType: 'number' },
      ];

      const appSettings = settingsArrayToAppSettings(settings);

      expect(appSettings.ui.theme).toBe('dark');
      expect(appSettings.ui.language).toBe('es');
      expect(appSettings.ui.waveformResolution).toBe(1024);
      expect(appSettings.audio.sampleRate).toBe(48000);
      expect(appSettings.library.autoScanOnStartup).toBe(true);
      expect(appSettings.conversion.bitrate).toBe(256);
    });

    it('should use defaults for missing settings', () => {
      const settings: Setting[] = [
        { key: 'ui.theme', value: 'dark', valueType: 'string' },
      ];

      const appSettings = settingsArrayToAppSettings(settings);

      expect(appSettings.ui.theme).toBe('dark');
      expect(appSettings.ui.language).toBe(DEFAULT_SETTINGS.ui.language);
      expect(appSettings.audio.sampleRate).toBe(DEFAULT_SETTINGS.audio.sampleRate);
    });

    it('should handle empty settings array', () => {
      const appSettings = settingsArrayToAppSettings([]);
      expect(appSettings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('appSettingsToSettingsArray', () => {
    it('should convert AppSettings to settings array', () => {
      const settings = appSettingsToSettingsArray(DEFAULT_SETTINGS);

      expect(settings).toHaveLength(15); // AIDEV-NOTE: Actualizado de 14 a 15 por app.first_run_completed
      
      const themeSetting = settings.find((s) => s.key === 'ui.theme');
      expect(themeSetting).toBeDefined();
      expect(themeSetting?.value).toBe('system');
      expect(themeSetting?.valueType).toBe('string');

      const sampleRateSetting = settings.find((s) => s.key === 'audio.sample_rate');
      expect(sampleRateSetting).toBeDefined();
      expect(sampleRateSetting?.value).toBe('44100');
      expect(sampleRateSetting?.valueType).toBe('number');

      const autoScanSetting = settings.find((s) => s.key === 'library.auto_scan_on_startup');
      expect(autoScanSetting).toBeDefined();
      expect(autoScanSetting?.value).toBe('false');
      expect(autoScanSetting?.valueType).toBe('boolean');
    });

    it('should handle all setting categories', () => {
      const settings = appSettingsToSettingsArray(DEFAULT_SETTINGS);

      const uiSettings = settings.filter((s) => s.key.startsWith('ui.'));
      const audioSettings = settings.filter((s) => s.key.startsWith('audio.'));
      const librarySettings = settings.filter((s) => s.key.startsWith('library.'));
      const conversionSettings = settings.filter((s) => s.key.startsWith('conversion.'));

      expect(uiSettings).toHaveLength(3);
      expect(audioSettings).toHaveLength(3);
      expect(librarySettings).toHaveLength(3);
      expect(conversionSettings).toHaveLength(5);
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SETTINGS.ui.theme).toBe('system');
      expect(DEFAULT_SETTINGS.ui.language).toBe('es');
      expect(DEFAULT_SETTINGS.ui.waveformResolution).toBe(512);

      expect(DEFAULT_SETTINGS.audio.outputDevice).toBe('default');
      expect(DEFAULT_SETTINGS.audio.sampleRate).toBe(44100);
      expect(DEFAULT_SETTINGS.audio.bufferSize).toBe(2048);

      expect(DEFAULT_SETTINGS.library.autoScanOnStartup).toBe(false);
      expect(DEFAULT_SETTINGS.library.scanIntervalHours).toBe(24);
      expect(DEFAULT_SETTINGS.library.importFolder).toBe('');

      expect(DEFAULT_SETTINGS.conversion.enabled).toBe(false);
      expect(DEFAULT_SETTINGS.conversion.autoConvert).toBe(false);
      expect(DEFAULT_SETTINGS.conversion.bitrate).toBe(320);
      expect(DEFAULT_SETTINGS.conversion.outputFolder).toBe('');
      expect(DEFAULT_SETTINGS.conversion.preserveStructure).toBe(true);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve values through array -> AppSettings -> array conversion', () => {
      const originalSettings: Setting[] = [
        { key: 'ui.theme', value: 'dark', valueType: 'string' },
        { key: 'audio.sample_rate', value: '48000', valueType: 'number' },
        { key: 'library.auto_scan_on_startup', value: 'true', valueType: 'boolean' },
        { key: 'conversion.bitrate', value: '256', valueType: 'number' },
      ];

      const appSettings = settingsArrayToAppSettings(originalSettings);
      const backToArray = appSettingsToSettingsArray(appSettings);

      const theme = backToArray.find((s) => s.key === 'ui.theme');
      expect(theme?.value).toBe('dark');

      const sampleRate = backToArray.find((s) => s.key === 'audio.sample_rate');
      expect(sampleRate?.value).toBe('48000');

      const autoScan = backToArray.find((s) => s.key === 'library.auto_scan_on_startup');
      expect(autoScan?.value).toBe('true');

      const bitrate = backToArray.find((s) => s.key === 'conversion.bitrate');
      expect(bitrate?.value).toBe('256');

      // También debe preservar los valores por defecto que no fueron sobreescritos
      const bufferSize = backToArray.find((s) => s.key === 'audio.buffer_size');
      expect(bufferSize?.value).toBe(String(DEFAULT_SETTINGS.audio.bufferSize));
    });
  });
});
