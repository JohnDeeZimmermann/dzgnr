# Dzgnr Print Design Guidelines

## Physical Units and Layout Strategy

- Set artifact dimensions in `dzgnr.json` using centimeters.
- Use `cm` and `mm` for print-critical geometry: safe area, trim-sensitive lines, and known physical constraints.
- Use `pt` for typography so type scales naturally for print.
- Use relative layout internals (`%`, `fr`, `clamp()`, `em`, `rem`) so designs adapt when dimensions are overridden.

## Safe Area and Bleed Caveat

- Keep essential content at least 3-5 mm from trim edges; use more on small formats.
- Full-bleed decorative backgrounds are acceptable, but do not claim printer-grade bleed/crop mark support.
- Dzgnr converts output to CMYK via Ghostscript by default. PDF/X certification is not provided.

## Color and Print Background Handling

- Preserve backgrounds and intended colors with:

```css
-webkit-print-color-adjust: exact;
print-color-adjust: exact;
```

- Build deliberate contrast for print readability (size, weight, spacing, and luminance).

## Typography and Hierarchy

- Start with a clear concept and a focal message.
- Pair a distinctive display face with a readable text face when appropriate.
- Use one dominant headline, secondary support text, and quiet metadata.
- Check readability at true physical size, not only at zoomed screen view.

## Asset Handling

- Prefer local SVG assets for logos, ornaments, and marks.
- Use high-resolution raster images (300 DPI when possible) for photographic content.
- Avoid remote-only required assets; local files improve reproducibility.

## Validation and Revision Loop

1. Render with config defaults.
2. Validate using `--json`.
3. Confirm `dimensionsOk: true` and page count expectations.
4. Inspect warnings and CMYK conversion status (`color.validation`).
5. Iterate spacing, hierarchy, and contrast until the piece is strong at real size.
