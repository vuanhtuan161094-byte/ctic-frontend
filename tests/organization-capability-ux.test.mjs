import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const capabilityUrl = new URL("app/components/CertificationBodyCapabilitiesPanel.tsx", root);
const configurationUrl = new URL("app/components/MasterDataConfigurationPanel.tsx", root);

test("organization capability UX is edition-aware and batch-selects IAF", async () => {
  const source = await readFile(capabilityUrl, "utf8");
  assert.match(source, /Năng lực tổ chức/);
  assert.match(source, /standard_edition_id/);
  assert.match(source, /iaf_scope_ids/);
  assert.match(source, /mode="multiple"/);
  assert.match(source, /\/certification-body-capabilities\/batch/);
  assert.match(source, /đã chọn \$\{selectedIafIds\.length\}/);
  assert.match(source, /IAF khác nhau/);
  assert.match(source, /ISO 9001:2026/);
});

test("organization capability screen explains real workflow and keeps expert capability separate", async () => {
  const source = await readFile(capabilityUrl, "utf8");
  assert.match(source, /ISIC của khách → NACE → IAF/);
  assert.match(source, /Năng lực tổ chức và năng lực từng chuyên gia là hai lớp kiểm tra riêng/);
  assert.match(source, /Chỉ tích những lĩnh vực thật sự nằm trong phạm vi năng lực\/công nhận/);
});

test("configuration guidance includes organization capability after industry mapping", async () => {
  const source = await readFile(configurationUrl, "utf8");
  assert.match(source, /4\. Năng lực tổ chức/);
  assert.match(source, /QMS · ISO 9001:2015 → IAF 14, 19, 28/);
  assert.match(source, /Application Review tự đối chiếu IAF của khách/);
});
