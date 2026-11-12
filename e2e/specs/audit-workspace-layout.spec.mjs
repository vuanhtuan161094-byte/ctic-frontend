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
      if (section.key === "team" && size.width <= 767) {
        const memberMeta = page.locator(".cmp-audit-team-list .ant-list-item-meta").first();
        await expect(memberMeta).toBeVisible();
        const bounds = await memberMeta.boundingBox();
        expect(bounds?.width ?? 0, "Team members need a readable label width").toBeGreaterThanOrEqual(200);
      }
      const sectionTop = await page.locator(".cmp-audit-section").evaluate((element) => element.getBoundingClientRect().top);
      if (size.width >= 1280) {
        expect(sectionTop, "Audit content should start early enough to use the desktop viewport").toBeLessThan(420);
      }
      if (size.width <= 767) {
        await page.evaluate(() => document.fonts.ready);
        const navigation = page.getByRole("navigation", { name: "Khu vực cuộc đánh giá" });
        const selectedTab = navigation.locator('[aria-current="page"]');
        await expect.poll(async () => {
          const [navigationBox, selectedBox] = await Promise.all([navigation.boundingBox(), selectedTab.boundingBox()]);
          if (!navigationBox || !selectedBox) return false;
          return selectedBox.x >= navigationBox.x - 1
            && selectedBox.x + selectedBox.width <= navigationBox.x + navigationBox.width + 1;
        }).toBe(true);
      }
      await captureVisualBaseline(page, testInfo, `audit-${section.key}-${size.width}`);
    }

    expect(runtimeErrors).toEqual([]);
  });
}
