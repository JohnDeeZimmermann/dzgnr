import { describe, expect, test } from "bun:test";
import { parseArgs } from "../cli/args";

describe("CLI args parsing", () => {
  test("--rgb sets rgb true", () => {
    const parsed = parseArgs(["bun", "dzgnr", "render", "input.html", "--rgb"]);
    expect(parsed.rgb).toBe(true);
  });

  test("--rgb absent leaves rgb undefined", () => {
    const parsed = parseArgs(["bun", "dzgnr", "render", "input.html"]);
    expect(parsed.rgb).toBeUndefined();
  });

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
