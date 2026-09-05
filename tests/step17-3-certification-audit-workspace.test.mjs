import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const audit = source("../app/components/certification-audit/CertificationAuditWorkspace.tsx");
const execution = source("../app/components/AuditExecutionWorkspaceModal.tsx");
const styles = source("../app/components/certification-audit/certification-audit.css");
const navigation = source("../app/lib/app-navigation.ts");
const shell = source("../app/components/DashboardShell.tsx");
const progress = source("../app/components/certification-case/CertificationCaseProgress.tsx");
const caseModel = source("../app/components/certification-case/case-model.ts");
const auditModel = source("../app/components/certification-audit/audit-model.ts");
const loadModule = async (code) => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`);
const routes = await loadModule(navigation);
const model = await loadModule(auditModel);

test("audit URL round trips through direct load, refresh, history and encoded identities", () => {
  const url = new URL("http://cmp.local/certifications/case%20one/audits/audit%202?section=execution&view=complete&cycle=initial");
  const state = routes.parseCanonicalLocation(url.pathname, url.search, false);
  assert.equal(state.activeView, "audit-workspace");
  assert.equal(state.selectedProjectId, "case one");
  assert.equal(state.selectedAuditPlanId, "audit 2");
  assert.equal(state.selectedProjectWorkspacePath, null);
  assert.equal(routes.canonicalPathForNavigation(state, false), url.pathname + url.search);
  assert.deepEqual(routes.readBrowserNavigationState(routes.createBrowserHistoryPayload(state)), state);
  assert.equal(routes.parseCanonicalLocation(url.pathname, "?section=invalid&view=invalid", false).selectedAuditSection, "overview");
});

test("legacy audit inputs normalize but explicit compatibility and CAP survive reload", () => {
  const cases = { "audit-team": "team", "audit-plan": "plan", "audit-execution": "execution", "audit-report": "execution", "audit-complete": "execution", "audit-findings": "findings", "audit-documents": "documents" };
  for (const [workspace, section] of Object.entries(cases)) {
    const state = routes.parseCanonicalLocation("/projects/case-1", `?workspace=${workspace}&audit_plan_id=plan-1&dossier_key=cycle-1`, false);
    assert.equal(state.activeView, "audit-workspace");
    assert.equal(state.selectedAuditSection, section);
    assert.equal(state.selectedAuditPlanId, "plan-1");
    assert.equal(state.selectedProjectDossierKey, "cycle-1");
  }
  for (const workspace of ["cap", "audit-team", "audit-plan", "audit-documents"]) {
    const state = routes.parseCanonicalLocation("/projects/case-1", `?workspace=${workspace}&audit_plan_id=plan-1&finding_id=nc-1&compatibility=legacy`, false);
    assert.equal(state.activeView, "project-detail");
    const url = new URL(routes.canonicalPathForNavigation(state, false), "http://cmp.local");
    const reloaded = routes.parseCanonicalLocation(url.pathname, url.search, false);
    assert.equal(reloaded.selectedProjectWorkspacePath, state.selectedProjectWorkspacePath);
  }
});

const action = (code, auditId = "plan-1") => ({ code, label: code, destination: { query: { audit_plan_id: auditId } } });
test("only the assigned execution action for this audit exposes execution controls", () => {
  assert.equal(model.auditExecutionAction({ allowed_actions: [] }, "plan-1"), null);
  assert.equal(model.auditExecutionAction({ allowed_actions: [action("audit.execute", "other-plan")] }, "plan-1"), null);
  for (const code of ["audit_team.issue", "audit_plan.prepare", "cap.review", "technical_review.perform", "certification_decision.issue", "certificate.issue"]) {
    assert.equal(model.auditExecutionAction({ allowed_actions: [action(code)] }, "plan-1"), null);
  }
  assert.equal(model.auditExecutionAction({ allowed_actions: [action("audit.execute")] }, "plan-1").code, "audit.execute");
  assert.equal(model.auditActionSections["audit_team.issue"], "team");
  assert.equal(model.auditActionSections["audit_plan.prepare"], "plan");
});

test("mismatched case or audit identity fails closed", () => {
  assert.equal(model.auditBelongsToCase("case-1", "plan-1", { id: "plan-1", project_id: "case-1" }), true);
  assert.equal(model.auditBelongsToCase("case-1", "plan-1", { id: "plan-1", project_id: "other-case" }), false);
  assert.equal(model.auditBelongsToCase("case-1", "plan-1", { id: "other-plan", project_id: "case-1" }), false);
  assert.equal(model.auditBelongsToCase("case-1", "plan-1", { id: "plan-1" }), false);
});

test("team date summary uses earliest and latest dates, independent of member order", () => {
  const members = [
    { planned_start_date: "2026-09-15T08:00:00+07:00", planned_end_date: "2026-09-16T17:00:00+07:00" },
    { planned_start_date: "2026-09-14T08:00:00+07:00", planned_end_date: "2026-09-17T17:00:00+07:00" },
  ];
  assert.deepEqual(model.teamDateRange(members), { start: members[1].planned_start_date, end: members[1].planned_end_date });
  assert.deepEqual(model.teamDateRange([...members].reverse()), model.teamDateRange(members));
  assert.deepEqual(model.teamDateRange([]), { start: undefined, end: undefined });
});

test("canonical nested audit route owns direct refresh and browser history state", () => {
  assert.match(navigation, /activeView: "audit-workspace"/);
  assert.match(navigation, /selectedProjectId: caseId/);
  assert.match(navigation, /selectedAuditPlanId: auditId/);
  assert.match(navigation, /`\/certifications\/\$\{encodeURIComponent\(navigation\.selectedProjectId\)\}\/audits\/\$\{encodeURIComponent\(navigation\.selectedAuditPlanId\)\}/);
  assert.match(navigation, /selectedAuditSection/);
  assert.match(navigation, /selectedAuditExecutionView/);
  assert.match(shell, /<CertificationAuditWorkspace/);
});

