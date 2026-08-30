import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const decisionUrl = new URL("app/components/CertificationResultWorkspaceModal.tsx", root);
const certificateUrl = new URL("app/components/CertificateIssuanceWorkspaceModal.tsx", root);
const listUrl = new URL("app/components/CertificatesScreen.tsx", root);
const projectUrl = new URL("app/components/CertificationProjectDetailScreen.tsx", root);

const sources = Promise.all([
  readFile(decisionUrl, "utf8"),
  readFile(certificateUrl, "utf8"),
  readFile(listUrl, "utf8"),
  readFile(projectUrl, "utf8"),
]);

test("initial certification consumes backend allowed types and labels GRANT professionally", async () => {
  const [decision] = await sources;
  assert.match(decision, /allowed_decision_types/);
  assert.match(decision, /GRANT: "Cấp chứng nhận"/);
});

test("decision workspace covers the full Phase 1 lifecycle vocabulary", async () => {
  const [decision] = await sources;
  for (const type of ["MAINTAIN", "RECERTIFY", "AMEND", "EXTEND_SCOPE", "REDUCE_SCOPE", "SUSPEND", "RESTORE", "WITHDRAW"]) {
    assert.match(decision, new RegExp(`${type}:`));
  }
  assert.match(decision, /RECERTIFY: "Tái chứng nhận"/);
});

test("decision type and result are separate form fields", async () => {
  const [decision] = await sources;
  assert.match(decision, /name="decision_type"/);
  assert.match(decision, /name="decision_result"/);
  assert.match(decision, /Chấp thuận/);
  assert.match(decision, /Không chấp thuận/);
});

test("MAINTAIN consequence explicitly requires no reissue", async () => {
  const [decision, certificate] = await sources;
  assert.match(decision, /Không phát hành phiên bản mới/);
  assert.match(certificate, /maintains_current_certificate/);
  assert.match(certificate, /không yêu cầu phát hành lại/);
});

test("MAINTAIN workspace has no certificate create branch", async () => {
  const [, certificate] = await sources;
  assert.match(certificate, /requires_certificate_issuance && !certificate/);
  assert.match(certificate, /workspace\.maintains_current_certificate/);
});

test("GRANT approved exposes controlled first issuance", async () => {
  const [decision, certificate] = await sources;
  assert.match(decision, /cho phép phát hành chứng chỉ lần đầu/);
  assert.match(certificate, /Phát hành chứng chỉ/);
  assert.match(certificate, /không.*tự động|chỉ được tạo sau khi người có thẩm quyền/i);
});

test("AMEND requires and forwards a change reason", async () => {
  const [decision, certificate] = await sources;
  assert.match(decision, /: "Lý do thay đổi"/);
  assert.match(decision, /change_reason: values\.change_reason/);
  assert.match(certificate, /change_reason: values\.change_reason/);
});

test("EXTEND_SCOPE compares current and proposed certified scope", async () => {
  const [decision, certificate] = await sources;
  assert.match(decision, /Phạm vi hiện hành/);
  assert.match(decision, /Phạm vi đề xuất/);
  assert.match(certificate, /currentCertificate\.certification_scope/);
});

test("REDUCE_SCOPE uses the same explicit scope comparison", async () => {
  const [decision] = await sources;
  assert.match(decision, /selectedDecisionType === "REDUCE_SCOPE"/);
  assert.match(decision, /Đối chiếu phạm vi/);
});

test("new certificate versions are represented in a series timeline", async () => {
  const [, certificate] = await sources;
  assert.match(certificate, /version_timeline\.map/);
  assert.match(certificate, /Phiên bản hiện hành/);
  assert.match(certificate, /Đã được thay thế/);
});

test("historical certificate detail is read-only", async () => {
  const [, certificate] = await sources;
  assert.match(certificate, /Chi tiết bất biến/);
  assert.match(certificate, /snapshot tại thời điểm phát hành và chỉ được xem/);
  assert.doesNotMatch(certificate, /setFieldValue\("organization_name"/);
});

test("historical detail renders certificate snapshots instead of live customer data", async () => {
  const [, certificate] = await sources;
  for (const field of ["organization_name", "organization_address", "management_system", "standard_name", "certification_scope", "site_snapshot_json"]) {
    assert.match(certificate, new RegExp(`selectedVersion\\.${field}`));
  }
});

test("timeline keeps PDF availability and document ownership per version", async () => {
  const [, certificate] = await sources;
  assert.match(certificate, /version\.official_pdf_available/);
  assert.match(certificate, /version\.documents\[0\]/);
  assert.match(certificate, /Mở PDF phiên bản này/);
});

test("certificate list prefers immutable snapshot fields and shows version", async () => {
  const [, , list] = await sources;
  assert.match(list, /certificate\.organization_name/);
  assert.match(list, /certificate\.standard_name/);
  assert.match(list, /title: "Phiên bản"/);
});

test("lifecycle execution remains in the dossier and mutation controls stay role-aware", async () => {
  const [decision, certificate, , project] = await sources;
  assert.match(project, /CertificateIssuanceWorkspaceModal/);
  assert.match(project, /CertificationResultWorkspaceModal/);
  assert.match(project, /"Mở chứng chỉ"/);
  assert.match(decision, /!canDecision/);
  assert.match(certificate, /!workspace\.can_issue_certificate \|\| !canIssue/);
});
