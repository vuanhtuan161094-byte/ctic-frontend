import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
  watchRuntimeIssues,
} from "../helpers/quality.mjs";

const session = {
  access_token: "browser-fixture-not-a-credential",
  user: {
    id: "browser-customer",
    username: "browser.customer",
    full_name: "Portal Customer",
    email: "portal.customer@example.invalid",
    roles: ["CUSTOMER"],
  },
};

const workspaces = Array.from({ length: 12 }, (_, index) => ({
  plan: {
    id: `plan-${index + 1}`,
    plan_code: `AUD-2026-${String(index + 1).padStart(4, "0")}`,
    audit_type: "GIAM_SAT",
    planned_start_date: "2026-10-14",
    planned_end_date: "2026-10-15",
    status: "completed",
  },
  project: {
    project_code: `ISO-2026-${String(index + 1).padStart(4, "0")}`,
    standard_name: "ISO 9001:2015",
    status: "active",
  },
  customer: {
    customer_code: "KH-2026-0098",
    company_name: "Công ty Cổ phần Công nghiệp Đông Nam Bộ",
  },
  finding_summary: { total: 12, open: 10, overdue: 2 },
}));

const correctiveActions = [{
  id: "cap-version-1",
  version_no: 1,
  root_cause: "Chưa có bước rà soát hồ sơ trước khi phê duyệt.",
  correction: "Đã bổ sung chứng từ còn thiếu cho lô hồ sơ hiện tại.",
  corrective_action_plan: "Cập nhật quy trình và đào tạo lại người phụ trách.",
  responsible_person: "Nguyen Van A",
  target_date: "2026-10-30",
  status: "revision_required",
  submitted_by: "customer-user",
  submitted_at: "2026-10-16T09:00:00.000Z",
  reviewed_by: "auditor-user",
  reviewed_at: "2026-10-17T09:00:00.000Z",
  review_comment: "Cần nêu rõ cách xác minh hiệu lực sau đào tạo.",
  submitted_by_user: { full_name: "Nguyen Van A" },
  reviewed_by_user: { full_name: "Tran Thi B" },
  evidence_files: [],
  form_data: { custom_content: { customer_comment: "Đã cập nhật kế hoạch." } },
}];

const findings = Array.from({ length: 12 }, (_, index) => ({
  id: `finding-${index + 1}`,
  finding_code: `NC-2026-${String(index + 1).padStart(4, "0")}`,
  finding_type: index % 2 ? "minor_nc" : "major_nc",
  clause: "8.7",
  requirement: "Tổ chức phải kiểm soát đầu ra không phù hợp.",
  description: `Chưa lưu hồ sơ xử lý đầu ra không phù hợp tại khu vực sản xuất ${index + 1}.`,
  objective_evidence: `Quan sát mẫu lô ${index + 1} và phỏng vấn người phụ trách trong ca sáng.`,
  detected_date: "2026-10-14",
  due_date: "2026-10-28",
  status: index === 0 ? "revision_required" : index === 10 ? "closed" : "open",
  is_overdue: index === 1,
  corrective_actions: index === 0 ? correctiveActions : [],
}));

const customerWorkspace = {
  plan: {
    id: "plan-1",
    plan_code: "AUD-2026-0001",
    audit_type: "GIAM_SAT",
    planned_start_date: "2026-10-14",
    planned_end_date: "2026-10-15",
    certification_projects: {
      project_code: "ISO-2026-0001",
      standard_name: "ISO 9001:2015",
      certification_applications: {
        customers: { company_name: "Công ty Cổ phần Công nghiệp Đông Nam Bộ" },
      },
    },
  },
  findings,
};

async function usePortalSession(page) {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value));
  }, session);
}

