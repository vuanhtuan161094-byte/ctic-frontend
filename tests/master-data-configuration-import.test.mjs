import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panelUrl = new URL("../app/components/MasterDataConfigurationPanel.tsx", import.meta.url);
const adminUrl = new URL("../app/components/SystemAdminScreen.tsx", import.meta.url);
const governanceUrl = new URL("../app/components/SystemGovernancePanel.tsx", import.meta.url);

test("system administration contains guided Vietnamese master/configuration tabs", async () => {
  const [panel, admin, governance] = await Promise.all([
    readFile(panelUrl, "utf8"),
    readFile(adminUrl, "utf8"),
    readFile(governanceUrl, "utf8"),
  ]);
  assert.match(admin, /SystemGovernancePanel/);
  assert.match(governance, /MasterDataConfigurationPanel/);
  for (const label of [
    "Bắt đầu từ đâu?",
    "Chương trình chứng nhận",
    "Tiêu chuẩn / phiên bản",
    "Phân loại ngành ISIC / NACE / IAF",
    "Chu kỳ & quy tắc chứng nhận",
    "Quy tắc đánh số",
    "Tổ chức & nhận diện",
    "Trung tâm nhập dữ liệu",
  ]) assert.match(panel, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Import Center exposes validate-preview-commit and CREATE_ONLY safety", async () => {
  const panel = await readFile(panelUrl, "utf8");
  assert.match(panel, /imports\/validate/);
  const detail = await readFile(new URL('../app/components/ImportJobDetails.tsx', import.meta.url), 'utf8');
  assert.match(panel, /ImportJobDetails id=\{selectedImportJob\}/);
  assert.match(detail, /imports\/\$\{id\}\/\$\{name\}/);
  assert.match(detail, /data.can_commit/);
  assert.match(detail, /action.mutate\("commit"\)/);
  assert.match(detail, /data.can_publish/);
  assert.match(panel, /CREATE_ONLY/);
  assert.match(panel, /Preview không sửa dữ liệu master/);
  assert.match(panel, /accept="\.csv,text\/csv"/);
});

test("versioned scheme rules and numbering clearly preserve history", async () => {
  const panel = await readFile(panelUrl, "utf8");
  assert.match(panel, /scheme-configurations\/\$\{id\}\/activate/);
  assert.match(panel, /Không sửa đè version cũ/);
  assert.match(panel, /số lịch sử không đổi|Số đã cấp trước đó không thay đổi/);
  assert.match(panel, /chốt vào dự án mới|bản chốt cấu hình cũ/);
});
