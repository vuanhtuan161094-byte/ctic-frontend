import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
} from "../helpers/quality.mjs";

const workspaces = [
  {
    name: "decision",
    path: "/__dev/decision-workspace?actor=assigned",
    readyText: "Quyết định chứng nhận",
  },
  {
    name: "issuance",
    path: "/__dev/certificate-workspace?actor=pending",
    readyText: "Căn cứ phát hành",
  },
];

for (const workspace of workspaces) {
  test(`${workspace.name} empty current-certificate state is compact`, async ({ page }, testInfo) => {
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.goto(workspace.path);
    await expect(page.getByText(workspace.readyText, { exact: true }).first()).toBeVisible();
    await expect(page.locator(".cmp-compact-empty-card")).toBeVisible();

    const sizes = testInfo.project.name === "desktop-1440x900"
      ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
      : [{ width: 390, height: 844 }];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await expectNoHorizontalOverflow(page);
      const body = page.locator(".cmp-compact-empty-card > .ant-card-body");
      const box = await body.boundingBox();
      expect(box?.height, `Empty-state card body should stay compact at ${size.width}px`).toBeLessThanOrEqual(90);
      await captureVisualBaseline(page, testInfo, `${workspace.name}-empty-${size.width}`);
    }

    expect(runtimeErrors).toEqual([]);
  });
}
