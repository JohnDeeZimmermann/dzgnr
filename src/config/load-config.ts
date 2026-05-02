import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
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
}

export function loadConfig(configPath?: string): DzgnrConfig {
  const path = configPath ?? "dzgnr.json";
  const resolved = resolve(path);

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

  return config as DzgnrConfig;
}

export function mergeOptions(cliArgs: CliArgs, config: DzgnrConfig): RenderOptions {
  const inputPath = resolve(cliArgs.inputPath);

  const outputPath =
    cliArgs.outputPath ?? config.output ?? inputPath.replace(extname(inputPath), ".pdf");

  const widthCm = cliArgs.widthCm ?? config.widthCm;
  const heightCm = cliArgs.heightCm ?? config.heightCm;

  if (widthCm === undefined || widthCm <= 0) {
    throw new Error("Missing required width in cm. Provide via --width flag or config file.");
  }
  if (heightCm === undefined || heightCm <= 0) {
    throw new Error("Missing required height in cm. Provide via --height flag or config file.");
  }

  const media: "print" | "screen" = cliArgs.screen
    ? "screen"
    : config.media === "screen"
      ? "screen"
      : "print";

  const normalizedOutput = outputPath.endsWith(".pdf") ? outputPath : outputPath + ".pdf";

  return {
    inputPath,
    outputPath: normalizedOutput,
    widthCm,
    heightCm,
    printBackground: config.printBackground ?? true,
    media,
    preferCssPageSize: config.preferCssPageSize ?? false,
    json: cliArgs.json ?? false,
    pages: config.pages ?? [],
    mode: config.mode ?? "combined",
  };
}
