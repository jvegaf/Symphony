/**
 * Logger con Dependency Inversion Principle (DIP)
 * 
 * Abstracción de logging que permite:
 * - Inyección de diferentes implementaciones
 * - Testing sin side effects (NullLogger)
 * - Configuración de niveles mínimos
 * - Contexto estructurado
 * 
 * @module utils/logger
 * @example
 * // Uso con logger global
 * import { log } from './logger';
 * log.info("Mensaje", { module: "MyModule" });
 * 
 * @example
 * // Testing: usar NullLogger
 * import { setGlobalLogger, createNullLogger } from './logger';
 * setGlobalLogger(createNullLogger());
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Niveles de log ordenados por severidad
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Contexto adicional para mensajes de log
 */
export interface LogContext {
  /** Módulo o componente que genera el log */
  module?: string;
  /** ID de track relacionado */
  trackId?: string;
  /** Error asociado */
  error?: Error | unknown;
  /** Datos adicionales */
  [key: string]: unknown;
}

/**
 * Interface del Logger (abstracción)
 * Implementaciones concretas deben seguir esta interface
 */
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

/**
 * Handler personalizado para logs
 */
export type LogHandler = (
  level: LogLevel,
  message: string,
  context?: LogContext
) => void;

/**
 * Configuración del logger
 */
export interface LoggerConfig {
  /** Handler personalizado para procesar logs */
  handler?: LogHandler;
  /** Nivel mínimo de log (logs menores serán filtrados) */
  minLevel?: LogLevel;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/** Orden de niveles para filtrado */
const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Verifica si un nivel debe ser logueado según el nivel mínimo
 */
function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[minLevel];
}

/**
 * Formatea el mensaje con contexto para console
 */
function formatLogMessage(message: string, context?: LogContext): string {
  if (context?.module) {
    return `[${context.module}] ${message}`;
  }
  return message;
}

/**
 * Handler por defecto que escribe a console
 */
const defaultConsoleHandler: LogHandler = (level, message, context) => {
  const formattedMessage = formatLogMessage(message, context);
  const logData = context ? { ...context } : undefined;

  switch (level) {
    case "debug":
      console.debug(formattedMessage, logData);
      break;
    case "info":
      console.log(formattedMessage, logData);
      break;
    case "warn":
      console.warn(formattedMessage, logData);
      break;
    case "error":
      console.error(formattedMessage, logData);
      break;
  }
};

// ============================================================================
// Logger Factories
// ============================================================================

/**
 * Crea un logger con configuración personalizada
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  const { handler = defaultConsoleHandler, minLevel = "debug" } = config;

  const logIfAllowed = (level: LogLevel, message: string, context?: LogContext) => {
    if (shouldLog(level, minLevel)) {
      handler(level, message, context);
    }
  };

  return {
    debug: (message, context) => logIfAllowed("debug", message, context),
    info: (message, context) => logIfAllowed("info", message, context),
    warn: (message, context) => logIfAllowed("warn", message, context),
    error: (message, context) => logIfAllowed("error", message, context),
  };
}

/**
 * Crea un logger que escribe a console
 * Configuración por defecto para desarrollo
 */
export function createConsoleLogger(config: Omit<LoggerConfig, "handler"> = {}): Logger {
  return createLogger({
    ...config,
    handler: defaultConsoleHandler,
  });
}

/**
 * Crea un logger que no hace nada (útil para testing)
 */
export function createNullLogger(): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

// ============================================================================
// Global Logger (singleton configurable)
// ============================================================================

let globalLogger: Logger = createConsoleLogger();

/**
 * Establece el logger global
 * Útil para configurar en el inicio de la app o en tests
 */
export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Obtiene el logger global actual
 */
export function getGlobalLogger(): Logger {
  return globalLogger;
}

/**
 * Resetea el logger global a console logger
 */
export function resetGlobalLogger(): void {
  globalLogger = createConsoleLogger();
}

/**
 * Helper para logging usando el logger global
 * Uso más conveniente que getGlobalLogger()
 * 
 * @example
 * log.info("Pista cargada", { trackId: "123" });
 * log.error("Error al reproducir", { error });
 */
export const log: Logger = {
  debug: (message: string, context?: LogContext) => 
    globalLogger.debug(message, context),
  info: (message: string, context?: LogContext) => 
    globalLogger.info(message, context),
  warn: (message: string, context?: LogContext) => 
    globalLogger.warn(message, context),
  error: (message: string, context?: LogContext) => 
    globalLogger.error(message, context),
};

// ============================================================================
// Legacy Export (backwards compatibility)
// ============================================================================

/**
 * @deprecated Use `log` o `createConsoleLogger()` en su lugar
 * Mantenido por compatibilidad con código existente
 */
export const logger = log;
