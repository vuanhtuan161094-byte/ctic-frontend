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

const organization = {
  id: "portal-customer-1",
  customer_code: "KH-2026-0098",
  company_name: "Công ty Cổ phần Giải pháp Công nghiệp và Chuỗi Cung ứng Miền Đông Nam Bộ",
};

const standards = [{
  id: "edition-iso-9001",
  scheme_id: "scheme-iso",
  standard_code: "ISO 9001",
  standard_name: "Hệ thống quản lý chất lượng",
  edition: "2015",
  effective_from: "2026-01-01",
  scheme: { id: "scheme-iso", code: "ISO", name: "ISO" },
}];

const applications = Array.from({ length: 12 }, (_, index) => ({
  id: `application-${index + 1}`,
  customer_id: organization.id,
  application_code: `DK-2026-${String(index + 1).padStart(4, "0")}`,
  application_date: "2026-10-18",
  certification_type: "INITIAL",
  standard_name: "ISO 9001:2015",
  certification_scope: `Phạm vi sản xuất và cung cấp dịch vụ tại nhà máy số ${index + 1}`,
  headquarters_address: "Khu công nghiệp Đông Nam Bộ",
  representative_name: "Nguyễn Minh Anh",
  representative_position: "Tổng giám đốc",
  representative_phone: "0900000000",
  representative_email: "representative@example.invalid",
  contact_name: "Trần Thu Hà",
  contact_position: "Quản lý chất lượng",
  contact_phone: "0900000001",
  contact_email: "contact@example.invalid",
  total_employee_count: 120,
  employee_count: 110,
  shift_count: 2,
  shift1_count: 60,
  shift2_count: 50,
  shift3_count: 0,
  external_provider_used: false,
  outsourced_processes: null,
  requested_audit_date: null,
  stage1_requested_date: null,
  stage2_requested_date: null,
  other_management_systems: false,
  management_system_details: null,
  certificate_languages: "Vietnamese, English",
  other_requests: null,
  declaration_accepted: false,
  status: "DRAFT",
  portal_status: "DRAFT",
  can_edit: true,
  can_submit: true,
  customers: organization,
  sites: [{ site_no: 1, site_name: "Trụ sở chính", address: "Khu công nghiệp Đông Nam Bộ", activities: "Sản xuất", employee_count: 110, is_headquarters: true }],
  project: null,
}));

test("customer application form keeps its dialog and save action inside common viewports", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const unexpectedWrites = [];
  await page.addInitScript((value) => {
    window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value));
  }, session);

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
    } else if (path === "/customer-portal/me/applications") {
      body = applications;
    } else if (path === "/customer-portal/me/profile") {
      body = [organization];
    } else if (path === "/customer-portal/me/operational-standards") {
      body = standards;
    } else if (path === "/customer-portal/me/notifications") {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });

  await page.goto("/portal/applications");
  await expect(page.getByRole("heading", { name: "Đơn đăng ký chứng nhận" })).toBeVisible();
  if (testInfo.project.name === "mobile-390x844") {
    await expect(page.locator(".portal-mobile-card")).toHaveCount(10);
    await expect(page.locator(".compact-mobile-pagination")).toContainText("12 đơn");
  } else {
    await expect(page.locator(".ant-table-tbody > .ant-table-row")).toHaveCount(10);
  }

  await page.getByRole("button", { name: "Sửa" }).first().click();
  let dialog = page.getByRole("dialog", { name: "Cập nhật DK-2026-0001" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Phạm vi đề nghị chứng nhận")).toHaveValue(applications[0].certification_scope);
  await page.locator(".customer-application-modal .ant-modal-close").click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Tạo đơn đăng ký" }).click();
  dialog = page.getByRole("dialog", { name: "Tạo đơn đăng ký chứng nhận" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Phạm vi đề nghị chứng nhận")).toHaveValue("");
  await expect(dialog.getByRole("button", { name: "Lưu bản nháp" })).toBeVisible();
  const fieldScroller = dialog.locator(".customer-application-form__fields");
  const saveButton = dialog.getByRole("button", { name: "Lưu bản nháp" });

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    const geometry = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const fields = element.querySelector(".customer-application-form__fields");
      const fieldsRect = fields.getBoundingClientRect();
      const action = [...element.querySelectorAll("button")].find((button) => button.textContent?.includes("Lưu bản nháp"));
      const actionRect = action.getBoundingClientRect();
      return {
        dialog: { top: rect.top, bottom: rect.bottom, height: rect.height },
        fields: { top: fieldsRect.top, bottom: fieldsRect.bottom, height: fieldsRect.height, scrollHeight: fields.scrollHeight, clientHeight: fields.clientHeight },
        action: { top: actionRect.top, bottom: actionRect.bottom, visible: actionRect.top >= 0 && actionRect.bottom <= window.innerHeight },
      };
    });
    console.log(`${size.width}x${size.height} ${JSON.stringify(geometry)}`);
    expect(geometry.dialog.top).toBeGreaterThanOrEqual(0);
    expect(geometry.dialog.bottom).toBeLessThanOrEqual(size.height);
    expect(geometry.action.visible).toBe(true);
    expect(geometry.fields.scrollHeight).toBeGreaterThan(geometry.fields.clientHeight);
    await fieldScroller.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const finalField = await dialog.getByLabel("Yêu cầu khác").boundingBox();
    const fieldsBounds = await fieldScroller.boundingBox();
    expect(finalField?.y).toBeGreaterThanOrEqual(fieldsBounds?.y ?? 0);
    expect(finalField?.y + (finalField?.height ?? 0)).toBeLessThanOrEqual((fieldsBounds?.y ?? 0) + (fieldsBounds?.height ?? 0));
    const actionAfterScroll = await saveButton.boundingBox();
    expect(actionAfterScroll?.y).toBeGreaterThanOrEqual(0);
    expect(actionAfterScroll?.y + (actionAfterScroll?.height ?? 0)).toBeLessThanOrEqual(size.height);
    await fieldScroller.evaluate((element) => { element.scrollTop = 0; });
    await captureVisualBaseline(page, testInfo, `customer-applications-form-${size.width}`);
  }

  expect(unexpectedWrites).toEqual([]);
  expect(runtime.issues.filter((issue) => !issue.includes("Warning: [antd:"))).toEqual([]);
});
