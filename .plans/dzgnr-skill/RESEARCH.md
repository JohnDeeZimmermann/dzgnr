# Research: Dzgnr Agent Skill

## Skill Authoring Findings

- A skill is a directory whose required entry point is `SKILL.md`.
- Existing local skills use YAML frontmatter with at least `name` and `description`, followed by Markdown workflow instructions.
- The `description` should be written as an activation trigger: it should explicitly say when to use the skill and include likely user intents/keywords.
- Optional supporting files commonly live beside `SKILL.md` in `references/`, `examples/`, or other resource directories.
- A good skill is focused, procedural, and concise in its main file, with larger examples/reference content split into bundled resources.
- Existing local examples confirm the expected frontmatter pattern:
  - `/home/johndee/.agents/skills/frontend-design/SKILL.md`
  - `/home/johndee/.agents/skills/context7-mcp/SKILL.md`
  - `/home/johndee/.agents/skills/agent-browser/SKILL.md`

## Dzgnr Codebase Findings

- Dzgnr is a Bun + TypeScript CLI that renders HTML to PDF using Playwright Chromium and validates output dimensions using `pdf-lib`.
- Command shape: `dzgnr render <input.html> [options]`.
- Config is loaded from `dzgnr.json` by default or from `--config <path>`.
- Config fields include `widthCm`, `heightCm`, `output`, `printBackground`, `media`, and `preferCssPageSize`.
- CLI flags override config, but the new skill should teach agents to put default dimensions in each project's `dzgnr.json`.
- Rendering uses explicit Playwright PDF width/height in centimeters, waits for Google Fonts best-effort, and defaults to print media.
- Validation reports page count, expected vs actual dimensions, a `dimensionsOk` boolean, and warnings. A Chromium CMYK/PDF-X caveat is always present.
- Current repository has one flat example at `examples/business-card.html`; it is not yet organized as a self-contained project directory with config and README.

## Print Design Findings For The Skill

- Use physical units for print: `cm`/`mm` for page-aware geometry and `pt` for type sizes.
- Keep essential content inside a safe area, typically at least 3–5mm from trim edges. If bleed is desired, extend decorative backgrounds beyond the trim area, while noting current Dzgnr/Chromium output does not provide true printer crop/bleed marks.
- Use `print-color-adjust: exact` and `-webkit-print-color-adjust: exact` to preserve backgrounds.
- Use high-resolution or vector assets: SVG for logos/ornaments, 300 DPI raster images when possible.
- Use relative spacing where sensible: CSS custom properties derived from page dimensions, percentage widths/heights for layout regions, `clamp()` for adaptable typography/spacing, and `em`/`rem` for text-related spacing.
- Avoid overusing absolute centimeter offsets in component internals; reserve physical units for page size, safe-area constants, and print-critical details.
- Strong designs need a clear aesthetic concept, distinctive typography, intentional color palette, hierarchy, contrast, and disciplined alignment. For print artifacts, readability and hierarchy matter more than decorative density.
- Each example/project should be reproducible: source HTML, `dzgnr.json`, local assets where applicable, output path, and README render command.

## Recommended Skill Shape

```text
skills/dzgnr/
  SKILL.md
  references/
    design-guidelines.md
    project-structure.md
    print-sizes.md
  examples/
    business-card/
      README.md
      dzgnr.json
      index.html
      assets/
    flyer/
      README.md
      dzgnr.json
      index.html
      assets/
    banner/
      README.md
      dzgnr.json
      index.html
      assets/
```

`skills/dzgnr/SKILL.md` is the preferred repository-local location because the user requested adding the skill to the Dzgnr repository, not to the global user skills directory.
