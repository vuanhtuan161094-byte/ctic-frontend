import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const source = path => readFileSync(new URL(path, import.meta.url), "utf8");
const load = async code => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`);
const nav = await load(source("../app/lib/app-navigation.ts"));
const view = source("../app/components/certificate-workspace/CertificationCertificateWorkspace.tsx");
const page = source("../app/components/certificate-workspace/CertificateResourcePage.tsx");
const owner = source("../app/components/CertificateIssuanceWorkspaceModal.tsx");
const model = await load(view.slice(view.indexOf("export function certificateContextMatches"), view.indexOf("export function CertificationCertificateWorkspace")));
const application = source("../app/components/CticApplication.tsx");
const { isCertificateQaRoute } = await load(application.slice(application.indexOf("export function isCertificateQaRoute"), application.indexOf("function DevQueryBoundary")));
test("Certificate fixture session cannot hijack locked Decision or other workspace refresh", () => {
  assert.equal(isCertificateQaRoute("/certifications/c/certificates/k"), true);
  assert.equal(isCertificateQaRoute("/portal/certificates"), true);
  for (const path of ["/certifications/c/decision", "/certifications/c/technical-review", "/certifications/c/audits/p", "/certifications/c/findings/f", "/"]) assert.equal(isCertificateQaRoute(path), false);
});
test("canonical Certificate identity survives direct, refresh and history with encoded IDs", () => {
  const path = "/certifications/case%201/certificates/cert%2F2";
  const state = nav.parseCanonicalLocation(path, "", false);
  assert.equal(state.activeView, "certificate-workspace"); assert.equal(state.selectedCertificateId, "cert/2");
  assert.equal(nav.canonicalPathForNavigation(state, false), path);
  assert.deepEqual(nav.readBrowserNavigationState(nav.createBrowserHistoryPayload(state)), state);
  assert.deepEqual(nav.parseCanonicalLocation(nav.canonicalPathForNavigation(state, false), "", false), state);
});
test("legacy exact-resource link normalizes; pending issuance and explicit compatibility remain", () => {
  assert.equal(nav.parseCanonicalLocation("/projects/c", "?workspace=certificate-issue&certificate_id=k", false).activeView, "certificate-workspace");
  for (const query of ["?workspace=certificate-issue&audit_plan_id=p", "?workspace=certificate-issue&certificate_id=k&compatibility=legacy"]) assert.equal(nav.parseCanonicalLocation("/projects/c", query, false).activeView, "project-detail");
  assert.notEqual(nav.parseCanonicalLocation("/certifications/c/certificates", "", false).activeView, "certificate-workspace");
});
test("customer route cannot enter the internal Certificate workspace", () => {
  assert.notEqual(nav.parseCanonicalLocation("/certifications/c/certificates/k", "", true).activeView, "certificate-workspace");
});
test("case and exact certificate mismatch fail closed before rendering", () => {
  const data = { case_id: "c", plan: { project_id: "c" }, certificate_id: "k", certificate: { id: "k" } };
  assert.equal(model.certificateContextMatches(data, "c", "k"), true);
  assert.equal(model.certificateContextMatches(data, "other", "k"), false);
  assert.equal(model.certificateContextMatches(data, "c", "other"), false);
  assert.equal(model.certificateContextMatches({ ...data, certificate: null }, "c", "k"), false);
  assert.match(view, /if \(query.error\)/); assert.match(view, /\/case-workspace/);
});
test("page hosts the existing operation owner without a second mutation implementation", () => {
  assert.match(view, /<CertificateIssuanceWorkspaceModal/); assert.doesNotMatch(view + page, /api\.(post|patch|put|delete)/);
  assert.match(owner, /enabled: !page && open/); assert.match(owner, /page\?\.data \?\? workspaceQuery.data/);
});
const ast = ts.createSourceFile("owner.tsx", owner, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let mutation, uploadHandler;
function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "issueMutation") mutation = node.initializer.arguments[0].properties.find(item => item.name?.getText(ast) === "mutationFn").initializer.getText(ast); if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "uploadCertificatePdf") uploadHandler = node.initializer.getText(ast); ts.forEachChild(node, visit); }
visit(ast); assert.ok(mutation);
const { createMutation } = await load(`export function createMutation(api, workspace) { return ${mutation}; }`);
const { createUpload } = await load(`export function createUpload(deps) { const {page,canUpload,documentOwnerCertificate,uploadFile,setUploadError,setUploading,setUploadFile,api,message,refresh,getErrorMessage}=deps; return ${uploadHandler}; }`);
test("execute existing PDF upload handler with exact certificate and historical guard", async () => {
  const calls=[];
  const deps={ page:{data:{is_historical:false}},canUpload:true,documentOwnerCertificate:{id:"exact-version"},uploadFile:Object.assign(new Blob(["QA"],{type:"application/pdf"}),{name:"qa.pdf"}),setUploadError:()=>{},setUploading:()=>{},setUploadFile:()=>{},message:{success:()=>{}},refresh:async()=>{},getErrorMessage:String,api:{post:async(url,body)=>{calls.push({url,body});}}};
  await createUpload(deps)(); assert.equal(calls[0].url,"/certificates/exact-version/pdf"); assert.equal(calls[0].body.get("file").type,"application/pdf");
  calls.length=0; await createUpload({...deps,page:{data:{is_historical:true}}})(); assert.equal(calls.length,0);
  await createUpload({...deps,canUpload:false})(); assert.equal(calls.length,0);
});
test("existing issuance handler sends exact endpoint, review, confirmed number, dates and reason", async () => {
  const calls = []; const mutate = createMutation({ post: async (url, body) => { calls.push({ url, body }); return { data: {} }; } }, { technical_review: { id: "r" } });
  const date = { format: token => { assert.equal(token, "YYYY-MM-DD"); return "2026-09-10"; } };
  await mutate({ cert_number: " CERT-SERVER ", issue_date: date, expire_date: date, change_reason: " reason " });
  assert.deepEqual(calls, [{ url: "/certificates", body: { technical_review_id: "r", cert_number: "CERT-SERVER", issue_date: "2026-09-10", expire_date: "2026-09-10", change_reason: "reason" } }]);
  await assert.rejects(createMutation({}, {})({}));
});
test("official PDF upload reuses protected endpoint and historical mode prevents writes", () => {
  assert.match(owner, /api.post\(`\/certificates\/\$\{documentOwnerCertificate.id\}\/pdf`, data\)/);
  assert.match(owner, /if \(page && \(!canUpload \|\| page.data.is_historical\)\) return/);
  assert.match(owner, /url: `\/document-files\/\$\{file.id\}\/download`/);
  assert.match(page, /canUpload && !data.is_historical/);
});
test("exact snapshots and official document association are not replaced by current values", () => {
  assert.match(page, /const cert = data.certificate!/); assert.match(page, /cert.certification_scope/); assert.match(page, /cert.site_snapshot_json/);
  assert.match(page, /data.documents.find/); assert.match(page, /file.is_current && file.document_type === "certificate_pdf" && file.mime_type === "application\/pdf"/);
  assert.match(page, /Snapshot lịch sử bất biến/); assert.doesNotMatch(page, /setFieldsValue|version_no\s*\+|CERT-\$/);
});
test("lifecycle and public validity remain server owned, not frontend generated", () => {
  assert.match(page, /data.public_verification.is_valid/); assert.match(page, /data.public_verification.path/);
  assert.doesNotMatch(page, /\/status|QRCode|jsPDF|pdf-lib/);
  for (const status of ["active", "suspended", "withdrawn", "expired", "replaced"]) assert.ok(page.includes(`${status}:`));
});
test("Case, Decision, register and notification destinations expose canonical resources", () => {
  for (const file of ["../app/components/certification-case/CertificationCaseProgress.tsx", "../app/components/certification-decision/CertificationDecisionWorkspace.tsx", "../app/lib/task-navigation.ts", "../app/components/CertificatesScreen.tsx"]) assert.match(source(file), /\/certifications\/.*\/certificates\//);
});
test("proper non-disclosing states and responsive shared design system remain", () => {
  for (const state of ["ForbiddenState", "ErrorState", "EmptyState", "LoadingSkeleton"]) assert.ok(view.includes(state));
  assert.match(page, /ReadOnlyState/); assert.match(page, /Drawer/); assert.match(page, /column=\{\{ xs: 1, sm: 2 \}\}/);
  assert.match(source("../app/components/certificate-workspace/certificate-workspace.css"), /max-width:768px/);
});
test("production bundle excludes controlled Certificate fixture", () => {
  const directory = new URL("../dist/assets/", import.meta.url);
  for (const name of readdirSync(directory).filter(name => name.endsWith(".js"))) assert.doesNotMatch(readFileSync(new URL(name, directory), "utf8"), /cmp-certificate-isolated-qa|qa-certificate-denied/);
});
test("Step17 closure inventory preserves the full canonical workflow chain", () => {
  for (const [path, activeView] of [["/certifications/c", "project-detail"], ["/certifications/c/audits/p", "audit-workspace"], ["/certifications/c/findings/f", "cap-workspace"], ["/certifications/c/technical-review", "technical-review-workspace"], ["/certifications/c/decision", "decision-workspace"], ["/certifications/c/certificates/k", "certificate-workspace"]]) {
    const state = nav.parseCanonicalLocation(path, "", false);
    assert.equal(state.activeView, activeView); assert.equal(state.selectedProjectId, "c");
    assert.ok(nav.canonicalPathForNavigation(state, false).startsWith(path));
  }
});
