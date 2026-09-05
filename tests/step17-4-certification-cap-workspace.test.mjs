import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const load = async (code) => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`);
const nav = await load(source("../app/lib/app-navigation.ts"));
const model = await load(source("../app/components/certification-cap/cap-model.ts"));
const view = source("../app/components/certification-cap/CapWorkspaceView.tsx");
const workspace = source("../app/components/certification-cap/CertificationCapWorkspace.tsx");
const legacy = source("../app/components/CorrectiveActionWorkspaceModal.tsx");
const shell = source("../app/components/DashboardShell.tsx");

test("canonical finding identity and selected version survive direct load, refresh and history", () => {
  const path = "/certifications/case%201/findings/finding%201";
  const state = nav.parseCanonicalLocation(path, "?section=versions&version=v1&audit_plan_id=p1", false);
  assert.equal(state.activeView, "cap-workspace");
  assert.equal(state.selectedProjectId, "case 1"); assert.equal(state.selectedFindingId, "finding 1");
  assert.equal(nav.canonicalPathForNavigation(state, false), `${path}?section=versions&version=v1&audit_plan_id=p1`);
  assert.deepEqual(nav.readBrowserNavigationState(nav.createBrowserHistoryPayload(state)), state);
});
test("direct finding route does not depend on an audit query parameter", () => {
  const state = nav.parseCanonicalLocation("/certifications/case/findings/finding", "", false);
  assert.equal(state.activeView, "cap-workspace"); assert.equal(state.selectedAuditPlanId, null);
  assert.equal(state.selectedFindingId, "finding");
});
test("legacy CAP normalizes safely while explicit compatibility and plan-only links remain", () => {
  const path = "/projects/case"; const query = "?workspace=cap&audit_plan_id=plan&finding_id=finding";
  assert.equal(nav.parseCanonicalLocation(path, query, false).activeView, "cap-workspace");
  const explicit = nav.parseCanonicalLocation(path, query + "&compatibility=legacy", false);
  assert.equal(explicit.activeView, "project-detail");
  assert.equal(nav.canonicalPathForNavigation(explicit, false), path + query + "&compatibility=legacy");
  assert.equal(nav.parseCanonicalLocation(path, "?workspace=cap&audit_plan_id=plan", false).activeView, "project-detail");
});
test("portal finding route and legacy customer notification remain customer-scoped", () => {
  const state = nav.parseCanonicalLocation("/portal/corrective-actions/f1", "?section=evidence&case_id=c1", true);
  assert.equal(state.activeView, "cap-workspace");
  assert.equal(nav.canonicalPathForNavigation(state, true), "/portal/corrective-actions/f1?section=evidence&case_id=c1");
  assert.equal(nav.parseCanonicalLocation("/customer-portal/corrective-actions", "?finding_id=f1", true).selectedFindingId, "f1");
  assert.notEqual(nav.parseCanonicalLocation("/certifications/c1/findings/f1", "", true).activeView, "cap-workspace");
});
test("invalid section falls back without accepting prototype properties", () => {
  assert.equal(model.capSection("invalid"), "overview"); assert.equal(model.capSection("toString"), "overview");
  assert.equal(nav.parseCanonicalLocation("/certifications/c/findings/f", "?section=invalid", false).selectedCapSection, "overview");
});
test("case and finding mismatch fail closed", () => {
  const data = { context: { case_id: "case" }, finding: { id: "finding" } };
  assert.equal(model.capContextMatches(data, "case", "finding"), true);
  assert.equal(model.capContextMatches(data, "other", "finding"), false);
  assert.equal(model.capContextMatches(data, "case", "other"), false);
});
test("version selection is immutable, latest is explicit, prior evidence remains separate", () => {
  const finding = { corrective_actions: [{ id: "v1", version_no: 1, root_cause: "old", evidence_files: [{ id: "e1" }] }, { id: "v2", version_no: 2, root_cause: "new", evidence_files: [{ id: "e2" }] }] };
  const before = JSON.stringify(finding); const result = model.selectedCapVersion(finding, "v1");
  assert.equal(result.latest.id, "v2"); assert.equal(result.selected.root_cause, "old");
  assert.equal(result.selected.evidence_files[0].id, "e1"); assert.equal(JSON.stringify(finding), before);
  assert.equal(model.selectedCapVersion(finding, "missing").selected, null);
});
test("canonical page reuses a single set of response/evidence/review/close handlers", () => {
  assert.match(workspace, /<CorrectiveActionWorkspaceModal/);
  assert.match(legacy, /page \? <CapWorkspaceView/);
  for (const operation of ["/corrective-actions/internal", "/document-files/customer/corrective-actions/", '"/document-files/upload"', "/review`", "/close`"]) assert.ok(legacy.includes(operation));
  assert.doesNotMatch(view + workspace, /api\.(post|patch|put|delete)/);
  assert.match(legacy, /<ResponseContainer[\s\S]*page=\{Boolean\(page\)\}/);
  assert.match(legacy, /legacyOpen = open && !page/);
});
test("action controls and mutations consume authoritative projected permissions", () => {
  for (const action of ["respond", "review", "close", "upload_evidence"]) assert.ok(legacy.includes(`page.data.allowed_actions.${action}`));
  assert.doesNotMatch(view, /roles\.includes|hasPermission/);
  assert.equal((view.match(/type="primary"/g) ?? []).length, 1);
  assert.match(view, /!historical && actions.upload_evidence/);
});
test("deadline and status display use server fields rather than calculating new policy", () => {
  assert.match(view, /finding\.due_date/); assert.match(view, /finding\.is_overdue/);
  assert.doesNotMatch(view + model.capSection.toString(), /45|30 \*|setDate|addDays/);
  assert.match(view, /domain="finding"/); assert.match(view, /domain="capVersion"/);
});
test("workspace provides non-disclosing denied/mismatch and retry/empty/loading states", () => {
  for (const state of ["ForbiddenState", "LoadingSkeleton", "ErrorState", "EmptyState", "capContextMatches"]) assert.ok(workspace.includes(state));
  assert.match(workspace, /data.audience === "customer"/);
  assert.doesNotMatch(view, /JSON.stringify|storage_path|sha256/);
});
test("Audit and Case deep links target finding workspace without moving other workflows", () => {
  const audit = source("../app/components/certification-audit/CertificationAuditWorkspace.tsx");
  assert.match(audit, /onOpenFinding=[\s\S]*\/findings\//);
  assert.match(source("../app/components/certification-case/case-model.ts"), /const findingId = destination\?\.query.finding_id/);
  for (const term of ["technical-review", "certification-decision", "certificate-issue"]) assert.ok(!workspace.includes(term));
  assert.match(shell, /onVersion=\{setSelectedCapVersionId\}/);
});
test("DEV QA adapter is isolated from production and never forwards requests", () => {
  const app = source("../app/components/CticApplication.tsx");
  const fixture = source("../app/components/certification-cap/DevCapWorkspace.tsx");
  assert.match(app, /DevCapWorkspace = import.meta.env.DEV/);
  assert.match(fixture, /api.defaults.adapter = adapter/);
  assert.doesNotMatch(fixture, /fetch\(|XMLHttpRequest|originalAdapter/);
});
