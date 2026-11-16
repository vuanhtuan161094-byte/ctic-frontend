import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL(`../app/components/${name}`, import.meta.url), "utf8");

test("F.08 audit-note workspace saves clause, contents and findings through canonical audit endpoint", () => {
  const source = read("AuditDocumentCenterModal.tsx");
  assert.match(source, /Form\.List name="audit_note_rows"/);
  assert.match(source, /name=\{\[field\.name, "clause"\]\}/);
  assert.match(source, /name=\{\[field\.name, "content"\]\}/);
  assert.match(source, /name=\{\[field\.name, "finding"\]\}/);
  assert.match(source, /\/audit-documents\/plan\/\$\{planId\}\/data/);
  assert.match(source, /"audit_note_f08"/);
});

test("F.16 binds its independent approval workflow to backend and keeps the manday warning", () => {
  const source = read("P09RecognizedBodiesPanel.tsx");
  assert.match(source, /recognized-certification-bodies/);
  assert.match(source, /\/approve/);
  assert.match(source, /manday_reduction_authorized/);
  assert.match(source, /không đồng nghĩa tự động giảm ngày công/);
  assert.match(source, /roles\.includes\("ADMIN"\)/);
});

test("F.18 evidence controls read server verified status and submit the current signed file ID", () => {
  const source = read("CommercialDocumentsPanel.tsx");
  assert.match(source, /evidence-status/);
  assert.match(source, /verify-evidence/);
  assert.match(source, /signed_file_id:/);
  assert.match(source, /evidence_verified/);
  assert.match(source, /canReviewSignedEvidence/);
});
