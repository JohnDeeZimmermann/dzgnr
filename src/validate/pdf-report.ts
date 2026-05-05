import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { pdfPointsToCm, isWithinTolerance, roundToDecimals } from "../sizing/units";
import type { CmykConversionResult } from "../render/cmyk-convert";

export interface PageDimension {
  index: number;
  widthPt: number;
  heightPt: number;
  widthCm: number;
  heightCm: number;
}

export interface ColorStatus {
  cmykRequested: boolean;
  cmykConverted: boolean;
  converter?: string;
  profilePath?: string;
  validation: "not-checked" | "passed" | "warning";
}

export interface PdfValidationReport {
  outputPath: string;
  pageCount: number;
  expected: { widthCm: number; heightCm: number };
  actualFirstPage: { widthPt: number; heightPt: number; widthCm: number; heightCm: number };
  actualPages: PageDimension[];
  dimensionsOk: boolean;
  warnings: string[];
  color: ColorStatus;
  pngOutputs?: string[];
}

export interface ValidatePdfOptions {
  outputPath: string;
  expectedWidthCm: number;
  expectedHeightCm: number;
  renderWarnings: string[];
  cmyk: CmykConversionResult;
  expectedPageCount?: number;
  pngOutputs?: string[];
}

function buildCmykWarnings(cmyk: CmykConversionResult): string[] {
  if (cmyk.requested && cmyk.converted) {
    return [`CMYK conversion: Ghostscript via ${cmyk.profilePath ?? "default profile"}.`];
  }
  if (cmyk.requested && !cmyk.converted) {
    return ["CMYK conversion was requested but failed."];
  }
  return ["RGB/draft mode: CMYK conversion skipped. Output is Chromium RGB."];
}

function readPdfBytes(outputPath: string): Uint8Array {
  const buffer = readFileSync(outputPath);
  return new Uint8Array(buffer);
}

function validatePageDimensions(
  pdfDoc: PDFDocument,
  expectedWidthCm: number,
  expectedHeightCm: number,
): { actualPages: PageDimension[]; warnings: string[]; allDimensionsOk: boolean } {
  const actualPages: PageDimension[] = [];
  const warnings: string[] = [];
  let allDimensionsOk = true;
  const pageCount = pdfDoc.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    const size = pdfDoc.getPage(i).getSize();
    const actualWidthCm = roundToDecimals(pdfPointsToCm(size.width), 3);
    const actualHeightCm = roundToDecimals(pdfPointsToCm(size.height), 3);

    actualPages.push({ index: i, widthPt: size.width, heightPt: size.height, widthCm: actualWidthCm, heightCm: actualHeightCm });

    const widthOk = isWithinTolerance(actualWidthCm, expectedWidthCm);
    const heightOk = isWithinTolerance(actualHeightCm, expectedHeightCm);

    if (!widthOk) {
      warnings.push(`Page ${i + 1}: Width mismatch — expected ${expectedWidthCm}cm, got ${actualWidthCm}cm (${size.width}pt).`);
    }
    if (!heightOk) {
      warnings.push(`Page ${i + 1}: Height mismatch — expected ${expectedHeightCm}cm, got ${actualHeightCm}cm (${size.height}pt).`);
    }
    if (!widthOk || !heightOk) allDimensionsOk = false;
  }

  return { actualPages, warnings, allDimensionsOk };
}

export async function validatePdf(opts: ValidatePdfOptions): Promise<PdfValidationReport> {
  const warnings = [...opts.renderWarnings, ...buildCmykWarnings(opts.cmyk)];

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = readPdfBytes(opts.outputPath);
  } catch {
    throw new Error(`Could not read generated PDF: ${opts.outputPath}`);
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();

  if (opts.expectedPageCount !== undefined && pageCount !== opts.expectedPageCount) {
    warnings.push(`Expected ${opts.expectedPageCount} page(s), but PDF contains ${pageCount} pages.`);
  }

  const { actualPages, warnings: dimWarnings, allDimensionsOk } =
    validatePageDimensions(pdfDoc, opts.expectedWidthCm, opts.expectedHeightCm);
  warnings.push(...dimWarnings);

  const firstPage = actualPages[0];

  return {
    outputPath: opts.outputPath,
    pageCount,
    expected: { widthCm: opts.expectedWidthCm, heightCm: opts.expectedHeightCm },
    actualFirstPage: {
      widthPt: firstPage.widthPt,
      heightPt: firstPage.heightPt,
      widthCm: firstPage.widthCm,
      heightCm: firstPage.heightCm,
    },
    actualPages,
    dimensionsOk: allDimensionsOk,
    warnings,
    color: {
      cmykRequested: opts.cmyk.requested,
      cmykConverted: opts.cmyk.converted,
      converter: opts.cmyk.converter,
      profilePath: opts.cmyk.profilePath,
      validation: opts.cmyk.requested && opts.cmyk.converted ? "passed" : "warning",
    },
    pngOutputs: opts.pngOutputs,
  };
}

function formatColorLabel(color: ColorStatus): string {
  if (color.cmykRequested && color.cmykConverted) {
    return `CMYK:  ${color.converter ?? "?"}`;
  }
  if (color.cmykRequested) {
    return "CMYK:  requested but not converted";
  }
  return "CMYK:  skipped (RGB/draft mode)";
}

function printDimensions(report: PdfValidationReport): void {
  const multiPage = report.actualPages.length > 1;
  for (const page of report.actualPages) {
    const prefix = multiPage ? `  Page ${page.index + 1}:` : "Actual:  ";
    console.log(`${prefix} ${page.widthCm}cm x ${page.heightCm}cm (${page.widthPt}pt x ${page.heightPt}pt)`);
  }
}

function printWarnings(report: PdfValidationReport): void {
  if (report.warnings.length === 0) return;
  console.log("\nWarnings:");
  for (const w of report.warnings) {
    console.log(`  - ${w}`);
  }
}

function printPngOutputs(report: PdfValidationReport): void {
  if (!report.pngOutputs || report.pngOutputs.length === 0) return;
  console.log("\nPNG previews:");
  for (const pngPath of report.pngOutputs) {
    console.log(`  ${pngPath}`);
  }
}

function printSuccess(report: PdfValidationReport): void {
  if (!report.dimensionsOk || report.color.validation !== "passed") return;
  const hasPng = report.pngOutputs && report.pngOutputs.length > 0;
  const suffix = hasPng ? " PNG previews generated." : "";
  console.log(`\nPDF generated successfully.${suffix}`);
}

export function printReport(report: PdfValidationReport): void {
  console.log(`\nOutput: ${report.outputPath}`);
  console.log(`Pages:  ${report.pageCount}`);
  console.log(`Expected: ${report.expected.widthCm}cm x ${report.expected.heightCm}cm`);
  printDimensions(report);
  console.log(`Dimensions OK: ${report.dimensionsOk ? "yes" : "NO"}`);
  printWarnings(report);
  console.log(formatColorLabel(report.color));
  printPngOutputs(report);
  printSuccess(report);
  console.log();
}
