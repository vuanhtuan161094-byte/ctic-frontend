import test from "node:test";
import assert from "node:assert/strict";

import { CMP_DEMO_DATA } from "../e2e/fixtures/cmp-demo-3year.mjs";

test("three-year CMP demo fixture is deterministic, isolated, and does not invent certificates", () => {
  const { customers, cases, customerAccess, findings, certificates, countsByYear, range } = CMP_DEMO_DATA;
  assert.equal(CMP_DEMO_DATA.source, "controlled-fixture-only");
  assert.equal(customers.length, 20);
  assert.equal(new Set(customers.map((item) => item.customer_code)).size, 20);
  assert.equal(cases.length, 40);
  assert.deepEqual(Object.keys(countsByYear), ["2024", "2025", "2026"]);
  assert.equal(Object.values(countsByYear).reduce((total, count) => total + count, 0), 40);
  assert.ok(Object.values(countsByYear).every((count) => count > 0));

  assert.equal(customerAccess.length, 20);
  assert.equal(new Set(customerAccess.map((item) => item.user_id)).size, 20);
  assert.equal(new Set(customerAccess.map((item) => item.customer_id)).size, 20);
  assert.ok(customerAccess.every((item) => item.role === "CUSTOMER"));
  assert.ok(customers.every((item) => item.email.endsWith("@example.invalid") && item.tax_code === null));
  assert.ok(cases.every((item) => item.customer.id === item.application.customer_id));
  assert.ok(cases.every((item) => item.plan.planned_end_date >= item.plan.planned_start_date));
  assert.ok(cases.every((item) => item.plan.planned_start_date >= range.start && item.plan.planned_end_date <= range.end));
  assert.ok(findings.every((item) => item.fixture_only));
  assert.deepEqual(certificates, []);
});
