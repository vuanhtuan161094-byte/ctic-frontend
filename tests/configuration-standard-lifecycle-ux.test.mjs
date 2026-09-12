import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../app/components/CertificationProgramsPanel.tsx', import.meta.url), 'utf8');

test('future standard editions derive waiting-for-effect from the effective date', () => {
  assert.match(source, /function isWaitingStandard/);
  assert.match(source, /Chờ hiệu lực/);
  assert.match(source, /dayjs\(row\.effective_from\).*isAfter/);
  assert.match(source, /Ngày áp dụng ở tương lai sẽ tự hiển thị/);
});

test('standard editions can be edited through the existing PATCH API', () => {
  assert.match(source, /editingStandard/);
  assert.match(source, /api\.patch\(`\$\{base\}\/standards\/\$\{editingStandard\.id\}`/);
  assert.match(source, /Sửa phiên bản/);
  assert.match(source, /Đã cập nhật phiên bản tiêu chuẩn/);
});

test('stopped editions have a real restore action instead of a dead-end state', () => {
  assert.match(source, /api\.post\(`\$\{base\}\/standards\/\$\{row\.id\}\/restore`\)/);
  assert.match(source, /label: "Khôi phục áp dụng"/);
  assert.match(source, /Khôi phục \{standardEditionLabel\(restoreCandidate\)\}/);
  assert.match(source, /Đã khôi phục áp dụng phiên bản tiêu chuẩn/);
});

test('currently applied editions use the explicit lifecycle stop command', () => {
  assert.match(source, /api\.post\(`\$\{base\}\/standards\/\$\{row\.id\}\/stop`\)/);
  assert.match(source, /label: "Ngừng áp dụng"/);
  assert.match(source, /Dữ liệu lịch sử vẫn được giữ nguyên/);
  assert.doesNotMatch(source, /status: "WITHDRAWN"/);
  assert.doesNotMatch(source, /Thu hồi/);
  assert.doesNotMatch(source, /Hủy lịch áp dụng/);
});

test('unused mistaken editions have an explicit delete path guarded by the backend', () => {
  assert.match(source, /api\.delete\(`\$\{base\}\/standards\/\$\{row\.id\}`\)/);
  assert.match(source, /Xóa nếu chưa sử dụng/);
  assert.match(source, /Chỉ phiên bản chưa được sử dụng mới có thể xóa/);
  assert.match(source, /hệ thống sẽ chặn để bảo vệ lịch sử/);
});

test('program status and readiness remain separate user-facing concepts', () => {
  assert.match(source, /Đang sử dụng/);
  assert.match(source, /Ngừng sử dụng/);
  assert.match(source, /Sẵn sàng/);
  assert.match(source, /Cần thiết lập/);
});

test('rule package setup is actionable from the affected program', () => {
  assert.match(source, /scheme-configurations/);
  assert.match(source, /Thiết lập quy tắc/);
  assert.match(source, /Quy tắc chứng nhận/);
  assert.match(source, /Tạo phiên bản mới/);
});

test('standard edition labels normalize a year already entered in the standard code', () => {
  assert.match(source, /function normalizeStandardCode/);
  assert.match(source, /standard_code: standardCode/);
  assert.match(source, /standardEditionLabel\(standard\)/);
});
