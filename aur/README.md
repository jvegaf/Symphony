# Symphony AUR Package

This directory contains files for building Symphony for Arch Linux via the AUR (Arch User Repository).

## Files

- **`PKGBUILD`** - Build script for Arch Linux package creation
- **`.SRCINFO`** - Metadata file for AUR (auto-generated from PKGBUILD)
- **`symphony.desktop`** - Desktop entry file for application launcher

## Building from Source (Local)

```bash
cd aur/
makepkg -si
```

This will:
1. Download Symphony source code (v0.7.0)
2. Install build dependencies (Rust, npm, webkit2gtk)
3. Build the frontend (npm run build)
4. Build the Rust backend (cargo build --release)
5. Create and install the package

## Installing from AUR

Once published to AUR, users can install with:

```bash
# Using yay
yay -S symphony-bin

# Using paru
paru -S symphony-bin

# Manual method
git clone https://aur.archlinux.org/symphony-bin.git
cd symphony-bin
makepkg -si
```

## Dependencies

### Build Dependencies (makedepends)
- `rust` - Rust compiler and toolchain
- `cargo` - Rust package manager
- `npm` - Node.js package manager
- `webkit2gtk` - WebKit rendering engine

### Runtime Dependencies (depends)
- `webkit2gtk` - WebKit rendering engine (runtime)
- `gtk3` - GTK3 toolkit
- `libayatana-appindicator` - System tray support
- `sqlite` - Database engine
- `alsa-lib` - Audio library

### Optional Dependencies (optdepends)
- `ffmpeg` - For audio format conversion support

## Package Information

- **Package name:** `symphony-bin`
- **Version:** 0.7.0
- **Architecture:** x86_64
- **License:** MIT
- **URL:** https://github.com/jvegaf/Symphony

## Updating .SRCINFO

After modifying `PKGBUILD`, regenerate `.SRCINFO`:

```bash
cd aur/
makepkg --printsrcinfo > .SRCINFO
```

## Publishing to AUR (Maintainer Only)

1. Create AUR account at https://aur.archlinux.org/
2. Upload SSH key to AUR account
3. Clone AUR repo:
   ```bash
   git clone ssh://aur@aur.archlinux.org/symphony-bin.git aur-publish
   ```
4. Copy files:
   ```bash
   cp aur/{PKGBUILD,.SRCINFO} aur-publish/
   ```
5. Commit and push:
   ```bash
   cd aur-publish/
   git add PKGBUILD .SRCINFO
   git commit -m "Update to v0.7.0"
   git push
   ```

## Testing

Test the PKGBUILD locally before publishing:

```bash
cd aur/
makepkg -f  # Force rebuild
namcap PKGBUILD  # Lint PKGBUILD
namcap symphony-bin-*.pkg.tar.zst  # Lint built package
```

## Quick Start (After Repository is Public)

```bash
# From project root, run:
./scripts/test-aur-after-public.sh  # Verify everything is ready
make aur-build                       # Build the package
make aur-install                     # Install and test locally
```

See `POST_PUBLIC_CHECKLIST.md` for complete publishing guide.

## Notes

- This is a `-bin` package that builds from source (not a true binary package)
- For a true binary package, we would download pre-built `.tar.gz` from GitHub Releases
- The `sha256sums` is calculated from the v0.7.0 tag tarball
- Desktop file is installed to `/usr/share/applications/`
- Icons are installed to `/usr/share/icons/hicolor/`
- **IMPORTANT**: Repository must be public for AUR users to download source

## Troubleshooting

### Build fails with "command not found: npm"
Install Node.js: `sudo pacman -S nodejs npm`

### Build fails with "webkit2gtk not found"
Install webkit2gtk: `sudo pacman -S webkit2gtk`

### Build fails with "cargo not found"
Install Rust: `sudo pacman -S rust`

## Related Documentation

- [ArchWiki: PKGBUILD](https://wiki.archlinux.org/title/PKGBUILD)
- [ArchWiki: AUR submission guidelines](https://wiki.archlinux.org/title/AUR_submission_guidelines)
- [Tauri Bundler Docs](https://v2.tauri.app/reference/config/#bundle)
