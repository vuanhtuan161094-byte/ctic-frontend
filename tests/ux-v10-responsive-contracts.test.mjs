import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const auditCss = await readFile(new URL("../app/components/certification-audit/certification-audit.css", import.meta.url), "utf8");
const dossier = await readFile(new URL("../app/components/CertificationProjectDetailScreen.tsx", import.meta.url), "utf8");
test("mobile dossier actions wrap without hiding page overflow", () => {
  assert.match(css, /\.dossier-workspace-card > \.ant-card-head \.ant-card-extra/);
  assert.match(css, /\.dossier-workspace-card > \.ant-card-head \.ant-card-head-title/);
});
test("mobile audit team metadata expands to available width", () => {
  assert.match(auditCss, /\.cmp-audit-team-list \.ant-list-item-meta/);
  assert.match(auditCss, /align-self: stretch/);
});
test("not started dossier state is translated", () => {
  assert.match(dossier, /not_started: "Chưa bắt đầu"/);
});
