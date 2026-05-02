# Plan: Dzgnr Agent Skill

## Objective

Create a repository-local agent skill that teaches AI agents how to use **Dzgnr** to create high-quality, print-oriented HTML designs and render them into correctly sized PDFs.

The skill should be practical, example-driven, and opinionated about project organization:

- Default dimensions live in each project's `dzgnr.json`.
- Each design project is self-contained in its own directory.
- Each project includes its own assets and a short `README.md`.
- Layouts use relative/adaptive spacing where sensible so dimension overrides remain viable.
- The guidance includes strong print/design heuristics, not only CLI usage.

Do not alter Dzgnr runtime code for this task unless a later explicit implementation request expands the scope.

## Target Location

Add the skill inside the Dzgnr repository:

```text
skills/dzgnr/
  SKILL.md
  references/
  examples/
```

This matches the user's instruction to add it to this directory/repository while preserving the standard skill shape used by installed skills under `~/.agents/skills/*/SKILL.md`.

## Skill Directory Structure

Implement the following structure:

```text
skills/dzgnr/
  SKILL.md
  references/
    project-structure.md
    design-guidelines.md
    print-sizes.md
  examples/
    business-card/
      README.md
      dzgnr.json
      index.html
      assets/
    event-flyer/
      README.md
      dzgnr.json
      index.html
      assets/
    wide-banner/
      README.md
      dzgnr.json
      index.html
      assets/
```

Notes:

- Use empty `assets/` directories only if the repository accepts empty dirs via `.gitkeep`; otherwise include at least one small local SVG asset per example or omit `assets/` for examples that truly need no assets.
- Prefer SVG assets for compactness and crisp print scaling.
- Keep examples small enough for agents to read quickly.

## Main `SKILL.md` Requirements

Create `skills/dzgnr/SKILL.md` with YAML frontmatter:

```yaml
---
name: dzgnr
description: Use when creating print-oriented designs with Dzgnr, rendering HTML to correctly sized PDFs, building business cards, flyers, posters, banners, or packaging self-contained Dzgnr project directories with dzgnr.json dimensions and assets.
---
```

The body should include these sections:

1. `# dzgnr`
2. `## When to Use This Skill`
3. `## Core Workflow`
4. `## Required Project Structure`
5. `## Configuration Rules`
6. `## HTML/CSS Design Rules`
7. `## Rendering and Validation`
8. `## Design Quality Checklist`
9. `## Common Print Sizes`
10. `## Example Projects`

### Core Workflow To Teach

The skill should instruct agents to:

1. Create a new self-contained directory per artifact.
2. Add `dzgnr.json` with `widthCm`, `heightCm`, `output`, `printBackground`, `media`, and `preferCssPageSize`.
3. Add `index.html` as the source design.
4. Add local assets under `assets/` where needed.
5. Add a short `README.md` explaining the artifact, dimensions, assets, and render command.
6. Render from inside the project directory using config dimensions:

   ```bash
   dzgnr render index.html --config dzgnr.json
   ```

7. Validate with JSON when an agent needs machine-readable verification:

   ```bash
   dzgnr render index.html --config dzgnr.json --json
   ```

8. Confirm `dimensionsOk: true`, inspect warnings, and remember the Chromium CMYK/PDF-X warning is expected for current Dzgnr.

## Configuration Guidance

Every example/project must include a config like:

```json
{
  "widthCm": 9,
  "heightCm": 5.5,
  "output": "business-card.pdf",
  "printBackground": true,
  "media": "print",
  "preferCssPageSize": false
}
```

The skill should explicitly say:

- Do not make `--width`/`--height` the primary workflow.
- Use CLI width/height only for quick overrides/experiments.
- Store default dimensions in `dzgnr.json` so agents can rerender reproducibly.
- Keep CSS page dimensions aligned with config via custom properties or comments when useful, but let Dzgnr config be the source of truth.

## Relative Spacing Guidance

Teach a balanced rule: physical units are necessary for print, but component internals should adapt when dimensions change.

Recommended patterns:

```css
:root {
  --safe: 6%;
  --gap: clamp(0.18cm, 3vw, 0.55cm);
  --display-size: clamp(14pt, 8vw, 34pt);
}

body {
  margin: 0;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page {
  width: 100%;
  height: 100%;
  padding: var(--safe);
  display: grid;
  gap: var(--gap);
}
```

The skill should explain:

- Use `%`, grid/flex fractions, `clamp()`, `em`, and `rem` for layout flexibility.
- Use `cm`/`mm` for safe-area constants, borders, print-critical spacing, and known physical requirements.
- Use `pt` for typography.
- Avoid hard-coding every internal offset in `cm`, because it makes size overrides brittle.
- Avoid browser-only assumptions such as unconstrained long scrolling; Dzgnr currently expects single-page artifacts and warns if output has multiple pages.

## Design Quality Guidance To Include

Add a concise but strong design section or reference file covering:

