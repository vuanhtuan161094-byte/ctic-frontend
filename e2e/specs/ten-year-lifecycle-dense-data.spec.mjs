import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
} from "../helpers/quality.mjs";
import { installTenYearReadOnlyApi } from "../helpers/cmp-demo-10year-browser.mjs";
import { generateCmpDemo10YearFixture } from "../fixtures/cmp-demo-10year.mjs";

const session = {
  access_token: "browser-fixture-not-a-credential",
  user: {
    id: "fixture-10y-admin",
    username: "fixture.admin",
    full_name: "Quản trị viên giả lập",
    email: "fixture.admin@example.invalid",
    roles: ["ADMIN"],
  },
};

function viewportSet(testInfo) {
  return testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]
    : [{ width: 390, height: 844 }];
}

function watchRuntime(page) {
  const issues = [];
  const apiResponses = [];
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === "http://127.0.0.1:3000") {
      apiResponses.push({ method: response.request().method(), path: url.pathname, status: response.status() });
    }
    if (response.status() >= 500) issues.push(`http-${response.status()}: ${new URL(response.url()).pathname}`);
  });
  return { issues, apiResponses };
}

test("FIXTURE_10Y: 53 application cycles render as searchable work queue", async ({ page }, testInfo) => {
  const fixture = generateCmpDemo10YearFixture("full-10y");
  const runtimeIssues = watchRuntime(page);
  const api = await installTenYearReadOnlyApi(page, fixture, session);
  await page.goto("/applications");

  await expect(page.getByRole("heading", { name: "Đơn đăng ký chứng nhận" })).toBeVisible();
  await expect(page.locator(".project-summary-strip")).toContainText(String(fixture.applications.length));
  await expect(page.getByText(fixture.applications[0].application_code, { exact: true }).first()).toBeVisible();
  expect(api.counts.applications).toBe(53);

  for (const size of viewportSet(testInfo)) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `fixture-10y-applications-${size.width}x${size.height}`, { fullPage: false });
  }
  await page.locator(".project-list-toolbar input.ant-input").fill(fixture.applications[0].application_code);
  if (testInfo.project.name === "mobile-390x844") {
    await expect(page.locator(".project-mobile-card")).toHaveCount(1);
  } else {
    await expect(page.locator(".projects-list-card .ant-table-row")).toHaveCount(1);
  }
  expect(api.served.get("/certification-applications")).toBe(1);
  expect(runtimeIssues.apiResponses).toContainEqual({ method: "GET", path: "/certification-applications", status: 200 });
  expect(api.writes).toEqual([]);
  expect(runtimeIssues.issues).toEqual([]);
});

test("FIXTURE_10Y: 51 dossier projections preserve customer and cycle links", async ({ page }, testInfo) => {
  const fixture = generateCmpDemo10YearFixture("full-10y");
  const runtimeIssues = watchRuntime(page);
  const api = await installTenYearReadOnlyApi(page, fixture, session);
  const projectsResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/certification-projects");
  await page.goto("/certifications");

  await expect(page.getByRole("heading", { name: "Hồ sơ chứng nhận" })).toBeVisible();
  await expect(page.getByText(`${fixture.projects.length} / ${fixture.projects.length} hồ sơ`)).toBeVisible();
  const payload = await (await projectsResponse).json();
  expect(payload[0].certification_applications.customers.company_name).toBe(fixture.projects[0].customer.company_name);
  expect(payload[0]).not.toHaveProperty("customer");
  if (testInfo.project.name === "mobile-390x844") {
    const firstCard = page.locator(".cmp-responsive-card").filter({ hasText: fixture.projects[0].project_code }).first();
    await expect(firstCard).toContainText(fixture.projects[0].customer.company_name);
  } else {
    const firstRow = page.locator(".ant-table-row").filter({ hasText: fixture.projects[0].project_code }).first();
    await expect(firstRow).toContainText(fixture.projects[0].customer.company_name);
  }
  expect(fixture.projects.every((project) => project.certification_applications?.customer_id === project.customer_id)).toBe(true);

  for (const size of viewportSet(testInfo)) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `fixture-10y-dossiers-${size.width}x${size.height}`, { fullPage: false });
  }
  await page.getByRole("searchbox", { name: "Tìm mã hồ sơ, khách hàng hoặc tiêu chuẩn" }).fill(fixture.projects[0].project_code);
  await expect(page.getByText("1 / 51 hồ sơ")).toBeVisible();
  expect(api.served.get("/certification-projects")).toBe(1);
  expect(runtimeIssues.apiResponses).toContainEqual({ method: "GET", path: "/certification-projects", status: 200 });
  expect(api.writes).toEqual([]);
  expect(runtimeIssues.issues).toEqual([]);
});

