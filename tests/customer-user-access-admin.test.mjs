import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('customer portal exposes a dedicated controlled account administration screen', () => {
  const shell = read('app/components/DashboardShell.tsx');
  const portal = read('app/components/CustomerPortalUsersScreen.tsx');
  assert.match(shell, /customer-portal-users/);
  assert.match(shell, /Quyền truy cập tổ chức/);
  assert.match(portal, /\/customer-portal\/me\/user-access/);
  assert.match(portal, /\/customer-portal\/me\/user-access-requests/);
});

test('customer cannot self-grant portal access from frontend', () => {
  const portal = read('app/components/CustomerPortalUsersScreen.tsx');
  assert.match(portal, /Đã gửi yêu cầu tới tổ chức chứng nhận để phê duyệt/);
  assert.doesNotMatch(portal, /api\.(put|delete)\([^\n]*\/customers\//);
  assert.doesNotMatch(portal, /\/users\/[\s\S]{0,50}roles/);
});

test('portal account requests cover add revoke and reactivate without global account disable', () => {
  const portal = read('app/components/CustomerPortalUsersScreen.tsx');
  assert.match(portal, /ADD_USER/);
  assert.match(portal, /REVOKE_ACCESS/);
  assert.match(portal, /REACTIVATE_ACCESS/);
  assert.match(portal, /activeCount <= 1/);
  assert.doesNotMatch(portal, /status:\s*["']inactive["']/);
});

test('admin review screen owns approval and transient credentials for new customer users', () => {
  const review = read('app/components/CustomerUserRequestsScreen.tsx');
  assert.match(review, /customer-user-requests/);
  assert.match(review, /CREATE_NEW_USER/);
  assert.match(review, /temporary_password/);
  assert.match(review, /Input\.Password/);
  assert.match(review, /Mật khẩu tạm thời chỉ được dùng để tạo tài khoản/);
});

test('admin screen blocks automatic privilege mixing for conflicting existing accounts', () => {
  const review = read('app/components/CustomerUserRequestsScreen.tsx');
  assert.match(review, /CONFLICT/);
  assert.match(review, /không phù hợp để cấp Portal tự động/);
  assert.match(review, /disabled=\{!canApprove\}/);
});

test('portal access history is visible without password or internal role data', () => {
  const portal = read('app/components/CustomerPortalUsersScreen.tsx');
  assert.match(portal, /Lịch sử quyền truy cập/);
  assert.match(portal, /Lịch sử yêu cầu quản trị tài khoản/);
  assert.doesNotMatch(portal, /password_hash/);
  assert.doesNotMatch(portal, /role_permissions/);
});
