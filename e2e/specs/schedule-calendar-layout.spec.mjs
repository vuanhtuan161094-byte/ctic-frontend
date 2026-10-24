import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
} from "../helpers/quality.mjs";
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

const projects = Array.from({ length: 16 }, (_, index) => ({
  id: `project-${index + 1}`,
  project_code: `PRJ-2026-${String(index + 1).padStart(3, "0")}`,
  status: "in_progress",
  certification_applications: {
    id: `application-${index + 1}`,
    application_code: `DK-2026-${String(index + 1).padStart(4, "0")}`,
    standard_name: "ISO 9001:2015",
    certification_scope: "Thiết kế, sản xuất và bảo trì thiết bị công nghiệp.",
    customers: {
      id: `customer-${index + 1}`,
      customer_code: `DEMO-CMP-${String(index + 1).padStart(3, "0")}`,
      company_name: `Công ty Mẫu CMP ${String(index + 1).padStart(2, "0")}`,
    },
  },
}));

const makePlan = (index, overrides = {}) => {
  const project = projects[index];
  return {
    id: `plan-${index + 1}`,
    project_id: project.id,
    audit_event_id: `event-${index + 1}`,
    plan_code: `PLAN-2026-${String(index + 1).padStart(3, "0")}`,
    version_no: 1,
    audit_type: "stage2",
    planned_start_date: "2026-10-20",
    planned_end_date: "2026-10-22",
    location: "Thành phố Hồ Chí Minh",
    audit_scope: "Quản lý chất lượng và vận hành sản xuất.",
    audit_criteria: "ISO 9001:2015",
    audit_objectives: "Đánh giá mức độ phù hợp và hiệu lực.",
    status: index < 6 ? "draft" : index < 12 ? "planned" : index === 12 ? "in_progress" : index === 13 ? "completed" : "cancelled",
    created_at: "2026-10-01T09:00:00Z",
    certification_projects: project,
    audit_event: {
      sequence_no: index + 1,
      planned_mandays: 12,
      event_type: "stage2",
      audit_programs: {
        program_code: `PROGRAM-${index + 1}`,
        organization_name: project.certification_applications.customers.company_name,
        standard_name: "ISO 9001:2015",
      },
    },
    ...overrides,
  };
};

const plans = [
  ...projects.slice(0, 15).map((_, index) => makePlan(index)),
  makePlan(15, {
    audit_event_id: "event-spans-months",
    audit_type: "surveillance",
    plan_code: "PLAN-2026-SPAN",
    planned_start_date: "2026-09-30",
    planned_end_date: "2026-10-02",
    status: "planned",
  }),
  makePlan(0, {
    id: "plan-1-version-2",
    plan_code: "PLAN-2026-001-V2",
    version_no: 2,
    created_at: "2026-10-05T09:00:00Z",
  }),
];

const experts = Array.from({ length: 20 }, (_, index) => ({
  id: `expert-${index + 1}`,
  full_name: `Chuyên gia đánh giá ${String(index + 1).padStart(2, "0")}`,
  email: `expert-${index + 1}@example.invalid`,
  status: "active",
}));

