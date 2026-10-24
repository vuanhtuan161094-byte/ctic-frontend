import assert from "node:assert/strict";
import test from "node:test";

import {
  generateCmpDemo10YearFixture,
  getFixturePortalView,
  validateCmpDemo10YearFixture,
} from "../e2e/fixtures/cmp-demo-10year.mjs";

test("full 10-year fixture is deterministic, related, and covers 20 customers with multiple cycles", () => {
  const first = generateCmpDemo10YearFixture("full-10y");
  const second = generateCmpDemo10YearFixture("full-10y");
  assert.deepEqual(first, second);
  assert.equal(first.source_mode, "FIXTURE_10Y");
  assert.deepEqual(first.range, { start: "2016-10-24", end: "2026-10-24", timezone: "Asia/Ho_Chi_Minh" });
  assert.equal(first.customers.length, 20);
  assert.ok(first.cycles.length >= 50 && first.cycles.length <= 75);
  for (const customer of first.customers) {
    const count = first.cycles.filter((cycle) => cycle.customer_id === customer.id).length;
    assert.ok(count >= 2 && count <= 4, `${customer.id} cycle count ${count}`);
  }
  assert.ok(first.auditPlans.length >= 100);
  assert.ok(first.counts.certificates > 0);
  assert.deepEqual(validateCmpDemo10YearFixture(first), { valid: true, errors: [] });
});

test("controlled empty and sparse snapshots do not alter the full fixture", () => {
  const empty = generateCmpDemo10YearFixture("empty");
  const sparse = generateCmpDemo10YearFixture("sparse");
  assert.equal(empty.customers.length, 0);
  assert.equal(empty.applications.length, 0);
  assert.equal(sparse.customers.length, 1);
  assert.equal(sparse.cycles.length, 1);
  assert.equal(sparse.source_mode, "FIXTURE_10Y");
});

test("date graph respects Stage 1 before Stage 2 and 2018 standard availability", () => {
  const fixture = generateCmpDemo10YearFixture("full-10y");
  for (const plan of fixture.auditPlans.filter((item) => item.audit_type === "STAGE_1")) {
    const stage2 = fixture.auditPlans.find((item) => item.project_id === plan.project_id && item.audit_type === "STAGE_2");
    assert.ok(stage2.planned_start_date > plan.planned_start_date);
  }
  for (const application of fixture.applications.filter((item) => item.application_date.startsWith("2016-") || item.application_date.startsWith("2017-"))) {
    assert.doesNotMatch(application.standard_name, /ISO 45001:2018/);
  }
  assert.ok(fixture.auditPlans.some((plan) => plan.planned_start_date.startsWith("2026-")));
});

test("major open CAP prevents fixture certificate and certificate previews are isolated and watermarked", () => {
  const fixture = generateCmpDemo10YearFixture("full-10y");
  const openMajor = fixture.findings.find((finding) => finding.finding_type === "MAJOR" && finding.workflow_state === "CUSTOMER_RESPONSE_PENDING");
  assert.ok(openMajor);
  assert.equal(fixture.certificates.some((certificate) => certificate.project_id === openMajor.project_id), false);
  assert.ok(fixture.certificates.every((certificate) => (
    certificate.fixture_only === true
    && certificate.legal_effect === false
    && certificate.public_verification_enabled === false
    && certificate.preview_watermark === "DEMO — KHÔNG CÓ GIÁ TRỊ CHỨNG NHẬN"
    && !("signature" in certificate)
    && !("audit_trail" in certificate)
  )));
});

test("fixture Portal A and B receive records for their own customer only", () => {
  const fixture = generateCmpDemo10YearFixture("full-10y");
  const portalA = getFixturePortalView(fixture, fixture.customerAccess[0].user_id);
  const portalB = getFixturePortalView(fixture, fixture.customerAccess[1].user_id);
  assert.equal(portalA.customer.id, fixture.customers[0].id);
  assert.ok(portalA.applications.every((application) => application.customer_id === portalA.customer.id));
  assert.ok(portalB.applications.every((application) => application.customer_id === portalB.customer.id));
  assert.notEqual(portalA.customer.id, portalB.customer.id);
  assert.equal(getFixturePortalView(fixture, "fixture-portal-unknown").applications.length, 0);
});

test("dense and edge scenarios expose a 12-event day and catch cross-tenant references", () => {
  for (const scenario of ["dense", "edge-cases"]) {
    const fixture = generateCmpDemo10YearFixture(scenario);
    assert.equal(fixture.auditPlans.filter((plan) => plan.planned_start_date === "2026-10-22").length, 12);
    assert.deepEqual(validateCmpDemo10YearFixture(fixture), { valid: true, errors: [] });
  }
  const corrupted = generateCmpDemo10YearFixture("full-10y");
  corrupted.projects[0].customer_id = corrupted.customers[1].id;
  assert.equal(validateCmpDemo10YearFixture(corrupted).valid, false);
});
