# Plan: Optional PNG Previews with CMYK-to-RGB Color Mapping

## Problem

Dzgnr currently produces PDF output only. AI agents can validate dimensions from the report, but cannot easily inspect the visual result. The requested feature is optional PNG output so agents can see and verify rendered designs.

The critical requirement is color fidelity: PNGs should reflect the final print-oriented CMYK PDF appearance mapped back into RGB image space, not raw Chromium screenshots.

## Chosen Behavior

- Keep PDF generation as the primary output and keep existing default behavior unchanged.
- Add an explicit PNG preview option, e.g. CLI `--png` and config `png: true`.
- When PNG previews are enabled, generate PNGs **after** the final PDF has been produced.
- If CMYK is enabled, rasterize the CMYK-converted PDF to RGB PNGs through Ghostscript ICC color management.
- If `--rgb`/`cmyk: false` is used, rasterize the final RGB PDF and clearly report that preview colors are draft/RGB, not CMYK-mapped.
- For multi-page PDFs, generate one PNG per PDF page.
- For separate mode, generate one PNG next to each separate PDF output.

## User-Facing API

### CLI

Add:

```text
--png             Generate RGB PNG preview(s) from the final PDF output
--png-dpi <dpi>   PNG preview resolution in DPI (optional; default 150 or 300)
```

Recommended default: `pngDpi = 150` for agent verification speed and manageable file size. If print-proof fidelity is preferred, choose `300`; document the tradeoff.

Example:

```bash
dzgnr render design.html --width 9 --height 5.5 --out business-card.pdf --png
```

### Config

Add:

```json
{
  "png": true,
  "pngDpi": 150
}
```

Merge rules:

- `png` defaults to `false`.
- CLI `--png` enables previews regardless of config.
- If config has `png: true`, previews are enabled without CLI flag.
- `pngDpi` defaults to the project default.
- CLI `--png-dpi` overrides config `pngDpi`.
- Validate `pngDpi` as a positive finite number.

Do **not** infer PNG behavior from `--out` extension. The clarified requirement is explicit selection.

## Output Naming

Use the PDF output path as the base unless a later implementation adds a dedicated preview path option.

### Combined mode

Given:

```text
outputPath = business-card.pdf
pages = front + back
mode = combined
```

Generate:

```text
business-card-1.png
business-card-2.png
```

Use Ghostscript page numbering from the combined PDF. This avoids fragile assumptions about page names after merge.

### Separate mode

Given:

```text
outputPath = business-card.pdf
pages = front + back
mode = separate
```

Existing PDFs are expected to be:

```text
business-card.pdf
business-card-back.pdf
```

Generate corresponding PNGs:

```text
business-card.png
business-card-back.png
```

Alternatively, if implementation prefers explicit names for all pages:

```text
business-card-front.png
business-card-back.png
```

Pick one convention and make tests/documentation match it. The least disruptive convention is to mirror each actual PDF path and replace `.pdf` with `.png`.

## Implementation Steps

### Step 1 — Extend CLI parsing

File: `src/cli/args.ts`

Update `CliArgs`:

```ts
export interface CliArgs {
  // existing fields
  png?: boolean;
  pngDpi?: number;
}
```

Changes:

- Add `png` to the boolean flag list.
- Parse `--png-dpi <number>` similarly to `--width`/`--height`.
- Reject invalid `--png-dpi` values with a clear error.
- Update usage text to mention PNG previews and color behavior.

### Step 2 — Extend config and merged render options

File: `src/config/load-config.ts`

Update interfaces:

```ts
export interface DzgnrConfig {
  // existing fields
  png?: boolean;
  pngDpi?: number;
}

export interface RenderOptions {
  // existing fields
  png: boolean;
  pngDpi: number;
}
```

In `mergeOptions()`:

- Keep PDF `outputPath` normalization as `.pdf` because PDF remains the primary artifact.
- Set `png = cliArgs.png === true ? true : (config.png ?? false)`.
- Set `pngDpi = cliArgs.pngDpi ?? config.pngDpi ?? DEFAULT_PNG_DPI`.
- Validate config-provided `pngDpi` too; do not only validate CLI input.

### Step 3 — Factor reusable profile resolution helpers

File: `src/render/cmyk-convert.ts`

Currently `resolveCmykProfile()` is private. PNG rasterization needs consistent access to the same CMYK profile when mapping CMYK PDFs into RGB previews.

