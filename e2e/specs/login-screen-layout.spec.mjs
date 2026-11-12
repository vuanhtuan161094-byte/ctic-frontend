import { expect, test } from "@playwright/test";
import { captureVisualBaseline, expectNoHorizontalOverflow, watchRuntimeIssues } from "../helpers/quality.mjs";

test("login panel remains legible at desktop and mobile widths", async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ message: "Screenshot fixture is read-only" }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
  await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
  await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
  const sizes = testInfo.project.name === "desktop-1440x900"
    ? [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]
    : [{ width: 390, height: 844 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    const box = await page.locator(".login-card").boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
    await captureVisualBaseline(page, testInfo, `login-${size.width}x${size.height}`, { fullPage: false });
  }
  runtime.assertClean();
});
