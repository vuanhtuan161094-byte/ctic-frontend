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

const applications = Array.from({ length: 3 }, (_, index) => ({
  id: `application-${index + 1}`,
  application_code: `DK-2026-${String(index + 1).padStart(4, "0")}`,
  standard_name: "ISO 9001:2015",
  status: "DRAFT",
  customers: { customer_code: "KH-2026-0098", company_name: "Công ty Cổ phần Công nghiệp Đông Nam Bộ" },
  documents: [{
    id: `app-document-${index + 1}`,
    original_name: `Ho-so-phap-ly-${index + 1}.pdf`,
    mime_type: "application/pdf",
    file_size: 245760,
    version_no: 1,
    is_current: true,
    note: null,
    created_at: "2026-10-01T09:00:00.000Z",
    category: "LEGAL",
    download_url: `/document-files/customer/${index + 1}`,
  }],
}));

const requests = Array.from({ length: 12 }, (_, index) => ({
  id: `document-request-${index + 1}`,
  request_code: `YCTL-2026-${String(index + 1).padStart(4, "0")}`,
  application_id: applications[index % applications.length].id,
  category: ["LEGAL", "MANAGEMENT_SYSTEM", "SCOPE_SITE", "EMPLOYEE", "OTHER"][index % 5],
  title: `Bổ sung tài liệu xác nhận nội dung hồ sơ lần ${index + 1}`,
  description: `Vui lòng gửi bản cập nhật có xác nhận cho yêu cầu ${index + 1}, nêu rõ phạm vi áp dụng và ngày hiệu lực.`,
  due_date: "2026-11-15",
  status: index === 0 ? "REVISION_REQUIRED" : index === 1 ? "REQUESTED" : ["SUBMITTED", "ACCEPTED", "CANCELLED"][index % 3],
  response_note: null,
  submitted_at: index ? "2026-10-10T09:00:00.000Z" : null,
  review_comment: index === 0 ? "Bản gửi trước thiếu xác nhận của người đại diện." : null,
  reviewed_at: null,
  created_at: `2026-10-${String(18 - index).padStart(2, "0")}T09:00:00.000Z`,
  application: {
    application_code: applications[index % applications.length].application_code,
    standard_name: "ISO 9001:2015",
  },
  documents: index === 0 ? [{
    id: "response-document-1",
    original_name: "Ban-gui-truoc.pdf",
    mime_type: "application/pdf",
    file_size: 512000,
    version_no: 1,
    is_current: true,
    note: null,
    created_at: "2026-10-10T09:00:00.000Z",
    download_url: "/document-files/customer/response-1",
  }] : [],
}));

async function usePortalSession(page) {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value));
  }, session);
}

async function routePortal(page, payload) {
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
    } else if (path === "/customer-portal/me/documents") {
      body = payload;
    } else if (path === "/customer-portal/me/notifications") {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });
  return unexpectedWrites;
}

