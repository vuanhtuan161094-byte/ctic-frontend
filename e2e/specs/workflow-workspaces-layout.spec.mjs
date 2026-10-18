import { expect, test } from "@playwright/test";

import {
  captureVisualBaseline,
  expectNoHorizontalOverflow,
} from "../helpers/quality.mjs";

const workspaces = [
  { name: "NC and corrective action", path: "/__dev/cap-workspace?actor=reviewer", heading: "NC-MAU-001" },
  { name: "technical review", path: "/__dev/technical-review-workspace?actor=assigned", heading: "Thẩm xét kỹ thuật" },
  { name: "certification decision", path: "/__dev/decision-workspace?actor=assigned", heading: "Quyết định chứng nhận" },
  { name: "current certificate", path: "/__dev/certificate-workspace?actor=issued", heading: "CTIC-MAU-2026-0042-V2" },
  { name: "certificate issuance", path: "/__dev/certificate-workspace?actor=pending", text: "Căn cứ phát hành" },
];

for (const workspace of workspaces) {
  test(`${workspace.name} workspace renders across desktop and mobile`, async ({ page }, testInfo) => {
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    await page.goto(workspace.path);
    if (workspace.heading) {
      await expect(page.getByRole("heading", { name: workspace.heading }).first()).toBeVisible();
    } else {
      await expect(page.getByText(workspace.text, { exact: true }).first()).toBeVisible();
    }

    const sizes = testInfo.project.name === "desktop-1440x900"
      ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
      : [{ width: 390, height: 844 }];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await expectNoHorizontalOverflow(page);
      await captureVisualBaseline(page, testInfo, `${workspace.name}-${size.width}`);
    }

    expect(runtimeErrors, `Unexpected runtime errors in ${workspace.name}`).toEqual([]);
  });
}
