import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../app/components/CustomerPortalAccountModal.tsx', import.meta.url), 'utf8');
const customers = fs.readFileSync(new URL('../app/components/CustomersScreen.tsx', import.meta.url), 'utf8');
const governance = fs.readFileSync(new URL('../app/components/SystemGovernancePanel.tsx', import.meta.url), 'utf8');
const accounts = fs.readFileSync(new URL('../app/components/SystemAdminScreen.tsx', import.meta.url), 'utf8');

test('customer drawer can create portal accounts directly', () => {
  assert.match(customers, /Tài khoản khách hàng/);
  assert.match(customers, /Thêm tài khoản/);
  assert.match(customers, /\/customers\/\$\{selectedCustomerId\}\/user-access/);
});

test('customer portal provisioning and password reset remain visible only to Admin', () => {
  assert.match(customers, /const\s+isAdmin\s*=\s*normalizedRoles\.includes\("admin"\)/);
  assert.match(customers, /enabled:\s*Boolean\(selectedCustomerId\s*&&\s*isAdmin\)/);
  assert.match(customers, /className="customer-access-card"/);
  assert.match(customers, /setPortalAccountOpen\(true\)/);
  assert.match(customers, /resetPortalPasswordMutation\.mutate\(access\.user_id\)/);
  assert.equal((customers.match(/setPortalAccountOpen\(true\)/g) ?? []).length, 1);
  assert.equal((customers.match(/resetPortalPasswordMutation\.mutate\(/g) ?? []).length, 1);
});

test('provision modal keeps the workflow short and explains automatic credentials', () => {
  assert.match(modal, /Chỉ cần họ tên và email/);
  assert.match(modal, /Tạo & cấp quyền/);
  assert.match(modal, /CMP tự tạo tên đăng nhập/);
});

test('new credentials are shown once and can be copied for the customer', () => {
  assert.match(modal, /Sao chép thông tin gửi khách/);
  assert.match(modal, /Mật khẩu ban đầu chỉ hiển thị ở lần này/);
  assert.match(modal, /navigator\.clipboard\.writeText/);
});

test('existing customer accounts are linked instead of pretending a new password exists', () => {
  assert.match(modal, /Không tạo mật khẩu mới/);
  assert.match(modal, /tài khoản CUSTOMER hợp lệ/);
});

test('customer drawer exposes compact access lifecycle actions with accurate semantics', () => {
  assert.match(customers, />\s*Mật khẩu\s*<\/Button>/);
  assert.match(customers, />\s*Ngừng\s*<\/Button>/);
  assert.match(customers, />\s*Khôi phục\s*<\/Button>/);
  assert.match(customers, /Có quyền Portal/);
  assert.doesNotMatch(customers, /Đang truy cập/);
});

test('central account admin provisions internal and customer accounts from one entry point', () => {
  assert.match(accounts, /Thêm tài khoản/);
  assert.match(accounts, /Tài khoản nội bộ/);
  assert.match(accounts, /Tài khoản khách hàng/);
  assert.match(accounts, /CustomerPortalAccountModal/);
  assert.match(accounts, /customerCreateOpen/);
  assert.match(accounts, /internalRoleOptions/);
});

test('system governance offers quick customer account provisioning', () => {
  assert.match(governance, /Quản lý tập trung tài khoản Portal của khách hàng/);
  assert.match(governance, /Tạo tài khoản khách hàng/);
  assert.match(governance, /CustomerPortalAccountModal/);
});

test('system governance translates new portal audit actions', () => {
  assert.match(governance, /CUSTOMER_PORTAL_USER_PROVISIONED: "Tạo và cấp quyền tài khoản khách hàng"/);
  assert.match(governance, /CUSTOMER_PORTAL_PASSWORD_RESET: "Tạo mật khẩu mới cho khách hàng"/);
});
