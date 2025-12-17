/**
 * E2E Test: Basic App Launch (WebdriverIO + tauri-driver)
 * 
 * Este test verifica que la aplicación Tauri se lanza correctamente
 * y que podemos interactuar con ella usando WebDriver.
 */

import { expect } from 'chai';

describe('Symphony Application', () => {
  it('should launch the application successfully', async () => {
    // Verificar que el navegador se haya iniciado
    const title = await browser.getTitle();
    console.log('📱 Application title:', title);
    
    // El título debería ser "Symphony" o similar
    expect(title).to.be.a('string');
  });
  
  it('should display the app root element', async () => {
    // Buscar el elemento raíz de la aplicación
    const appRoot = await $('[data-testid="app-root"]');
    
    // Esperar a que sea visible
    await appRoot.waitForDisplayed({ timeout: 10000 });
    
    // Verificar que existe
    const exists = await appRoot.isExisting();
    expect(exists).to.be.true;
  });
  
  it('should display the header with tabs', async () => {
    // Buscar el header
    const header = await $('[data-testid="header"]');
    await header.waitForDisplayed({ timeout: 5000 });
    
    // Verificar que el tab de library existe
    const libraryTab = await $('[data-testid="tab-library"]');
    const exists = await libraryTab.isExisting();
    expect(exists).to.be.true;
  });
});
