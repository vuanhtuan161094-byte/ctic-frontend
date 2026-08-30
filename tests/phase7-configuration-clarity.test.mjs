import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panelUrl = new URL("../app/components/MasterDataConfigurationPanel.tsx", import.meta.url);

test("configuration starts with a plain-language guided overview", async () => {
  const panel = await readFile(panelUrl, "utf8");
  assert.match(panel, /Bắt đầu từ đâu\?/);
  assert.match(panel, /Không cần cấu hình tất cả cùng lúc/);
  assert.match(panel, /1\. Chương trình & tiêu chuẩn/);
  assert.match(panel, /2\. Quy tắc chu kỳ/);
  assert.match(panel, /3\. Phân loại ngành/);
  assert.match(panel, /ISIC → NACE → IAF/);
});

test("scheme and standard UI explains concepts with concrete examples", async () => {
  const panel = await readFile(panelUrl, "utf8");
  assert.match(panel, /QMS – Hệ thống quản lý chất lượng/);
  assert.match(panel, /ISO 9001 · phiên bản 2015/);
  assert.match(panel, /Đây không phải tiêu chuẩn và cũng không phải IAF/);
});

test("scheme rule configuration explains every operational field", async () => {
  const panel = await readFile(panelUrl, "utf8");
  for (const text of [
    "Độ dài chu kỳ chứng nhận",
    "Khoảng giám sát định kỳ",
    "Thời hạn hiệu lực chứng chỉ",
    "Cửa sổ tái chứng nhận",
    "Nhắc vận hành trước mốc",
    "Có áp dụng Giai đoạn 1",
    "Danh mục loại đánh giá của chương trình",
    "Danh mục loại quyết định của chương trình",
  ]) assert.match(panel, new RegExp(text));
});

test("numbering UI only exposes entity types currently consumed by runtime", async () => {
  const panel = await readFile(panelUrl, "utf8");
  assert.match(panel, /runtimeNumberingEntities = \["DOCUMENT", "COMPLAINT", "APPEAL", "CHANGE", "SPECIAL_AUDIT"\]/);
  assert.match(panel, /Đơn đăng ký và Chứng chỉ hiện vẫn có cơ chế số riêng/);
  assert.match(panel, /series_key: values\.prefix/);
});

test("organization settings separate common fields from advanced technical settings", async () => {
  const panel = await readFile(panelUrl, "utf8");
  assert.match(panel, /1\. Thông tin tổ chức/);
  assert.match(panel, /2\. Thiết lập vùng, thời gian và lưu trữ \(nâng cao\)/);
  assert.match(panel, /đây không phải ô tải ảnh/);
});

test("configuration UI is explicit about current runtime integration boundaries", async () => {
  const panel = await readFile(panelUrl, "utf8");
  assert.match(panel, /được lấy từ bản cấu hình đã chốt của dự án/);
  assert.match(panel, /Độ dài chu kỳ chưa tự sinh thêm hồ sơ giám sát/);
  assert.match(panel, /Xem trường nào đang tác động thật đến hệ thống/);
});

test("configuration forms show concrete fill-in examples for every difficult field", async () => {
  const panel = await readFile(panelUrl, "utf8");
  for (const text of [
    "Ví dụ một hồ sơ tổ chức đã điền",
    "CÔNG TY TNHH ABC CERTIFICATION VIỆT NAM",
    "certification@abc.vn",
    "Ví dụ: 01/01/2026",
    "Ví dụ: 36",
    "Ví dụ: 12",
    "Ví dụ: 90",
    "Ví dụ: 60",
    "Ví dụ: GĐ1, GĐ2, Giám sát, Tái chứng nhận",
    "Ví dụ: Cấp, Duy trì, Tái cấp / tái chứng nhận",
    "Ví dụ: Khiếu nại",
    "số đầu tiên là 0001",
  ]) assert.match(panel, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
