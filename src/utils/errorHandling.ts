/**
 * Utilidades centralizadas para manejo de errores
 * Proporciona tipado fuerte y logging consistente
 * @module utils/errorHandling
 */

/**
 * Códigos de error de la aplicación
 */
export const ErrorCode = {
  UNKNOWN: "UNKNOWN",
  NETWORK: "NETWORK",
  DATABASE: "DATABASE",
  AUDIO: "AUDIO",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  VALIDATION: "VALIDATION",
  TAURI_IPC: "TAURI_IPC",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Niveles de severidad de errores
 */
export const ErrorSeverity = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
} as const;

export type ErrorSeverityType = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

/**
 * Error tipado de la aplicación
 */
export interface AppError {
  code: ErrorCodeType;
  message: string;
  severity: ErrorSeverityType;
  timestamp: string;
  context?: Record<string, unknown>;
  cause?: Error;
  __isAppError: true;
}

/**
 * Opciones para crear un AppError
 */
export interface CreateAppErrorOptions {
  severity?: ErrorSeverityType;
  context?: Record<string, unknown>;
  cause?: Error;
}

/**
 * Crea un error tipado de la aplicación
 * @param code - Código de error
 * @param message - Mensaje descriptivo
 * @param options - Opciones adicionales
 */
export function createAppError(
  code: ErrorCodeType,
  message: string,
  options: CreateAppErrorOptions = {}
): AppError {
  return {
    code,
    message,
    severity: options.severity ?? "error",
    timestamp: new Date().toISOString(),
    context: options.context,
    cause: options.cause,
    __isAppError: true,
  };
}

/**
 * Verifica si un error es un AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "__isAppError" in error &&
    (error as AppError).__isAppError === true
  );
}

/**
 * Loguea un error con contexto del módulo
 * @param module - Nombre del módulo donde ocurrió el error
 * @param message - Mensaje descriptivo
 * @param error - Error opcional
 */
export function logError(
  module: string,
  message: string,
  error?: Error | AppError | unknown
): void {
  console.error(`${module}:`, message, error);
}

/**
 * Formatea un error para mostrar al usuario
 * @param error - Error a formatear
 * @returns Mensaje formateado
 */
export function formatErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return `[${error.code}] ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Error desconocido";
}

/**
 * Ejecuta una función async con manejo de errores
 * @param fn - Función a ejecutar
 * @param module - Nombre del módulo para logging
 * @param fallback - Valor a retornar en caso de error
 * @param onError - Callback opcional cuando ocurre error
 */
export async function handleAsyncError<T>(
  fn: () => Promise<T>,
  module: string,
  fallback?: T,
  onError?: (error: Error | AppError) => void
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logError(module, "Error en operación async", errorObj);

    if (onError) {
      onError(errorObj);
    }

    return fallback;
  }
}

/**
 * Extrae código de error de un string de error de Tauri
 * @param errorMessage - Mensaje de error de Tauri
 * @returns Código de error inferido
 */
export function inferErrorCode(errorMessage: string): ErrorCodeType {
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("network") || lowerMessage.includes("conexión")) {
    return ErrorCode.NETWORK;
  }

  if (lowerMessage.includes("database") || lowerMessage.includes("sqlite")) {
    return ErrorCode.DATABASE;
  }

  if (
    lowerMessage.includes("audio") ||
    lowerMessage.includes("playback") ||
    lowerMessage.includes("decode")
  ) {
    return ErrorCode.AUDIO;
  }

  if (
    lowerMessage.includes("not found") ||
    lowerMessage.includes("no encontrado") ||
    lowerMessage.includes("no existe")
  ) {
    return ErrorCode.FILE_NOT_FOUND;
  }

  if (
    lowerMessage.includes("permission") ||
    lowerMessage.includes("permiso") ||
    lowerMessage.includes("access denied")
  ) {
    return ErrorCode.PERMISSION_DENIED;
  }

  if (
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("inválido") ||
    lowerMessage.includes("validation")
  ) {
    return ErrorCode.VALIDATION;
  }

  if (lowerMessage.includes("tauri") || lowerMessage.includes("invoke")) {
    return ErrorCode.TAURI_IPC;
  }

  return ErrorCode.UNKNOWN;
}

/**
 * Convierte un error desconocido a AppError
 * @param error - Error a convertir
 * @param defaultMessage - Mensaje por defecto si no se puede extraer
 */
export function toAppError(
  error: unknown,
  defaultMessage = "Error inesperado"
): AppError {
  if (isAppError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error || defaultMessage);
  const code = inferErrorCode(message);

  return createAppError(code, message, {
    cause: error instanceof Error ? error : undefined,
  });
}
