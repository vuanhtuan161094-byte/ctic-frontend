import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const shell = read('app/components/DashboardShell.tsx');
const project = read('app/components/CertificationProjectDetailScreen.tsx');
const schedule = read('app/components/ScheduleResourcesScreen.tsx');
const cases = read('app/components/GovernanceCasesScreen.tsx');
const documents = read('app/components/ControlledDocumentPanel.tsx');
const admin = read('app/components/SystemGovernancePanel.tsx');
const cockpit = read('app/components/ManagementCockpitScreen.tsx');

test('feature freeze keeps Product Certification disabled', () => {
  assert.match(shell, /value: "products"[\s\S]*disabled: true/);
});

test('feature freeze keeps Validation Verification disabled', () => {
  assert.match(shell, /value: "validation"[\s\S]*disabled: true/);
});

test('core operations navigation remains available', () => {
  for (const label of ['Khách hàng', 'Đơn đăng ký', 'Hồ sơ chứng nhận', 'Lịch & nguồn lực', 'Chứng chỉ', 'Tài liệu', 'Chuyên gia & năng lực']) {
    assert.ok(shell.includes(label), `missing ${label}`);
  }
});

test('customer portal remains separated from internal administration', () => {
  assert.ok(shell.includes('Cổng khách hàng'));
  assert.ok(shell.includes('Quản trị hệ thống'));
  assert.ok(shell.includes('customerPortalMode'));
});

test('project workspace preserves decision before notification flow', () => {
  assert.ok(project.includes('MAKE_DECISION'));
  assert.ok(project.includes('NOTIFY_RESULT'));
});

test('schedule workspace exposes readiness instead of blind issue', () => {
  assert.ok(schedule.includes('readiness') || schedule.includes('Sẵn sàng'));
});

test('governance cases keep change complaint appeal surfaces', () => {
  assert.ok(cases.includes('complaints'));
  assert.ok(cases.includes('appeals'));
  assert.ok(cases.includes('Khiếu nại'));
  assert.ok(cases.includes('Kháng nghị'));
});

test('controlled documents expose historical/read-only semantics', () => {
  assert.ok(documents.includes('không xóa lịch sử'));
  assert.ok(documents.includes('ISSUED'));
  assert.ok(documents.includes('lịch sử phiên bản'));
});

test('management cockpit remains a dedicated management surface', () => {
  assert.ok(cockpit.includes('ManagementCockpitScreen'));
});

test('system governance remains an explicit admin surface', () => {
  assert.ok(admin.includes('SystemGovernancePanel'));
});
