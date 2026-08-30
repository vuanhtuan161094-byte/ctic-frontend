import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../app/components/MasterDataConfigurationPanel.tsx', import.meta.url), 'utf8');

test('future standard editions are shown as waiting for effect instead of active', () => {
  assert.match(source, /function StandardLifecycleStatus/);
  assert.match(source, /Chờ hiệu lực · từ/);
  assert.match(source, /dayjs\(row\.effective_from\)\.isAfter\(dayjs\(\)\)/);
});

test('standard editions can be edited through the existing PATCH API', () => {
  assert.match(source, /editingStandard/);
  assert.match(source, /api\.patch\(`\$\{base\}\/standards\/\$\{editingStandard\.id\}`/);
  assert.match(source, /Sửa thông tin/);
  assert.match(source, /Lưu thay đổi/);
});

test('scheduled editions can be cancelled without deleting history', () => {
  assert.match(source, /Hủy lịch áp dụng/);
  assert.match(source, /status: "INACTIVE"/);
  assert.match(source, /Không xóa dữ liệu lịch sử/);
});

test('active editions can be withdrawn explicitly', () => {
  assert.match(source, /Ngừng hiệu lực/);
  assert.match(source, /status: "WITHDRAWN"/);
  assert.match(source, /withdrawn_at: dayjs\(\)\.format\("YYYY-MM-DD"\)/);
});

test('program and edition UI is visually compact and action-oriented', () => {
  assert.match(source, /repeat\(auto-fit, minmax\(170px, 1fr\)\)/);
  assert.match(source, /MoreOutlined/);
  assert.match(source, /Dropdown/);
  assert.match(source, /background: "#fafcff"/);
});

test('standard edition labels normalize a year already entered in the standard code', () => {
  assert.match(source, /function normalizeStandardCode/);
  assert.match(source, /standard_code: normalizeStandardCode\(row\.standard_code, row\.edition\)/);
  assert.match(source, /const code = normalizeStandardCode\(standardForm\.getFieldValue\("standard_code"\), standardForm\.getFieldValue\("edition"\)\)/);
});
