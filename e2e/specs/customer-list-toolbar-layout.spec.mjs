import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
} from "../helpers/quality.mjs";
import { CMP_DEMO_DATA } from "../fixtures/cmp-demo-3year.mjs";
import { generateCmpDemo10YearFixture } from "../fixtures/cmp-demo-10year.mjs";

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

const customers = CMP_DEMO_DATA.customers;
const projects = CMP_DEMO_DATA.cases.map((record) => ({
  id: record.id,
  project_code: record.project_code,
  standard_name: record.standard_name,
  status: record.status,
  updated_at: record.updated_at,
  certification_applications: {
    application_code: record.application.application_code,
    customers: { id: record.customer.id },
  },
}));

async function openCustomerList(page, options = {}) {
  const customerFixture = options.customersData ?? customers;
  const projectFixture = options.projectsData ?? projects;
  const sessionErrors = [];
  const writes = [];
  const userAccessRequests = [];
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
    if (/^\/customers\/[^/]+\/user-access$/.test(path)) {
      userAccessRequests.push(path);
      if (options.userAccessDelayMs) await new Promise((resolve) => setTimeout(resolve, options.userAccessDelayMs));
      if (options.userAccessFailure) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Fixture dependency unavailable" }) });
        return;
      }
    }
    if (request.method() !== "GET") {
      writes.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ message: "Controlled fixture is read-only" }) });
      return;
    }

    let body = [];
    if (path === "/auth/me") {
      body = { user: { ...session.user, permissions: ["customers.read", "projects.read", ...(options.canManage ? ["customers.manage"] : [])] } };
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
      body = customerFixture;
    } else if (path === "/certification-projects") {
      body = projectFixture;
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });

  await page.goto("/customers");
  await expect(page.locator(".customer-summary-strip")).toContainText(String(customerFixture.length));
  if (customerFixture.length) {
    await expect(page.locator(".customer-mobile-card, .customers-list-card .ant-table-tbody tr:not(.ant-table-measure-row)").first()).toBeVisible();
    await expect(page.getByText(`${customerFixture.length} khách hàng`, { exact: true })).toBeVisible();
  }
  return { sessionErrors, writes, userAccessRequests };
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
  await captureVisualBaseline(page, testInfo, `customer-toolbar-${viewport?.width ?? "unknown"}`, { fullPage: false });
}

test("customer search and status filters fit at desktop and mobile widths", async ({ page }, testInfo) => {
  const { sessionErrors, writes } = await openCustomerList(page);
  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectToolbarFits(page, testInfo, sessionErrors);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Thêm khách hàng" }).click();
  const customerForm = page.getByRole("dialog");
  await expect(customerForm).toBeVisible();
  await page.waitForTimeout(350);
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    const formBounds = await customerForm.boundingBox();
    expect(formBounds).not.toBeNull();
    expect(formBounds.y).toBeGreaterThanOrEqual(0);
    const submitButton = customerForm.getByRole("button", { name: "Tạo khách hàng" });
    const submitBounds = await submitButton.boundingBox();
    expect(submitBounds).not.toBeNull();
    const formGeometry = await customerForm.evaluate((dialog) => {
      const box = (selector) => {
        const element = dialog.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom, height: rect.height, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY } : null;
      };
      return { viewportHeight: window.innerHeight, container: box(".ant-modal-container"), body: box(".ant-modal-body"), footer: box(".ant-modal-footer") };
    });
    expect(formGeometry.container).not.toBeNull();
    expect(formGeometry.container.top).toBeGreaterThanOrEqual(0);
    expect(formGeometry.container.bottom).toBeLessThanOrEqual(size.height + 1);
    expect(formGeometry.footer).not.toBeNull();
    expect(formGeometry.footer.bottom).toBeLessThanOrEqual(size.height + 1);
    expect(submitBounds.y).toBeGreaterThanOrEqual(0);
    expect(submitBounds.y + submitBounds.height).toBeLessThanOrEqual(size.height + 1);
    await testInfo.attach(`customer-form-geometry-${size.width}`, {
      body: Buffer.from(JSON.stringify({ formBounds, submitBounds, formGeometry }, null, 2)),
      contentType: "application/json",
    });
    await captureVisualBaseline(page, testInfo, `customer-create-form-${size.width}`, { fullPage: false });
  }
  await customerForm.getByRole("button", { name: "Tạo khách hàng" }).click();
  await expect(customerForm.getByText("Nhập mã khách hàng", { exact: true })).toBeVisible();
  await expect(customerForm.getByText("Nhập tên tổ chức", { exact: true })).toBeVisible();
  expect(writes, "Invalid customer form must not send a mutation").toEqual([]);
  await customerForm.getByRole("button", { name: "Hủy" }).click();

  await page.getByRole("button", { name: "Chi tiết" }).first().click();
  const detailDrawer = page.locator(".customer-detail-drawer");
  await expect(detailDrawer).toBeVisible();
  await expect(detailDrawer.locator(".customer-projects-card")).toContainText("2 hồ sơ");
  await expect(detailDrawer.locator(".customer-projects-card .ant-list-item")).toHaveCount(2);
  expect(sessionErrors).toEqual([]);
});