const makeCaseWorkspace = (projectId) => {
  const project = projects.find((candidate) => candidate.id === projectId);
  const plan = plans.find((candidate) => candidate.project_id === projectId);
  const customer = project?.certification_applications.customers;
  const identity = {
    id: projectId,
    case_reference: project?.project_code ?? projectId,
    application_id: project?.certification_applications.id ?? `application-${projectId}`,
    application_reference: project?.certification_applications.application_code ?? `application-${projectId}`,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };
  return {
    contract_version: "2.0",
    identity,
    customer: { id: customer?.id ?? `customer-${projectId}`, code: customer?.customer_code ?? null, name: customer?.company_name ?? "Khách hàng mẫu" },
    standards_scope: {
      standards: [{ display_name: "ISO 9001:2015" }],
      display_name: "ISO 9001:2015",
      certification_scope: "Quản lý chất lượng và vận hành sản xuất.",
      certification_type: "Chứng nhận lần đầu",
      sites: [],
    },
    cycles: [{
      key: "initial_certification",
      type: "initial",
      label: "Chứng nhận lần đầu",
      description: "Chu kỳ chứng nhận lần đầu.",
      sequence_no: 1,
      plan_ids: plan ? [plan.id] : [],
      plan_codes: plan ? [plan.plan_code] : [],
      planned_start_date: plan?.planned_start_date ?? null,
      planned_end_date: plan?.planned_end_date ?? null,
      planned_mandays: 12,
      summary: { total_items: 1, completed_items: 0, pending_items: 1, completion_percentage: 0, dossier_status: "in_progress" },
      stages: [{ item_no: 1, document_key: "stage2_audit_plan", document_name: "Kế hoạch đánh giá giai đoạn 2", storage_type: "system_record", status: "pending", reference_id: plan?.id ?? null }],
    }],
    current_cycle: { key: "initial_certification", label: "Chứng nhận lần đầu" },
    case_status: "in_progress",
    current_stage: { code: "stage2_audit_plan", label: "Kế hoạch đánh giá giai đoạn 2", status: "pending", source_id: plan?.id ?? null },
    responsibility: { label: "Điều phối đánh giá", action_code: null, work_item_id: null },
    next_action: null,
    allowed_actions: [],
    blockers: [],
    sla: { applicability: "NOT_APPLICABLE", status: "NOT_APPLICABLE", due_at: null, remaining_days: null },
    team_summary: {
      status: "NOT_CONFIGURED",
      appointment: null,
      members: [],
      planned_mandays: null,
      competence: { status: "NOT_CONFIGURED", reasons: [] },
      independence: { status: "NOT_CONFIGURED", reasons: [] },
      blockers: [],
    },
    document_summary: { total: 0, groups: [] },
    recent_activity: { contract_version: "2.0", items: [], page: { limit: 8, next_cursor: null, has_more: false } },
    links: {
      self: { route_name: "certification_case.overview", params: { id: projectId }, query: {}, legacy_path: null, contract_version: "2.0" },
      activity: { route_name: "certification_case.activity", params: { id: projectId }, query: {}, legacy_path: null, contract_version: "2.0" },
      legacy_project: `/certifications/${projectId}`,
      legacy_dossier: `/certifications/${projectId}`,
      legacy_alerts: `/certifications/${projectId}`,
    },
    projection_meta: { generated_at: "2026-10-18T08:00:00+07:00", bounded: true, mutation_capable: false },
  };
};

async function openSchedule(page, { plans: fixturePlans = plans, projects: fixtureProjects = projects, experts: fixtureExperts = experts, fixtureDate = "2026-10-18T08:00:00+07:00" } = {}) {
  const runtimeErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => runtimeErrors.push(`requestfailed: ${request.method()} ${request.url()}`));
  page.on("response", (response) => {
    if (response.status() >= 500) runtimeErrors.push(`http-${response.status()}: ${response.url()}`);
  });
  await page.clock.install({ time: new Date(fixtureDate) });
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
      body = { user: { ...session.user, permissions: ["projects.read", "experts.read", "audit_plans.read"] } };
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
    } else if (/^\/certification-cases\/[^/]+\/workspace$/.test(path)) {
      body = makeCaseWorkspace(path.split("/")[2]);
    } else if (/^\/certification-projects\/[^/]+\/dossier$/.test(path)) {
      const projectId = path.split("/")[2];
      const project = fixtureProjects.find((candidate) => candidate.id === projectId);
      const customer = project?.certification_applications.customers;
      const projectPlans = fixturePlans.filter((plan) => plan.project_id === projectId);
      body = {
        project: {
          id: projectId,
          project_code: project?.project_code ?? projectId,
          status: "in_progress",
          customer,
          standard_name: "ISO 9001:2015",
          certification_scope: "Quản lý chất lượng và vận hành sản xuất.",
        },
        summary: { total_items: 0, completed_items: 0, pending_items: 0, completion_percentage: 0, dossier_status: "in_progress" },
        items: [],
        common_items: [],
        dossiers: [{
          dossier_key: "initial_certification",
          dossier_type: "initial",
          dossier_label: "Hồ sơ chứng nhận lần đầu",
          sequence_no: 1,
          plan_ids: projectPlans.map((plan) => plan.id),
          plan_codes: projectPlans.map((plan) => plan.plan_code),
          summary: { total_items: 0, completed_items: 0, pending_items: 0, completion_percentage: 0, dossier_status: "in_progress" },
          items: [],
        }],
        current_dossier_key: "initial_certification",
        source_records: {},
        files: [],
        diagnostics: [],
      };
    } else if (/^\/certification-projects\/[^/]+\/alerts/.test(path)) {
      body = { warning_days: 90, generated_at: fixtureDate, summary: { total: 0, critical: 0, warning: 0, info: 0 }, alerts: [] };
    } else if (/^\/certification-projects\/[^/]+$/.test(path)) {
      const projectId = path.split("/")[2];
      const project = fixtureProjects.find((candidate) => candidate.id === projectId);
      body = {
        ...project,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
        audit_plans: fixturePlans.filter((plan) => plan.project_id === projectId),
      };
    } else if (path === "/certification-projects") {
      body = fixtureProjects;
    } else if (path === "/audit-plans") {
      body = fixturePlans;
    } else if (path === "/audit-team-appointments") {
      body = [];
    } else if (path === "/experts") {
      body = fixtureExperts;
    }
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: "Lịch & nguồn lực" })).toBeVisible();
  await expect(page.locator(".resource-month-calendar")).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    const governanceNavigationItem = page.getByRole("menuitem", { name: "Thay đổi, khiếu nại & kháng nghị" });
    await expect(governanceNavigationItem).toHaveAttribute("title", "Thay đổi, khiếu nại & kháng nghị");
  }
  expect(runtimeErrors).toEqual([]);
  return runtimeErrors;
}

