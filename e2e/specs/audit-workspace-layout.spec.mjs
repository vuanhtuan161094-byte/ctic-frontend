import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
} from "../helpers/quality.mjs";

const sections = [
  { key: "overview", heading: "Tổng quan cuộc đánh giá" },
  { key: "team", heading: "Đoàn đánh giá và ngày công" },
  { key: "plan", heading: "Kế hoạch cuộc đánh giá" },
  { key: "execution", heading: "Thực hiện và báo cáo" },
  { key: "findings", heading: "Phát hiện và Hành động khắc phục" },
  { key: "documents", heading: "Tài liệu cuộc đánh giá" },
  { key: "activity", heading: "Hoạt động theo chu kỳ" },
];

for (const section of sections) {
  test(`audit ${section.key} section fits requested viewports`, async ({ page }, testInfo) => {
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.goto(`/__dev/certification-case-showcase?view=audit&section=${section.key}`);
    await expect(page.getByText("DEV · MOCK DATA")).toBeVisible();
    await expect(page.getByRole("heading", { name: section.heading }).last()).toBeVisible();
    if (section.key === "team") {
      const team = page.locator(".cmp-audit-team-list");
      await expect(team).toContainText("Đã xác nhận");
      await expect(team).toContainText("Chờ xác nhận");
      await expect(team).not.toContainText("pending_confirmation");
    }

    const sizes = testInfo.project.name === "desktop-1440x900"
      ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
      : [{ width: 390, height: 844 }];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await expectNoHorizontalOverflow(page);
      await captureVisualBaseline(page, testInfo, `audit-${section.key}-${size.width}`);
    }

    expect(runtimeErrors).toEqual([]);
  });
}
