import { expect, test } from "@playwright/test";
import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
  runAxeBaseline,
} from "../helpers/quality.mjs";

const session = {
  access_token: "browser-fixture-not-a-credential",
  user: {
    id: "browser-customer",
    username: "browser.customer",
    full_name: "Portal Customer",
    email: "portal.customer@example.invalid",
    roles: ["CUSTOMER"],
  },
};

const plans = Array.from({ length: 12 }, (_, index) => ({
  id: `plan-${index + 1}`,
  plan_code: `AUD-2026-${String(index + 1).padStart(4, "0")}`,
  audit_type: "GIAM_SAT",
  planned_start_date: "2026-11-13",
  planned_end_date: "2026-11-14",
  location: "Nhà máy và văn phòng tại nhiều địa điểm",
  audit_scope: "Sản xuất và cung ứng thiết bị công nghiệp theo phạm vi chứng nhận",
  audit_criteria: "ISO 9001:2015",
  status: "issued",
  project: {
    id: `project-${index + 1}`,
    project_code: `HS-2026-${String(index + 1).padStart(4, "0")}`,
    standard_name: "ISO 9001:2015",
  },
  customer: {
    customer_code: "KH-2026-0098",
    company_name: "Công ty Cổ phần Giải pháp Công nghiệp và Chuỗi Cung ứng",
  },
}));

async function routeSchedule(page, getSchedule) {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value));
  }, session);
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ message: "Read-only fixture" }) });
      return;
    }
    let body = [];
    if (path === "/auth/me") {
      body = { user: { ...session.user, permissions: ["customer_portal.access"] } };
    } else if (path === "/platform-branding") {
      body = {};
    } else if (path === "/customer-portal/me/notifications") {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    } else if (path === "/customer-portal/me/schedule") {
      const response = getSchedule();
      await route.fulfill({ status: response.status, contentType: "application/json; charset=utf-8", body: JSON.stringify(response.body) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });
}

test("customer schedule shows full Vietnamese audit types on desktop, laptop and mobile", async ({ page }, testInfo) => {
  await routeSchedule(page, () => ({ status: 200, body: plans }));
  await page.goto("/portal/schedule");
  await expect(page.getByRole("heading", { name: "Lịch đánh giá" })).toBeVisible();
  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    const list = size.width < 992
      ? page.locator('[aria-label="Danh sách lịch đánh giá"]')
      : page.locator(".ant-table-tbody");
    await expect(list).toContainText("Đánh giá giám sát");
    await expect(list).not.toContainText("GIAM_SAT");
    if (size.width < 992) {
      await expect(list.locator(".portal-mobile-card")).toHaveCount(10);
    } else {
      await expect(list.locator(".ant-table-row")).toHaveCount(10);
    }
    await captureVisualBaseline(page, testInfo, `customer-audit-schedule-${size.width}`);
  }
  await runAxeBaseline(page, testInfo);
});

test("customer schedule has a distinguishable empty state", async ({ page }, testInfo) => {
  await routeSchedule(page, () => ({ status: 200, body: [] }));
  await page.goto("/portal/schedule");
  await expect(page.getByText("Chưa có lịch đánh giá được công bố")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await captureVisualBaseline(page, testInfo, "customer-audit-schedule-empty");
});

test("customer schedule provides a retry after a loading error", async ({ page }, testInfo) => {
  let failing = true;
  await routeSchedule(page, () => failing
    ? { status: 503, body: { message: "Không thể tải lịch đánh giá" } }
    : { status: 200, body: plans });
  await page.goto("/portal/schedule");
  await expect(page.getByText("Không tải được lịch đánh giá")).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
  await captureVisualBaseline(page, testInfo, "customer-audit-schedule-error", { fullPage: false });
  failing = false;
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByText("Đánh giá giám sát").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
