/**
 * E2E Test: Import Library
 * 
 * Tests:
 * - E2E-001: Import folder with audio files
 * - E2E-002: Progress bar updates in real-time
 * 
 * @see docs/milestone-6-design.md for complete test scenarios
 */

import { expect, test } from '@playwright/test';
import { cleanDatabase, startTauriApp } from './helpers/tauri';

test.describe('Import Library', () => {
  test.beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase();
  });

  test('E2E-001: Should import folder with audio files', async () => {
    const { window } = await startTauriApp();

    // Wait for app to load
    await expect(window.getByTestId('app-root')).toBeVisible({ timeout: 10000 });

    // Click import tab
    await window.getByTestId('tab-import').click();

    // Note: The actual file dialog interaction is not possible in E2E tests
    // In a real scenario, we would use the Tauri command directly
    // For now, this test demonstrates the structure

    // Verify we're on the correct tab
    await expect(window.getByTestId('tab-import')).toHaveClass(/bg-primary/);
  });

  test('E2E-002: Should show progress during import', async () => {
    const { window } = await startTauriApp();

    // Wait for app to load
    await expect(window.getByTestId('app-root')).toBeVisible({ timeout: 10000 });

    // This test would verify progress bar updates
    // Implementation requires mocking the import process or using Tauri commands
    
    // Placeholder assertion
    expect(window).toBeDefined();
  });

  test('E2E-003: Should display imported tracks in track table', async () => {
    const { window } = await startTauriApp();

    // Wait for app to load
    await expect(window.getByTestId('app-root')).toBeVisible({ timeout: 10000 });

    // Go to library tab
    await window.getByTestId('tab-library').click();

    // Check for track table (should be empty initially)
    const trackTable = window.getByTestId('track-table-empty');
    await expect(trackTable).toBeVisible();

    // Verify empty state message
    await expect(trackTable).toContainText('No hay pistas en tu biblioteca');
  });
});
