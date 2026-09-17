import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
  runAxeBaseline,
  stabilizeVisualState,
  watchRuntimeIssues,
} from "../helpers/quality.mjs";

const SESSION_STORAGE_KEY = "ctic_cmp_session";

const adminSession = {
  access_token: "browser-fixture-not-a-credential",
  user: {
    id: "browser-admin",
    username: "browser.admin",
    full_name: "Browser QA Admin",
    email: "browser.qa@example.invalid",
    roles: ["ADMIN"],
  },
};

const scheme = {
  id: "scheme-qms",
  code: "QMS",
  name: "Hệ thống quản lý chất lượng",
  description: "Dữ liệu kiểm thử browser QA có kiểm soát.",
  status: "ACTIVE",
  effective_from: "2026-01-01",
  effective_to: null,
};

const standard = {
  id: "standard-iso-9001-2015",
  scheme_id: scheme.id,
  standard_code: "ISO 9001",
  standard_name: "Hệ thống quản lý chất lượng",
  edition: "2015",
  status: "ACTIVE",
  effective_from: "2015-09-15",
  withdrawn_at: null,
  scheme,
};

const activeConfiguration = {
  id: "scheme-config-qms-v1",
  scheme_id: scheme.id,
  version_no: 1,
  status: "ACTIVE",
  effective_from: "2026-01-01",
  effective_to: null,
  cycle_duration_months: 36,
  surveillance_frequency_months: 12,
  stage1_applicable: true,
  validity_duration_months: 36,
  renewal_window_days: 90,
  reminder_lead_days: 60,
  required_audit_types: ["INITIAL_STAGE_1", "INITIAL_STAGE_2", "SURVEILLANCE", "RECERTIFICATION"],
  required_decision_types: ["GRANT", "MAINTAIN", "RENEW"],
};

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  });
}

async function installControlledApi(page) {
  await page.addInitScript(({ key, session }) => {
    window.sessionStorage.setItem(key, JSON.stringify(session));
  }, { key: SESSION_STORAGE_KEY, session: adminSession });

  await page.route(/http:\/\/(?:127\.0\.0\.1|localhost):3000\/.*/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (request.method() !== "GET") {
      return json(route, { message: "Mutation disabled in controlled browser fixture" }, 405);
    }

    if (path === "/auth/me") {
      return json(route, {
        user: {
          ...adminSession.user,
          permissions: [
            "classifications.manage",
            "projects.read",
            "users.read",
          ],
        },
      });
    }

    if (path === "/platform-branding") {
      return json(route, {});
    }

    if (path === "/me/workspace") {
      return json(route, {
        work_summary: {
          open: 0,
          in_progress: 0,
          overdue: 0,
          due_soon: 0,
          high_priority: 0,
        },
        priority_work_items: [],
        recent_records: [],
        role_kpis: [],
        calendar_items: [],
      });
    }

    if (path === "/notifications/me") {
      return json(route, {
        items: [],
        summary: { total: 0, unread: 0, critical: 0, warning: 0 },
      });
    }

    if (path === "/master-data-configuration/schemes") {
      return json(route, [scheme]);
    }

    if (path === "/master-data-configuration/standards") {
      return json(route, [standard]);
    }

    if (path === "/master-data-configuration/scheme-configurations") {
      return json(route, [activeConfiguration]);
    }

    if (path === "/master-data-configuration/configuration-readiness") {
      return json(route, {
        schemes: {
          ready: true,
          items: [{
            id: scheme.id,
            code: scheme.code,
            status: "READY",
            issues: [],
            active_configuration: activeConfiguration,
          }],
        },
        organization: { ready: true, reasons: [] },
        taxonomy: { ready: true, reasons: [] },
        numbering: { ready: true, reasons: [] },
      });
    }

    return json(route, []);
  });
}

async function openConfiguration(page) {
  await installControlledApi(page);
  await page.goto("/admin/configuration/schemes");
  await expect(page).toHaveURL(/\/admin\/configuration\/schemes$/);
  await expect(page.getByRole("heading", { name: "Chương trình & tiêu chuẩn" })).toBeVisible();
  await expect(page.getByText("QMS").first()).toBeVisible();
  await expect(page.getByText("ISO 9001:2015").first()).toBeVisible();
}

async function expectContainedWithin(locator, container) {
  await expect(locator).toBeVisible();
  const [targetBox, containerBox] = await Promise.all([
    locator.boundingBox(),
    container.boundingBox(),
  ]);
  if (!targetBox || !containerBox) throw new Error("Expected visible configuration element bounds");
  expect(targetBox.x).toBeGreaterThanOrEqual(containerBox.x - 1);
  expect(targetBox.x + targetBox.width).toBeLessThanOrEqual(containerBox.x + containerBox.width + 1);
}

test("canonical configuration route renders with a controlled API fixture", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  await openConfiguration(page);

  const configurationContent = page.locator(".configuration-route-page__content");
  const editionAction = page.getByRole("button", { name: "Thao tác ISO 9001:2015" });
  const editionRow = editionAction.locator("xpath=..");
  await expectContainedWithin(editionRow.getByText("Đang áp dụng", { exact: true }), configurationContent);
  await expectContainedWithin(editionRow.getByText("Áp dụng từ 15/09/2015", { exact: true }), configurationContent);
  await expectContainedWithin(editionAction, configurationContent);
  await expectNoHorizontalOverflow(page);

  await stabilizeVisualState(page);
  await captureVisualBaseline(page, testInfo, "configuration-schemes-smoke");
  runtime.assertClean();
});

test("configuration create-program modal remains usable and labelled", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  await openConfiguration(page);

  await page.getByRole("button", { name: "Thêm chương trình" }).click();
  const dialog = page.getByRole("dialog", { name: "Thêm chương trình" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Mã chương trình" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Tên chương trình" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Mô tả" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Lưu" })).toBeVisible();

  await stabilizeVisualState(page);
  await expectNoHorizontalOverflow(page);
  await captureVisualBaseline(page, testInfo, "configuration-create-program-modal");
  await runAxeBaseline(page, testInfo);
  runtime.assertClean();
});
