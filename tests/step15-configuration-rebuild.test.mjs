import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const shell = source("../app/components/DashboardShell.tsx");
const navigation = source("../app/lib/app-navigation.ts");
const routes = source("../app/components/ConfigurationRouteScreen.tsx");
const masterData = source("../app/components/MasterDataConfigurationPanel.tsx");
const capabilities = source("../app/components/CertificationBodyCapabilitiesPanel.tsx");
const taxonomy = source("../app/components/IndustryTaxonomyPanel.tsx");
const styles = source("../app/globals.css");

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

test("configuration navigation is grouped and shaped by effective backend access", () => {
  assert.match(shell, /Cấu hình chứng nhận/);
  assert.match(shell, /Dữ liệu phân loại/);
  assert.match(shell, /canManageConfiguration = hasPermission\("classifications\.manage"\)/);
  assert.match(shell, /configurationSection[\s\S]*ForbiddenState/);
  assert.match(routes, /Nguồn dữ liệu và quyền thao tác do backend kiểm soát/);
});

test("programme, standard and edition configuration reuses the existing hierarchy", () => {
  assert.match(routes, /schemes: "programs"/);
  assert.match(routes, /standards: "programs"/);
  assert.match(masterData, /Chương trình chứng nhận/);
  assert.match(masterData, /Tiêu chuẩn/);
  assert.match(masterData, /Phiên bản/);
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
  assert.match(masterData, /commitImport/);
  assert.match(masterData, /VALIDATED/);
  assert.match(masterData, /COMMITTED/);
});

test("route pages use shared states, source-backed readiness, and a responsive fallback", () => {
  assert.match(routes, /PageHeader/);
  assert.match(routes, /ReadinessBlockerPanel/);
  assert.match(routes, /LoadingSkeleton/);
  assert.match(routes, /ErrorState/);
  assert.match(routes, /configuration-readiness/);
  assert.match(routes, /ResponsiveCardList/);
  assert.match(styles, /configuration-route-nav-mobile/);
  assert.match(styles, /@media \(max-width: 768px\)[\s\S]*configuration-route-nav-mobile/);
});

test("Step 15 route shell does not add product-name branding literals", () => {
  assert.doesNotMatch(routes, /\bCTIC\b/);
  assert.doesNotMatch(navigation, /\bCTIC\b/);
});
