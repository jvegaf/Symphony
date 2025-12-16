# Waveform Debug Steps

> ⚠️ **DEPRECATED**: Esta guía ha sido reemplazada por [docs/waveform-implementation.md](docs/waveform-implementation.md). Usa ese documento para troubleshooting actualizado.


## The Problem
After implementing fixed heights to prevent layout jumps, the waveform is no longer displaying.

## Diagnostic Logging Added

### Frontend Logs (Browser Console)
1. **useWaveform entry**: `🎯 useWaveform called with:` - Shows what parameters the hook receives
2. **WaveformViewer effect**: `🔍 WaveformViewer effect check:` - Shows if peaks/duration/container are ready
3. **Existing logs**: All the progress/complete event logs from before

## Testing Steps

### 1. Open the Application
```bash
npm run tauri dev
```

### 2. Open Browser DevTools
- The Tauri window should appear
- Press F12 or right-click → Inspect to open DevTools
- Go to the Console tab

### 3. Test Scenario: Select Track (Should NOT generate)
1. Click on a track in the library (single click to select)
2. **Expected console output:**
```javascript
🎯 useWaveform called with: { trackId: undefined, hasPath: false, duration: undefined }
```
3. **Expected behavior:** No waveform generation starts

### 4. Test Scenario: Play Track (SHOULD generate)
1. With a track selected, click the Play button
2. **Expected console output:**
```javascript
// First call with undefined (before state changes)
🎯 useWaveform called with: { trackId: undefined, hasPath: false, duration: undefined }

// Second call when shouldGenerate becomes true
🎯 useWaveform called with: { trackId: "6d714672...", hasPath: true, duration: 420.096 }
========== useWaveform: SETUP START ==========
Track ID: 6d714672-...
Track Path: /path/to/file.mp3
Duration: 420.096
👂 Setting up event listeners...
✅ Listeners ready, now requesting waveform...
✅ get_waveform command sent successfully

// Then either (cache hit):
✅ waveform:complete event RECEIVED: {trackId: "...", peaksLength: 2462}
🎯 MATCH! Converting peaks to Float32Array...
✅ Float32Array created: 2462 peaks
✅ State updated with peaks!

// Or (cache miss - streaming):
📊 waveform:progress event: {trackId: "...", progress: 0.1, partialPeaks: [...]}
📊 waveform:progress event: {trackId: "...", progress: 0.2, partialPeaks: [...]}
...
✅ waveform:complete event RECEIVED: ...
```

### 5. Check WaveformViewer Effect
After peaks are received, you should see:
```javascript
🔍 WaveformViewer effect check: {
  hasContainer: true,
  hasPeaks: true,
  peaksLength: 2462,  // or whatever number
  duration: 420.096,   // CRITICAL: Should NOT be undefined!
  shouldGenerate: true,
  trackId: "6d714672-..."
}
📊 Loading waveform with 2462 peaks, duration: 420.096
```

### 6. Visual Check
- **Canvas**: Should show the waveform visualization (blue bars)
- **Loading indicator**: Should appear briefly during generation (if cache miss)
- **Height**: PlayerSection should maintain constant height (~270px)

## Diagnosis Based on Logs

### Problem A: duration is undefined
**Symptom:**
```javascript
🔍 WaveformViewer effect check: {
  hasContainer: true,
  hasPeaks: true,
  peaksLength: 2462,
  duration: undefined,  // ❌ PROBLEM!
  shouldGenerate: true,
  trackId: "6d714672-..."
}
```
**Cause:** `track?.duration` is undefined in PlayerSection
**Solution:** Check database, ensure duration is stored correctly

### Problem B: peaks never arrive
**Symptom:**
```javascript
========== useWaveform: SETUP START ==========
✅ get_waveform command sent successfully
// ... then nothing (no progress, no complete)
```
**Cause:** Backend not emitting events OR listeners not catching them
**Solution:** Check backend logs, verify event names match

### Problem C: Container not ready
**Symptom:**
```javascript
🔍 WaveformViewer effect check: {
  hasContainer: false,  // ❌ PROBLEM!
  hasPeaks: true,
  peaksLength: 2462,
  duration: 420.096,
  shouldGenerate: true,
  trackId: "6d714672-..."
}
```
**Cause:** containerRef not attached to DOM element
**Solution:** Check if WaveformViewer div is rendering

### Problem D: WaveSurfer initialization error
**Symptom:**
```javascript
📊 Loading waveform with 2462 peaks, duration: 420.096
Error inicializando WaveSurfer: [error details]
```
**Cause:** WaveSurfer.js issue with parameters
**Solution:** Check error message, verify WaveSurfer.js version

## Backend Logs
```bash
tail -f ~/.local/share/symphony/symphony.log | grep -i waveform
```

Expected output when generating:
```
[INFO] get_waveform called for track: 6d714672-...
[INFO] Checking cache for track: 6d714672-...
[INFO] Cache MISS, generating waveform...
[INFO] Emitting progress: 10%
[INFO] Emitting progress: 20%
...
[INFO] Emitting waveform:complete with 2462 peaks
```

## Next Steps Based on Findings

1. **If duration is undefined** → Check track metadata loading
2. **If peaks never arrive** → Check backend generation
3. **If everything looks good but no visual** → Check WaveSurfer.js setup
4. **If layout still jumps** → Measure actual rendered heights

## Files Modified (Last Change)
- `src/components/WaveformViewer.tsx` - Added diagnostic logging in useEffect
- `src/hooks/useWaveform.ts` - Added parameter logging on entry
