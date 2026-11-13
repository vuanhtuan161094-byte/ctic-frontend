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

const group = {
  customer_id: "portal-customer-1",
  customer_code: "KH-2026-0098",
  company_name: "Công ty Cổ phần Giải pháp Công nghiệp và Chuỗi Cung ứng Miền Đông Nam Bộ",
  users: Array.from({ length: 12 }, (_, index) => ({
    access_id: `access-${index + 1}`,
    user_id: `user-${index + 1}`,
    email: `user-${index + 1}@example.invalid`,
    full_name: `Người dùng Portal ${String(index + 1).padStart(2, "0")}`,
    account_status: "ACTIVE",
    access_status: index === 11 ? "REVOKED" : "ACTIVE",
    created_at: "2026-01-01T09:00:00.000Z",
    updated_at: "2026-10-18T09:00:00.000Z",
  })),
  history: Array.from({ length: 12 }, (_, index) => ({
    id: `history-${index + 1}`,
    user_id: `user-${index + 1}`,
    email: `user-${index + 1}@example.invalid`,
    full_name: `Người dùng Portal ${String(index + 1).padStart(2, "0")}`,
    action: ["ASSIGNED", "REACTIVATED", "REVOKED"][index % 3],
    source: index % 2 ? "CUSTOMER_REQUEST" : "CERTIFICATION_BODY",
    request_code: `YCTK-2026-${String(index + 1).padStart(4, "0")}`,
    changed_at: `2026-10-${String(18 - index).padStart(2, "0")}T09:30:00.000Z`,
  })),
};

const requests = Array.from({ length: 12 }, (_, index) => ({
  id: `request-${index + 1}`,
  request_code: `YCTK-2026-${String(index + 1).padStart(4, "0")}`,
  customer_id: group.customer_id,
  request_type: ["ADD_USER", "REVOKE_ACCESS", "REACTIVATE_ACCESS"][index % 3],
  target_user_id: index ? `user-${index}` : null,
  requested_email: index ? `user-${index}@example.invalid` : `new-user-${index + 1}@example.invalid`,
  requested_full_name: index ? `Người dùng Portal ${String(index).padStart(2, "0")}` : "Người dùng mới",
  status: ["SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"][index % 4],
  reason: `Điều chỉnh quyền truy cập theo nhu cầu vận hành lần ${index + 1}.`,
  review_comment: index % 4 === 2 ? "Vui lòng xác nhận lại phạm vi quyền." : null,
  submitted_at: `2026-10-${String(18 - index).padStart(2, "0")}T09:30:00.000Z`,
  reviewed_at: null,
  customer: { customer_code: group.customer_code, company_name: group.company_name },
  target_user: index ? { email: `user-${index}@example.invalid`, full_name: `Người dùng Portal ${String(index).padStart(2, "0")}` } : null,
  resolved_user: null,
}));

async function usePortalSession(page) {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value));
  }, session);
}

test("portal access administration handles dense data and keeps its request action usable", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const unexpectedWrites = [];
  await usePortalSession(page);

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
    } else if (path === "/customer-portal/me/user-access") {
      body = [group];
    } else if (path === "/customer-portal/me/user-access-requests") {
      body = requests;
    } else if (path === "/customer-portal/me/notifications") {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });

  await page.goto("/portal/organization?tab=access");
  await expect(page.getByRole("heading", { name: "Tài khoản Portal" })).toBeVisible();
  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await page.getByRole("tab", { name: "Người dùng" }).click();
    if (size.width < 992) {
      await expect(page.locator('[aria-label="Người dùng Portal"] .portal-mobile-card')).toHaveCount(10);
    } else {
      await expect(page.locator(".ant-table-tbody > .ant-table-row").first()).toBeVisible();
      const userRows = page.locator(".ant-table").first().locator(".ant-table-tbody > .ant-table-row");
      await expect(userRows).toHaveCount(10);
    }
    const organizationName = page.locator(".customer-portal-users__organization-name");
    await expect(organizationName).toHaveText(group.company_name);
    const organizationLayout = await organizationName.evaluate((element) => ({
      whiteSpace: getComputedStyle(element).whiteSpace,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(organizationLayout.whiteSpace).toBe("normal");
    expect(organizationLayout.scrollWidth, "The full company name must wrap without being clipped").toBeLessThanOrEqual(organizationLayout.clientWidth + 1);
    await captureVisualBaseline(page, testInfo, `customer-portal-access-users-${size.width}`);

    await page.getByRole("tab", { name: "Yêu cầu" }).click();
    if (size.width < 992) {
      await expect(page.locator('[aria-label="Lịch sử yêu cầu quản trị tài khoản"] .portal-mobile-card')).toHaveCount(10);
    } else {
      await expect(page.locator(".ant-table-tbody > .ant-table-row")).toHaveCount(10);
    }
    await captureVisualBaseline(page, testInfo, `customer-portal-access-requests-${size.width}`);

    await page.getByRole("tab", { name: "Lịch sử quyền" }).click();
    if (size.width < 992) {
      await expect(page.locator('[aria-label="Lịch sử quyền truy cập"] .portal-mobile-card')).toHaveCount(10);
    } else {
      await expect(page.locator(".ant-table-tbody > .ant-table-row")).toHaveCount(10);
    }
    await captureVisualBaseline(page, testInfo, `customer-portal-access-history-${size.width}`);
  }

  await page.getByRole("tab", { name: "Người dùng" }).click();
  await page.getByRole("button", { name: "Đề nghị bổ sung người dùng" }).click();
  const dialog = page.getByRole("dialog", { name: "Bổ sung người dùng" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Họ và tên")).toBeVisible();
  await expect(dialog.getByLabel("Email")).toBeVisible();
  const submit = dialog.getByRole("button", { name: "Gửi yêu cầu" });
  await expect(submit).toBeVisible();
  const action = await submit.boundingBox();
  expect(action?.y).toBeGreaterThanOrEqual(0);
  expect(action?.y + (action?.height ?? 0)).toBeLessThanOrEqual(page.viewportSize().height);

  expect(unexpectedWrites).toEqual([]);
  expect(runtime.issues.filter((issue) => !issue.includes("Warning: [antd:"))).toEqual([]);
});

test("portal access screen distinguishes loading from a failed request history", async ({ page }) => {
  await usePortalSession(page);
  // Hold the actual API response until the loading state is observed.
  // A fixed sleep makes this assertion race with React hydration on CI.
  let releaseAccess;
  const accessGate = new Promise((resolve) => { releaseAccess = resolve; });
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/customer-portal/me/user-access") {
      await accessGate;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([group]) });
      return;
    }
    if (path === "/customer-portal/me/user-access-requests") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Request history unavailable" }) });
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

  try {
    await page.goto("/portal/organization?tab=access");
    await expect(page.getByText("Đang tải người dùng Portal...", { exact: true })).toBeVisible();
  } finally {
    // Avoid leaving an intercepted request hanging after a failed assertion.
    releaseAccess();
  }
  await expect(page.getByRole("heading", { name: "Tài khoản Portal" })).toBeVisible();
  await page.getByRole("tab", { name: "Yêu cầu" }).click();
  await expect(page.getByText("Không tải được lịch sử yêu cầu quản trị tài khoản")).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText("Chưa có yêu cầu quản trị tài khoản")).toHaveCount(0);
});
