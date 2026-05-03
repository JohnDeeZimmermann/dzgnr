import { describe, expect, test } from "bun:test";

describe("CMYK conversion module", () => {
  test.serial("skippedResult returns requested=false converted=false converter=none", async () => {
    const mod = await import("../render/cmyk-convert");
    expect(mod.skippedResult()).toMatchObject({
      requested: false,
      converted: false,
      converter: "none",
    });
  });

  test.serial("explicit missing cmykProfile path throws with that path", async () => {
    const missing = "/does/not/exist/profile.icc";
    const mod = await import("../render/cmyk-convert");
    await expect(mod.convertToCmyk("in.pdf", "out.pdf", missing)).rejects.toThrow(missing);
  });
});
