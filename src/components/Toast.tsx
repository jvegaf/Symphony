import { useEffect, useState } from "react";

/**
 * Propiedades del componente Toast
 */
export interface ToastProps {
  /** Mensaje a mostrar */
  message: string;
  /** Tipo de toast (error, success, info, warning) */
  type?: "error" | "success" | "info" | "warning";
  /** Duración en milisegundos (0 = permanente) */
  duration?: number;
  /** Callback al cerrar */
  onClose?: () => void;
}

/**
 * Componente Toast para notificaciones
 * 
 * Muestra notificaciones temporales en la esquina superior derecha.
 * Se cierra automáticamente después de la duración especificada.
 * 
 * @example
 * ```tsx
 * <Toast 
 *   message="Error al reproducir archivo" 
 *   type="error" 
 *   duration={5000}
 *   onClose={() => setError(null)}
 * />
 * ```
 */
export function Toast({ message, type = "info", duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [duration, onClose]);

  if (!isVisible) {
    return null;
  }

  const bgColorClass = {
    error: "bg-red-600",
    success: "bg-green-600",
    info: "bg-blue-600",
    warning: "bg-yellow-600",
  }[type];

  const iconClass = {
    error: "❌",
    success: "✅",
    info: "ℹ️",
    warning: "⚠️",
  }[type];

  return (
    <div className="fixed right-4 top-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-3 rounded-lg ${bgColorClass} px-4 py-3 text-white shadow-lg`}>
        <span className="text-lg">{iconClass}</span>
        <p className="text-sm font-medium">{message}</p>
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="ml-2 text-white/80 transition-colors hover:text-white"
          aria-label="Cerrar notificación"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
