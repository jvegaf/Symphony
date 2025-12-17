/**
 * Debug Script: Probe tauri-driver Capabilities
 * 
 * This script manually sends WebDriver requests to tauri-driver
 * to debug the capabilities mismatch issue.
 * 
 * Usage:
 * 1. Terminal 1: tauri-driver --native-driver /bin/WebKitWebDriver
 * 2. Terminal 2: node e2e/debug-tauri-driver.js
 */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const application = path.resolve(__dirname, '..', 'src-tauri', 'target', 'debug', 'symphony');

console.log('🔍 Testing tauri-driver capabilities...');
console.log('📱 Application path:', application);

// Test different capability formats
const capabilitySets = [
  {
    name: 'Original (from wdio.conf.js)',
    capabilities: {
      alwaysMatch: {
        browserName: 'wry',
        'tauri:options': {
          application,
        },
      },
    },
  },
  {
    name: 'Tauri v2 Docs Format',
    capabilities: {
      alwaysMatch: {
        'tauri:options': {
          application,
        },
      },
    },
  },
  {
    name: 'Minimal Format',
    capabilities: {
      capabilities: {
        alwaysMatch: {
          'tauri:options': {
            application,
          },
        },
      },
    },
  },
  {
    name: 'Legacy Format (Tauri v1)',
    capabilities: {
      desiredCapabilities: {
        'tauri:options': {
          application,
        },
      },
    },
  },
];

async function testCapabilities(capSet) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(capSet.capabilities);
    
    const options = {
      hostname: '127.0.0.1',
      port: 4444,
      path: '/session',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    
    console.log(`\n🧪 Testing: ${capSet.name}`);
    console.log('📤 Request payload:', JSON.stringify(capSet.capabilities, null, 2));
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📥 Status: ${res.statusCode}`);
        
        try {
          const parsed = JSON.parse(data);
          console.log('📥 Response:', JSON.stringify(parsed, null, 2));
          
          if (res.statusCode === 200) {
            console.log('✅ SUCCESS! This capability format works!');
            
            // Try to delete the session
            if (parsed.value?.sessionId) {
              deleteSession(parsed.value.sessionId);
            }
          } else {
            console.log('❌ Failed');
          }
        } catch {
          console.log('📥 Response (raw):', data);
          console.log('❌ Failed to parse response');
        }
        
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.error(`❌ Request error: ${e.message}`);
      resolve();
    });
    
    req.write(payload);
    req.end();
  });
}

async function deleteSession(sessionId) {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: 4444,
      path: `/session/${sessionId}`,
      method: 'DELETE',
    };
    
    console.log(`🗑️  Deleting session: ${sessionId}`);
    
    const req = http.request(options, (res) => {
      console.log(`✅ Session deleted (status: ${res.statusCode})`);
      resolve();
    });
    
    req.on('error', (e) => {
      console.error(`❌ Delete error: ${e.message}`);
      resolve();
    });
    
    req.end();
  });
}

async function main() {
  console.log('🔌 Make sure tauri-driver is running on port 4444');
  console.log('   Run: tauri-driver --native-driver /bin/WebKitWebDriver');
  console.log('');
  
  // Wait a bit for user to read
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test each capability format
  for (const capSet of capabilitySets) {
    await testCapabilities(capSet);
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✨ Testing complete!');
}

main().catch(console.error);
