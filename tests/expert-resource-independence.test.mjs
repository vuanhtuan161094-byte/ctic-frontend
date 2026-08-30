import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('expert workspace integrates resource governance without replacing the existing Expert module', () => {
  const experts = read('app/components/ExpertsScreen.tsx');
  assert.match(experts, /ExpertResourceGovernancePanel/);
  assert.match(experts, /Nguồn lực & độc lập/);
  assert.match(experts, /ExpertDevelopmentPanel/);
});

test('availability UI supports unavailable leave other commitment create cancel and history', () => {
  const source = read('app/components/ExpertResourceGovernancePanel.tsx');
  assert.match(source, /UNAVAILABLE/);
  assert.match(source, /LEAVE/);
  assert.match(source, /OTHER_COMMITMENT/);
  assert.match(source, /\/experts\/\$\{expertId\}\/availability/);
  assert.match(source, /availability\/\$\{id\}\/cancel/);
  assert.match(source, /Lịch sử resource & independence/);
});

test('independence UI separates conflict declaration from reviewed decision', () => {
  const source = read('app/components/ExpertResourceGovernancePanel.tsx');
  assert.match(source, /Conflict declaration và independence decision/);
  assert.match(source, /CLEARED/);
  assert.match(source, /RESTRICTED/);
  assert.match(source, /PROHIBITED/);
  assert.match(source, /conflicts\/\$\{reviewTarget\?\.id\}\/review/);
  assert.match(source, /mitigation_justification/);
});

test('resource overview projects real assignment MD without a made-up threshold', () => {
  const source = read('app/components/ExpertResourceGovernancePanel.tsx');
  assert.match(source, /assigned_mandays/);
  assert.match(source, /engagement_count/);
  assert.match(source, /occupied_days/);
  assert.match(source, /Capacity được tính từ assignment thực tế/);
  assert.match(source, /chưa cấu hình ngưỡng MD toàn cục/);
});

test('recommendation UI renders structured eligibility codes and admin-only mutation controls', () => {
  const experts = read('app/components/ExpertsScreen.tsx');
  const resource = read('app/components/ExpertResourceGovernancePanel.tsx');
  assert.match(experts, /eligibility_reasons/);
  assert.match(experts, /INDEPENDENCE_CONFLICT/);
  assert.match(experts, /COMPETENCY_NOT_ELIGIBLE/);
  assert.match(experts, /record\.eligible \? "Có thể phân công" : "Không thể phân công"/);
  assert.match(resource, /canManage \? <Button/);
  assert.match(resource, /Khai báo conflict/);
});
