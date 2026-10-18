import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboard = await readFile(new URL("../app/components/PersonalDashboardScreen.tsx", import.meta.url), "utf8");
const shell = await readFile(new URL("../app/components/DashboardShell.tsx", import.meta.url), "utf8");
const tokens = await readFile(new URL("../app/components/design-system/tokens.css", import.meta.url), "utf8");
const theme = await readFile(new URL("../app/components/design-system/theme.ts", import.meta.url), "utf8");

test("Vietnamese operator copy is concise without changing business actions", () => {
  for (const label of ["Việc cần xử lý", "Việc cần lưu ý", "Hồ sơ vừa cập nhật"]) {
    assert.match(dashboard, new RegExp(label));
  }
  assert.doesNotMatch(dashboard, /Ngoại lệ cần chú ý|TỔNG QUAN VẬN HÀNH/);
  assert.match(shell, /tìm khách hàng, hồ sơ hoặc công việc/);
  assert.match(dashboard, /onOpenPath\(item\.destination_path, item\.context\)/);
});
test("One locally available font stack is shared by CSS tokens and Ant Design theme", () => {
  const family = '"Segoe UI Variable", "Segoe UI", "Noto Sans", Arial, sans-serif';
  assert.ok(tokens.includes(`--cmp-font-family: ${family};`));
  assert.ok(theme.includes(`fontFamily: '${family}'`));
});
