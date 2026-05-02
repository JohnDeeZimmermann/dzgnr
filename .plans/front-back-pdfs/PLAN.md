# Plan: Front/Back PDF Support

## Architecture Overview

```
CLI Args ──┐
            ├── mergeOptions() ──> RenderOptions { inputPath, pages[], mode, ... }
Config ────┘

RenderOptions ──> renderHtmlToPdf(options) ──> warnings[]
                         │
                         ├── Render: CLI input page → temp/final PDF
                         ├── Render: each config page → temp/final PDF
                         └── Mode: "combined" → pdf-lib merge temp PDFs → output
                                   "separate" → direct output per page

Final PDF ──> validateMultiPagePdf(...) ──> PdfValidationReport
```

---

## Implementation Steps

### Step 1 — Update config types (`src/config/load-config.ts`)
- Add `PageEntry` interface: `{ path: string; name: string }`
- Add `pages?: PageEntry[]` and `mode?: "combined" | "separate"` to `DzgnrConfig`
- Add `pages: PageEntry[]` and `mode: "combined" | "separate"` to `RenderOptions`
- Remove `input?: string` from `DzgnrConfig`
- Update `mergeOptions()` to resolve CLI input path as the primary page and config pages list

### Step 2 — Update rendering (`src/render/html-to-pdf.ts`)
- Change signature: accept `RenderOptions`, return `string[]` (warnings)
- Extract single-page render logic into `renderSinglePage(browser, context, page, htmlPath, pdfParams)` 
- Loop: render CLI input, then each config page
- Combined mode: render to temp files, merge with pdf-lib, clean up
- Separate mode: render directly to final paths

### Step 3 — Add pdf-lib merge utility (`src/render/merge-pdfs.ts`)
- New file: `mergePdfs(inputPaths: string[], outputPath: string): Promise<void>`
- Uses `PDFDocument.create()`, `copyPages()`, `addPage()`, `save()`

### Step 4 — Update validation (`src/validate/pdf-report.ts`)
- Accept expected page count parameter
- Remove hardcoded "Expected 1 page" warning
- Validate each page's dimensions against expected
- Add per-page dimension reporting for multi-page PDFs

### Step 5 — Update CLI (`src/cli/args.ts`)
- No structural changes needed; CLI interface stays the same

### Step 6 — Update main entry (`src/index.ts`)
- Wire updated `mergeOptions` and `renderHtmlToPdf` with new multi-page flow

### Step 7 — Run typecheck
- `bun run typecheck` to verify no type errors

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/render/merge-pdfs.ts` | pdf-lib merge utility for combined mode |

## Files to Modify

| File | Changes |
|------|---------|
| `src/config/load-config.ts` | Add PageEntry, pages, mode; remove input; update mergeOptions |
| `src/render/html-to-pdf.ts` | Loop over pages, support combined/separate mode |
| `src/validate/pdf-report.ts` | Multi-page validation, per-page dimension checks |
| `src/index.ts` | Wire updated types and optional multi-page flow |

## Files Unchanged

| File | Reason |
|------|--------|
| `src/sizing/units.ts` | Pure utility, no changes needed |
| `src/fonts/wait-for-fonts.ts` | Reused per page, no changes needed |
| `src/cli/args.ts` | CLI interface unchanged |
| `package.json` | No new dependencies |

---

## Verification

1. `bun run typecheck` — must pass
2. Existing example usage still works (when `pages` is absent):
   ```
   dzgnr render index.html --width 9 --height 5.5 --out card.pdf
   ```
3. New multi-page usage:
   ```
   dzgnr render front.html --config dzgnr.json
   # with dzgnr.json containing pages array
   ```
