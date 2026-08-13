import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const reviewScreenUrl = new URL("app/components/CertificationProjectsScreen.tsx", projectRoot);
const adminPanelUrl = new URL("app/components/CertificationBodyCapabilitiesPanel.tsx", projectRoot);
const customersScreenUrl = new URL("app/components/CustomersScreen.tsx", projectRoot);

test("application review renders ISIC, NACE, IAF and CB capability decisions", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /ISIC[^\n]*isic_code/);
  assert.match(source, /NACE[^\n]*nace_code/);
  assert.match(source, /IAF[^\n]*iaf_code/);
  assert.match(source, /ĐỦ NĂNG LỰC/);
  assert.match(source, /KHÔNG ĐỦ NĂNG LỰC/);
  assert.match(source, /CẦN XEM XÉT/);
});

test("one reviewer approves or returns a submitted review and capability blocks approval", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /canReviewWorkflow/);
  assert.match(source, /reviewWorkflowStatus === "SUBMITTED"/);
  assert.match(source, /submitWorkflowAction\("RETURN"\)/);
  assert.match(source, /submitWorkflowAction\("APPROVE"\)/);
  assert.match(source, /capabilityEvaluation\?\.overall_result !== "CAPABLE"/);
  assert.match(source, /Người lập\/coordinator và reviewer phải là hai tài khoản khác nhau/);
  assert.doesNotMatch(source, /PENDING_CHECK|PENDING_APPROVAL|CHECKED|Phê duyệt cấp 2/);
});

test("Application Review UI supports draft, submit and one reviewer assignment", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /submissionAction: "SAVE_DRAFT" \| "SUBMIT"/);
  assert.match(source, /saveApplicationReviewDraft/);
  assert.match(source, /Lưu nháp/);
  assert.match(source, /Gửi reviewer/);
  assert.match(source, /name="reviewer_id"/);
  assert.doesNotMatch(source, /name="checker_user_id"|name="approver_user_id"/);
});

test("proposed experts are required only for IAF MD11 calculation and remain excluded from CB capability", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  const proposedExpertSection = source.slice(
    source.indexOf('name="proposed_auditor_ids"') - 900,
    source.indexOf('name="proposed_auditor_ids"') + 1100,
  );
  assert.match(proposedExpertSection, /dùng để xác định khả năng đánh giá kết hợp theo IAF MD11/i);
  assert.match(proposedExpertSection, /không phải quyết định phân công đoàn chính thức/i);
  assert.match(proposedExpertSection, /required: true/);
});

test("admin capability master supports Program + IAF, status and effective dates without delete", async () => {
  const source = await readFile(adminPanelUrl, "utf8");
  assert.match(source, /Năng lực tổ chức chứng nhận/);
  assert.match(source, /program_code/);
  assert.match(source, /iaf_scope_id/);
  assert.match(source, /effective_from/);
  assert.match(source, /effective_to/);
  assert.match(source, /ACTIVE/);
  assert.match(source, /INACTIVE/);
  assert.doesNotMatch(source, /api\.delete/);
});


test("approved review invalidation is visible and forces an explicit re-review warning", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /INVALIDATE_APPLICATION_CHANGE/);
  assert.match(source, /Bản xem xét cần thực hiện lại/);
  assert.match(source, /Cần xem xét lại/);
});

test("customer UI is country-aware and only applies Vietnam tax-format validation to VN", async () => {
  const source = await readFile(customersScreenUrl, "utf8");
  assert.match(source, /country_code/);
  assert.match(source, /VN · Việt Nam/);
  assert.match(source, /KH · Campuchia/);
  assert.match(source, /ID · Indonesia/);
  assert.match(source, /Tax ID \/ Business ID/);
  assert.match(source, /Mã số thuế Việt Nam phải gồm 10 hoặc 13 chữ số/);
  assert.match(source, /countryCode !== "VN"/);
});

test("contract payload remains minimal and does not duplicate approved man-days", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  const contractPayloadStart = source.indexOf('contract: values.contract_mode === "new"');
  const contractPayloadEnd = source.indexOf("agreement_mode:", contractPayloadStart);
  const contractPayload = source.slice(contractPayloadStart, contractPayloadEnd);
  assert.match(contractPayload, /contract_number/);
  assert.match(contractPayload, /total_value/);
  assert.match(contractPayload, /currency/);
  assert.doesNotMatch(contractPayload, /manday|industry|capability/i);
});

test("UAT polish keeps CB capability separate, supports application file preview and month-only planning", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  const customers = await readFile(customersScreenUrl, "utf8");
  assert.match(source, /Đối chiếu năng lực tổ chức chứng nhận/);
  assert.match(source, /application_supporting_/);
  assert.match(source, /Xem file/);
  assert.match(source, /picker="month"/);
  assert.match(source, /format="MM\/YYYY"/);
  assert.match(source, /Trình tự tính man-day/);
  assert.doesNotMatch(source, /Chuyên gia phù hợp dự kiến để xác nhận nguồn lực/);
  assert.match(customers, /Khác · Nhập tên quốc gia/);
  assert.match(customers, /Tên quốc gia/);
  assert.match(customers, /country_name/);
});


test("UAT workflow labels distinguish submitted, returned and resubmission states", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /Đã gửi reviewer/);
  assert.match(source, /Cần chỉnh sửa xem xét/);
  assert.match(source, /Sửa & gửi lại/);
  assert.match(source, /Gửi lại reviewer/);
  assert.doesNotMatch(source, /under_review: "Đang chỉnh sửa xem xét"/);
});

test("UAT round-trip keeps separate EMS and OH&S risk fields", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /latestReview\?\.ems_complexity/);
  assert.match(source, /latestReview\?\.ohsms_complexity/);
  assert.match(source, /ems_complexity: values\.ems_complexity/);
  assert.match(source, /ohsms_complexity: values\.ohsms_complexity/);
  assert.match(source, /formatMonthPayload/);
});


test("final UAT polish makes status read-only, documents upload-driven and application list time-filterable", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /applicationDialogMode === "status"/);
  assert.match(source, /Trạng thái Application Review — chỉ đọc/);
  assert.match(source, /Lọc theo tháng cập nhật/);
  assert.match(source, /Lọc theo năm cập nhật/);
  assert.match(source, /<Checkbox disabled value=\{documentName\}>/);
  assert.match(source, /uploaded\.original_name/);
  assert.match(source, /\.zip,\.rar/);
});

test("IAF MD11 reduction is system-calculated rather than a manual adjustment", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /tỷ lệ giảm được hệ thống tính tự động/);
  assert.match(source, /integration_reduction_percent: Number\(response\.data\.ims_reduction_percent/);
  assert.doesNotMatch(source, /label: "Giảm do tích hợp IAF MD11"/);
});
