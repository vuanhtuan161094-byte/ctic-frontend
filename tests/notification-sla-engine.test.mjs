import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const centerSource = await readFile(
  new URL("../app/components/NotificationCenter.tsx", import.meta.url),
  "utf8",
);
const screenSource = await readFile(
  new URL("../app/components/NotificationsScreen.tsx", import.meta.url),
  "utf8",
);
const shellSource = await readFile(
  new URL("../app/components/DashboardShell.tsx", import.meta.url),
  "utf8",
);
const tasksSource = await readFile(
  new URL("../app/components/MyTasksScreen.tsx", import.meta.url),
  "utf8",
);
const notificationTypes = await readFile(
  new URL("../app/types/notification.ts", import.meta.url),
  "utf8",
);

test("notification bell displays the unread delivery count", () => {
  assert.match(centerSource, /summary\.total/);
  assert.match(centerSource, /<Badge count=\{unreadCount\}/);
  assert.match(shellSource, /<NotificationCenter/);
});

test("notification center opens as a compact popover", () => {
  assert.match(centerSource, /<Popover/);
  assert.match(centerSource, /notification-popover-panel/);
});

test("unread notifications are visually distinct", () => {
  assert.match(centerSource, /status === "unread" \? "is-unread"/);
  assert.match(screenSource, /notification-list-item is-unread/);
});

test("mark one read uses only the notification read endpoint", () => {
  assert.match(centerSource, /api\.patch\(`\/notifications\/\$\{id\}\/read`\)/);
});

test("mark all read uses the personal bulk endpoint", () => {
  assert.match(centerSource, /\/notifications\/me\/read-all/);
  assert.match(screenSource, /\/notifications\/me\/read-all/);
});

test("notification click uses the exact destination path", () => {
  assert.match(centerSource, /onOpenPath\(item\.destination_path, item\.context\)/);
  assert.match(screenSource, /onOpenPath\(item\.destination_path, item\.context\)/);
});

test("work assignment notification has a stable rendering category", () => {
  assert.match(notificationTypes, /"WORK_ASSIGNED"/);
  assert.match(centerSource, /WORK_ASSIGNED: "Công việc mới"/);
});

test("due-soon notification has a reminder label", () => {
  assert.match(notificationTypes, /"WORK_DUE_SOON"/);
  assert.match(centerSource, /WORK_DUE_SOON: "Nhắc hạn"/);
});

test("overdue notifications render warning semantics", () => {
  assert.match(centerSource, /\["WORK_OVERDUE", "WORK_ESCALATED"\]/);
  assert.match(centerSource, /<WarningOutlined/);
});

test("certificate expiry notifications render certificate context", () => {
  assert.match(notificationTypes, /"CERTIFICATE_EXPIRING"/);
  assert.match(centerSource, /<SafetyCertificateOutlined/);
});

test("customer-safe rendering does not expose internal deliberation fields", () => {
  assert.doesNotMatch(centerSource, /reason|deliberation|expert_evaluation/i);
  assert.doesNotMatch(screenSource, /reason|deliberation|expert_evaluation/i);
});

test("My Work displays overdue duration from the SLA projection", () => {
  assert.match(tasksSource, /sla_label/);
  assert.match(tasksSource, /days_overdue/);
  assert.match(tasksSource, /Quá hạn/);
});

test("My Work displays business-facing escalation levels", () => {
  assert.match(tasksSource, /Mức cảnh báo \{item\.escalation_level\}/);
  assert.doesNotMatch(tasksSource, />OVERDUE_L[123]</);
});

test("reading a notification never mutates Work Item status", () => {
  assert.doesNotMatch(centerSource, /work-items|my-work.*patch|status:\s*"DONE"/i);
  assert.doesNotMatch(screenSource, /work-items|my-work.*patch|status:\s*"DONE"/i);
});

test("notification empty states are intentional", () => {
  assert.match(centerSource, /Bạn chưa có thông báo/);
  assert.match(screenSource, /Không có thông báo trong nhóm này/);
});
