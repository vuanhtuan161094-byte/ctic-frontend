import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const load = async (code) => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`);
const nav = await load(source("../app/lib/app-navigation.ts"));
const view = source("../app/components/certification-review/CertificationTechnicalReviewWorkspace.tsx");
const model = await load(view.slice(view.indexOf("export const reviewSections"), view.indexOf("interface Props")));
const legacy = source("../app/components/TechnicalReviewWorkspaceModal.tsx");
const shell = source("../app/components/DashboardShell.tsx");
const css = source("../app/components/certification-review/certification-review.css");

// Execute the actual save callback with Ant Form's lazy-tab behavior: validation
// returns registered fields, while the store also holds not-yet-visited fields.
const ast = ts.createSourceFile("review.tsx", legacy, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let saveCallback;
function findSave(node) {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
    if (attributes.some((item) => item.name.getText(ast) === "key" && item.initializer?.getText(ast) === '"save"')) {
      saveCallback = attributes.find((item) => item.name.getText(ast) === "onClick")?.initializer.expression.getText(ast);
    }
  }
  ts.forEachChild(node, findSave);
}
findSave(ast);
assert.ok(saveCallback, "Find the real save action");
const { createSaveClick } = await load(`export function createSaveClick(form, saveMutation) { return ${saveCallback}; }`);

test("saving from an unvisited F11 tab includes initialized fields and respects validation rejection", async () => {
  const stored = { review_date: "initialized-date", audit_language: "Tiếng Việt", recommendation: "certification_recommended" };
  const writes = [];
  const form = { validateFields: async () => ({}), getFieldsValue: (all) => { assert.equal(all, true); return stored; } };
  createSaveClick(form, { mutate: (value) => writes.push(value) })();
  await new Promise(setImmediate);
  assert.deepEqual(writes, [stored]);
  createSaveClick({ ...form, validateFields: async () => { throw new Error("Invalid required field"); } }, { mutate: (value) => writes.push(value) })();
  await new Promise(setImmediate);
  assert.equal(writes.length, 1, "Invalid form must not reach the mutation");
});

test("production assets exclude the isolated review QA adapter", () => {
  const assets = new URL("../dist/assets/", import.meta.url);
  const bundles = readdirSync(assets).filter((name) => name.endsWith(".js"));
  assert.ok(bundles.length, "Build frontend before the production-isolation test");
  for (const name of bundles) assert.doesNotMatch(readFileSync(new URL(name, assets), "utf8"), /cmp-review-isolated-qa|QA server unavailable|qa-document-1/);
});

test("technical review uses the frozen case route without invented review resource identity", () => {
  const state = nav.parseCanonicalLocation("/certifications/case%201/technical-review", "", false);
  assert.equal(state.activeView, "technical-review-workspace");
  assert.equal(state.selectedAuditPlanId, null);
  assert.equal(state.selectedTechnicalReviewId, null);
  assert.match(nav.canonicalPathForNavigation(state, false), /^\/certifications\/case%201\/technical-review/);
});
test("technical review direct link, refresh and history preserve exact PLAN, review, cycle and section", () => {
  const path = "/certifications/case/technical-review";
  const query = "?audit_plan_id=plan&technical_review_id=review&cycle=initial&section=technical";
  const state = nav.parseCanonicalLocation(path, query, false);
  assert.equal(nav.canonicalPathForNavigation(state, false), path + query);
  assert.deepEqual(nav.readBrowserNavigationState(nav.createBrowserHistoryPayload(state)), state);
  const restored = new URL(nav.canonicalPathForNavigation(state, false), "http://local");
  assert.deepEqual(nav.parseCanonicalLocation(restored.pathname, restored.search, false), state);
});
test("legacy assignment/work notification destinations normalize but explicit compatibility stays", () => {
  const query = "?workspace=technical-review&audit_plan_id=p&technical_review_id=r";
  const migrated = nav.parseCanonicalLocation("/projects/c", query, false);
  assert.equal(migrated.activeView, "technical-review-workspace");
  assert.equal(migrated.selectedTechnicalReviewId, "r");
  const legacyState = nav.parseCanonicalLocation("/projects/c", query + "&compatibility=legacy", false);
  assert.equal(legacyState.activeView, "project-detail");
  assert.match(nav.canonicalPathForNavigation(legacyState, false), /compatibility=legacy/);
});
test("customer surfaces never enter internal technical review", () => {
  assert.notEqual(nav.parseCanonicalLocation("/certifications/c/technical-review", "?audit_plan_id=p", true).activeView, "technical-review-workspace");
});
test("entity-only review alerts resolve authorized PLAN/case before opening the exact review", () => {
  const resolver = source("../app/lib/task-navigation.ts");
  const technical = resolver.slice(resolver.indexOf('if (normalizedType === "technical_review")'), resolver.indexOf('if (normalizedType === "audit_result_notification")'));
  assert.match(technical, /await resolveProjectFromAuditPlan\(planId\)/);
  assert.match(technical, /technical-review\?audit_plan_id=/);
  assert.match(technical, /technical_review_id=\$\{encodeURIComponent\(reviewId\)\}/);
  assert.match(shell, /if \(target.workspacePath\) openWorkspacePath\(target.workspacePath\)/);
});
test("case, PLAN and optional review must all match before protected UI", () => {
  const data = { case_id: "c", plan: { id: "p" }, review: { id: "r" } };
  assert.equal(model.reviewContextMatches(data, "c", "p", "r"), true);
  for (const args of [["x", "p", "r"], ["c", "x", "r"], ["c", "p", "x"]]) assert.equal(model.reviewContextMatches(data, ...args), false);
  assert.match(view, /planId && !validPlan/);
  assert.match(view, /enabled: validPlan/);
});
test("only known technical review sections are accepted", () => {
  for (const value of [null, "toString", "__proto__", "unknown"]) assert.equal(model.safeReviewSection(value), "documents");
  assert.equal(model.safeReviewSection("history"), "history");
});
test("canonical page reuses existing mutation handlers and no second workflow engine", () => {
  assert.match(view, /<TechnicalReviewWorkspaceModal/);
  assert.doesNotMatch(view, /api\.(post|patch|put|delete)/);
  for (const path of ["/reassign`", "/assign`", "/sync-documents`", "/workspace`", "/complete`", "/f11/generate?format=${format}", "/items/${encodeURIComponent(documentKey)}"]) assert.ok(legacy.includes(path));
  assert.match(legacy, /page\?\.data \?\? workspaceQuery.data/);
  assert.match(legacy, /Boolean\(planId\) && !page/);
});
test("readiness and capabilities are server backed; completion still checks existing document criteria", () => {
  assert.match(legacy, /page \? page.data.can_assign/);
  assert.match(legacy, /Boolean\(workspace\?\.can_perform\)/);
  assert.match(view, /data.eligibility_errors/);
  assert.match(legacy, /disabled=\{!allItemsAccepted \|\| !allCriteriaAnswered \|\| !allOfficialPdfsReady\}/);
  assert.match(legacy, /modal.confirm/);
});
test("review evidence, assignment history and F11 remain on page with responsive card fallback", () => {
  assert.match(legacy, /<ReviewContainer[\s\S]*page=\{Boolean\(page\)\}/);
  assert.match(legacy, /responsiveCards=/);
  assert.match(legacy, /assignment_history/);
  assert.match(legacy, /<Drawer/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /max-width:768px/);
  assert.match(css, /min-width:0/);
});
test("loading, empty, error and forbidden are explicit and no downstream mutation is migrated", () => {
  for (const state of ["LoadingSkeleton", "EmptyState", "ErrorState", "ForbiddenState"]) assert.ok(view.includes(state));
  assert.doesNotMatch(view, /CertificateIssuanceWorkspace|CertificationResultWorkspace|\/certificates.*api/);
  assert.match(shell, /activeView === "technical-review-workspace"/);
  assert.match(shell, /setSelectedTechnicalReviewSection\(navigation.selectedTechnicalReviewSection/);
});
