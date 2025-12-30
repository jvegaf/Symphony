/**
 * ConfirmDialog - Modal genérico de confirmación
 * Reutilizable para cualquier acción que requiera confirmación
 */
import React from "react";
import { Card } from "./Card";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  /** Si el diálogo está visible */
  isOpen: boolean;
  /** Título del diálogo */
  title: string;
  /** Mensaje de confirmación */
  message: string;
  /** Callback al confirmar */
  onConfirm: () => void;
  /** Callback al cancelar */
  onCancel: () => void;
  /** Texto del botón confirmar (default: "Confirmar") */
  confirmText?: string;
  /** Texto del botón cancelar (default: "Cancelar") */
  cancelText?: string;
  /** Variante visual (default o destructive) */
  variant?: "default" | "destructive";
  /** Estado de carga durante confirmación */
  isLoading?: boolean;
}

/**
 * Modal de confirmación reutilizable
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  isLoading = false,
}) => {
  if (!isOpen) {
    return null;
  }

  const confirmButtonClass =
    variant === "destructive"
      ? "bg-red-600 hover:bg-red-700"
      : "";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <p className="mb-6 text-gray-600 dark:text-gray-400">{message}</p>
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
            className={confirmButtonClass}
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};

ConfirmDialog.displayName = "ConfirmDialog";
