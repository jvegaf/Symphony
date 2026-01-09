import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-opener";
import { ImportDialog } from "./ImportDialog";
import * as useLibraryHook from "../hooks/library";

// Mock Tauri dialog
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

const mockOpen = vi.mocked(open);

// Mock useImportLibrary hook
const mockMutate = vi.fn();
const mockUseImportLibrary = {
  mutate: mockMutate,
  progress: { current: 0, total: 0, phase: "scanning" as "scanning" | "importing" | "complete" },
  isPending: false,
  isError: false,
  error: null as Error | null,
};

vi.spyOn(useLibraryHook, "useImportLibrary").mockReturnValue(
  mockUseImportLibrary as any
);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("ImportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseImportLibrary.progress = {
      current: 0,
      total: 0,
      phase: "scanning",
    };
    mockUseImportLibrary.isPending = false;
    mockUseImportLibrary.isError = false;
    mockUseImportLibrary.error = null;
  });

  it("debería renderizar el diálogo", () => {
    render(<ImportDialog />, { wrapper: createWrapper() });

    expect(screen.getByText("Importar Biblioteca")).toBeInTheDocument();
    expect(screen.getByText("Seleccionar Carpeta")).toBeInTheDocument();
  });

  it("debería permitir seleccionar carpeta", async () => {
    mockOpen.mockResolvedValue("/test/music/folder");

    render(<ImportDialog />, { wrapper: createWrapper() });

    const selectButton = screen.getByText("Seleccionar Carpeta");
    await userEvent.click(selectButton);

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith({
        directory: true,
        multiple: false,
        title: "Seleccionar carpeta de música",
      });
    });

    expect(screen.getByText("/test/music/folder")).toBeInTheDocument();
  });

  it("debería mostrar botón de importar después de seleccionar carpeta", async () => {
    mockOpen.mockResolvedValue("/music");

    render(<ImportDialog />, { wrapper: createWrapper() });

    const selectButton = screen.getByText("Seleccionar Carpeta");
    await userEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText("Importar")).toBeInTheDocument();
    });
  });

  it("debería llamar mutate al hacer click en Importar", async () => {
    mockOpen.mockResolvedValue("/music/library");

    render(<ImportDialog />, { wrapper: createWrapper() });

    const selectButton = screen.getByText("Seleccionar Carpeta");
    await userEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText("Importar")).toBeInTheDocument();
    });

    const importButton = screen.getByText("Importar");
    await userEvent.click(importButton);

    expect(mockMutate).toHaveBeenCalledWith(
      "/music/library",
      expect.any(Object)
    );
  });

  it("debería mostrar progreso durante importación", () => {
    mockUseImportLibrary.isPending = true;
    mockUseImportLibrary.progress = {
      current: 50,
      total: 100,
      phase: "importing",
    };

    render(<ImportDialog />, { wrapper: createWrapper() });

    expect(screen.getByText("importing")).toBeInTheDocument();
    expect(screen.getByText("50 / 100")).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
  });

  it("debería calcular porcentaje de progreso correctamente", () => {
    mockUseImportLibrary.isPending = true;
    mockUseImportLibrary.progress = {
      current: 75,
      total: 150,
      phase: "importing",
    };

    render(<ImportDialog />, { wrapper: createWrapper() });

    expect(screen.getByText("50.0% completado")).toBeInTheDocument();
  });

  it("debería mostrar error si la importación falla", () => {
    mockUseImportLibrary.isError = true;
    mockUseImportLibrary.error = new Error("Ruta no encontrada");

    render(<ImportDialog />, { wrapper: createWrapper() });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Error:")).toBeInTheDocument();
    expect(screen.getByText("Ruta no encontrada")).toBeInTheDocument();
  });

  it("debería mostrar mensaje de completado", () => {
    mockUseImportLibrary.progress = {
      current: 100,
      total: 100,
      phase: "complete",
    };

    render(<ImportDialog />, { wrapper: createWrapper() });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("✓ Importación completada")).toBeInTheDocument();
  });

  it("debería llamar onComplete callback al completar", async () => {
    const onComplete = vi.fn();
    mockOpen.mockResolvedValue("/music");

    render(<ImportDialog onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    const selectButton = screen.getByText("Seleccionar Carpeta");
    await userEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText("Importar")).toBeInTheDocument();
    });

    const importButton = screen.getByText("Importar");
    await userEvent.click(importButton);

    // Simular éxito
    const mutateCall = mockMutate.mock.calls[0];
    const options = mutateCall[1];
    options.onSuccess({ imported: 95, failed: 5, totalFiles: 100, durationSecs: 45 });

    expect(onComplete).toHaveBeenCalledWith({ 
      imported: 95, 
      failed: 5, 
      totalFiles: 100, 
      durationSecs: 45 
    });
  });

  it("debería llamar onError callback en error", async () => {
    const onError = vi.fn();
    mockOpen.mockResolvedValue("/invalid");

    render(<ImportDialog onError={onError} />, { wrapper: createWrapper() });

    const selectButton = screen.getByText("Seleccionar Carpeta");
    await userEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText("Importar")).toBeInTheDocument();
    });

    const importButton = screen.getByText("Importar");
    await userEvent.click(importButton);

    // Simular error
    const mutateCall = mockMutate.mock.calls[0];
    const options = mutateCall[1];
    const error = new Error("Path not found");
    options.onError(error);

    expect(onError).toHaveBeenCalledWith(error);
  });

  it("debería deshabilitar botón durante importación", () => {
    mockUseImportLibrary.isPending = true;

    render(<ImportDialog />, { wrapper: createWrapper() });

    const selectButton = screen.getByText("Seleccionar Carpeta");
    expect(selectButton).toBeDisabled();
  });

  it("no debería importar si no hay carpeta seleccionada", async () => {
    render(<ImportDialog />, { wrapper: createWrapper() });

    // No hay botón de Importar sin carpeta seleccionada
    expect(screen.queryByText("Importar")).not.toBeInTheDocument();
  });

  it("debería manejar cancelación de selección de carpeta", async () => {
    mockOpen.mockResolvedValue(null); // Usuario cancela

    render(<ImportDialog />, { wrapper: createWrapper() });

    const selectButton = screen.getByText("Seleccionar Carpeta");
    await userEvent.click(selectButton);

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalled();
    });

    // No debería mostrar path ni botón de importar
    expect(screen.queryByText("Importar")).not.toBeInTheDocument();
  });
});
