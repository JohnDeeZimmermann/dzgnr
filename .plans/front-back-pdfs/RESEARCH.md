# Research: Front/Back PDF Support

## 1. pdf-lib Merge Capabilities

pdf-lib is already a dependency (`"pdf-lib": "^1.17.1"`). It supports:

- `PDFDocument.create()` — create a new empty PDF
- `PDFDocument.load(bytes)` — load an existing PDF (already used in `pdf-report.ts`)
- `destDoc.copyPages(srcDoc, pageIndices)` — copy pages from source to destination
- `destDoc.addPage(copiedPage)` — add a copied page to the destination

**Approach for combined mode:**
1. Render each HTML to a temp single-page PDF via Playwright
2. Create an empty `PDFDocument` via pdf-lib
3. For each temp PDF: load, copy page 0, add to empty doc
4. Save to final output path
5. Clean up temp files

**Decision**: Use pdf-lib for merging. Already a dependency, no new packages needed.

---

## 2. Playwright Multi-Page PDF Rendering

Playwright's `page.pdf()` renders the current page state as a single PDF page. To create a multi-page PDF from multiple HTML files:

**Option A**: Navigate to each HTML in sequence, call `page.pdf()` for each, then merge with pdf-lib.
- Pro: Clean separation, each page gets its own font-wait and render cycle
- Con: Temp files needed for combined mode

**Option B**: Use `page.pdf()` with each page's content injected into a single browser page (e.g., via iframes or DOM manipulation).
- Con: Complex, fragile, CSS isolation issues

**Decision**: Option A — sequential navigation with temp files for combined mode. Simple, reliable, and already fits the font-wait pattern.

---

## 3. Browser Session Reuse

Current code launches one browser, one context, one page, then closes. For multi-page rendering:
- Keep one browser launch/close lifecycle
- For each HTML: `page.goto()` → wait → font check → `page.pdf()`
- Reuse the same `page` object (navigate to new URL each time)

This minimizes cold-start overhead while keeping each render independent.

---

## 4. Config Schema Changes

**New fields:**

| Field    | Type                   | Default      | Description |
|----------|------------------------|--------------|-------------|
| `pages`  | `PageEntry[]`          | `undefined`  | Additional pages beyond CLI input |
| `mode`   | `"combined" \| "separate"` | `"combined"` | Output mode |

**Page entry shape:**

| Field  | Type     | Required | Description |
|--------|----------|----------|-------------|
| `path` | `string` | Yes      | Relative path to HTML file |
| `name` | `string` | Yes      | Human-readable label, used for separate mode filenames |

**Removed field:**
- `input` — no longer in config; CLI positional input is always the primary page

**Backwards compatibility:**
When `pages` is undefined, behavior is identical to current (single-page render from CLI input).

---

## 5. Output Path Derivation for Separate Mode

Given `output: "flyer.pdf"` and a page named `"back"`:
- Front (CLI input): `flyer.pdf`
- Back: `flyer-back.pdf`

Implementation: strip `.pdf` extension, insert `-<name>`, re-add `.pdf`.

---

## 6. Validation Changes

Current validation checks exactly 1 page and issues a warning if not. For multi-page PDFs:
- Combined mode: expected page count = 1 + pages.length
- Separate mode: validate each output PDF independently
- Dimensions check: verify each page against expected width/height

---

## 7. Temp File Strategy

For combined mode, temp files written to OS temp dir:
```
/tmp/dzgnr-<rand>-0.pdf
/tmp/dzgnr-<rand>-1.pdf
```

Cleanup: `fs.unlinkSync` each temp in a try/catch (best-effort).
