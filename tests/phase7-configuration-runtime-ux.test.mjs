import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const panel = fs.readFileSync(path.join(root, 'app/components/MasterDataConfigurationPanel.tsx'), 'utf8');
const programs = fs.readFileSync(path.join(root, 'app/components/CertificationProgramsPanel.tsx'), 'utf8');

test('configuration keeps source-backed readiness instead of guessing from visual counts', () => {
  assert.match(panel, /configuration-readiness/);
  assert.match(panel, /readiness\.data/);
});

test('scheme configuration keeps live impact preview and cross-field validation', () => {
  assert.match(panel, /Xem trước tác động trước khi lưu/);
  assert.match(panel, /configPreviewWarnings/);
  assert.match(panel, /Khoảng giám sát không được dài hơn chu kỳ chứng nhận/);
  assert.match(panel, /Thời hạn chứng chỉ không được dài hơn chu kỳ chứng nhận/);
});

test('admin configuration is direct-apply without a fake approval workflow', () => {
  assert.match(panel, /Lưu & áp dụng/);
  assert.match(panel, /Admin cấu hình và áp dụng trực tiếp/);
  assert.match(panel, /Không có bước phê duyệt riêng cho cấu hình/);
  assert.doesNotMatch(panel, /Đã phê duyệt · chờ hiệu lực/);
});

test('future configuration can be cancelled without deleting history', () => {
  assert.match(panel, /Hủy lịch áp dụng/);
  assert.match(panel, /cancel-scheduled/);
  assert.match(panel, /khôi phục thời hạn của phiên bản trước/);
});

test('program screen preserves versioned rule history instead of editing an applied rule in place', () => {
  assert.match(programs, /Tạo phiên bản mới/);
  assert.match(programs, /Phiên bản mới chỉ áp dụng từ ngày hiệu lực/);
  assert.match(programs, /không thay đổi lịch sử hồ sơ đã chốt/);
});

test('organization reminder remains a fallback for old or unsnapshotted records', () => {
  assert.match(panel, /Dùng cho hồ sơ cũ hoặc hồ sơ chưa có quy tắc chương trình đã chốt/);
});

test('audit and decision catalogs are not falsely presented as fully enforced permission switches', () => {
  assert.match(panel, /Danh mục loại đánh giá của chương trình/);
  assert.match(panel, /việc sinh hồ sơ GS1\/GS2 cụ thể vẫn theo workflow hiện hành/);
  assert.match(panel, /Danh mục loại quyết định của chương trình/);
  assert.match(panel, /Đây không phải danh sách quyền cho phép thao tác/);
});
