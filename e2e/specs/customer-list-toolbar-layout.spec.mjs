import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
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

const customers = Array.from({ length: 12 }, (_, index) => ({
  id: `customer-${index + 1}`,
  customer_code: `KH-2026-${String(index + 1).padStart(4, "0")}`,
  company_name: `Công ty Cổ phần Giải pháp Công nghiệp và Chuỗi Cung ứng Miền Đông Nam Bộ ${index + 1}`,
  country_code: "VN",
  tax_code: `0312345${String(index + 1).padStart(3, "0")}`,
  address: "Thành phố Hồ Chí Minh",
  phone: `09000000${String(index + 1).padStart(2, "0")}`,
  email: `customer-${index + 1}@example.invalid`,
  status: index < 10 ? "active" : "inactive",
  created_at: "2026-10-10T09:00:00Z",
  updated_at: "2026-10-10T09:00:00Z",
}));

async function openCustomerList(page) {
  const sessionErrors = [];
  page.on("pageerror", (error) => sessionErrors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => sessionErrors.push(`requestfailed: ${request.method()} ${request.url()}`));
  page.on("response", (response) => {
    if (response.status() >= 500) sessionErrors.push(`http-${response.status()}: ${response.url()}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Warning: [antd")) {
      sessionErrors.push(`console.error: ${message.text()}`);
    }
  });

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
      body = { user: { ...session.user, permissions: ["customers.read", "projects.read"] } };
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
    } else if (path === "/customers") {
      body = customers;
    } else if (path === "/certification-projects") {
      body = [];
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });

  await page.goto("/customers");
  await expect(page.getByRole("heading", { name: "Khách hàng" })).toBeVisible();
  await expect(page.locator(".customer-mobile-card, .customers-list-card .ant-table-tbody tr:not(.ant-table-measure-row)").first()).toBeVisible();
  return sessionErrors;
}

async function expectToolbarFits(page, testInfo, errors) {
  const viewport = page.viewportSize();
  const toolbar = page.locator(".customer-list-toolbar");
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole("combobox", { name: "Lọc trạng thái khách hàng" })).toBeVisible();

  const layout = await toolbar.evaluate((element) => {
    const [search, status] = Array.from(element.children).map((child) => child.getBoundingClientRect());
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      searchTop: search.top,
      searchBottom: search.bottom,
      searchRight: search.right,
      statusTop: status.top,
      statusLeft: status.left,
      statusWidth: status.width,
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  if ((viewport?.width ?? 0) <= 767) {
    expect(layout.statusTop).toBeGreaterThanOrEqual(layout.searchBottom);
    expect(layout.statusWidth).toBeGreaterThanOrEqual(300);
  } else {
    expect(Math.abs(layout.searchTop - layout.statusTop)).toBeLessThan(4);
    expect(layout.searchRight).toBeLessThanOrEqual(layout.statusLeft + 1);
  }

  await expectNoHorizontalOverflow(page);
  expect(errors, "Unexpected customer screen browser/runtime errors").toEqual([]);
  await captureVisualBaseline(page, testInfo, `customer-toolbar-${viewport?.width ?? "unknown"}`);
}

test("customer search and status filters fit at desktop and mobile widths", async ({ page }, testInfo) => {
  const errors = await openCustomerList(page);
  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectToolbarFits(page, testInfo, errors);
  }
});
