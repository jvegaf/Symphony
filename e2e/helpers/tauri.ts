/**
 * Helpers para tests E2E de Tauri
 * 
 * AIDEV-NOTE: Proporciona utilidades para iniciar la app Tauri,
 * gestionar la base de datos de test y helpers comunes de UI.
 * 
 * Tauri v2 usa WebDriver para E2E testing. Sin embargo, para tests
 * básicos podemos simplemente lanzar el binario y conectarnos via CDP.
 */

import { type Page, chromium } from 'playwright';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Path a la base de datos de test
 */
export function getTestDbPath(): string {
  return path.join(os.homedir(), '.config', 'symphony-test', 'symphony.db');
}

/**
 * Limpia la base de datos de test antes de ejecutar tests
 */
export async function cleanDatabase(): Promise<void> {
  const dbPath = getTestDbPath();
  const dbDir = path.dirname(dbPath);
  
  // Eliminar DB si existe
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  
  // Eliminar directorio completo
  if (fs.existsSync(dbDir)) {
    fs.rmSync(dbDir, { recursive: true, force: true });
  }
}

/**
 * Inicia la aplicación Tauri en modo test
 * 
 * AIDEV-NOTE: Tauri v2 apps son binarios nativos que embeben un webview.
 * Para E2E testing necesitamos usar WebDriver o lanzar el binario y
 * conectarnos vía DevTools Protocol.
 * 
 * Por ahora, este es un placeholder que lanza un navegador headless.
 * Para testing real de Tauri, necesitamos configurar WebDriver.
 */
export async function startTauriApp(): Promise<{
  window: Page;
  process?: ReturnType<typeof exec>;
}> {
  // Limpiar DB antes de iniciar
  await cleanDatabase();
  
  // AIDEV-NOTE: Por ahora, esto es un placeholder para demostrar
  // la estructura de tests. Para testing real de Tauri necesitamos:
  // 1. Configurar WebDriver (tauri-driver)
  // 2. O usar el binario con --remote-debugging-port
  //
  // Ver: https://tauri.app/v1/guides/testing/webdriver/introduction
  
  // Por ahora, abrimos un navegador headless como placeholder
  const browser = await chromium.launch({
    headless: true,
  });
  
  const window = await browser.newPage();
  
  // En un escenario real, esto sería la URL del Tauri app via WebDriver
  // o el WebView con debugging habilitado
  await window.goto('about:blank');
  
  return { window };
}

/**
 * Cierra la aplicación Tauri de forma segura
 */
export async function closeTauriApp(ctx: { window: Page; process?: ReturnType<typeof exec> }): Promise<void> {
  await ctx.window.close();
  
  if (ctx.process) {
    ctx.process.kill();
  }
  
  // Dar tiempo para que se cierre completamente
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Importa la biblioteca de test (fixtures)
 * 
 * AIDEV-NOTE: Mock del diálogo de selección de carpeta para usar
 * una carpeta de test con archivos de audio controlados.
 */
export async function importTestLibrary(window: Page): Promise<void> {
  const testMusicPath = path.join(__dirname, '../fixtures/test-music');
  
  // AIDEV-NOTE: Mock del diálogo de Tauri para tests E2E
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await window.evaluate((mockPath: string) => {
    (window as any).__TAURI__ = (window as any).__TAURI__ || {};
    (window as any).__TAURI__.dialog = (window as any).__TAURI__.dialog || {};
    (window as any).__TAURI__.dialog.open = async () => mockPath;
  }, testMusicPath);
  
  // Click en botón de importar
  await window.locator('[data-testid="import-button"]').click();
  
  // Esperar a que la importación complete
  await window.waitForSelector('[data-testid="import-complete"]', {
    timeout: 60000,
  });
}

/**
 * Espera a que un elemento sea visible con timeout personalizado
 */
export async function waitForElement(
  window: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  await window.waitForSelector(selector, { timeout, state: 'visible' });
}

/**
 * Verifica que un elemento tenga un texto específico
 */
export async function expectTextContent(
  window: Page,
  selector: string,
  expectedText: string
): Promise<void> {
  const element = window.locator(selector);
  const text = await element.textContent();
  
  if (!text?.includes(expectedText)) {
    throw new Error(
      `Expected element ${selector} to contain "${expectedText}", but got "${text}"`
    );
  }
}

/**
 * Toma screenshot con nombre descriptivo
 */
export async function takeScreenshot(
  window: Page,
  name: string
): Promise<void> {
  await window.screenshot({
    path: path.join(__dirname, '../../e2e-screenshots', `${name}.png`),
    fullPage: true,
  });
}

/**
 * Helpers para navegación común en la UI
 */
export const UI = {
  /**
   * Abre la página de configuración
   */
  async openSettings(window: Page): Promise<void> {
    await window.locator('[data-testid="settings-tab"]').click();
  },
  
  /**
   * Abre la biblioteca
   */
  async openLibrary(window: Page): Promise<void> {
    await window.locator('[data-testid="library-tab"]').click();
  },
  
  /**
   * Busca pistas en la biblioteca
   */
  async searchTracks(window: Page, query: string): Promise<void> {
    const searchInput = window.locator('[data-testid="search-input"]');
    await searchInput.fill(query);
    
    // Esperar debounce de búsqueda (300ms)
    await window.waitForTimeout(400);
  },
  
  /**
   * Selecciona la primera pista de la lista
   */
  async selectFirstTrack(window: Page): Promise<void> {
    const firstTrack = window.locator('[data-testid="track-row"]').first();
    await firstTrack.click();
  },
  
  /**
   * Reproduce la primera pista (doble click)
   */
  async playFirstTrack(window: Page): Promise<void> {
    const firstTrack = window.locator('[data-testid="track-row"]').first();
    await firstTrack.dblclick();
    
    // Esperar a que el player cargue
    await waitForElement(window, '[data-testid="player-section"]');
  },
};
