import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const shell = source("../app/components/DashboardShell.tsx");
const navigation = source("../app/lib/app-navigation.ts");
const registry = source("../app/components/certification-case/CertificationCaseRegistryPage.tsx");
const workspace = source("../app/components/certification-case/CertificationCaseWorkspace.tsx");
const header = source("../app/components/certification-case/CertificationCaseHeader.tsx");
const overview = source("../app/components/certification-case/CertificationCaseOverview.tsx");
const progress = source("../app/components/certification-case/CertificationCaseProgress.tsx");
const team = source("../app/components/certification-case/CertificationCaseTeam.tsx");
const documents = source("../app/components/certification-case/CertificationCaseDocuments.tsx");
const activity = source("../app/components/certification-case/CertificationCaseActivity.tsx");
const model = source("../app/components/certification-case/case-model.ts");
const styles = source("../app/components/certification-case/certification-case.css");
const lifecycle = source("../app/components/design-system/workflow.tsx");

test("Step 17.1 keeps the registry and canonical case route", () => {
  assert.match(navigation, /if \(path === "\/certifications"\)/);
  assert.match(navigation, /caseMatch = path\.match\(\/\^\\\/certifications/);
  assert.match(shell, /<CertificationCaseRegistryPage/);
  assert.match(shell, /<CertificationCaseWorkspace/);
});

test("case workspace exposes five URL-backed areas", () => {
  for (const area of ["overview", "progress", "team", "documents", "activity"]) {
    assert.ok(workspace.includes(`${area}:`), `missing area ${area}`);
  }
  assert.match(workspace, /aria-label="Khu vực hồ sơ chứng nhận"/);
  assert.match(workspace, /aria-current=\{area === item \? "page"/);
  assert.match(navigation, /\(progress\|team\|documents\|activity\)/);
  assert.match(navigation, /navigation\.selectedProjectArea/);
});

test("selected certification cycle remains URL-backed and derived", () => {
  assert.match(navigation, /query\.set\("cycle", navigation\.selectedProjectDossierKey\)/);
  assert.match(workspace, /<CycleSelector/);
  assert.match(workspace, /onCycleChange/);
  assert.match(model, /data\.dossier\.current_dossier_key/);
  assert.doesNotMatch(model, /cycle table|createCycle|post<.*cycle/i);
});

test("legacy case destinations remain compatibility-only", () => {
  assert.match(navigation, /Legacy project paths retained through Step 18/);
  assert.match(navigation, /\(\?:projects\|certification-projects\)/);
  assert.match(shell, /selectedProjectWorkspacePath \? \(/);
  assert.match(shell, /<CertificationProjectDetailScreen/);
  assert.match(shell, /onOpenCompatibility/);
});

test("registry uses canonical case terminology and useful source fields", () => {
  assert.match(registry, /title="Hồ sơ chứng nhận"/);
  assert.match(registry, /Mã hồ sơ/);
  assert.match(registry, /Khách hàng/);
  assert.match(registry, /Tiêu chuẩn \/ phiên bản/);
  assert.match(registry, /Chu kỳ & bước hiện tại/);
  assert.match(registry, /Trách nhiệm \/ thời hạn/);
  assert.doesNotMatch(registry, /title=["'](?:Projects|Dossier|Dự án)/);
});

test("registry avoids list N+1 and discloses bounded projection gaps", () => {
  assert.match(registry, /api\.get<CertificationCaseRecord\[]>\("\/certification-projects"\)/);
  assert.doesNotMatch(registry, /records\.map[\s\S]{0,500}api\.get/);
  assert.match(registry, /Xác nhận theo bước trong hồ sơ/);
  assert.match(registry, /được xác nhận khi mở từng hồ sơ/);
});

test("registry has URL-capable search filters and responsive table cards", () => {
  assert.match(registry, /queryParam="q"/);
  assert.match(registry, /params\.set\(key, value\)/);
  assert.match(registry, /<FilterPopover/);
  assert.match(registry, /<DataTable/);
  assert.match(registry, /responsiveCards=\{responsiveCards\}/);
  assert.match(styles, /@media \(max-width: 768px\)/);
});

test("workspace loads only the three approved Step 17.1 projections", () => {
  for (const endpoint of [
    "/certification-projects/${caseId}",
    "/certification-projects/${caseId}/dossier",
    "/certification-projects/${caseId}/alerts?warning_days=90",
  ]) assert.ok(workspace.includes(endpoint), `missing ${endpoint}`);
  assert.doesNotMatch(workspace, /api\.(post|put|patch|delete)/);
});

test("overview separates case cycle stage responsibility and SLA meaning", () => {
  assert.match(header, /domain="case"/);
  assert.match(header, /Chu kỳ đang xem/);
  assert.match(header, /Bước hiện tại/);
  assert.match(header, /Người xử lý/);
  assert.match(header, /Hạn quan trọng/);
  assert.match(header, /<DeadlineSlaBadge/);
  assert.match(overview, /ReadinessBlockerPanel/);
});

test("one primary action is navigation-only and never frontend authority", () => {
  assert.match(header, /const primaryAction: ProjectedAction \| null/);
  assert.match(header, /<NextActionBar[\s\S]*primaryAction=\{primaryAction\}/);
  assert.match(header, /Tiếp tục tại không gian nghiệp vụ hiện có/);
  assert.doesNotMatch(header, /api\.(post|put|patch|delete)/);
});

test("progress distinguishes blocked and not-applicable without merging domains", () => {
  assert.match(model, /"blocked"/);
  assert.match(model, /"notApplicable"/);
  assert.match(lifecycle, /data-lifecycle-state=\{step\.state\}/);
  assert.match(lifecycle, /Đang bị chặn/);
  assert.match(styles, /data-lifecycle-state="blocked"/);
  assert.match(styles, /data-lifecycle-state="notApplicable"/);
});

test("team documents and activity are truthful read-first foundations", () => {
  assert.match(team, /ReadOnlyState/);
  assert.match(team, /chưa cung cấp bản tổng hợp thành viên/);
  assert.match(documents, /DOCUMENT_GROUP_LABELS/);
  assert.match(documents, /<EvidenceList/);
  assert.match(activity, /<ActivityTimeline/);
  assert.match(activity, /chưa cung cấp dòng hoạt động hợp nhất/);
});

test("forbidden state is non-disclosing before case identity renders", () => {
  assert.match(shell, /!canReadCertificationCases[\s\S]*<ForbiddenState/);
  assert.match(workspace, /status === 403[\s\S]*<ForbiddenState/);
  assert.doesNotMatch(workspace.match(/status === 403[\s\S]{0,250}/)?.[0] ?? "", /project_code|caseId/);
});

test("Step 17.1 is white-label and decomposed instead of another megacomponent", () => {
  for (const value of [registry, workspace, header, overview, progress, team, documents, activity, styles]) {
    assert.doesNotMatch(value, /\bCTIC\b/);
  }
  assert.match(shell, /CertificationCaseRegistryPage, CertificationCaseWorkspace/);
  assert.ok(workspace.split("\n").length < 180, "workspace should remain a coordinator, not a megacomponent");
});
