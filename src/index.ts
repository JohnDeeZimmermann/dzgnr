#!/usr/bin/env bun

import { parseArgs } from "./cli/args";
import { loadConfig, mergeOptions } from "./config/load-config";
import type { RenderOptions } from "./config/load-config";
import { renderHtmlToPdf } from "./render/html-to-pdf";
import type { RenderResult } from "./render/html-to-pdf";
import { validatePdf, printReport } from "./validate/pdf-report";

function deriveOutputPath(basePath: string, name: string): string {
  const dotIndex = basePath.lastIndexOf(".pdf");
  if (dotIndex === -1) return basePath + "-" + name + ".pdf";
  return basePath.slice(0, dotIndex) + "-" + name + ".pdf";
}

async function handleSeparateMode(
  options: RenderOptions,
  renderResult: RenderResult,
): Promise<void> {
  const pages = [{ path: options.inputPath, name: "front" }, ...options.pages];
  const reports = [];
  for (const page of pages) {
    const outputPath =
      page.name === "front"
        ? options.outputPath
        : deriveOutputPath(options.outputPath, page.name);
    const pngOutputs = renderResult.png.outputs
      .filter((png) => png.sourcePdfPath === outputPath)
      .map((png) => png.outputPath);
    const report = await validatePdf({
      outputPath,
      expectedWidthCm: options.widthCm,
      expectedHeightCm: options.heightCm,
      renderWarnings: renderResult.warnings,
      cmyk: renderResult.cmyk,
      pngOutputs: pngOutputs.length > 0 ? pngOutputs : undefined,
    });
    reports.push(report);
  }

  if (options.json) {
    console.log(JSON.stringify(reports, null, 2));
  } else {
    for (const report of reports) {
      printReport(report);
    }
  }
}

async function handleCombinedMode(
  options: RenderOptions,
  renderResult: RenderResult,
): Promise<void> {
  const expectedPageCount = 1 + options.pages.length;
  const pngOutputs = renderResult.png.outputs.map((png) => png.outputPath);
  const report = await validatePdf({
    outputPath: options.outputPath,
    expectedWidthCm: options.widthCm,
    expectedHeightCm: options.heightCm,
    renderWarnings: renderResult.warnings,
    cmyk: renderResult.cmyk,
    expectedPageCount,
    pngOutputs: pngOutputs.length > 0 ? pngOutputs : undefined,
  });
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv);
  const config = loadConfig(cliArgs.configPath);
  const options = mergeOptions(cliArgs, config);

  const renderResult: RenderResult = await renderHtmlToPdf(options);

  if (options.mode === "separate") {
    await handleSeparateMode(options, renderResult);
  } else {
    await handleCombinedMode(options, renderResult);
  }
}

try {
  await main();
} catch (err) {
  console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
