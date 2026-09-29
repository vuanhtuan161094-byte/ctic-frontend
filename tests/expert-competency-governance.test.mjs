import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('competency workflow labels and self-service boundary are explicit', () => {
  const source = read('app/components/ExpertsScreen.tsx');
  for (const [status, label] of Object.entries({ DRAFT: 'Dự thảo', PENDING_APPROVAL: 'Chờ phê duyệt', RETURNED: 'Cần bổ sung', APPROVED: 'Đã phê duyệt', SUSPENDED: 'Tạm đình chỉ' })) {
    assert.ok(source.includes(status + ': "' + label + '"'));
  }
  const own = source.slice(source.indexOf('function OwnCompetenciesWorkspace'), source.indexOf('export function ExpertsScreen'));
  assert.match(own, /\/expert-competencies\/me/);
  assert.doesNotMatch(own, /\/approve|\/suspend|\/reactivate|\/renew/);
  assert.match(own, /\["DRAFT", "RETURNED"\]/);
  assert.match(own, /action_records\[0\]\?\.reason/);
  assert.match(source, /canManage && normalize\(record.approval_status\) === "PENDING_APPROVAL"/);
  assert.match(source, /returnCompetency\(record.id\)/);
});

test('self-service reuses the experts route from the account menu', () => {
  const shell = read('app/components/DashboardShell.tsx');
  const navigation = read('app/lib/app-navigation.ts');
  assert.match(shell, /label: "Năng lực của tôi"/);
  assert.match(shell, /<ExpertsScreen roles=\{session.user.roles\} selfService/);
  assert.match(navigation, /\/resources\/experts\?view=me/);
});

test('admin sidebar exposes the existing expert workspace next to scheduling', () => {
  const shell = read('app/components/DashboardShell.tsx');
  const navigation = read('app/lib/app-navigation.ts');
  const entry = 'if (hasRole("ADMIN") && hasPermission("experts.read")) operations.push({ key: "experts", icon: <TeamOutlined />, label: "Chuyên gia & năng lực" });';
  assert.ok(shell.includes(entry));
  assert.ok(shell.indexOf(entry) > shell.indexOf('operations.push({ key: "schedule-resources"'));
  assert.ok(shell.indexOf(entry) < shell.indexOf('operations.push({ key: "documents"'));
  assert.equal(shell.split('operations.push({ key: "experts"').length - 1, 1);
  assert.match(navigation, /experts: "\/resources\/experts"/);
  assert.match(shell, /<ExpertsScreen roles=\{session.user.roles\} currentUserId=\{session.user.id\}/);
});

test('expert competency screen exposes governance detail with evidence review and decision history', () => {
  const source = read('app/components/ExpertsScreen.tsx');
  assert.match(source, /expert-competency-governance/);
  assert.match(source, /\/expert-competencies\/\$\{selectedCompetencyId\}/);
  assert.match(source, /Bằng chứng/);
  assert.match(source, /Đánh giá năng lực/);
  assert.match(source, /Lịch sử quyết định/);
});

test('competency evidence uses structured record plus secure DocumentFile attachment pipeline', () => {
  const source = read('app/components/ExpertsScreen.tsx');
  assert.match(source, /\/expert-competencies\/\$\{selectedCompetencyId\}\/evidence/);
  assert.match(source, /formData\.append\("entity_type", "expert_competency_evidence"\)/);
  assert.match(source, /formData\.append\("document_type", "competency_evidence"\)/);
  assert.match(source, /\/document-files\/upload/);
  assert.match(source, /openDocumentFile/);
});

test('periodic competency review defaults the next review to twelve months and supports lifecycle actions', () => {
  const source = read('app/components/ExpertsScreen.tsx');
  assert.match(source, /dayjs\(\)\.add\(12, "month"\)/);
  assert.match(source, /\/reviews`/);
  assert.match(source, /\/renew`/);
  assert.match(source, /\/reactivate`/);
});

test('evidence void and competency suspension require explicit reasons instead of destructive deletion or hard-coded reason', () => {
  const source = read('app/components/ExpertsScreen.tsx');
  assert.match(source, /competencyVoidEvidenceForm/);
  assert.match(source, /Vô hiệu bằng chứng năng lực/);
  assert.match(source, /Nhập lý do vô hiệu/);
  assert.match(source, /competencySuspendForm/);
  assert.match(source, /Lý do đình chỉ/);
  assert.doesNotMatch(source, /Tạm đình chỉ theo quyết định quản lý năng lực/);
});

test('expert overview surfaces competency expiry review overdue and evidence gap governance signals', () => {
  const source = read('app/components/ExpertsScreen.tsx');
  assert.match(source, /Năng lực đã hết hiệu lực/);
  assert.match(source, /Đánh giá năng lực quá hạn/);
  assert.match(source, /Thiếu bằng chứng năng lực/);
  assert.match(source, /management_action_required/);
});

test('renewal and reactivation UI respect review governance blockers', () => {
  const source = read('app/components/ExpertsScreen.tsx');
  assert.match(source, /!selectedCompetency\.governance\.latest_review/);
  assert.match(source, /normalize\(selectedCompetency\.governance\.review_status\) === "OVERDUE"/);
  assert.match(source, /selectedCompetency\.governance\.requires_management_action/);
  assert.match(source, /Cần có đánh giá năng lực phù hợp trước khi khôi phục/);
});

test('compact competency entry uses canonical multi-IAF and subject identity', () => {
  const source = read('app/components/ExpertsScreen.tsx');
  assert.match(source, /\/expert-competencies\/batch/);
  assert.match(source, /\/expert-competencies\/me\/batch/);
  assert.match(source, /\/industry-classifications\/iaf-scopes\?active=true/);
  assert.match(source, /mode="multiple"/);
  assert.match(source, /optionFilterProp="label"/);
  assert.doesNotMatch(source, /Vai trò bổ sung/);
  assert.match(source, /competencyRoleOptions.slice\(0, 2\)/);
  assert.doesNotMatch(source, /<Form.Item[^>]*label="(?:Mức năng lực|Cấp mã lĩnh vực|Mã NACE)"/);
  assert.match(source, /selectedExpert.account\?\.id !== currentUserId/);
  assert.doesNotMatch(source, /submitter !== currentUserId/);
  assert.equal(source.slice(source.indexOf('<div className="expert-kpi-grid">'), source.indexOf('<Card className="expert-list-card"')).match(/<Statistic/g).length, 4);
});

test('own evidence attachments use dedicated endpoints and editable-state guard', () => {
  const source = read('app/components/ExpertsScreen.tsx');
  const own = source.slice(source.indexOf('function OwnEvidenceFiles'), source.indexOf('function OwnCompetenciesWorkspace'));
  assert.match(own, /\/document-files\/self\/competency-evidence/);
  assert.match(own, /\/document-files\/self\/competency-files/);
  assert.doesNotMatch(own, /\/document-files\/upload/);
  assert.match(own, /editable && evidence.status === 'ACTIVE'/);
});
