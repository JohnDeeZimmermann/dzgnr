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

export async function validatePdf(
  outputPath: string,
  expectedWidthCm: number,
  expectedHeightCm: number,
  renderWarnings: string[],
  cmyk: CmykConversionResult,
  expectedPageCount?: number,
  pngOutputs?: string[],
): Promise<PdfValidationReport> {
  const warnings = [...renderWarnings];

  if (cmyk.requested && cmyk.converted) {
    warnings.push(
      `CMYK conversion: Ghostscript via ${cmyk.profilePath ?? "default profile"}.`,
    );
  } else if (cmyk.requested && !cmyk.converted) {
    warnings.push("CMYK conversion was requested but failed.");
  } else if (!cmyk.requested) {
    warnings.push("RGB/draft mode: CMYK conversion skipped. Output is Chromium RGB.");
  }

  let pdfBytes: Uint8Array;
  try {
    const buffer = readFileSync(outputPath);
    pdfBytes = new Uint8Array(buffer.byteLength);
    for (let i = 0; i < buffer.byteLength; i++) {
      pdfBytes[i] = buffer[i];
    }
  } catch {
    throw new Error(`Could not read generated PDF: ${outputPath}`);
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();

  if (expectedPageCount !== undefined && pageCount !== expectedPageCount) {
    warnings.push(`Expected ${expectedPageCount} page(s), but PDF contains ${pageCount} pages.`);
  }

  let dimensionsOk = true;
  const actualPages: PageDimension[] = [];

  for (let i = 0; i < pageCount; i++) {
    const pdfPage = pdfDoc.getPage(i);
    const size = pdfPage.getSize();

    const actualWidthCm = roundToDecimals(pdfPointsToCm(size.width), 3);
    const actualHeightCm = roundToDecimals(pdfPointsToCm(size.height), 3);

    actualPages.push({
      index: i,
      widthPt: size.width,
      heightPt: size.height,
      widthCm: actualWidthCm,
      heightCm: actualHeightCm,
    });

    const widthOk = isWithinTolerance(actualWidthCm, expectedWidthCm);
    const heightOk = isWithinTolerance(actualHeightCm, expectedHeightCm);

    if (!widthOk) {
      warnings.push(
        `Page ${i + 1}: Width mismatch — expected ${expectedWidthCm}cm, got ${actualWidthCm}cm (${size.width}pt).`,
      );
    }
    if (!heightOk) {
      warnings.push(
        `Page ${i + 1}: Height mismatch — expected ${expectedHeightCm}cm, got ${actualHeightCm}cm (${size.height}pt).`,
      );
    }

    if (!widthOk || !heightOk) {
      dimensionsOk = false;
    }
  }

  const firstPage = actualPages[0];

  return {
    outputPath,
    pageCount,
    expected: { widthCm: expectedWidthCm, heightCm: expectedHeightCm },
    actualFirstPage: {
      widthPt: firstPage.widthPt,
      heightPt: firstPage.heightPt,
      widthCm: firstPage.widthCm,
      heightCm: firstPage.heightCm,
    },
    actualPages,
    dimensionsOk,
    warnings,
    color: {
      cmykRequested: cmyk.requested,
      cmykConverted: cmyk.converted,
      converter: cmyk.converter,
      profilePath: cmyk.profilePath,
      validation: cmyk.requested && cmyk.converted ? "passed" : "warning",
    },
    pngOutputs,
  };
}

export function printReport(report: PdfValidationReport): void {
  console.log(`\nOutput: ${report.outputPath}`);
  console.log(`Pages:  ${report.pageCount}`);
  console.log(
    `Expected: ${report.expected.widthCm}cm x ${report.expected.heightCm}cm`,
  );

  for (const page of report.actualPages) {
    if (report.actualPages.length > 1) {
      console.log(
        `  Page ${page.index + 1}: ${page.widthCm}cm x ${page.heightCm}cm ` +
          `(${page.widthPt}pt x ${page.heightPt}pt)`,
      );
    } else {
      console.log(
        `Actual:   ${page.widthCm}cm x ${page.heightCm}cm ` +
          `(${page.widthPt}pt x ${page.heightPt}pt)`,
      );
    }
  }

  console.log(
    `Dimensions OK: ${report.dimensionsOk ? "yes" : "NO"}`,
  );

  if (report.warnings.length > 0) {
    console.log(`\nWarnings:`);
    for (const w of report.warnings) {
      console.log(`  - ${w}`);
    }
  }

  const colorLabel =
    report.color.cmykRequested && report.color.cmykConverted
      ? `CMYK:  ${report.color.converter ?? "?"}`
      : report.color.cmykRequested
        ? "CMYK:  requested but not converted"
        : "CMYK:  skipped (RGB/draft mode)";
  console.log(colorLabel);

  if (report.pngOutputs && report.pngOutputs.length > 0) {
    console.log(`\nPNG previews:`);
    for (const pngPath of report.pngOutputs) {
      console.log(`  ${pngPath}`);
    }
  }

  if (report.dimensionsOk && report.color.validation === "passed") {
    const suffix = report.pngOutputs && report.pngOutputs.length > 0 ? " PNG previews generated." : "";
    console.log(`\nPDF generated successfully.${suffix}`);
  }

  console.log();
}
