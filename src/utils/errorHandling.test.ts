/**
 * Tests para utilidades de manejo de errores
 * @module utils/errorHandling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logError,
  createAppError,
  isAppError,
  formatErrorMessage,
  handleAsyncError,
  ErrorCode,
  ErrorSeverity,
} from "./errorHandling";

describe("errorHandling", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("ErrorCode", () => {
    it("debería exportar códigos de error", () => {
      expect(ErrorCode.UNKNOWN).toBe("UNKNOWN");
      expect(ErrorCode.NETWORK).toBe("NETWORK");
      expect(ErrorCode.DATABASE).toBe("DATABASE");
      expect(ErrorCode.AUDIO).toBe("AUDIO");
      expect(ErrorCode.FILE_NOT_FOUND).toBe("FILE_NOT_FOUND");
      expect(ErrorCode.PERMISSION_DENIED).toBe("PERMISSION_DENIED");
      expect(ErrorCode.VALIDATION).toBe("VALIDATION");
      expect(ErrorCode.TAURI_IPC).toBe("TAURI_IPC");
    });
  });

  describe("createAppError", () => {
    it("debería crear error con código y mensaje", () => {
      const error = createAppError(ErrorCode.DATABASE, "Error de base de datos");

      expect(error.code).toBe(ErrorCode.DATABASE);
      expect(error.message).toBe("Error de base de datos");
      expect(error.severity).toBe("error");
      expect(error.timestamp).toBeDefined();
    });

    it("debería permitir especificar severidad", () => {
      const error = createAppError(ErrorCode.VALIDATION, "Campo requerido", {
        severity: "warning",
      });

      expect(error.severity).toBe("warning");
    });

    it("debería permitir agregar contexto adicional", () => {
      const error = createAppError(ErrorCode.FILE_NOT_FOUND, "Archivo no existe", {
        context: { path: "/music/song.mp3" },
      });

      expect(error.context).toEqual({ path: "/music/song.mp3" });
    });

    it("debería permitir agregar causa original", () => {
      const originalError = new Error("Original");
      const error = createAppError(ErrorCode.UNKNOWN, "Wrapped", {
        cause: originalError,
      });

      expect(error.cause).toBe(originalError);
    });
  });

  describe("isAppError", () => {
    it("debería retornar true para AppError", () => {
      const appError = createAppError(ErrorCode.NETWORK, "Error de red");
      expect(isAppError(appError)).toBe(true);
    });

    it("debería retornar false para Error nativo", () => {
      const nativeError = new Error("Error nativo");
      expect(isAppError(nativeError)).toBe(false);
    });

    it("debería retornar false para objetos no-error", () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError("string error")).toBe(false);
      expect(isAppError({ message: "fake" })).toBe(false);
    });
  });

  describe("logError", () => {
    it("debería loguear error con contexto", () => {
      logError("TestModule", "Operación fallida", new Error("Test"));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "TestModule:",
        "Operación fallida",
        expect.any(Error)
      );
    });

    it("debería loguear error sin Error object", () => {
      logError("TestModule", "Mensaje simple");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "TestModule:",
        "Mensaje simple",
        undefined
      );
    });

    it("debería loguear AppError con detalles adicionales", () => {
      const appError = createAppError(ErrorCode.DATABASE, "DB Error", {
        context: { table: "tracks" },
      });

      logError("DBModule", "Fallo en query", appError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "DBModule:",
        "Fallo en query",
        expect.objectContaining({
          code: ErrorCode.DATABASE,
          context: { table: "tracks" },
        })
      );
    });
  });

  describe("formatErrorMessage", () => {
    it("debería formatear Error nativo", () => {
      const error = new Error("Test message");
      expect(formatErrorMessage(error)).toBe("Test message");
    });

    it("debería formatear AppError con código", () => {
      const error = createAppError(ErrorCode.NETWORK, "Sin conexión");
      expect(formatErrorMessage(error)).toBe("[NETWORK] Sin conexión");
    });

    it("debería formatear string", () => {
      expect(formatErrorMessage("String error")).toBe("String error");
    });

    it("debería formatear unknown", () => {
      expect(formatErrorMessage(null)).toBe("Error desconocido");
      expect(formatErrorMessage(undefined)).toBe("Error desconocido");
      expect(formatErrorMessage(123)).toBe("Error desconocido");
    });
  });

  describe("handleAsyncError", () => {
    it("debería ejecutar función sin error", async () => {
      const result = await handleAsyncError(
        async () => "success",
        "TestModule"
      );

      expect(result).toBe("success");
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("debería capturar y loguear error", async () => {
      const result = await handleAsyncError(
        async () => {
          throw new Error("Async error");
        },
        "TestModule",
        "fallback"
      );

      expect(result).toBe("fallback");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("debería retornar undefined si no hay fallback", async () => {
      const result = await handleAsyncError(
        async () => {
          throw new Error("Error");
        },
        "TestModule"
      );

      expect(result).toBeUndefined();
    });

    it("debería llamar callback onError si se provee", async () => {
      const onError = vi.fn();

      await handleAsyncError(
        async () => {
          throw new Error("Custom error");
        },
        "TestModule",
        undefined,
        onError
      );

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("ErrorSeverity", () => {
    it("debería tener niveles de severidad", () => {
      expect(ErrorSeverity.INFO).toBe("info");
      expect(ErrorSeverity.WARNING).toBe("warning");
      expect(ErrorSeverity.ERROR).toBe("error");
      expect(ErrorSeverity.CRITICAL).toBe("critical");
    });
  });
});
