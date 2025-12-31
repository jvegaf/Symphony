# Beatport Fix Tags Optimization - Test Guide

## Quick Reference for Testing the Performance Improvements

### Test Commands

```bash
# Compile and run all tests
cd /home/th3g3ntl3man/Code/Symphony
make test

# Backend tests only
cd src-tauri
cargo test --lib

# Frontend tests only  
npm test

# Full check (lint + tests)
make check

# Build optimized binary
cd src-tauri
cargo build --release
```

### Expected Test Results

- **Backend**: 178 tests passing, 1 ignored
- **Frontend**: 611 tests passing
- **Total**: 789 tests passing

### Manual Testing

#### 1. Test Search Candidates (10 tracks)

```typescript
// In Symphony app:
// 1. Select 10 tracks
// 2. Right-click → "Fix Tags from Beatport" → "Search Candidates"
// 3. Observe progress events (should update in real-time)
// 4. Time the operation

Expected time: ~2 seconds (down from ~7 seconds)
```

#### 2. Test Apply Tags (10 tracks)

```typescript
// After search candidates:
// 1. Select matches for each track
// 2. Click "Apply Tags"
// 3. Observe progress events
// 4. Time the operation

Expected time: ~3.5 seconds (down from ~9.6 seconds)
```

#### 3. Test Large Batch (100 tracks)

```typescript
// 1. Select 100 tracks
// 2. Run full Fix Tags workflow
// 3. Verify progress updates are smooth
// 4. Check for rate limiting (429 errors)

Expected time: ~55 seconds (down from ~166 seconds)
```

### Performance Benchmarks

| Test Case | Before | After | Speedup |
|-----------|--------|-------|---------|
| Search 10 tracks | ~7s | ~2s | 3.5× |
| Apply 10 tracks | ~9.6s | ~3.5s | 2.7× |
| Total 10 tracks | ~17s | ~5.5s | 3.1× |
| Search 100 tracks | ~70s | ~20s | 3.5× |
| Apply 100 tracks | ~96s | ~35s | 2.7× |
| Total 100 tracks | ~166s | ~55s | 3.0× |

### Things to Verify

#### Functional Tests

- [ ] Search returns correct candidates
- [ ] Match scores are accurate
- [ ] Tags are applied correctly
- [ ] Database is updated properly
- [ ] Progress events fire in real-time
- [ ] Error handling works (network errors, 429s)

#### Performance Tests

- [ ] Search phase is ≤3s for 10 tracks
- [ ] Apply phase is ≤4s for 10 tracks
- [ ] Total time is ≤6s for 10 tracks
- [ ] No memory leaks in long operations
- [ ] Progress UI stays responsive

#### Edge Cases

- [ ] Empty selection (0 tracks)
- [ ] Single track
- [ ] Very large batch (200+ tracks)
- [ ] Network errors during parallel requests
- [ ] Rate limiting (429 errors) triggers adaptive backoff
- [ ] Partial failures (some tracks succeed, some fail)

### Debugging

#### Check Concurrency Settings

```rust
// In src-tauri/src/library/beatport/client/concurrent.rs
ConcurrencyConfig::for_search() // max_concurrent: 4
ConcurrencyConfig::for_api()    // max_concurrent: 3
```

#### Monitor Rate Limiting

```rust
// RateLimitState logs when 429 is detected
// Check logs for:
// - "Rate limit detected (429)"
// - "Applying slowdown for 10 seconds"
```

#### Verify Batch Query

```rust
// In src-tauri/src/db/queries/tracks/read.rs
// get_tracks_batch() should execute 1 query for all tracks
// Check DB logs for: SELECT ... WHERE id IN (?, ?, ...)
```

### Common Issues

#### Issue: Tests fail with "bitrate" or "play_count" NULL errors

**Solution**: Update test helper in `read.rs` to insert all required fields:

```rust
fn insert_test_track(conn: &Connection, id: &str, title: &str) {
    conn.execute(
        "INSERT INTO tracks (id, path, title, artist, duration, bitrate, 
         sample_rate, file_size, play_count, date_added, date_modified)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![id, "/test.mp3", title, "Test Artist", 
                         180.0, 320, 44100, 1024, 0, "2025-01-01", "2025-01-01"],
    ).unwrap();
}
```

#### Issue: Compilation error about HashMap types

**Solution**: Ensure `tracks_map` is wrapped in `Arc` and properly cloned:

```rust
let tracks_map = Arc::new({
    queries::get_tracks_batch(&db.conn, &track_ids)?
        .into_iter()
        .filter_map(|t| t.id.clone().map(|id| (id, t)))
        .collect::<HashMap<_, _>>()
});

// In futures closure:
let tracks_map = tracks_map.clone();
```

#### Issue: Too many 429 errors

**Solution**: Reduce concurrency:

```rust
// For search (HTML scraping)
max_concurrent: 3 // was 4

// For API calls
max_concurrent: 2 // was 3
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run backend tests
  run: cd src-tauri && cargo test --lib
  
- name: Run frontend tests  
  run: npm test
  
- name: Check performance benchmarks
  run: ./scripts/benchmark-beatport.sh
```

### Profiling Tools

```bash
# Profile backend
cd src-tauri
cargo flamegraph --bin symphony

# Profile with criterion
cargo bench

# Memory profiling with valgrind
valgrind --tool=massif target/debug/symphony
```

### Success Criteria

✅ All tests pass (789 total)  
✅ Search phase ≤3s for 10 tracks  
✅ Apply phase ≤4s for 10 tracks  
✅ No memory leaks  
✅ Real-time progress updates  
✅ Graceful error handling  
✅ Adaptive rate limiting works  

---

## Related Documentation

- [BEATPORT_FIX_TAGS_OPTIMIZATION.md](./BEATPORT_FIX_TAGS_OPTIMIZATION.md) - Full technical documentation
- [API.md](./API.md) - Beatport API reference
- [database-management.md](./database-management.md) - DB schema and queries
