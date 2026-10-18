import { expect, test } from "@playwright/test";
import { captureVisualBaseline, expectNoHorizontalOverflow, watchRuntimeIssues } from "../helpers/quality.mjs";

const session = { access_token: "browser-fixture-not-a-credential", user: { id: "browser-admin", username: "browser.admin", full_name: "Browser Admin", email: "browser.admin@example.invalid", roles: ["ADMIN"] } };
const users = Array.from({ length: 12 }, (_, index) => ({
  id: `user-${index + 1}`, username: `employee.${index + 1}`, email: `employee${index + 1}@example.invalid`, full_name: `Nhân viên nghiệp vụ ${index + 1}`,
  status: index === 0 ? "locked" : "active", failed_login_count: 0, locked_until: null, created_at: "2026-10-01", roles: [{ id: "role-1", role_name: "CB_STAFF", description: null, permissions: [] }],
}));

test("admin account list audit", async ({ page }, testInfo) => {
  let runtime;
  await page.addInitScript((value) => window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value)), session);
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = [];
    if (path === "/auth/me") body = { user: { ...session.user, permissions: ["users.read", "users.manage"] } };
    if (path === "/platform-branding") body = {};
    if (path === "/notifications/me") body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    if (path === "/me/workspace") body = { user_context: { personas: [] }, work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 }, priority_work_items: [], recent_records: [], role_kpis: [], calendar_items: [], exceptions: [], meta: {} };
    if (path === "/users") body = users;
    if (path === "/users/roles") body = [{ id: "role-1", role_name: "CB_STAFF", description: null, user_count: 12, permissions: [], assignable: true }];
    if (path === "/users/permissions") body = [];
    if (path.endsWith("/permission-profile")) body = { user_id: path.split("/")[2], role_names: ["CB_STAFF"], base_permissions: [], allow_overrides: [], deny_overrides: [], effective_permissions: [], can_override: true, restriction_reason: null, role_scope_note: "" };
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });
  await page.goto("/");
  const sizes = testInfo.project.name === "desktop-1440x900" ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }] : [{ width: 390, height: 844 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    if (size.width < 992) await page.getByRole("button", { name: /menu/i }).first().click();
    if (!await page.getByRole("menuitem", { name: "Tài khoản", exact: true }).isVisible()) {
      await page.getByRole("menuitem", { name: /Tài khoản & truy cập/ }).click();
    }
    await page.getByRole("menuitem", { name: "Tài khoản", exact: true }).click();
    runtime ??= watchRuntimeIssues(page);
    await expect(page.getByText("Danh sách tài khoản")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `admin-accounts-${size.width}`);
    if (size.width < 768) {
      await expect(page.locator(".system-admin-table-card .cmp-responsive-card")).toHaveCount(10);
      await page.locator(".system-admin-mobile-pagination .ant-pagination-item-2").click();
      await expect(page.locator(".system-admin-table-card .cmp-responsive-card")).toHaveCount(2);
      await page.getByPlaceholder("Tìm theo tên, tên đăng nhập hoặc thư điện tử...").fill("employee.12");
      await expect(page.locator(".system-admin-table-card .cmp-responsive-card")).toHaveCount(1);
    }
    await page.getByRole("button", { name: size.width < 768 ? "Chỉnh sửa" : "Quản lý" }).first().click();
    const drawer = page.locator(".ant-drawer-content-wrapper:visible");
    await expect(drawer).toBeVisible();
    await expect.poll(async () => {
      const currentBox = await drawer.boundingBox();
      return currentBox ? currentBox.x + currentBox.width : Number.POSITIVE_INFINITY;
    }).toBeLessThanOrEqual(size.width + 0.5);
    const box = await drawer.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box?.x + (box?.width ?? 0)).toBeLessThanOrEqual(size.width);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `admin-account-editor-${size.width}`);
    await drawer.getByRole("tab", { name: "Vai trò & quyền" }).click();
    await drawer.getByRole("tab", { name: "Đặt lại mật khẩu" }).click();
    await drawer.getByLabel("Mật khẩu mới").fill("TemporaryValue123");
    await drawer.locator(".ant-drawer-close").click();
    await page.getByRole("button", { name: size.width < 768 ? "Chỉnh sửa" : "Quản lý" }).first().click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole("tab", { name: "Đặt lại mật khẩu" }).click();
    await expect(drawer.getByLabel("Mật khẩu mới")).toBeEmpty();
    await drawer.locator(".ant-drawer-close").click();
  }
  expect(runtime?.issues).toEqual([]);
});
