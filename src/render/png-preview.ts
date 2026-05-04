import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { getGhostscriptVersion, resolveCmykProfile, resolveRgbOutputProfile } from "./cmyk-convert";

export interface PngPageResult {
  pageIndex: number;
  outputPath: string;
  sourcePdfPath: string;
}

export interface PngPreviewResult {
  requested: boolean;
  generated: boolean;
  dpi: number;
  colorSource: "cmyk-mapped" | "rgb-draft";
  outputs: PngPageResult[];
  warnings: string[];
}

async function getPdfPageCount(pdfPath: string): Promise<number> {
  const buffer = readFileSync(pdfPath);
  const bytes = new Uint8Array(buffer.byteLength);
  for (let i = 0; i < buffer.byteLength; i++) {
    bytes[i] = buffer[i];
  }
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

function computeOutputPaths(
  outputPattern: string,
  pageCount: number,
): string[] {
  if (!outputPattern.includes("%d")) {
    return [outputPattern];
  }
  const paths: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    paths.push(outputPattern.replace("%d", String(i)));
  }
  return paths;
}

export async function rasterizePdfToPng(options: {
  pdfPath: string;
  outputPattern: string;
  dpi: number;
  cmykProfile?: string;
  colorSource: "cmyk-mapped" | "rgb-draft";
}): Promise<PngPreviewResult> {
  const warnings: string[] = [];
  const gsVersion = getGhostscriptVersion();
  if (!gsVersion) {
    throw new Error(
      "Ghostscript (gs) is required for PNG preview generation. Install Ghostscript or omit --png.",
    );
  }

  const pageCount = await getPdfPageCount(options.pdfPath);

  const hasPattern = options.outputPattern.includes("%d");
  if (pageCount > 1 && !hasPattern) {
    throw new Error(
      `PDF has ${pageCount} pages but outputPattern "${options.outputPattern}" does not contain %d for multi-page output.`,
    );
  }

  const outputFile = hasPattern ? options.outputPattern : options.outputPattern;

  const args: string[] = [
    "-dNOPAUSE",
    "-dBATCH",
    "-dSAFER",
    "-sDEVICE=png16m",
    "-dTextAlphaBits=4",
    "-dGraphicsAlphaBits=4",
    `-r${options.dpi}`,
  ];

  if (options.colorSource === "cmyk-mapped") {
    const cmykProfile = resolveCmykProfile(options.cmykProfile);
    args.push(`-sDefaultCMYKProfile=${cmykProfile}`);

    const rgbProfile = resolveRgbOutputProfile();
    if (!rgbProfile) {
      throw new Error(
        "Could not locate an sRGB ICC profile required for CMYK-mapped PNG previews. " +
        "Install Ghostscript ICC profiles or use --rgb for draft output.",
      );
    }
    args.push(`-sOutputICCProfile=${rgbProfile}`);
    args.push("-dRenderIntent=0");
  }

  args.push(`-sOutputFile=${outputFile}`);
  args.push("-f");
  args.push(options.pdfPath);

  const result = spawnSync("gs", args, { encoding: "utf-8", timeout: 120000 });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`Ghostscript PNG rasterization failed: ${stderr || "unknown error"}`);
  }

  if (result.stderr && result.stderr.length > 0) {
    const gsMessage = result.stderr.slice(0, 500).trim();
    if (gsMessage) {
      warnings.push(`Ghostscript: ${gsMessage.split("\n").slice(0, 3).join("; ")}`);
    }
  }

  const outputPaths = computeOutputPaths(options.outputPattern, pageCount);
  const outputs: PngPageResult[] = [];

  for (let i = 0; i < outputPaths.length; i++) {
    if (!existsSync(outputPaths[i])) {
      throw new Error(`Ghostscript completed but did not produce expected PNG: ${outputPaths[i]}`);
    }
    outputs.push({
      pageIndex: i,
      outputPath: outputPaths[i],
      sourcePdfPath: options.pdfPath,
    });
  }

  return {
    requested: true,
    generated: true,
    dpi: options.dpi,
    colorSource: options.colorSource,
    outputs,
    warnings,
  };
}

export function skippedPngResult(): PngPreviewResult {
  return {
    requested: false,
    generated: false,
    dpi: 0,
    colorSource: "rgb-draft",
    outputs: [],
    warnings: [],
  };
}
