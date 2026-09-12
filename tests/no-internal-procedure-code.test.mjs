import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(testDir, "../app");

function sourceFiles(root) {
  const files = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) files.push(path);
  }
  return files;
}

test("user-facing frontend source does not expose internal procedure code P.09", () => {
  const offenders = sourceFiles(appRoot)
    .filter((path) => /P\.09/i.test(readFileSync(path, "utf8")))
    .map((path) => relative(appRoot, path));
  assert.deepEqual(offenders, []);
});