test("FIXTURE_10Y: personnel page displays 20 profiles and 38 scoped competency summaries", async ({ page }, testInfo) => {
  const fixture = generateCmpDemo10YearFixture("full-10y");
  const runtimeIssues = watchRuntime(page);
  const api = await installTenYearReadOnlyApi(page, fixture, session);
  await page.goto("/resources/experts");

  await expect(page.getByRole("heading", { name: "Chuyên gia & năng lực", exact: true })).toBeVisible();
  await expect(page.locator(".expert-list-card")).toBeVisible();
  await expect(page.locator(".expert-list-card")).toContainText(fixture.personnel[0].employee_code);
  expect(fixture.personnel).toHaveLength(20);
  expect(fixture.competencies).toHaveLength(38);

  for (const size of viewportSet(testInfo)) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `fixture-10y-personnel-${size.width}x${size.height}`, { fullPage: false });
  }
  await page.locator(".expert-filter-bar input.ant-input").fill(fixture.personnel[0].employee_code);
  if (testInfo.project.name === "mobile-390x844") {
    await expect(page.locator(".expert-mobile-card")).toHaveCount(1);
  } else {
    await expect(page.locator(".expert-list-card .ant-table-row:visible")).toHaveCount(1);
  }
  expect(api.served.get("/experts/overview")).toBe(1);
  expect(api.served.get("/experts") ?? 0).toBeGreaterThan(0);
  expect(runtimeIssues.apiResponses).toContainEqual({ method: "GET", path: "/experts/overview", status: 200 });
  expect(runtimeIssues.apiResponses).toContainEqual({ method: "GET", path: "/experts", status: 200 });
  expect(api.writes).toEqual([]);
  expect(runtimeIssues.issues).toEqual([]);
});

test("FIXTURE_10Y: 202 audit plans load into the calendar and resource summary", async ({ page }, testInfo) => {
  const fixture = generateCmpDemo10YearFixture("full-10y");
  const runtimeIssues = watchRuntime(page);
  const api = await installTenYearReadOnlyApi(page, fixture, session);
  const plansResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/audit-plans");
  await page.goto("/schedule");

  await expect(page.getByRole("heading", { name: "Lịch & nguồn lực" })).toBeVisible();
  const plans = await (await plansResponse).json();
  expect(plans).toHaveLength(202);
  expect(plans.every((plan) => plan.fixture_only && plan.certification_projects?.certification_applications?.customers?.company_name)).toBe(true);
  await expect(page.locator(".resource-summary-grid")).toContainText("202");
  await expect(page.getByRole("tab", { name: "Lịch tổng hợp" })).toBeVisible();

  for (const size of viewportSet(testInfo)) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `fixture-10y-schedule-${size.width}x${size.height}`, { fullPage: false });
  }

  expect(api.served.get("/audit-plans")).toBe(1);
  expect(runtimeIssues.apiResponses).toContainEqual({ method: "GET", path: "/audit-plans", status: 200 });
  expect(api.writes).toEqual([]);
  expect(runtimeIssues.issues).toEqual([]);
});

