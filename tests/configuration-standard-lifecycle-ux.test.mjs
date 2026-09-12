import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../app/components/CertificationProgramsPanel.tsx', import.meta.url), 'utf8');

test('future standard editions derive waiting-for-effect from the effective date', () => {
  assert.match(source, /function StandardStatus/);
  assert.match(source, /Chờ hiệu lực ·/);
  assert.match(source, /dayjs\(row\.effective_from\).*isAfter/);
  assert.match(source, /Không cần thêm bước chuyển trạng thái/);
});

test('standard editions can be edited through the existing PATCH API', () => {
  assert.match(source, /editingStandard/);
  assert.match(source, /api\.patch\(`\$\{base\}\/standards\/\$\{editingStandard\.id\}`/);
  assert.match(source, /label: "Sửa"/);
  assert.match(source, /Đã cập nhật phiên bản tiêu chuẩn/);
});

test('stopped editions have a real restore action instead of a dead-end state', () => {
  assert.match(source, /api\.post\(`\$\{base\}\/standards\/\$\{row\.id\}\/restore`\)/);
  assert.match(source, /label: "Khôi phục áp dụng"/);
  assert.match(source, /Khôi phục \{standardEditionLabel\(restoreCandidate\)\}/);
  assert.match(source, /Đã khôi phục áp dụng phiên bản tiêu chuẩn/);
});

test('unused mistaken editions have an explicit delete path guarded by the backend', () => {
  assert.match(source, /api\.delete\(`\$\{base\}\/standards\/\$\{row\.id\}`\)/);
  assert.match(source, /Xóa nếu chưa sử dụng/);
  assert.match(source, /Chỉ phiên bản chưa được sử dụng mới có thể xóa/);
  assert.match(source, /hệ thống sẽ chặn để bảo vệ lịch sử/);
});

test('an edition already being applied can be stopped without delete semantics', () => {
  assert.match(source, /label: "Ngừng áp dụng"/);
  assert.match(source, /status: "WITHDRAWN"/);
  assert.match(source, /Dữ liệu lịch sử vẫn được giữ nguyên/);
  assert.doesNotMatch(source, /Thu hồi/);
  assert.doesNotMatch(source, /Hủy lịch áp dụng/);
});

test('program status and readiness are separate user-facing concepts', () => {
  assert.match(source, /Đang sử dụng/);
  assert.match(source, /Ngừng sử dụng/);
  assert.match(source, /Sẵn sàng/);
  assert.match(source, /Cần thiết lập/);
});

test('the surface keeps readiness compact and removes the global add-version action', () => {
  assert.match(source, /allSchemes\.length} chương trình · \{readyCount} sẵn sàng · \{needsSetupCount} cần thiết lập/);
  assert.doesNotMatch(source, /type="primary" icon=\{<PlusOutlined \/>} disabled=\{!allSchemes\.length}/);
  assert.match(source, /Chưa có phiên bản tiêu chuẩn\./);
});

test('standard edition labels normalize a year already entered in the standard code', () => {
  assert.match(source, /function normalizeStandardCode/);
  assert.match(source, /standard_code: standardCode/);
  assert.match(source, /standardEditionLabel\(standard\)/);
});
