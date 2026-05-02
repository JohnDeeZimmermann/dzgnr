#!/usr/bin/env bun

import { parseArgs } from "./cli/args";
import { loadConfig, mergeOptions } from "./config/load-config";
import { renderHtmlToPdf } from "./render/html-to-pdf";
import { validatePdf, printReport } from "./validate/pdf-report";

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv);
  const config = loadConfig(cliArgs.configPath);
  const options = mergeOptions(cliArgs, config);

  const renderWarnings = await renderHtmlToPdf(options);
  const report = await validatePdf(
    options.outputPath,
    options.widthCm,
    options.heightCm,
    renderWarnings,
  );

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }
}

try {
  await main();
} catch (err) {
  console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
