import { describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PDFDocument } from "pdf-lib";
import { printReport, validatePdf } from "../validate/pdf-report";

async function createPdf(path: string, pages: Array<{ widthPt: number; heightPt: number }>) {
  const doc = await PDFDocument.create();
  for (const page of pages) {
    doc.addPage([page.widthPt, page.heightPt]);
  }
  const bytes = await doc.save();
  writeFileSync(path, bytes);
}

describe("PDF validation reporting with CMYK status", () => {
  test("requested+converted marks color passed and includes CMYK warning", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dzgnr-test-"));
    const pdfPath = join(dir, "out.pdf");
    try {
      await createPdf(pdfPath, [{ widthPt: 255.118, heightPt: 155.906 }]);
      const report = await validatePdf({
        outputPath: pdfPath,
        expectedWidthCm: 9,
        expectedHeightCm: 5.5,
        renderWarnings: ["pre-warning"],
        cmyk: {
          requested: true,
          converted: true,
          converter: "ghostscript",
          profilePath: "/usr/share/ghostscript/iccprofiles/default_cmyk.icc",
          warnings: [],
        },
      });

      expect(report.color.validation).toBe("passed");
      expect(report.warnings.some((w) => /CMYK conversion: Ghostscript/i.test(w))).toBe(true);
      expect(report.warnings.some((w) => /chromium.*cmyk/i.test(w))).toBe(false);
      expect(report.color).toMatchObject({
        cmykRequested: true,
        cmykConverted: true,
        converter: "ghostscript",
        profilePath: "/usr/share/ghostscript/iccprofiles/default_cmyk.icc",
        validation: "passed",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("not requested marks warning and includes RGB/draft message", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dzgnr-test-"));
    const pdfPath = join(dir, "out.pdf");
    try {
      await createPdf(pdfPath, [{ widthPt: 255.118, heightPt: 155.906 }]);
      const report = await validatePdf({
        outputPath: pdfPath,
        expectedWidthCm: 9,
        expectedHeightCm: 5.5,
        renderWarnings: [],
        cmyk: {
          requested: false,
          converted: false,
          converter: "none",
          warnings: [],
        },
      });

      expect(report.color.validation).toBe("warning");
      expect(report.warnings.some((w) => /RGB\/draft mode/i.test(w))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("dimension and page-count checks still produce warnings", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dzgnr-test-"));
    const pdfPath = join(dir, "out.pdf");
    try {
      await createPdf(pdfPath, [
        { widthPt: 100, heightPt: 100 },
        { widthPt: 255.118, heightPt: 155.906 },
      ]);
      const report = await validatePdf({
        outputPath: pdfPath,
        expectedWidthCm: 9,
        expectedHeightCm: 5.5,
        renderWarnings: [],
        cmyk: {
          requested: true,
          converted: false,
          converter: "ghostscript",
          warnings: [],
        },
        expectedPageCount: 1,
      });

      expect(report.pageCount).toBe(2);
      expect(report.dimensionsOk).toBe(false);
      expect(report.warnings.some((w) => /Expected 1 page\(s\), but PDF contains 2 pages\./.test(w))).toBe(true);
      expect(report.warnings.some((w) => /Width mismatch|Height mismatch/.test(w))).toBe(true);
      expect(report.color.validation).toBe("warning");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("validatePdf includes pngOutputs when provided", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dzgnr-test-"));
    const pdfPath = join(dir, "out.pdf");
    try {
      await createPdf(pdfPath, [{ widthPt: 255.118, heightPt: 155.906 }]);
      const pngOutputs = [join(dir, "out-1.png"), join(dir, "out-2.png")];

      const report = await validatePdf({
        outputPath: pdfPath,
        expectedWidthCm: 9,
        expectedHeightCm: 5.5,
        renderWarnings: [],
        cmyk: {
          requested: true,
          converted: true,
          converter: "ghostscript",
          warnings: [],
        },
        expectedPageCount: 1,
        pngOutputs,
      });

      expect(report.pngOutputs).toEqual(pngOutputs);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("printReport includes PNG section and success suffix", () => {
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = mock((...args: unknown[]) => {
      lines.push(args.join(" "));
    }) as unknown as typeof console.log;

    try {
      printReport({
        outputPath: "/tmp/out.pdf",
        pageCount: 1,
        expected: { widthCm: 9, heightCm: 5.5 },
        actualFirstPage: { widthPt: 255.118, heightPt: 155.906, widthCm: 9, heightCm: 5.5 },
        actualPages: [{ index: 0, widthPt: 255.118, heightPt: 155.906, widthCm: 9, heightCm: 5.5 }],
        dimensionsOk: true,
        warnings: [],
        color: {
          cmykRequested: true,
          cmykConverted: true,
          converter: "ghostscript",
          validation: "passed",
        },
        pngOutputs: ["/tmp/out-1.png"],
      });
    } finally {
      console.log = originalLog;
    }

    const output = lines.join("\n");
    expect(output).toContain("PNG previews:");
    expect(output).toContain("/tmp/out-1.png");
    expect(output).toContain("PDF generated successfully. PNG previews generated.");
  });
});