async function expectSingleDateLabels(page) {
  const dateCells = page.locator(".resource-calendar-desktop .ant-picker-cell");
  await expect(dateCells).toHaveCount(42);
  const labelsPerCell = await dateCells.evaluateAll((cells) => cells.map((cell) => (
    cell.querySelectorAll(".ant-picker-calendar-date-value").length
  )));
  expect(labelsPerCell.every((count) => count === 1)).toBe(true);
  await expect(page.locator(".resource-calendar-cell .ant-picker-calendar-date-value")).toHaveCount(0);
}

test("desktop calendar uses one day label, compact cells, and reachable overlap actions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900", "desktop interaction and grid evidence");
  const runtimeErrors = await openSchedule(page);

  for (const size of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await expectSingleDateLabels(page);

    const calendar = await page.locator(".resource-calendar-desktop").evaluate((element) => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
      visibleWeeks: Array.from(element.querySelectorAll(".ant-picker-body tbody tr")).filter((row) => (
        row.getBoundingClientRect().bottom <= window.innerHeight + 1
      )).length,
      weekRows: element.querySelectorAll(".ant-picker-body tbody tr").length,
    }));
    expect(calendar.width).toBeGreaterThan(0);
    expect(calendar.scrollWidth).toBeLessThanOrEqual(calendar.width);
    expect(calendar.weekRows).toBe(6);
    expect(calendar.visibleWeeks).toBeGreaterThanOrEqual(size.height <= 768 ? 5 : 6);

    const weekdayLabels = await page.locator(".resource-calendar-desktop .ant-picker-calendar thead th").allTextContents();
    expect(weekdayLabels).toEqual(["T2", "T3", "T4", "T5", "T6", "T7", "CN"]);
    for (const [date, label] of [["2026-10-01", "01"], ["2026-10-18", "18"], ["2026-10-31", "31"]]) {
      await expect(page.locator(`.resource-calendar-cell[data-date="${date}"]`).locator("xpath=ancestor::td").locator(".ant-picker-calendar-date-value")).toHaveText(label);
    }
    const adjacentMonthCell = await page.locator('.resource-calendar-cell[data-date="2026-11-01"]').locator("xpath=ancestor::td").getAttribute("class");
    expect(adjacentMonthCell).not.toContain("ant-picker-cell-in-view");
    await captureVisualBaseline(page, testInfo, `schedule-calendar-${size.width}`, { fullPage: false });
  }

  const busyCell = page.locator('.resource-calendar-cell[data-date="2026-10-20"]');
  await expect(busyCell).toHaveAttribute("data-event-count", "15");
  await expect(busyCell.locator(".resource-calendar-event")).toHaveCount(1);
  await expect(busyCell.getByRole("button", { name: "Mở 14 đợt đánh giá khác" })).toHaveText("+14 đợt khác");
  const moreButton = busyCell.locator(".resource-calendar-more");
  await moreButton.focus();
  await page.keyboard.press("Enter");
  const popover = page.locator(".ant-popover:visible").last();
  await expect(popover.locator(".resource-calendar-event")).toHaveCount(14);
  await expect(popover.getByText("PLAN-2026-015 · Đã hủy")).toBeVisible();
  const popoverBounds = await popover.boundingBox();
  expect(popoverBounds).not.toBeNull();
  expect(popoverBounds.x).toBeGreaterThanOrEqual(0);
  expect(popoverBounds.x + popoverBounds.width).toBeLessThanOrEqual(1366);
  await page.keyboard.press("Escape");

  await page.getByRole("combobox", { name: "Lọc trạng thái" }).click();
  await page.locator(".ant-select-dropdown:visible").getByText("Đã lập kế hoạch", { exact: true }).click();
  await expect(page.locator('.resource-calendar-cell[data-date="2026-10-20"]')).toHaveAttribute("data-event-count", "6");
  await expect(page.locator('.resource-calendar-cell[data-date="2026-10-20"] .resource-calendar-more')).toHaveText("+5 đợt khác");

  await page.getByRole("combobox", { name: "Lọc trạng thái" }).click();
  await page.locator(".ant-select-dropdown:visible").getByText("Đang thực hiện", { exact: true }).click();
  const singleEvent = page.locator('.resource-calendar-cell[data-date="2026-10-20"]');
  await expect(singleEvent).toHaveAttribute("data-event-count", "1");
  await expect(singleEvent.locator(".resource-calendar-event.status-in_progress")).toHaveCount(1);
  await expect(singleEvent.locator(".resource-calendar-event")).toContainText("Đang làm");
  await expect(singleEvent.locator(".resource-calendar-event")).toHaveAttribute("aria-label", /Đang thực hiện/);
  await singleEvent.locator(".resource-calendar-event").focus();
  await page.keyboard.press("Enter");
  expect(runtimeErrors).toEqual([]);
  await expect(page).toHaveURL(/\/certifications\/project-13\?cycle=initial_certification$/);
  await expect(page.getByRole("heading", { name: "PRJ-2026-013" })).toBeVisible();
  await expect(page.locator(".cmp-case-cycle-bar")).toContainText("Chứng nhận lần đầu");

  expect(runtimeErrors).toEqual([]);
});

