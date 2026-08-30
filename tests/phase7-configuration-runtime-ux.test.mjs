import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const panel = fs.readFileSync(path.join(root, 'app/components/MasterDataConfigurationPanel.tsx'), 'utf8');

test('configuration shows a readiness dashboard instead of forcing users to guess missing setup', () => {
  assert.match(panel, /Kiểm tra sẵn sàng cấu hình/);
  assert.match(panel, /configuration-readiness/);
  assert.match(panel, /Chương trình & quy tắc/);
  assert.match(panel, /ISIC \/ NACE \/ IAF/);
});

test('scheme configuration has live impact preview before save', () => {
  assert.match(panel, /Xem trước tác động trước khi lưu/);
  assert.match(panel, /Các giá trị hiện tại không có mâu thuẫn logic cơ bản/);
  assert.match(panel, /configPreviewWarnings/);
});

test('cross-field validation explains incompatible cycle values', () => {
  assert.match(panel, /Khoảng giám sát không được dài hơn chu kỳ chứng nhận/);
  assert.match(panel, /Thời hạn chứng chỉ không được dài hơn chu kỳ chứng nhận/);
  assert.match(panel, /Có áp dụng Giai đoạn 1 thì phải chọn đánh giá Giai đoạn 1/);
});

test('admin configuration is direct-apply without a fake approval workflow', () => {
  assert.match(panel, /Lưu & áp dụng/);
  assert.match(panel, /Admin cấu hình và áp dụng trực tiếp/);
  assert.match(panel, /Không có bước phê duyệt riêng cho cấu hình/);
  assert.match(panel, /Chờ hiệu lực · từ/);
  assert.doesNotMatch(panel, /Đã phê duyệt · chờ hiệu lực/);
});

test('future configuration can be cancelled without deleting history', () => {
  assert.match(panel, /Hủy lịch áp dụng/);
  assert.match(panel, /cancel-scheduled/);
  assert.match(panel, /khôi phục thời hạn của phiên bản trước/);
});

test('runtime impact is described in Vietnamese business language', () => {
  assert.match(panel, /Đang dùng thật/);
  assert.match(panel, /Chỉ chốt theo dự án/);
  assert.doesNotMatch(panel, />Runtime</);
  assert.doesNotMatch(panel, />Snapshot</);
});

test('organization reminder is explained as fallback for old projects', () => {
  assert.match(panel, /mốc nhắc dự phòng/);
  assert.match(panel, /hồ sơ cũ\/chưa có bản chốt cấu hình/);
});


test('audit and decision catalogs are not falsely presented as fully enforced workflow switches', () => {
  assert.match(panel, /Danh mục loại đánh giá của chương trình/);
  assert.match(panel, /việc sinh hồ sơ GS1\/GS2 cụ thể vẫn theo workflow hiện hành/);
  assert.match(panel, /Danh mục loại quyết định của chương trình/);
  assert.match(panel, /Đây không phải danh sách quyền cho phép thao tác/);
  assert.match(panel, /Phiên bản trước:/);
  assert.match(panel, /Phiên bản mới:/);
});