test("customer document inbox handles dense requests and keeps both upload actions in view", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const unexpectedWrites = await routePortal(page, { applications, requests });
  await usePortalSession(page);

  await page.goto("/portal/documents");
  await expect(page.getByRole("heading", { name: "Tài liệu & yêu cầu bổ sung" })).toBeVisible();
  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    if (size.width < 992) {
      await expect(page.locator('[aria-label="Danh sách yêu cầu bổ sung tài liệu"] .portal-mobile-card')).toHaveCount(10);
      await expect(page.locator(".compact-mobile-pagination")).toContainText("12 yêu cầu");
    } else {
      const requestRows = page.locator(".ant-table-tbody > .ant-table-row");
      await expect(requestRows).toHaveCount(10);
      const firstRow = await requestRows.first().boundingBox();
      expect(firstRow?.height).toBeLessThan(72);
    }
    await captureVisualBaseline(page, testInfo, `customer-documents-inbox-${size.width}`);
  }

  const applicationUploadTrigger = page.locator(".ant-collapse-extra button").first();
  await applicationUploadTrigger.click();
  const applicationDialog = page.getByRole("dialog", { name: /Tải tài liệu · DK-2026-0001/ });
  await expect(applicationDialog).toBeVisible();
  const applicationUpload = applicationDialog.getByRole("button", { name: "Tải lên" });
  await expect(applicationUpload).toBeDisabled();
  await applicationDialog.locator('input[type="file"]').setInputFiles({
    name: "legal-record.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("controlled browser fixture"),
  });
  await expect(applicationUpload).toBeEnabled();
  await applicationDialog.locator(".ant-modal-close").click();
  await expect(applicationDialog).toBeHidden();

  const sendResponse = page.getByRole("button", { name: "Gửi tài liệu" }).first();
  await sendResponse.click();
  const responseDialog = page.getByRole("dialog", { name: /Gửi tài liệu phản hồi/ });
  await expect(responseDialog).toBeVisible();
  const responseSubmit = responseDialog.getByRole("button", { name: "Tải và gửi phản hồi" });
  await expect(responseSubmit).toBeDisabled();
  await responseDialog.locator('input[type="file"]').setInputFiles({
    name: "response.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("controlled browser fixture"),
  });
  await expect(responseSubmit).toBeEnabled();

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    const dialogBox = await responseDialog.boundingBox();
    const actionBox = await responseSubmit.boundingBox();
    expect(dialogBox?.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox?.y + (dialogBox?.height ?? 0)).toBeLessThanOrEqual(size.height);
    expect(actionBox?.y).toBeGreaterThanOrEqual(0);
    expect(actionBox?.y + (actionBox?.height ?? 0)).toBeLessThanOrEqual(size.height);
  }

  await responseDialog.locator(".ant-modal-close").click();
  await expect(responseDialog).toBeHidden();

  expect(unexpectedWrites).toEqual([]);
  expect(runtime.issues.filter((issue) => !issue.includes("Warning: [antd:"))).toEqual([]);
});

test("customer document inbox keeps loading, empty, and retryable error states distinct", async ({ page }) => {
  await usePortalSession(page);
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/customer-portal/me/documents") {
      await new Promise((resolve) => setTimeout(resolve, 450));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ applications: [], requests: [] }) });
      return;
    }
    let body = [];
    if (path === "/auth/me") {
      body = { user: { ...session.user, permissions: ["customer_portal.access"] } };
    } else if (path === "/platform-branding") {
      body = {};
    } else if (path === "/customer-portal/me/notifications") {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    }
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });

  await page.goto("/portal/documents");
  await expect(page.getByText("Đang tải tài liệu Portal...", { exact: true })).toBeVisible();
  await expect(page.getByText("Không có yêu cầu bổ sung tài liệu")).toBeVisible();
  await expect(page.getByText("Chưa có đơn đăng ký")).toBeVisible();

  await page.unrouteAll({ behavior: "wait" });
  let recoverDocuments = false;
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/customer-portal/me/documents") {
      if (!recoverDocuments) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Documents unavailable" }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ applications: [], requests: [] }) });
      return;
    }
    let body = [];
    if (path === "/auth/me") {
      body = { user: { ...session.user, permissions: ["customer_portal.access"] } };
    } else if (path === "/platform-branding") {
      body = {};
    } else if (path === "/customer-portal/me/notifications") {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    }
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });
  await page.reload();
  await expect(page.getByText("Không tải được tài liệu Portal")).toBeVisible({ timeout: 12_000 });
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
  await expect(page.getByText("Không có yêu cầu bổ sung tài liệu")).toHaveCount(0);
  await expect(page.getByText("Chưa có đơn đăng ký")).toHaveCount(0);

  recoverDocuments = true;
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByText("Không có yêu cầu bổ sung tài liệu")).toBeVisible();
  await expect(page.getByText("Chưa có đơn đăng ký")).toBeVisible();
});