test("empty month is compact and clearly different from loading or error", async ({ page }, testInfo) => {
  const runtimeErrors = await openSchedule(page, { plans: [] });
  await expect(page.getByRole("status")).toContainText("Chưa có đợt đánh giá.");

  if (testInfo.project.name === "desktop-1440x900") {
    await page.setViewportSize({ width: 1366, height: 768 });
    await expectSingleDateLabels(page);
    const metrics = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      emptyDayHeight: document.querySelector('.resource-calendar-cell[data-event-count="0"]')?.closest("td")?.getBoundingClientRect().height ?? 0,
      calendarBottom: document.querySelector(".resource-calendar-desktop .ant-picker-calendar")?.getBoundingClientRect().bottom ?? 0,
    }));
    expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.emptyDayHeight).toBeLessThanOrEqual(64);
    expect(metrics.viewportHeight).toBe(768);
    await captureVisualBaseline(page, testInfo, "schedule-calendar-empty-1366", { fullPage: false });
    expect(metrics.calendarBottom).toBeLessThanOrEqual(metrics.viewportHeight + 8);
  } else {
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
    await expect(page.locator(".resource-calendar-mobile-view")).toBeVisible();
    await expect(page.locator(".resource-calendar-desktop")).toBeHidden();
    await expect(page.locator(".resource-calendar-empty")).toContainText("Tháng này chưa có đợt đánh giá");
    await captureVisualBaseline(page, testInfo, "schedule-calendar-empty-390", { fullPage: false });
  }
  expect(runtimeErrors).toEqual([]);
});

test("calendar preserves leap months, Monday-first locale, versions, and spanning plans", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900", "desktop date-grid coverage");
  const runtimeErrors = await openSchedule(page);

  await expect(page.locator('.resource-calendar-cell[data-date="2026-10-20"]')).toHaveAttribute("data-event-count", "15");
  await expect(page.locator('.resource-calendar-cell[data-date="2026-10-01"]')).toHaveAttribute("data-event-count", "1");
  await expect(page.locator('.resource-calendar-cell[data-date="2026-10-02"]')).toHaveAttribute("data-event-count", "1");
  await expectSingleDateLabels(page);
  await expect(page.locator(".resource-calendar-desktop .ant-picker-body tbody tr")).toHaveCount(6);

  await page.getByRole("button", { name: "Tháng trước" }).click();
  await expect(page.locator(".resource-calendar-toolbar-title")).toHaveText("Tháng 9 năm 2026");
  await page.getByRole("button", { name: "Hôm nay" }).click();
  await expect(page.locator(".resource-calendar-toolbar-title")).toHaveText("Tháng 10 năm 2026");
  await page.locator(".resource-calendar-desktop .ant-segmented").getByText("Năm", { exact: true }).click();
  await expect(page.locator(".resource-calendar-toolbar-title")).toHaveText("Năm 2026");
  await page.locator(".resource-calendar-desktop .ant-segmented").getByText("Tháng", { exact: true }).click();
  await expect(page.locator(".resource-calendar-toolbar-title")).toHaveText("Tháng 10 năm 2026");
  expect(runtimeErrors).toEqual([]);
});

