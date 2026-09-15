import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const shell = source("../app/components/DashboardShell.tsx");
const navigation = source("../app/lib/app-navigation.ts");
const routes = source("../app/components/ConfigurationRouteScreen.tsx");
const programs = source("../app/components/CertificationProgramsPanel.tsx");
const masterData = source("../app/components/MasterDataConfigurationPanel.tsx");
const capabilities = source("../app/components/CertificationBodyCapabilitiesPanel.tsx");
const taxonomy = source("../app/components/IndustryTaxonomyPanel.tsx");

const configurationPaths = [
  "/admin/configuration/schemes",
  "/admin/configuration/standards",
  "/admin/configuration/capabilities",
  "/admin/configuration/numbering",
  "/admin/configuration/branding",
  "/admin/configuration/classifications",
  "/admin/configuration/mappings",
  "/admin/configuration/import",
];

test("Step 15 exposes each configuration domain at a canonical route", () => {
  for (const path of configurationPaths) assert.ok(navigation.includes(path), `missing ${path}`);
  assert.match(navigation, /configurationRoute[\s\S]*activeView: configurationRoute\[1\]/);
  assert.match(navigation, /"system-admin": "\/admin\/accounts"/);
});

test("configuration navigation is grouped by business purpose without implementation copy", () => {
  assert.match(shell, /Cấu hình chứng nhận/);
  assert.match(shell, /Dữ liệu phân loại/);
  assert.match(shell, /canManageConfiguration = hasPermission\("classifications\.manage"\)/);
  assert.match(shell, /configurationSection[\s\S]*ForbiddenState/);
  assert.doesNotMatch(routes, /backend kiểm soát/);
  assert.doesNotMatch(routes, /chiếu trực tiếp từ dữ liệu/);
});

test("programme, standard family and edition configuration uses one focused hierarchy", () => {
  assert.match(routes, /CertificationProgramsPanel/);
  assert.match(routes, /standards" \? "schemes"/);
  assert.match(programs, /familiesByScheme/);
  assert.match(programs, /type StandardFamily/);
  assert.match(programs, /Thêm tiêu chuẩn/);
  assert.match(programs, /Thêm phiên bản/);
  assert.match(programs, /standardEditionLabel/);
});

test("capability configuration remains exact-edition and IAF scoped", () => {
  assert.match(routes, /CertificationBodyCapabilitiesPanel/);
  assert.match(capabilities, /standard_edition_id/);
  assert.match(capabilities, /iaf_scope_id/);
  assert.match(capabilities, /effective_from/);
  assert.match(capabilities, /effective_to/);
});

test("classification and mapping destinations preserve the ISIC to NACE to IAF chain", () => {
  assert.match(routes, /IndustryTaxonomyPanel mode="classifications"/);
  assert.match(routes, /IndustryTaxonomyPanel mode="mappings"/);
  assert.match(taxonomy, /ISIC[^\n]*→ NACE Rev\.2 → IAF/);
  assert.match(taxonomy, /mode === "mappings"/);
  assert.match(taxonomy, /\["isic-nace", "nace-iaf"\]\.includes\(item\.key\)/);
});

test("import remains an explicit validate then commit flow", () => {
  assert.match(masterData, /validateImport/);
  assert.match(masterData, /ImportJobDetails id=\{selectedImportJob\}/);
  assert.match(source('../app/components/ImportJobDetails.tsx'), /action.mutate\("commit"\)/);
  assert.match(masterData, /VALIDATED/);
  assert.match(masterData, /COMMITTED/);
});

test("route pages keep shared states and source-backed readiness without a second navigation shell", () => {
  assert.match(routes, /PageHeader/);
  assert.match(routes, /ReadinessBlockerPanel/);
  assert.match(routes, /LoadingSkeleton/);
  assert.match(routes, /ErrorState/);
  assert.match(routes, /configuration-readiness/);
  assert.doesNotMatch(routes, /ResponsiveCardList/);
  assert.doesNotMatch(routes, /ConfigurationNavigation/);
});

test("Step 15 route shell does not add product-name branding literals", () => {
  assert.doesNotMatch(routes, /\bCTIC\b/);
  assert.doesNotMatch(programs, /\bCTIC\b/);
  assert.doesNotMatch(navigation, /\bCTIC\b/);
});
