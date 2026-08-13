import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const workspaceUrl = new URL("app/components/AuditExecutionWorkspaceModal.tsx", projectRoot);

test("Stage 2 execution workspace renders the backend lifecycle gate and hides Start when blocked", async () => {
  const source = await readFile(workspaceUrl, "utf8");

  assert.match(source, /stage2_lifecycle_gate/);
  assert.match(source, /Điều kiện GĐ2/);
  assert.match(source, /Chưa đủ điều kiện bắt đầu Giai đoạn 2/);
  assert.match(source, /stage2LifecycleGate\?\.applicable && !stage2LifecycleGate\.allowed/);
  assert.match(source, /Giai đoạn 1 đã hoàn thành và kết luận sẵn sàng/);
  assert.match(source, /Backend sẽ kiểm tra lại việc hoàn thành Giai đoạn 1/);
});
