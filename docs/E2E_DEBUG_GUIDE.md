# E2E Testing Debug Guide

This guide helps debug the WebDriver capabilities issue and get E2E tests working.

## Problem

`tauri-driver` is rejecting WebDriver sessions with:
```
WebDriverError: Failed to match capabilities when running "http://127.0.0.1:4444/session" with method "POST"
```

## Testing Tools Created

### 1. Debug Script: `e2e/debug-tauri-driver.js`

Tests different capability formats directly against tauri-driver to find the correct one.

**Usage:**
```bash
# Terminal 1: Start tauri-driver manually
tauri-driver --native-driver /bin/WebKitWebDriver

# Terminal 2: Run debug script
npm run test:debug-tauri-driver
```

**What it does:**
- Tests 4 different capability formats
- Shows request/response for each
- Identifies which format works

### 2. Selenium Test: `e2e/selenium-basic.spec.js`

Direct Selenium WebDriver test following Tauri v2 docs approach.

**Usage:**
```bash
npm run test:selenium
```

**What it tests:**
1. ✅ Application launches
2. ✅ Get application title
3. ✅ Find `app-root` element
4. ✅ Find `header` element
5. ✅ Take screenshot

### 3. WebdriverIO Test: `e2e/basic-launch.wdio.spec.js`

Original WebdriverIO approach (currently blocked).

**Usage:**
```bash
npm run test:wdio
```

## Step-by-Step Debugging Process

### Step 1: Verify tauri-driver Installation

```bash
# Check tauri-driver is installed
which tauri-driver
# Should output: /home/th3g3ntl3man/.cargo/bin/tauri-driver

# Check version
tauri-driver --version
# Should output: tauri-driver 2.0.4
```

### Step 2: Verify Native WebDriver

```bash
# Check WebKitWebDriver exists
ls -la /bin/WebKitWebDriver
# Should exist on Linux

# For debugging, you can also check:
which safaridriver  # macOS
which msedgedriver  # Windows
```

### Step 3: Build Tauri Binary

```bash
cd src-tauri
cargo build
cd ..

# Verify binary exists
ls -lh src-tauri/target/debug/symphony
# Should show ~260MB binary
```

### Step 4: Test tauri-driver Manually

```bash
# Terminal 1: Start tauri-driver with verbose output
tauri-driver --native-driver /bin/WebKitWebDriver

# You should see:
# tauri-driver listening on 127.0.0.1:4444
```

### Step 5: Run Debug Script

```bash
# Terminal 2 (keep tauri-driver running)
npm run test:debug-tauri-driver
```

**Expected output:**
- ✅ One of the capability formats should succeed
- ❌ Others should fail with specific error messages

**What to look for:**
- Which capability format works?
- What error messages appear for failed formats?
- Does any format create a session successfully?

### Step 6: Try Selenium Test

```bash
npm run test:selenium
```

**Expected outcome:**
- ✅ tauri-driver starts automatically
- ✅ Application launches
- ✅ Tests find elements by `data-testid`
- ✅ Screenshot saved to `e2e-report/selenium-screenshot.png`

**If it works:**
- Selenium approach is valid!
- We can convert WebdriverIO tests to Selenium
- Or fix WebdriverIO capabilities based on working format

**If it fails:**
- Check error message
- Compare with debug script results
- May need to adjust capability format

## Common Issues & Solutions

### Issue 1: "tauri-driver: command not found"

**Solution:**
```bash
cargo install tauri-driver --locked
```

### Issue 2: "WebKitWebDriver: No such file or directory"

**Linux Solution:**
```bash
# Install webkit2gtk (provides WebKitWebDriver)
sudo apt install webkit2gtk-4.1
```

**macOS Solution:**
```bash
# Use safaridriver instead
tauri-driver --native-driver /usr/bin/safaridriver
```

**Windows Solution:**
```bash
# Download and use MSEdgeDriver
tauri-driver --native-driver "C:\Program Files (x86)\Microsoft\Edge\Application\msedgedriver.exe"
```

### Issue 3: "Application binary not found"

**Solution:**
```bash
# Rebuild Tauri application
cd src-tauri
cargo build
```

### Issue 4: "Port 4444 already in use"

**Solution:**
```bash
# Kill existing process
lsof -ti:4444 | xargs kill -9

# Or use different port
tauri-driver --port 4445
```

### Issue 5: Selenium test hangs

**Symptoms:**
- Test starts but never completes
- No error messages
- Application doesn't launch

**Possible causes:**
1. tauri-driver didn't start properly
2. Application binary is corrupt
3. Native WebDriver path is wrong

**Solution:**
```bash
# Check tauri-driver is running
ps aux | grep tauri-driver

# Check application can launch manually
./src-tauri/target/debug/symphony

# Verify WebDriver path
ls -la /bin/WebKitWebDriver
```

## Capability Formats Reference

### Format 1: WebdriverIO Default
```json
{
  "alwaysMatch": {
    "browserName": "wry",
    "tauri:options": {
      "application": "/path/to/symphony"
    }
  }
}
```

### Format 2: Tauri v2 Docs (Minimal)
```json
{
  "alwaysMatch": {
    "tauri:options": {
      "application": "/path/to/symphony"
    }
  }
}
```

### Format 3: W3C WebDriver Standard
```json
{
  "capabilities": {
    "alwaysMatch": {
      "tauri:options": {
        "application": "/path/to/symphony"
      }
    }
  }
}
```

### Format 4: Legacy (Tauri v1)
```json
{
  "desiredCapabilities": {
    "tauri:options": {
      "application": "/path/to/symphony"
    }
  }
}
```

## Next Steps

### If Debug Script Succeeds
1. Note which capability format works
2. Update `wdio.conf.js` with working format
3. Run `npm run test:wdio` again
4. If works, write remaining E2E tests

### If Selenium Test Succeeds
1. Consider switching from WebdriverIO to Selenium
2. Simpler, more direct approach
3. Better aligned with Tauri docs
4. Convert existing tests to Selenium format

### If Nothing Works
1. Check Tauri Discord/GitHub issues for similar problems
2. Try alternative: Tauri DevTools Protocol approach
3. Consider integration tests via Tauri commands instead
4. File issue with tauri-driver project

## Alternative Approaches

### Option A: Tauri DevTools Protocol
Enable remote debugging in `tauri.conf.json`:
```json
{
  "app": {
    "withGlobalTauri": true,
    "devtools": true
  }
}
```

Then use Chrome DevTools Protocol directly.

### Option B: Integration Tests
Test backend functionality without UI:
```bash
cd src-tauri
cargo test --test integration_*
```

### Option C: Playwright with Custom Launch
Use Playwright's generic browser connection:
```typescript
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
```

## Resources

- **Tauri v2 WebDriver Docs**: https://v2.tauri.app/develop/tests/webdriver/
- **Selenium Example**: https://v2.tauri.app/develop/tests/webdriver/example/selenium
- **WebdriverIO Example**: https://v2.tauri.app/develop/tests/webdriver/example/webdriverio
- **tauri-driver GitHub**: https://github.com/tauri-apps/tauri/tree/dev/tooling/webdriver

## Success Criteria

We know E2E testing is working when:
- ✅ Application launches via WebDriver
- ✅ Can find elements by `data-testid`
- ✅ Can interact with UI (click, type, etc.)
- ✅ Can verify state changes
- ✅ Can take screenshots
- ✅ Tests run reliably in CI

Once we get ONE test passing, the rest is just writing test scenarios!
