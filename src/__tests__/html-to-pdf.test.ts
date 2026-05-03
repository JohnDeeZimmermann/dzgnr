import { afterEach, describe, expect, mock, test } from "bun:test";
import type { RenderOptions } from "../config/load-config";

afterEach(() => {
  mock.restore();
});

describe("renderHtmlToPdf return shape integration", () => {
  test("returns RenderResult object with warnings and cmyk fields", async () => {
    mock.module("playwright", () => ({
      chromium: {
        launch: async () => ({
          newContext: async () => ({
            newPage: async () => ({
              emulateMedia: async () => {},
              goto: async () => {},
              evaluate: async () => null,
              pdf: async () => {},
            }),
          }),
          close: async () => {},
        }),
      },
    }));

    const cmykResult = {
      requested: false,
      converted: false,
      converter: "none" as const,
      warnings: ["CMYK conversion skipped; output is RGB from Chromium (draft mode)."],
    };

    mock.module("../render/cmyk-convert", () => ({
      convertToCmyk: async () => {
        throw new Error("convertToCmyk should not run in rgb mode");
      },
      skippedResult: () => cmykResult,
    }));

    const mod = await import(`../render/html-to-pdf?mocked=${Date.now()}`);

    const options: RenderOptions = {
      inputPath: "/tmp/input.html",
      outputPath: "/tmp/output.pdf",
      widthCm: 9,
      heightCm: 5.5,
      printBackground: true,
      media: "print",
      preferCssPageSize: false,
      json: false,
      pages: [],
      mode: "separate",
      cmyk: false,
    };

    const result = await mod.renderHtmlToPdf(options);
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("cmyk");
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.cmyk).toEqual(cmykResult);
  });
});
