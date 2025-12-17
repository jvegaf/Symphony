/**
 * WebdriverIO Configuration for Tauri E2E Tests
 * 
 * This configuration uses tauri-driver as the WebDriver server
 * to test the Tauri application.
 * 
 * @see https://v2.tauri.app/develop/tests/webdriver/
 */

import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Track the tauri-driver process
let tauriDriver;
let exit = false;

// Path to the Tauri application binary
const application = process.env.CI
  ? path.resolve(__dirname, 'src-tauri', 'target', 'release', 'symphony')
  : path.resolve(__dirname, 'src-tauri', 'target', 'debug', 'symphony');

export const config = {
  // ====================
  // Runner Configuration
  // ====================
  runner: 'local',
  
  // WebDriver endpoint
  hostname: '127.0.0.1',
  port: 4444,
  path: '/',
  
  // ==================
  // Specify Test Files
  // ==================
  specs: [
    './e2e/**/*.wdio.spec.js'
  ],
  
  // Patterns to exclude
  exclude: [],
  
  // ============
  // Capabilities
  // ============
  maxInstances: 1,
  capabilities: [{
    browserName: 'wry',
    'tauri:options': {
      application,
    },
  }],
  
  // ===================
  // Test Configurations
  // ===================
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  
  // Test framework
  framework: 'mocha',
  reporters: ['spec'],
  
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  
  // =====
  // Hooks
  // =====
  
  /**
   * Gets executed before test execution begins.
   * Build the Tauri application in debug mode.
   */
  onPrepare() {
    console.log('📦 Building Tauri application...');
    
    const result = spawnSync(
      'cargo',
      ['build'],
      {
        cwd: path.resolve(__dirname, 'src-tauri'),
        stdio: 'inherit',
        shell: true,
      }
    );
    
    if (result.status !== 0) {
      throw new Error('Failed to build Tauri application');
    }
    
    console.log('✅ Tauri application built successfully');
  },
  
  /**
   * Gets executed before the suite starts.
   * Start tauri-driver before running tests.
   */
  beforeSession() {
    console.log('🚀 Starting tauri-driver...');
    
    const tauriDriverPath = path.resolve(
      os.homedir(),
      '.cargo',
      'bin',
      'tauri-driver'
    );
    
    // Para Linux, necesitamos especificar el driver nativo (WebKitWebDriver)
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
        console.error(`❌ tauri-driver exited with code: ${code}`);
        process.exit(1);
      }
    });
    
    // Dar tiempo a tauri-driver para iniciar
    return new Promise(resolve => setTimeout(resolve, 2000));
  },
  
  /**
   * Gets executed after all tests are done.
   * Kill tauri-driver process.
   */
  afterSession() {
    closeTauriDriver();
  },
  
  /**
   * Gets executed after all workers got shut down and the process is about to exit.
   */
  onComplete() {
    closeTauriDriver();
  },
};

/**
 * Close tauri-driver process gracefully
 */
function closeTauriDriver() {
  if (tauriDriver && !exit) {
    exit = true;
    console.log('🛑 Stopping tauri-driver...');
    tauriDriver.kill();
    tauriDriver = null;
  }
}

/**
 * Ensure tauri-driver is closed on process exit
 */
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
  closeTauriDriver();
});
