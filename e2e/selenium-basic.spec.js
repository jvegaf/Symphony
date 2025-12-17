/**
 * E2E Test: Basic App Launch (Selenium + tauri-driver)
 * 
 * This test uses Selenium WebDriver directly with tauri-driver
 * following the official Tauri v2 documentation approach.
 * 
 * @see https://v2.tauri.app/develop/tests/webdriver/example/selenium
 * 
 * AIDEV-NOTE: Requires `npm run tauri build -- --no-bundle` to have been run first
 * to create the release binary with bundled frontend assets.
 */

import { spawn, execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Builder, By, until, Capabilities } from 'selenium-webdriver';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Path to the Tauri application binary
// Use release build which has frontend bundled
const application = path.resolve(__dirname, '..', 'src-tauri', 'target', 'release', 'symphony');

// tauri-driver process
let tauriDriver;
let exit = false;

/**
 * Kill any stale WebDriver processes that might interfere with tests
 */
function cleanupStaleProcesses() {
  console.log('🧹 Cleaning up stale processes...');
  try {
    if (process.platform === 'linux' || process.platform === 'darwin') {
      execSync('pkill -9 -f tauri-driver 2>/dev/null || true', { stdio: 'ignore' });
      execSync('pkill -9 -f WebKitWebDriver 2>/dev/null || true', { stdio: 'ignore' });
    }
  } catch {
    // Ignore errors - processes might not exist
  }
}

/**
 * Start tauri-driver before tests
 */
async function startTauriDriver() {
  console.log('🚀 Starting tauri-driver...');
  
  const tauriDriverPath = path.resolve(
    os.homedir(),
    '.cargo',
    'bin',
    'tauri-driver'
  );
  
  const args = [];
  if (process.platform === 'linux') {
    args.push('--native-driver', '/bin/WebKitWebDriver');
  }
  
  tauriDriver = spawn(tauriDriverPath, args, {
    stdio: [null, process.stdout, process.stderr],
  });
  
  tauriDriver.on('error', (error) => {
    console.error('❌ tauri-driver error:', error);
    process.exit(1);
  });
  
  tauriDriver.on('exit', (code) => {
    if (!exit) {
      console.error('⚠️ tauri-driver exited unexpectedly with code:', code);
    }
  });
  
  // Wait for tauri-driver to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('✅ tauri-driver started');
}

/**
 * Stop tauri-driver after tests
 */
async function stopTauriDriver() {
  exit = true;
  if (tauriDriver) {
    console.log('🛑 Stopping tauri-driver...');
    tauriDriver.kill();
    tauriDriver = null;
  }
}

/**
 * Main test suite
 */
async function runTests() {
  let driver;
  
  try {
    console.log('📱 Building WebDriver session...');
    console.log('   Application:', application);
    
    // Build WebDriver session with Tauri capabilities
    // Following the official Tauri v2 Selenium example
    const capabilities = new Capabilities();
    capabilities.set('tauri:options', { application });
    capabilities.setBrowserName('wry');
    
    driver = await new Builder()
      .withCapabilities(capabilities)
      .usingServer('http://127.0.0.1:4444/')
      .build();
    
    console.log('✅ WebDriver session created successfully!');
    
    // Give the app time to fully initialize
    console.log('\n⏳ Waiting for app to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 1: Get application title
    console.log('\n🧪 Test 1: Get application title');
    const title = await driver.getTitle();
    console.log('   Title:', title || '(empty)');
    
    // Debug: Get page source to see what's actually there
    console.log('\n🔍 Debug: Getting page source...');
    const pageSource = await driver.getPageSource();
    console.log('   Page source length:', pageSource.length);
    console.log('   First 500 chars:', pageSource.substring(0, 500));
    
    // Verify frontend loaded (not connection refused error)
    if (pageSource.length < 1000) {
      console.error('   ❌ FAIL: Page source too small - frontend may not have loaded');
      console.error('   This usually means the binary was built without bundling frontend assets.');
      console.error('   Run: npm run tauri build -- --no-bundle');
      process.exit(1);
    }
    
    if (title) {
      console.log('   ✅ PASS: Application has a title');
    } else {
      console.log('   ⚠️  WARNING: No title found (this is okay for some apps)');
    }
    
    // Test 2: Find app-root element
    console.log('\n🧪 Test 2: Find app-root element');
    const appRoot = await driver.wait(
      until.elementLocated(By.css('[data-testid="app-root"]')),
      10000
    );
    
    if (appRoot) {
      console.log('   ✅ PASS: app-root element found');
      
      // Check if it's displayed
      const isDisplayed = await appRoot.isDisplayed();
      console.log('   Is displayed:', isDisplayed);
    } else {
      console.log('   ❌ FAIL: app-root not found');
    }
    
    // Test 3: Find header element
    console.log('\n🧪 Test 3: Find header element');
    const header = await driver.findElement(By.css('[data-testid="header"]'));
    
    if (header) {
      console.log('   ✅ PASS: header element found');
      
      // Find library tab
      const libraryTab = await driver.findElement(By.css('[data-testid="tab-library"]'));
      const tabText = await libraryTab.getText();
      console.log('   Library tab text:', tabText);
    } else {
      console.log('   ❌ FAIL: header not found');
    }
    
    // Test 4: Take a screenshot
    console.log('\n🧪 Test 4: Take screenshot');
    const screenshot = await driver.takeScreenshot();
    const screenshotPath = path.resolve(__dirname, '..', 'e2e-report', 'selenium-screenshot.png');
    
    // Save screenshot
    const fs = await import('node:fs/promises');
    const { mkdir, writeFile } = fs;
    await mkdir(path.dirname(screenshotPath), { recursive: true });
    await writeFile(screenshotPath, screenshot, 'base64');
    console.log('   ✅ Screenshot saved to:', screenshotPath);
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (driver) {
      console.log('\n🔌 Closing WebDriver session...');
      await driver.quit();
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Clean up any stale processes from previous runs
    cleanupStaleProcesses();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await startTauriDriver();
    await runTests();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await stopTauriDriver();
    process.exit(0);
  }
}

// Handle cleanup on exit
function onShutdown(fn) {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);
  process.on('SIGBREAK', cleanup);
}

onShutdown(() => {
  stopTauriDriver();
});

main();
