import { readFileSync, existsSync } from "node:fs";
import { resolve, extname, dirname } from "node:path";
import type { CliArgs } from "../cli/args";

export interface PageEntry {
  path: string;
  name: string;
}

export interface DzgnrConfig {
  output?: string;
  widthCm?: number;
  heightCm?: number;
  printBackground?: boolean;
  media?: "print" | "screen";
  preferCssPageSize?: boolean;
  pages?: PageEntry[];
  mode?: "combined" | "separate";
  cmyk?: boolean;
  cmykProfile?: string;
  png?: boolean;
  pngDpi?: number;
}

export interface RenderOptions {
  inputPath: string;
  outputPath: string;
  widthCm: number;
  heightCm: number;
  printBackground: boolean;
  media: "print" | "screen";
  preferCssPageSize: boolean;
  json: boolean;
  pages: PageEntry[];
  mode: "combined" | "separate";
  cmyk: boolean;
  cmykProfile?: string;
  png: boolean;
  pngDpi: number;
}

export function loadConfig(configPath?: string): DzgnrConfig {
  const path = configPath ?? "dzgnr.json";
  const resolved = resolve(path);
  const configDir = dirname(resolved);

  if (!existsSync(resolved)) {
    return {};
  }

  let raw: string;
  try {
    raw = readFileSync(resolved, "utf-8");
  } catch {
    throw new Error(`Could not read config file: ${resolved}`);
  }

  let config: unknown;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in config file: ${resolved}`);
  }

  if (typeof config !== "object" || config === null) {
    throw new Error(`Config file must contain a JSON object: ${resolved}`);
  }

  const parsed = config as DzgnrConfig;

  if (Array.isArray(parsed.pages)) {
    parsed.pages = parsed.pages.map((page) => ({
      ...page,
      path: resolve(configDir, page.path),
    }));
  }

  return parsed;
}

function resolveMedia(cliArgs: CliArgs, config: DzgnrConfig): "print" | "screen" {
  if (cliArgs.screen) return "screen";
  if (config.media === "screen") return "screen";
  return "print";
}

function requireDimension(value: number | undefined, label: string): number {
  if (value === undefined || value <= 0) {
    throw new Error(`Missing required ${label} in cm. Provide via --${label} flag or config file.`);
  }
  return value;
}

function resolveOutputPath(inputPath: string, cliArgs: CliArgs, config: DzgnrConfig): string {
  const raw = cliArgs.outputPath ?? config.output ?? inputPath.replace(extname(inputPath), ".pdf");
  return raw.endsWith(".pdf") ? raw : raw + ".pdf";
}

function resolvePngDpi(cliArgs: CliArgs, config: DzgnrConfig): number {
  const dpi = cliArgs.pngDpi ?? config.pngDpi ?? 150;
  if (dpi <= 0 || !isFinite(dpi)) {
    throw new Error(`Invalid PNG DPI: ${dpi}. Must be a positive finite number.`);
  }
  return dpi;
}

function resolveBool(cliOverride: boolean | undefined, configOverride: boolean | undefined, defaultValue: boolean): boolean {
  if (cliOverride !== undefined) return cliOverride;
  return configOverride ?? defaultValue;
}

export function mergeOptions(cliArgs: CliArgs, config: DzgnrConfig): RenderOptions {
  const inputPath = resolve(cliArgs.inputPath);
  const widthCm = requireDimension(cliArgs.widthCm ?? config.widthCm, "width");
  const heightCm = requireDimension(cliArgs.heightCm ?? config.heightCm, "height");

  return {
    inputPath,
    outputPath: resolveOutputPath(inputPath, cliArgs, config),
    widthCm,
    heightCm,
    printBackground: config.printBackground ?? true,
    media: resolveMedia(cliArgs, config),
    preferCssPageSize: config.preferCssPageSize ?? false,
    json: cliArgs.json ?? false,
    pages: config.pages ?? [],
    mode: config.mode ?? "combined",
    cmyk: cliArgs.rgb ? false : (config.cmyk ?? true),
    cmykProfile: config.cmykProfile,
    png: resolveBool(cliArgs.png, config.png, false),
    pngDpi: resolvePngDpi(cliArgs, config),
  };
}
