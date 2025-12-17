# Waveform Race Condition Fix

> ⚠️ **DEPRECATED**: Este documento ha sido reemplazado por [docs/waveform-implementation.md](docs/waveform-implementation.md). Ver la nueva arquitectura y solución de condiciones de carrera allí.


## Date: 2025-12-16

## Problem Identified

The `waveform:complete` event was being emitted by the backend but NEVER received by the frontend React component.

### Root Cause: Race Condition

The issue was caused by **TWO separate `useEffect` hooks** in `src/hooks/useWaveform.ts`:

1. **Effect #1 (lines 60-124)**: Set up event listeners
   - Called `listen()` which returns a **Promise**
   - Listeners not guaranteed to be ready immediately

2. **Effect #2 (lines 127-161)**: Called `invoke('get_waveform')`
   - Backend checked cache and emitted events **immediately** if cached
   - Event emitted BEFORE listeners were ready!

### Why Progress Events Worked But Complete Didn't

- **Progress events**: Emitted during async generation task (lines 181+ in waveform.rs)
  - Gave time for React listeners to set up
  - Always received successfully

- **Complete events from cache**: Emitted synchronously in command handler (line 132 in waveform.rs)
  - Fired before `Promise.all(unlistenPromises)` resolved
  - Lost in the void!

### Secondary Issue: React StrictMode

React.StrictMode causes double-mounting in development:
- Components mount → unmount → remount
- Event listeners set up twice
- Possible closure capturing wrong trackId
- Confusing console logs

## Solution Applied

### 1. Combined Effects (CRITICAL FIX)

**File**: `src/hooks/useWaveform.ts`

Merged both effects into ONE to guarantee order:

```typescript
useEffect(() => {
  // ... validation ...
  
  const setupListenersAndRequest = async () => {
    // 1. Setup listeners FIRST (await each one)
    const unlistenProgress = await listen(...);
    const unlistenComplete = await listen(...);
    const unlistenError = await listen(...);
    
    // 2. NOW request waveform (listeners guaranteed ready!)
    await invoke('get_waveform', { trackId, trackPath, duration });
    
    return cleanup function;
  };
  
  setupListenersAndRequest().then(...);
  
  return cleanup;
}, [trackId, trackPath, duration]);
```

**Key changes:**
- Single effect with async setup function
- Listeners are `await`ed before calling `invoke()`
- `isActive` flag prevents state updates after unmount
- Proper cleanup of all listeners

### 2. Disabled React.StrictMode (TEMPORARY)

**File**: `src/main.tsx`

Removed `<React.StrictMode>` wrapper temporarily to:
- Eliminate double-mounting confusion
- Reduce console noise during debugging
- Verify fix works in production-like mode

**Note**: Re-enable after confirming fix works consistently!

### 3. Added Debug Utility (FOR FUTURE DEBUGGING)

**File**: `src/utils/waveform-debug.ts` (NEW)

Global event listener that bypasses React lifecycle:

```typescript
// In browser console:
window.debugWaveform()

// Logs ALL waveform events with:
// - Event counts (progress, complete, error)
// - Full payload inspection
// - Timestamps
// - Cleanup function
```

Exposed via `src/App.tsx` import.

## Testing Instructions

### 1. Clear Waveform Cache

```bash
# Find Symphony database
ls ~/.local/share/symphony/

# Optional: Delete waveform cache to test both paths
sqlite3 ~/.local/share/symphony/symphony.db "DELETE FROM waveforms;"
```

### 2. Start Dev Server

```bash
npm run tauri dev
```

### 3. Test Cached Waveforms

1. Select a track (generates waveform)
2. Wait for completion
3. Select SAME track again
4. **Expected**: Instant waveform display (cache hit)
5. **Check logs**: `✅ waveform:complete event RECEIVED`

### 4. Test Fresh Generation

1. Select a NEW track
2. **Expected**: Progress events → Complete event
3. **Check logs**: `📊 waveform:progress` multiple times, then `✅ waveform:complete`

### 5. Use Debug Utility

Open browser console:

```javascript
// Install global debugger
const cleanup = await window.debugWaveform();

// Select tracks and watch console output

// When done:
cleanup();
```

## What to Look For

### Success Indicators ✅

```
Console logs:
========== useWaveform: SETUP START ==========
👂 Setting up event listeners...
✅ Listeners ready, now requesting waveform...
✅ get_waveform command sent successfully

// For cached:
✅ waveform:complete event RECEIVED: {trackId: "...", peaksLength: 2462}
🎯 MATCH! Converting peaks to Float32Array...
✅ Float32Array created: 2462 peaks
✅ State updated with peaks!

// For fresh generation:
📊 waveform:progress event: {progress: 0.10, ...}
📊 waveform:progress event: {progress: 0.20, ...}
...
✅ waveform:complete event RECEIVED: {trackId: "...", peaksLength: 2462}
```

**Visual**: Waveform appears in player section

### Failure Indicators ❌

```
// Event never received:
✅ Listeners ready, now requesting waveform...
✅ get_waveform command sent successfully
[NOTHING AFTER THIS]

// Track ID mismatch:
⚠️ Ignoring event - trackId mismatch or component unmounted

// Component unmounted before event:
isActive: false
```

## Backend Logs (Terminal)

Check `~/.local/share/symphony/symphony.log` or terminal:

```
✅ Waveform cache HIT for track 6d714672-...
📤 Emitting waveform:complete event (from cache) - 2462 peaks
✅ waveform:complete event emitted successfully
```

## Files Modified

1. **src/hooks/useWaveform.ts**
   - Merged two effects into one
   - Added `isActive` flag for cleanup safety
   - Added detailed logging
   - Fixed race condition

2. **src/main.tsx**
   - Removed React.StrictMode wrapper
   - Added AIDEV-NOTE explaining why

3. **src/utils/waveform-debug.ts** (NEW)
   - Global event debugger utility
   - Exposed via window.debugWaveform()

4. **src/App.tsx**
   - Imported waveform-debug.ts to expose utility

## Next Steps

1. **Test both cache paths** (hit and miss)
2. **Verify waveform renders visually**
3. **Check WaveSurfer integration** in WaveformViewer.tsx
4. **Re-enable StrictMode** after confirming fix works
5. **Remove verbose console.log** statements (or keep for debugging)
6. **Run full test suite** to ensure no regressions

## Potential Remaining Issues

### If waveform still doesn't display:

1. **Check WaveformViewer.tsx**:
   - Verify `wavesurfer.load()` is called correctly
   - Check Float32Array conversion
   - Verify duration matches peaks length

2. **Check backend event emission**:
   - Use global debugger to confirm event arrives
   - Verify payload structure matches TypeScript types

3. **Check database**:
   ```bash
   sqlite3 ~/.local/share/symphony/symphony.db "SELECT id, LENGTH(data) FROM waveforms;"
   ```

4. **Check Tauri version compatibility**:
   ```bash
   grep "tauri =" src-tauri/Cargo.toml
   npm list @tauri-apps/api
   ```

## Lessons Learned

1. **Never split async setup across multiple effects**
   - Race conditions are hard to debug
   - Order of execution is unpredictable

2. **await ALL async operations before proceeding**
   - `Promise.all()` doesn't guarantee ready state
   - Individual `await` ensures sequential execution

3. **StrictMode can hide timing bugs**
   - Double-mounting masks race conditions
   - Test in both modes

4. **Always provide global debug tools**
   - Bypassing framework helps isolate issues
   - Console access speeds up diagnosis

5. **Log EVERYTHING during debugging**
   - Timestamps help identify timing issues
   - Verbose is better than guessing
