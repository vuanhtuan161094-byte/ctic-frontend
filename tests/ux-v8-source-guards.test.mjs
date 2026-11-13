import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// Source guards complement — but do not replace — browser and live-API acceptance.
test("reports list and CSV use the same complete filtered set", async () => {
  const source = await file("app/components/ReportsScreen.tsx");
  assert.match(source, /dataSource=\{filteredReports\}/);
  assert.match(source, /useMobileReportCards/);
  assert.match(source, /report-mobile-card__heading/);
  assert.match(source, /exportCsv\(filteredReports\)/);
  assert.match(source, /showTotal:\s*\(total, range\)/);
  assert.doesNotMatch(source, /filteredReports\.slice\(0,\s*50\)/);
});

test("task KPI filters are operable with keyboard and expose pressed state", async () => {
  const source = await file("app/components/MyTasksScreen.tsx");
  assert.match(source, /function activateKpiWithKeyboard/);
  assert.match(source, /event\.key !== "Enter" && event\.key !== " "/);
  assert.equal((source.match(/role="button"/g) ?? []).length, 4);
  assert.equal((source.match(/aria-pressed=/g) ?? []).length, 4);
  assert.equal((source.match(/onKeyDown=\{\(event\) => activateKpiWithKeyboard/g) ?? []).length, 4);
  assert.match(source, /pagination\?\.total/);
  assert.match(source, /params\.set\("search", debouncedSearch\)/);
  assert.match(source, /current: serverPage/);
  assert.doesNotMatch(source, /Các bộ lọc bên dưới chỉ áp dụng cho danh sách đã tải/);
});

test("quick search describes its real recent-data scope", async () => {
  const source = await file("app/components/DashboardShell.tsx");
  assert.match(source, /Tìm trong dữ liệu gần đây/);
  assert.match(source, /Tìm hồ sơ và công việc gần đây/);
  assert.doesNotMatch(source, /title="Tìm kiếm nhanh"/);
});

test("management workspace uses clear Vietnamese operator copy", async () => {
  const source = await file("app/components/ManagementCockpitScreen.tsx");
  assert.match(source, /ĐIỀU HÀNH & KINH DOANH/);
  assert.match(source, /Khiếu nại đang xử lý/);
  assert.match(source, /Lượt phân công/);
  assert.doesNotMatch(source, /KPI do backend định nghĩa|revenue recognized|Không suy diễn utilization|Change case đang mở/);
});

test("new brand polish does not force motion on reduced-motion users", async () => {
  const source = await file("app/globals.css");
  assert.match(source, /CMP UX-V8 \|/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
  assert.match(source, /animation:\s*cmp-v8-arrive/);
  assert.match(source, /focus-visible/);
});
