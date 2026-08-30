import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const programUrl = new URL("app/components/AuditProgramPanel.tsx", projectRoot);
const scheduleUrl = new URL("app/components/ScheduleResourcesScreen.tsx", projectRoot);
const projectDetailUrl = new URL("app/components/CertificationProjectDetailScreen.tsx", projectRoot);


test("program workflow opens the exact audit period instead of forcing users to navigate manually", async () => {
  const source = await readFile(programUrl, "utf8");
  assert.match(source, /onOpenAuditPlan\?\.\(createdPlan\.id\)/);
  assert.match(source, /Điều phối GĐ1/);
  assert.match(source, /Chỉ định đoàn/);
  assert.doesNotMatch(source, /stage1\/prepare/);
  assert.match(source, /GĐ1 từ xa: quản lý đầy đủ thành viên \+ MD/);
});


test("Stage 1 allows multiple F04 members and uses soft scheduling warnings", async () => {
  const source = await readFile(scheduleUrl, "utf8");
  assert.match(source, /warning_dates\?: string\[\]/);
  assert.match(source, /warning_assignments\?/);
  assert.match(source, /remoteStage1=\{selectedIsStage1\}/);
  assert.match(source, /Cảnh báo mềm GĐ1/);
  assert.match(source, /Thêm thành viên từ đoàn đã chỉ định/);
  assert.match(source, /Đã chia đều MD GĐ1 theo bước 0,5/);
  assert.match(source, /Lưu & xác nhận điều phối/);
  assert.doesNotMatch(source, /GĐ1 tự động theo Trưởng đoàn đã chỉ định/);
});


test("Stage 1 and Stage 2 inherit F04 roles while surveillance and recertification use a formal event appointment", async () => {
  const source = await readFile(scheduleUrl, "utf8");
  assert.match(source, /selectedInheritsProjectTeam = selectedIsStage1 \|\| selectedIsInitialStage2/);
  assert.match(source, /selectedIsFormalEventAppointment = !selectedIsProjectContext && !selectedInheritsProjectTeam/);
  assert.match(source, /Vai trò thành viên GĐ1\/GĐ2 phải giữ nguyên theo quyết định chỉ định đoàn cấp hồ sơ/);
  assert.match(source, /Chỉ định đoàn theo từng đợt đánh giá/);
});


test("project detail keeps the full dossier and provides direct period navigation", async () => {
  const source = await readFile(projectDetailUrl, "utf8");
  assert.match(source, /documentType: "audit_plan_f05"/);
  assert.match(source, /initialPlanId=\{coordinationTarget\}/);
  assert.match(source, /effectiveNextAction/);
  assert.match(source, /title="Chu kỳ chứng nhận"/);
  assert.match(source, /appointmentEditorOnly/);
  assert.match(source, /Hồ sơ chứng nhận lần đầu/);
  assert.match(source, /surveillance_/);
});


const planWorkspaceUrl = new URL("app/components/AuditPlanWorkspaceDrawer.tsx", projectRoot);

test("plan workspace avoids duplicate report, finding and global document-center entry points", async () => {
  const source = await readFile(planWorkspaceUrl, "utf8");
  assert.match(source, /Một điểm vào cho kế hoạch/);
  assert.match(source, /Không gian thực hiện đánh giá/);
  assert.match(source, /Tiếp tục đánh giá/);
  assert.doesNotMatch(source, />\s*Báo cáo đánh giá\s*</);
  assert.doesNotMatch(source, />\s*Phát hiện\s*</);
  assert.doesNotMatch(source, />\s*Hồ sơ Word\/PDF\s*</);
  assert.doesNotMatch(source, /AuditDocumentCenterModal/);
});


test("dossier chronology separates Stage 1 from Stage 2 and uses professional official-PDF wording", async () => {
  const source = await readFile(projectDetailUrl, "utf8");
  assert.match(source, /title: "Chuẩn bị & Giai đoạn 1"/);
  assert.match(source, /keys: \["audit_team_assignment", "audit_program", "stage1_audit_plan", "stage1_audit_report"\]/);
  assert.match(source, /title: "Giai đoạn 2 & khắc phục"/);
  assert.match(source, /keys: \["stage2_audit_plan", "audit_checklist", "opening_closing_attendance", "stage2_audit_report", "nc_cap", "audit_log"\]/);
  assert.match(source, /Tải lên PDF chính thức/);
  assert.match(source, /PDF chính thức/);
  assert.match(source, /DossierBusinessStatusTag/);
  assert.match(source, /Chưa sinh Word/);
  assert.doesNotMatch(source, /PDF chốt|chốt PDF|đã ký\/chốt/);
});


test("dossier action column keeps one business action and one compact document menu", async () => {
  const source = await readFile(projectDetailUrl, "utf8");
  assert.match(source, /<Dropdown/);
  assert.match(source, /Tài liệu <DownOutlined \/>/);
  assert.match(source, /label: "Tải Word"/);
  assert.match(source, /label: officialPdf \? "Xem PDF chính thức" : "Xem PDF"/);
  assert.match(source, /label: officialPdf \? "Thay PDF chính thức" : "Tải lên PDF chính thức"/);
  assert.doesNotMatch(source, /<Space size=\{4\} wrap style=\{\{ justifyContent: "flex-end" \}\}>/);
});
