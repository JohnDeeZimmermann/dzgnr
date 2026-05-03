import { describe, expect, test } from "bun:test";
import { mergeOptions } from "../config/load-config";
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
