import { expect, test } from "@playwright/test";
import {
  captureVisualBaseline, expectNoHorizontalOverflow, watchRuntimeIssues,
} from "../helpers/quality.mjs";

const id = "c5d8a6e7-27d6-4a23-b21f-7b03c03e1000";
const reviewerId = "d5d8a6e7-27d6-4a23-b21f-7b03c03e2000";
const suspended = {
  id, cert_number: "CERT-SUSP-2026-001", version_no: 1,
  technical_review_id: "c5d8a6e7-27d6-4a23-b21f-7b03c03e3000",
  certificate_series_id: "c5d8a6e7-27d6-4a23-b21f-7b03c03e4000",
  certificate_series: { project_id: "c5d8a6e7-27d6-4a23-b21f-7b03c03e5000" },
  organization_name: "Công ty Giấy Chứng Nhận Mẫu",
  standard_name: "ISO 9001:2015", certification_scope: "Sản xuất thiết bị",
  status: "suspended", issue_date: "2026-01-01", expire_date: "2029-01-01",
  created_at: "2026-01-01", updated_at: "2026-05-01",
  fixture_only: false, legal_effect: false,
  verification_code: null,
};
const session = {
  access_token: "browser-fixture-not-a-credential",
  user: {
    id: "browser-admin", username: "browser.qa",
    full_name: "Browser QA", email: "browser.qa@example.invalid",
    roles: ["ADMIN", "COORDINATOR"],
  },
};
test("suspended certificate shows 3+3 review, F11 evidence and independent decision without changing legal status", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const writes = [];
  await page.clock.install({ time: new Date("2026-05-08T09:00:00+07:00") });
  await page.addInitScript((value) => {
    window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value));
  }, session);
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      writes.push(`${request.method()} ${pathname}`);
      await route.fulfill({ status: 405, contentType: "application/json",
        body: JSON.stringify({ message: "Controlled fixture is read-only" }) });
      return;
    }
    let body = [];
    if (pathname === "/auth/me") {
      body = { user: { ...session.user,
        permissions: ["certificates.read", "certificates.manage",
          "audit_programs.manage", "certification_decisions.issue"] } };
    } else if (pathname === "/platform-branding") {
      body = {};
    } else if (pathname === "/me/workspace") {
      body = { user_context: { personas: ["ADMIN"] },
        work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 },
        priority_work_items: [], calendar_items: [], exceptions: [],
        recent_records: [], role_kpis: [],
        meta: { due_soon_days: 7, sales_assignment_limitation: null } };
    } else if (pathname.startsWith("/notifications")) {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    } else if (pathname === "/certificates") {
      body = [suspended];
    } else if (pathname === `/certificates/${id}`) {
      body = suspended;
    } else if (pathname === `/certificates/${id}/status-history`) {
      body = {
        certificate: { id, cert_number: suspended.cert_number, status: "suspended" },
        history: [{
          id: "history-1", from_status: "active", to_status: "suspended",
          effective_date: "2026-01-31", created_at: "2026-02-01",
          reason: "Đang kiểm soát hành động khắc phục",
          certification_decision: { id: "decision-1", decision_number: "F13-SUSP-001",
            decision_type: "SUSPEND", decision_result: "approved" },
        }],
        suspension_review: {
          state: "review_due", started_at: "2026-01-31",
          initial_review_due_at: "2026-04-30",
          maximum_extension_due_at: "2026-07-31",
          requires_independent_review: true,
        },
      };
    } else if (pathname === `/certificates/${id}/suspension-case`) {
      body = {
        certificate: { id, cert_number: suspended.cert_number, status: "suspended" },
        suspension: { id: "history-1", effective_date: "2026-01-31", decision_id: "decision-1" },
        deadline: {
          initial_review_due_at: "2026-04-30", maximum_due_at: "2026-07-31",
          after_initial: true, after_maximum: false,
        },
        approved_extension: false, extension: null, recommendation: null,
        requires_f13: false, legal_status_unchanged: true,
      };
    } else if (pathname === "/certificates/suspension-review/reviewers") {
      body = [{ id: reviewerId, username: "decision.maker", full_name: "Người quyết định độc lập" }];
    } else if (pathname.startsWith("/document-files/entity/certificate/")) {
      body = [];
    }
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8",
      body: JSON.stringify(body) });
  });
  await page.goto("/certificates");
  await expect(page.getByRole("heading", { name: "Chứng chỉ" })).toBeVisible();
  await page.getByRole("button", { name: "Chi tiết" }).first().click();
  const panel = page.getByRole("region", { name: "Xem xét đình chỉ 3 cộng 3 tháng" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("30/04/2026");
  await expect(panel).toContainText("31/07/2026");
  await expect(panel).toContainText("F.11");
  await expect(panel).toContainText("F.13");
  await expect(panel.getByText("Đã đến hạn xem xét sau 3 tháng")).toBeVisible();

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `certificate-suspension-${size.width}`, { fullPage: false });
  }
  await panel.getByLabel("Mã thẩm xét F11").fill("33333333-3333-4333-8333-333333333333");
  await panel.getByLabel("Lý do xem xét đình chỉ").fill("Khách hàng chưa có bằng chứng khắc phục đầy đủ, cần xem xét gia hạn");
  await panel.getByLabel("Tham chiếu bằng chứng khắc phục").fill("CAP/2026/001");
  await panel.getByLabel("Người quyết định đình chỉ").click();
  await page.getByText("Người quyết định độc lập", { exact: false }).last().click();
  await expect(panel.getByRole("button", { name: "Gửi đề nghị thẩm xét độc lập" })).toBeEnabled();
  expect(writes).toEqual([]);
  runtime.assertClean();
});
