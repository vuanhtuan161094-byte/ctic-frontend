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
  country_code: "VN",
  country_name: "Việt Nam",
  tax_code: "0312345678",
  address: "Lô B12, Khu công nghiệp Đông Nam Bộ, Thành phố Hồ Chí Minh",
  phone: "02812345678",
  email: "office@example.invalid",
  status: "ACTIVE",
  contacts: Array.from({ length: 3 }, (_, index) => ({
    id: `contact-${index + 1}`,
    full_name: ["Nguyễn Minh Anh", "Trần Thu Hà", "Lê Quang Huy"][index],
    email: `contact-${index + 1}@example.invalid`,
    phone: `090000000${index}`,
    position: ["Tổng giám đốc", "Quản lý chất lượng", "Điều phối vận hành"][index],
  })),
};

const changeRequests = Array.from({ length: 12 }, (_, index) => {
  const beforeOrganization = { ...organization, contacts: undefined };
  const afterOrganization = {
    ...beforeOrganization,
    address: `${organization.address}, cập nhật ${index + 1}`,
  };
  const contact = organization.contacts[index % organization.contacts.length];
  return {
    id: `change-request-${index + 1}`,
    request_code: `YCTD-2026-${String(index + 1).padStart(4, "0")}`,
    customer_id: organization.id,
    status: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"][index % 4],
    reason: `Cập nhật thông tin địa chỉ theo hồ sơ doanh nghiệp lần ${index + 1}.`,
    before_snapshot: {
      organization: beforeOrganization,
      contact: { id: contact.id, full_name: contact.full_name, position: contact.position, phone: contact.phone, email: contact.email },
    },
    after_snapshot: {
      organization: afterOrganization,
      contact: { id: contact.id, full_name: contact.full_name, position: contact.position, phone: contact.phone, email: contact.email },
    },
    review_comment: index % 4 === 3 ? "Vui lòng gửi kèm tài liệu xác nhận địa chỉ mới." : null,
    submitted_at: `2026-10-${String(18 - index).padStart(2, "0")}T09:30:00.000Z`,
    reviewed_at: null,
    applied_at: null,
    customer: { customer_code: organization.customer_code, company_name: organization.company_name },
    reviewer: null,
    attachments: [],
  };
});

test("customer organization profile and change request stay usable across viewports", async ({ page }, testInfo) => {
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
    } else if (path === "/customer-portal/me/profile") {
      body = [organization];
    } else if (path === "/customer-portal/me/organization-change-requests") {
      body = changeRequests;
    } else if (path === "/customer-portal/me/notifications") {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });

  await page.goto("/portal/organization");
  await expect(page.getByRole("heading", { name: "Hồ sơ tổ chức" })).toBeVisible();
  await expect(page.getByText(organization.company_name)).toBeVisible();
  const history = page.locator(".projects-screen.customer-portal-screen > .ant-card").last();
  await expect(history.locator(".ant-list-item")).toHaveCount(6);
  await history.locator(".ant-pagination-next").click();
  await expect(history).toContainText("YCTD-2026-0007");
  await expect(history).not.toContainText("YCTD-2026-0001");

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await captureVisualBaseline(page, testInfo, `customer-organization-profile-${size.width}`);
  }

  await page.getByRole("button", { name: "Yêu cầu thay đổi" }).click();
  const dialog = page.getByRole("dialog", { name: /Yêu cầu thay đổi hồ sơ/ });
  await expect(dialog).toBeVisible();
  const saveButton = dialog.getByRole("button", { name: "Gửi yêu cầu" });
  await expect(saveButton).toBeVisible();

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    const geometry = await dialog.evaluate((element) => {
      const dialogRect = element.getBoundingClientRect();
      const containerRect = element.querySelector(".ant-modal-container").getBoundingClientRect();
      const body = element.querySelector(".ant-modal-body");
      const bodyRect = body.getBoundingClientRect();
      const action = element.querySelector(".ant-modal-footer").getBoundingClientRect();
      return {
        dialog: { top: dialogRect.top, bottom: dialogRect.bottom, height: dialogRect.height },
        container: { top: containerRect.top, bottom: containerRect.bottom, height: containerRect.height },
        body: { top: bodyRect.top, bottom: bodyRect.bottom, height: bodyRect.height, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight },
        action: { top: action.top, bottom: action.bottom },
      };
    });
    console.log(`change request ${size.width}x${size.height} ${JSON.stringify(geometry)}`);
    expect(geometry.container.top).toBeGreaterThanOrEqual(0);
    expect(geometry.container.bottom).toBeLessThanOrEqual(size.height);
    expect(geometry.body.scrollHeight).toBeGreaterThan(geometry.body.clientHeight);
    expect(geometry.action.top).toBeGreaterThanOrEqual(0);
    expect(geometry.action.bottom).toBeLessThanOrEqual(size.height);
    await dialog.locator(".ant-modal-body").evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const actionAfterScroll = await saveButton.boundingBox();
    expect(actionAfterScroll?.y).toBeGreaterThanOrEqual(0);
    expect(actionAfterScroll?.y + (actionAfterScroll?.height ?? 0)).toBeLessThanOrEqual(size.height);
    await captureVisualBaseline(page, testInfo, `customer-profile-change-request-${size.width}`);
  }

  expect(unexpectedWrites).toEqual([]);
  expect(runtime.issues.filter((issue) => !issue.includes("Warning: [antd:"))).toEqual([]);
});
