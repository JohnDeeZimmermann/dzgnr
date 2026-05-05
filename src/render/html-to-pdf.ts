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

interface PageRenderOptions {
  htmlPath: string;
  pdfPath: string;
  pageName: string;
  options: RenderOptions;
}

async function renderSinglePage(
  page: Page,
  opts: PageRenderOptions,
): Promise<string[]> {
  const warnings: string[] = [];
  const fileUrl = pathToFileURL(resolve(opts.htmlPath)).href;
  await page.goto(fileUrl, { waitUntil: "networkidle" });

  try {
    const fontResult: string | null = await page.evaluate(fontWaitScript());
    if (fontResult) {
      warnings.push(`[${opts.pageName}] ${fontResult}`);
    }
  } catch {
    warnings.push(`[${opts.pageName}] Font readiness check failed. Google Fonts may not be embedded.`);
  }

  await page.pdf({
    path: opts.pdfPath,
    width: formatCmForPlaywright(opts.options.widthCm),
    height: formatCmForPlaywright(opts.options.heightCm),
    printBackground: opts.options.printBackground,
    preferCSSPageSize: opts.options.preferCssPageSize,
  });

  return warnings;
}

function deriveOutputPath(basePath: string, name: string): string {
  const dotIndex = basePath.lastIndexOf(".pdf");
  if (dotIndex === -1) return basePath + "-" + name + ".pdf";
  return basePath.slice(0, dotIndex) + "-" + name + ".pdf";
}

async function generatePng(
  outputPath: string,
  cmyk: boolean,
  options: RenderOptions,
): Promise<{ pngResult: PngPreviewResult; warnings: string[] }> {
  const pngWarnings: string[] = [];
  let pngResult = skippedPngResult();
  if (!options.png) return { pngResult, warnings: pngWarnings };

  const pattern = outputPath.replace(/\.pdf$/, "-%d.png");
  pngResult = await rasterizePdfToPng({
    pdfPath: outputPath,
    outputPattern: pattern,
    dpi: options.pngDpi,
    cmykProfile: options.cmykProfile,
    colorSource: cmyk ? "cmyk-mapped" : "rgb-draft",
  });
  pngWarnings.push(...pngResult.warnings);
  return { pngResult, warnings: pngWarnings };
}

function moveOutput(src: string, dst: string): void {
  try {
    renameSync(src, dst);
  } catch {
    copyFileSync(src, dst);
    try { unlinkSync(src); } catch { /* cleanup best-effort */ }
  }
}

async function renderCombinedMode(
  page: Page,
  pages: Array<{ path: string; name: string }>,
  options: RenderOptions,
): Promise<RenderResult> {
  const warnings: string[] = [];
  const tmpDir = mkdtempSync(`${tmpdir()}/dzgnr-`);
  const tempFiles: string[] = [];

  try {
    for (let i = 0; i < pages.length; i++) {
      const tempPath = `${tmpDir}/page-${i}.pdf`;
      const pageWarnings = await renderSinglePage(page, { htmlPath: pages[i].path, pdfPath: tempPath, pageName: pages[i].name, options });
      warnings.push(...pageWarnings);
      tempFiles.push(tempPath);
    }

    const mergedRgbPath = `${tmpDir}/merged-rgb.pdf`;
    await mergePdfs(tempFiles, mergedRgbPath);

    if (options.cmyk) {
      const cmykResult = await convertToCmyk(mergedRgbPath, options.outputPath, options.cmykProfile);
      warnings.push(...cmykResult.warnings);
      const { pngResult, warnings: pngWarnings } = await generatePng(options.outputPath, true, options);
      warnings.push(...pngWarnings);
      return { warnings, cmyk: cmykResult, png: pngResult };
    }

    moveOutput(mergedRgbPath, options.outputPath);
    const { pngResult, warnings: pngWarnings } = await generatePng(options.outputPath, false, options);
    warnings.push(...pngWarnings);
    return { warnings, cmyk: skippedResult(), png: pngResult };
  } finally {
    for (const tf of tempFiles) {
      try { unlinkSync(tf); } catch { /* cleanup best-effort */ }
    }
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* cleanup best-effort */ }
  }
}

async function renderPageCmyk(
  page: Page,
  pageInfo: { path: string; name: string },
  finalOutputPath: string,
  options: RenderOptions,
): Promise<{ warnings: string[]; cmykResult: CmykConversionResult }> {
  const warnings: string[] = [];
  const tmpDir = mkdtempSync(`${tmpdir()}/dzgnr-`);
  const tempRgbPath = `${tmpDir}/page-rgb.pdf`;

  try {
    const pageWarnings = await renderSinglePage(page, { htmlPath: pageInfo.path, pdfPath: tempRgbPath, pageName: pageInfo.name, options });
    warnings.push(...pageWarnings);

    const convResult = await convertToCmyk(tempRgbPath, finalOutputPath, options.cmykProfile);
    warnings.push(...convResult.warnings);
    return { warnings, cmykResult: convResult };
  } finally {
    try { unlinkSync(tempRgbPath); } catch { /* cleanup best-effort */ }
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* cleanup best-effort */ }
  }
}

async function renderPageWithPng(
  page: Page,
  pageInfo: { path: string; name: string },
  finalOutputPath: string,
  options: RenderOptions,
): Promise<{ warnings: string[]; cmykResult: CmykConversionResult; pngOutputs: PngPageResult[] }> {
  const warnings: string[] = [];
  let cmykResult = skippedResult();

  if (options.cmyk) {
    const result = await renderPageCmyk(page, pageInfo, finalOutputPath, options);
    warnings.push(...result.warnings);
    cmykResult = result.cmykResult;
  } else {
    const pageWarnings = await renderSinglePage(page, { htmlPath: pageInfo.path, pdfPath: finalOutputPath, pageName: pageInfo.name, options });
    warnings.push(...pageWarnings);
  }

  const pngOutputs: PngPageResult[] = [];
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

  return { warnings, cmykResult, pngOutputs };
}

function buildPngResult(options: RenderOptions, outputs: PngPageResult[]): PngPreviewResult {
  if (!options.png) return skippedPngResult();
  return {
    requested: true,
    generated: outputs.length > 0,
    dpi: options.pngDpi,
    colorSource: options.cmyk ? "cmyk-mapped" : "rgb-draft",
    outputs,
    warnings: [],
  };
}

async function renderSeparateMode(
  page: Page,
  pages: Array<{ path: string; name: string }>,
  options: RenderOptions,
): Promise<RenderResult> {
  const warnings: string[] = [];
  let cmykResult: CmykConversionResult = skippedResult();
  const pngOutputs: PngPageResult[] = [];

  for (let i = 0; i < pages.length; i++) {
    const finalOutputPath =
      i === 0 ? options.outputPath : deriveOutputPath(options.outputPath, pages[i].name);

    const { warnings: pw, cmykResult: cr, pngOutputs: po } =
      await renderPageWithPng(page, pages[i], finalOutputPath, options);
    warnings.push(...pw);
    pngOutputs.push(...po);
    if (i === 0) cmykResult = cr;
  }

  return { warnings, cmyk: cmykResult, png: buildPngResult(options, pngOutputs) };
}

export async function renderHtmlToPdf(options: RenderOptions): Promise<RenderResult> {
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
      return await renderCombinedMode(page, pages, options);
    }
    return await renderSeparateMode(page, pages, options);
  } finally {
    await browser.close();
  }
}
