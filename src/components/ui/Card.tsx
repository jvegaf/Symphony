import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

/**
 * Componente Card para agrupar contenido relacionado
 * @component
 * @example
 * <Card title="Detalles">
 *   <p>Contenido de la tarjeta</p>
 * </Card>
 */
export const Card: React.FC<CardProps> = ({ children, className, title }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800',
        className
      )}
    >
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
};

Card.displayName = 'Card';
