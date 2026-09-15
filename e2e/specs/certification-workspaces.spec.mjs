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
    await expect(page.getByText("HS-MAU-2026-0042")).toBeVisible();

    await assertControlledScreenQuality(page, testInfo, "certification-registry");
    runtime.assertClean();
  });

  test("registry opens the canonical case overview fixture", async ({ page }, testInfo) => {
    const runtime = watchRuntimeIssues(page);
    await openControlledView(page, "registry");

    await page.getByRole("button", { name: /Mở hồ sơ/ }).first().click();
    await expect(page).toHaveURL(/view=overview/);
    await expect(page.getByText("HS-MAU-2026-0042").first()).toBeVisible();

    await assertControlledScreenQuality(page, testInfo, "certification-case-overview");
    runtime.assertClean();
  });

  test("audit workspace fixture renders under the same browser quality gates", async ({ page }, testInfo) => {
    const runtime = watchRuntimeIssues(page);
    await openControlledView(page, "audit", "section=overview");

    await expect(page.getByText("KH-MAU-2026-0108").first()).toBeVisible();

    await assertControlledScreenQuality(page, testInfo, "certification-audit-overview");
    runtime.assertClean();
  });
});
