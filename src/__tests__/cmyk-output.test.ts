import { describe, expect, test } from "bun:test";

describe("CMYK output verification", () => {
  test("converted PDF content uses CMYK operators (not RGB operators)", () => {
    const script = `
      import { spawnSync } from "node:child_process";
      import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
      import { tmpdir } from "node:os";
      import { join } from "node:path";
      import { PDFDocument, rgb } from "pdf-lib";
      import { convertToCmyk } from "./src/render/cmyk-convert";

      const DEFAULT_CMYK_PROFILE = "/usr/share/ghostscript/iccprofiles/default_cmyk.icc";

      function hasGhostscript() {
        try {
          const result = spawnSync("gs", ["--version"], { encoding: "utf-8", timeout: 5000 });
          return result.status === 0;
        } catch {
          return false;
        }
      }

      function uncompressPdf(inputPath, outputPath) {
        const args = [
          "-dNOPAUSE",
          "-dBATCH",
          "-dSAFER",
          "-sDEVICE=pdfwrite",
          "-dCompressPages=false",
          "-dCompressStreams=false",
          "-sOutputFile=" + outputPath,
          "-f",
          inputPath,
        ];
        const result = spawnSync("gs", args, { encoding: "utf-8", timeout: 120000 });
        if (result.status !== 0) {
          throw new Error("Ghostscript stream uncompress failed: " + (result.stderr || "unknown error"));
        }
      }

      function countColorOperators(pdfText) {
        const rgbFillOps = (pdfText.match(/(?:^|[\\r\\n\\s])-?\\d*\\.?\\d+\\s+-?\\d*\\.?\\d+\\s+-?\\d*\\.?\\d+\\s+rg\\b/gm) || []).length;
        const cmykFillOps = (pdfText.match(/(?:^|[\\r\\n\\s])-?\\d*\\.?\\d+\\s+-?\\d*\\.?\\d+\\s+-?\\d*\\.?\\d+\\s+-?\\d*\\.?\\d+\\s+k\\b/gm) || []).length;
        return { rgbFillOps, cmykFillOps };
      }

      if (!hasGhostscript()) {
        console.log(JSON.stringify({ skipped: "Ghostscript not available" }));
        process.exit(0);
      }
      if (!existsSync(DEFAULT_CMYK_PROFILE)) {
        console.log(JSON.stringify({ skipped: "Missing profile", path: DEFAULT_CMYK_PROFILE }));
        process.exit(0);
      }

      const dir = mkdtempSync(join(tmpdir(), "dzgnr-cmyk-output-"));
      const inputPath = join(dir, "input-rgb.pdf");
      const outputPath = join(dir, "output-cmyk.pdf");
      const inputInspectPath = join(dir, "input-uncompressed.pdf");
      const outputInspectPath = join(dir, "output-uncompressed.pdf");

      try {
        const doc = await PDFDocument.create();
        const page = doc.addPage([300, 200]);
        page.drawRectangle({ x: 20, y: 20, width: 100, height: 100, color: rgb(1, 0, 0) });
        page.drawRectangle({ x: 140, y: 20, width: 100, height: 100, color: rgb(0, 0, 1) });
        writeFileSync(inputPath, await doc.save());

        await convertToCmyk(inputPath, outputPath, DEFAULT_CMYK_PROFILE);
        uncompressPdf(inputPath, inputInspectPath);
        uncompressPdf(outputPath, outputInspectPath);

        const inputText = readFileSync(inputInspectPath).toString("latin1");
        const outputText = readFileSync(outputInspectPath).toString("latin1");
        const inputOps = countColorOperators(inputText);
        const outputOps = countColorOperators(outputText);
        console.log(JSON.stringify({ skipped: false, inputOps, outputOps }));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    `;

    const result = Bun.spawnSync({
      cmd: ["bun", "-e", script],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdoutText = Buffer.from(result.stdout).toString("utf-8").trim();
    const stderrText = Buffer.from(result.stderr).toString("utf-8").trim();

    if (result.exitCode !== 0) {
      throw new Error(`CMYK verification subprocess failed: ${stderrText || stdoutText}`);
    }

    const parsed = JSON.parse(stdoutText) as
      | { skipped: string; path?: string }
      | {
          skipped: false;
          inputOps: { rgbFillOps: number; cmykFillOps: number };
          outputOps: { rgbFillOps: number; cmykFillOps: number };
        };

    if (parsed.skipped !== false) {
      console.warn(
        `Skipping CMYK output verification in subprocess: ${parsed.skipped}${parsed.path ? ` (${parsed.path})` : ""}.`,
      );
      return;
    }

    expect(parsed.inputOps.rgbFillOps).toBeGreaterThan(0);
    expect(parsed.inputOps.cmykFillOps).toBe(0);
    expect(parsed.outputOps.cmykFillOps).toBeGreaterThan(0);
    expect(parsed.outputOps.rgbFillOps).toBe(0);
  });
});
