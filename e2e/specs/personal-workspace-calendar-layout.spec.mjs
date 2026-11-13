import { expect, test } from "@playwright/test";

import { captureVisualBaseline, expectNoHorizontalOverflow, watchRuntimeIssues } from "../helpers/quality.mjs";

const session = {
  access_token: "browser-fixture-not-a-credential",
  user: {
    id: "browser-qa-user",
    username: "browser.qa",
    full_name: "Browser QA User",
    email: "browser.qa@example.invalid",
    roles: ["ADMIN"],
  },
};

const calendarItems = Array.from({ length: 24 }, (_, index) => {
  const date = index < 4
    ? "2026-10-18"
    : `${2024 + (index % 3)}-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 24) + 1).padStart(2, "0")}`;
  const type = ["AUDIT", "WORK_DUE", "REVIEW_DUE", "DECISION_DUE", "CERTIFICATE_ACTION_DUE"][index % 5];
  return {
    id: `demo-calendar-${String(index + 1).padStart(3, "0")}`,
    type,
    title: `${type === "AUDIT" ? "Đánh giá" : "Xử lý nghiệp vụ"} DEMO ${String(index + 1).padStart(2, "0")}`,
    start: `${date}T09:00:00+07:00`,
    end: `${date}T17:00:00+07:00`,
    all_day: false,
    project_id: `demo-case-${String((index % 20) + 1).padStart(3, "0")}`,
    project_code: `DEMO-HS-${String((index % 20) + 1).padStart(3, "0")}`,
    organization_name: `Công ty Mẫu CMP ${String((index % 20) + 1).padStart(3, "0")}`,
    role_in_event: index % 2 ? "auditor" : "lead_auditor",
    status: index % 2 ? "pending" : "planned",
    destination_path: `/certifications/demo-case-${String((index % 20) + 1).padStart(3, "0")}`,
    context: { cycle_key: "initial_certification" },
  };
});

const tasks = Array.from({ length: 12 }, (_, index) => ({
  id: `demo-task-${String(index + 1).padStart(3, "0")}`,
  work_type: ["APPLICATION_REVIEW", "AUDIT_PLAN", "CAP_ACTION_OR_REVIEW", "TECHNICAL_REVIEW"][index % 4],
  action_code: "REVIEW",
  title: `Hồ sơ DEMO ${String(index + 1).padStart(3, "0")}`,
  description: "Công việc mô phỏng, không ghi vào hệ thống.",
  priority: index === 0 ? "URGENT" : index < 4 ? "HIGH" : "NORMAL",
  status: index % 3 ? "OPEN" : "IN_PROGRESS",
  entity_type: "CERTIFICATION_PROJECT",
  entity_id: `demo-case-${String(index + 1).padStart(3, "0")}`,
  project_id: `demo-case-${String(index + 1).padStart(3, "0")}`,
  project_code: `DEMO-HS-${String(index + 1).padStart(3, "0")}`,
  organization_name: `Công ty Mẫu CMP ${String(index + 1).padStart(3, "0")}`,
  assignee: "Browser QA User",
  due_at: `2026-10-${String(16 + (index % 12)).padStart(2, "0")}T17:00:00+07:00`,
  is_overdue: index < 2,
  sla_state: index < 2 ? "OVERDUE" : "ON_TRACK",
  sla_label: index < 2 ? "Quá hạn" : "Trong hạn",
  days_until_due: index < 2 ? null : index,
  days_overdue: index < 2 ? 2 - index : 0,
  escalation_level: null,
  destination_path: `/certifications/demo-case-${String(index + 1).padStart(3, "0")}`,
  context: { cycle_key: "initial_certification" },
  can_execute: true,
  can_view: true,
  is_delegated: false,
  created_at: "2026-10-01T09:00:00+07:00",
  updated_at: "2026-10-18T08:00:00+07:00",
}));

const workspace = {
  generated_at: "2026-10-18T08:00:00+07:00",
  user_context: {
    current_user: { id: session.user.id, username: session.user.username, full_name: session.user.full_name, email: session.user.email },
    active_roles: ["ADMIN"],
    primary_persona: "ADMIN",
    personas: ["ADMIN"],
    allowed_sections: ["dashboard", "my-tasks", "my-calendar"],
  },
  work_summary: { open: 12, in_progress: 4, overdue: 2, due_soon: 5, high_priority: 4 },
  priority_work_items: [],
  calendar_items: calendarItems,
  role_kpis: [],
  exceptions: [],
  recent_records: [],
  meta: { data_sources: ["controlled-fixture"], sales_assignment_limitation: null },
};

