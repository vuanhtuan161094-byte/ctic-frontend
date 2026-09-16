import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, watchRuntimeIssues } from "../helpers/quality.mjs";

// Explicit inventory: a missing story must fail, never silently reduce coverage.
const stories = {
  "foundations-design-language": ["colors", "typography", "spacing", "radius-and-elevation", "status-semantics"],
  "components-pageheader": ["default", "read-only", "long-content", "constrained-width"],
  "components-sectionheader": ["default", "with-action", "long-content", "constrained-width"],
  "components-domainstatusbadge": ["default", "all-semantic-tones", "unknown-code", "detailed-label"],
  "components-deadlineslabadge": ["default", "due-soon", "overdue", "not-applicable", "missing-deadline"],
  "components-states": ["empty", "empty-with-action", "error", "read-only"],
  "components-formsection": ["default", "validation-summary", "constrained-width"],
};

for (const [group, variants] of Object.entries(stories)) {
  for (const variant of variants) {
    const id = `${group}--${variant}`;
    test(id, async ({ page, request }, testInfo) => {
      const runtime = watchRuntimeIssues(page);
      const indexResponse = await request.get("/index.json");
      expect(indexResponse.ok()).toBeTruthy();
      expect((await indexResponse.json()).entries[id]?.type).toBe("story");
      await page.goto(`/iframe.html?id=${id}&viewMode=story`);
      await expect(page.locator("[data-cmp-story]")).toBeVisible();
      await expect(page.locator("[data-cmp-story]")).not.toBeEmpty();
      await page.waitForFunction(() => Boolean(window.__STORYBOOK_ADDONS_CHANNEL__));
      // Run the installed addon itself: no independent, differently configured axe
      // instance and no disabled rules/impact filtering inside the addon.
      const result = await page.evaluate((storyId) => new Promise((resolve, reject) => {
        const channel = window.__STORYBOOK_ADDONS_CHANNEL__;
        const timer = setTimeout(() => reject(new Error("Accessibility addon did not return a result")), 30_000);
        channel.once("storybook/a11y/result", (report) => { clearTimeout(timer); resolve(report); });
        channel.once("storybook/a11y/error", (error) => { clearTimeout(timer); reject(new Error(String(error))); });
        channel.emit("storybook/a11y/manual", storyId);
      }), id);
      await testInfo.attach("storybook-addon-a11y", { body: Buffer.from(JSON.stringify(result, null, 2)), contentType: "application/json" });
      expect(result.violations.filter(({ impact }) => ["serious", "critical"].includes(impact))).toEqual([]);
      await expectNoHorizontalOverflow(page);
      runtime.assertClean();
    });
  }
}