Plan:

- Export a small profile resolution helper, or create a new `src/render/color-profiles.ts` module.
- Keep profile licensing behavior unchanged: use explicit paths or system Ghostscript profiles; do not bundle ICC profiles.
- Add a resolver for RGB output ICC profiles.

Suggested module shape:

```ts
export function resolveCmykProfile(explicitPath?: string): string;
export function resolveRgbOutputProfile(): string | undefined;
export function getGhostscriptVersion(): string | null;
```

For RGB profile resolution, check common Ghostscript profile paths such as:

```text
/usr/share/ghostscript/iccprofiles/srgb.icc
/usr/share/ghostscript/iccprofiles/default_rgb.icc
```

If no sRGB profile is found, either:

- fail when CMYK-mapped PNG previews are explicitly requested, or
- warn and let `png16m` use its device RGB behavior.

Recommended: fail for CMYK PNG previews if no RGB output ICC profile can be found, because the requirement is proper color mapping.

### Step 4 — Add PDF-to-PNG rasterization module

New file: `src/render/png-preview.ts`

Responsibilities:

1. Validate Ghostscript availability.
2. Resolve the required output RGB ICC profile.
3. Rasterize a final PDF to one or more RGB PNG files.
4. Return structured output paths and warnings.
5. Throw clear errors if explicitly requested PNG generation fails.

Suggested types:

```ts
export interface PngPageResult {
  pageIndex: number;      // 0-based
  outputPath: string;
}

export interface PngPreviewResult {
  requested: boolean;
  generated: boolean;
  dpi: number;
  colorSource: "cmyk-mapped" | "rgb-draft";
  outputs: PngPageResult[];
  warnings: string[];
}
```

Suggested API:

```ts
export async function rasterizePdfToPng(options: {
  pdfPath: string;
  outputPattern: string;      // must include Ghostscript %d for multi-page PDFs if needed
  dpi: number;
  cmykProfile?: string;
  colorSource: "cmyk-mapped" | "rgb-draft";
}): Promise<PngPreviewResult>;

export function skippedPngResult(): PngPreviewResult;
```

Recommended Ghostscript args for CMYK-mapped PNG previews:

```text
-dNOPAUSE
-dBATCH
-dSAFER
-sDEVICE=png16m
-dTextAlphaBits=4
-dGraphicsAlphaBits=4
-r<dpi>
-sDefaultCMYKProfile=<same CMYK profile used for PDF conversion>
-sOutputICCProfile=<sRGB ICC profile>
-dRenderIntent=0
-sOutputFile=<pattern-with-%d>.png
-f
<input.pdf>
```

Notes:

- Use a `spawnSync("gs", args, ...)` array, matching existing style in `cmyk-convert.ts`; never shell-concatenate paths.
- Consider `-dUseCropBox` only if rendered PNG dimensions otherwise include unwanted boxes. Since current validation is based on PDF page size/media box, verify before adding it.
- For one-page PDFs where the desired final name is exactly `foo.png`, either:
  - rasterize to a temporary pattern and rename the generated `tmp-1.png` to `foo.png`, or
  - use Ghostscript without `%d` only when the PDF is known to have one page.
- To know generated page count/paths, load the PDF with `pdf-lib` or infer from files after Ghostscript. Prefer `pdf-lib` for deterministic expected paths.

### Step 5 — Wire PNG generation into render pipeline

File: `src/render/html-to-pdf.ts`

Extend `RenderResult`:

```ts
export interface RenderResult {
  warnings: string[];
  cmyk: CmykConversionResult;
  png: PngPreviewResult;
}
```

Import `rasterizePdfToPng` and `skippedPngResult` from the new module.

Critical rule: rasterize from the **final output PDF path**, after all merge and CMYK conversion steps are complete.

#### Combined mode

Current flow:

1. Render each HTML page to temporary RGB PDF.
2. Merge PDFs to `merged-rgb.pdf`.
3. Convert merged PDF to `options.outputPath` if CMYK is enabled; otherwise move RGB merge to `options.outputPath`.

Add after final PDF exists:

1. If `options.png` is true, call PNG rasterization on `options.outputPath`.
2. Use output pattern derived from the PDF base: `base-%d.png`.
3. `colorSource` is `"cmyk-mapped"` if `options.cmyk` is true and conversion succeeded; otherwise `"rgb-draft"`.
4. Push PNG warnings into aggregate render warnings and return PNG result.

