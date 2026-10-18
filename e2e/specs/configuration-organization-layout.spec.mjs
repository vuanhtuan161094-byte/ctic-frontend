import { expect, test } from "@playwright/test";

import { captureVisualBaseline, expectNoHorizontalOverflow, watchRuntimeIssues } from "../helpers/quality.mjs";

const adminSession = {
  access_token: "controlled-browser-fixture-not-a-credential",
  user: { id: "organization-admin", username: "qa.admin", full_name: "Quản trị QA", roles: ["ADMIN"] },
};

async function openOrganizationConfiguration(page, options = {}) {
  const writes = [];
  await page.addInitScript((session) => window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(session)), adminSession);
  await page.route(/http:\/\/(?:127\.0\.0\.1|localhost):3000\/.*/, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
    if (request.method() !== "GET") {
      writes.push(`${request.method()} ${path}`);
      return json({ message: "Read-only visual fixture" }, 405);
    }
    if (path === "/auth/me") return json({ user: { ...adminSession.user, permissions: ["classifications.manage", "projects.read", "users.read"] } });
    if (path === "/platform-branding") return json({});
    if (path === "/notifications/me" || path.startsWith("/notifications")) return json({ items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } });
    if (path === "/me/workspace") return json({ work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 }, priority_work_items: [], calendar_items: [], exceptions: [], recent_records: [], role_kpis: [], meta: { due_soon_days: 7, sales_assignment_limitation: null } });
    if (path === "/master-data-configuration/configuration-readiness") {
      return json({
        schemes: { ready: true, items: [] },
        organization: { ready: false, reasons: [{ code: "LEGAL_NAME", field: "legal_name" }, { code: "DISPLAY_NAME", field: "display_name" }] },
        taxonomy: { ready: true, reasons: [] },
        numbering: { ready: true, reasons: [] },
      });
    }
    if (path === "/master-data-configuration/organization-profile") {
      return options.profileError ? json({ message: "Không thể tải hồ sơ" }, 503) : json(null);
    }
    if (path === "/master-data-configuration/numbering-capabilities") return json({
      contract_version: "1",
      sequence_authority: "NORMALIZED_VISIBLE_PREFIX_PER_BUSINESS_YEAR",
      format_template: "{PREFIX}-{YYYY}-{SEQUENCE}",
      timezone: "Asia/Ho_Chi_Minh",
      preview_year: 2026,
      configurable_entities: [{ entity_type: "complaint", label: "Khiếu nại", description: "Mã khiếu nại", fallback_prefix: "KN", mandatory_for_global_readiness: false }],
      non_configurable_entities: [],
    });
    return json([]);
  });
  await page.goto("/admin/configuration/branding");
  await expect(page.getByRole("heading", { name: "Tổ chức & nhận diện", exact: true })).toBeVisible();
  return writes;
}

test("organization onboarding state stays compact across desktop and mobile sizes", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const writes = await openOrganizationConfiguration(page);
  await expect(page.getByText("Thiết lập thông tin tổ chức chứng nhận", { exact: true })).toBeVisible();
  await expect(page.getByText("Cần hoàn tất hồ sơ tổ chức", { exact: true })).toBeVisible();
  await expect(page.locator(".organization-onboarding .cmp-empty-illustration")).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu thông tin tổ chức" })).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) > 767) {
    const governanceMenuItem = page.locator(".main-menu-label--governance .ant-menu-title-content");
    await expect(governanceMenuItem).toHaveText("Thay đổi, khiếu nại & kháng nghị");
    expect(await governanceMenuItem.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `organization-empty-${size.width}`, { fullPage: false });
  }
  expect(writes).toEqual([]);
  runtime.assertClean();
});

test("organization profile errors show retry guidance and block saving", async ({ page }) => {
  const runtime = watchRuntimeIssues(page);
  await openOrganizationConfiguration(page, { profileError: true });
  await expect(page.getByRole("alert").filter({ hasText: "Không tải được hồ sơ tổ chức" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu thông tin tổ chức" })).toBeDisabled();
  const expectedApiFailure = new Set([
    "http-503: GET http://127.0.0.1:3000/master-data-configuration/organization-profile",
    "console.error: Failed to load resource: the server responded with a status of 503 (Service Unavailable)",
  ]);
  expect(runtime.issues.filter((issue) => !expectedApiFailure.has(issue))).toEqual([]);
  expect(runtime.issues).toContain("http-503: GET http://127.0.0.1:3000/master-data-configuration/organization-profile");
});