- Start with a clear aesthetic direction: editorial, luxury, brutalist, playful, minimalist, industrial, art-deco, etc.
- Choose typography intentionally. Pair a distinctive display face with a readable text face when appropriate.
- Establish hierarchy: one dominant focal point, secondary supporting information, and quiet metadata.
- Use contrast deliberately: size, weight, color, whitespace, alignment, and shape.
- Make print artifacts readable at real size. Business cards need restrained text sizes; posters and banners need distance-readable headlines.
- Prefer high-quality SVG/vector marks and 300 DPI raster imagery.
- Keep essential content inside a safe area, usually 3–5mm minimum from trim edges; more for small formats.
- Use full-bleed decorative backgrounds cautiously and note that current Dzgnr does not provide true CMYK/PDF-X/crop-mark guarantees.
- Avoid generic AI design cliches: default purple gradients, centered-card sameness, arbitrary blobs, and unmotivated decoration.

## Reference Files

### `references/project-structure.md`

Document the canonical project layout:

```text
my-artifact/
  README.md
  dzgnr.json
  index.html
  assets/
    logo.svg
    texture.svg
```

Include what each file is for and the standard render command.

### `references/design-guidelines.md`

Include the detailed print/design guidance from the research phase:

- physical units
- safe area and bleed caveat
- typography in points
- relative spacing strategy
- color and `print-color-adjust`
- image/vector asset handling
- validation/revision loop

### `references/print-sizes.md`

Include a short table of common dimensions in centimeters, based on Dzgnr's README:

| Artifact | Width | Height |
| --- | ---: | ---: |
| Business card | 9.0 | 5.5 |
| US business card | 8.9 | 5.1 |
| A4 | 21.0 | 29.7 |
| A5 | 14.8 | 21.0 |
| A6 | 10.5 | 14.8 |
| US Letter | 21.6 | 27.9 |
| Poster A2 | 42.0 | 59.4 |

## Example Project Requirements

Each example directory must include:

- `README.md` with:
  - what the artifact is
  - dimensions
  - design concept
  - asset notes
  - render command
- `dzgnr.json` with default dimensions and output path
- `index.html`
- `assets/` with any necessary local files

### Example 1: `business-card/`

Purpose: small-format identity artifact.

Suggested config:

```json
{
  "widthCm": 9,
  "heightCm": 5.5,
  "output": "business-card.pdf",
  "printBackground": true,
  "media": "print",
  "preferCssPageSize": false
}
```

Design requirements:

- Use tight hierarchy: name, role, contact.
- Demonstrate safe-area padding and relative spacing.
- Use vector accent/mark or pure CSS decoration.

### Example 2: `event-flyer/`

Purpose: medium-format promotional artifact, likely A5.

Suggested config: `widthCm: 14.8`, `heightCm: 21.0`.

Design requirements:

- Demonstrate a large display headline, event details, and call-to-action.
- Use a clear grid and scale typography with `clamp()`.
- Include a local SVG or CSS-generated visual motif.

### Example 3: `wide-banner/`

Purpose: horizontal signage/banner.

Suggested config: choose a simple ratio such as `widthCm: 30`, `heightCm: 10`.

Design requirements:

- Demonstrate distance-readable type.
- Use horizontal composition and flexible columns.
- Avoid fragile absolute positioning.

## Validation Steps For The Build Agent

After creating the skill and examples:

1. Inspect every created Markdown file for clear triggers and actionable workflow.
2. Ensure each example has `README.md`, `dzgnr.json`, and `index.html`.
3. Run Dzgnr manually for each example if the environment supports the CLI:

   ```bash
   dzgnr render index.html --config dzgnr.json --json
   ```

4. If `dzgnr` is not linked, use the repository script from the repo root as appropriate:

   ```bash
   bun run src/index.ts render skills/dzgnr/examples/business-card/index.html --config skills/dzgnr/examples/business-card/dzgnr.json --json
   ```

   Be careful: because config paths are resolved from the current working directory, either run from the example directory or pass the correct config path.

5. Confirm each validation report has `dimensionsOk: true` and exactly one expected CMYK caveat unless fonts/assets produce additional expected warnings.
6. Run typecheck only if implementation touches TypeScript source; this task should not require that.

## Documentation Updates

Optionally update the repository `README.md` with a short note pointing to `skills/dzgnr/` if the user wants the skill discoverable from the main project documentation. Keep this optional because the requested deliverable is the skill directory itself.

## Important Pitfalls

- Do not put default dimensions only in CLI examples; dimensions must live in config.
- Do not leave examples as loose HTML files in a flat `examples/` directory; each project must be self-contained.
- Do not promise true CMYK/PDF-X output. Dzgnr currently renders through Chromium and warns about this limitation.
- Do not depend on remote assets for required visuals. Google Fonts may be used, but local/vector fallbacks make examples more robust.
- Do not write broad generic design advice only; the skill must teach an agent exactly how to structure and render Dzgnr projects.
