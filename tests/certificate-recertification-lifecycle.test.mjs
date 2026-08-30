import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const sources = Promise.all([
  readFile(new URL("app/components/CertificationResultWorkspaceModal.tsx", root), "utf8"),
  readFile(new URL("app/components/CertificateIssuanceWorkspaceModal.tsx", root), "utf8"),
  readFile(new URL("app/components/CertificatesScreen.tsx", root), "utf8"),
]);

test("recertification consumes backend allowed types and presents RECERTIFY", async () => {
  const [decision] = await sources;
  assert.match(decision, /allowed_decision_types\.map/);
  assert.match(decision, /RECERTIFY: "Tái chứng nhận"/);
  assert.match(decision, /lifecycle_type === "recertification"/);
});

test("initial and surveillance do not receive RECERTIFY from a frontend matrix", async () => {
  const [decision] = await sources;
  assert.doesNotMatch(decision, /is_surveillance[^\n]+RECERTIFY/);
  assert.doesNotMatch(decision, /initial[^\n]+RECERTIFY/i);
  assert.match(decision, /workspace\.allowed_decision_types\.includes\(preferredDecisionType\)/);
});

test("approved RECERTIFY explains and exposes controlled reissuance", async () => {
  const [decision, certificate] = await sources;
  assert.match(decision, /giữ nguyên toàn bộ lịch sử của phiên bản trước/);
  assert.match(certificate, /Phát hành chứng chỉ tái chứng nhận/);
  assert.match(certificate, /requires_certificate_issuance && !certificate/);
});

test("recertification issuance preview compares previous and approved new data", async () => {
  const [, certificate] = await sources;
  for (const field of [
    "previous_version.version_no",
    "previous_version.cert_number",
    "previous_version.expire_date",
    "proposed_version?.issue_date",
    "proposed_version?.expire_date",
    "proposed_version?.site_snapshot_json",
  ]) assert.ok(certificate.includes(field), `missing preview field ${field}`);
  assert.match(certificate, /workspace\.decision\?\.organization_name/);
  assert.match(certificate, /workspace\.decision\?\.standard_name/);
  assert.match(certificate, /workspace\.decision\?\.certification_scope/);
});

test("timeline marks the new version current and prior versions replaced", async () => {
  const [, certificate] = await sources;
  assert.match(certificate, /version\.is_current \? <Tag color="green">Phiên bản hiện hành/);
  assert.match(certificate, /normalize\(version\.status\) === "replaced" \? <Tag>Đã được thay thế/);
  assert.match(certificate, /RECERTIFY: "Tái chứng nhận"/);
});

test("historical recertification snapshots stay read-only and exact-version", async () => {
  const [, certificate] = await sources;
  assert.match(certificate, /Chi tiết bất biến/);
  assert.match(certificate, /selectedVersion\.organization_name/);
  assert.match(certificate, /selectedVersion\.certification_scope/);
  assert.match(certificate, /selectedVersion\.site_snapshot_json/);
  assert.doesNotMatch(certificate, /selectedVersion[\s\S]{0,120}setFieldsValue/);
});

test("withdrawn lineages do not get a frontend recertification override", async () => {
  const [decision] = await sources;
  assert.match(decision, /allowed_decision_types/);
  assert.doesNotMatch(decision, /status.*withdrawn.*RECERTIFY/i);
});

test("recertification actions preserve decision and issuance authorization", async () => {
  const [decision, certificate] = await sources;
  assert.match(decision, /const canDecision = normalizedRoles\.includes\("decisionmaker"\)/);
  assert.match(decision, /disabled=\{!workspace\.can_issue_decision \|\| !canDecision\}/);
  assert.match(decision, /Chỉ người ra quyết định chứng nhận được ban hành/);
  assert.match(certificate, /const canIssue = normalizedRoles\.includes\("decisionmaker"\)/);
  assert.match(certificate, /disabled=\{!workspace\.can_issue_certificate \|\| !canIssue\}/);
  assert.match(certificate, /Chỉ người ra quyết định chứng nhận được cấp chứng chỉ/);
});

test("general list makes current versus historical role explicit", async () => {
  const [, , list] = await sources;
  assert.match(list, /title: "Vai trò phiên bản"/);
  assert.match(list, /<Tag color="blue">Hiện hành<\/Tag>/);
  assert.match(list, /<Tag>Lịch sử<\/Tag>/);
});
