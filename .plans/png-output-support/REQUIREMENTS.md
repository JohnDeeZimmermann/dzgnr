# Requirements: Optional PNG Output Support

## User Goal

Add support for optional PNG outputs in addition to the existing PDF render flow so AI agents can visually inspect and verify generated designs.

PNG output must correctly map CMYK-oriented design/PDF output into RGB image space, because PNG is RGB-based and agents/viewers need an accurate visual preview rather than raw or incorrectly interpreted CMYK colors.

## Confirmed Product Requirements

- Add a flag-only API for requesting PNG behavior. Do not infer PNG output from `.png` file extensions as the primary API.
- Support both output modes:
  - PNG instead of PDF, for agent-verifiable image output only.
  - PNG alongside the normal PDF, for print output plus verification previews.
- For multi-page/front-back designs, emit one PNG per page/side.
- Default PNG resolution should be 150 DPI.
- Preserve current PDF behavior by default; existing commands should continue producing PDFs unless the new PNG options are explicitly supplied.
- CMYK-to-RGB mapping must be explicit and reliable for PNG previews.
- PNG output paths should be deterministic and easy for agents to locate.

## Initial CLI Shape to Plan Around

The exact names can be finalized during implementation, but the plan should assume something like:

- `--format pdf|png` or `--output-format pdf|png` for selecting PDF-only vs PNG-only rendering.
- `--png` or `--preview-png` for generating PNG previews alongside PDF.
- `--png-dpi <number>` for overriding the default 150 DPI.

Because the user chose “flag only”, implementation should validate that PNG behavior is requested via these flags, not by output extension alone.

## Constraints

- Planning only: do not create or modify implementation code during this phase.
- The project currently uses Bun, TypeScript, Playwright, Ghostscript for CMYK PDF conversion, and pdf-lib.
- Tests must be delegated to the testing subagent during implementation planning; do not write tests directly.

## Open Design Decisions for Implementation

- Whether PNGs are generated directly from browser screenshots or by rasterizing final PDFs with Ghostscript.
- How to name PNG files for combined vs separate modes.
- Whether validation reports should include PNG output metadata in addition to PDF validation metadata.
