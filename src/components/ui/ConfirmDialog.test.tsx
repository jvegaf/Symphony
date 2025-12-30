/**
 * Tests para componente ConfirmDialog
 * Modal genérico reutilizable para confirmaciones
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    title: "Confirmar Acción",
    message: "¿Estás seguro de realizar esta acción?",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("debería renderizar cuando isOpen es true", () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText("Confirmar Acción")).toBeInTheDocument();
    expect(screen.getByText("¿Estás seguro de realizar esta acción?")).toBeInTheDocument();
  });

  it("no debería renderizar cuando isOpen es false", () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("Confirmar Acción")).not.toBeInTheDocument();
  });

  it("debería llamar onConfirm al hacer click en confirmar", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("debería llamar onCancel al hacer click en cancelar", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("debería usar texto personalizado para botones", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmText="Eliminar"
        cancelText="Volver"
      />
    );

    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("debería aplicar variante destructiva al botón confirmar", () => {
    render(<ConfirmDialog {...defaultProps} variant="destructive" />);

    const confirmButton = screen.getByRole("button", { name: /confirmar/i });
    expect(confirmButton).toHaveClass("bg-red-600");
  });

  it("debería mostrar loading state durante confirmación", () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);

    const confirmButton = screen.getByRole("button", { name: /confirmar/i });
    expect(confirmButton).toBeDisabled();
  });
});
