import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../app/", import.meta.url);
const master = await readFile(new URL("components/MasterDataConfigurationPanel.tsx", root), "utf8");
const routes = await readFile(new URL("components/ConfigurationRouteScreen.tsx", root), "utf8");
const programs = await readFile(new URL("components/CertificationProgramsPanel.tsx", root), "utf8");
const taxonomy = await readFile(new URL("components/IndustryTaxonomyPanel.tsx", root), "utf8");

test("configuration routes use concise business-facing destinations", () => {
  for (const label of [
    "Chương trình & tiêu chuẩn",
    "Phạm vi năng lực",
    "Quy tắc đánh số",
    "Tổ chức & nhận diện",
    "Phân loại ngành",
    "Nhập dữ liệu",
  ]) assert.match(routes, new RegExp(label.replace(/[.*+?^$()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(routes, /backend kiểm soát|chiếu trực tiếp từ dữ liệu/);
});

test("program rule configuration groups core fields and hides secondary scope until needed", () => {
  assert.match(programs, /Quy tắc chứng nhận/);
  assert.match(programs, /Chu kỳ chứng nhận/);
  assert.match(programs, /Cửa sổ tái chứng nhận/);
  assert.match(programs, /Nhắc trước mốc/);
  assert.match(programs, /Phạm vi quy tắc & loại áp dụng/);
  assert.match(programs, /maxTagCount=\{0\}/);
});

test("numbering UI exposes current runtime scope without pretending all document numbers are centralized", () => {
  assert.match(master, /numbering-capabilities/);
  assert.match(master, /numberingCapabilityOptions\(numberingCapabilities\.data\)/);
  assert.match(master, /Workflow đang quản lý riêng/);
  assert.match(master, /Quyết định chỉ định đoàn, Quyết định chứng nhận và Thông báo kết quả/);
  assert.doesNotMatch(master, /const runtimeNumberingEntities\s*=/);
});

test("organization settings show business data and active operational settings only", () => {
  assert.match(master, /Thông tin tổ chức/);
  assert.match(master, /Thiết lập vận hành/);
  assert.match(master, /Múi giờ nghiệp vụ/);
  assert.match(master, /Mốc nhắc hết hạn chứng chỉ/);
  assert.doesNotMatch(master, /Form.Item name="logo_reference"/);
  assert.doesNotMatch(master, /Form.Item name="file_retention_days"/);
  assert.doesNotMatch(master, /CMP V1 hiện cố định giao diện/);
});

test("taxonomy is one focused workspace rather than separate catalog and conversion screens", () => {
  assert.match(taxonomy, /Chuỗi phân loại dùng trong CMP/);
  assert.match(taxonomy, /label: "Tra cứu"/);
  assert.match(taxonomy, /label: "Danh mục"/);
  assert.match(taxonomy, /label: "Ánh xạ & kiểm soát"/);
  assert.match(taxonomy, /label: "Nguồn tham chiếu"/);
  assert.match(routes, /if \(section === "mappings"\) return "classifications"/);
});

test("import center remains a deliberate bulk-data workflow", () => {
  assert.match(master, /Trung tâm nhập dữ liệu/);
  assert.match(master, /Kiểm tra \/ Xem trước/);
  assert.match(master, /Preview không sửa dữ liệu master/);
  assert.match(master, /accept="\.csv,text\/csv"/);
});
