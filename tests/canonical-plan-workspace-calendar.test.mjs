import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync(
  new URL("../app/components/CertificationProjectDetailScreen.tsx", import.meta.url),
  "utf8",
);
const scheduleSource = readFileSync(
  new URL("../app/components/ScheduleResourcesScreen.tsx", import.meta.url),
  "utf8",
);
const dashboardSource = readFileSync(
  new URL("../app/components/DashboardShell.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("certification project is one operational workspace with cycle selection only", () => {
  assert.doesNotMatch(detailSource, /activeWorkspaceTab|project-workspace-tabs|AuditProgramPanel|AuditPlanWorkspaceDrawer/);
  assert.match(detailSource, /title="Chu kỳ chứng nhận"/);
  assert.match(detailSource, /Hồ sơ chứng nhận lần đầu/);
  assert.match(detailSource, /Hồ sơ dùng chung \/ xuyên chu kỳ/);
  assert.doesNotMatch(dashboardSource, /onOpenAuditPlan=|onOpenTeamAssignment=/);
});

test("dossier exposes one role-aware primary next action and secondary row actions", () => {
  assert.match(detailSource, /const selectedNextAction = selectedDossier \? effectiveNextAction\(selectedDossier\) : null/);
  assert.match(detailSource, /canPerformNextAction/);
  assert.match(detailSource, /selectedNextAction\.responsibleLabel/);
  assert.match(detailSource, /openDossierNextAction\(selectedDossier\)/);
  assert.match(detailSource, /className="dossier-next-action-button"[\s\S]*type="primary"/);

  const columns = detailSource.slice(
    detailSource.indexOf("const dossierColumns"),
    detailSource.indexOf("if (detailQuery.isLoading)"),
  );
  assert.match(columns, /className="dossier-row-action"/);
  assert.doesNotMatch(columns, /className="dossier-row-action"[\s\S]{0,250}type="primary"/);
});

test("business status and document-version state are presented separately", () => {
  assert.match(detailSource, /title: "Trạng thái"[\s\S]*DossierBusinessStatusTag/);
  assert.match(detailSource, /title: "Phiên bản \/ tài liệu"/);
  for (const label of [
    "Đã xác nhận",
    "Đã lập",
    "Hoàn thành",
    "Chờ thực hiện",
    "Không áp dụng",
    "Chưa sinh Word",
    "Chưa có PDF chính thức",
    "PDF chính thức",
  ]) {
    assert.match(detailSource, new RegExp(label));
  }
  assert.doesNotMatch(detailSource, /title: "Nguồn dữ liệu"/);
});

test("surveillance N/A and F15 semantics remain visible and satisfied", () => {
  const surveillanceStages = detailSource.slice(
    detailSource.indexOf("const surveillanceWorkflowStageDefinitions"),
    detailSource.indexOf("type WorkflowStageDefinition"),
  );
  assert.match(surveillanceStages, /title: "Kế hoạch & đánh giá"[\s\S]*"audit_log"/);
  assert.match(surveillanceStages, /title: "Phát hành & lưu hồ sơ"[\s\S]*keys: \["certificate"\]/);
  assert.match(detailSource, /status === "not_applicable"[\s\S]*return "Không áp dụng"/);
  assert.match(detailSource, /\["completed", "not_applicable"\]\.includes\(normalize\(item\.status\)\)/);
  assert.match(detailSource, /key === "certificate"[\s\S]*normalize\(record\.status\) === "not_applicable"[\s\S]*<Tag>Không áp dụng<\/Tag>/);
});

test("F04 and F05 open directly from the dossier without the Schedule shell", () => {
  assert.match(detailSource, /setCoordinationTarget\(`appointment:\$\{plan\.id\}`\)/);
  assert.match(detailSource, /appointmentEditorOnly/);
  assert.match(detailSource, /initialPlanId=\{coordinationTarget\}/);
  assert.match(detailSource, /documentType: "audit_plan_f05"/);
  assert.doesNotMatch(detailSource, /<Modal[\s\S]{0,600}<ScheduleResourcesScreen/);
  assert.match(scheduleSource, /open=\{!appointmentEditorOnly && Boolean\(selectedPlan\)\}/);
});

