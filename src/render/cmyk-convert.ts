import { spawnSync } from "node:child_process";
import { existsSync, renameSync, copyFileSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

export interface CmykConversionResult {
  requested: boolean;
  converted: boolean;
  converter: "ghostscript" | "none";
  profilePath?: string;
  warnings: string[];
}

const KNOWN_GS_PROFILE_PATHS = [
  "/usr/share/ghostscript/iccprofiles/default_cmyk.icc",
];

function resolveCmykProfile(explicitPath?: string): string {
  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(`CMYK ICC profile not found: ${explicitPath}`);
    }
    return explicitPath;
  }

  for (const p of KNOWN_GS_PROFILE_PATHS) {
    if (existsSync(p)) {
      return p;
    }
  }

  try {
    const result = spawnSync("gs", ["--version"], { encoding: "utf-8", timeout: 5000 });
    if (result.status !== 0) {
      throw new Error("Ghostscript not found. Install Ghostscript (gs) for CMYK conversion, or use --rgb for draft output.");
    }
  } catch {
    throw new Error("Ghostscript not found. Install Ghostscript (gs) for CMYK conversion, or use --rgb for draft output.");
  }

  throw new Error(
    "Could not locate a default CMYK ICC profile. " +
    "Install Ghostscript (gs) for a bundled profile, specify a profile path in dzgnr.json via cmykProfile, or use --rgb for draft output.",
  );
}

function getVersion(): string | null {
  try {
    const result = spawnSync("gs", ["--version"], { encoding: "utf-8", timeout: 5000 });
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim();
    }
  } catch {}
  return null;
}

export async function convertToCmyk(
  inputPath: string,
  outputPath: string,
  profilePath?: string,
): Promise<CmykConversionResult> {
  const resolvedProfile = resolveCmykProfile(profilePath);
  const version = getVersion();
  if (!version) {
    throw new Error("Ghostscript not found. Install Ghostscript (gs) for CMYK conversion, or use --rgb for draft output.");
  }

  const tmpOutput = outputPath + ".gs-tmp";

  const args: string[] = [
    "-dNOPAUSE",
    "-dBATCH",
    "-dSAFER",
    "-sDEVICE=pdfwrite",
    "-sColorConversionStrategy=CMYK",
    "-sProcessColorModel=DeviceCMYK",
    "-dOverrideICC",
    `-sDefaultCMYKProfile=${resolvedProfile}`,
    "-dEmbedAllFonts=true",
    "-dSubsetFonts=true",
    "-dCompatibilityLevel=1.7",
    "-dPreserveAnnots=true",
    "-dPreserveOverprintSettings=true",
    `-sOutputFile=${tmpOutput}`,
    "-f",
    inputPath,
  ];

  const result = spawnSync("gs", args, { encoding: "utf-8", timeout: 120000 });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`Ghostscript CMYK conversion failed: ${stderr || "unknown error"}`);
  }

  if (!existsSync(tmpOutput)) {
    throw new Error("Ghostscript completed but did not produce output PDF.");
  }

  try {
    renameSync(tmpOutput, outputPath);
  } catch {
    copyFileSync(tmpOutput, outputPath);
    try { unlinkSync(tmpOutput); } catch {}
  }

  const warnings: string[] = [];
  if (result.stderr && result.stderr.length > 0) {
    const gsMessage = result.stderr.slice(0, 500).trim();
    if (gsMessage) {
      warnings.push(`Ghostscript: ${gsMessage.split("\n").slice(0, 3).join("; ")}`);
    }
  }

  return {
    requested: true,
    converted: true,
    converter: "ghostscript",
    profilePath: resolvedProfile,
    warnings,
  };
}

export function skippedResult(): CmykConversionResult {
  return {
    requested: false,
    converted: false,
    converter: "none",
    warnings: ["CMYK conversion skipped; output is RGB from Chromium (draft mode)."],
  };
}