async function routePortal(page) {
  const unexpectedWrites = [];
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      unexpectedWrites.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ message: "Controlled fixture is read-only" }) });
      return;
    }

    let body = [];
    if (path === "/auth/me") {
      body = { user: { ...session.user, permissions: ["customer_portal.access"] } };
    } else if (path === "/platform-branding") {
      body = {};
    } else if (path === "/customer-portal/me/notifications") {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    } else if (path === "/audit-findings/customer/workspaces") {
      body = workspaces;
    } else if (path === "/audit-findings/customer/plan/plan-1") {
      body = customerWorkspace;
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });
  return unexpectedWrites;
}

test("customer NC/CAP workspace keeps findings and response actions usable at all target sizes", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const runtime = watchRuntimeIssues(page);
  const unexpectedWrites = await routePortal(page);
  await usePortalSession(page);
  await page.goto("/portal/corrective-actions");
  await expect(page.getByRole("heading", { name: "Hành động khắc phục" })).toBeVisible();

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    if (size.width < 992) {
      await expect(page.locator('[aria-label="Các kế hoạch có hành động khắc phục"] .portal-mobile-card')).toHaveCount(10);
    } else {
      await expect(page.locator(".ant-table-tbody > .ant-table-row")).toHaveCount(10);
    }
    const listContent = size.width < 992
      ? page.locator('[aria-label="Các kế hoạch có hành động khắc phục"]')
      : page.locator(".ant-table-tbody");
    await expect(listContent).toContainText("Đánh giá giám sát");
    await expect(listContent).not.toContainText("GIAM_SAT");
    await captureVisualBaseline(page, testInfo, `customer-cap-list-${size.width}`);

    const openWorkspace = page.getByRole("button", { name: "Mở khắc phục" }).first();
    await openWorkspace.click();
    const workspaceDialog = page.locator(".ant-modal-wrap:visible .ant-modal").first();
    await expect(workspaceDialog.getByText("Tiến độ xử lý NC/CAP")).toBeVisible();
    const workspaceBox = await workspaceDialog.boundingBox();
    expect(workspaceBox?.x).toBeGreaterThanOrEqual(0);
    expect(workspaceBox?.x + (workspaceBox?.width ?? 0)).toBeLessThanOrEqual(size.width);
    await expectNoHorizontalOverflow(page);

    const stats = workspaceDialog.locator(".cmp-cap-summary-grid > .ant-card");
    await expect(stats).toHaveCount(5);
    await expect.poll(async () => {
      const summaryCardWidths = await stats.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
      return summaryCardWidths.every((width) => width >= 120);
    }).toBe(true);
    await captureVisualBaseline(page, testInfo, `customer-cap-workspace-${size.width}`);

    await workspaceDialog.locator(".ant-collapse-header").first().click();
    await expect(workspaceDialog.getByText("Bằng chứng khách quan")).toBeVisible();
    await expect(workspaceDialog.getByRole("button", { name: "Gửi phiên bản CAP mới" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await workspaceDialog.getByRole("button", { name: "Gửi phiên bản CAP mới" }).click();
    const responseDialog = page.getByRole("dialog", { name: /Phản hồi CAP/ });
    await expect(responseDialog).toBeVisible();
    const responseBox = await responseDialog.boundingBox();
    const submitButton = responseDialog.getByRole("button", { name: "Lưu và gửi phản hồi" });
    const submitBox = await submitButton.boundingBox();
    expect(responseBox?.x).toBeGreaterThanOrEqual(0);
    expect(responseBox?.x + (responseBox?.width ?? 0)).toBeLessThanOrEqual(size.width);
    expect(submitBox?.y + (submitBox?.height ?? 0)).toBeLessThanOrEqual(size.height);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `customer-cap-response-${size.width}`);

    await responseDialog.locator(".ant-modal-close").click();
    await expect(responseDialog).toBeHidden();
    await workspaceDialog.locator(".ant-modal-close").click();
    await expect(workspaceDialog).toBeHidden();
  }

  expect(unexpectedWrites).toEqual([]);
  expect(runtime.issues).toEqual([]);
});
