import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const capabilityUrl = new URL("app/components/CertificationBodyCapabilitiesPanel.tsx", root);
const routeUrl = new URL("app/components/ConfigurationRouteScreen.tsx", root);

test("organization capability UX is edition-aware and batch-selects IAF", async () => {
  const source = await readFile(capabilityUrl, "utf8");
  assert.match(source, /Năng lực tổ chức/);
  assert.match(source, /standard_edition_id/);
  assert.match(source, /iaf_scope_ids/);
  assert.match(source, /mode="multiple"/);
  assert.match(source, /\/certification-body-capabilities\/batch/);
  assert.match(source, /đã chọn \$\{selectedIafIds\.length\}/);
  assert.match(source, /IAF đang bao phủ/);
  assert.match(source, /ISO 9001:2026/);
});

test("capability screen uses a matrix for organization scope", async () => {
  const source = await readFile(capabilityUrl, "utf8");
  assert.match(source, /Ma trận năng lực/);
  assert.match(source, /Tiêu chuẩn × lĩnh vực IAF/);
  assert.match(source, /Ma trận năng lực theo IAF và tiêu chuẩn/);
  assert.match(source, /Cách đọc ma trận năng lực/);
});

test("capability screen keeps expert capability separate from organization capability", async () => {
  const source = await readFile(capabilityUrl, "utf8");
  assert.match(source, /CMP lấy ISIC của khách → NACE → IAF rồi đối chiếu ma trận này/);
  assert.match(source, /Năng lực tổ chức và năng lực từng chuyên gia vẫn là hai lớp kiểm tra riêng/);
  assert.match(source, /Chỉ tích những lĩnh vực thật sự nằm trong phạm vi năng lực\/công nhận/);
});

test("capability is a first-class configuration route", async () => {
  const route = await readFile(routeUrl, "utf8");
  assert.match(route, /key: "capabilities"/);
  assert.match(route, /label: "Phạm vi năng lực"/);
  assert.match(route, /CertificationBodyCapabilitiesPanel/);
});
