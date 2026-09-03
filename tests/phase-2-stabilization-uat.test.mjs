import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync(new URL("../app/components/DashboardShell.tsx", import.meta.url), "utf8");
const tasks = readFileSync(new URL("../app/components/MyTasksScreen.tsx", import.meta.url), "utf8");
const project = readFileSync(new URL("../app/components/CertificationProjectDetailScreen.tsx", import.meta.url), "utf8");
const applications = readFileSync(new URL("../app/components/CertificationProjectsScreen.tsx", import.meta.url), "utf8");
const reports = readFileSync(new URL("../app/components/ReportsScreen.tsx", import.meta.url), "utf8");
const delegation = readFileSync(new URL("../app/components/DelegationScreen.tsx", import.meta.url), "utf8");
const cache = readFileSync(new URL("../app/lib/workspace-query-cache.ts", import.meta.url), "utf8");

test("My Work preserves the exact backend destination path and separates view from execute", () => {
  assert.match(tasks, /onOpenPath\(item\.destination_path, item\.context\)/);
  assert.match(tasks, /!item\.can_execute && !item\.can_view/);
  assert.match(tasks, /item\.can_execute \? "Mở" : "Xem"/);
  assert.match(tasks, /setHistoryItem\(item\)/);
  assert.match(tasks, /Chi tiết công việc — chỉ xem/);
  assert.match(tasks, /Chế độ lịch sử/);
});

test("project deep links retain workspace and audit_plan_id context", () => {
  assert.match(shell, /setSelectedProjectWorkspacePath\(path\)/);
  assert.match(project, /searchParams\.get\("audit_plan_id"\)/);
  for (const workspace of ["audit-team", "audit-plan", "audit-execution", "cap", "technical-review", "certification-decision", "certificate-issue"]) {
    assert.match(project, new RegExp(`workspace === "${workspace}"`));
  }
});

test("application-review deep link opens the assigned review workflow", () => {
  assert.match(shell, /searchParams\.get\("review_id"\)/);
  assert.match(applications, /initialReviewId/);
  assert.match(applications, /application_reviews\?\.some\(\(review\) => review\.id === initialReviewId\)/);
});

test("internal navigation is shaped by effective permissions and customer mode remains isolated", () => {
  assert.match(shell, /api\.get<[^>]*\{[\s\S]*permissions: string\[\]/);
  assert.match(shell, /\("\/auth\/me"\)/);
  assert.match(shell, /effectivePermissions/);
  assert.match(shell, /hasPermission\("projects\.read"\)/);
  assert.match(shell, /if \(customerPortalMode\) \{/);
  assert.doesNotMatch(shell, /roleMenuKeys/);
});

test("Reports read access mirrors the backend role surface", () => {
  for (const role of ["coordinator", "lead_auditor", "technical_reviewer", "decision_maker"]) {
    assert.match(reports, new RegExp(`"${role}"`));
  }
});

test("workflow mutations invalidate all personal workflow projections", () => {
  assert.match(cache, /\["work-tasks", "me"\]/);
  assert.match(cache, /\["personal-workspace"\]/);
  assert.match(cache, /\["notifications", "me"\]/);
  assert.doesNotMatch(applications, /\["my-work-tasks"\]/);
});

test("delegation UI supports bounded project scope and ADMIN on-behalf creation", () => {
  assert.match(delegation, /PROJECT_ACTION/);
  assert.match(delegation, /project_id/);
  assert.match(delegation, /delegator_user_id/);
  assert.match(delegation, /technical_review\.assign/);
  assert.match(delegation, /certificate\.issue/);
});
