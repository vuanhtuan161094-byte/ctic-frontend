import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/components/CertificationBodyCapabilitiesPanel.tsx', import.meta.url), 'utf8');

test('capability screen keeps secondary filters and help collapsible', () => {
  assert.match(source, /label: "Bộ lọc nâng cao"/);
  assert.match(source, /label: "Cách đọc ma trận năng lực"/);
  assert.match(source, /<Collapse/);
});

test('capability overview is compact rather than six independent statistic cards', () => {
  for (const label of ['Năng lực hiệu lực', 'Phiên bản tiêu chuẩn', 'IAF đang bao phủ', 'Cần rà soát']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /capability-overview/);
  assert.doesNotMatch(source, /<Statistic/);
});

test('create capability keeps core selection visible and required effective fields mounted', () => {
  assert.match(source, /label: "Hiệu lực & ghi chú"/);
  assert.match(source, /forceRender: true/);
  assert.match(source, /Chương trình \/ tiêu chuẩn \/ phiên bản/);
  assert.match(source, /Lĩnh vực IAF được cấp năng lực/);
});

test('capability modal initializes required defaults only after the form is mounted', () => {
  assert.match(source, /afterOpenChange=\{\(open\) => \{/);
  assert.match(source, /status: "ACTIVE"/);
  assert.match(source, /effective_from: dayjs\(\)\.startOf\("day"\)/);
  assert.match(source, /iaf_scope_ids: \[\]/);
  assert.match(source, /Thiếu trạng thái hoặc ngày bắt đầu hiệu lực/);
});

test('edit capability also hydrates date fields after modal mount', () => {
  assert.match(source, /if \(!open \|\| !editing\) return;/);
  assert.match(source, /effective_from: dayjs\(editing\.effective_from\)/);
});

test('standard display avoids blindly appending edition twice', () => {
  assert.match(source, /function formatStandardCode/);
  assert.match(source, /normalized\.endsWith\(\x60:\$\{normalizedEdition\}\x60\)/);
  assert.doesNotMatch(source, /selectedStandard\.standard_code\}:\$\{selectedStandard\.edition\}/);
});