async function openWorkspace(page) {
  const runtime = watchRuntimeIssues(page);
  const writes = [];
  await page.clock.install({ time: new Date("2026-10-18T08:00:00+07:00") });
  await page.addInitScript((value) => window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value)), session);
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      writes.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ message: "Controlled fixture is read-only" }) });
      return;
    }
    let body = [];
    if (path === "/auth/me") {
      body = { user: { ...session.user, permissions: ["projects.read", "applications.read", "audit_plans.read"] } };
    } else if (path === "/platform-branding") {
      body = { organization_name: "Tổ chức chứng nhận mẫu", platform_name: "CMP" };
    } else if (path === "/me/workspace") {
      body = workspace;
    } else if (path === "/my-work") {
      body = {
        generated_at: workspace.generated_at,
        summary: { total: tasks.length, overdue: 2, due_soon: 5, high_priority: 4 },
        filter: { limit: 200 },
        items: tasks,
      };
    } else if (path.startsWith("/notifications")) {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    }
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });
  return { runtime, writes };
}

test("personal calendar keeps events readable and navigable at desktop and mobile sizes", async ({ page }, testInfo) => {
  const { runtime, writes } = await openWorkspace(page);
  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "Lịch", exact: true })).toBeVisible();

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];
  if (testInfo.project.name === "desktop-1440x900") {
    await expect(page.locator(".my-calendar-layout")).toBeVisible();
    for (const size of sizes) {
      await page.setViewportSize(size);
      await expectNoHorizontalOverflow(page);
      await expect(page.locator(".my-calendar-month-card .ant-picker-calendar")).toBeVisible();
      await captureVisualBaseline(page, testInfo, `personal-calendar-month-${size.width}`, { fullPage: false });
    }
  } else {
    await expect(page.getByText("Danh sách lịch")).toBeVisible();
    await expect(page.locator(".my-calendar-agenda-row")).toHaveCount(12);
    await expectNoHorizontalOverflow(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await captureVisualBaseline(page, testInfo, "personal-calendar-agenda-390", { fullPage: false });

    await page.locator(".my-calendar-screen > .screen-heading-row .ant-segmented-item").filter({ hasText: "Tháng" }).click();
    await expect(page.locator(".my-calendar-layout")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await captureVisualBaseline(page, testInfo, "personal-calendar-month-390", { fullPage: false });
  }

  await expect(page.getByRole("button", { name: /Đánh giá DEMO 01/ })).toBeVisible();
  await expect(page.getByText(/\+2 lịch khác/i)).toBeVisible();
  await expect(page.locator(".my-calendar-layout .my-calendar-agenda-row")).toHaveCount(4);
  await page.locator(".my-calendar-screen > .screen-heading-row .ant-segmented-item").filter({ hasText: "Danh sách" }).click();
  await expect(page.getByText("Danh sách lịch")).toBeVisible();
  await expect(page.locator(".my-calendar-agenda-row")).toHaveCount(12);
  const nextPage = page.locator(".my-calendar-screen .ant-pagination-next");
  await expect(nextPage).toBeVisible();
  await nextPage.click();
  await expect(page.locator(".my-calendar-agenda-row")).toHaveCount(12);
  await captureVisualBaseline(page, testInfo, `personal-calendar-agenda-${testInfo.project.name}`, { fullPage: false });

  await expect(page.getByRole("button", { name: "Xem lịch đánh giá" }).first()).toBeEnabled();
  expect(writes).toEqual([]);
  runtime.assertClean();
});

test("my work filters stay usable with a dense fixture on desktop and mobile", async ({ page }, testInfo) => {
  const { runtime, writes } = await openWorkspace(page);
  await page.goto("/work");
  await expect(page.getByRole("heading", { name: "Công việc" })).toBeVisible();
  await expect(page.locator(".my-tasks-screen")).toBeVisible();

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await expect(page.locator(".my-tasks-screen")).toContainText("12");
    await captureVisualBaseline(page, testInfo, `my-work-${size.width}`, { fullPage: false });
  }

  expect(writes).toEqual([]);
  runtime.assertClean();
});


