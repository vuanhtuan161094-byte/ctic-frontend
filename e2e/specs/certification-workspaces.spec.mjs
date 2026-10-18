import { expect, test } from "@playwright/test";

import {
  assertControlledScreenQuality,
  watchRuntimeIssues,
} from "../helpers/quality.mjs";

const showcasePath = "/__dev/certification-case-showcase";

async function openControlledView(page, view, extra = "") {
  const query = new URLSearchParams({ view });
  if (extra) {
    for (const [key, value] of new URLSearchParams(extra)) {
      query.set(key, value);
    }
  }
  await page.goto(`${showcasePath}?${query.toString()}`);
  await expect(page.getByText("DEV · MOCK DATA")).toBeVisible();
}

test.describe("controlled certification browser baseline", () => {
  test("registry has no runtime errors, blocking axe violations or page overflow", async ({ page }, testInfo) => {
    const runtime = watchRuntimeIssues(page);
    await openControlledView(page, "registry");

    await expect(page.getByRole("heading", { name: "Hồ sơ chứng nhận" })).toBeVisible();
    const registry = page.getByRole("region", { name: "Sổ hồ sơ chứng nhận" });
    await expect(registry).toBeVisible();
    await expect(registry).toContainText("HS-MAU-2026-0042");
    await expect(registry.getByRole("button", { name: "Mở hồ sơ" }).first()).toBeVisible();

    if ((page.viewportSize()?.width ?? 0) >= 1280) {
      const firstRow = registry.getByRole("row").nth(1);
      const status = firstRow.locator('[data-status-domain="case"]');
      const action = firstRow.getByRole("button", { name: /Mở hồ sơ/ });
      const [statusBox, actionBox] = await Promise.all([status.boundingBox(), action.boundingBox()]);
      expect(statusBox, "Expected the case status badge to have desktop bounds").not.toBeNull();
      expect(actionBox, "Expected the case action to have desktop bounds").not.toBeNull();
      expect(statusBox.x + statusBox.width).toBeLessThanOrEqual(actionBox.x + 1);
    }

    await assertControlledScreenQuality(page, testInfo, "certification-registry");
    runtime.assertClean();
  });

  test("registry opens the canonical case overview fixture", async ({ page }, testInfo) => {
    const runtime = watchRuntimeIssues(page);
    await openControlledView(page, "registry");

    await page.getByRole("button", { name: /Mở hồ sơ/ }).first().click();
    await expect(page).toHaveURL(/view=overview/);
    await expect(page.getByText("HS-MAU-2026-0042").first()).toBeVisible();

    if ((page.viewportSize()?.width ?? 0) >= 1280) {
      const identityRow = page.locator(".cmp-case-identity-block dl > div").first();
      await expect(identityRow).toHaveCount(1);
      const display = await identityRow.evaluate((element) => getComputedStyle(element).display);
      expect(display).toBe("grid");
      const [labelBox, valueBox] = await Promise.all([
        identityRow.locator("dt").boundingBox(),
        identityRow.locator("dd").boundingBox(),
      ]);
      expect(labelBox).not.toBeNull();
      expect(valueBox).not.toBeNull();
      expect(valueBox.x).toBeGreaterThan(labelBox.x + labelBox.width);
    }

    await assertControlledScreenQuality(page, testInfo, "certification-case-overview");
    runtime.assertClean();
  });

  test("audit workspace fixture renders under the same browser quality gates", async ({ page }, testInfo) => {
    const runtime = watchRuntimeIssues(page);
    await openControlledView(page, "audit", "section=overview");

    await expect(page.getByText("KHĐG-MAU-2026-0042-GĐ2").first()).toBeVisible();

    await assertControlledScreenQuality(page, testInfo, "certification-audit-overview");
    runtime.assertClean();
  });
});
