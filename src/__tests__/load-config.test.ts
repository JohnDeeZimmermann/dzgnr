import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadConfig, mergeOptions } from "../config/load-config";
import type { CliArgs } from "../cli/args";

const baseCli = (overrides: Partial<CliArgs> = {}): CliArgs => ({
  command: "render",
  inputPath: "./fixture.html",
  widthCm: 9,
  heightCm: 5.5,
  ...overrides,
});

describe("config merge CMYK behavior", () => {
  test("defaults cmyk=true when unset in CLI and config", () => {
    const merged = mergeOptions(baseCli(), {});
    expect(merged.cmyk).toBe(true);
  });

  test("CLI --rgb forces cmyk=false even if config cmyk=true", () => {
    const merged = mergeOptions(baseCli({ rgb: true }), { cmyk: true });
    expect(merged.cmyk).toBe(false);
  });

  test("config cmyk=false yields cmyk=false", () => {
    const merged = mergeOptions(baseCli(), { cmyk: false });
    expect(merged.cmyk).toBe(false);
  });

  test("config cmyk=true with no CLI flag yields cmyk=true", () => {
    const merged = mergeOptions(baseCli(), { cmyk: true });
    expect(merged.cmyk).toBe(true);
  });
});

describe("loadConfig path resolution", () => {
  test("resolves pages paths relative to config file directory", () => {
    const root = mkdtempSync(join(tmpdir(), "dzgnr-load-config-"));

    try {
      const configDir = join(root, "project", "configs", "nested");
      mkdirSync(join(configDir, "sub"), { recursive: true });

      const configPath = join(configDir, "dzgnr.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          pages: [
            { name: "Back", path: "back.html" },
            { name: "Inside", path: "./sub/inside.html" },
            { name: "Outside", path: "../outside.html" },
          ],
        }),
      );

      const config = loadConfig(configPath);

      expect(config.pages).toEqual([
        { name: "Back", path: resolve(configDir, "back.html") },
        { name: "Inside", path: resolve(configDir, "./sub/inside.html") },
        { name: "Outside", path: resolve(configDir, "../outside.html") },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("returns empty object when config file does not exist", () => {
    const root = mkdtempSync(join(tmpdir(), "dzgnr-load-config-missing-"));

    try {
      const missingPath = join(root, "nope", "dzgnr.json");
      expect(loadConfig(missingPath)).toEqual({});
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
