import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PDFDocument } from "pdf-lib";
import { validatePdf } from "../validate/pdf-report";

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
      const report = await validatePdf(
        pdfPath,
        9,
        5.5,
        ["pre-warning"],
        {
          requested: true,
          converted: true,
          converter: "ghostscript",
          profilePath: "/usr/share/ghostscript/iccprofiles/default_cmyk.icc",
          warnings: [],
        },
      );

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
      const report = await validatePdf(
        pdfPath,
        9,
        5.5,
        [],
        {
          requested: false,
          converted: false,
          converter: "none",
          warnings: [],
        },
      );

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
      const report = await validatePdf(
        pdfPath,
        9,
        5.5,
        [],
        {
          requested: true,
          converted: false,
          converter: "ghostscript",
          warnings: [],
        },
        1,
      );

      expect(report.pageCount).toBe(2);
      expect(report.dimensionsOk).toBe(false);
      expect(report.warnings.some((w) => /Expected 1 page\(s\), but PDF contains 2 pages\./.test(w))).toBe(true);
      expect(report.warnings.some((w) => /Width mismatch|Height mismatch/.test(w))).toBe(true);
      expect(report.color.validation).toBe("warning");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
