# Research: Optional PNG Outputs

## Codebase Findings

- Dzgnr is a Bun/TypeScript CLI that renders HTML to PDF via Playwright Chromium, then validates PDF dimensions with `pdf-lib`.
- Main orchestration is in `src/index.ts`:
  - parse CLI args,
  - load/merge config,
  - call `renderHtmlToPdf(options)`,
  - validate/report generated PDF(s).
- CLI parsing lives in `src/cli/args.ts`; boolean flags currently include `--screen`, `--json`, and `--rgb`.
- Config merging lives in `src/config/load-config.ts`; `RenderOptions` currently contains PDF page sizing, multi-page mode, CMYK settings, and JSON output.
- Rendering lives in `src/render/html-to-pdf.ts`:
  - `renderSinglePage()` uses `page.pdf()` to create RGB PDF files.
  - combined mode renders page PDFs, merges them with `src/render/merge-pdfs.ts`, then optionally CMYK-converts once.
  - separate mode writes one PDF per page, optionally CMYK-converting each final PDF.
- CMYK conversion lives in `src/render/cmyk-convert.ts` and already uses Ghostscript plus a CMYK ICC profile.
- Reporting lives in `src/validate/pdf-report.ts`; reports currently have PDF output path, page dimensions, warnings, and CMYK status.
- Existing tests cover CLI parsing, config merging, rendering return shape, CMYK conversion, and PDF reporting. Per repository rule, any new tests must be created by the testing subagent.

## Online/External Findings

- Ghostscript is the best fit for generating PNG previews from final PDFs because it can rasterize the already CMYK-converted PDF through ICC color management. Raw Playwright screenshots would bypass CMYK conversion and are not suitable as final-color previews.
- Recommended RGB PNG device: `png16m` for 24-bit RGB PNGs.
- Ghostscript supports one-output-per-page naming through `-sOutputFile=prefix-%d.png` or zero-padded variants such as `prefix-%03d.png`.
- Useful quality flags:
  - `-r<dpi>` for resolution, defaulting to a project-chosen DPI such as 150 or 300.
  - `-dTextAlphaBits=4` and `-dGraphicsAlphaBits=4` for antialiasing.
  - `-dUseCropBox` if output should respect PDF crop boxes; page dimensions in this project likely use media boxes, so implementation should verify this before enabling by default.
- For proper CMYK-to-RGB preview conversion, Ghostscript can use:
  - `-sDefaultCMYKProfile=<cmyk.icc>` for the CMYK source profile when required,
  - `-sOutputICCProfile=<srgb.icc>` for destination RGB space,
  - `-dRenderIntent=<0..3>` if a rendering intent is configurable or fixed.
- Ghostscript-installed ICC profiles commonly live under `/usr/share/ghostscript/iccprofiles/`; this repository already documents that profiles are not bundled for licensing reasons.

## Key Design Conclusion

Implement PNG previews as a post-processing step from the final PDF artifact, not as screenshots from the browser page. This ensures the PNGs show what the final CMYK-mapped PDF looks like after conversion into sRGB image space.
