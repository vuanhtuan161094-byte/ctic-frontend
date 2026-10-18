import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../app/components/PersonalDashboardScreen.tsx", import.meta.url), "utf8");

test("dashboard density pilot is scoped and keeps server-authoritative business projections", () => {
  assert.match(css, /CMP operating workspace — focused dashboard visual hierarchy pilot/);
  assert.match(css, /\.personal-kpi-grid\s*\{[^}]*border: 1px solid var\(--cmp-border-default\)/s);
  assert.match(css, /\.personal-dashboard \.dashboard-card/);
  assert.match(css, /\.personal-kpi-card:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(dashboard, /workspace\.priority_work_items/);
  assert.match(dashboard, /workspace\.role_kpis/);
  assert.match(dashboard, /onOpenPath\(kpi\.destination_path\)/);
});
