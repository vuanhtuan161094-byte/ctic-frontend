import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const panel = fs.readFileSync(new URL('../app/components/ControlledDocumentPanel.tsx', import.meta.url), 'utf8');
const preview = fs.readFileSync(new URL('../app/components/DocumentPreviewModal.tsx', import.meta.url), 'utf8');
const ooxml = fs.readFileSync(new URL('../app/lib/ooxml-preview.ts', import.meta.url), 'utf8');
const documents = fs.readFileSync(new URL('../app/components/DocumentsScreen.tsx', import.meta.url), 'utf8');

test('internal documents distinguish baseline import from new controlled documents', () => {
  assert.match(panel, /Nhập tài liệu đang áp dụng/);
  assert.match(panel, /Soạn tài liệu mới/);
  assert.match(panel, /libraryCreateMode/);
  assert.match(panel, /import-effective/);
});

test('templates distinguish baseline import from new templates', () => {
  assert.match(panel, /Nhập mẫu đang dùng/);
  assert.match(panel, /Tạo mẫu mới/);
  assert.match(panel, /templateCreateMode/);
  assert.match(panel, /Mẫu đã được phê duyệt trước khi đưa vào CMP/);
});

test('approval and publishing are one visible action', () => {
  assert.match(panel, /Phê duyệt & ban hành/);
  assert.match(panel, /Phê duyệt & đưa vào sử dụng/);
});

test('preview and download are separate actions', () => {
  assert.match(panel, /DocumentPreviewModal/);
  assert.match(panel, /downloadDocumentFile/);
  assert.match(panel, />Xem mẫu</);
  assert.match(panel, />Tải</);
  assert.match(documents, /DocumentPreviewModal/);
});

test('Word and Excel use in-app OOXML quick preview', () => {
  assert.match(ooxml, /word\/document\.xml/);
  assert.match(ooxml, /xl\/workbook\.xml/);
  assert.match(ooxml, /sharedStrings\.xml/);
  assert.match(preview, /Bản xem nhanh Word/);
  assert.match(preview, /Bản xem nhanh Excel/);
  assert.match(preview, /Tải file gốc/);
});
