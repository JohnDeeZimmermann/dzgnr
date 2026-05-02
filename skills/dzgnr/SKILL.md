---
name: dzgnr
description: Use when creating print-oriented designs with Dzgnr, rendering HTML to correctly sized PDFs, building business cards, flyers, posters, banners, or packaging self-contained Dzgnr project directories with dzgnr.json dimensions and assets.
---

# dzgnr

## When to Use This Skill

Use this skill when the task is to design and render print-focused artifacts with Dzgnr, including business cards, flyers, posters, banners, signage, and similar physical deliverables where exact page dimensions matter.

## Core Workflow

1. Create a self-contained directory for one artifact.
2. Add `dzgnr.json` with `widthCm`, `heightCm`, `output`, `printBackground`, `media`, and `preferCssPageSize`.
3. Add `index.html` as the source design for single-page work, or `front.html` plus extra page files for multi-page work.
4. Add local assets under `assets/` when required.
5. Add a short `README.md` describing artifact intent, dimensions, assets, and render command.
6. Render from inside the project directory:

   ```bash
   dzgnr render index.html --config dzgnr.json
   ```

7. For machine-readable verification:

   ```bash
   dzgnr render index.html --config dzgnr.json --json
   ```

8. Confirm `dimensionsOk: true`, inspect warnings, and treat the Chromium CMYK/PDF-X warning as expected behavior.

## Required Project Structure

Use this layout per artifact:

```text
my-artifact/
  README.md
  dzgnr.json
  index.html
  front.html
  back.html
  assets/
    logo.svg
```

See `references/project-structure.md` for file-by-file guidance.

## Configuration Rules

- Keep default dimensions in each artifact's `dzgnr.json`.
- Do not make CLI `--width` and `--height` the primary workflow.
- Use CLI size flags only for quick local experiments.
- Keep config values reproducible and commit them with each artifact.
- Keep CSS page assumptions aligned with config where useful, but treat `dzgnr.json` as source of truth.
- Use `mode: "combined"` (default) for one PDF containing all pages.
- Use `mode: "separate"` for one PDF per page.
- For multi-page output, pass the front page as CLI input and add additional pages in config via `pages`.

Example config:

```json
{
  "widthCm": 9,
  "heightCm": 5.5,
  "output": "business-card.pdf",
  "printBackground": true,
  "media": "print",
  "preferCssPageSize": false
}
```

Two-page config example:

```json
{
  "widthCm": 9,
  "heightCm": 5.5,
  "output": "business-card.pdf",
  "mode": "combined",
  "pages": [
    { "path": "back.html", "name": "back" }
  ]
}
```

## HTML/CSS Design Rules

- Use `%`, grid/flex fractions, `clamp()`, `em`, and `rem` for adaptable layout internals.
- Use `cm` and `mm` for safe-area constants, borders, and print-critical constraints.
- Use `pt` for typography.
- Avoid hard-coding every internal offset in `cm`; it makes size overrides brittle.
- Keep each source HTML as a single printed page; use config `pages` to assemble multi-page PDFs.
- Preserve color intent in print with:

  ```css
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  ```

Reference pattern:

```css
:root {
  --safe: 6%;
  --gap: clamp(0.18cm, 3vw, 0.55cm);
  --display-size: clamp(14pt, 8vw, 34pt);
}

body {
  margin: 0;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page {
  width: 100%;
  height: 100%;
  padding: var(--safe);
  display: grid;
  gap: var(--gap);
}
```

## Rendering and Validation

Primary render command:

```bash
dzgnr render index.html --config dzgnr.json
```

Validation render command:

```bash
dzgnr render index.html --config dzgnr.json --json
```

Validation checks:

- `dimensionsOk: true`
- expected page count (1 for single-page, higher for multi-page)
- warnings reviewed and understood
- expected Chromium CMYK/PDF-X caveat present

## Design Quality Checklist

- Pick a clear visual direction (editorial, minimalist, playful, industrial, etc.).
- Create intentional hierarchy with one focal point and supporting information.
- Use contrast through size, weight, color, whitespace, and alignment.
- Keep content readable at real physical size.
- Keep key content within safe area (typically 3-5 mm from trim edges).
- Prefer vector assets and use 300 DPI raster images when needed.
- Avoid generic AI style cliches (default purple gradients, arbitrary blobs, centered-card sameness).
- Do not claim true CMYK/PDF-X/crop-mark guarantees from Chromium output.

## Common Print Sizes

See `references/print-sizes.md`.

## Example Projects

- `examples/business-card/`: 9.0 x 5.5 cm identity card with compact hierarchy.
- `examples/event-flyer/`: A5 event flyer using a modular grid and scalable type.
- `examples/two-page-card/`: 9.0 x 5.5 cm front/back business card using config `pages`.

Each example includes `README.md`, `dzgnr.json`, HTML source files, and local assets when needed.
