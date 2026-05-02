import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

export async function mergePdfs(inputPaths: string[], outputPath: string): Promise<void> {
  const mergedDoc = await PDFDocument.create();

  for (const inputPath of inputPaths) {
    const buffer = readFileSync(inputPath);
    const uint8 = new Uint8Array(buffer.byteLength);
    for (let i = 0; i < buffer.byteLength; i++) {
      uint8[i] = buffer[i];
    }
    const srcDoc = await PDFDocument.load(uint8);
    const [copiedPage] = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    mergedDoc.addPage(copiedPage);
  }

  const mergedBytes = await mergedDoc.save();
  writeFileSync(outputPath, Buffer.from(mergedBytes));
}
