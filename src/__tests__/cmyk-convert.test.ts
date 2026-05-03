import { afterEach, describe, expect, mock, test } from "bun:test";

afterEach(() => {
  mock.restore();
});

describe("CMYK conversion module", () => {
  test("skippedResult returns requested=false converted=false converter=none", async () => {
    const mod = await import("../render/cmyk-convert");
    expect(mod.skippedResult()).toMatchObject({
      requested: false,
      converted: false,
      converter: "none",
    });
  });

  test("convertToCmyk throws clear error when ghostscript unavailable", async () => {
    mock.module("node:fs", () => ({
      existsSync: () => false,
      renameSync: () => {},
      copyFileSync: () => {},
      unlinkSync: () => {},
    }));
    mock.module("node:child_process", () => ({
      spawnSync: () => ({ status: 1, stdout: "", stderr: "not found" }),
    }));

    const mod = await import(`../render/cmyk-convert?ghostscript-missing=${Date.now()}`);
    await expect(mod.convertToCmyk("in.pdf", "out.pdf")).rejects.toThrow(
      /Install Ghostscript \(gs\).*--rgb/s,
    );
  });

  test("convertToCmyk calls gs with safe arg array and returns success metadata", async () => {
    const calls: Array<{ cmd: string; args: string[] }> = [];
    const input = "/tmp/in file.pdf";
    const output = "/tmp/out file.pdf";
    const profile = "/profiles/default_cmyk.icc";

    mock.module("node:fs", () => ({
      existsSync: (p: string) => p === profile || p === output + ".gs-tmp",
      renameSync: () => {},
      copyFileSync: () => {},
      unlinkSync: () => {},
    }));
    mock.module("node:child_process", () => ({
      spawnSync: (cmd: string, args: string[]) => {
        calls.push({ cmd, args });
        if (args[0] === "--version") {
          return { status: 0, stdout: "10.0.0", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    }));

    const mod = await import(`../render/cmyk-convert?ghostscript-success=${Date.now()}`);
    const result = await mod.convertToCmyk(input, output, profile);

    expect(calls.length).toBe(2);
    expect(calls[1]?.cmd).toBe("gs");
    expect(Array.isArray(calls[1]?.args)).toBe(true);
    expect(calls[1]?.args).toContain("-f");
    expect(calls[1]?.args).toContain(input);
    expect(calls[1]?.args).toContain(`-sDefaultCMYKProfile=${profile}`);
    expect(calls[1]?.args).toContain(`-sOutputFile=${output}.gs-tmp`);
    expect(calls[1]?.args.join(" ")).not.toContain("&&");
    expect(result).toMatchObject({
      requested: true,
      converted: true,
      converter: "ghostscript",
      profilePath: profile,
    });
  });

  test("explicit missing cmykProfile path throws with that path", async () => {
    const missing = "/does/not/exist/profile.icc";
    mock.module("node:fs", () => ({
      existsSync: () => false,
      renameSync: () => {},
      copyFileSync: () => {},
      unlinkSync: () => {},
    }));
    mock.module("node:child_process", () => ({
      spawnSync: () => ({ status: 0, stdout: "10.0.0", stderr: "" }),
    }));

    const mod = await import(`../render/cmyk-convert?missing-profile=${Date.now()}`);
    await expect(mod.convertToCmyk("in.pdf", "out.pdf", missing)).rejects.toThrow(missing);
  });
});