test("empty customer state offers only permitted actions and has a compact visual", async ({ page }, testInfo) => {
  const { sessionErrors, writes } = await openCustomerList(page, { customersData: [], projectsData: [], canManage: true });
  await expect(page.locator(".customer-list-empty")).toContainText("Chưa có khách hàng");
  await expect(page.locator(".customer-list-empty .cmp-empty-illustration")).toBeVisible();
  await expect(page.getByRole("button", { name: "Thêm khách hàng" })).toHaveCount(1);

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `customer-empty-${size.width}`, { fullPage: false });
  }
  expect(writes).toEqual([]);
  expect(sessionErrors).toEqual([]);
});

test("customer detail distinguishes a delayed Portal response from an empty result", async ({ page }) => {
  const { userAccessRequests, sessionErrors, writes } = await openCustomerList(page, { userAccessDelayMs: 300 });
  await page.getByRole("button", { name: "Chi tiết" }).first().click();
  const drawer = page.locator(".customer-detail-drawer");
  const accessList = drawer.locator(".ant-card").filter({ hasText: "Tài khoản khách hàng" }).locator(".ant-list");
  await expect.poll(() => userAccessRequests.length).toBe(1);
  await expect(accessList.locator(".ant-spin-spinning")).toBeVisible();
  await expect(drawer.getByText("Chưa có tài khoản khách hàng")).toBeVisible({ timeout: 5_000 });
  await expect(accessList.locator(".ant-spin-spinning")).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(sessionErrors).toEqual([]);
});

test("customer detail shows a load error separately from an empty Portal list", async ({ page }) => {
  const { userAccessRequests, sessionErrors, writes } = await openCustomerList(page, { userAccessFailure: true });
  await page.getByRole("button", { name: "Chi tiết" }).first().click();
  const drawer = page.locator(".customer-detail-drawer");
  await expect.poll(() => userAccessRequests.length).toBe(1);
  await expect(drawer.getByText("Không thể tải danh sách tài khoản Portal")).toBeVisible();
  await expect(drawer.getByText("Chưa có tài khoản khách hàng")).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(sessionErrors.filter((entry) => !entry.includes("503"))).toEqual([]);
});

test("20-customer 10-year fixture stays searchable and paginated across three viewports", async ({ page }, testInfo) => {
  const fixture = generateCmpDemo10YearFixture("full-10y");
  const projectsData = fixture.projects.map((project) => ({
    ...project,
    certification_applications: {
      ...project.certification_applications,
      customers: { id: project.customer_id },
    },
  }));
  const { sessionErrors, writes } = await openCustomerList(page, { customersData: fixture.customers, projectsData });
  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]
    : [{ width: 390, height: 844 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `fixture-10y-customers-${size.width}`, { fullPage: false });
  }
  const search = page.locator(".customer-list-toolbar input.ant-input");
  await search.fill("F10Y-CMP-020");
  await expect(page.getByText("Công ty Thiết kế và Sản xuất Nội thất Hòa Phát", { exact: true })).toBeVisible();
  const visibleCustomerRows = page.locator(".customer-mobile-card, .customers-list-card .ant-table-tbody tr:not(.ant-table-measure-row):not(.ant-table-placeholder)");
  await expect(visibleCustomerRows).toHaveCount(1);
  await search.clear();
  await expect(visibleCustomerRows).toHaveCount(10);
  await expect(page.locator(".ant-pagination-total-text")).toContainText("20 khách hàng");
  await page.locator(".ant-pagination-next").click();
  await expect(visibleCustomerRows).toHaveCount(10);
  await expect(page.getByText("F10Y-CMP-020", { exact: true })).toBeVisible();
  await page.locator(".ant-pagination-prev").click();
  await page.getByRole("button", { name: "Chi tiết" }).first().click();
  const firstCustomerProjectCount = fixture.projects.filter((project) => project.customer_id === fixture.customers[0].id).length;
  await expect(page.locator(".customer-detail-drawer .customer-projects-card .ant-list-item")).toHaveCount(firstCustomerProjectCount);
  expect(writes).toEqual([]);
  expect(sessionErrors).toEqual([]);
});
