/**
 * Test E2E para verificar que Settings ocupa el ancho completo del contenedor
 *
 * NOTA: Este test requiere que la app Tauri esté corriendo con WebDriver.
 * Para ejecutarlo manualmente:
 * 1. Iniciar app con: npm run tauri dev
 * 2. En otra terminal: npm run test:e2e -- settings-layout.spec.ts
 *
 * Actualmente se salta automáticamente en CI porque requiere app corriendo.
 */

import { expect, test } from '@playwright/test';

test.describe.skip('Settings Layout Width', () => {
  test.beforeEach(async ({ page }) => {
    // Configurar viewport amplio (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('el contenido de Settings debe ocupar al menos el 70% del ancho disponible', async ({ page }) => {
    // Navegar a localhost (app en dev mode)
    await page.goto('http://localhost:1420');

    // Esperar a que la app cargue
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    // Click en tab de Settings
    const settingsTab = page.locator('[data-testid="tab-settings"]');
    await settingsTab.click();

    // Esperar a que Settings cargue
    await page.waitForSelector('[data-testid="settings-tab-ui"]', { timeout: 5000 });

    // Obtener el ancho del viewport
    const viewportWidth = 1920;

    // Obtener el ancho del sidebar (w-64 = 256px)
    const sidebar = page.locator('[data-testid="settings-sidebar"]').or(page.locator('.w-64').first());
    const sidebarBox = await sidebar.boundingBox();
    const sidebarWidth = sidebarBox?.width || 256;

    // El ancho disponible para contenido es viewport - sidebar
    const availableWidth = viewportWidth - sidebarWidth;

    // Obtener el ancho del contenedor de contenido (el area con los tabs)
    const contentArea = page.locator('.flex-1.overflow-y-auto').first();
    const contentBox = await contentArea.boundingBox();

    if (!contentBox) {
      throw new Error('No se encontró el contenedor de contenido');
    }

    const contentWidth = contentBox.width;

    // Calcular porcentaje de uso del ancho disponible
    const usagePercentage = (contentWidth / availableWidth) * 100;

    console.log({
      viewportWidth,
      sidebarWidth,
      availableWidth,
      contentWidth,
      usagePercentage: `${usagePercentage.toFixed(1)}%`,
    });

    // Tomar screenshot para análisis visual
    await page.screenshot({
      path: 'test-results/settings-layout-width.png',
      fullPage: true
    });

    // El contenido debe usar al menos el 70% del ancho disponible
    // (considerando paddings razonables)
    expect(usagePercentage).toBeGreaterThanOrEqual(70);

    // Verificar que las SettingsSection no tienen restricciones de ancho
    const settingsCards = page.locator('.bg-white.dark\\:bg-slate-900.rounded-xl');
    const firstCard = settingsCards.first();
    const cardBox = await firstCard.boundingBox();

    if (cardBox) {
      const cardWidthPercentage = (cardBox.width / contentWidth) * 100;
      console.log(`Card width: ${cardBox.width}px (${cardWidthPercentage.toFixed(1)}% del contenido)`);

      // Las cards deben ocupar al menos el 90% del contenedor de contenido
      expect(cardWidthPercentage).toBeGreaterThanOrEqual(90);
    }
  });

  test('UISettingsTab debe renderizar sin restricciones de ancho', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    // Click en tab de Settings
    const settingsTab = page.locator('[data-testid="tab-settings"]');
    await settingsTab.click();

    // Esperar UI tab
    await page.waitForSelector('[data-testid="settings-theme-select"]', { timeout: 5000 });

    // Verificar que el select de tema ocupa el ancho completo del container
    const themeSelect = page.locator('[data-testid="settings-theme-select"]');
    const selectBox = await themeSelect.boundingBox();

    if (!selectBox) {
      throw new Error('No se encontró el select de tema');
    }

    // Buscar el contenedor padre (SettingsSection)
    const parentCard = page.locator('[data-testid="settings-theme-select"]').locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');
    const parentBox = await parentCard.boundingBox();

    if (parentBox) {
      const selectWidthPercentage = (selectBox.width / parentBox.width) * 100;
      console.log(`Select width: ${selectBox.width}px dentro de card de ${parentBox.width}px (${selectWidthPercentage.toFixed(1)}%)`);

      // El select debe ocupar al menos el 85% del ancho del card (considerando padding)
      expect(selectWidthPercentage).toBeGreaterThanOrEqual(85);
    }
  });
});
