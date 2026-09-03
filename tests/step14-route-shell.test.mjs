import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync(new URL("../app/components/DashboardShell.tsx", import.meta.url), "utf8");
const nav = readFileSync(new URL("../app/lib/app-navigation.ts", import.meta.url), "utf8");
const portalCases = readFileSync(new URL("../app/components/CustomerCertificationsScreen.tsx", import.meta.url), "utf8");

test("Step 14 makes canonical URL paths the browser navigation contract", () => {
  for (const route of ["/workspace", "/work", "/calendar", "/applications", "/certifications", "/schedule", "/documents", "/governance", "/analytics", "/admin"]) {
    assert.match(nav, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(shell, /window\.history\.pushState\([\s\S]*targetPath/);
  assert.match(shell, /parseCanonicalLocation\(\s*window\.location\.pathname/);
  assert.match(shell, /window\.history\.replaceState\([\s\S]*canonicalUrl/);
  assert.match(nav, /if \(path === "\/"\) return false/);
  assert.match(nav, /customerPortalMode\) return path === "\/portal"/);
});

test("legacy project and customer-portal destinations are adapted instead of deleted", () => {
  assert.match(nav, /Legacy project paths retained through Step 18/);
  assert.match(nav, /customer-portal\/corrective-actions/);
  assert.match(nav, /(?:projects\|certification-projects)/);
  assert.match(shell, /setSelectedProjectWorkspacePath\(path\)/);
});

test("internal navigation uses effective permissions from authenticated backend projection", () => {
  assert.match(shell, /"\/auth\/me"/);
  assert.match(shell, /effectivePermissions/);
  assert.match(shell, /hasPermission\("customers\.read"\)/);
  assert.match(shell, /hasPermission\("projects\.read"\)/);
  assert.match(shell, /hasRole\("ADMIN"\)/);
  assert.doesNotMatch(shell, /roleMenuKeys/);
});

test("Step 14 implements the frozen internal information architecture", () => {
  assert.match(shell, /KHÔNG GIAN LÀM VIỆC/);
  assert.match(shell, /NGHIỆP VỤ/);
  assert.match(shell, /QUẢN TRỊ/);
  assert.match(shell, /label: "Chứng nhận", children: certificationChildren/);
  assert.match(shell, /label: "Hồ sơ chứng nhận"/);
  assert.match(shell, /label: "Báo cáo điều hành"/);
});

test("Customer Portal has its own audience navigation and an explicit certification-case route", () => {
  assert.match(shell, /if \(customerPortalMode\) \{/);
  assert.match(shell, /key: "customer-certifications"/);
  assert.match(nav, /\/portal\/certifications/);
  assert.match(portalCases, /\/customer-portal\/me\/certifications/);
  assert.match(portalCases, /Không hiển thị dữ liệu thẩm xét nội bộ/);
});

test("shell exposes breadcrumb context and separate internal or portal shell identity", () => {
  assert.match(shell, /CmpBreadcrumb/);
  assert.match(shell, /application-shell--portal/);
  assert.match(shell, /application-shell--internal/);
});
