import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const panel = fs.readFileSync(path.join(root, 'app/components/IndustryTaxonomyPanel.tsx'), 'utf8');
const master = fs.readFileSync(path.join(root, 'app/components/MasterDataConfigurationPanel.tsx'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'app/components/ConfigurationRouteScreen.tsx'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'app/components/DashboardShell.tsx'), 'utf8');

test('taxonomy is one business workspace for ISIC -> NACE -> IAF', () => {
  assert.match(panel, /Chuỗi phân loại dùng trong CMP/);
  assert.match(panel, /ISIC Rev\.4/);
  assert.match(panel, /NACE Rev\.2/);
  assert.match(panel, /Lĩnh vực chứng nhận và năng lực/);
  for (const label of ['Tra cứu', 'Danh mục', 'Ánh xạ & kiểm soát', 'Nguồn tham chiếu']) {
    assert.ok(panel.includes(label), label);
  }
});

test('navigation exposes one taxonomy destination and keeps legacy mapping route compatible', () => {
  assert.match(shell, /label: "Phân loại ngành"/);
  assert.doesNotMatch(shell, /label: "Quy đổi phân loại"/);
  assert.match(routes, /if \(section === "mappings"\) return "classifications"/);
  assert.match(routes, /<IndustryTaxonomyPanel mode="all" \/>/);
});

test('catalog defaults to operational class level but can expose the full tree', () => {
  assert.match(panel, /isicLevel.*"CLASS"/);
  assert.match(panel, /naceLevel.*"CLASS"/);
  assert.match(panel, /Lớp chi tiết/);
  assert.match(panel, /Toàn bộ cây/);
  assert.match(panel, /Mã cha/);
});

test('lookup supports one code and multiple customer activities', () => {
  assert.match(panel, /Mã cần tra/);
  assert.match(panel, /Tra IAF/);
  assert.match(panel, /mode="multiple"/);
  assert.match(panel, /Tra NACE & IAF/);
  assert.match(panel, /Hoạt động ISIC/);
});

test('mapping control is source-backed and separates unresolved from outside-table cases', () => {
  assert.match(panel, /mapping-coverage/);
  assert.match(panel, /nace-iaf-projection/);
  assert.match(panel, /Đã xác định IAF/);
  assert.match(panel, /Cần chọn IAF/);
  assert.match(panel, /Ngoài bảng IAF/);
  assert.match(panel, /Lỗi ánh xạ/);
  assert.match(panel, /params: \{ status: "APPROVED" \}/);
});

test('mapping tables keep backend projection authoritative', () => {
  assert.match(panel, /resolution_status/);
  assert.match(panel, /DERIVED_/);
  assert.match(panel, /MULTIPLE/);
  assert.match(panel, /UNRESOLVED/);
  assert.doesNotMatch(panel, /const descendants =/);
  assert.doesNotMatch(panel, /children\.get\(row\.code\)/);
});

test('source references remain visible without duplicating tutorial content', () => {
  assert.match(panel, /Nguồn và phiên bản đang sử dụng/);
  assert.match(panel, /Vai trò trong CMP/);
  assert.match(panel, /Mở nguồn/);
  assert.doesNotMatch(panel, /Hướng dẫn & phiên bản tham chiếu/);
});

test('ISIC and NACE use Vietnamese labels first while retaining English traceability', () => {
  assert.match(panel, /row\.title_vi\?\.trim\(\) \|\| row\.title_en/);
  assert.match(panel, /row\.title_en/);
});

test('import center still supports taxonomy bulk-load and mapping workflow', () => {
  assert.match(master, /INDUSTRY_CLASSIFICATION/);
  assert.match(master, /ISIC_NACE_MAPPING/);
  assert.match(master, /NACE_IAF_MAPPING/);
  assert.match(master, /Tải tệp mẫu CSV/);
  assert.match(master, /mapping_type/);
});

test('readiness and load failures remain explicit', () => {
  assert.match(panel, /industry-classifications\/readiness/);
  assert.match(panel, /readiness\.data\.reasons/);
  assert.match(panel, /Không tải được dữ liệu phân loại ngành/);
  assert.match(panel, /Promise\.all\(loadQueries\.map\(\(query\) => query\.refetch\(\)\)\)/);
});
