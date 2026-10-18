import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
  watchRuntimeIssues,
} from "../helpers/quality.mjs";

const session = {
  access_token: "browser-fixture-not-a-credential",
  user: {
    id: "browser-admin",
    username: "browser.admin",
    full_name: "Browser QA Admin",
    email: "browser.qa@example.invalid",
    roles: ["ADMIN"],
  },
};

const applications = [
  { id: "application-1", application_code: "DK-2026-0001", status: "submitted", workflow_status: "SUBMITTED" },
  { id: "application-2", application_code: "DK-2026-0002", status: "under_review", workflow_status: "DRAFT" },
  { id: "application-3", application_code: "DK-2026-0003", status: "revision_required", workflow_status: "RETURNED" },
  { id: "application-4", application_code: "DK-2026-0004", status: "accepted", workflow_status: "APPROVED" },
].map((application, index) => ({
  ...application,
  customer_id: `customer-${index + 1}`,
  application_date: "2026-10-10",
  certification_type: "INITIAL",
  standard_name: index % 2 ? "ISO 14001:2015" : "ISO 9001:2015",
  certification_scope: "Thiết kế, sản xuất, lắp đặt, vận hành và bảo trì thiết bị công nghiệp tại nhiều địa điểm.",
  employee_count: 180 + index * 8,
  site_count: 2,
  sites: [],
  updated_at: `2026-10-${String(10 + index).padStart(2, "0")}T09:00:00Z`,
  customers: {
    id: `customer-${index + 1}`,
    customer_code: `KH-2026-${String(index + 1).padStart(4, "0")}`,
    company_name: [
      "Công ty Cổ phần Giải pháp Công nghiệp Xanh và Chuỗi Cung ứng Miền Đông Nam Bộ",
      "Công ty TNHH Thiết bị Y tế và Công nghệ Việt Nam",
      "Tập đoàn Sản xuất và Dịch vụ Kỹ thuật Miền Bắc",
      "Công ty Cổ phần Thực phẩm An Toàn Quốc Tế",
    ][index],
  },
  application_reviews: [{
    id: `review-${index + 1}`,
    result: index === 3 ? "accepted" : "need_more_info",
    workflow_status: application.workflow_status,
    reviewer_id: "browser-admin",
    review_date: "2026-10-11",
    comment: "Bổ sung thông tin phạm vi và địa điểm.",
    conclusion: "Đang xem xét",
    client_code: `C-${String(index + 1).padStart(2, "0")}`,
    manday_method: "IAF_MD5",
    risk_level: "MEDIUM",
    base_mandays: 8,
    final_mandays: 9,
    prepared_by: { id: "browser-admin", username: "browser.admin", full_name: "Browser QA Admin" },
    users: { id: "browser-admin", username: "browser.admin", full_name: "Browser QA Admin" },
  }],
}));

const knownAntdDeprecations = [
  "[antd: Modal] `maskClosable` is deprecated.",
  "[antd: Alert] `message` is deprecated.",
  "[antd: DatePicker] `popupClassName` is deprecated.",
  "[antd: Space] `direction` is deprecated.",
];

async function openApplications(page) {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value));
  }, session);

  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ message: "Controlled fixture is read-only" }) });
      return;
    }

    let body = [];
    if (path === "/auth/me") {
      body = { user: { ...session.user, permissions: ["applications.read", "projects.read", "customers.read"] } };
    } else if (path === "/platform-branding") {
      body = {};
    } else if (path === "/me/workspace") {
      body = {
        user_context: { personas: ["ADMIN"] },
        work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 },
        priority_work_items: [], calendar_items: [], exceptions: [], recent_records: [], role_kpis: [],
        meta: { due_soon_days: 7, sales_assignment_limitation: null },
      };
    } else if (path.startsWith("/notifications")) {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    } else if (path === "/certification-applications") {
      body = applications;
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });

  await page.goto("/applications");
  await expect(page.getByRole("heading", { name: "Đơn đăng ký chứng nhận" })).toBeVisible();
  await expect(page.getByText("DK-2026-0001").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test("application list keeps row actions compact and preserves open-details access", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  await openApplications(page);
  await captureVisualBaseline(page, testInfo, "application-list");

  if ((page.viewportSize()?.width ?? 0) >= 1280) {
    const row = page.getByRole("row").filter({ hasText: "DK-2026-0001" }).first();
    await expect(row.getByRole("button", { name: "Xem đơn" })).toHaveCount(0);
    const buttonTops = await row.locator(".ant-space .ant-btn").evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().top),
    );
    expect(Math.max(...buttonTops) - Math.min(...buttonTops)).toBeLessThan(4);
    await row.getByRole("button", { name: "DK-2026-0001" }).click();
  } else {
    const card = page.locator(".project-mobile-card").filter({ hasText: "DK-2026-0001" }).first();
    await expect(card.getByRole("button", { name: "Xem đơn" })).toBeVisible();
    await card.getByRole("button", { name: "Xem đơn" }).click();
  }

  await expect(page.getByRole("dialog", { name: "Đơn đăng ký chứng nhận" })).toBeVisible();
  expect(
    runtime.issues.filter((issue) => !knownAntdDeprecations.some((warning) => issue.includes(warning))),
    "Unexpected browser/runtime issues beyond the existing Ant Design deprecation warnings",
  ).toEqual([]);
  await captureVisualBaseline(page, testInfo, "application-open-details");
});

test("application desktop actions fit at 1366×768", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900", "The 1366×768 check is exercised once on the desktop project.");
  await page.setViewportSize({ width: 1366, height: 768 });
  await openApplications(page);

  const row = page.getByRole("row").filter({ hasText: "DK-2026-0001" }).first();
  const buttonTops = await row.locator(".ant-space .ant-btn").evaluateAll((buttons) =>
    buttons.map((button) => button.getBoundingClientRect().top),
  );
  expect(Math.max(...buttonTops) - Math.min(...buttonTops)).toBeLessThan(4);
  await expect(row.getByRole("button", { name: "Xem đơn" })).toHaveCount(0);
});
