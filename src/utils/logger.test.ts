/**
 * Tests para Logger con Dependency Inversion Principle (DIP)
 * 
 * Verifica la abstracción de logging que permite:
 * - Inyección de dependencias
 * - Testing sin side effects
 * - Diferentes niveles de log
 * - Contexto estructurado
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  type Logger,
  type LogContext,
  createLogger,
  createConsoleLogger,
  createNullLogger,
  setGlobalLogger,
  getGlobalLogger,
  resetGlobalLogger,
  log,
} from "./logger";

describe("Logger DIP", () => {
  beforeEach(() => {
    resetGlobalLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Logger interface", () => {
    it("debería definir métodos para cada nivel de log", () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      mockLogger.debug("debug message");
      mockLogger.info("info message");
      mockLogger.warn("warn message");
      mockLogger.error("error message");

      expect(mockLogger.debug).toHaveBeenCalledWith("debug message");
      expect(mockLogger.info).toHaveBeenCalledWith("info message");
      expect(mockLogger.warn).toHaveBeenCalledWith("warn message");
      expect(mockLogger.error).toHaveBeenCalledWith("error message");
    });

    it("debería aceptar contexto opcional", () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const context: LogContext = { module: "test", trackId: "123" };
      mockLogger.info("message", context);

      expect(mockLogger.info).toHaveBeenCalledWith("message", context);
    });
  });

  describe("createConsoleLogger", () => {
    it("debería crear logger que escribe a console", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = createConsoleLogger();

      logger.info("test message");

      expect(consoleSpy).toHaveBeenCalled();
    });

    it("debería usar console.warn para nivel warn", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logger = createConsoleLogger();

      logger.warn("warning message");

      expect(consoleSpy).toHaveBeenCalled();
    });

    it("debería usar console.error para nivel error", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logger = createConsoleLogger();

      logger.error("error message");

      expect(consoleSpy).toHaveBeenCalled();
    });

    it("debería incluir contexto en el mensaje", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = createConsoleLogger();

      logger.info("message", { module: "TestModule" });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[TestModule]"),
        expect.anything()
      );
    });

    it("debería respetar nivel mínimo de config", () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const logger = createConsoleLogger({ minLevel: "info" });

      logger.debug("debug message");
      logger.info("info message");

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
    });
  });

  describe("createNullLogger", () => {
    it("debería crear logger que no hace nada", () => {
      const consoleSpy = vi.spyOn(console, "log");
      const logger = createNullLogger();

      logger.debug("debug");
      logger.info("info");
      logger.warn("warn");
      logger.error("error");

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("debería ser útil para testing", () => {
      const logger = createNullLogger();
      
      // No debe lanzar errores
      expect(() => {
        logger.info("test", { data: "value" });
      }).not.toThrow();
    });
  });

  describe("createLogger (factory)", () => {
    it("debería crear logger con configuración personalizada", () => {
      const customHandler = vi.fn();
      const logger = createLogger({
        handler: customHandler,
        minLevel: "warn",
      });

      logger.info("should be filtered");
      logger.warn("should pass");

      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(customHandler).toHaveBeenCalledWith(
        "warn",
        "should pass",
        undefined
      );
    });

    it("debería usar console logger por defecto", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = createLogger();

      logger.info("test");

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("Global Logger", () => {
    it("debería permitir establecer logger global", () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      setGlobalLogger(mockLogger);
      const global = getGlobalLogger();

      expect(global).toBe(mockLogger);
    });

    it("debería usar console logger como default", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const global = getGlobalLogger();

      global.info("test");

      expect(consoleSpy).toHaveBeenCalled();
    });

    it("debería resetear a console logger", () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      setGlobalLogger(mockLogger);
      resetGlobalLogger();

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      getGlobalLogger().info("test");

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe("log helper function", () => {
    it("debería usar logger global", () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      setGlobalLogger(mockLogger);

      log.info("test message");
      log.warn("warning");
      log.error("error");

      expect(mockLogger.info).toHaveBeenCalledWith("test message", undefined);
      expect(mockLogger.warn).toHaveBeenCalledWith("warning", undefined);
      expect(mockLogger.error).toHaveBeenCalledWith("error", undefined);
    });

    it("debería pasar contexto al logger", () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      setGlobalLogger(mockLogger);

      log.info("message", { module: "Test" });

      expect(mockLogger.info).toHaveBeenCalledWith("message", { module: "Test" });
    });
  });

  describe("LogLevel ordering", () => {
    it("debería filtrar niveles menores que minLevel", () => {
      const handler = vi.fn();
      const logger = createLogger({ handler, minLevel: "warn" });

      logger.debug("debug");
      logger.info("info");
      logger.warn("warn");
      logger.error("error");

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith("warn", "warn", undefined);
      expect(handler).toHaveBeenCalledWith("error", "error", undefined);
    });

    it("debería permitir todos los niveles con minLevel debug", () => {
      const handler = vi.fn();
      const logger = createLogger({ handler, minLevel: "debug" });

      logger.debug("debug");
      logger.info("info");
      logger.warn("warn");
      logger.error("error");

      expect(handler).toHaveBeenCalledTimes(4);
    });
  });

  describe("Error logging", () => {
    it("debería manejar objetos Error como contexto", () => {
      const handler = vi.fn();
      const logger = createLogger({ handler });
      const error = new Error("Test error");

      logger.error("Something failed", { error });

      expect(handler).toHaveBeenCalledWith(
        "error",
        "Something failed",
        expect.objectContaining({ error })
      );
    });
  });
});
