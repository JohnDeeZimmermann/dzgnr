import { afterEach, describe, expect, mock, test } from "bun:test";

afterEach(() => {
  mock.restore();
});

describe("PNG preview rasterization", () => {
  test.serial("throws when Ghostscript is unavailable", async () => {
    mock.module("node:child_process", () => ({
      spawnSync: () => ({ status: 1, stdout: "", stderr: "gs not found" }),
    }));

    const mod = await import(`../render/png-preview?ghostscript-missing=${Date.now()}`);
    await expect(
      mod.rasterizePdfToPng({
        pdfPath: "/tmp/input.pdf",
        outputPattern: "/tmp/out-%d.png",
        dpi: 150,
        colorSource: "rgb-draft",
      }),
    ).rejects.toThrow(/Ghostscript \(gs\) is required for PNG preview generation/i);
  });

  test.serial("returns expected result shape on successful multi-page render", async () => {
    const spawnCalls: Array<{ cmd: string; args: string[] }> = [];

    mock.module("node:child_process", () => ({
      spawnSync: (cmd: string, args: string[]) => {
        spawnCalls.push({ cmd, args });
        if (args[0] === "--version") {
          return { status: 0, stdout: "10.05.0", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "minor warning\nsecond line" };
      },
    }));

    mock.module("node:fs", () => ({
      readFileSync: () => Buffer.from("%PDF-mock"),
      existsSync: (path: string) =>
        [
          "/tmp/out-1.png",
          "/tmp/out-2.png",
          "/usr/share/ghostscript/iccprofiles/default_cmyk.icc",
          "/usr/share/ghostscript/iccprofiles/srgb.icc",
        ].includes(path),
    }));

    mock.module("pdf-lib", () => ({
      PDFDocument: {
        load: async () => ({ getPageCount: () => 2 }),
      },
    }));

    const mod = await import(`../render/png-preview?success-shape=${Date.now()}`);
    const result = await mod.rasterizePdfToPng({
      pdfPath: "/tmp/in.pdf",
      outputPattern: "/tmp/out-%d.png",
      dpi: 300,
      cmykProfile: "/usr/share/ghostscript/iccprofiles/default_cmyk.icc",
      colorSource: "cmyk-mapped",
    });

    expect(result).toMatchObject({
      requested: true,
      generated: true,
      dpi: 300,
      colorSource: "cmyk-mapped",
      outputs: [
        { pageIndex: 0, outputPath: "/tmp/out-1.png", sourcePdfPath: "/tmp/in.pdf" },
        { pageIndex: 1, outputPath: "/tmp/out-2.png", sourcePdfPath: "/tmp/in.pdf" },
      ],
    });
    expect(result.warnings[0]).toContain("Ghostscript:");
    expect(spawnCalls.length).toBeGreaterThanOrEqual(2);
  });

  test("skippedPngResult returns non-requested shape", async () => {
    const mod = await import("../render/png-preview");
    expect(mod.skippedPngResult()).toEqual({
      requested: false,
      generated: false,
      dpi: 0,
      colorSource: "rgb-draft",
      outputs: [],
      warnings: [],
    });
  });

  test.serial("CMYK-mapped args include ICC profile and render intent flags", async () => {
    let rasterArgs: string[] = [];
    mock.module("node:child_process", () => ({
      spawnSync: (_cmd: string, args: string[]) => {
        if (args[0] === "--version") return { status: 0, stdout: "10.0", stderr: "" };
        rasterArgs = args;
        return { status: 0, stdout: "", stderr: "" };
      },
    }));
    mock.module("node:fs", () => ({
      readFileSync: () => Buffer.from("%PDF-mock"),
      existsSync: () => true,
    }));
    mock.module("pdf-lib", () => ({
      PDFDocument: { load: async () => ({ getPageCount: () => 1 }) },
    }));

    const mod = await import(`../render/png-preview?cmyk-flags=${Date.now()}`);
    await mod.rasterizePdfToPng({
      pdfPath: "/tmp/a.pdf",
      outputPattern: "/tmp/a.png",
      dpi: 150,
      cmykProfile: "/tmp/cmyk.icc",
      colorSource: "cmyk-mapped",
    });

    expect(rasterArgs.some((a) => a.startsWith("-sDefaultCMYKProfile="))).toBe(true);
    expect(rasterArgs.some((a) => a.startsWith("-sOutputICCProfile="))).toBe(true);
    expect(rasterArgs).toContain("-dRenderIntent=0");
  });

  test.serial("RGB-draft args do not include ICC mapping flags", async () => {
    let rasterArgs: string[] = [];
    mock.module("node:child_process", () => ({
      spawnSync: (_cmd: string, args: string[]) => {
        if (args[0] === "--version") return { status: 0, stdout: "10.0", stderr: "" };
        rasterArgs = args;
        return { status: 0, stdout: "", stderr: "" };
      },
    }));
    mock.module("node:fs", () => ({
      readFileSync: () => Buffer.from("%PDF-mock"),
      existsSync: () => true,
    }));
    mock.module("pdf-lib", () => ({
      PDFDocument: { load: async () => ({ getPageCount: () => 1 }) },
    }));

    const mod = await import(`../render/png-preview?rgb-flags=${Date.now()}`);
    await mod.rasterizePdfToPng({
      pdfPath: "/tmp/a.pdf",
      outputPattern: "/tmp/a.png",
      dpi: 150,
      colorSource: "rgb-draft",
    });

    expect(rasterArgs.some((a) => a.startsWith("-sDefaultCMYKProfile="))).toBe(false);
    expect(rasterArgs.some((a) => a.startsWith("-sOutputICCProfile="))).toBe(false);
    expect(rasterArgs.includes("-dRenderIntent=0")).toBe(false);
  });

  test.serial("computes output paths for single-page and multi-page PDFs", async () => {
    mock.module("node:child_process", () => ({
      spawnSync: (_cmd: string, args: string[]) =>
        args[0] === "--version"
          ? { status: 0, stdout: "10.0", stderr: "" }
          : { status: 0, stdout: "", stderr: "" },
    }));

    let pageCount = 1;
    mock.module("pdf-lib", () => ({
      PDFDocument: { load: async () => ({ getPageCount: () => pageCount }) },
    }));
    mock.module("node:fs", () => ({
      readFileSync: () => Buffer.from("%PDF-mock"),
      existsSync: (path: string) =>
        ["/tmp/single.png", "/tmp/multi-1.png", "/tmp/multi-2.png"].includes(path),
    }));

    const mod = await import(`../render/png-preview?path-compute=${Date.now()}`);

    const single = await mod.rasterizePdfToPng({
      pdfPath: "/tmp/single.pdf",
      outputPattern: "/tmp/single.png",
      dpi: 150,
      colorSource: "rgb-draft",
    });
    expect(single.outputs.map((o: { outputPath: string }) => o.outputPath)).toEqual(["/tmp/single.png"]);

    pageCount = 2;
    const multi = await mod.rasterizePdfToPng({
      pdfPath: "/tmp/multi.pdf",
      outputPattern: "/tmp/multi-%d.png",
      dpi: 150,
      colorSource: "rgb-draft",
    });
    expect(multi.outputs.map((o: { outputPath: string }) => o.outputPath)).toEqual(["/tmp/multi-1.png", "/tmp/multi-2.png"]);
  });

  test.serial("failure includes clear Ghostscript stderr message", async () => {
    mock.module("node:child_process", () => ({
      spawnSync: (_cmd: string, args: string[]) =>
        args[0] === "--version"
          ? { status: 0, stdout: "10.0", stderr: "" }
          : { status: 1, stdout: "", stderr: "unable to open input file" },
    }));
    mock.module("node:fs", () => ({
      readFileSync: () => Buffer.from("%PDF-mock"),
      existsSync: () => true,
    }));
    mock.module("pdf-lib", () => ({
      PDFDocument: { load: async () => ({ getPageCount: () => 1 }) },
    }));

    const mod = await import(`../render/png-preview?failure-msg=${Date.now()}`);
    await expect(
      mod.rasterizePdfToPng({
        pdfPath: "/tmp/in.pdf",
        outputPattern: "/tmp/out.png",
        dpi: 150,
        colorSource: "rgb-draft",
      }),
    ).rejects.toThrow(/Ghostscript PNG rasterization failed: unable to open input file/i);
  });
});
