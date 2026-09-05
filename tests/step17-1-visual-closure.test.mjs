import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const registry = source("../app/components/certification-case/CertificationCaseRegistryPage.tsx");
const workspace = source("../app/components/certification-case/CertificationCaseWorkspace.tsx");
const showcase = source("../app/components/certification-case/CertificationCaseVisualShowcase.tsx");
const fixture = source("../app/components/certification-case/dev-certification-case-fixture.ts");
const caseStyles = source("../app/components/certification-case/certification-case.css");
const showcaseStyles = source("../app/components/certification-case/certification-case-visual-showcase.css");
const application = source("../app/components/CticApplication.tsx");
const shell = source("../app/components/DashboardShell.tsx");
const globalStyles = source("../app/globals.css");
const navigation = source("../app/lib/app-navigation.ts");

function filesUnder(path) {
  return readdirSync(path).flatMap((name) => {
    const child = join(path, name);
    return statSync(child).isDirectory() ? filesUnder(child) : [child];
  });
}

test("empty registry uses a dedicated EmptyState without a creation CTA", () => {
  assert.match(registry, /<EmptyState title="Chưa có hồ sơ chứng nhận"/);
  assert.match(registry, /đơn đăng ký và quy trình liên quan tạo hồ sơ/);
  assert.match(registry, /filteredRecords\.length === 0[\s\S]*data-empty-kind/);
  assert.doesNotMatch(registry, /<Button[^>]*>\s*(?:Tạo|Thêm) hồ sơ|onCreateCase|create-case/i);
});

test("filtered zero result is distinct from a genuinely empty registry", () => {
  assert.match(registry, /title="Không tìm thấy hồ sơ phù hợp"/);
  assert.match(registry, /hasSearchOrFilters && records\.length > 0 \? "filtered" : "registry"/);
  assert.match(registry, /records\.length === 0/);
});

test("registry keeps a compact table and card fallback contract", () => {
  assert.match(registry, /scroll=\{\{ x: 900 \}\}/);
  assert.match(registry, /tableLayout="fixed"/);
  assert.doesNotMatch(registry, /fixed: ["'](?:left|right)["']/);
  assert.match(registry, /responsiveCards=\{responsiveCards\}/);
  assert.match(caseStyles, /@media \(max-width: 768px\)/);
  assert.match(caseStyles, /\.cmp-case-registry-surface[\s\S]*min-width: 0/);
});

test("sidebar has one active child route and separate hover and focus states", () => {
  assert.match(shell, /selectedKeys=\{\[\["project-detail", "audit-workspace", "cap-workspace"\]\.includes\(activeView\) \? "projects" : activeView\]\}/);
  assert.match(globalStyles, /\.main-menu-v2\.ant-menu-dark \.ant-menu-item-selected/);
  assert.match(globalStyles, /\.ant-menu-item:not\(\.ant-menu-item-selected\):hover/);
  assert.match(globalStyles, /\.ant-menu-item:focus-visible/);
  assert.equal((showcase.match(/aria-current="page"/g) ?? []).length, 1);
});

test("DEV visual fixture is guarded, typed, read-only and absent from production navigation", () => {
  assert.match(application, /import\.meta\.env\.DEV[\s\S]*lazy\(\(\) => import\("\.\/certification-case\/CertificationCaseVisualShowcase"\)/);
  assert.match(application, /import\.meta\.env\.DEV && window\.location\.pathname === "\/__dev\/certification-case-showcase"/);
  assert.match(showcase, /CertificationCaseRegistryView/);
  assert.match(showcase, /CertificationCaseWorkspaceView/);
  assert.match(fixture, /CertificationCaseWorkspaceData/);
  assert.match(fixture, /CertificationCaseRecord\[]/);
  assert.doesNotMatch([showcase, fixture].join("\n"), /api\.(post|put|patch|delete)/);
  assert.doesNotMatch(shell, /__dev\/certification-case-showcase|CertificationCaseVisualShowcase/);
});

test("production bundle contains neither the DEV path nor typed mock payload", () => {
  const distRoot = fileURLToPath(new URL("../dist", import.meta.url));
  const productionText = filesUnder(distRoot)
    .filter((path) => /\.(?:html|js|css)$/.test(path))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  for (const marker of ["__dev/certification-case-showcase", "cmp-case-dev-showcase", "DEV · MOCK DATA", "HS-MAU-2026-0042", "Công ty Cổ phần Giải pháp Công nghiệp Xanh"]) {
    assert.doesNotMatch(productionText, new RegExp(marker), `production bundle leaked ${marker}`);
  }
});

test("real case routes and read projections remain unchanged", () => {
  assert.match(navigation, /if \(path === "\/certifications"\)/);
  assert.match(navigation, /\^\\\/certifications/);
  assert.match(workspace, /`\/certification-cases\/\$\{caseId\}\/workspace`/);
  assert.doesNotMatch([registry, workspace].join("\n"), /api\.(post|put|patch|delete)/);
});

test("visual closure remains white-label and stresses Vietnamese wrapping", () => {
  for (const value of [registry, workspace, showcase, fixture, caseStyles, showcaseStyles]) assert.doesNotMatch(value, /\bCTIC\b/);
  assert.match(fixture, /ISO 9001:2015 · ISO 14001:2015 · ISO 45001:2018/);
  assert.match(fixture, /Thiết kế, sản xuất, lắp đặt, vận hành và bảo trì/);
  assert.match(caseStyles, /overflow-wrap: anywhere/);
});
