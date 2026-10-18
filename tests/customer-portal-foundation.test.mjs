import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('customer portal uses dedicated customer-safe screens instead of internal operational screens', () => {
  const shell = read('app/components/DashboardShell.tsx');
  assert.match(shell, /CustomerPortalDashboardScreen/);
  assert.match(shell, /CustomerProfileScreen/);
  assert.match(shell, /CustomerApplicationsScreen/);
  assert.match(shell, /CustomerAuditScheduleScreen/);
  assert.match(shell, /CustomerResultNotificationsScreen/);
  assert.match(shell, /CustomerCertificatesScreen/);
  assert.match(shell, /label: "Cổng khách hàng"/);
  assert.match(shell, /Hành động khắc phục/);
  const profile = read('app/components/CustomerProfileScreen.tsx');
  assert.doesNotMatch(profile, /Phase 3\.2/);
});

test('customer portal consumes only dedicated /customer-portal/me projections', () => {
  for (const file of [
    'app/components/CustomerPortalDashboardScreen.tsx',
    'app/components/CustomerProfileScreen.tsx',
    'app/components/CustomerApplicationsScreen.tsx',
    'app/components/CustomerAuditScheduleScreen.tsx',
    'app/components/CustomerResultNotificationsScreen.tsx',
    'app/components/CustomerCertificatesScreen.tsx',
  ]) {
    const source = read(file);
    assert.match(source, /\/customer-portal\/me\//, file);
    assert.doesNotMatch(source, /\/technical-reviews\//, file);
    assert.doesNotMatch(source, /\/certification-decisions\//, file);
  }
});

test('customer application flow supports draft edit submit without internal reviewer self-service', () => {
  const source = read('app/components/CustomerApplicationsScreen.tsx');
  assert.match(source, /Tạo đơn đăng ký/);
  assert.match(source, /Lưu bản nháp/);
  assert.match(source, /Gửi đơn/);
  assert.match(source, /can_edit/);
  assert.match(source, /can_submit/);
  assert.doesNotMatch(source, /reviewer_id/);
  assert.doesNotMatch(source, /technical_review/);
  assert.match(source, /không bắt buộc khi lưu bản nháp/);
  assert.doesNotMatch(source, /Bạn phải xác nhận cam kết thông tin/);
});

test('customer notification UI switches to customer-safe projection', () => {
  const center = read('app/components/NotificationCenter.tsx');
  const screen = read('app/components/NotificationsScreen.tsx');
  const shell = read('app/components/DashboardShell.tsx');
  assert.match(center, /customerMode/);
  assert.match(center, /customer-portal\/me\/notifications/);
  assert.match(screen, /customerMode/);
  assert.match(screen, /customer-portal\/me\/notifications/);
  assert.match(shell, /customerMode=\{customerPortalMode\}/);
  assert.match(center, /customer-portal\/me\/notifications\/\$\{id\}\/read/);
  assert.match(center, /customer-portal\/me\/notifications\/read-all/);
  assert.match(screen, /severity === "all" \|\| item\.severity === severity/);
  assert.match(shell, /customer-portal\/corrective-actions/);
  assert.match(shell, /customer-portal\/certificates/);
});

test('customer certificate screen uses public exact-version verification and official PDF paths', () => {
  const source = read('app/components/CustomerCertificatesScreen.tsx');
  assert.match(source, /public_verification_path/);
  assert.match(source, /public_pdf_path/);
  assert.match(source, /buildPublicApiUrl/);
  assert.match(source, /PDF chính thức/);
});
