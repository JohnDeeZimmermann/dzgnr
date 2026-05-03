# Requirements: Optional PNG Outputs

## Goal

Add support for optional PNG outputs/previews in addition to the existing PDF rendering workflow so that AI agents can visually inspect and verify rendered designs.

## Confirmed Requirements

- Keep the existing PDF output behavior unchanged by default.
- Add explicit output-format configuration/CLI support rather than relying only on the output file extension.
- PNG support should be optional preview output alongside the existing PDF output, not a replacement for PDF generation.
- For multi-page designs, produce numbered/named PNG files per page rather than a single combined image.
- PNG colors should represent the CMYK-mapped PDF appearance in RGB image space.
  - Preferred workflow: render PDF, convert to CMYK using the configured/default CMYK ICC profile, then rasterize/color-manage that CMYK PDF into RGB PNG previews.
  - Avoid raw Chromium screenshots as the primary PNG path because they bypass CMYK conversion and may not match final print colors.
- Existing `--rgb` behavior should remain available for draft/RGB PDF output; plan should define how PNG previews behave when CMYK is skipped.

## Inferred Requirements

- Add config support for PNG previews, likely via fields such as `png`, `preview`, or `outputs`, and CLI support via an explicit flag such as `--png` or `--preview png`.
- Derive PNG paths predictably from the PDF output path unless a separate PNG preview output path/prefix is configured.
- For separate pages, use existing page names where possible, e.g. `business-card-front.png`, `business-card-back.png`.
- For combined PDFs, rasterize every PDF page to separate PNG files, e.g. `business-card-1.png`, `business-card-2.png`, or named pages if metadata is available.
- Validation/reporting should mention PNG preview output paths and surface warnings/errors from the PNG rasterization step.
- Tests should be added by the testing subagent only, per repository instructions.

## Open Design Decisions for Implementation Plan

- Exact CLI/config naming should be chosen to fit current style. Candidate: `--png` plus config field `png: true`; optional `pngOutput?: string` for a preview path/prefix.
- Exact rasterizer should be selected during research. Ghostscript is already used and can likely produce ICC-managed RGB PNGs from CMYK PDFs.
- Decide whether PNG preview failure should fail the command or be reported as a warning. Since PNG previews are for verification, the safer plan is to fail when explicitly requested.
