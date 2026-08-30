import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cockpit = await readFile(new URL("../app/components/ManagementCockpitScreen.tsx", import.meta.url), "utf8");
const shell = await readFile(new URL("../app/components/DashboardShell.tsx", import.meta.url), "utf8");

test("management cockpit consumes one coherent server projection", () => {
  assert.match(cockpit, /\/commercial-management-reporting\/cockpit\?/);
  assert.match(cockpit, /cockpit\.executive\.map/);
  assert.doesNotMatch(cockpit, /reduce\([^)]*active_customers/);
});

test("date presets and custom date range are forwarded to backend", () => {
  for (const preset of ["TODAY", "THIS_WEEK", "THIS_MONTH", "QUARTER", "YEAR", "CUSTOM"]) assert.match(cockpit, new RegExp(`"${preset}"`));
  assert.match(cockpit, /params\.set\("from"/);
  assert.match(cockpit, /params\.set\("to"/);
});

test("scheme filter comes from Phase 7 master data", () => {
  assert.match(cockpit, /\/master-data-configuration\/schemes\?active_only=true/);
  assert.match(cockpit, /params\.set\("scheme_id"/);
  assert.doesNotMatch(cockpit, /\["QMS",\s*"EMS",\s*"OHSMS"\]/);
});

test("commercial cards preserve currency grouping and precise labels", () => {
  assert.match(cockpit, /cockpit\.commercial\.by_currency\.map/);
  assert.match(cockpit, /Pipeline/);
  assert.match(cockpit, /Đã lập tham chiếu hóa đơn/);
  assert.match(cockpit, /không gọi contract value là revenue recognized/);
});

test("quotation UI cannot submit technical mandays", () => {
  assert.match(cockpit, /Manday kỹ thuật.*backend.*Application Review APPROVED/s);
  assert.doesNotMatch(cockpit, /name="technical_approved_mandays"/);
  assert.match(cockpit, /\/quotations\//);
});

test("billing UI is operational metadata, not accounting invoice generation", () => {
  assert.match(cockpit, /billing-milestones/);
  assert.match(cockpit, /Tham chiếu hóa đơn/);
  assert.doesNotMatch(cockpit, /phát hành hóa đơn điện tử|general ledger|bank reconciliation/i);
});

test("commercial write controls are role-aware in UI", () => {
  assert.match(cockpit, /\["ADMIN", "STAFF", "SALES"\]\.includes/);
  assert.match(cockpit, /canManageCommercial \?/);
  assert.doesNotMatch(cockpit, /"AUDITOR".*canManageCommercial/);
});

test("commercial/reporting menu is excluded from technical-only personas and CUSTOMER", () => {
  for (const role of ["lead_auditor", "auditor", "technical_reviewer", "decision_maker", "customer"]) {
    const line = shell.split("\n").find((value) => value.includes(`${role}: [`));
    assert.ok(line);
    assert.doesNotMatch(line, /"reports"/);
  }
  for (const role of ["admin", "staff", "sales", "coordinator"]) {
    const line = shell.split("\n").find((value) => value.includes(`${role}: [`));
    assert.match(line, /"reports"/);
  }
});

test("export uses the same server filters and authenticated API client", () => {
  assert.match(cockpit, /cockpit\/export\.csv\?\$\{filterQuery\}/);
  assert.match(cockpit, /responseType: "blob"/);
  assert.doesNotMatch(cockpit, /window\.fetch\(/);
});

test("resource analytics refuses to fabricate utilization percentage", () => {
  assert.match(cockpit, /utilization_percentage: null/);
  assert.match(cockpit, /Không suy diễn utilization %/);
  assert.match(cockpit, /cockpit\.resource\.utilization_note/);
});
