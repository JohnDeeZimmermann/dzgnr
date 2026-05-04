# ICC Profiles

Dzgnr uses Ghostscript for two color-managed operations: CMYK PDF conversion and CMYK-to-RGB PNG preview generation. Both require ICC profiles.

## Default behavior

### CMYK Profiles

Dzgnr resolves CMYK profiles in this order:

1. Explicit `cmykProfile` path in `dzgnr.json`
2. Ghostscript's bundled `default_cmyk.icc` (at `/usr/share/ghostscript/iccprofiles/`)
3. Errors with installation instructions if no profile is found

### RGB Profiles (for PNG Previews)

When generating CMYK-mapped PNG previews (`--png`), Dzgnr also needs an sRGB output ICC profile to color-manage the CMYK PDF back into RGB image space. Dzgnr resolves RGB profiles in this order:

1. Ghostscript's bundled `srgb.icc` (at `/usr/share/ghostscript/iccprofiles/`)
2. Ghostscript's bundled `default_rgb.icc` (at `/usr/share/ghostscript/iccprofiles/`)

If no RGB profile is found, CMYK-mapped PNG previews will fail with a clear error message. Use `--rgb` to skip CMYK and generate draft RGB PNGs without ICC color management.

## Why no bundled profile?

ICC profiles bundled with Ghostscript are subject to its AGPL license and cannot be redistributed separately. Dzgnr relies on the system-installed Ghostscript to provide profiles. This keeps licensing simple and ensures profiles match the Ghostscript version in use.

## Using a custom profile

Specify a path in `dzgnr.json`:

```json
{
  "cmykProfile": "/path/to/custom-profile.icc"
}
```

## Recommended profiles

For production print work, obtain a profile matching your printer/paper combination:

- ECI profiles (eciCMYK v2 / FOGRA53 etc.): https://www.eci.org/en/downloads
- ICC profile registry: https://www.color.org/registry/index.xalter

## Getting Ghostscript

Install Ghostscript to enable CMYK conversion:

```bash
# Ubuntu/Debian
sudo apt install ghostscript

# macOS (Homebrew)
brew install ghostscript

# Other platforms
# See https://ghostscript.com/
```
