# Research: Proper CMYK Support

## Recommended conversion approach

Ghostscript is the practical choice for Dzgnr's first true CMYK implementation. It can rewrite a Chromium-generated PDF through `pdfwrite`, convert colors with LittleCMS/ICC profiles, preserve vectors/text better than raster workflows, and emit DeviceCMYK/ICCBased CMYK-oriented content. Pure JS libraries such as `pdf-lib` can create CMYK drawing operations but cannot convert existing RGB PDF content streams. qpdf/pdfcpu are useful validators/structural tools but do not perform color conversion. ImageMagick/Poppler raster workflows should be avoided for final print output because they rasterize pages and lose selectable text/vector fidelity.

Representative Ghostscript flags to wrap from Bun/Node:

```text
gs -dNOPAUSE -dBATCH -dSAFER \
  -sDEVICE=pdfwrite \
  -sColorConversionStrategy=CMYK \
  -sProcessColorModel=DeviceCMYK \
  -dOverrideICC \
  -sDefaultCMYKProfile=<profile.icc> \
  -dEmbedAllFonts=true \
  -dSubsetFonts=true \
  -dCompatibilityLevel=1.7 \
  -sOutputFile=<output.pdf> \
  -f <input.pdf>
```

Important caveats: Ghostscript is AGPL/commercial licensed if distributed as part of Dzgnr; the safer open-source CLI path is to require a system-installed `gs` binary and document installation. ICC profile bundling must use a profile with clear redistribution terms. ECI/OpenICC/public registry profiles should be checked before committing an ICC file. Ghostscript's own profiles are tied to Artifex licensing and should not be blindly copied into the repo.

## Validation options

- Keep existing `pdf-lib` page count/dimension checks.
- Add converter status to the validation report so Dzgnr can distinguish `cmyk: requested/succeeded/skipped/failed`.
- For stronger CMYK verification, run a lightweight Ghostscript validation command such as `gs -q -dNOPAUSE -dBATCH -sDEVICE=inkcov -o - <pdf>` and/or scan PDF content/resources for `/DeviceRGB`, `/DeviceCMYK`, `/ICCBased`, and output intents. Structural scans are imperfect but useful as warnings.
- Future hardening can optionally integrate `pdfcpu validate` or `qpdf --check`, but they should not be required for color conversion.

## Codebase findings

Dzgnr is a Bun/TypeScript CLI with this flow:

```text
src/cli/args.ts -> src/config/load-config.ts -> src/render/html-to-pdf.ts -> src/validate/pdf-report.ts
```

Relevant files:

- `src/cli/args.ts`: parses CLI flags; add an RGB/draft escape hatch such as `--rgb` or `--no-cmyk`.
- `src/config/load-config.ts`: owns `DzgnrConfig` and `RenderOptions`; add CMYK options here with default-on behavior.
- `src/render/html-to-pdf.ts`: renders single-page PDFs via Playwright and handles combined/separate output. This is the main seam for post-render Ghostscript conversion.
- `src/render/merge-pdfs.ts`: merges PDFs with `pdf-lib` for combined mode. Prefer converting the final merged PDF once to avoid multiple conversion passes, unless conversion-before-merge proves more reliable.
- `src/validate/pdf-report.ts`: currently adds an unconditional Chromium CMYK caveat and uses it as part of success reporting. Replace with dynamic print/color status.
- `src/index.ts`: orchestration and validation for combined/separate modes; pass CMYK settings/status through.
- Documentation and skill files currently tell users true CMYK is not guaranteed: `README.md`, `skills/dzgnr/SKILL.md`, and `skills/dzgnr/references/design-guidelines.md` need updates.

## Suggested architecture direction

Add a new converter module (for example `src/render/cmyk-convert.ts`) that checks for Ghostscript, chooses the default ICC profile, creates a temporary converted PDF, atomically replaces/moves output, and returns structured conversion metadata. The render function should continue returning warnings but likely needs to return a richer result object so validation/reporting can say whether CMYK conversion was requested and succeeded.

Default behavior should be fail-closed for print output: if CMYK is enabled and Ghostscript/profile lookup fails, abort with a clear installation/profile error. Add `--rgb`/`cmyk: false` for draft output.
