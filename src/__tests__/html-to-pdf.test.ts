import { afterEach, describe, expect, mock, test } from "bun:test";
import type { RenderOptions } from "../config/load-config";

afterEach(() => {
  mock.restore();
});

describe("renderHtmlToPdf return shape integration", () => {
  test.serial("returns RenderResult object with warnings and cmyk fields", async () => {
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
      png: false,
      pngDpi: 150,
    };

    const result = await mod.renderHtmlToPdf(options);
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("cmyk");
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.cmyk).toMatchObject({
      requested: false,
      converted: false,
      converter: "none",
    });
    expect(result).toHaveProperty("png");
    expect(result.png).toEqual({
      requested: false,
      generated: false,
      dpi: 0,
      colorSource: "rgb-draft",
      outputs: [],
      warnings: [],
    });
  });
});
