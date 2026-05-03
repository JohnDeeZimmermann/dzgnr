# Dzgnr

CLI tool to generate properly sized PDFs from HTML designs — built for AI agents.

## Prerequisites

- [Bun](https://bun.sh) runtime
- [Playwright Chromium](https://playwright.dev/) (installed via `bunx playwright install chromium`)
- [Ghostscript](https://ghostscript.com/) (for CMYK conversion; optional with `--rgb`)

## Installation

```bash
# Install dependencies
bun install

# Install Playwright Chromium (first time only)
bunx playwright install chromium

# Install Ghostscript for CMYK conversion
sudo apt install ghostscript   # Ubuntu/Debian
brew install ghostscript        # macOS

# Link globally so `dzgnr` is available anywhere
bun link
```

After linking, the `dzgnr` command will be available globally.

## Quick Start

```bash
# Render a CMYK-converted PDF (default)
dzgnr render examples/business-card.html --width 9 --height 5.5 --out business-card.pdf

# Render an RGB draft PDF (skip CMYK conversion)
dzgnr render examples/business-card.html --width 9 --height 5.5 --out business-card.pdf --rgb
```

## Usage

```
dzgnr render <input.html> [options]

Arguments:
  <input.html>  Path to HTML file to render

Options:
  --width <cm>     Page width in centimeters (required unless in config)
  --height <cm>    Page height in centimeters (required unless in config)
  --out <path>     Output PDF path (default: derived from input name)
  --config <path>  Path to JSON config file
  --screen         Use screen media instead of print media
  --rgb            Skip CMYK conversion; output Chromium RGB PDF directly
  --json           Output validation report as JSON
```

## Configuration

Create a `dzgnr.json` file (or pass `--config <path>`):

```json
{
  "widthCm": 9,
  "heightCm": 5.5,
  "printBackground": true,
  "media": "print",
  "preferCssPageSize": false
}
```

CLI flags always override config values.

### CMYK options

CMYK conversion is enabled by default. Disable with `--rgb` or `"cmyk": false` in config:

```json
{
  "cmyk": false
}
```

Specify a custom ICC profile:

```json
{
  "cmykProfile": "/path/to/profile.icc"
}
```

Dzgnr uses Ghostscript's bundled default CMYK profile when none is explicitly set. See `profiles/README.md` for details on profiles.

## Google Fonts

Include Google Fonts in your HTML with standard `<link>` tags. Dzgnr waits for font loading before generating the PDF. If fonts fail to load (e.g., no network access), a warning is emitted but rendering continues.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
```

## Validation Output

After rendering, Dzgnr inspects the generated PDF and reports:

- output path and page count
- expected vs actual page dimensions (cm, pt)
- dimension tolerance check
- CMYK conversion status
- warnings for mismatches, font readiness, and conversion issues

Pass `--json` for machine-readable output.

## CMYK / Print Pipeline

Dzgnr renders HTML with Chromium, then converts the resulting PDF to CMYK via Ghostscript. This produces print-ready CMYK PDFs by default.

- **Default**: CMYK conversion via Ghostscript (requires `gs` in PATH)
- **Draft mode**: `--rgb` or `"cmyk": false` produces Chromium RGB PDFs
- **Custom profiles**: `"cmykProfile"` in config accepts any ICC profile path
- **Scope**: CMYK conversion only; Dzgnr does not claim PDF/X compliance

## Common Print Sizes (cm)

| Artifact       | Width | Height |
| -------------- | ----- | ------ |
| Business card  | 9.0   | 5.5    |
| US business    | 8.9   | 5.1    |
| A4             | 21.0  | 29.7   |
| A5             | 14.8  | 21.0   |
| A6             | 10.5  | 14.8   |
| US Letter      | 21.6  | 27.9   |
| Poster (A2)    | 42.0  | 59.4   |

## Development

```bash
bun run dev        # Watch mode
bun run typecheck  # Type check
```