test("calendar lays out leap February 2024 without inventing other dates", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900", "desktop date-grid coverage");
  await openSchedule(page, { plans: [], fixtureDate: "2024-02-15T08:00:00+07:00" });
  await expect(page.locator(".resource-calendar-toolbar-title")).toHaveText("Tháng 2 năm 2024");
  await expect(page.locator('.resource-calendar-cell[data-date="2024-02-29"]')).toHaveAttribute("data-event-count", "0");
  await expect(page.locator('.resource-calendar-desktop .ant-picker-cell-in-view')).toHaveCount(29);
  await expectSingleDateLabels(page);
});

test("calendar lays out non-leap February 2025 without a 29th day", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900", "desktop date-grid coverage");
  await openSchedule(page, { plans: [], fixtureDate: "2025-02-15T08:00:00+07:00" });
  await expect(page.locator(".resource-calendar-toolbar-title")).toHaveText("Tháng 2 năm 2025");
  await expect(page.locator('.resource-calendar-cell[data-date="2025-02-29"]')).toHaveCount(0);
  await expect(page.locator('.resource-calendar-desktop .ant-picker-cell-in-view')).toHaveCount(28);
  await expectSingleDateLabels(page);
});

test("calendar includes the end date in its final visible adjacent-month cell", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900", "desktop six-week grid coverage");
  const finalGridSpan = makePlan(14, {
    id: "plan-last-visible-grid-day",
    audit_event_id: "event-last-visible-grid-day",
    plan_code: "PLAN-2026-LAST-GRID",
    planned_start_date: "2026-10-31",
    planned_end_date: "2026-11-08",
    status: "planned",
  });
  await openSchedule(page, { plans: [...plans, finalGridSpan] });

  const finalVisibleCell = page.locator('.resource-calendar-cell[data-date="2026-11-08"]');
  await expect(finalVisibleCell).toHaveAttribute("data-event-count", "1");
  await expect(finalVisibleCell.locator(".resource-calendar-event")).toContainText("Công ty Mẫu CMP 15");
  await expectSingleDateLabels(page);
});

test("mobile calendar uses a readable agenda and retains month/year navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390x844", "mobile calendar coverage");
  const runtimeErrors = await openSchedule(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await expect(page.locator(".resource-calendar-desktop")).toBeHidden();
  await expect(page.getByRole("tab", { name: "Nguồn lực" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Nguồn lực" })).toHaveText("Nguồn lực");
  const filterColumnCount = await page.locator(".schedule-calendar-filters").evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.split(" ").length
  ));
  expect(filterColumnCount).toBe(2);
  await expect(page.locator(".resource-calendar-mobile-list .resource-calendar-event")).toHaveCount(16);
  await expect(page.getByRole("button", { name: /Công ty Mẫu CMP 01.*Đánh giá giai đoạn 2.*PLAN-2026-001/ })).toBeVisible();
  await expect(page.locator(".resource-calendar-mobile-list .resource-calendar-event").first()).toBeInViewport();
  await captureVisualBaseline(page, testInfo, "schedule-calendar-mobile-agenda-390", { fullPage: false });

  await page.locator(".resource-calendar-mobile-view").getByText("Năm", { exact: true }).click();
  await expect(page.locator(".resource-calendar-mobile-months .resource-calendar-mobile-month")).toHaveCount(12);
  await page.getByRole("button", { name: "Tháng 10, 16 đợt đánh giá" }).click();
  await expect(page.locator(".resource-calendar-mobile-title")).toHaveText("tháng 10 năm 2026");
  await expectNoHorizontalOverflow(page);
  expect(runtimeErrors).toEqual([]);
});

