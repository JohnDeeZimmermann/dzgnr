import { readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

const MAX_FILES = 8;
const ROOT = resolve(import.meta.dir, "..", "src");
const EXCLUDE = new Set(["node_modules", "dist", ".git"]);

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const dirs: string[] = [];
  for (const entry of entries) {
    if (EXCLUDE.has(entry)) continue;
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      dirs.push(full, ...walk(full));
    }
  }
  return dirs;
}

const dirs = [ROOT, ...walk(ROOT)];
let violations = 0;

for (const dir of dirs) {
  const files = readdirSync(dir).filter((e) => {
    if (EXCLUDE.has(e)) return false;
    return statSync(resolve(dir, e)).isFile() && e.endsWith(".ts");
  });
  if (files.length > MAX_FILES) {
    const rel = relative(ROOT, dir) || "src";
    console.error(
      `ERROR: src/${rel} has ${files.length} .ts files (limit: ${MAX_FILES}).`,
    );
    violations++;
  }
}

if (violations > 0) {
  console.error(`\n${violations} director${violations === 1 ? "y" : "ies"} exceed the file limit.`);
  process.exit(1);
}
