export interface SettingsToggleProps {
  /** ID del elemento para accesibilidad */
  id: string;
  /** Etiqueta principal del toggle */
  label: string;
  /** Descripción opcional mostrada debajo */
  description?: string;
  /** Estado actual del toggle */
  checked: boolean;
  /** Callback cuando cambia el estado */
  onChange: (checked: boolean) => void;
  /** Deshabilita el toggle */
  disabled?: boolean;
  /** Color del tema (default: emerald) */
  color?: 'emerald' | 'cyan' | 'blue' | 'purple' | 'pink';
}

/**
 * Componente de toggle switch moderno para configuraciones booleanas
 */
export const SettingsToggle = ({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  color = 'emerald',
}: SettingsToggleProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label
          htmlFor={id}
          className={`text-sm font-medium ${disabled ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}
        >
          {label}
        </label>
        {description && (
          <p className={`text-xs mt-1 ${disabled ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
            {description}
          </p>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-${color}-300 dark:peer-focus:ring-${color}-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-${color}-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed`}></div>
      </label>
    </div>
  );
};
