import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
  watchRuntimeIssues,
} from "../helpers/quality.mjs";

const projectId = "project-assignment-layout";
const scope = {
  project_scope_id: "scope-iso-9001",
  management_system: "QMS",
  standard_code: "ISO 9001:2015",
  certification_scope: "Thiết kế, sản xuất và bảo trì thiết bị công nghiệp.",
  isic: { revision: "4", code: "2819", name: "Sản xuất máy móc đa dụng khác" },
  nace: { revision: "2", code: "28.29", name: "Sản xuất máy móc đa dụng khác" },
  iaf: { code: "18", name: "Máy móc và thiết bị" },
};

const experts = Array.from({ length: 18 }, (_, index) => ({
  id: `expert-${index + 1}`,
  full_name: `Chuyên gia đánh giá ${String(index + 1).padStart(2, "0")}`,
  email: `expert-${index + 1}@example.invalid`,
  status: "active",
}));

const suitableExperts = experts.map((expert, index) => ({
  expert_id: expert.id,
  full_name: expert.full_name,
  email: expert.email,
  is_relevant: true,
  can_lead: index < 4,
  covered_scope_ids: [scope.project_scope_id],
  covered_standards: [scope.standard_code],
  covered_scope_labels: ["ISO 9001:2015 · IAF 18 · NACE 28.29"],
  coverage_count: 1,
  required_scope_count: 1,
}));

const application = {
  id: "application-assignment-layout",
  application_code: "DK-2026-0098",
  standard_name: "ISO 9001:2015",
  certification_scope: scope.certification_scope,
  status: "approved",
  employee_count: 180,
  site_count: 2,
  customers: {
    id: "customer-assignment-layout",
    customer_code: "KH-2026-0098",
    company_name: "Công ty Cổ phần Giải pháp Công nghiệp Miền Đông",
  },
};

const project = {
  id: projectId,
  project_code: "HS-2026-0098",
  standard_name: application.standard_name,
  status: "in_progress",
  created_at: "2026-09-28T08:00:00Z",
  updated_at: "2026-10-12T08:00:00Z",
  certification_applications: application,
  audit_plans: [],
};

const dossierGroup = {
  dossier_key: "initial_certification",
  dossier_type: "initial",
  dossier_label: "Hồ sơ chứng nhận lần đầu",
  dossier_description: "Đánh giá giai đoạn 1, giai đoạn 2 và quyết định chứng nhận lần đầu.",
  sequence_no: 1,
  plan_ids: [],
  summary: {
    total_items: 1,
    completed_items: 0,
    pending_items: 1,
    completion_percentage: 0,
    dossier_status: "not_started",
  },
  items: [{
    item_no: 1,
    document_key: "audit_team_assignment",
    document_name: "Chỉ định đoàn đánh giá",
    storage_type: "system_record",
    status: "pending",
  }],
};

const dossier = {
  project: {
    id: projectId,
    project_code: project.project_code,
    status: project.status,
    customer: application.customers,
    standard_name: project.standard_name,
    certification_scope: application.certification_scope,
  },
  summary: dossierGroup.summary,
  items: dossierGroup.items,
  common_items: [],
  dossiers: [dossierGroup],
  current_dossier_key: dossierGroup.dossier_key,
  source_records: { application, application_review: null },
  files: [],
};

const alerts = {
  warning_days: 90,
  generated_at: "2026-10-18T08:00:00Z",
  summary: { total: 0, critical: 0, warning: 0, info: 0 },
  alerts: [],
};

const projectTeamPlan = {
  id: "project-team-plan",
  project_id: projectId,
  plan_code: "F04-2026-0098",
  audit_type: "project_team",
  status: "draft",
  version_no: 1,
  certification_projects: {
    ...project,
    certification_applications: {
      ...application,
      customers: application.customers,
    },
  },
};

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

