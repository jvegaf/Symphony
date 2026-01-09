# Phase 5 Testing Checklist - Manual Verification

## Status: Testing Phase 5 Integration (90% → 100%)

### Testing Environment
- ✅ Dev server running: `npm run dev`
- ✅ No Svelte compilation errors
- ✅ All hooks imported correctly
- ✅ TypeScript errors only in old React files (expected)

---

## Component Testing Checklist

### 1. SettingsModal.svelte ✅
**Hooks Used**: `useGetAllSettings()`, `useUpdateSettings()`, `useResetSettings()`

**Test Steps**:
- [ ] Open Settings modal
- [ ] Verify settings load from backend (no placeholder data)
- [ ] Change a setting (e.g., theme)
- [ ] Click Save - verify mutation succeeds
- [ ] Verify UI updates immediately
- [ ] Click Reset - verify all settings reset to defaults
- [ ] Verify error handling (if backend offline)

**Expected Behavior**:
- Settings load from real backend
- Save mutation shows loading state
- Success shows toast notification
- Reset works with confirmation

---

### 2. OnboardingModal.svelte ✅
**Hooks Used**: `useImportLibrary()` (with Tauri events), `useUpdateSetting()`

**Test Steps**:
- [ ] Open Onboarding modal
- [ ] Select a folder for import
- [ ] Click Import - verify import starts
- [ ] Verify progress bar updates via Tauri events
- [ ] Verify import completes successfully
- [ ] Verify folder setting is saved to backend
- [ ] Verify modal transitions to complete state

**Expected Behavior**:
- Import progress updates in real-time
- Tauri event listeners work correctly
- Folder setting persists after import
- Error handling for failed imports

---

### 3. TrackDetail.svelte ✅
**Hooks Used**: `useGetTrack()`, `useUpdateTrackMetadata()`, `useGetTrackArtwork()`

**Test Steps**:
- [ ] Open track detail modal for any track
- [ ] Verify track data loads from backend
- [ ] Verify artwork loads (if available)
- [ ] Edit track title/artist/album
- [ ] Click Save - verify mutation succeeds
- [ ] Verify changes persist after reload
- [ ] Test navigation between tracks
- [ ] Test error handling for invalid data

**Expected Behavior**:
- Track data loads instantly (cached)
- Artwork displays correctly
- Save shows loading state
- Changes persist across navigation
- Validation works for required fields

---

### 4. Sidebar.svelte ✅
**Hooks Used**: `useGetPlaylists()`, `useCreatePlaylist()`, `useUpdatePlaylist()`, `useDeletePlaylist()`, `useAddTracksToPlaylist()`, `useCreatePlaylistWithTracks()`

**Test Steps**:
- [ ] Verify playlists load from backend
- [ ] Create new empty playlist (+ button)
- [ ] Rename playlist (double-click)
- [ ] Delete playlist (right-click → Delete)
- [ ] Create playlist with tracks (context menu)
- [ ] Drag tracks from table to playlist
- [ ] Verify playlist selection works
- [ ] Verify optimistic updates (instant UI feedback)

**Expected Behavior**:
- All CRUD operations work
- Optimistic updates show immediately
- Rollback on errors
- Drag-and-drop adds tracks to playlists
- Context menu operations work

---

### 5. TrackTable/index.svelte ✅
**Hooks Used**: `useUpdateTrackRating()`, `useDeleteTrack()`, `useReorderPlaylistTracks()`, `useRemoveTrackFromPlaylist()`

**Test Steps**:
- [ ] Load tracks in table
- [ ] Update track rating (star rating)
- [ ] Delete track (context menu → Delete)
- [ ] Select multiple tracks
- [ ] Test reordering in playlist view
- [ ] Test removing tracks from playlist
- [ ] Verify selection cleanup after operations

**Expected Behavior**:
- Rating updates persist immediately
- Delete removes track from UI instantly
- Reordering works in playlist mode
- Selection state updates correctly
- Error handling for failed operations

---

### 6. PlayerSection.svelte ✅
**Hooks Used**: `useGetBeatgrid()`, `useAnalyzeBeatgrid()`, `useGetTrackArtwork()`

**Test Steps**:
- [ ] Load track in player
- [ ] Verify artwork loads
- [ ] Verify beatgrid loads (if exists)
- [ ] Click "Analyze Beatgrid" button
- [ ] Verify analysis mutation runs
- [ ] Verify beatgrid updates after analysis
- [ ] Test with track that has no beatgrid

**Expected Behavior**:
- Artwork loads from cache
- Beatgrid analysis shows loading state
- Beatgrid data updates after analysis
- Error handling for analysis failures

---

## Integration Testing

### Query Invalidation ✅
**Test Steps**:
- [ ] Create playlist in Sidebar
- [ ] Verify playlist appears in list immediately
- [ ] Delete playlist
- [ ] Verify playlist disappears immediately
- [ ] Update track metadata in TrackDetail
- [ ] Verify changes reflect in TrackTable

**Expected Behavior**:
- All related queries invalidate correctly
- UI updates immediately after mutations
- No stale data issues

### Error Handling ✅
**Test Steps**:
- [ ] Disconnect backend (if possible)
- [ ] Try operations that require backend
- [ ] Verify error messages appear
- [ ] Reconnect and verify operations work again

**Expected Behavior**:
- Graceful error handling
- User-friendly error messages
- Recovery after errors

### Performance ✅
**Test Steps**:
- [ ] Navigate between tracks quickly
- [ ] Switch between playlists rapidly
- [ ] Load large track lists
- [ ] Verify no memory leaks
- [ ] Check network requests (should be cached)

**Expected Behavior**:
- Fast loading from cache
- No excessive network requests
- Smooth UI interactions
- No memory leaks

---

## Test Results Summary

### Passed: __/6 Components
### Failed: __/6 Components
### Issues Found: __________

### Notes:
- [ ] All hooks work correctly
- [ ] No placeholder data remaining
- [ ] Error handling works
- [ ] Performance is good
- [ ] UI is responsive

---

## Next Steps After Testing

If all tests pass:
1. ✅ Mark Phase 5 as 100% complete
2. ✅ Create Phase 6 planning document
3. ✅ Begin Phase 6: Integration & Testing

If issues found:
1. 🔧 Fix identified issues
2. 🔄 Re-test components
3. ✅ Mark Phase 5 complete after fixes

---

## Testing Commands

```bash
# Start dev server
npm run dev

# Check for runtime errors
# Open browser console during testing

# Check network requests
# Open browser dev tools → Network tab

# Test error scenarios
# Stop backend, try operations, restart backend
```

---

**Goal**: Verify all 6 integrated components work end-to-end with real backend data via TanStack Svelte Query hooks.