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
      if (workspace.name === "certificate issuance") {
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        const modalBody = dialog.locator(".ant-modal-body");
        await modalBody.evaluate((element) => { element.scrollTop = 0; });
        const issuanceLayout = await dialog.evaluate((element) => {
          const container = element.querySelector(".ant-modal-container");
          const body = element.querySelector(".ant-modal-body");
          const evidence = element.querySelector(".certificate-issuance-workspace .ant-descriptions-view");
          const containerRect = container?.getBoundingClientRect();
          return {
            containerBottom: containerRect?.bottom ?? Number.POSITIVE_INFINITY,
            bodyClientHeight: body?.clientHeight ?? 0,
            bodyScrollHeight: body?.scrollHeight ?? 0,
            bodyOverflowY: body ? getComputedStyle(body).overflowY : "missing",
            evidenceClientWidth: evidence?.clientWidth ?? 0,
            evidenceScrollWidth: evidence?.scrollWidth ?? 0,
          };
        });
        expect(issuanceLayout.containerBottom).toBeLessThanOrEqual(size.height + 1);
        expect(issuanceLayout.bodyOverflowY).toBe("auto");
        expect(issuanceLayout.bodyScrollHeight).toBeGreaterThan(issuanceLayout.bodyClientHeight);
        expect(issuanceLayout.evidenceScrollWidth).toBeLessThanOrEqual(issuanceLayout.evidenceClientWidth + 1);
        if (size.width <= 767) {
          const workflowSteps = dialog.locator(".certificate-issuance-workspace .ant-steps.ant-steps-filled.ant-steps-vertical");
          await expect(workflowSteps).toBeVisible();
          await expect(workflowSteps.locator(".ant-steps-item-title")).toHaveCount(5);
          await expect(workflowSteps.locator(".ant-steps-item-title").nth(3)).toHaveText("Phát hành chứng chỉ");
        }
        await testInfo.attach(`certificate-issuance-layout-${size.width}`, {
          body: Buffer.from(JSON.stringify({ size, ...issuanceLayout }, null, 2)),
          contentType: "application/json",
        });
        await captureVisualBaseline(page, testInfo, `${workspace.name}-${size.width}`);
        await modalBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
        await expect(dialog.locator(".certificate-issuance-workspace form button[type=submit]")).toBeInViewport();
        continue;
      }
      await captureVisualBaseline(page, testInfo, `${workspace.name}-${size.width}`);
    }

    expect(runtimeErrors, `Unexpected runtime errors in ${workspace.name}`).toEqual([]);
  });
}
