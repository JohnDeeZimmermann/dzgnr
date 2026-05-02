# Plan: Dzgnr Quick MVP

## Objective

Build the first working MVP of **Dzgnr**: a Bun + TypeScript CLI that lets an AI agent point at an HTML design and receive a correctly sized PDF. The MVP should prioritize reliable dimensions in centimeters, simple Google Fonts support, and honest validation/reporting. It should not claim strict CMYK/PDF-X compliance.

## MVP User Experience

Target command shape:

```bash
bun run dzgnr render design.html --width 9 --height 5.5 --out business-card.pdf
```

Recommended flags:

- `render <input.html>`: render one HTML file to PDF.
- `--width <cm>`: required unless provided by config.
- `--height <cm>`: required unless provided by config.
- `--out <path>`: output PDF path; default can be derived from input name.
- `--config <path>`: optional JSON config file.
- `--screen`: optional; use screen media instead of print media.
- `--json`: optional future-friendly flag for machine-readable validation output.
- `--no-warn-cmyk`: optional future flag if warnings become noisy; not required for v0.

Config file can be JSON for the MVP:

```ts
interface DzgnrConfig {
  input?: string;
  output?: string;
  widthCm?: number;
  heightCm?: number;
  printBackground?: boolean;
  media?: "print" | "screen";
  preferCssPageSize?: boolean;
}
```

Resolution rule: CLI flags override config values.

## Recommended Project Structure

Create the Bun/TypeScript project at the repository root:

```text
package.json
tsconfig.json
README.md
src/
  index.ts                  # executable CLI entry point
  cli/args.ts               # parse command, flags, validation of required inputs
  config/load-config.ts     # read/merge JSON config + CLI flags
  sizing/units.ts           # cm/pt/mm conversion helpers and tolerance checks
  render/html-to-pdf.ts     # Playwright rendering pipeline
  fonts/wait-for-fonts.ts   # browser-side font readiness helper
  validate/pdf-report.ts    # pdf-lib inspection and warnings
examples/
  business-card.html        # minimal example using Google Fonts
```

Keep modules small and boring; this is a CLI MVP, not a framework yet.

## Dependencies

Core dependencies:

- `playwright`: launch Chromium and generate PDF.
- `pdf-lib`: inspect generated PDF page count and page sizes.

Development/tooling:

- Bun built-ins for running TypeScript.
- Use Bun's built-in argument parsing if sufficient; otherwise choose a small CLI parser. Avoid overengineering.

Do not add Ghostscript or PDF/X tooling for v0. Mention the limitation in validation output and README.

## Implementation Steps

### 1. Initialize Bun + TypeScript CLI

1. Add `package.json` with:
   - package name, e.g. `dzgnr`,
   - `bin` entry pointing to the compiled/TS CLI entry if packaging is desired,
   - scripts such as `dzgnr`, `dev`, and `typecheck`.
2. Add `tsconfig.json` suitable for Bun and modern ESM TypeScript.
3. Add a shebang to `src/index.ts` so it can become executable later:

```ts
#!/usr/bin/env bun
```

### 2. Define CLI and config merging

Implement parsing for `render <input.html>` and the MVP flags.

Validation rules:

- input file must exist and be an HTML file or at least a readable file,
- width and height must resolve to positive numbers in cm,
- output path must end in `.pdf` or be normalized to `.pdf`,
- reject unknown commands with a clear usage message.

Recommended internal normalized shape:

```ts
interface RenderOptions {
  inputPath: string;
  outputPath: string;
  widthCm: number;
  heightCm: number;
  printBackground: boolean;
  media: "print" | "screen";
  preferCssPageSize: boolean;
  json: boolean;
}
```

### 3. Implement sizing utilities

Create a small unit module with explicit conversion helpers:

```ts
const POINTS_PER_INCH = 72;
const CM_PER_INCH = 2.54;
```

Required helpers:

- `cmToPdfPoints(cm: number): number`
- `pdfPointsToCm(points: number): number`
- `formatCmForPlaywright(cm: number): string` returning strings like `"9cm"`
- `isWithinTolerance(actualCm, expectedCm, toleranceCm)`

Use a tolerance around `0.01cm` to `0.03cm` for validation to account for renderer/PDF rounding.