// Server-paged API fixture: this is browser contract QA, not a SQL staging UAT.
test("my work retrieves page 2 and searches beyond the first page", async ({ page }, testInfo) => {
  const { runtime, writes } = await openWorkspace(page);
  const requests = [];
  const allRows = Array.from({ length: 42 }, (_, index) => {
    const number = String(index + 1).padStart(3, "0");
    return {
      ...tasks[0],
      id: `paged-task-${number}`,
      title: `Xử lý hồ sơ mẫu ${number}`,
      project_code: `DEMO-HS-2026-${number}`,
      project_id: `demo-case-${number}`,
      entity_id: `demo-case-${number}`,
      destination_path: `/certifications/demo-case-${number}`,
    };
  });
  await page.route(/\/my-work(?:\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const requestPage = Number(url.searchParams.get("page") ?? "1");
    const size = Number(url.searchParams.get("limit") ?? "20");
    const keyword = (url.searchParams.get("search") ?? "").toLocaleLowerCase("vi");
    requests.push(Object.fromEntries(url.searchParams));
    const matched = allRows.filter((item) => !keyword
      || [item.title, item.project_code, item.organization_name].join(" ").toLocaleLowerCase("vi").includes(keyword));
    const items = matched.slice((requestPage - 1) * size, requestPage * size);
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        generated_at: workspace.generated_at,
        summary: { total: allRows.length, overdue: 0, due_soon: 0, high_priority: 0 },
        filter: { limit: size, page: requestPage },
        pagination: {
          page: requestPage, page_size: size, total: matched.length,
          page_count: Math.ceil(matched.length / size), has_more: requestPage * size < matched.length,
        },
        items,
      }),
    });
  });

  await page.goto("/work");
  await expect(page.getByRole("heading", { name: "Công việc" })).toBeVisible();
  await expect(page.locator(".my-tasks-screen")).toContainText("DEMO-HS-2026-001");
  await expect(page.locator(".my-tasks-screen")).not.toContainText("DEMO-HS-2026-021");
  await page.locator(".my-tasks-screen .ant-pagination-item-2").first().click();
  await expect(page.locator(".my-tasks-screen")).toContainText("DEMO-HS-2026-021");
  await expect(page.locator(".my-tasks-screen")).not.toContainText("DEMO-HS-2026-001");
  expect(requests.some((query) => query.page === "2" && query.limit === "20")).toBe(true);
  await expectNoHorizontalOverflow(page);
  await captureVisualBaseline(page, testInfo, "my-work-paged-second-page", { fullPage: false });

  await page.getByPlaceholder("Tìm mã hồ sơ, khách hàng hoặc nội dung công việc...").fill("DEMO-HS-2026-042");
  await expect(page.locator(".my-tasks-screen")).toContainText("DEMO-HS-2026-042");
  await expect(page.locator(".my-tasks-screen")).not.toContainText("DEMO-HS-2026-021");
  expect(requests.some((query) => query.search === "DEMO-HS-2026-042" && query.page === "1")).toBe(true);
  await expectNoHorizontalOverflow(page);
  expect(writes).toEqual([]);
  runtime.assertClean();
});


// The global-search fixture exercises live UI wiring, not real SQL search results.
test("global search uses authorized API paging and opens an exact customer and certificate", async ({ page }, testInfo) => {
  const { runtime, writes } = await openWorkspace(page);
  const queries = [];
  await page.route(/\/me\/global-search(?:\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q") ?? "";
    const type = url.searchParams.get("type") ?? "all";
    const pageNo = Number(url.searchParams.get("page") ?? "1");
    queries.push({ q, type, pageNo });
    const types = type === "all" ? ["customer", "certificate"] : [type];
    const items = types.flatMap((kind) => kind === "customer"
      ? [{ key: "customer:client-100", type: "customer", title: "Công ty Đông Á", description: "Khách hàng · C100", entity_id: "client-100", project_id: null, destination_path: null }]
      : kind === "certificate" ? [{
        key: "certificate:cert-500", type: "certificate", title: "CERT-2026-500",
        description: "Công ty Đông Á · ISO 9001 · active", entity_id: "cert-500", project_id: "case-500",
        destination_path: "/certifications/case-500/certificates/cert-500",
      }] : []);
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ query: q, type, items,
        totals: { customer: 23, certificate: 1 },
        pagination: { page: pageNo, page_size: type === "all" ? 5 : 10,
          total: type === "customer" ? 23 : items.length, page_count: type === "customer" ? 3 : 1,
          has_more: type === "customer" && pageNo < 3, grouped_preview: type === "all" },
      }),
    });
  });
  await page.goto("/");
  await page.locator(".global-search-trigger").click();
  await expect(page.getByText("Tìm kiếm toàn hệ thống", { exact: true })).toBeVisible();
  await page.getByPlaceholder("Tìm khách hàng, đơn, hồ sơ, chứng chỉ, công việc...").fill("dong a");
  await expect(page.locator(".search-result-area")).toContainText("Công ty Đông Á");
  await expect(page.locator(".search-result-area")).toContainText("CERT-2026-500");
  expect(queries.some((query) => query.type === "all" && query.q === "dong a")).toBe(true);
  await page.locator(".global-search-controls .ant-select").click();
  await page.getByTitle("Khách hàng").last().click();
  await expect(page.locator(".search-result-area")).toContainText("23 kết quả");
  await page.locator(".search-result-area .ant-pagination-item-2").click();
  await expect.poll(() => queries.some((query) => query.type === "customer" && query.pageNo === 2)).toBe(true);
  await expectNoHorizontalOverflow(page);
  await captureVisualBaseline(page, testInfo, "global-search-paged", { fullPage: false });
  expect(writes).toEqual([]);
  runtime.assertClean();
});
