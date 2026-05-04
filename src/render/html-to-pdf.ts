import { chromium } from "playwright";
import type { Page } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdtempSync, unlinkSync, rmSync, renameSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { formatCmForPlaywright } from "../sizing/units";
import { fontWaitScript } from "../fonts/wait-for-fonts";
import { mergePdfs } from "./merge-pdfs";
import { convertToCmyk, skippedResult } from "./cmyk-convert";
import type { CmykConversionResult } from "./cmyk-convert";
import { rasterizePdfToPng, skippedPngResult } from "./png-preview";
import type { PngPreviewResult, PngPageResult } from "./png-preview";
import type { RenderOptions } from "../config/load-config";

export interface RenderResult {
  warnings: string[];
  cmyk: CmykConversionResult;
  png: PngPreviewResult;
}

async function renderSinglePage(
  page: Page,
  htmlPath: string,
  pdfPath: string,
  options: RenderOptions,
  pageName: string,
): Promise<string[]> {
  const warnings: string[] = [];
  const fileUrl = pathToFileURL(resolve(htmlPath)).href;
  await page.goto(fileUrl, { waitUntil: "networkidle" });

  try {
    const fontResult: string | null = await page.evaluate(fontWaitScript());
    if (fontResult) {
      warnings.push(`[${pageName}] ${fontResult}`);
    }
  } catch {
    warnings.push(`[${pageName}] Font readiness check failed. Google Fonts may not be embedded.`);
  }

  await page.pdf({
    path: pdfPath,
    width: formatCmForPlaywright(options.widthCm),
    height: formatCmForPlaywright(options.heightCm),
    printBackground: options.printBackground,
    preferCSSPageSize: options.preferCssPageSize,
  });

  return warnings;
}

function deriveOutputPath(basePath: string, name: string): string {
  const dotIndex = basePath.lastIndexOf(".pdf");
  if (dotIndex === -1) return basePath + "-" + name + ".pdf";
  return basePath.slice(0, dotIndex) + "-" + name + ".pdf";
}

export async function renderHtmlToPdf(options: RenderOptions): Promise<RenderResult> {
  const warnings: string[] = [];
  const browser = await chromium.launch({ headless: true });

  const pages: Array<{ path: string; name: string }> = [
    { path: options.inputPath, name: "front" },
    ...options.pages,
  ];

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.emulateMedia({ media: options.media });

    if (options.mode === "combined") {
      const tmpDir = mkdtempSync(`${tmpdir()}/dzgnr-`);
      const tempFiles: string[] = [];

      try {
        for (let i = 0; i < pages.length; i++) {
          const tempPath = `${tmpDir}/page-${i}.pdf`;
          const pageWarnings = await renderSinglePage(
            page,
            pages[i].path,
            tempPath,
            options,
            pages[i].name,
          );
          warnings.push(...pageWarnings);
          tempFiles.push(tempPath);
        }

        const mergedRgbPath = `${tmpDir}/merged-rgb.pdf`;
        await mergePdfs(tempFiles, mergedRgbPath);

        if (options.cmyk) {
          const cmykResult = await convertToCmyk(
            mergedRgbPath,
            options.outputPath,
            options.cmykProfile,
          );
          warnings.push(...cmykResult.warnings);

          let pngResult = skippedPngResult();
          if (options.png) {
            const pattern = options.outputPath.replace(/\.pdf$/, "-%d.png");
            pngResult = await rasterizePdfToPng({
              pdfPath: options.outputPath,
              outputPattern: pattern,
              dpi: options.pngDpi,
              cmykProfile: options.cmykProfile,
              colorSource: "cmyk-mapped",
            });
            warnings.push(...pngResult.warnings);
          }
          return { warnings, cmyk: cmykResult, png: pngResult };
        } else {
          try {
            renameSync(mergedRgbPath, options.outputPath);
          } catch {
            copyFileSync(mergedRgbPath, options.outputPath);
            try { unlinkSync(mergedRgbPath); } catch {}
          }

          let pngResult = skippedPngResult();
          if (options.png) {
            const pattern = options.outputPath.replace(/\.pdf$/, "-%d.png");
            pngResult = await rasterizePdfToPng({
              pdfPath: options.outputPath,
              outputPattern: pattern,
              dpi: options.pngDpi,
              colorSource: "rgb-draft",
            });
            warnings.push(...pngResult.warnings);
          }
          return { warnings, cmyk: skippedResult(), png: pngResult };
        }
      } finally {
        for (const tf of tempFiles) {
          try { unlinkSync(tf); } catch {}
        }
        try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }
    } else {
      let cmykResult: CmykConversionResult = skippedResult();
      const pngOutputs: PngPageResult[] = [];

      for (let i = 0; i < pages.length; i++) {
        const finalOutputPath =
          i === 0 ? options.outputPath : deriveOutputPath(options.outputPath, pages[i].name);

        if (options.cmyk) {
          const tmpDir = mkdtempSync(`${tmpdir()}/dzgnr-`);
          let tempRgbPath: string;
          try {
            tempRgbPath = `${tmpDir}/page-rgb.pdf`;
          } catch {
            throw new Error("Failed to create temporary directory for page render.");
          }

          try {
            const pageWarnings = await renderSinglePage(
              page,
              pages[i].path,
              tempRgbPath,
              options,
              pages[i].name,
            );
            warnings.push(...pageWarnings);

            const convResult = await convertToCmyk(
              tempRgbPath,
              finalOutputPath,
              options.cmykProfile,
            );
            warnings.push(...convResult.warnings);
            if (i === 0) cmykResult = convResult;
          } finally {
            try { unlinkSync(tempRgbPath); } catch {}
            try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
          }
        } else {
          const pageWarnings = await renderSinglePage(
            page,
            pages[i].path,
            finalOutputPath,
            options,
            pages[i].name,
          );
          warnings.push(...pageWarnings);
        }

        if (options.png) {
          const pagePngPath = finalOutputPath.replace(/\.pdf$/, ".png");
          const pagePngResult = await rasterizePdfToPng({
            pdfPath: finalOutputPath,
            outputPattern: pagePngPath,
            dpi: options.pngDpi,
            cmykProfile: options.cmykProfile,
            colorSource: options.cmyk ? "cmyk-mapped" : "rgb-draft",
          });
          warnings.push(...pagePngResult.warnings);
          pngOutputs.push(...pagePngResult.outputs);
        }
      }

      const pngResult: PngPreviewResult = options.png
        ? {
            requested: true,
            generated: pngOutputs.length > 0,
            dpi: options.pngDpi,
            colorSource: options.cmyk ? "cmyk-mapped" : "rgb-draft",
            outputs: pngOutputs,
            warnings: [],
          }
        : skippedPngResult();

      return { warnings, cmyk: cmykResult, png: pngResult };
    }
  } finally {
    await browser.close();
  }
}
