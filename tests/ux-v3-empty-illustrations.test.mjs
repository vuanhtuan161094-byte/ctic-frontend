import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const art = await readFile(new URL("../app/components/design-system/EmptyWorkspaceIllustration.tsx", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../app/components/PersonalDashboardScreen.tsx", import.meta.url), "utf8");
const customers = await readFile(new URL("../app/components/CustomersScreen.tsx", import.meta.url), "utf8");
test("original decorative vectors cover four operational empty states", () => {
  for(const kind of ["work","calendar","records","customers"]) assert.ok(art.includes('kind === "'+kind+'"'));
  assert.match(art,/aria-hidden="true"/);
  assert.match(art,/var\(--cmp-brand-primary\)/);
  assert.doesNotMatch(art,/CTIC/);
});
test("actual lists use vectors without losing business empty labels", () => {
  for(const kind of ["work","calendar","records"]) assert.ok(dashboard.includes('EmptyWorkspaceIllustration kind="'+kind+'"'));
  assert.ok(customers.includes('EmptyWorkspaceIllustration kind="customers"'));
  assert.match(dashboard,/Hiện không có công việc cần xử lý\./);
  assert.match(customers,/Không có khách hàng phù hợp/);
});
