# Requirements: Front/Back PDF Support

## User Story
As a designer (or AI agent), I want to create multi-page PDFs (e.g., front/back flyers, double-sided business cards) by pointing `dzgnr.json` to multiple HTML files, so each side gets its own page in the output PDF.

---

## Functional Requirements

### FR1 — Pages array in config
The `dzgnr.json` config supports a `pages` array of objects, each with `path` (relative HTML file path) and `name` (human-readable label).

```json
{
  "widthCm": 14.8,
  "heightCm": 21,
  "output": "event-flyer.pdf",
  "mode": "combined",
  "pages": [
    { "path": "front.html", "name": "front" },
    { "path": "back.html", "name": "back" }
  ]
}
```

### FR2 — CLI input still required
The CLI positional `<input.html>` is always required. By default it serves as the primary (front) page, and `pages` in config provide additional pages.

```
dzgnr render front.html --config dzgnr.json
```

### FR3 — Combined PDF mode (default)
When `mode` is `"combined"` (or omitted), all pages are rendered into a single PDF file. The CLI input HTML is rendered first, then each entry in `pages` in array order.

Output: a single PDF with N pages (1 CLI page + M config pages).

### FR4 — Separate PDF mode
When `mode` is `"separate"`, each page is rendered to its own PDF file. The CLI input page uses `output` from config (or the derived name). Each config page uses the output pattern `<output>-<name>.pdf`.

```
# Given output: "flyer.pdf"
# Produces:
#   flyer.pdf          (front from CLI input)
#   flyer-back.pdf     (from pages[0].name = "back")
#   flyer-cover.pdf    (from pages[1].name = "cover")
```

### FR5 — Size sharing
All pages share the top-level `widthCm` and `heightCm` from config. CLI `--width` and `--height` flags override for all pages.

### FR6 — Media and background sharing
`media`, `printBackground`, and `preferCssPageSize` apply to all pages.

### FR7 — Validation for each page
Validation runs for each rendered page, checking dimensions match expectations. Warnings are reported per page.

### FR8 — Font readiness per page
The font wait check runs independently for each page before that page's PDF capture.

### FR9 — pdf-lib merging for combined mode
The combined PDF is assembled using `pdf-lib` (already a dependency) by copying pages from individually-rendered temp PDFs into a final document.

### FR10 — Cleanup of temp files
Temporary single-page PDFs are cleaned up after merging (combined mode) or not created at all (separate mode — each page rendered directly to its final path).

---

## Non-Functional Requirements

- NFR1: Maintain existing font-wait script behavior per page.
- NFR2: Keep the same Playwright browser launch/close lifecycle (one browser session, reuse context).
- NFR3: Validation reports remain human-readable and JSON-compatible.
- NFR4: Error handling: if any page fails to render, the process stops with a clear error message.
