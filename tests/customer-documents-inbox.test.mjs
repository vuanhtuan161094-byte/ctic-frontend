import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('customer portal exposes a dedicated documents and evidence request screen', () => {
  const shell = read('app/components/DashboardShell.tsx');
  assert.match(shell, /CustomerDocumentsScreen/);
  assert.match(shell, /customer-documents/);
  assert.match(shell, /label: "Tài liệu"/);
});

test('customer documents screen only uses customer-safe document endpoints', () => {
  const source = read('app/components/CustomerDocumentsScreen.tsx');
  assert.match(source, /\/customer-portal\/me\/documents/);
  assert.doesNotMatch(source, /\/document-files\/upload/);
  assert.doesNotMatch(source, /\/technical-reviews\//);
  assert.doesNotMatch(source, /\/certification-decisions\//);
});

test('application document upload is category controlled and multipart', () => {
  const source = read('app/components/CustomerDocumentsScreen.tsx');
  assert.match(source, /LEGAL/);
  assert.match(source, /MANAGEMENT_SYSTEM/);
  assert.match(source, /SCOPE_SITE/);
  assert.match(source, /FormData/);
  assert.match(source, /multipart\/form-data/);
});

test('customer evidence response requires upload then explicit submit', () => {
  const source = read('app/components/CustomerDocumentsScreen.tsx');
  assert.match(source, /requests\/\$\{requestModal\.id\}\/upload/);
  assert.match(source, /requests\/\$\{requestModal\.id\}\/submit/);
  assert.match(source, /Tải và gửi phản hồi/);
});

test('coordinator has a separate document request review queue', () => {
  const source = read('app/components/CustomerDocumentRequestsScreen.tsx');
  const shell = read('app/components/DashboardShell.tsx');
  assert.match(source, /\/customer-document-requests/);
  assert.match(source, /REVISION_REQUIRED/);
  assert.match(source, /ACCEPT/);
  assert.match(shell, /customer-document-requests/);
});

test('document screens use controlled file preview helper', () => {
  const portal = read('app/components/CustomerDocumentsScreen.tsx');
  const internal = read('app/components/CustomerDocumentRequestsScreen.tsx');
  assert.match(portal, /openDocumentFile/);
  assert.match(internal, /openDocumentFile/);
});
