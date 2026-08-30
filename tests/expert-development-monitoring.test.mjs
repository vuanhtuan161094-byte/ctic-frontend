import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('expert profile exposes a dedicated training and monitoring workspace', () => {
  const experts = read('app/components/ExpertsScreen.tsx');
  assert.match(experts, /ExpertDevelopmentPanel/);
  assert.match(experts, /Đào tạo & giám sát/);
});

test('development workspace exposes P.08 training records and effectiveness evaluation', () => {
  const source = read('app/components/ExpertDevelopmentPanel.tsx');
  assert.match(source, /\/experts\/\$\{expertId\}\/trainings/);
  assert.match(source, /Đánh giá hiệu quả sau đào tạo/);
  assert.match(source, /PRESENTATION/);
  assert.match(source, /INTERVIEW/);
  assert.match(source, /OBSERVATION/);
});

test('monitoring workspace implements F.12 planned and unscheduled monitoring lifecycle', () => {
  const source = read('app/components/ExpertDevelopmentPanel.tsx');
  assert.match(source, /F\.12-P\.08/);
  assert.match(source, /SCHEDULED/);
  assert.match(source, /UNSCHEDULED/);
  assert.match(source, /\/monitoring`/);
  assert.match(source, /\/monitoring\/\$\{monitoringCompleteId\}\/complete/);
  assert.match(source, /monitoring\/\$\{cancelTarget\.id\}\/cancel/);
});

test('witness completion implements F.09 4-1-N assessment criteria', () => {
  const source = read('app/components/ExpertDevelopmentPanel.tsx');
  assert.match(source, /F\.09/);
  assert.match(source, /Rất tốt → Kém/);
  assert.match(source, /\["4", "3", "2", "1", "N"\]/);
  assert.match(source, /không áp dụng/i);
  assert.match(source, /witness_items/);
});

test('P.08 monitoring coverage surfaces witness report review feedback and EMS-specific signals', () => {
  const source = read('app/components/ExpertDevelopmentPanel.tsx');
  assert.match(source, /Chu kỳ witness/);
  assert.match(source, /Review báo cáo 12 tháng/);
  assert.match(source, /Feedback KH\/thị trường 12 tháng/);
  assert.match(source, /EMS witness \+ feedback/);
});

test('training and monitoring evidence use the secure DocumentFile pipeline', () => {
  const source = read('app/components/ExpertDevelopmentPanel.tsx');
  assert.match(source, /expert_training_record/);
  assert.match(source, /expert_monitoring_record/);
  assert.match(source, /\/document-files\/upload/);
  assert.match(source, /openDocumentFile/);
});

test('unsatisfactory monitoring is a management signal and never an automatic competency suspension', () => {
  const source = read('app/components/ExpertDevelopmentPanel.tsx');
  assert.match(source, /management_action_required/);
  assert.match(source, /Hệ thống không tự đình chỉ competency/i);
});
