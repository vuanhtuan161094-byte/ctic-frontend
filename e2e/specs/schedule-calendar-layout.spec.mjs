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

const projects = Array.from({ length: 6 }, (_, index) => ({
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
      customer_code: `KH-2026-${String(index + 1).padStart(4, "0")}`,
      company_name: `Công ty Cổ phần Giải pháp Công nghiệp và Chuỗi Cung ứng Miền Đông Nam Bộ ${index + 1}`,
    },
  },
}));

const plans = projects.map((project, index) => ({
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
  status: index % 2 ? "draft" : "planned",
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
}));

const experts = Array.from({ length: 20 }, (_, index) => ({
  id: `expert-${index + 1}`,
  full_name: `Chuyên gia đánh giá ${String(index + 1).padStart(2, "0")}`,
  email: `expert-${index + 1}@example.invalid`,
  status: "active",
}));

async function openSchedule(page) {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => runtimeErrors.push(`requestfailed: ${request.method()} ${request.url()}`));
  page.on("response", (response) => {
    if (response.status() >= 500) runtimeErrors.push(`http-${response.status()}: ${response.url()}`);
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
    } else if (path === "/certification-projects") {
      body = projects;
    } else if (path === "/audit-plans") {
      body = plans;
    } else if (path === "/audit-team-appointments") {
      body = [];
    } else if (path === "/experts") {
      body = experts;
    }
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: "Lịch & nguồn lực" })).toBeVisible();
  await expect(page.locator(".resource-month-calendar")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
  return runtimeErrors;
}

test("schedule calendar compacts empty days and keeps every event reachable", async ({ page }, testInfo) => {
  const runtimeErrors = await openSchedule(page);
  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    const calendar = await page.locator(".resource-month-calendar").evaluate((element) => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
      emptyDateContentHeight: element.querySelector('.resource-calendar-cell[data-event-count="0"]')?.parentElement?.getBoundingClientRect().height ?? 0,
    }));
    expect(calendar.width).toBeGreaterThan(0);
    expect(calendar.emptyDateContentHeight).toBeLessThan(60);
    await captureVisualBaseline(page, testInfo, `schedule-calendar-${size.width}`);
  }

  const busyCell = page.locator('.resource-calendar-cell[data-event-count="6"]').first();
  await expect(busyCell.locator(".resource-calendar-event")).toHaveCount(1);
  const moreButton = busyCell.locator(".resource-calendar-more");
  await expect(moreButton).toHaveText("+5 đợt khác");
  const moreButtonFits = await busyCell.evaluate((cell) => {
    const button = cell.querySelector(".resource-calendar-more");
    return button.getBoundingClientRect().bottom <= cell.getBoundingClientRect().bottom + 1;
  });
  expect(moreButtonFits).toBe(true);
  await moreButton.click();
  const popover = page.locator(".ant-popover:visible").last();
  await expect(popover.locator(".resource-calendar-event")).toHaveCount(5);
  await expect(popover.getByText("PLAN-2026-006")).toBeVisible();
  await page.keyboard.press("Escape");

  if (testInfo.project.name === "desktop-1440x900") {
    await page.getByRole("tab", { name: "Tải nguồn lực" }).click();
    await expect(page.locator(".schedule-workspace-panel .ant-table-tbody tr:not(.ant-table-measure-row)")).toHaveCount(12);
    await captureVisualBaseline(page, testInfo, "schedule-resource-load-1366");
  }

  expect(runtimeErrors).toEqual([]);
});
