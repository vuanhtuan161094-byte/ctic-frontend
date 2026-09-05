import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const workspace = source("../app/components/certification-case/CertificationCaseWorkspace.tsx");
const types = source("../app/components/certification-case/types.ts");
const model = source("../app/components/certification-case/case-model.ts");
const header = source("../app/components/certification-case/CertificationCaseHeader.tsx");
const team = source("../app/components/certification-case/CertificationCaseTeam.tsx");
const documents = source("../app/components/certification-case/CertificationCaseDocuments.tsx");
const activity = source("../app/components/certification-case/CertificationCaseActivity.tsx");
const navigation = source("../app/lib/app-navigation.ts");
const styles = source("../app/components/certification-case/certification-case.css");

test("workspace uses one bounded v2 projection instead of the former three-request composition", () => {
  assert.match(workspace, /api\.get<CertificationCaseWorkspaceProjection>\(`\/certification-cases\/\$\{caseId\}\/workspace`\)/);
  assert.doesNotMatch(workspace, /\/certification-projects\/\$\{caseId\}\/dossier|\/certification-projects\/\$\{caseId\}\/alerts/);
  assert.match(types, /contract_version: "2\.0"/);
  assert.match(types, /projection_meta: \{ generated_at: string; bounded: true; mutation_capable: false \}/);
});

test("workspace contract covers identity cycles responsibility actions blockers SLA and links", () => {
  for (const field of ["identity", "customer", "standards_scope", "cycles", "current_cycle", "case_status", "current_stage", "responsibility", "next_action", "allowed_actions", "blockers", "sla", "team_summary", "document_summary", "recent_activity", "links"]) {
    assert.match(types, new RegExp(`${field}:`), `missing ${field}`);
  }
  assert.match(header, /data\.next_action\.authorized/);
  assert.match(header, /data\.responsibility/);
  assert.match(model, /destination\.legacy_path/);
});

test("five areas and URL-backed cycle selection remain intact", () => {
  for (const area of ["overview", "progress", "team", "documents", "activity"]) assert.ok(workspace.includes(`${area}:`));
  assert.match(workspace, /<CycleSelector/);
  assert.match(workspace, /onCycleChange/);
  assert.match(navigation, /query\.set\("cycle", navigation\.selectedProjectDossierKey\)/);
});

test("Team is source-backed and keeps competence and independence server-derived", () => {
  assert.match(team, /data\.team_summary/);
  assert.match(team, /team\.members\.map/);
  assert.match(team, /team\.competence\.status/);
  assert.match(team, /team\.independence\.status/);
  assert.doesNotMatch(team, /api\.|role.*includes\(|canPerform/i);
});

test("Documents uses bounded business groups and existing authorized downloads", () => {
  for (const group of ["customer_evidence", "audit", "cap", "technical_review", "decision_result", "certificate", "other"]) assert.match(types, new RegExp(group));
  assert.match(documents, /data\.document_summary\.groups/);
  assert.match(workspace, /`\/document-files\/\$\{file\.id\}\/download`/);
  assert.doesNotMatch(documents, /file_url|stored_name|sha256/);
});

test("Activity uses cursor paging and renders only the safe event projection", () => {
  assert.match(workspace, /`\/certification-cases\/\$\{caseId\}\/activity\?/);
  assert.match(workspace, /current\.page\.next_cursor/);
  assert.match(activity, /activity\.items\.map/);
  assert.match(activity, /Tải thêm hoạt động/);
  assert.match(activity, /nhật ký bảo mật thô/);
  assert.doesNotMatch(activity, /audit_logs|comment|internal_note/);
});

test("loading forbidden missing error and empty states stay explicit", () => {
  assert.match(workspace, /<LoadingSkeleton/);
  assert.match(workspace, /status === 403[\s\S]*<ForbiddenState/);
  assert.match(workspace, /status === 404[\s\S]*<EmptyState/);
  assert.match(workspace, /<ErrorState/);
  assert.match(activity, /Chưa có hoạt động nghiệp vụ phù hợp/);
  assert.match(documents, /Chưa có tệp hiện hành/);
  assert.match(team, /Chưa có thành viên/);
});

test("projection integration adds no write API or client-side authority substitution", () => {
  const all = [workspace, header, team, documents, activity, model].join("\n");
  assert.doesNotMatch(all, /api\.(post|put|patch|delete)/);
  assert.doesNotMatch(all, /roles?\.includes|hasPermission|canPerform/);
  assert.match(header, /enabled: data\.next_action\.authorized/);
});

test("responsive Step 17.1 behavior and legacy destinations remain preserved", () => {
  assert.match(styles, /@media \(max-width: 768px\)/);
  assert.match(navigation, /Legacy project paths retained through Step 18/);
  assert.match(navigation, /\(\?:projects\|certification-projects\)/);
  assert.match(types, /legacy_project: string/);
  assert.match(types, /legacy_path: string \| null/);
});
