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

const records = {
  changes: Array.from({ length: 12 }, (_, index) => ({
    id: `change-${index + 1}`,
    case_number: `TD-2026-${String(index + 1).padStart(4, "0")}`,
    subject: `Đề nghị thay đổi phạm vi chứng nhận lần ${index + 1}`,
    status: index === 0 ? "IMPACT_ASSESSED" : "SUBMITTED",
    created_at: "2026-10-12T09:00:00.000Z",
  })),
  complaints: Array.from({ length: 12 }, (_, index) => ({
    id: `complaint-${index + 1}`,
    complaint_number: `KN-2026-${String(index + 1).padStart(4, "0")}`,
    subject: `Khiếu nại về hoạt động đánh giá lần ${index + 1}`,
    description: `Nội dung chi tiết của khiếu nại ${index + 1}.`,
    status: index === 0 ? "RECEIVED" : "UNDER_REVIEW",
    overdue: index === 1,
    assessment_outcome: null,
    final_response: null,
    evidence: [],
    created_at: "2026-10-12T09:00:00.000Z",
  })),
  appeals: Array.from({ length: 12 }, (_, index) => ({
    id: `appeal-${index + 1}`,
    appeal_number: `KN-2026-A${String(index + 1).padStart(3, "0")}`,
    grounds: `Lý do kháng nghị ${index + 1}.`,
    status: index === 0 ? "SUBMITTED" : "DECISION_PENDING",
    challenged_decision: {
      id: `decision-${index + 1}`,
      decision_number: `QD-2026-${String(index + 1).padStart(4, "0")}`,
      decision_type: "CERTIFICATION_GRANTED",
      decision_date: "2026-10-01",
    },
    evidence: [],
    created_at: "2026-10-12T09:00:00.000Z",
  })),
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
    } else if (path.startsWith("/customer-portal/me/cases/")) {
      body = records[path.split("/").at(-1)] ?? [];
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });
  return unexpectedWrites;
}

test("customer case workspace is searchable, localized, and fits desktop and mobile", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const unexpectedWrites = await routePortal(page);
  await usePortalSession(page);

  await page.goto("/portal/requests");
  await expect(page.getByRole("heading", { name: "Thay đổi, khiếu nại & kháng nghị" })).toBeVisible();
  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    if (size.width < 992) {
      await expect(page.locator('[aria-label="Danh sách yêu cầu và phản hồi"] .portal-mobile-card')).toHaveCount(10);
      await expect(page.locator(".compact-mobile-pagination")).toContainText("12 hồ sơ");
    } else {
      await expect(page.locator(".ant-table-tbody > .ant-table-row")).toHaveCount(10);
    }
    await captureVisualBaseline(page, testInfo, `customer-cases-${size.width}`);
  }

  if (testInfo.project.name === "mobile-390x844") {
    const domainSelector = page.getByRole("combobox", { name: "Loại yêu cầu" });
    await domainSelector.click();
    await domainSelector.press("ArrowDown");
    await domainSelector.press("Enter");
  } else {
    await page.getByRole("tab", { name: "Khiếu nại" }).click();
  }
  await expect(page.getByText("Đã tiếp nhận", { exact: true })).toBeVisible();
  const search = page.getByPlaceholder("Tìm mã hồ sơ hoặc nội dung");
  await search.fill("KN-2026-0007");
  if (testInfo.project.name === "mobile-390x844") {
    await expect(page.locator('[aria-label="Danh sách yêu cầu và phản hồi"] .portal-mobile-card')).toHaveCount(1);
  } else {
    await expect(page.locator(".ant-table-tbody > .ant-table-row")).toHaveCount(1);
  }
  await search.clear();
  await search.fill("Đã tiếp nhận");
  if (testInfo.project.name === "mobile-390x844") {
    await expect(page.locator('[aria-label="Danh sách yêu cầu và phản hồi"] .portal-mobile-card')).toHaveCount(1);
  } else {
    await expect(page.locator(".ant-table-tbody > .ant-table-row")).toHaveCount(1);
  }
  await search.clear();

  const detailTrigger = testInfo.project.name === "mobile-390x844"
    ? page.getByRole("button", { name: "Xem chi tiết" }).first()
    : page.getByRole("button", { name: "Xem" }).first();
  await detailTrigger.click();
  const drawer = page.locator(".ant-drawer-content-wrapper");
  await expect(drawer).toBeVisible();
  const drawerBox = await drawer.boundingBox();
  expect(drawerBox?.x).toBeGreaterThanOrEqual(0);
  expect(drawerBox?.width).toBeLessThanOrEqual(sizes.at(-1).width);
  await expect(page.getByText("Kết quả xem xét")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.locator(".ant-drawer-close").click();

  await page.getByRole("button", { name: "Gửi khiếu nại" }).click();
  const dialog = page.getByRole("dialog", { name: "Gửi khiếu nại" });
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  const dialogSubmit = dialog.getByRole("button", { name: "Gửi khiếu nại" });
  const submitBox = await dialogSubmit.boundingBox();
  expect(dialogBox?.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox?.x + (dialogBox?.width ?? 0)).toBeLessThanOrEqual(sizes.at(-1).width);
  expect(submitBox?.y + (submitBox?.height ?? 0)).toBeLessThanOrEqual(sizes.at(-1).height);
  await expect(dialogSubmit).toBeDisabled();

  await dialog.getByPlaceholder("Người gửi").fill("Nguyen Van A");
  await dialog.getByPlaceholder("Chủ đề khiếu nại").fill("Kiểm tra kết quả");
  await dialog.getByPlaceholder("Mô tả khiếu nại").fill("Nội dung kiểm tra cho hồ sơ.");
  await expect(dialogSubmit).toBeEnabled();
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "evidence.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("controlled browser fixture"),
  });
  await expect(dialog.getByText("evidence.pdf")).toBeVisible();
  await dialog.locator(".ant-modal-close").click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Gửi khiếu nại" }).click();
  const reopenedDialog = page.getByRole("dialog", { name: "Gửi khiếu nại" });
  await expect(reopenedDialog.getByPlaceholder("Người gửi")).toHaveValue("");
  await expect(reopenedDialog.getByPlaceholder("Chủ đề khiếu nại")).toHaveValue("");
  await expect(reopenedDialog.getByPlaceholder("Mô tả khiếu nại")).toHaveValue("");
  await expect(reopenedDialog.getByText("evidence.pdf")).toHaveCount(0);
  await expect(reopenedDialog.getByRole("button", { name: "Gửi khiếu nại" })).toBeDisabled();
  await expectNoHorizontalOverflow(page);

  expect(unexpectedWrites).toEqual([]);
  expect(runtime.issues).toEqual([]);
});
