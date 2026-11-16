import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL(`../app/components/${name}`, import.meta.url), "utf8");

test("F16 renders marked unsigned Word/PDF, uploads current signed scan and separately issues", () => {
  const s = read("P09RecognizedBodiesPanel.tsx");
  assert.match(s, /\/render/);
  assert.match(s, /\/issue-status/);
  assert.match(s, /\/issue`/);
  assert.match(s, /renderCurrentForm\("docx"\)/);
  assert.match(s, /renderCurrentForm\("pdf"\)/);
  assert.match(s, /signed_file_id: signedId/);
  assert.match(s, /"signed_scan"/);
  assert.match(s, /canApprove/);
  assert.match(s, /!issueStatusQuery\.data\.official_issued/);
  assert.match(s, /bản F\.16 đã ký/);
});

test("F18 only prepares three exact legal-source variants, unverified source buttons disabled", () => {
  const s = read("CommercialDocumentsPanel.tsx");
  assert.match(s, /language-sources/);
  assert.match(s, /prepare-language/);
  assert.match(s, /\["vi", "Việt"\]/);
  assert.match(s, /\["vi_en", "Việt–Anh"\]/);
  assert.match(s, /\["vi_cn", "Việt–Trung"\]/);
  assert.match(s, /!source\?\.source_ready/);
  assert.match(s, /bản thỏa thuận chưa ký/);
  assert.match(s, /evidence-status/);
  assert.match(s, /verify-evidence/);
});
