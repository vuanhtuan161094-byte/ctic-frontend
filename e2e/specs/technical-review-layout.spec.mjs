import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
} from "../helpers/quality.mjs";

test("technical review actions fit the table at desktop widths", async ({ page }, testInfo) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto("/__dev/technical-review-workspace?actor=assigned");
  await expect(page.getByRole("heading", { name: "Thẩm xét kỹ thuật" })).toBeVisible();

  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);

    if (size.width > 768) {
      const table = page.locator(".cmp-review-page .ant-table-wrapper").first();
      await expect(table).toBeVisible();
      const actionButtons = page.locator(".cmp-review-page .ant-table-row").first().locator("td:last-child .ant-btn");
      await expect(actionButtons).toHaveCount(3);
      const bounds = await actionButtons.evaluateAll((buttons) => {
        const wrapper = document.querySelector(".cmp-review-page .ant-table-wrapper");
        const wrapperBounds = wrapper.getBoundingClientRect();
        return {
          wrapperLeft: wrapperBounds.left,
          wrapperRight: wrapperBounds.right,
          buttons: buttons.map((button) => ({
            label: button.textContent.trim(),
            left: button.getBoundingClientRect().left,
            right: button.getBoundingClientRect().right,
            top: button.getBoundingClientRect().top,
          })),
        };
      });
      expect(
        bounds.buttons.every((button) => button.left >= bounds.wrapperLeft - 1
          && button.right <= bounds.wrapperRight + 1),
        `Action buttons should fit the visible review table: ${JSON.stringify(bounds)}`,
      ).toBe(true);
      expect(
        Math.max(...bounds.buttons.map((button) => button.top))
          - Math.min(...bounds.buttons.map((button) => button.top)),
        `Review row actions should stay on one line: ${JSON.stringify(bounds.buttons)}`,
      ).toBeLessThanOrEqual(1);
    } else {
      await expect(page.locator(".cmp-responsive-card-list").first()).toBeVisible();
    }

    await captureVisualBaseline(page, testInfo, `technical-review-${size.width}`);
  }

  expect(runtimeErrors).toEqual([]);
});