test("FIXTURE_10Y: work queue summarizes lifecycle tasks and supports status filtering", async ({ page }, testInfo) => {
  const fixture = generateCmpDemo10YearFixture("full-10y");
  const runtimeIssues = watchRuntime(page);
  const api = await installTenYearReadOnlyApi(page, fixture, session);
  const activeResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/my-work");
  await page.goto("/work");

  await expect(page.getByRole("heading", { name: "Công việc", exact: true })).toBeVisible();
  const activePayload = await (await activeResponse).json();
  expect(activePayload.items.length).toBeGreaterThan(0);
  expect(activePayload.items.every((item) => item.fixture_only && ["OPEN", "IN_PROGRESS"].includes(item.status))).toBe(true);
  await expect(page.locator(".my-tasks-kpi-grid-v2")).toContainText(String(activePayload.summary.total));

  for (const size of viewportSet(testInfo)) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `fixture-10y-work-${size.width}x${size.height}`, { fullPage: false });
  }

  const doneResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/my-work" && new URL(response.url()).searchParams.get("status") === "DONE");
  await page.getByRole("combobox", { name: "Lọc trạng thái" }).click();
  await page.getByText("Đã hoàn thành", { exact: true }).last().click();
  const donePayload = await (await doneResponse).json();
  expect(donePayload.items.length).toBeGreaterThan(0);
  expect(donePayload.items.every((item) => item.status === "DONE" && item.fixture_only)).toBe(true);
  expect(api.served.get("/my-work")).toBe(2);
  expect(runtimeIssues.apiResponses.filter(({ path, status }) => path === "/my-work" && status === 200)).toHaveLength(2);
  expect(api.writes).toEqual([]);
  expect(runtimeIssues.issues).toEqual([]);
});

test("FIXTURE_10Y: certificate previews stay visibly non-legal and cannot expose official links", async ({ page }, testInfo) => {
  const fixture = generateCmpDemo10YearFixture("full-10y");
  const runtimeIssues = watchRuntime(page);
  const api = await installTenYearReadOnlyApi(page, fixture, session);
  await page.goto("/certificates");

  await expect(page.getByRole("heading", { name: "Chứng chỉ" })).toBeVisible();
  await expect(page.getByText("Đang hiển thị dữ liệu mô phỏng FIXTURE_10Y")).toBeVisible();
  await expect(page.getByRole("button", { name: fixture.certificates[0].certificate_number }).first()).toBeVisible();
  expect(fixture.certificates).toHaveLength(50);
  expect(fixture.certificates.every((certificate) => certificate.fixture_only && !certificate.legal_effect && !certificate.public_verification_enabled)).toBe(true);

  for (const size of viewportSet(testInfo)) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `fixture-10y-certificate-previews-${size.width}x${size.height}`, { fullPage: false });
  }

  await page.getByRole("button", { name: "Chi tiết" }).first().click();
  const detail = page.locator(".certificate-detail-drawer");
  await expect(detail).toBeVisible();
  await expect(detail.getByText(/KHÔNG CÓ GIÁ TRỊ CHỨNG NHẬN/)).toBeVisible();
  await expect(detail.getByRole("button", { name: "Chưa có PDF" })).toBeDisabled();
  await expect(detail.getByRole("button", { name: "Tra cứu công khai" })).toHaveCount(0);
  await expect(detail.getByRole("button", { name: "Tải QR" })).toHaveCount(0);
  await captureVisualBaseline(page, testInfo, "fixture-10y-certificate-preview-detail", { fullPage: false });

  await expect.poll(() => runtimeIssues.apiResponses.some(({ method, path, status }) => method === "GET" && /^\/certificates\/[^/]+$/.test(path) && status === 200)).toBe(true);
  await page.keyboard.press("Escape");
  await page.locator(".certificate-filter-bar input.ant-input").fill(fixture.certificates[0].certificate_number);
  if (testInfo.project.name === "mobile-390x844") {
    await expect(page.locator(".cmp-responsive-card")).toHaveCount(1);
  } else {
    await expect(page.locator(".certificates-list-card .ant-table-row")).toHaveCount(1);
  }
  expect(api.served.get("/certificates")).toBe(1);
  expect(runtimeIssues.apiResponses).toContainEqual({ method: "GET", path: "/certificates", status: 200 });
  expect(api.writes).toEqual([]);
  expect(runtimeIssues.issues).toEqual([]);
});
