import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { formatCmForPlaywright } from "../sizing/units";
import { fontWaitScript } from "../fonts/wait-for-fonts";
import type { RenderOptions } from "../config/load-config";

export async function renderHtmlToPdf(options: RenderOptions): Promise<string[]> {
  const warnings: string[] = [];
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.emulateMedia({ media: options.media });

    const fileUrl = pathToFileURL(options.inputPath).href;
    await page.goto(fileUrl, { waitUntil: "networkidle" });

    try {
      const fontResult: string | null = await page.evaluate(fontWaitScript());
      if (fontResult) {
        warnings.push(fontResult);
      }
    } catch {
      warnings.push("Font readiness check failed. Google Fonts may not be embedded.");
    }

    await page.pdf({
      path: options.outputPath,
      width: formatCmForPlaywright(options.widthCm),
      height: formatCmForPlaywright(options.heightCm),
      printBackground: options.printBackground,
      preferCSSPageSize: options.preferCssPageSize,
    });

    return warnings;
  } finally {
    await browser.close();
  }
}
