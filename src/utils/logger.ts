import { info, warn, error, debug, trace } from '@tauri-apps/plugin-log';

/**
 * Logger unificado para el frontend que envía logs al sistema de archivos
 * a través del plugin de Tauri.
 */
export const logger = {
  info: async (message: string, ...args: unknown[]) => {
    console.info(message, ...args);
    await info(formatMessage(message, args));
  },
  
  warn: async (message: string, ...args: unknown[]) => {
    console.warn(message, ...args);
    await warn(formatMessage(message, args));
  },
  
  error: async (message: string, ...args: unknown[]) => {
    console.error(message, ...args);
    await error(formatMessage(message, args));
  },
  
  debug: async (message: string, ...args: unknown[]) => {
    console.debug(message, ...args);
    await debug(formatMessage(message, args));
  },
  
  trace: async (message: string, ...args: unknown[]) => {
    console.trace(message, ...args);
    await trace(formatMessage(message, args));
  }
};

function formatMessage(message: string, args: unknown[]): string {
  if (args.length === 0) return message;
  try {
    return `${message} ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')}`;
  } catch (e) {
    return `${message} [Error serializing args]`;
  }
}
