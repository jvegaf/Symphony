/**
 * SIMPLE E2E Test: Just Launch the App
 * 
 * Minimal test to verify we can:
 * 1. Start tauri-driver
 * 2. Create a WebDriver session
 * 3. Launch the Symphony app
 * 4. Get SOME response from the webview
 */

import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Builder, Capabilities } from 'selenium-webdriver';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Path to release binary (built with `npm run tauri build -- --no-bundle`)
const application = path.resolve(__dirname, '..', 'src-tauri', 'target', 'release', 'symphony');

console.log('🎯 SIMPLE E2E TEST - Just Launch\n');
console.log('📱 Application:', application);

// Check if binary exists
if (!existsSync(application)) {
  console.error('❌ Binary not found! Run: npm run tauri build -- --no-bundle');
  process.exit(1);
}

let tauriDriver;
let driver;

async function main() {
  try {
    // 1. Start tauri-driver
    console.log('\n🚀 Step 1: Starting tauri-driver...');
    const tauriDriverPath = path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver');
    const args = process.platform === 'linux' ? ['--native-driver', '/bin/WebKitWebDriver'] : [];
    
    tauriDriver = spawn(tauriDriverPath, args, {
      stdio: [null, 'pipe', 'pipe'],
    });
    
    // Capture tauri-driver output
    tauriDriver.stdout.on('data', (data) => {
      console.log(`   [tauri-driver] ${data.toString().trim()}`);
    });
    
    tauriDriver.stderr.on('data', (data) => {
      console.error(`   [tauri-driver ERROR] ${data.toString().trim()}`);
    });
    
    // Wait for it to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ tauri-driver started');
    
    // 2. Create WebDriver session
    console.log('\n🔌 Step 2: Creating WebDriver session...');
    const capabilities = new Capabilities();
    capabilities.set('tauri:options', { application });
    capabilities.setBrowserName('wry');
    
    driver = await new Builder()
      .withCapabilities(capabilities)
      .usingServer('http://127.0.0.1:4444/')
      .build();
    
    console.log('✅ WebDriver session created!');
    
    // 3. Wait for app to load
    console.log('\n⏳ Step 3: Waiting for app to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Get page source
    console.log('\n📄 Step 4: Getting page source...');
    const pageSource = await driver.getPageSource();
    console.log(`   Page length: ${pageSource.length} chars`);
    
    if (pageSource.includes('Could not connect')) {
      console.log('   ❌ App shows connection error');
      console.log('   First 200 chars:', pageSource.substring(0, 200));
      throw new Error('App failed to load frontend');
    }
    
    if (pageSource.includes('app-root') || pageSource.includes('Symphony') || pageSource.length > 1000) {
      console.log('   ✅ App loaded successfully!');
      console.log('   Preview:', pageSource.substring(0, 150), '...');
    } else {
      console.log('   ⚠️  Unexpected page content');
      console.log('   Full source:', pageSource);
    }
    
    // 5. Get title
    console.log('\n📌 Step 5: Getting title...');
    const title = await driver.getTitle();
    console.log(`   Title: "${title}"`);
    
    console.log('\n🎉 SUCCESS! App launched via WebDriver');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch {
        // Ignore
      }
    }
    if (tauriDriver) {
      tauriDriver.kill();
    }
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  if (tauriDriver) tauriDriver.kill();
  if (driver) driver.quit().catch(() => {});
  process.exit(1);
});

main();
