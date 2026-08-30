import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const sources = Promise.all([
  readFile(new URL("app/components/CertificationResultWorkspaceModal.tsx", root), "utf8"),
  readFile(new URL("app/components/CertificateIssuanceWorkspaceModal.tsx", root), "utf8"),
  readFile(new URL("app/components/CertificatesScreen.tsx", root), "utf8"),
  readFile(new URL("app/components/CertificationProjectDetailScreen.tsx", root), "utf8"),
]);

test("ACTIVE actions are consumed from backend projection for authorized roles", async () => {
  const [, certificate] = await sources;
  assert.match(certificate, /workspace\.allowed_status_actions\.map/);
  assert.match(certificate, /SUSPEND: "Đình chỉ"/);
  assert.match(certificate, /WITHDRAW: "Thu hồi"/);
  assert.match(certificate, /canManageLifecycle/);
});

test("SUSPENDED projection supports restoration and withdrawal", async () => {
  const [decision, certificate] = await sources;
  assert.match(decision, /RESTORE: "Khôi phục hiệu lực chứng chỉ"/);
  assert.match(certificate, /RESTORE: "Khôi phục hiệu lực"/);
  assert.match(certificate, /Chứng chỉ hiện đang bị đình chỉ/);
});

test("terminal states cannot manufacture lifecycle actions in React", async () => {
  const [, certificate] = await sources;
  assert.doesNotMatch(certificate, /currentCertificate\.status.*SUSPEND/s);
  assert.match(certificate, /workspace\.can_issue_status_decision/);
  assert.match(certificate, /workspace\.allowed_status_actions/);
});

test("all certificate statuses use Vietnamese business labels", async () => {
  const [decision, certificate, list] = await sources;
  for (const label of ["Đang hiệu lực", "Đình chỉ", "Đã thu hồi", "Hết hiệu lực", "Đã được thay thế"]) {
    assert.ok(decision.includes(label) || certificate.includes(label));
    assert.ok(certificate.includes(label) || list.includes(label));
  }
});

test("status actions require their specific reason or restoration basis", async () => {
  const [decision] = await sources;
  assert.match(decision, /Lý do đình chỉ/);
  assert.match(decision, /Căn cứ khôi phục/);
  assert.match(decision, /Lý do thu hồi/);
  assert.match(decision, /isStatusDecision \|\| selectedDecisionResult === "approved"/);
});

test("status actions require an effective date", async () => {
  const [decision] = await sources;
  assert.match(decision, /Ngày hiệu lực đình chỉ/);
  assert.match(decision, /Ngày hiệu lực khôi phục/);
  assert.match(decision, /Ngày hiệu lực thu hồi/);
  assert.match(decision, /isStatusDecision \? \[\{ required: true/);
});

test("approved material transitions use Ant Design confirmation", async () => {
  const [decision] = await sources;
  assert.match(decision, /modal\.confirm\(/);
  assert.match(decision, /Xác nhận đình chỉ hiệu lực chứng chỉ này từ ngày/);
  assert.match(decision, /Sau khi thu hồi, chứng chỉ không thể khôi phục/);
  assert.match(decision, /Xác nhận khôi phục hiệu lực chứng chỉ từ ngày/);
  assert.doesNotMatch(decision, /window\.confirm|globalThis\.confirm/);
});

test("read-only roles do not receive mutation controls", async () => {
  const [, certificate] = await sources;
  assert.match(certificate, /const canManageLifecycle = normalizedRoles\.includes\("decisionmaker"\)/);
  assert.match(certificate, /!canManageLifecycle/);
  assert.doesNotMatch(certificate, /(?:"admin"|"auditor"|"lead.?auditor"|"technical.?reviewer").*canManageLifecycle/i);
});

test("status history renders transition, action, reason, decision, actor, effective date, and timestamp", async () => {
  const [, certificate] = await sources;
  assert.match(certificate, /Lịch sử trạng thái chứng chỉ/);
  for (const field of ["from_status", "to_status", "reason", "effective_date", "decision_number", "decision_type", "changed_by_user", "created_at"]) {
    assert.match(certificate, new RegExp(field));
  }
  assert.match(certificate, /formatDateTime\(item\.created_at\)/);
});

test("certificate workspace launches the existing decision workspace", async () => {
  const [, certificate, , project] = await sources;
  assert.match(certificate, /onStartStatusDecision/);
  assert.match(project, /preferredDecisionType/);
  assert.match(project, /focus: "decision"/);
  assert.match(project, /CertificationResultWorkspaceModal/);
});

test("status action never calls certificate issuance or PDF APIs", async () => {
  const [decision] = await sources;
  assert.match(decision, /api\.post<DecisionRecord>\("\/certification-decisions"/);
  assert.doesNotMatch(decision, /api\.post<CertificateRecord>\("\/certificates"/);
  assert.doesNotMatch(decision, /\/pdf`/);
});

test("status consequence says version PDF and verification code remain unchanged", async () => {
  const [decision] = await sources;
  assert.match(decision, /Phiên bản, PDF và mã xác minh không thay đổi/);
  assert.match(decision, /Không phát hành phiên bản mới/);
});

test("main Certificates screen is read-focused and has no raw status PATCH", async () => {
  const [, , list] = await sources;
  assert.doesNotMatch(list, /api\.patch<CertificateRecord>/);
  assert.doesNotMatch(list, /Quản lý trạng thái/);
  assert.match(list, /Chi tiết chứng chỉ/);
});

test("withdrawn and suspended certificates remain visible with their true status", async () => {
  const [, , list] = await sources;
  assert.match(list, /suspended: "Đình chỉ"/);
  assert.match(list, /withdrawn: "Đã thu hồi"/);
  assert.match(list, /CertificateStatusTag/);
});