### 4. Implement HTML-to-PDF rendering

Use Playwright Chromium:

1. Launch Chromium headless.
2. Convert local input path to a `file://` URL.
3. Create a page.
4. Set media mode:
   - default: print media,
   - `--screen`: call `page.emulateMedia({ media: "screen" })`.
5. Navigate to the file URL with a load/network wait strategy.
6. Wait for fonts before generating the PDF.
7. Call `page.pdf()` with:
   - `path: outputPath`,
   - `width: "<width>cm"`,
   - `height: "<height>cm"`,
   - `printBackground: true`,
   - `preferCSSPageSize` based on options.
8. Always close the browser in a `finally` block.

Important: if `preferCSSPageSize` is true, CSS `@page` may override CLI/config dimensions. For the MVP, default it to false so command dimensions are authoritative.

### 5. Google Fonts MVP support

For v0, support Google Fonts by allowing normal browser loading:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
```

Before PDF generation, wait for browser font readiness with a page evaluation around `document.fonts.ready`. Add a timeout so the CLI does not hang forever.

If the timeout fires or `document.fonts` is unavailable, continue rendering but include a validation warning:

- “Font readiness could not be confirmed; Google Fonts may not be embedded if network access failed.”

Defer local Google Fonts caching/downloading to a later version.

### 6. Validate generated PDF

After rendering, load the output bytes using `pdf-lib`.

Report:

- output path,
- page count,
- expected size in cm,
- actual first-page size in points, mm, and cm,
- whether dimensions pass tolerance,
- warnings.

Validation warnings should include:

- page count not equal to 1, if the MVP expects single-page designs by default,
- width/height mismatch beyond tolerance,
- RGB/CMYK limitation: “Generated by Chromium; true CMYK/PDF-X output is not guaranteed.”
- font readiness warning if detected during render.

Suggested validation result shape:

```ts
interface PdfValidationReport {
  outputPath: string;
  pageCount: number;
  expected: { widthCm: number; heightCm: number };
  actualFirstPage: { widthPt: number; heightPt: number; widthCm: number; heightCm: number };
  dimensionsOk: boolean;
  warnings: string[];
}
```

Default output should be readable text. If `--json` is passed, print this structure as JSON.

### 7. Add an example design

Add `examples/business-card.html` with:

- Google Fonts link,
- CSS sized for the provided page,
- `-webkit-print-color-adjust: exact;` to preserve colors as much as Chromium allows,
- visible business-card content.

Keep it simple and useful for smoke-testing the CLI.

### 8. Documentation

Add a concise `README.md` covering:

- what Dzgnr does,
- install/setup commands,
- Playwright browser install step if needed,
- basic render command,
- JSON config example,
- Google Fonts usage,
- clear CMYK/PDF-X caveat,
- validation output explanation.

## Testing and Verification Plan

Per repository rule, do **not** write tests directly. Ask the testing subagent to create tests once implementation exists.

Implementation verification should include:

1. Typecheck the project.
2. Run the CLI against `examples/business-card.html` with dimensions such as `9 x 5.5 cm`.
3. Confirm the PDF is created.
4. Confirm validation reports page dimensions within tolerance.
5. Confirm Google Fonts either load successfully or produce an explicit warning.

Testing subagent should be asked to cover:

- unit conversion helpers,
- config/CLI precedence,
- validation tolerance behavior,
- missing input and invalid dimension errors,
- a smoke/integration test for PDF generation if Playwright is available in the test environment.

## Future Work After MVP

- Offline Google Fonts cache and CSS rewriting.
- Bleed, trim, safe-area, and crop-mark helpers.
- Preset sizes for common artifacts: business cards, A-series paper, banners, posters.
- Optional Ghostscript integration for best-effort CMYK/PDF-X post-processing.
- Multi-page support and templates.
- Agent-friendly design templates or a higher-level JSON schema.

## Critical Decisions for the Builder

- Use Playwright/Chromium for PDF generation, because it directly supports cm dimensions and modern HTML/CSS.
- Use pdf-lib for MVP validation, especially page count and page dimensions.
- Do not promise true CMYK in the MVP; warn clearly and reserve conversion for future Ghostscript/post-processing work.
- Make CLI/config dimensions authoritative by default; leave CSS `@page` override behind an explicit option.
