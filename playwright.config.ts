import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E con Tauri
 * 
 * AIDEV-NOTE: Tests E2E deben correr secuencialmente (workers: 1) para evitar
 * conflictos de base de datos SQLite. Cada test limpia la DB antes de ejecutar.
 */
export default defineConfig({
  // Directorio de tests E2E
  testDir: './e2e',
  
  // NO ejecutar tests en paralelo (conflictos de DB)
  fullyParallel: false,
  
  // Prohibir .only en CI
  forbidOnly: !!process.env.CI,
  
  // Retries en CI para tests flaky
  retries: process.env.CI ? 2 : 0,
  
  // Un solo worker para ejecución secuencial
  workers: 1,
  
  // Reporter HTML con screenshots
  reporter: [
    ['html', { outputFolder: 'e2e-report' }],
    ['list'],
  ],
  
  // Configuración de uso
  use: {
    // Trace solo en retries (debugging)
    trace: 'on-first-retry',
    
    // Screenshots solo en fallos
    screenshot: 'only-on-failure',
    
    // Videos solo en fallos
    video: 'retain-on-failure',
    
    // Base URL para la aplicación Tauri
    baseURL: 'tauri://localhost',
  },
  
  // Proyectos (plataformas)
  projects: [
    {
      name: 'linux',
      use: {
        ...devices['Desktop Linux'],
      },
    },
    // Futuro: Windows y macOS
    // {
    //   name: 'windows',
    //   use: { ...devices['Desktop Windows'] },
    // },
  ],
  
  // Timeout global por test (60 segundos)
  timeout: 60000,
  
  // Timeout para expect (10 segundos)
  expect: {
    timeout: 10000,
  },
});