function tenYearCalendarApiData(scenario = "edge-cases") {
  const fixture = generateCmpDemo10YearFixture(scenario);
  const fixtureProjects = fixture.projects.map((project) => ({
    ...project,
    certification_applications: {
      ...project.certification_applications,
      customers: project.customer,
    },
  }));
  const projectById = new Map(fixtureProjects.map((project) => [project.id, project]));
  const auditTypes = {
    STAGE_1: "stage1",
    STAGE_2: "stage2",
    SURVEILLANCE_1: "surveillance",
    SURVEILLANCE_2: "surveillance",
    SPECIAL_AUDIT: "special_audit",
  };
  const fixturePlans = fixture.auditPlans.map((plan, index) => {
    const project = projectById.get(plan.project_id);
    const application = project?.certification_applications;
    const eventType = auditTypes[plan.audit_type] ?? "surveillance";
    return {
      ...plan,
      audit_event_id: `fixture-10y-event-${index + 1}`,
      version_no: 1,
      audit_type: eventType,
      location: plan.customer_id,
      audit_scope: application?.certification_scope ?? "Phạm vi giả lập",
      audit_criteria: application?.standard_name ?? "ISO 9001:2015",
      audit_objectives: "Dữ liệu giả lập để kiểm tra lịch và nguồn lực.",
      certification_projects: project,
      audit_event: {
        sequence_no: index + 1,
        planned_mandays: 1 + (index % 4),
        event_type: eventType,
        audit_programs: {
          program_code: `F10Y-PROGRAM-${index + 1}`,
          organization_name: project?.customer?.company_name
            ?? application?.customers?.company_name
            ?? `Khách hàng giả lập ${index + 1}`,
          standard_name: application?.standard_name ?? "ISO 9001:2015",
        },
      },
    };
  });
  const fixtureExperts = fixture.personnel.map((person) => ({
    id: person.id,
    employee_code: person.employee_code,
    full_name: person.full_name,
    email: person.email,
    status: person.status,
  }));
  return { fixture, fixtureProjects, fixturePlans, fixtureExperts };
}

test("10-year fixture calendar navigates 2016–2026 and renders dense October plans on desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900", "desktop multi-year calendar evidence");
  const { fixture, fixtureProjects, fixturePlans, fixtureExperts } = tenYearCalendarApiData();
  const runtimeErrors = await openSchedule(page, {
    plans: fixturePlans,
    projects: fixtureProjects,
    experts: fixtureExperts,
    fixtureDate: "2026-10-24T08:00:00+07:00",
  });
  await expect(page.locator('.resource-calendar-cell[data-date="2026-10-22"]')).toHaveAttribute("data-event-count", "12");
  await expect(page.locator('.resource-calendar-cell[data-date="2026-10-22"] .resource-calendar-more')).toHaveText("+11 đợt khác");
  await expect(page.locator(".resource-calendar-desktop .ant-picker-cell")).toHaveCount(42);
  await expectSingleDateLabels(page);

  for (const size of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    const screenshotName = `fixture-10y-calendar-${size.width}x${size.height}`;
    await captureVisualBaseline(page, testInfo, screenshotName, { fullPage: false });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator(".resource-calendar-desktop .ant-segmented").getByText("Năm", { exact: true }).click();
  await expect(page.locator(".resource-calendar-toolbar-title")).toHaveText("Năm 2026");
  for (let year = 2026; year > 2016; year -= 1) await page.getByRole("button", { name: "Năm trước" }).click();
  await expect(page.locator(".resource-calendar-toolbar-title")).toHaveText("Năm 2016");
  expect(fixture.range.start).toBe("2016-10-24");
  expect(fixture.range.end).toBe("2026-10-24");
  expect(runtimeErrors).toEqual([]);
});

test("10-year fixture calendar offers a mobile year agenda without overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390x844", "mobile calendar evidence");
  const { fixture, fixtureProjects, fixturePlans, fixtureExperts } = tenYearCalendarApiData();
  const runtimeErrors = await openSchedule(page, {
    plans: fixturePlans,
    projects: fixtureProjects,
    experts: fixtureExperts,
    fixtureDate: "2026-10-24T08:00:00+07:00",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".resource-calendar-mobile-toolbar .ant-segmented").getByText("Năm", { exact: true }).click();
  await expect(page.locator(".resource-calendar-mobile-title")).toHaveText("Năm 2026");
  const octoberPlanCount = fixture.auditPlans.filter((plan) => plan.planned_start_date.startsWith("2026-10")).length;
  await expect(page.getByRole("button", { name: new RegExp(`Tháng 10, ${octoberPlanCount} đợt đánh giá`) })).toBeVisible();
  await captureVisualBaseline(page, testInfo, "fixture-10y-calendar-mobile-year-2026", { fullPage: false });
  await expectNoHorizontalOverflow(page);
  expect(fixture.auditPlans.length).toBeGreaterThan(100);
  expect(runtimeErrors).toEqual([]);
});
