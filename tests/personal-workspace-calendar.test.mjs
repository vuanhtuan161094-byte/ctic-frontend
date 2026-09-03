import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shell = await readFile(new URL("../app/components/DashboardShell.tsx", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../app/components/PersonalDashboardScreen.tsx", import.meta.url), "utf8");
const calendar = await readFile(new URL("../app/components/MyCalendarScreen.tsx", import.meta.url), "utf8");
const tasks = await readFile(new URL("../app/components/MyTasksScreen.tsx", import.meta.url), "utf8");
const types = await readFile(new URL("../app/types/personal-workspace.ts", import.meta.url), "utf8");

test("dashboard consumes one coherent personal workspace projection", () => {
  assert.match(shell, /api\.get<PersonalWorkspace>\("\/me\/workspace"\)/);
  assert.doesNotMatch(shell, /\/notifications\/me\/tasks/);
});

test("Coordinator dashboard renders server-projected KPI sections", () => {
  assert.match(dashboard, /workspace\.role_kpis/);
  assert.match(dashboard, /Chỉ số theo vai trò/);
});

test("Lead Auditor receives the same audit-oriented personal projection component", () => {
  assert.match(dashboard, /Lịch sắp tới của tôi/);
  assert.match(types, /role_in_event/);
});

test("Technical Reviewer UI is projection-driven instead of reconstructing role permissions", () => {
  assert.doesNotMatch(dashboard, /personas\.includes\("TECHNICAL_REVIEWER"\)/);
  assert.match(dashboard, /role_kpis/);
});

test("Decision Maker UI is projection-driven and opens exact server destination", () => {
  assert.match(dashboard, /onOpenPath\(kpi\.destination_path\)/);
  assert.doesNotMatch(dashboard, /personas\.includes\("DECISION_MAKER"\)/);
});

test("empty dashboard uses intentional work, calendar, exception and recent states", () => {
  assert.match(dashboard, /Hiện không có công việc cần xử lý\./);
  assert.match(dashboard, /Không có lịch đánh giá sắp tới\./);
  assert.match(dashboard, /Không có công việc quá hạn\./);
  assert.match(dashboard, /Chưa có hồ sơ nghiệp vụ gần đây\./);
});

test("dashboard renders a concise priority My Work list", () => {
  assert.match(dashboard, /priority_work_items/);
  assert.match(dashboard, /Xem tất cả công việc/);
});

test("overdue work is identifiable without relying on color alone", () => {
  assert.match(dashboard, /item\.is_overdue \? <WarningOutlined \/>/);
  assert.match(dashboard, /is-overdue/);
});

test("exact work destination and dossier context reach shell navigation", () => {
  assert.match(dashboard, /onOpenPath\(item\.destination_path, item\.context\)/);
  assert.match(shell, /context\?\.dossier_key/);
  assert.match(shell, /openTaskDestination\("project-detail"/);
});

test("My Calendar visibly distinguishes audit assignments", () => {
  assert.match(calendar, /AUDIT: \{ label: "Đánh giá"/);
  assert.match(calendar, /role_in_event/);
});

test("My Calendar visibly distinguishes task and specialist deadlines", () => {
  assert.match(calendar, /WORK_DUE: \{ label: "Hạn công việc"/);
  assert.match(calendar, /REVIEW_DUE: \{ label: "Hạn thẩm xét"/);
  assert.match(calendar, /DECISION_DUE: \{ label: "Hạn quyết định"/);
});

test("audit click uses exact destination path and context", () => {
  assert.match(calendar, /onOpenPath\(item\.destination_path, item\.context\)/);
});

test("calendar list keys prevent rendering duplicate normalized identities", () => {
  assert.match(calendar, /key=\{item\.id\}/);
  assert.match(types, /id: string/);
});

test("global Schedule remains separate from My Calendar", () => {
  assert.match(shell, /key: "my-calendar"/);
  assert.match(shell, /label: "Lịch"/);
  assert.match(shell, /key: "schedule-resources"/);
  assert.match(shell, /label: "Lịch & nguồn lực"/);
});

test("My Work offers status filters without a manual DONE mutation", () => {
  assert.match(tasks, /value: "DONE", label: "Đã hoàn thành"/);
  assert.match(tasks, /statusFilter === "ACTIVE"/);
  assert.doesNotMatch(tasks, /patch[^\n]*status[^\n]*DONE/i);
  assert.doesNotMatch(tasks, /put[^\n]*status[^\n]*DONE/i);
});

test("frontend never receives customer scope rules to recompute", () => {
  assert.match(types, /allowed_sections/);
  assert.doesNotMatch(dashboard, /customer_user_access|filterProjectIds|ResourceAccessService/);
});
