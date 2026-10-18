import { expect, test } from "@playwright/test";

import { captureVisualBaseline, expectNoHorizontalOverflow, watchRuntimeIssues } from "../helpers/quality.mjs";

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

const workspace = {
  generated_at: "2026-10-18T08:00:00+07:00",
  user_context: {
    current_user: { id: session.user.id, username: session.user.username, full_name: session.user.full_name, email: session.user.email },
    active_roles: ["ADMIN"],
    primary_persona: "ADMIN",
    personas: ["ADMIN"],
    allowed_sections: ["dashboard", "my-tasks", "my-calendar"],
  },
  work_summary: { open: 9, in_progress: 3, overdue: 2, due_soon: 4, high_priority: 3 },
  priority_work_items: Array.from({ length: 7 }, (_, index) => ({
    id: `demo-work-${index + 1}`,
    work_type: ["APPLICATION_REVIEW", "AUDIT_PLAN", "CAP_ACTION_OR_REVIEW", "TECHNICAL_REVIEW"][index % 4],
    title: `Xử lý hồ sơ DEMO ${String(index + 1).padStart(2, "0")}`,
    description: "Bản ghi mô phỏng phục vụ kiểm thử giao diện.",
    project_id: `demo-case-${index + 1}`,
    project_code: `DEMO-HS-2026-${String(index + 1).padStart(3, "0")}`,
    organization_name: `Công ty Mẫu CMP ${String(index + 1).padStart(3, "0")}`,
    audit_event_id: null,
    audit_plan_id: null,
    cycle_key: "initial_certification",
    assigned_role: "ADMIN",
    assignee: "Browser QA Admin",
    status: index < 2 ? "OPEN" : "IN_PROGRESS",
    priority: index === 0 ? "URGENT" : index < 3 ? "HIGH" : "NORMAL",
    due_at: `2026-10-${String(17 + index).padStart(2, "0")}T17:00:00+07:00`,
    is_overdue: index < 2,
    destination_path: `/certifications/demo-case-${index + 1}`,
    context: { cycle_key: "initial_certification" },
    can_execute: true,
    is_delegated: false,
    created_at: "2026-10-01T09:00:00+07:00",
    updated_at: "2026-10-18T08:00:00+07:00",
  })),
  calendar_items: Array.from({ length: 6 }, (_, index) => ({
    id: `demo-calendar-${index + 1}`,
    type: index % 2 ? "REVIEW_DUE" : "AUDIT",
    title: index % 2 ? "Hạn thẩm xét kỹ thuật" : "Đánh giá giám sát",
    start: `2026-10-${String(20 + index).padStart(2, "0")}T09:00:00+07:00`,
    end: `2026-10-${String(20 + index).padStart(2, "0")}T17:00:00+07:00`,
    all_day: false,
    project_id: `demo-case-${index + 1}`,
    project_code: `DEMO-HS-2026-${String(index + 1).padStart(3, "0")}`,
    organization_name: `Công ty Mẫu CMP ${String(index + 1).padStart(3, "0")}`,
    role_in_event: "lead_auditor",
    status: index % 2 ? "pending" : "planned",
    destination_path: `/certifications/demo-case-${index + 1}`,
    context: { cycle_key: "initial_certification" },
  })),
  role_kpis: [
    { key: "open_work", label: "Công việc đang mở", value: 9, tone: "attention", destination_path: "/my-tasks", persona: "ADMIN" },
    { key: "overdue_work", label: "Công việc quá hạn", value: 2, tone: "danger", destination_path: "/my-tasks", persona: "ADMIN" },
    { key: "due_soon", label: "Sắp đến hạn", value: 4, tone: "warning", destination_path: "/my-tasks", persona: "ADMIN" },
    { key: "audit_events", label: "Lịch đánh giá", value: 6, tone: "info", destination_path: "/schedule", persona: "ADMIN" },
    { key: "review_queue", label: "Hồ sơ cần thẩm xét", value: 3, tone: "positive", destination_path: "/projects", persona: "ADMIN" },
  ],
  exceptions: Array.from({ length: 2 }, (_, index) => ({
    id: `demo-exception-${index + 1}`,
    type: "OVERDUE_WORK",
    severity: "critical",
    title: `Hồ sơ DEMO ${index + 1} quá hạn`,
    message: "Cần kiểm tra trách nhiệm và thời hạn theo dữ liệu công việc.",
    due_at: `2026-10-${String(16 + index).padStart(2, "0")}T17:00:00+07:00`,
    destination_path: `/certifications/demo-case-${index + 1}`,
    context: { cycle_key: "initial_certification" },
  })),
  recent_records: Array.from({ length: 4 }, (_, index) => ({
    id: `demo-recent-${index + 1}`,
    record_type: "certification_case",
    title: `Cập nhật hồ sơ DEMO ${index + 1}`,
    project_code: `DEMO-HS-2026-${String(index + 1).padStart(3, "0")}`,
    organization_name: `Công ty Mẫu CMP ${String(index + 1).padStart(3, "0")}`,
    status: "in_progress",
    occurred_at: `2026-10-${String(18 - index).padStart(2, "0")}T10:00:00+07:00`,
    destination_path: `/certifications/demo-case-${index + 1}`,
    context: null,
  })),
  meta: { due_soon_days: 7, certificate_warning_days: 90, data_sources: ["controlled-fixture"], sales_assignment_limitation: null },
};

test("personal dashboard scans priority work and stays usable at desktop and mobile sizes", async ({ page }, testInfo) => {
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
      body = { user: { ...session.user, permissions: ["projects.read", "audit_plans.read", "experts.read"] } };
    } else if (path === "/platform-branding") {
      body = { organization_name: "Tổ chức chứng nhận mẫu", platform_name: "CMP" };
    } else if (path === "/me/workspace") {
      body = workspace;
    } else if (path.startsWith("/notifications")) {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    }
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tổng quan vận hành" })).toBeVisible();
  const cards = page.locator(".personal-kpi-card");
  await expect(cards).toHaveCount(5);
  await expect(page.locator(".personal-work-row")).toHaveCount(7);
  await expect(page.locator(".personal-dashboard-main-grid .ant-card").first()).toContainText("Công việc ưu tiên");

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    const geometry = await cards.evaluateAll((items) => {
      const boxes = items.map((item) => {
        const { top, width } = item.getBoundingClientRect();
        return { top, width };
      });
      return {
        rows: new Set(boxes.map(({ top }) => Math.round(top))).size,
        minWidth: Math.min(...boxes.map(({ width }) => width)),
      };
    });
    if (size.width <= 720) {
      expect(geometry.rows).toBe(3);
      expect(geometry.minWidth).toBeGreaterThanOrEqual(150);
      const headerBounds = await page.locator(".personal-dashboard-heading").boundingBox();
      const refreshBounds = await page.getByRole("button", { name: "Làm mới" }).boundingBox();
      expect(headerBounds?.height ?? Number.POSITIVE_INFINITY).toBeLessThan(100);
      expect(refreshBounds?.width ?? Number.POSITIVE_INFINITY).toBeLessThan(150);
    } else if (size.width >= 1280) {
      expect(geometry.rows).toBe(1);
    }
    await captureVisualBaseline(page, testInfo, `personal-dashboard-${size.width}`, { fullPage: false });
  }

  await page.getByRole("button", { name: "Xem tất cả công việc" }).click();
  await expect(page).toHaveURL(/\/work$/);
  expect(writes).toEqual([]);
  runtime.assertClean();
});
