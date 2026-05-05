import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { getGhostscriptVersion, resolveCmykProfile, resolveRgbOutputProfile, extractGsWarnings } from "./cmyk-convert";

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

function buildPngArgs(
  baseArgs: string[],
  colorSource: "cmyk-mapped" | "rgb-draft",
  cmykProfilePath: string | undefined,
): string[] {
  const args = [...baseArgs];
  if (colorSource !== "cmyk-mapped") return args;

  const cmykProfile = resolveCmykProfile(cmykProfilePath);
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
  return args;
}

function collectPngOutputs(
  outputPattern: string,
  pageCount: number,
  pdfPath: string,
): PngPageResult[] {
  const outputPaths = computeOutputPaths(outputPattern, pageCount);
  const outputs: PngPageResult[] = [];
  for (let i = 0; i < outputPaths.length; i++) {
    if (!existsSync(outputPaths[i])) {
      throw new Error(`Ghostscript completed but did not produce expected PNG: ${outputPaths[i]}`);
    }
    outputs.push({ pageIndex: i, outputPath: outputPaths[i], sourcePdfPath: pdfPath });
  }
  return outputs;
}

function validatePngRender(gsVersion: string | null, pageCount: number, outputPattern: string): void {
  if (!gsVersion) {
    throw new Error(
      "Ghostscript (gs) is required for PNG preview generation. Install Ghostscript or omit --png.",
    );
  }
  if (pageCount > 1 && !outputPattern.includes("%d")) {
    throw new Error(
      `PDF has ${pageCount} pages but outputPattern "${outputPattern}" does not contain %d for multi-page output.`,
    );
  }
}

export async function rasterizePdfToPng(options: {
  pdfPath: string;
  outputPattern: string;
  dpi: number;
  cmykProfile?: string;
  colorSource: "cmyk-mapped" | "rgb-draft";
}): Promise<PngPreviewResult> {
  const pageCount = await getPdfPageCount(options.pdfPath);
  validatePngRender(getGhostscriptVersion(), pageCount, options.outputPattern);

  const args = buildPngArgs(
    [
      "-dNOPAUSE", "-dBATCH", "-dSAFER", "-sDEVICE=png16m",
      "-dTextAlphaBits=4", "-dGraphicsAlphaBits=4",
      `-r${options.dpi}`, `-sOutputFile=${options.outputPattern}`,
      "-f", options.pdfPath,
    ],
    options.colorSource,
    options.cmykProfile,
  );

  const result = spawnSync("gs", args, { encoding: "utf-8", timeout: 120000 });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`Ghostscript PNG rasterization failed: ${stderr || "unknown error"}`);
  }

  return {
    requested: true,
    generated: true,
    dpi: options.dpi,
    colorSource: options.colorSource,
    outputs: collectPngOutputs(options.outputPattern, pageCount, options.pdfPath),
    warnings: extractGsWarnings(result.stderr),
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
