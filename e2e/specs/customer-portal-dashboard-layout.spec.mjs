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

const upcomingAudits = Array.from({ length: 6 }, (_, index) => ({
  id: `portal-audit-${index + 1}`,
  plan_code: `KH-2026-${String(index + 1).padStart(4, "0")}`,
  audit_type: index % 2 ? "Đánh giá giám sát lần 1" : "Đánh giá chứng nhận lần đầu",
  planned_start_date: `2026-11-${String(3 + index * 3).padStart(2, "0")}`,
  planned_end_date: `2026-11-${String(4 + index * 3).padStart(2, "0")}`,
  location: "Nhà máy và trung tâm vận hành tại nhiều địa điểm trên toàn quốc",
  project_code: `HS-2026-${String(index + 1).padStart(4, "0")}`,
  standard_name: "ISO 9001:2015 + ISO 14001:2015",
}));

const dashboard = {
  customers: [{
    id: "portal-customer-1",
    customer_code: "KH-2026-0098",
    company_name: "Công ty Cổ phần Giải pháp Công nghiệp và Chuỗi Cung ứng Miền Đông Nam Bộ",
  }],
  summary: {
    applications: 3,
    active_projects: 7,
    open_corrective_actions: 2,
    active_certificates: 5,
    unread_notifications: 4,
  },
  upcoming_audits: upcomingAudits,
};

test("customer portal dashboard fits dense data and supports keyboard shortcuts", async ({ page }, testInfo) => {
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
    } else if (path === "/customer-portal/me/dashboard") {
      body = dashboard;
    } else if (path === "/customer-portal/me/notifications") {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    }

    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
  });

  await page.goto("/portal");
  await expect(page.getByRole("heading", { name: "Tổng quan chứng nhận" })).toBeVisible();
  await expect(page.getByText(dashboard.customers[0].company_name)).toBeVisible();
  const summaryCards = page.locator(".customer-portal-screen .project-summary-grid > .ant-card");
  await expect(summaryCards).toHaveCount(5);
  await expect(page.locator(".customer-portal-screen .ant-list-item")).toHaveCount(upcomingAudits.length);

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    const geometry = await summaryCards.evaluateAll((cards) => {
      const boxes = cards.map((card) => {
        const { top, width } = card.getBoundingClientRect();
        return { top, width };
      });
      const rowTops = [...new Set(boxes.map(({ top }) => Math.round(top)))];
      return {
        rows: rowTops.length,
        rowTops,
        widths: boxes.map(({ width }) => width),
      };
    });
    if (size.width >= 1280) {
      expect(geometry.rows, "All five customer summary actions should share one desktop row").toBe(1);
      expect(Math.max(...geometry.widths) - Math.min(...geometry.widths)).toBeLessThanOrEqual(2);
    } else {
      expect(geometry.rows).toBe(3);
    }
    const auditsHeader = page.locator(".customer-portal-upcoming-audits > .ant-card-head");
    const auditsTitle = auditsHeader.locator(".ant-card-head-title");
    const scheduleButton = auditsHeader.getByRole("button", { name: "Xem toàn bộ lịch" });
    await expect(auditsTitle).toHaveText("Lịch đánh giá sắp tới");
    const headerGeometry = await auditsHeader.evaluate((header) => {
      const title = header.querySelector(".ant-card-head-title");
      const action = header.querySelector(".ant-card-extra .ant-btn");
      const titleRect = title.getBoundingClientRect();
      const actionRect = action.getBoundingClientRect();
      return {
        titleScrollWidth: title.scrollWidth,
        titleClientWidth: title.clientWidth,
        titleBottom: titleRect.bottom,
        actionTop: actionRect.top,
        actionWidth: actionRect.width,
        headerWidth: header.getBoundingClientRect().width,
      };
    });
    expect(headerGeometry.titleScrollWidth, "The entire upcoming-audit heading must fit without ellipsis").toBeLessThanOrEqual(headerGeometry.titleClientWidth + 1);
    if (size.width < 681) {
      expect(headerGeometry.actionTop, "The schedule action must occupy its own row below the full title").toBeGreaterThanOrEqual(headerGeometry.titleBottom - 1);
      expect(headerGeometry.actionWidth, "The mobile action should be easy to tap").toBeGreaterThan(200);
      const fifthCard = summaryCards.nth(4);
      const gridWidth = await page.locator(".customer-portal-screen .project-summary-grid").evaluate((element) => element.getBoundingClientRect().width);
      const fifthWidth = await fifthCard.evaluate((element) => element.getBoundingClientRect().width);
      expect(fifthWidth, "The final summary card should use the otherwise empty mobile row").toBeGreaterThanOrEqual(gridWidth - 2);
    }
    await expect(scheduleButton).toBeVisible();
    await captureVisualBaseline(page, testInfo, `customer-portal-dashboard-${size.width}`, { fullPage: false });
  }

  const applicationsShortcut = page.getByRole("button", { name: "Đơn đăng ký: 3", exact: true });
  await applicationsShortcut.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/portal\/applications$/);

  expect(unexpectedWrites).toEqual([]);
  expect(runtime.issues.filter((issue) => !issue.includes("Warning: [antd:"))).toEqual([]);
});
