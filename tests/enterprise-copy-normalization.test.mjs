import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const login = source("../app/components/LoginScreen.tsx");
const dashboard = source("../app/components/PersonalDashboardScreen.tsx");
const tasks = source("../app/components/MyTasksScreen.tsx");
const calendar = source("../app/components/MyCalendarScreen.tsx");

test("login never exposes internal procedure code P.09", () => {
  assert.doesNotMatch(login, /P\.09/i);
  assert.match(login, /Chuẩn hóa quy trình chứng nhận/);
});

test("operational dashboard avoids consumer-style personal copy", () => {
  assert.doesNotMatch(dashboard, /của tôi/i);
  assert.doesNotMatch(dashboard, /Xin chào/i);
  assert.match(dashboard, /<Title level=\{2\}>Tổng quan<\/Title>/);
  assert.match(dashboard, /Chưa tạo hồ sơ/);
});

test("customer application intake is translated into business language", () => {
  assert.match(dashboard, /CUSTOMER_APPLICATION_INTAKE: "Tiếp nhận đơn đăng ký"/);
  assert.match(tasks, /CUSTOMER_APPLICATION_INTAKE: "Tiếp nhận đơn đăng ký"/);
  assert.doesNotMatch(tasks, /Công việc của tôi/);
  assert.doesNotMatch(tasks, /Việc của tôi/);
});

test("calendar uses neutral operational wording", () => {
  assert.doesNotMatch(calendar, /Lịch của tôi/);
  assert.doesNotMatch(calendar, /Danh sách lịch của tôi/);
  assert.match(calendar, /<Title level=\{1\}>Lịch<\/Title>/);
  assert.match(calendar, /AUDIT: "Xem lịch đánh giá"/);
  assert.match(calendar, /WORK_DUE: "Xem công việc"/);
  assert.doesNotMatch(calendar, />Mở<\/Button>/);
  assert.match(calendar, /Chưa tạo hồ sơ/);
});
