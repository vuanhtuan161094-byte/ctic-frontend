import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const internal = source("../app/components/CertificationProjectsScreen.tsx");
const portal = source("../app/components/CustomerApplicationsScreen.tsx");
const shell = source("../app/components/DashboardShell.tsx");
const programs = source("../app/components/CertificationProgramsPanel.tsx");

test("internal application intake consumes operational standards and has no free-text standard authority", () => {
  assert.match(internal, /\/master-data-configuration\/operational-standards/);
  assert.match(internal, /mode="multiple"/);
  assert.doesNotMatch(internal, /const standardOptions = \[/);
  assert.doesNotMatch(internal, /options=\{standardOptions\.map/);
  assert.doesNotMatch(internal, /placeholder="Chọn hoặc nhập tiêu chuẩn"/);
});

test("customer application intake uses the customer-safe operational catalogue and supports integrated selection", () => {
  assert.match(portal, /\/customer-portal\/me\/operational-standards/);
  assert.match(portal, /standard_names: item\.standard_name\.split\(" \+ "\)/);
  assert.match(portal, /standard_name: \(standard_names \?\? \[\]\)\.join\(" \+ "\)/);
  assert.match(portal, /mode="multiple"/);
  assert.doesNotMatch(portal, /name="standard_name"/);
});

test("configuration shell shows one combined program destination while retaining compatibility routing", () => {
  assert.match(shell, /"configuration-schemes": "schemes"/);
  assert.match(shell, /"configuration-standards": "standards"/);
  assert.match(shell, /\{ key: "configuration-schemes", label: "Chương trình & tiêu chuẩn" \}/);
  assert.doesNotMatch(shell, /\{ key: "configuration-standards", label: "Tiêu chuẩn & phiên bản" \}/);
  assert.match(shell, /"configuration-schemes": "Chương trình & tiêu chuẩn"/);
  assert.match(shell, /"configuration-standards": "Chương trình & tiêu chuẩn"/);
});

test("program configuration uses governance catalogue wording", () => {
  assert.match(programs, /label="Danh mục loại đánh giá"/);
  assert.match(programs, /label="Danh mục loại quyết định"/);
  assert.doesNotMatch(programs, /label="Loại đánh giá bắt buộc"/);
  assert.doesNotMatch(programs, /label="Loại quyết định bắt buộc"/);
});