test("issued F04 is read-only and uses persisted program allocations", () => {
  assert.match(scheduleSource, /const selectedAppointmentLocked = \["issued", "confirmed"\]/);
  assert.match(scheduleSource, /selectedAppointment\?\.program_manday_allocations/);
  assert.match(scheduleSource, /footer=\{selectedAppointmentLocked \? null : undefined\}/);
  assert.match(scheduleSource, /Chỉ định đoàn đánh giá · Đã ban hành/);
  assert.match(scheduleSource, /!selectedAppointmentLocked && !scopePrerequisiteBlocked/);
  assert.doesNotMatch(scheduleSource, /Tạo phiên bản F\.04|Tạo bản cập nhật F\.04/);
});

test("project header falls back to cycle dates and approved mandays", () => {
  assert.match(detailSource, /selectedDossier\?\.planned_end_date \?\? selectedStartDate/);
  assert.match(detailSource, /selectedPrimaryPlan\?\.audit_event\?\.planned_mandays[\s\S]*selectedDossier\?\.planned_mandays/);
});

test("Schedule & Resources is read-focused and opens work in the project dossier", () => {
  const workspaceStart = scheduleSource.indexOf("activeKey={workspaceTab}");
  assert.notEqual(workspaceStart, -1);
  const workspace = scheduleSource.slice(
    workspaceStart,
    scheduleSource.indexOf("<Drawer", workspaceStart),
  );
  assert.match(scheduleSource, /<Title level=\{1\}>Lịch & nguồn lực<\/Title>/);
  assert.match(workspace, /Nguồn lực/);
  assert.match(workspace, /Lịch tổng hợp/);
  assert.match(workspace, /Lịch chuyên gia/);
  assert.doesNotMatch(workspace, /Theo hồ sơ chứng nhận|Lập chỉ định đoàn|Sửa dự thảo/);
  assert.match(scheduleSource, /onOpenProject\(record\.project_id, dossierKeyForAuditPlan\(record\)\)/);
});

test("duplicate plan records are excluded from operational dossier and calendar views", () => {
  assert.match(detailSource, /diagnostic\.duplicate_plan_ids/);
  assert.match(detailSource, /candidateIds\.delete\(duplicateId\)/);
  assert.match(detailSource, /!\["cancelled", "canceled"\]\.includes\(normalize\(plan\.status\)\)/);
  assert.match(scheduleSource, /const byBusinessEvent = new Map<string, AuditPlan\[\]>/);
  assert.match(scheduleSource, /plan\.audit_event_id \?\? plan\.id/);
  assert.match(scheduleSource, /appointmentPriority\(right\) - appointmentPriority\(left\)/);
});

test("calendar uses Vietnamese controls, bounded cells, and exact-cycle navigation", () => {
  assert.match(scheduleSource, /vietnameseWeekdayLabels = \["T2", "T3", "T4", "T5", "T6", "T7", "CN"\]/);
  assert.match(scheduleSource, /import viVN from "antd\/locale\/vi_VN"/);
  assert.match(scheduleSource, /<ConfigProvider locale=\{viVN\}>/);
  assert.match(scheduleSource, />Hôm nay<\/Button>/);
  assert.match(scheduleSource, /label: "Tháng"/);
  assert.match(scheduleSource, /label: "Năm"/);
  assert.match(scheduleSource, /const otherPlans = dayPlans\.slice\(1\)/);
  assert.match(scheduleSource, /dayPlans\.slice\(0, 1\)\.map/);
  assert.match(scheduleSource, /\+\{otherPlans\.length\} đợt khác/);
  assert.match(scheduleSource, /onOpenProject\(plan\.project_id, dossierKeyForAuditPlan\(plan\)\)/);
  assert.match(dashboardSource, /initialDossierKey=\{selectedProjectDossierKey\}/);

  const calendarContentRule = styles.match(
    /\.resource-month-calendar \.ant-picker-calendar-date-content\s*\{([^}]*)\}/,
  );
  assert.ok(calendarContentRule, "missing scoped Ant Calendar date-content override");
  assert.match(calendarContentRule[1], /overflow-y:\s*visible/);
  assert.doesNotMatch(calendarContentRule[1], /overflow(?:-y)?:\s*(auto|scroll)/);
});
