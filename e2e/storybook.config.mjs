import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./storybook",
  outputDir: "./test-results/storybook",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report/storybook", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:6006",
    browserName: "chromium",
    locale: "vi-VN",
    colorScheme: "light",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "storybook-desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "storybook-mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: "npm --prefix .. run storybook -- --ci",
    url: "http://127.0.0.1:6006/index.json",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
