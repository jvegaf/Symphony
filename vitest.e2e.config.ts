import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Configuración de Vitest para tests E2E
 * 
 * AIDEV-NOTE: Tests E2E separados de unit tests para evitar fallos en CI
 * - Requieren Tauri app compilada
 * - Más lentos y frágiles
 * - Ejecutar manualmente con: npm run test:e2e
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node', // E2E tests usan node environment
    // Solo incluir archivos E2E
    include: [
      'e2e/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    // Timeout más largo para E2E
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
