import { expect, test } from "@playwright/test";

import { captureVisualBaseline, expectNoHorizontalOverflow, watchRuntimeIssues } from "../helpers/quality.mjs";

const session = {
  access_token: "browser-fixture-not-a-credential",
  user: { id: "browser-customer", username: "browser.customer", full_name: "Portal Customer", email: "portal.customer@example.invalid", roles: ["CUSTOMER"] },
};

const certificates = Array.from({ length: 12 }, (_, index) => ({
  id: `certificate-${index + 1}`,
  verification_code: `VERIFY-${index + 1}`,
  cert_number: `CERT-2026-${String(index + 1).padStart(4, "0")}`,
  version_no: 2,
  issue_date: "2026-10-01",
  expire_date: "2029-09-30",
  status: index === 0 ? "suspended" : "active",
  organization_name: "Công ty Cổ phần Công nghiệp Đông Nam Bộ",
  management_system: "QMS",
  standard_name: "ISO 9001:2015",
  certification_scope: `Lắp ráp thiết bị công nghiệp tại cơ sở ${index + 1}`,
  series_code: "QMS",
  project: { id: `project-${index + 1}`, project_code: `ISO-2026-${String(index + 1).padStart(4, "0")}` },
  official_pdf_available: index !== 0,
  public_verification_path: `/public/certificates/VERIFY-${index + 1}`,
  public_pdf_path: index === 0 ? null : `/public/certificates/VERIFY-${index + 1}/pdf`,
}));

const results = Array.from({ length: 12 }, (_, index) => ({
  id: `result-${index + 1}`,
  notification_number: `TB-2026-${String(index + 1).padStart(4, "0")}`,
  notification_date: "2026-10-10",
  audit_type: "Giám sát",
  audit_start_date: "2026-09-20",
  audit_end_date: "2026-09-21",
  notification_result: index === 0 ? "suspended" : "certification_maintained",
  has_certification_changes: index === 0,
  organization_name: "Công ty Cổ phần Công nghiệp Đông Nam Bộ",
  standard_name: "ISO 9001:2015",
  certification_scope: `Lắp ráp thiết bị công nghiệp tại cơ sở ${index + 1}`,
  next_audit_due_date: "2027-09-20",
  status: "sent",
  sent_at: "2026-10-10T10:00:00Z",
  plan: { id: `plan-${index + 1}`, plan_code: `AUD-2026-${String(index + 1).padStart(4, "0")}` },
  project: { id: `project-${index + 1}`, project_code: `ISO-2026-${String(index + 1).padStart(4, "0")}` },
}));

async function usePortalSession(page) {
  await page.addInitScript((value) => window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value)), session);
}

async function routePortal(page) {
  const unexpectedWrites = [];
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      unexpectedWrites.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 405, contentType: "application/json", body: "{}" });
      return;
    }
    let body = [];
    if (path === "/auth/me") body = { user: { ...session.user, permissions: ["customer_portal.access"] } };
    if (path === "/platform-branding") body = {};
    if (path === "/customer-portal/me/notifications") body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    if (path === "/customer-portal/me/certificates") body = certificates;
    if (path === "/customer-portal/me/results") body = results;
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });
  return unexpectedWrites;
}

test("customer certificates and results stay searchable and compact across target sizes", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const unexpectedWrites = await routePortal(page);
  await usePortalSession(page);
  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto("/customer-portal/certificates");
    await expect(page.getByRole("heading", { name: "Chứng chỉ" })).toBeVisible();
    await expect(page.locator(".customer-records-toolbar").getByText("12 chứng chỉ")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (size.width < 992) {
      const mobileText = await page.locator(".portal-mobile-card").first().evaluate((card) => ({
        meta: parseFloat(getComputedStyle(card.querySelector(".portal-mobile-card__meta")).fontSize),
        secondary: parseFloat(getComputedStyle(card.querySelector(".portal-mobile-card__identity small")).fontSize),
        badge: parseFloat(getComputedStyle(card.querySelector(".portal-mobile-card__heading > .ant-tag")).fontSize),
      }));
      expect(mobileText.meta, "Portal record metadata must remain legible on 390px mobile").toBeGreaterThanOrEqual(12);
      expect(mobileText.secondary, "Portal secondary text must remain legible on 390px mobile").toBeGreaterThanOrEqual(12);
      expect(mobileText.badge, "Status badges must remain readable on mobile").toBeGreaterThanOrEqual(11);
    }
    await captureVisualBaseline(page, testInfo, `customer-certificates-${size.width}`);

    const certificateSearch = page.getByRole("textbox", { name: "Tìm chứng chỉ" });
    await certificateSearch.fill("CERT-2026-0001");
    await expect(page.locator(".customer-records-toolbar").getByText("1 chứng chỉ")).toBeVisible();
    await expect(page.getByRole("button", { name: "PDF chính thức" })).toBeDisabled();
    await certificateSearch.fill("không tồn tại");
    await expect(page.getByText("Không có chứng chỉ khớp bộ lọc")).toBeVisible();
    await certificateSearch.clear();
    await page.getByRole("combobox", { name: "Lọc trạng thái chứng chỉ" }).click();
    await page.getByText("Đình chỉ", { exact: true }).last().click();
    await expect(page.locator(".customer-records-toolbar").getByText("1 chứng chỉ")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/customer-portal/results");
    await expect(page.getByRole("heading", { name: "Kết quả đánh giá" })).toBeVisible();
    await expect(page.locator(".customer-records-toolbar").getByText("12 thông báo")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `customer-results-${size.width}`);

    const resultSearch = page.getByRole("textbox", { name: "Tìm thông báo kết quả" });
    await resultSearch.fill("TB-2026-0001");
    await expect(page.locator(".customer-records-toolbar").getByText("1 thông báo")).toBeVisible();
    await resultSearch.fill("không tồn tại");
    await expect(page.getByText("Không có thông báo khớp bộ lọc")).toBeVisible();
    await resultSearch.clear();
    await page.getByRole("combobox", { name: "Lọc kết quả chứng nhận" }).click();
    await page.getByText("Đình chỉ chứng chỉ", { exact: true }).last().click();
    await expect(page.locator(".customer-records-toolbar").getByText("1 thông báo")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  expect(unexpectedWrites).toEqual([]);
  expect(runtime.issues).toEqual([]);
});