test("project team assignment form fits desktop and mobile workspaces", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const unexpectedWrites = [];
  await page.addInitScript((value) => {
    window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value));
  }, session);

  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (request.method() === "POST" && path === `/audit-team-appointments/project/${projectId}/ensure-context`) {
      await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(projectTeamPlan) });
      return;
    }
    if (request.method() !== "GET") {
      unexpectedWrites.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 405, contentType: "application/json; charset=utf-8", body: JSON.stringify({ message: "Controlled fixture is read-only" }) });
      return;
    }

    let body = [];
    if (path === "/auth/me") {
      body = { user: { ...session.user, permissions: ["projects.read", "experts.read", "audit_plans.read", "audit_teams.read", "documents.read"] } };
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
    } else if (path === `/certification-projects/${projectId}`) {
      body = project;
    } else if (path === `/certification-projects/${projectId}/dossier`) {
      body = dossier;
    } else if (path === `/certification-projects/${projectId}/alerts`) {
      body = alerts;
    } else if (path === "/certification-projects") {
      body = [project];
    } else if (path === "/audit-plans") {
      body = [];
    } else if (path === "/audit-team-appointments") {
      body = [];
    } else if (path === "/experts") {
      body = experts;
    } else if (path === "/audit-team-appointments/plan/project-team-plan/available-scopes") {
      body = [scope];
    } else if (path === `/audit-team-appointments/project/${projectId}/expert-suitability`) {
      body = {
        project_id: projectId,
        project_code: project.project_code,
        required_scope_count: 1,
        required_programs: [],
        experts: suitableExperts,
      };
    } else if (path === `/manday-calculations/project/${projectId}`) {
      body = [{ id: "manday-layout", status: "approved", final_mandays: 16, created_at: "2026-10-12T08:00:00Z" }];
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });

  await page.goto(`/certification-projects/${projectId}?dossier_key=initial_certification`);
  await expect(page.getByRole("heading", { name: project.project_code })).toBeVisible();
  await page.locator(".dossier-next-action-button").click();
  const dialog = page.locator(".appointment-editor-modal");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText("Thành viên đoàn đánh giá", { exact: true })).toBeVisible();
  await expect(dialog.locator(".appointment-member-form")).toHaveCount(1);
  const modalBody = dialog.locator(".ant-modal-body");

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    if (size.width <= 767) {
      const edges = await page.locator(".dossier-workspace-card > .ant-card-head").evaluate((head) => ({
        title: head.querySelector(".dossier-workspace-title")?.getBoundingClientRect().right ?? 0,
        action: head.querySelector(".ant-card-extra")?.getBoundingClientRect().right ?? 0,
      }));
      expect(edges.title, "Mobile dossier title must remain within the viewport").toBeLessThanOrEqual(size.width + 1);
      expect(edges.action, "Mobile dossier actions must remain within the viewport").toBeLessThanOrEqual(size.width + 1);
    }
    await modalBody.evaluate((element) => { element.scrollTop = 0; });
    const layout = await dialog.evaluate((element) => {
      const body = element.querySelector(".ant-modal-body");
      const footer = element.querySelector(".ant-modal-footer");
      const member = element.querySelector(".appointment-member-form");
      const content = element.querySelector(".ant-modal-container");
      const footerRect = footer?.getBoundingClientRect();
      return {
        dialogClassName: element.className,
        containerMaxHeight: content ? getComputedStyle(content).maxHeight : "missing",
        containerHeight: content?.getBoundingClientRect().height ?? 0,
        modalBottom: element.getBoundingClientRect().bottom,
        bodyClientHeight: body?.clientHeight ?? 0,
        bodyScrollHeight: body?.scrollHeight ?? 0,
        bodyOverflowY: body ? getComputedStyle(body).overflowY : "missing",
        footerBottom: footerRect?.bottom ?? 0,
        memberExists: Boolean(member),
      };
    });
    await testInfo.attach(`assignment-layout-${size.width}`, {
      body: Buffer.from(JSON.stringify({ size, ...layout }, null, 2)),
      contentType: "application/json",
    });
    expect(layout.modalBottom).toBeLessThanOrEqual(size.height + 1);
    expect(layout.footerBottom).toBeLessThanOrEqual(size.height + 1);
    expect(layout.bodyOverflowY).toBe("auto");
    expect(layout.bodyScrollHeight).toBeGreaterThan(layout.bodyClientHeight);
    expect(layout.memberExists).toBe(true);
    await captureVisualBaseline(page, testInfo, `audit-team-assignment-${size.width}`);
    const firstMember = dialog.locator(".appointment-member-form").first();
    await firstMember.scrollIntoViewIfNeeded();
    await expect(firstMember).toBeInViewport();
    await captureVisualBaseline(page, testInfo, `audit-team-assignment-member-${size.width}`);
    await modalBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect(dialog.locator(".ant-modal-footer")).toBeInViewport();
    await expect(dialog.getByRole("button", { name: "Tạo dự thảo chỉ định" })).toBeVisible();
  }

  await modalBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const addMember = dialog.getByRole("button", { name: "Thêm thành viên" });
  await addMember.click();
  await addMember.click();
  await expect(dialog.locator(".appointment-member-form")).toHaveCount(3);
  await expectNoHorizontalOverflow(page);
  await expect(dialog.locator(".ant-modal-footer")).toBeInViewport();
  await captureVisualBaseline(page, testInfo, "audit-team-assignment-three-members");

  expect(unexpectedWrites).toEqual([]);
  const unexpectedRuntimeIssues = runtime.issues.filter((issue) => !issue.includes("Warning: [antd:"));
  expect(unexpectedRuntimeIssues).toEqual([]);
});
