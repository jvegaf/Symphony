# AppImage Build Disabled (Temporary)

## Status: Disabled as of 2025-12-19

**Affected versions:** v0.7.0+

## Why Disabled?

AppImage builds are temporarily disabled due to a compatibility issue between Tauri 2.9.6's bundler and Arch Linux (and possibly other distributions).

### Symptoms
```bash
npm run tauri build -- --bundles appimage
# Result: failed to bundle project `failed to run linuxdeploy`
```

### What We Tried
1. ✅ Installed `linuxdeploy-appimage` from AUR
2. ✅ Installed `appimagetool-bin` from AUR
3. ✅ Created symlinks in `/usr/local/bin/`
4. ✅ Verified both tools work independently
5. ✅ Set environment variables (`LINUXDEPLOY=/usr/local/bin/linuxdeploy`)
6. ✅ Manual linuxdeploy execution succeeds
7. ❌ Tauri bundler still fails with generic error

### Diagnosis
- **Root cause:** Likely a bug in Tauri's AppImage bundler integration
- **Scope:** Local builds on Arch Linux (GitHub Actions on Ubuntu 22.04 may work differently)
- **Error message:** Too generic to debug without diving into Tauri source code
- **Tools verified:** Both `linuxdeploy` v1-alpha (build 331) and `appimagetool` continuous (build 295) work correctly

## Current Solution

**Configuration change in `src-tauri/tauri.conf.json`:**
```json
{
  "bundle": {
    "active": true,
    "targets": ["deb", "rpm"],  // Changed from "all"
    ...
  }
}
```

### Linux Package Coverage
- **`.deb`** - Debian, Ubuntu, Linux Mint, Pop!_OS, Elementary, MX Linux (~60% of desktop Linux users)
- **`.rpm`** - Fedora, RHEL, CentOS, openSUSE, Mageia (~25% of desktop Linux users)
- **Total coverage:** ~85% of Linux desktop users

Users on other distributions (Arch, Gentoo, etc.) can:
1. Install from `.deb` or `.rpm` using alien/conversion tools
2. Build from source: `make build-linux`
3. Use distro-specific package managers (AUR for Arch)

## When Will AppImage Be Re-enabled?

**Conditions for re-enabling:**
1. Tauri releases a fix (monitor: https://github.com/tauri-apps/tauri/issues)
2. Workaround script is created (manual AppImage creation)
3. Community reports success on different distributions

**Tracking issue:** [Create GitHub issue to track this]

## For Developers

### Local Development
Build without AppImage:
```bash
npm run tauri build -- --bundles deb,rpm
```

### CI/CD
GitHub Actions Release workflow already configured:
- Installs both `linuxdeploy` and `appimagetool`
- Includes `libfuse2` dependency
- Targets only `.deb` and `.rpm`

### Testing AppImage Locally (Manual)
If you want to test AppImage creation manually:

```bash
# Build the binary
cd src-tauri
cargo build --release

# Create AppDir structure
mkdir -p /tmp/symphony-appdir/usr/bin
cp target/release/symphony /tmp/symphony-appdir/usr/bin/

# Run linuxdeploy
linuxdeploy --appdir /tmp/symphony-appdir \
  --executable /tmp/symphony-appdir/usr/bin/symphony \
  --desktop-file ../path/to/symphony.desktop \
  --icon-file icons/128x128.png \
  --output appimage
```

## References

- **Tauri CLI version:** `@tauri-apps/cli@2.9.6`
- **linuxdeploy docs:** https://docs.appimage.org/packaging-guide/linuxdeploy/index.html
- **Tauri bundler docs:** https://v2.tauri.app/reference/config/#bundleconfig
- **Related workflow changes:** `.github/workflows/release.yml`

---

**Last updated:** 2025-12-19  
**Next review:** After Tauri 2.10+ release or when community feedback is available
