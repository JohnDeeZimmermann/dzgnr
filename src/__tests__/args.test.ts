import { afterEach, describe, expect, mock, test } from "bun:test";
import { parseArgs } from "../cli/args";

const originalExit = process.exit;

afterEach(() => {
  process.exit = originalExit;
  mock.restore();
});

describe("CLI args parsing", () => {
  test("--rgb sets rgb true", () => {
    const parsed = parseArgs(["bun", "dzgnr", "render", "input.html", "--rgb"]);
    expect(parsed.rgb).toBe(true);
  });

  test("--rgb absent leaves rgb undefined", () => {
    const parsed = parseArgs(["bun", "dzgnr", "render", "input.html"]);
    expect(parsed.rgb).toBeUndefined();
  });

  test("--png parses to png=true", () => {
    const parsed = parseArgs(["bun", "dzgnr", "render", "input.html", "--png"]);
    expect(parsed.png).toBe(true);
  });

  test("--png absent leaves png undefined", () => {
    const parsed = parseArgs(["bun", "dzgnr", "render", "input.html"]);
    expect(parsed.png).toBeUndefined();
  });

  test("--png-dpi parses numeric value", () => {
    const parsed = parseArgs(["bun", "dzgnr", "render", "input.html", "--png-dpi", "300"]);
    expect(parsed.pngDpi).toBe(300);
  });

  test.each(["-10", "0", "NaN", "Infinity"])(
    "invalid --png-dpi=%s exits",
    (value) => {
      (process as any).exit = mock(() => {
        throw new Error("exit");
      });
      expect(() =>
        parseArgs(["bun", "dzgnr", "render", "input.html", "--png-dpi", value]),
      ).toThrow("exit");
    },
  );

  test("other flags still parse with --rgb", () => {
    const parsed = parseArgs([
      "bun",
      "dzgnr",
      "render",
      "input.html",
      "--screen",
      "--json",
      "--rgb",
      "--width",
      "9",
      "--height",
      "5.5",
      "--out",
      "out.pdf",
      "--config",
      "dzgnr.json",
    ]);

    expect(parsed).toMatchObject({
      command: "render",
      inputPath: "input.html",
      screen: true,
      json: true,
      rgb: true,
      widthCm: 9,
      heightCm: 5.5,
      outputPath: "out.pdf",
      configPath: "dzgnr.json",
    });
  });
});
