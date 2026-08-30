import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

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
