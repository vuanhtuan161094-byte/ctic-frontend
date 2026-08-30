import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const panel = read('app/components/ControlledDocumentPanel.tsx');
const documentsScreen = read('app/components/DocumentsScreen.tsx');

test('document center keeps controlled lifecycle and the general file catalog', () => {
  assert.match(documentsScreen, /ControlledDocumentPanel/);
  assert.match(documentsScreen, /document-files/);
});

test('Document Control V2 separates internal, external, templates and generated records', () => {
  for (const label of ['Tài liệu nội bộ', 'Tài liệu bên ngoài', 'Mẫu biểu tự động', 'Hồ sơ đã tạo']) {
    assert.match(panel, new RegExp(label));
  }
});

test('template registry keeps exact revision lineage and effective state', () => {
  assert.match(panel, /revision_label/);
  assert.match(panel, /EFFECTIVE/);
  assert.match(panel, /SUPERSEDED/);
  assert.match(panel, /versions\.length/);
});

test('generated records keep exact template and document version', () => {
  assert.match(panel, /current_version_no/);
  assert.match(panel, /template_code/);
  assert.match(panel, /template_revision/);
  assert.match(panel, /Phiên bản/);
});

test('files are opened through the secure download endpoint and never direct file_url', () => {
  assert.match(panel, /DocumentPreviewModal/);
  assert.match(panel, /downloadDocumentFile/);
  assert.match(panel, /\/document-files\/\$\{file\.id\}\/download/);
  assert.doesNotMatch(panel, /file_url/);
});

test('file integrity and signed hash binding remain visible', () => {
  assert.match(panel, /signed_sha256/);
  assert.match(panel, /SHA-256 hợp lệ/);
  assert.match(panel, /Hash không khớp/);
});

test('template manager uses internal endpoints and does not expose customer portal', () => {
  assert.match(panel, /\/document-control\/templates/);
  assert.match(panel, /\/document-control\/documents/);
  assert.match(panel, /\/document-control\/v2\/template-fields/);
  assert.doesNotMatch(panel, /customer-portal/);
});
