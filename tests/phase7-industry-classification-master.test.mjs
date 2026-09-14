import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const panel = fs.readFileSync(path.join(root, 'app/components/IndustryTaxonomyPanel.tsx'), 'utf8');
const master = fs.readFileSync(path.join(root, 'app/components/MasterDataConfigurationPanel.tsx'), 'utf8');

test('industry taxonomy explains ISIC -> NACE -> IAF business chain', () => {
  assert.match(panel, /ISIC của khách hàng → NACE Rev\.2 → IAF/);
  assert.match(panel, /Khách hàng có thể có nhiều hoạt động/);
});

test('industry taxonomy shows full dataset counts', () => {
  assert.match(panel, /ISIC Rev\.4/);
  assert.match(panel, /NACE Rev\.2/);
  assert.match(panel, /Lĩnh vực IAF/);
  assert.match(panel, /Quy đổi ISIC → NACE/);
});

test('industry taxonomy exposes five data views and source information', () => {
  for (const label of ['Danh mục ISIC', 'Danh mục NACE', 'Lĩnh vực IAF', 'Quy đổi ISIC → NACE', 'Quy đổi NACE → IAF', 'Nguồn & phiên bản']) {
    assert.ok(panel.includes(label), label);
  }
});

test('customer flow preview supports multiple ISIC selections', () => {
  assert.match(panel, /mode="multiple"/);
  assert.match(panel, /Tra NACE & IAF/);
  assert.match(panel, /Tra thử nhiều hoạt động ISIC/);
});

test('plastic example documents one-to-many ISIC mapping', () => {
  assert.match(panel, /ISIC 2220/);
  assert.match(panel, /22\.21 \/ 22\.22 \/ 22\.23 \/ 22\.29/);
  assert.match(panel, /IAF 14/);
});

test('QMS EMS OHSMS are presented in Vietnamese business context', () => {
  assert.match(panel, /ISO 9001 \/ QMS/);
  assert.match(panel, /ISO 14001 \/ EMS/);
  assert.match(panel, /ISO 45001 \/ OH&SMS/);
});

test('import center includes ISIC to NACE mapping import and CSV template', () => {
  assert.match(master, /ISIC_NACE_MAPPING/);
  assert.match(master, /Quy đổi ISIC → NACE/);
  assert.match(master, /Tải tệp mẫu CSV/);
  assert.match(master, /mapping_type/);
});

test('master taxonomy tab uses dedicated usable panel', () => {
  assert.match(master, /Phân loại ngành ISIC \/ NACE \/ IAF/);
  assert.match(master, /<IndustryTaxonomyPanel \/>/);
});

test('ISIC and NACE display Vietnamese activity names first while keeping official English for traceability', () => {
  assert.match(panel, /row\.title_vi\?\.trim\(\) \|\| row\.title_en/);
  assert.match(panel, /Tên chính thức EN:/);
  assert.match(panel, /tên tiếng Việt hoặc tiếng Anh/);
});

test('mapping and customer preview also use Vietnamese activity labels', () => {
  assert.match(panel, /label: `\$\{row\.code\} · \$\{codeTitle\(row\)\}`/);
  assert.ok((panel.match(/codeTitle\(row\.(?:source_code|target_code|nace_code)\)/g) ?? []).length >= 3);
});

test('industry explorer resolves parent NACE codes and exposes mapping coverage', () => {
  assert.match(panel, /Tra nhanh bất kỳ mã ISIC \/ NACE/);
  assert.match(panel, /NACE 26\.5/);
  assert.match(panel, /IAF 19/);
  assert.match(panel, /mapping-coverage/);
  assert.match(panel, /Lỗi chưa ánh xạ/);
  assert.match(panel, /Ngoài bảng IAF/);
  assert.match(panel, /DERIVED_FROM_CHILDREN/);
});

test('NACE to IAF table renders backend projection states', () => {
  assert.match(panel, /toàn bộ cây NACE/);
  assert.match(panel, /nace-iaf-projection/);
  assert.match(panel, /resolution_status/);
  for (const state of ['MULTIPLE', 'UNRESOLVED', 'Ngoài bảng IAF', 'DERIVED_']) {
    assert.ok(panel.includes(state), state);
  }
});

test('frontend no longer owns NACE descendant resolution', () => {
  assert.doesNotMatch(panel, /const descendants =/);
  assert.doesNotMatch(panel, /children\.get\(row\.code\)/);
  assert.doesNotMatch(panel, /\^\(\?:97\|98\|99\)/);
  assert.doesNotMatch(panel, /nace-iaf-mappings\?status=APPROVED/);
});

test('frontend renders backend readiness reasons without count thresholds', () => {
  assert.match(panel, /industry-classifications\/readiness/);
  assert.match(panel, /readiness\.data\.reasons/);
  assert.doesNotMatch(panel, /function countReady/);
  assert.doesNotMatch(panel, /nace_total === 996/);
  assert.match(master, /taxonomy\.reasons/);
});

test('industry configuration keeps load failures separate from empty reference data', () => {
  assert.match(panel, /const failedQuery = loadQueries\.find\(\(query\) => query\.isError\)/);
  assert.match(panel, /Không tải được dữ liệu phân loại ngành/);
  assert.match(panel, /Promise\.all\(loadQueries\.map\(\(query\) => query\.refetch\(\)\)\)/);
});
