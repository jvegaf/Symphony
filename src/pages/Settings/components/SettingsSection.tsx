import type { ReactNode } from 'react';

export interface SettingsSectionProps {
  /** Título de la sección */
  title: string;
  /** Icono SVG para mostrar en el header */
  icon: ReactNode;
  /** Color del gradiente (de izq a der) - ejemplo: 'purple' genera from-purple-500/10 to-blue-500/10 */
  gradientFrom: string;
  /** Color del gradiente final */
  gradientTo: string;
  /** Contenido de la sección */
  children: ReactNode;
  /** Clases adicionales para el container */
  className?: string;
}

/**
 * Componente reutilizable para secciones de Settings
 * Proporciona un card consistente con header gradiente y estilos modernos
 */
export const SettingsSection = ({
  title,
  icon,
  gradientFrom,
  gradientTo,
  children,
  className = '',
}: SettingsSectionProps) => {
  return (
    <div className={`w-full bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r from-${gradientFrom}-500/10 to-${gradientTo}-500/10 dark:from-${gradientFrom}-500/20 dark:to-${gradientTo}-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 bg-${gradientFrom}-500/20 rounded-lg`}>
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};
