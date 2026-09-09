import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const source = path => readFileSync(new URL(path, import.meta.url), "utf8");
const load = async code => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`);
const nav = await load(source("../app/lib/app-navigation.ts"));
const view = source("../app/components/certification-decision/CertificationDecisionWorkspace.tsx");
const model = await load(view.slice(view.indexOf("export function safeDecisionSection"), view.indexOf("interface Props")));
const owner = source("../app/components/CertificationResultWorkspaceModal.tsx");

test("Decision direct route has no invented decision identity", () => {
  const state = nav.parseCanonicalLocation("/certifications/case%201/decision", "", false);
  assert.equal(state.activeView, "decision-workspace"); assert.equal(state.selectedAuditPlanId, null);
  assert.equal(nav.canonicalPathForNavigation(state, false), "/certifications/case%201/decision");
});
test("Decision bookmark, refresh and history serialization retain source context", () => {
  const path = "/certifications/c/decision";
  const query = "?audit_plan_id=p&technical_review_id=r&cycle=initial&section=decision";
  const state = nav.parseCanonicalLocation(path, query, false);
  assert.equal(nav.canonicalPathForNavigation(state, false), path + query);
  assert.deepEqual(nav.readBrowserNavigationState(nav.createBrowserHistoryPayload(state)), state);
  const url = new URL(nav.canonicalPathForNavigation(state, false), "http://local");
  assert.deepEqual(nav.parseCanonicalLocation(url.pathname, url.search, false), state);
});
test("legacy work-item links normalize and explicit compatibility remains available", () => {
  const query = "?workspace=certification-decision&audit_plan_id=p&technical_review_id=r";
  assert.equal(nav.parseCanonicalLocation("/projects/c", query, false).activeView, "decision-workspace");
  const legacy = nav.parseCanonicalLocation("/projects/c", query + "&compatibility=legacy", false);
  assert.equal(legacy.activeView, "project-detail"); assert.match(nav.canonicalPathForNavigation(legacy, false), /compatibility=legacy/);
});
test("customer routing cannot enter internal Decision", () => {
  assert.notEqual(nav.parseCanonicalLocation("/certifications/c/decision", "?audit_plan_id=p", true).activeView, "decision-workspace");
});
test("case, plan, review and cycle validation precede protected rendering", () => {
  const data = { case_id: "c", plan: { id: "p", project_id: "c" }, technical_review: { id: "r" } };
  assert.equal(model.decisionContextMatches(data, "c", "p", "r"), true);
  for (const args of [["x", "p", "r"], ["c", "x", "r"], ["c", "p", "x"]]) assert.equal(model.decisionContextMatches(data, ...args), false);
  assert.equal(model.decisionContextMatches({ ...data, plan: { id: "p", project_id: "x" } }, "c", "p", null), false);
  assert.match(view, /cycle.key === cycleKey/); assert.match(view, /enabled: validPlan/);
});
test("unknown sections are safe and supported sections are retained", () => {
  for (const value of [null, "__proto__", "documents", "unknown"]) assert.equal(model.safeDecisionSection(value), "overview");
  assert.equal(model.safeDecisionSection("decision"), "decision");
});
test("canonical host reuses existing owner and cannot call a second mutation", () => {
  assert.match(view, /<CertificationResultWorkspaceModal/); assert.doesNotMatch(view, /api\.(post|put|patch|delete)/);
  assert.match(owner, /page\?\.data \?\? workspaceQuery.data/); assert.match(owner, /enabled: !page && open/);
  assert.match(owner, /onFinish=\{submitDecision\}/); assert.match(owner, /!page \|\| page.data.can_issue_decision/);
});
// Execute the actual mutation payload builder, not a separately reimplemented helper.
const ast = ts.createSourceFile("owner.tsx", owner, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let mutationFn;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "decisionMutation") {
    mutationFn = node.initializer.arguments[0].properties.find(item => item.name?.getText(ast) === "mutationFn").initializer.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast); assert.ok(mutationFn);
const { createMutation } = await load(`export function createMutation(api, workspace) { return ${mutationFn}; }`);
test("same Decision mutation sends authoritative lifecycle payload without certificate issuance", async () => {
  const writes = [];
  const mutate = createMutation({ post: async (url, body) => { writes.push({ url, body }); return { data: { id: "d" } }; } }, { technical_review: { id: "r" } });
  const date = { format: format => { assert.equal(format, "YYYY-MM-DD"); return "2026-09-09"; } };
  for (const type of ["GRANT", "REFUSE", "MAINTAIN", "RECERTIFY", "AMEND", "EXTEND_SCOPE", "REDUCE_SCOPE", "SUSPEND", "RESTORE", "WITHDRAW"]) {
    await mutate({ decision_number: " QD-1 ", decision_date: date, decision_result: type === "REFUSE" ? "rejected" : "approved", decision_type: type, certificate_series_id: "s", organization_name: " Customer ", standard_name: " ISO ", certification_scope: " Scope ", change_reason: " reason ", signatory_name: " Name ", signatory_title: " Title ", surveillance_interval_months: 12 });
    const value = writes.at(-1); assert.equal(value.url, "/certification-decisions"); assert.equal(value.body.technical_review_id, "r"); assert.equal(value.body.decision_type, type); assert.equal(value.body.decision_number, "QD-1"); assert.equal(value.body.change_reason, "reason"); assert.equal(value.body.certificate_series_id, ["GRANT", "REFUSE"].includes(type) ? undefined : "s");
  }
});
test("missing upstream review cannot create a Decision", async () => {
  let writes = 0;
  const mutate = createMutation({ post: () => { writes++; } }, {});
  await assert.rejects(mutate({})); assert.equal(writes, 0);
});
test("readiness and lifecycle are server sourced, no ADMIN issue bypass or parallel certificate UI", () => {
  assert.match(owner, /workspace.allowed_decision_types.map/); assert.match(owner, /workspace.eligibility_errors/);
  assert.match(view, /data.upstream_errors/); assert.match(view, /data.independence/);
  assert.match(owner, /workspace.can_generate_decision/); assert.doesNotMatch(view, /CertificateIssue|CertificateWorkspace|\/certificates.*api.post/);
  assert.match(owner, /tabs.filter\(tab => tab.key !== "notification"\)/);
});
test("page composition provides canonical states, responsive grids and document drawer", () => {
  for (const state of ["ForbiddenState", "ErrorState", "EmptyState", "LoadingSkeleton"]) assert.ok(view.includes(state));
  assert.match(owner, /<ResultContainer/); assert.match(owner, /<Drawer/); assert.match(owner, /<ReadOnlyState/);
  const css = source("../app/components/certification-decision/certification-decision.css"); assert.match(css, /max-width:768px/); assert.match(css, /minmax\(0,1fr\)/);
});
test("production assets exclude isolated Decision QA", () => {
  const assets = new URL("../dist/assets/", import.meta.url);
  const files = readdirSync(assets).filter(name => name.endsWith(".js")); assert.ok(files.length);
  for (const name of files) assert.doesNotMatch(readFileSync(new URL(name, assets), "utf8"), /cmp-decision-isolated-qa|qa-decision-denied/);
});
