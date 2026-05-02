# Requirements: Dzgnr Quick MVP

## Source

- Concept file: `../CONCEPT.md`
- Goal: create a quick MVP for Dzgnr, a tool that helps AI agents create print designs such as business cards, flyers, banners, and posters.

## Confirmed MVP Direction

- Product form: **CLI tool**.
- Runtime and language: **TypeScript running on Bun**.
- Primary workflow: user points the tool at an **HTML file plus config/CLI options**; the tool emits a properly sized PDF.
- Size units: **centimeters** are first-class and should be the main user-facing dimension unit.
- Print readiness target: **pragmatic “CMYK-ish” PDF for MVP**.
  - Correct physical dimensions are required.
  - The plan should acknowledge that browser PDF renderers are RGB-oriented and that strict CMYK/PDF-X is likely out of scope for the quick MVP.
  - The MVP should provide validation/warnings rather than pretending to guarantee prepress-grade CMYK.

## Required MVP Features

1. **HTML-to-PDF conversion**
   - Accept a local HTML input file.
   - Render the HTML with browser-grade CSS fidelity.
   - Produce a PDF at the requested physical dimensions.

2. **Centimeter-based sizing**
   - Accept width and height in cm, either from config or CLI flags.
   - Convert cm to PDF/page units reliably.
   - Make dimensions explicit and easy for agents to use.

3. **Google Fonts support**
   - Support designs using Google Fonts.
   - Prefer an MVP approach that is reliable and simple for local CLI usage.
   - Ensure generated PDFs either embed fonts via the renderer or warn clearly when font loading may have failed.

4. **PDF validation/reporting**
   - After generation, inspect/report key output properties:
     - page count,
     - page size in cm/mm/points,
     - mismatch warnings for expected dimensions,
     - font/color/prepress caveats where feasible.
   - Make validation output agent-friendly, ideally human-readable by default with optional JSON output later.

## Explicit Non-Goals for Quick MVP

- Full visual design editor.
- Higher-level template/design schema beyond HTML + config.
- Strict PDF/X compliance.
- Guaranteed true CMYK separations.
- Complex imposition, crop marks, spot colors, or professional RIP/prepress workflows.
- Web service or web UI.

## Open Design Choices for Implementation Plan

- Exact CLI command names and config file format.
- Whether font handling should be direct Google Fonts CSS usage, downloaded local assets, or both.
- Whether pragmatic CMYK conversion should be included in v0, or validation warnings should define the CMYK limitation.
- Which PDF inspection library/tool should be used in a Bun/TypeScript environment.