test("legacy audit destinations normalize safely while CAP remains in compatibility workspace", () => {
  for (const workspace of ["audit-team", "audit-plan", "audit-execution", "audit-report", "audit-complete", "audit-findings", "audit-documents"]) {
    assert.ok(navigation.includes(`"${workspace}"`) || navigation.includes(`${workspace}:`), `missing legacy adapter ${workspace}`);
  }
  assert.doesNotMatch(navigation, /cap: "findings"/);
  assert.match(shell, /openLegacyProjectWorkspace/);
  assert.match(audit, /planCompatibilityPath\(caseId, auditId, "cap"/);
});

test("audit page presents exact case and audit context before the seven approved areas", () => {
  for (const label of ["Tổng quan", "Đoàn & ngày công", "Kế hoạch", "Thực hiện & báo cáo", "Phát hiện/HĐKP", "Tài liệu", "Hoạt động"]) {
    assert.ok(audit.includes(label), `missing audit area ${label}`);
  }
  assert.match(audit, /data-audit-route=\{`\$\{caseId\}:\$\{auditId\}`\}/);
  assert.match(audit, /!auditBelongsToCase\(caseId, auditId, executionQuery.data.plan\)/);
  assert.match(audit, /domain="auditPlan"/);
  assert.match(audit, /plan\.plan_code/);
  assert.match(audit, /plan\.planned_start_date/);
});

test("read model uses existing access-controlled sources and explicit non-disclosing states", () => {
  for (const endpoint of [
    "/certification-cases/${caseId}/workspace",
    "/audit-team-appointments/${appointmentId}/readiness",
    "/audit-documents/plan/${auditId}",
    "/certification-cases/${caseId}/activity?",
  ]) assert.ok(audit.includes(endpoint), `missing source ${endpoint}`);
  assert.match(execution, /`\/audit-plans\/\$\{planId\}`/);
  assert.match(execution, /`\/audit-team-appointments\/plan\/\$\{planId\}`/);
  assert.match(execution, /`\/reports\/plan\/\$\{planId\}`/);
  assert.match(audit, /status === 403[\s\S]*<ForbiddenState/);
  assert.match(audit, /status === 404[\s\S]*<EmptyState/);
  assert.match(audit, /<ErrorState/);
});

test("server-projected action gates mutations without replacing backend authorization", () => {
  assert.match(auditModel, /action\.destination\.query\.audit_plan_id === auditId/);
  assert.match(audit, /mutationAuthorized=\{Boolean\(serverAction\)\}/);
  assert.match(audit, /auditExecutionAction\(caseQuery.data, auditId\)/);
  assert.doesNotMatch(audit, /roles\.includes|hasPermission|canPerform/);
  assert.match(audit, /<NextActionBar primaryAction=\{primaryAction\}/);
});

test("page presentation reuses the established audit and report mutations", () => {
  assert.match(execution, /presentation\?: "modal" \| "page"/);
  assert.match(execution, /presentation === "page"[\s\S]*cmp-audit-route-content/);
  for (const operation of [
    "/audit-plans/${plan.id}/start",
    'api.post<AuditReport>("/reports"',
    "/reports/${selectedReport.id}",
    "/reports/${selectedReport.id}/submit",
    'api.post("/audit-findings"',
    "/audit-plans/${plan.id}/complete",
  ]) assert.ok(execution.includes(operation), `existing operation changed or missing: ${operation}`);
});

test("Step 17.3 does not migrate CAP, technical review, decision, or certificate mutations", () => {
  assert.match(audit, /Mở HĐKP từ từng NC/);
  assert.match(audit, /planCompatibilityPath\(caseId, auditId, "cap"/);
  assert.doesNotMatch(audit, /api\.(post|put|patch|delete)/);
  assert.doesNotMatch(audit, /technical-review.*api|certification-decision.*api|certificate-issue.*api/is);
});

test("case progress and projected audit actions enter the canonical audit workspace", () => {
  assert.match(progress, /onOpenAudit\(planId\)/);
  assert.match(progress, /Mở cuộc đánh giá/);
  assert.match(caseModel, /`\/certifications\/\$\{encodeURIComponent\(data\.identity\.id\)\}\/audits\/\$\{encodeURIComponent\(auditId\)\}`/);
});

test("responsive audit workspace contains no page-level horizontal overflow", () => {
  assert.match(styles, /width: min\(100%, 1480px\)/);
  assert.match(styles, /box-sizing: border-box/);
  for (const width of [1024, 768, 390]) assert.match(styles, new RegExp(`@media \\(max-width: ${width}px\\)`));
  assert.match(styles, /overflow-x: auto/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\)/);
});
