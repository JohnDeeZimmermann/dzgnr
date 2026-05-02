import { chromium } from "playwright";
import type { Page } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdtempSync, unlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { formatCmForPlaywright } from "../sizing/units";
import { fontWaitScript } from "../fonts/wait-for-fonts";
import { mergePdfs } from "./merge-pdfs";
import type { RenderOptions } from "../config/load-config";

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

export async function renderHtmlToPdf(options: RenderOptions): Promise<string[]> {
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

        await mergePdfs(tempFiles, options.outputPath);
      } finally {
        for (const tf of tempFiles) {
          try { unlinkSync(tf); } catch {}
        }
        try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }
    } else {
      for (let i = 0; i < pages.length; i++) {
        const outputPath =
          i === 0 ? options.outputPath : deriveOutputPath(options.outputPath, pages[i].name);
        const pageWarnings = await renderSinglePage(
          page,
          pages[i].path,
          outputPath,
          options,
          pages[i].name,
        );
        warnings.push(...pageWarnings);
      }
    }

    return warnings;
  } finally {
    await browser.close();
  }
}
