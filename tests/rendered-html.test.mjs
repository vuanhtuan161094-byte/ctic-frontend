import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("builds the CTIC application shell", async () => {
  const [html, assets] = await Promise.all([
    readFile(new URL("dist/index.html", projectRoot), "utf8"),
    readdir(new URL("dist/assets/", projectRoot)),
  ]);

  assert.match(html, /<title>Certification Management Platform<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/i);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
  assert.ok(assets.some((file) => file.endsWith(".js")), "missing JavaScript bundle");
  assert.ok(assets.some((file) => file.endsWith(".css")), "missing stylesheet bundle");
});
