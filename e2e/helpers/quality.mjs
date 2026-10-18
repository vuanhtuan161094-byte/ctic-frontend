import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";

const BLOCKING_AXE_IMPACTS = new Set(["critical", "serious"]);
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export function watchRuntimeIssues(page) {
  const issues = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      issues.push(`console.error: ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    issues.push(`requestfailed: ${request.method()} ${request.url()} :: ${failure?.errorText ?? "unknown"}`);
  });

  page.on("response", (response) => {
    if (response.status() >= 500) {
      issues.push(`http-${response.status()}: ${response.request().method()} ${response.url()}`);
    }
  });

  return {
    issues,
    assertClean() {
      expect(issues, `Unexpected browser/runtime issues:\n${issues.join("\n")}`).toEqual([]);
    },
  };
}

export async function stabilizeVisualState(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
}

export async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      clientWidth: root.clientWidth,
      scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth ?? 0),
    };
  });

  expect(
    metrics.scrollWidth,
    `Horizontal overflow detected: scrollWidth=${metrics.scrollWidth}, clientWidth=${metrics.clientWidth}`,
  ).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

function formatAxeViolation(violation) {
  const targets = violation.nodes
    .slice(0, 5)
    .flatMap((node) => node.target)
    .map((target) => String(target))
    .join(", ");
  return `${violation.id} [${violation.impact ?? "unknown"}] ${violation.help} :: ${targets}`;
}

export async function runAxeBaseline(page, testInfo) {
  const result = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .analyze();

  await testInfo.attach("axe-results", {
    body: Buffer.from(JSON.stringify({
      url: result.url,
      violations: result.violations,
      passes: result.passes.length,
      incomplete: result.incomplete,
    }, null, 2)),
    contentType: "application/json",
  });

  const blocking = result.violations.filter((violation) =>
    BLOCKING_AXE_IMPACTS.has(violation.impact ?? ""),
  );

  expect(
    blocking,
    `Blocking axe violations:\n${blocking.map(formatAxeViolation).join("\n")}`,
  ).toEqual([]);

  return result;
}

export async function captureVisualBaseline(page, testInfo, name, { fullPage = true } = {}) {
  await stabilizeVisualState(page);
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({
    path,
    fullPage,
    animations: "disabled",
    caret: "hide",
  });
  await testInfo.attach(`visual-baseline-${name}`, {
    path,
    contentType: "image/png",
  });
}

export async function assertControlledScreenQuality(page, testInfo, name) {
  await stabilizeVisualState(page);
  await expectNoHorizontalOverflow(page);
  await captureVisualBaseline(page, testInfo, name);
  await runAxeBaseline(page, testInfo);
}
