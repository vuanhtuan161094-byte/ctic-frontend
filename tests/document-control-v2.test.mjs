import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/components/ControlledDocumentPanel.tsx', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('../app/components/DashboardShell.tsx', import.meta.url), 'utf8');
const documents = fs.readFileSync(new URL('../app/components/DocumentsScreen.tsx', import.meta.url), 'utf8');

test('Document Control V2 exposes four clear Vietnamese areas', () => {
  for (const label of ['Tài liệu nội bộ', 'Tài liệu bên ngoài', 'Mẫu biểu tự động', 'Hồ sơ đã tạo']) {
    assert.ok(source.includes(label), label);
  }
});

test('external document UX does not add impact-assessment automation', () => {
  assert.ok(!source.toLowerCase().includes('impact assessment'));
  assert.ok(!source.includes('Đánh giá tác động'));
});

test('template manager hides technical jargon from the main workflow but keeps Word/Excel field catalog', () => {
  assert.ok(source.includes('{{${field.token}}}'));
  assert.ok(source.includes('Trường dữ liệu tự động'));
  assert.ok(source.includes('Kiểm tra trường dữ liệu'));
  assert.ok(source.includes('.docx,.xlsx'));
  assert.ok(source.includes('Mã chèn vào Word/Excel'));
});

test('template manager supports real-data generation with searchable context', () => {
  assert.ok(source.includes('/document-control/v2/template-contexts'));
  assert.ok(source.includes('Sinh hồ sơ'));
  assert.ok(source.includes('Xem trước dữ liệu sẽ điền vào mẫu'));
  assert.ok(source.includes('/preview-data'));
  assert.ok(source.includes('Hồ sơ chứng nhận'));
  assert.ok(source.includes('Đơn đăng ký'));
  assert.ok(source.includes('Kế hoạch đánh giá'));
  assert.ok(source.includes('Chứng chỉ'));
});

test('library lifecycle exposes simple create-update-cancel actions', () => {
  assert.ok(source.includes('Cập nhật'));
  assert.ok(source.includes('Hủy bỏ'));
  assert.ok(source.includes('Xác nhận nội dung'));
  assert.ok(source.includes('Phê duyệt'));
  assert.ok(source.includes('Ban hành'));
  assert.ok(source.includes('Lưu & đưa vào sử dụng'));
});

test('create and update forms include the file in the same action', () => {
  assert.ok(source.includes('Chọn tệp tài liệu trước khi lưu'));
  assert.ok(source.includes('Chọn tệp phiên bản mới trước khi lưu'));
  assert.ok(source.includes('Chọn file Word/Excel trước khi tạo mẫu'));
  assert.ok(source.includes('Lưu bản cập nhật'));
});

test('technical secondary file catalog is collapsed outside the main document workflow', () => {
  assert.ok(documents.includes('Kho tệp nghiệp vụ khác'));
  assert.ok(documents.includes('Khu vực tra cứu phụ'));
  assert.ok(documents.includes('<Collapse'));
});


test('main navigation names the module Tài liệu & Mẫu biểu and recognizes generated Excel', () => {
  assert.ok(shell.includes('label: "Tài liệu & Mẫu biểu"'));
  assert.ok(documents.includes('<Title level={2}>Tài liệu & Mẫu biểu</Title>'));
  assert.ok(documents.includes('generated_xlsx: "Excel hệ thống"'));
});
