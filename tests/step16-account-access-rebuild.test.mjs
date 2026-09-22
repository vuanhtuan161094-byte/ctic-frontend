import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const shell = source("../app/components/DashboardShell.tsx");
const navigation = source("../app/lib/app-navigation.ts");
const accounts = source("../app/components/SystemAdminScreen.tsx");
const detail = source("../app/components/AccountAccessDetailScreen.tsx");
const roles = source("../app/components/RolesPermissionsScreen.tsx");

test("Step 16 exposes canonical account and access routes", () => {
  for (const route of [
    "/admin/accounts",
    "/admin/roles-permissions",
    "/admin/accounts/${encodeURIComponent(navigation.selectedAccountId)}/access",
    "/admin/accounts/${encodeURIComponent(navigation.selectedAccountId)}/sessions",
    "/admin/accounts/${encodeURIComponent(navigation.selectedAccountId)}/activity",
  ]) assert.ok(navigation.includes(route), `missing ${route}`);
  assert.match(navigation, /accountMatch[\s\S]*selectedAccountId/);
});

test("admin navigation matches the explicit controller role and effective permission", () => {
  assert.match(shell, /canManageAccounts = hasRole\("ADMIN"\) && hasPermission\("users\.read"\)/);
  assert.match(shell, /key: "account-access-group"/);
  assert.match(shell, /canManageAccounts \? [\s\S]*ForbiddenState/);
});

test("account list supports useful filters, pagination and responsive cards", () => {
  assert.match(accounts, /SearchToolbar/);
  assert.match(accounts, /statusFilter/);
  assert.match(accounts, /roleFilter/);
  assert.match(accounts, /audienceFilter/);
  assert.match(accounts, /Nội bộ & khách hàng/);
  assert.match(accounts, /DataTable<SystemUser>/);
  assert.match(accounts, /responsiveCards=/);
  assert.match(accounts, /pagination=\{\{ pageSize: 10/);
});

test("admin uses one account list with separate safe creation flows", () => {
  assert.match(accounts, /title="Thêm tài khoản"/);
  assert.match(accounts, /Tài khoản nội bộ/);
  assert.match(accounts, /Tài khoản khách hàng/);
  assert.match(accounts, /CustomerPortalAccountModal/);
  assert.match(accounts, /customerCreateOpen/);
  assert.match(accounts, /internalRoleOptions/);
  assert.match(accounts, /normalizeRole\(option\.value\) !== "customer"/);
  assert.match(accounts, /Vai trò CUSTOMER được quản lý bởi flow tài khoản khách hàng/);
  assert.match(accounts, /title: "Nhóm"/);
});

test("account details are route-level and split into coherent areas", () => {
  for (const label of ["Tổng quan", "Vai trò & quyền hiệu lực", "Phiên & bảo mật", "Hoạt động"]) assert.ok(detail.includes(label), `missing ${label}`);
  assert.match(detail, /PageHeader/);
  assert.match(detail, /EntitySummary/);
  assert.doesNotMatch(detail, /<Modal/);
  assert.doesNotMatch(detail, /<Drawer/);
});

test("role definition and effective account access are presented as different concepts", () => {
  assert.match(roles, /Vai trò là định nghĩa cấp quyền/);
  assert.match(detail, /Quyền hiệu lực/);
  assert.match(detail, /Vai trò/);
  assert.match(detail, /Điều chỉnh cho phép/);
  assert.match(detail, /Điều chỉnh từ chối/);
  assert.match(detail, /Chiếu từ backend/);
});

test("per-user override visualization preserves backend scope constraints", () => {
  assert.match(detail, /Điều chỉnh quyền theo tài khoản/);
  assert.match(detail, /allow_overrides/);
  assert.match(detail, /deny_overrides/);
  assert.match(detail, /resource|Phạm vi tài nguyên/);
  assert.match(detail, /phân công, năng lực, độc lập/);
  assert.match(detail, /phân tách nhiệm vụ/);
});

test("role permissions use grouped domains instead of a giant checkbox matrix", () => {
  assert.match(roles, /permissionDomains/);
  assert.match(roles, /Khách hàng & Portal/);
  assert.match(roles, /Lập kế hoạch & thực hiện đánh giá/);
  assert.match(roles, /Thẩm xét & quyết định/);
  assert.match(roles, /role-permission-groups/);
  assert.doesNotMatch(roles, /Checkbox/);
});

test("unsupported session and activity projections are disclosed without fabrication", () => {
  assert.match(detail, /Backend chưa cung cấp danh sách phiên hoạt động/);
  assert.match(detail, /Chưa có endpoint lịch sử hoạt động bảo mật theo tài khoản/);
  assert.match(detail, /không tạo lịch sử giả/);
  assert.match(detail, /ReadOnlyState/);
});

test("direct Portal governance remains ADMIN-only in the account surface", () => {
  assert.match(shell, /hasRole\("ADMIN"\) && hasPermission\("users\.read"\)/);
  assert.match(accounts, /SystemGovernancePanel/);
  assert.match(accounts, /canManage = roles\.some[\s\S]*=== "admin"/);
});

test("legacy system-admin adapter and white-label boundaries remain", () => {
  assert.match(navigation, /path\.startsWith\("\/system-admin"\)/);
  assert.match(navigation, /"system-admin": "\/admin\/accounts"/);
  assert.doesNotMatch(detail, /\bCTIC\b/);
  assert.doesNotMatch(roles, /\bCTIC\b/);
  assert.doesNotMatch(detail, /password_hash|refresh_token|jwt_secret/i);
});
