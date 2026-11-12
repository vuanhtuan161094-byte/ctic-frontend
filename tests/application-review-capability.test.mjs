import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const reviewScreenUrl = new URL("app/components/CertificationProjectsScreen.tsx", projectRoot);
const projectDetailUrl = new URL("app/components/CertificationProjectDetailScreen.tsx", projectRoot);
const adminPanelUrl = new URL("app/components/CertificationBodyCapabilitiesPanel.tsx", projectRoot);
const customersScreenUrl = new URL("app/components/CustomersScreen.tsx", projectRoot);

test("application review renders ISIC, NACE, IAF and CB capability decisions", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /ISIC[^\n]*isic_code/);
  assert.match(source, /NACE[^\n]*nace_code/);
  assert.match(source, /IAF[^\n]*iaf_code/);
  assert.match(source, /ĐỦ NĂNG LỰC/);
  assert.match(source, /overall_result === "NOT_CAPABLE" \? "KHÔNG ĐỦ"/);
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

test("organization capability check is read-only and runs before review persistence", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  const start = source.indexOf("const checkCertificationBodyCapability = async () => {");
  const end = source.indexOf("const submitApplicationReview =", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const precheck = source.slice(start, end);
  assert.match(precheck, /\/application-reviews\/capability-precheck/);
  assert.match(precheck, /standard_names: values\.standard_names/);
  assert.match(precheck, /industry_scopes: values\.industry_scopes/);
  assert.doesNotMatch(precheck, /ensureApplicationCreated|validateReviewOutcomes|api\.post\("\/application-reviews"/);
});

test("incomplete review draft is durably sent to the API without a default outcome", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  const start = source.indexOf("const saveApplicationReviewDraft = async () => {");
  const end = source.indexOf("async function validateReviewOutcomes()", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const draftSaver = source.slice(start, end);
  assert.match(draftSaver, /if \(hasIncompleteOutcomes\) \{[\s\S]*?localReviewDraftsRef\.current\.set/);
  assert.match(draftSaver, /api\.post<\{ id: string \}>\("\/application-reviews", buildReviewPayload\(application\.id, values, "SAVE_DRAFT"\)\)/);
  assert.match(draftSaver, /bổ sung các kết quả còn thiếu trước khi gửi thẩm xét/);
  assert.doesNotMatch(draftSaver, /if \(hasIncompleteOutcomes\) \{[\s\S]*?return;/);
  const payloadStart = source.indexOf("const buildReviewPayload = (");
  const payloadEnd = source.indexOf("const ensureApplicationCreated =", payloadStart);
  const payload = source.slice(payloadStart, payloadEnd);
  assert.match(payload, /result: values\.review_result/);
  assert.doesNotMatch(payload, /review_result\s*\?\?\s*["']ACCEPTED/);
  assert.match(source, /Có thay đổi chưa lưu/);
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

test("admin capability master supports exact standard edition + multi-IAF, status and effective dates without delete", async () => {
  const source = await readFile(adminPanelUrl, "utf8");
  assert.match(source, /Năng lực tổ chức/);
  assert.match(source, /standard_edition_id/);
  assert.match(source, /iaf_scope_ids/);
  assert.match(source, /mode="multiple"/);
  assert.match(source, /effective_from/);
  assert.match(source, /effective_to/);
  assert.match(source, /ACTIVE/);
  assert.match(source, /INACTIVE/);
  assert.match(source, /ISO 9001:2026/);
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
  assert.match(source, /Mã số thuế \/ mã doanh nghiệp/);
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
  assert.match(source, /title="Năng lực tổ chức chứng nhận"/);
  assert.match(source, /Đối chiếu theo tiêu chuẩn \+ IAF trước khi gửi reviewer/);
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

test("project dossier displays the current one-reviewer relation with historical fallback", async () => {
  const projectDetailSource = await readFile(projectDetailUrl, "utf8");
  assert.match(projectDetailSource, /users\?: \{ full_name\?: string \| null; username\?: string \| null \} \| null/);
  assert.match(projectDetailSource, /label="Reviewer"/);
  assert.match(projectDetailSource, /displayUser\(sourceReview\.users\) \|\| displayUser\(sourceReview\.checker\)/);
});

test("IAF MD11 reduction is system-calculated rather than a manual adjustment", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /tỷ lệ giảm được hệ thống tính tự động/);
  assert.match(source, /integration_reduction_percent: Number\(response\.data\.ims_reduction_percent/);
  assert.doesNotMatch(source, /label: "Giảm do tích hợp IAF MD11"/);
});

test("application entry uses compact progressive disclosure without changing workflow authority", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /application-entry-stack/);
  assert.match(source, /ApplicationEntrySection/);
  assert.match(source, /sectionKey="general"/);
  assert.match(source, /sectionKey="certification"/);
  assert.match(source, /sectionKey="personnel"/);
  assert.match(source, /sectionKey="documents"/);
  assert.match(source, /applicationEntrySectionForField/);
  assert.match(source, /width=\{isApplicationWorkspace \? \(actualCreationStep === 0 \? 980 : 1080\) : 1180\}/);
  assert.match(source, /applicationDialogMode !== "create"/);
  assert.match(source, /Lưu & lập xem xét/);
  assert.match(source, /saveApplicationDraft/);
});


test("focused review sections keep source data secondary and validation-revealable", async () => {
  const source = await readFile(reviewScreenUrl, "utf8");
  assert.match(source, /application-review-workspace/);
  assert.match(source, /application-review-context/);
  assert.match(source, /application-source-collapse/);
  assert.doesNotMatch(source, /defaultActiveKey=\{\["application-summary"\]\}/);
  assert.match(source, /sectionKey="criteria"/);
  assert.match(source, /sectionKey="scope"/);
  assert.match(source, /sectionKey="manday"/);
  assert.match(source, /sectionKey="conclusion"/);
  assert.match(source, /applicationReviewSectionForField/);
  assert.match(source, /application-workflow-collapse/);
});
