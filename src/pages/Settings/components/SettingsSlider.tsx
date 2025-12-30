export interface SettingsSliderProps {
  /** ID del elemento para accesibilidad */
  id: string;
  /** Etiqueta del slider */
  label: string;
  /** Valor actual */
  value: number;
  /** Callback cuando cambia el valor */
  onChange: (value: number) => void;
  /** Valor mínimo */
  min: number;
  /** Valor máximo */
  max: number;
  /** Step del slider */
  step: number;
  /** Etiqueta para valor mínimo */
  minLabel: string;
  /** Etiqueta para valor máximo */
  maxLabel: string;
  /** Descripción opcional */
  description?: string;
  /** Unidad mostrada junto al valor (ej: 'h', 'Hz', 'samples') */
  unit?: string;
  /** Color del tema */
  color?: 'blue' | 'emerald' | 'purple';
  /** Deshabilitado */
  disabled?: boolean;
}

/**
 * Slider estilizado para ajustes numéricos con feedback visual
 */
export const SettingsSlider = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  description,
  unit = '',
  color = 'blue',
  disabled = false,
}: SettingsSliderProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className={`px-3 py-1 bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 rounded-full text-sm font-mono font-semibold`}>
          {value}{unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={`w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${color}-600 disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{description}</span>
        </p>
      )}
    </div>
  );
};
