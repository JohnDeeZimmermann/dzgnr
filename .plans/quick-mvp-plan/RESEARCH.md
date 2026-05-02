# Research: Dzgnr Quick MVP

## Codebase State

- The repository is currently greenfield: only `CONCEPT.md` and this planning directory exist.
- There is no package manifest, source tree, test setup, or existing architecture to preserve.
- The MVP can therefore introduce a Bun/TypeScript CLI project at the repository root.

## Recommended Core Tooling

- **Bun + TypeScript** for runtime and project tooling, per user preference.
- **Playwright/Chromium** for HTML-to-PDF rendering.
  - `page.pdf()` supports `width` and `height` values with `cm` units directly, e.g. `width: "9cm"`.
  - Use `printBackground: true` for design output.
  - Use `preferCSSPageSize` only when intentionally letting CSS `@page` override CLI/config dimensions.
  - Chromium PDF generation is currently Chromium-only in Playwright.
- **pdf-lib** for basic PDF inspection.
  - `PDFDocument.load(bytes)` loads an existing PDF.
  - `pdfDoc.getPageCount()` returns page count.
  - `page.getSize()` returns width/height in PDF points; convert using `cm = pt * 2.54 / 72`.

## Google Fonts Findings

- The simplest MVP path is to let Chromium load Google Fonts from normal HTML `<link>` or CSS `@import` declarations.
- The CLI should wait for fonts before PDF generation using browser-side font readiness, e.g. `document.fonts.ready`.
- For a quick MVP, offline font downloading/caching can be deferred unless needed; the tool should warn when network font loading may fail.
- Future hardening can add a Google Fonts prefetch/cache step and rewrite font CSS to local `@font-face` references.

## CMYK / Print Readiness Findings

- Playwright/Chromium emits RGB-oriented PDFs; it does not provide true CMYK or PDF/X output.
- For this MVP, the honest approach is:
  - guarantee dimensions and rendering fidelity as much as possible,
  - emit warnings explaining RGB/CMYK limitations,
  - optionally leave a future hook for Ghostscript-based conversion.
- True CMYK/PDF-X output would require post-processing with a tool such as Ghostscript or a professional prepress product; that is out of scope for the quick MVP.

## Proposed Initial Architecture

At repository root:

```text
package.json
tsconfig.json
src/
  index.ts
  cli/args.ts
  config/load-config.ts
  sizing/units.ts
  render/html-to-pdf.ts
  fonts/wait-for-fonts.ts
  validate/pdf-report.ts
examples/
  business-card.html
```

## Testing Note

- The environment rule says not to write tests directly; when implementation begins, tests should be requested from the testing subagent.
