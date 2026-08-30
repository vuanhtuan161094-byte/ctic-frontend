import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/components/CertificationBodyCapabilitiesPanel.tsx', import.meta.url), 'utf8');

test('capability screen hides help and filters behind collapsible sections', () => {
  assert.match(source, /Hướng dẫn & thống kê chi tiết/);
  assert.match(source, /label: "Bộ lọc"/);
  assert.match(source, /<Collapse/);
});

test('create capability keeps only core selection visible and hides advanced metadata', () => {
  assert.match(source, /Thông tin bổ sung \(ngày hiệu lực, ghi chú\)/);
  assert.match(source, /Chương trình \/ tiêu chuẩn \/ phiên bản/);
  assert.match(source, /Lĩnh vực IAF được cấp năng lực/);
});

test('standard display avoids blindly appending edition twice', () => {
  assert.match(source, /function formatStandardCode/);
  assert.match(source, /normalized\.endsWith\(`:\$\{normalizedEdition\}`\)/);
  assert.doesNotMatch(source, /selectedStandard\.standard_code\}:\$\{selectedStandard\.edition\}/);
});
