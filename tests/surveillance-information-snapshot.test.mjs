import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const projectDetailUrl = new URL("app/components/CertificationProjectDetailScreen.tsx", projectRoot);
const modalUrl = new URL("app/components/SurveillanceInformationSnapshotModal.tsx", projectRoot);
const dashboardUrl = new URL("app/components/DashboardShell.tsx", projectRoot);
const scheduleUrl = new URL("app/components/ScheduleResourcesScreen.tsx", projectRoot);
const stylesUrl = new URL("app/globals.css", projectRoot);

test("surveillance dossier contains a dedicated information-update entry point", async () => {
  const source = await readFile(projectDetailUrl, "utf8");
  assert.match(source, /surveillance_information_update/);
  assert.match(source, /SurveillanceInformationSnapshotModal/);
  assert.match(source, /Đã xác nhận/);
  assert.match(source, /"Cập nhật"/);
});

test("surveillance snapshot UI preserves history and defaults to keeping the existing MD", async () => {
  const source = await readFile(modalUrl, "utf8");
  assert.match(source, /hồ sơ lịch sử và không được sửa đè/);
  assert.match(source, /KEEP_CURRENT/);
  assert.match(source, /Giữ MD hiện tại/);
  assert.match(source, /RECALCULATED/);
  assert.match(source, /Tính lại bằng cơ chế ngày công hiện hành/);
  assert.doesNotMatch(source, /name="effective_mandays"/);
  assert.match(source, /Tạo bản cập nhật mới/);
  assert.match(source, /\/revision/);
  assert.match(source, /\/review-change/);
  assert.match(source, /Chỉ cập nhật những nội dung thay đổi/);
});

test("surveillance snapshot distinguishes administrative, certification and MD-relevant changes", async () => {
  const source = await readFile(modalUrl, "utf8");
  assert.match(source, /Liên quan chứng nhận/);
  assert.match(source, /Có thể ảnh hưởng MD/);
  assert.match(source, /Không tự động tăng\/giảm MD/);
  assert.match(source, /Cần rà soát lại phân loại ngành và năng lực tổ chức/);
});

test("cycle tabs are canonical and surveillance uses its own six workflow labels", async () => {
  const source = await readFile(projectDetailUrl, "utf8");
  assert.match(source, /normalizeCycleDossiers/);
  for (const label of [
    "Hồ sơ chứng nhận lần đầu",
    "Hồ sơ giám sát lần 1",
    "Hồ sơ giám sát lần 2",
    "Hồ sơ tái chứng nhận",
  ]) assert.match(source, new RegExp(label));

  const surveillanceStages = source.slice(
    source.indexOf("const surveillanceWorkflowStageDefinitions"),
    source.indexOf("type WorkflowStageDefinition"),
  );
  for (const label of [
    "Tiếp nhận & cập nhật",
    "Chuẩn bị & chỉ định đoàn",
    "Kế hoạch & đánh giá",
    "Thẩm xét kỹ thuật",
    "Quyết định & thông báo",
    "Phát hành & lưu hồ sơ",
  ]) assert.match(surveillanceStages, new RegExp(label.replace("&", "\\&")));
  assert.doesNotMatch(surveillanceStages, /Giai đoạn 1|Giai đoạn 2/);
});

test("appointment CTA routes directly to the exact surveillance PLAN/F.04 workflow", async () => {
  const [detail, dashboard, schedule] = await Promise.all([
    readFile(projectDetailUrl, "utf8"),
    readFile(dashboardUrl, "utf8"),
    readFile(scheduleUrl, "utf8"),
  ]);
  assert.match(detail, /await openDossierItem\(item\)/);
  assert.match(detail, /setCoordinationTarget\(`appointment:\$\{plan\.id\}`\)/);
  assert.match(detail, /appointmentEditorOnly/);
  assert.match(detail, /initialPlanId=\{coordinationTarget\}/);
  assert.match(dashboard, /initialDossierKey=\{selectedProjectDossierKey\}/);
  assert.match(schedule, /requestedAppointmentPlanId/);
  assert.match(schedule, /planSelectionContext/);
  assert.match(schedule, /projectContextQuery\.data\?\.id \?\? requestedPlanId/);
  assert.match(schedule, /openAppointmentForm\(\)/);
  assert.match(schedule, /open=\{!appointmentEditorOnly && Boolean\(selectedPlan\)\}/);
});

test("month calendar is Vietnamese, compact and has no per-cell scrollbar", async () => {
  const [schedule, styles] = await Promise.all([
    readFile(scheduleUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);
  assert.match(schedule, /import viVN from "antd\/locale\/vi_VN"/);
  assert.match(schedule, /<ConfigProvider locale=\{viVN\}>/);
  assert.match(schedule, /vietnameseWeekdayLabels/);
  assert.match(schedule, /Hôm nay/);
  assert.match(schedule, /label: "Tháng"/);
  assert.match(schedule, /label: "Năm"/);
  assert.match(schedule, /dayPlans\.slice\(0, 3\)/);
  assert.match(schedule, /đợt khác/);
  assert.match(schedule, /labelFromMap\(plan\.audit_type, auditTypeLabels\)/);
  const cellStyles = styles.slice(
    styles.indexOf(".resource-calendar-cell"),
    styles.indexOf(".resource-calendar-event.status-in_progress"),
  );
  assert.match(cellStyles, /overflow: hidden/);
  assert.doesNotMatch(cellStyles, /overflow(?:-y)?:\s*(?:auto|scroll)/);
});