#### Separate mode

Current flow:

1. For each page, derive its final PDF output path.
2. Render/convert that page PDF.

Add after each page's final PDF exists:

1. If `options.png` is true, rasterize that one-page PDF.
2. Use a final PNG path derived by replacing `.pdf` with `.png`.
3. Accumulate all PNG outputs into a single `PngPreviewResult` on `RenderResult`.

### Step 6 — Report PNG preview outputs

Files:

- `src/validate/pdf-report.ts`
- `src/index.ts`

Extend `PdfValidationReport`:

```ts
export interface PdfValidationReport {
  // existing fields
  pngOutputs?: string[];
}
```

Update `validatePdf()` to accept optional PNG paths:

```ts
export async function validatePdf(
  outputPath: string,
  expectedWidthCm: number,
  expectedHeightCm: number,
  renderWarnings: string[],
  cmyk: CmykConversionResult,
  expectedPageCount?: number,
  pngOutputs?: string[],
): Promise<PdfValidationReport>
```

In `printReport()`:

- Print a `PNG previews:` section if paths are present.
- Keep existing PDF success messaging, but consider appending `PNG previews generated.` when requested.

In `src/index.ts`:

- For combined mode, pass all PNG paths to the single combined PDF report.
- For separate mode, associate PNG paths with the matching PDF output path. Since separate mode can produce multiple reports, filter `renderResult.png.outputs` by path naming convention or add enough metadata to `PngPageResult` to map each PNG to its source PDF.

Recommended small type improvement for mapping:

```ts
export interface PngPageResult {
  pageIndex: number;
  outputPath: string;
  sourcePdfPath: string;
}
```

### Step 7 — Documentation updates

Files likely needing updates:

- `README.md`
- `skills/dzgnr/SKILL.md`
- relevant files under `skills/dzgnr/references/`
- `profiles/README.md`

Document:

- `--png` and `png: true`.
- PNGs are previews generated from final PDFs.
- CMYK-enabled PNG previews are RGB images color-mapped from the CMYK PDF using ICC profiles.
- `--rgb` makes both PDF and PNG previews draft/RGB.
- Ghostscript is required for both CMYK conversion and PNG preview generation.

### Step 8 — Testing plan via testing subagent

Do not write tests directly. Ask the testing subagent to add/update tests.

Test coverage needed:

- `src/__tests__/args.test.ts`
  - `--png` parses to `png: true`.
  - `--png-dpi` parses to a number.
  - invalid `--png-dpi` exits/errors.
- `src/__tests__/load-config.test.ts`
  - config `png: true` merges into `RenderOptions`.
  - `png` defaults to false.
  - `pngDpi` default/config/CLI precedence works.
- New `src/__tests__/png-preview.test.ts`
  - Ghostscript args include `png16m`, DPI, antialiasing, and ICC flags for CMYK-mapped previews.
  - generated paths are reported correctly for one-page and multi-page PDFs.
  - failures produce clear errors.
  - tests should mock `spawnSync` where practical and use an integration subprocess only where the existing test style supports it.
- `src/__tests__/html-to-pdf.test.ts`
  - `RenderResult` includes `png` result.
  - PNG rasterization is called only when `options.png` is true and only after final PDF creation.
- `src/__tests__/pdf-report.test.ts`
  - reports include PNG preview paths in JSON shape and printed output.

## Risks and Mitigations

- **Color mismatch from screenshots:** Avoid Playwright screenshots; always rasterize final PDF.
- **Missing RGB ICC profile:** Resolve a system sRGB/default RGB ICC profile and fail clearly for CMYK previews if unavailable.
- **Large PNG files:** Default DPI should balance speed and fidelity; expose `pngDpi`.
- **Multi-page naming ambiguity:** Use deterministic Ghostscript `%d` output for combined mode and PDF-path mirroring for separate mode.
- **Overprint/spot-color limitations:** Document that RGB PNGs are visual previews and may not fully simulate advanced print overprint/spot behavior.

## Success Criteria

- Existing PDF-only commands behave unchanged.
- `--png` or `png: true` produces PNG preview files next to the PDF output(s).
- CMYK-enabled PNG previews are generated from the CMYK-converted PDF, not from Chromium page screenshots.
- Reports list generated PNG paths.
- Tests added by the testing subagent cover CLI/config merging, rasterization behavior, render integration, and reporting.
