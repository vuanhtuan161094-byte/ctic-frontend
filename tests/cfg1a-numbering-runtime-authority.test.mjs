import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const helperUrl = new URL("../app/lib/numbering-configuration.ts", import.meta.url);
const panelUrl = new URL("../app/components/MasterDataConfigurationPanel.tsx", import.meta.url);
const routeUrl = new URL("../app/components/ConfigurationRouteScreen.tsx", import.meta.url);

async function importTypeScriptModule(url) {
  const source = await readFile(url, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const contract = {
  contract_version: "CFG-1A",
  sequence_authority: "NORMALIZED_VISIBLE_PREFIX_PER_BUSINESS_YEAR",
  format_template: "{PREFIX}-{YYYY}-{SEQUENCE}",
  timezone: "Asia/Ho_Chi_Minh",
  preview_year: 2026,
  configurable_entities: [
    { entity_type: "DOCUMENT", label: "Tài liệu kiểm soát" },
    { entity_type: "SPECIAL_AUDIT", label: "Đánh giá đặc biệt" },
  ],
  non_configurable_entities: [
    { entity_type: "APPLICATION", label: "Đơn đăng ký", reason: "Cơ chế riêng" },
    { entity_type: "CERTIFICATE", label: "Chứng chỉ", reason: "Cơ chế riêng" },
  ],
};

test("capability options and labels come only from backend metadata", async () => {
  const helper = await importTypeScriptModule(helperUrl);
  assert.deepEqual(helper.numberingCapabilityOptions(contract), [
    { value: "DOCUMENT", label: "Tài liệu kiểm soát" },
    { value: "SPECIAL_AUDIT", label: "Đánh giá đặc biệt" },
  ]);
  assert.equal(
    helper.numberingCapabilityLabel(contract, "APPLICATION"),
    "Loại hồ sơ không được hỗ trợ",
  );
});

test("preview follows the backend prefix-year-padding contract", async () => {
  const helper = await importTypeScriptModule(helperUrl);
  assert.equal(helper.buildNumberingPreview(" cmp ", 5, 2026), "CMP-2026-00001");
  assert.equal(helper.buildNumberingPreview("", 1, 2026), "PREFIX-2026-001");
});

test("rules are separated into current scheduled and immutable history", async () => {
  const helper = await importTypeScriptModule(helperUrl);
  const grouped = helper.groupNumberingRules([
    { id: "1", lifecycle_state: "CURRENT" },
    { id: "2", lifecycle_state: "SCHEDULED" },
    { id: "3", lifecycle_state: "HISTORICAL" },
    { id: "4", lifecycle_state: "CANCELLED" },
  ]);
  assert.deepEqual(grouped.current.map((item) => item.id), ["1"]);
  assert.deepEqual(grouped.scheduled.map((item) => item.id), ["2"]);
  assert.deepEqual(grouped.historical.map((item) => item.id), ["3", "4"]);
});

test("numbering surface consumes capabilities and lifecycle commands", async () => {
  const [panel, route] = await Promise.all([
    readFile(panelUrl, "utf8"),
    readFile(routeUrl, "utf8"),
  ]);
  assert.match(panel, /numbering-capabilities/);
  assert.match(panel, /numberingCapabilityOptions\(numberingCapabilities\.data\)/);
  assert.doesNotMatch(panel, /const runtimeNumberingEntities\s*=/);
  assert.doesNotMatch(panel, /series_key:\s*values\.prefix/);
  assert.match(panel, /numbering-series\/\$\{values\.id\}\/replace/);
  assert.match(panel, /numbering-series\/\$\{values\.id\}\/end/);
  assert.match(panel, /numbering-series\/\$\{values\.id\}\/cancel-scheduled/);
  assert.match(route, /readiness\.numbering\.reasons/);
  assert.doesNotMatch(route, /Chưa có quy tắc đánh số cho \$\{entityType\}/);
});
