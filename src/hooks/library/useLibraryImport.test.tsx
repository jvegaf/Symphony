/**
 * Tests para useLibraryImport
 * TDD: Tests escritos primero antes de implementación
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ImportProgress, ImportResult } from "../../types/library";
import { useImportLibrary } from "./useLibraryImport";

// Mock Tauri
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useImportLibrary", () => {
  let unlistenProgressMock: ReturnType<typeof vi.fn>;
  let unlistenCompleteMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    unlistenProgressMock = vi.fn();
    unlistenCompleteMock = vi.fn();

    // Mock de listen que devuelve unlisten functions
    vi.mocked(listen).mockImplementation(
      (event: string, _handler: unknown): Promise<() => void> => {
        if (event === "library:import-progress") {
          return Promise.resolve(unlistenProgressMock as unknown as () => void);
        }
        if (event === "library:import-complete") {
          return Promise.resolve(unlistenCompleteMock as unknown as () => void);
        }
        return Promise.resolve(() => {});
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("debe importar biblioteca correctamente", async () => {
    const mockResult: ImportResult = {
      totalFiles: 100,
      imported: 95,
      failed: 5,
      durationSecs: 10.5,
    };

    vi.mocked(invoke).mockResolvedValue(mockResult);

    const { result } = renderHook(() => useImportLibrary(), {
      wrapper: createWrapper(),
    });

    // Estado inicial del progreso
    expect(result.current.progress).toEqual({
      current: 0,
      total: 0,
      phase: "scanning",
    });

    result.current.mutate("/path/to/music");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith("import_library", {
      path: "/path/to/music",
    });

    expect(result.current.data).toEqual(mockResult);

    // El progreso debe resetearse después de éxito
    expect(result.current.progress.phase).toBe("complete");
  });

  it("debe configurar listeners de eventos al montar", async () => {
    renderHook(() => useImportLibrary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(listen).toHaveBeenCalledWith(
        "library:import-progress",
        expect.any(Function)
      );
      expect(listen).toHaveBeenCalledWith(
        "library:import-complete",
        expect.any(Function)
      );
    });
  });

  it("debe actualizar progreso cuando recibe eventos", async () => {
    let progressCallback: ((event: { payload: ImportProgress }) => void) | undefined;

    vi.mocked(listen).mockImplementation((event: string, callback) => {
      if (event === "library:import-progress") {
        progressCallback = callback as any;
      }
      return Promise.resolve(vi.fn());
    });

    const { result } = renderHook(() => useImportLibrary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(progressCallback).toBeDefined());

    // Simular evento de progreso
    const progressPayload: ImportProgress = {
      current: 50,
      total: 100,
      phase: "importing",
    };

    progressCallback?.({ payload: progressPayload } as any);

    await waitFor(() => {
      expect(result.current.progress).toEqual(progressPayload);
    });
  });

  it("debe invalidar queries de tracks al completar importación", async () => {
    let completeCallback: (() => void) | undefined;

    vi.mocked(listen).mockImplementation((event: string, callback) => {
      if (event === "library:import-complete") {
        completeCallback = callback as any;
      }
      return Promise.resolve(vi.fn());
    });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useImportLibrary(), { wrapper });

    await waitFor(() => expect(completeCallback).toBeDefined());

    // Simular evento de completado
    completeCallback?.();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tracks"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["library-stats"] });
    });
  });

  it("debe limpiar listeners al desmontar", async () => {
    const { unmount } = renderHook(() => useImportLibrary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(listen).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(unlistenProgressMock).toHaveBeenCalled();
      expect(unlistenCompleteMock).toHaveBeenCalled();
    });
  });

  it("debe manejar errores de importación", async () => {
    const error = new Error("Import failed");
    vi.mocked(invoke).mockRejectedValue(error);

    const { result } = renderHook(() => useImportLibrary(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("/invalid/path");

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});
