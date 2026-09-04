import type { CertificationCaseRecord, CertificationCaseWorkspaceData } from "./types";

const mockCustomer = {
  id: "dev-customer-001",
  customer_code: "KH-MAU-0248",
  company_name: "Công ty Cổ phần Giải pháp Công nghiệp Xanh và Chuỗi Cung ứng Miền Đông Nam Bộ",
};

const mockApplication = {
  id: "dev-application-001",
  application_code: "DK-MAU-2026-0187",
  standard_name: "ISO 9001:2015 · ISO 14001:2015 · ISO 45001:2018",
  certification_scope: "Thiết kế, sản xuất, lắp đặt, vận hành và bảo trì hệ thống xử lý nước công nghiệp, thiết bị tiết kiệm năng lượng và giải pháp quản lý chuỗi cung ứng tại nhiều địa điểm trên toàn quốc.",
  certification_type: "Chứng nhận tích hợp đa tiêu chuẩn",
  status: "approved",
  site_count: 3,
  requested_audit_date: "2026-09-14T08:00:00+07:00",
  customers: mockCustomer,
  sites: [
    { id: "dev-site-001", site_no: 1, site_name: "Trụ sở và nhà máy chính", address: "Khu công nghiệp mẫu, Việt Nam", is_headquarters: true },
    { id: "dev-site-002", site_no: 2, site_name: "Trung tâm dịch vụ miền Trung", address: "Khu công nghiệp mẫu miền Trung, Việt Nam" },
    { id: "dev-site-003", site_no: 3, site_name: "Kho vận miền Nam", address: "Khu logistics mẫu, Việt Nam" },
  ],
  application_reviews: [{
    id: "dev-review-001",
    workflow_status: "approved",
    review_date: "2026-08-18T10:00:00+07:00",
    created_at: "2026-08-15T09:30:00+07:00",
    prepared_by: { full_name: "Nguyễn Minh An", username: "minh.an" },
    workflow_actions: [
      { id: "dev-action-003", action: "approve", from_status: "submitted", to_status: "approved", comment: "Đã xác nhận phạm vi và các địa điểm thuộc chương trình đánh giá.", created_at: "2026-08-18T10:00:00+07:00", actor: { full_name: "Trần Hải Yến" } },
      { id: "dev-action-002", action: "submit", from_status: "draft", to_status: "submitted", comment: "Chuyển hồ sơ sang thẩm xét độc lập.", created_at: "2026-08-16T14:20:00+07:00", actor: { full_name: "Nguyễn Minh An" } },
      { id: "dev-action-001", action: "assign", from_status: "new", to_status: "draft", created_at: "2026-08-15T09:30:00+07:00", actor: { full_name: "Lê Quốc Bảo" } },
    ],
  }],
};

const baseCase: CertificationCaseRecord = {
  id: "dev-case-001",
  application_id: mockApplication.id,
  project_code: "HS-MAU-2026-0042",
  standard_name: mockApplication.standard_name,
  status: "decision_deferred",
  created_at: "2026-08-19T08:45:00+07:00",
  updated_at: "2026-09-03T16:10:00+07:00",
  certification_applications: mockApplication,
  contracts: { id: "dev-contract-001", contract_number: "HD-MAU-2026-0091", sign_date: "2026-08-22T09:00:00+07:00" },
};

export const DEV_CERTIFICATION_CASE_RECORDS: CertificationCaseRecord[] = [
  baseCase,
  {
    ...baseCase,
    id: "dev-case-002",
    project_code: "HS-MAU-2026-0041",
    standard_name: "ISO 22000:2018",
    status: "draft",
    certification_applications: {
      ...mockApplication,
      id: "dev-application-002",
      application_code: "DK-MAU-2026-0181",
      standard_name: "ISO 22000:2018",
      certification_scope: "Sản xuất và phân phối thực phẩm đóng gói dùng ngay.",
      customers: { id: "dev-customer-002", customer_code: "KH-MAU-0204", company_name: "Công ty TNHH Thực phẩm An Toàn Mẫu" },
    },
  },
  {
    ...baseCase,
    id: "dev-case-003",
    project_code: "HS-MAU-2026-0038",
    standard_name: "ISO/IEC 27001:2022",
    status: "certification_rejected",
    certification_applications: {
      ...mockApplication,
      id: "dev-application-003",
      application_code: "DK-MAU-2026-0164",
      standard_name: "ISO/IEC 27001:2022",
      certification_scope: "Cung cấp dịch vụ hạ tầng và vận hành trung tâm dữ liệu mẫu.",
      customers: { id: "dev-customer-003", customer_code: "KH-MAU-0192", company_name: "Công ty Cổ phần Hạ tầng Số Mẫu" },
    },
  },
  {
    ...baseCase,
    id: "dev-case-004",
    project_code: "HS-MAU-2026-0035",
    standard_name: "ISO 13485:2016",
    status: "certification_approved",
    certification_applications: {
      ...mockApplication,
      id: "dev-application-004",
      application_code: "DK-MAU-2026-0152",
      standard_name: "ISO 13485:2016",
      certification_scope: "Thiết kế và sản xuất thiết bị y tế chẩn đoán mẫu.",
      customers: { id: "dev-customer-004", customer_code: "KH-MAU-0178", company_name: "Công ty TNHH Thiết bị Y tế Chính Xác Mẫu" },
    },
  },
];

export const DEV_CERTIFICATION_CASE_WORKSPACE: CertificationCaseWorkspaceData = {
  project: {
    ...baseCase,
    audit_plans: [{
      id: "dev-plan-001",
      audit_event_id: "dev-event-001",
      plan_code: "KH-MAU-2026-0108",
      audit_type: "Đánh giá chứng nhận giai đoạn 2",
      planned_start_date: "2026-09-14T08:00:00+07:00",
      planned_end_date: "2026-09-17T17:00:00+07:00",
      location: "Ba địa điểm mẫu",
      status: "approved",
      version_no: 2,
      audit_event: { id: "dev-event-001", event_type: "stage_2", sequence_no: 2, planned_mandays: 8.5, status: "planned" },
    }],
  },
  dossier: {
    project: {
      id: baseCase.id,
      project_code: baseCase.project_code,
      status: baseCase.status,
      customer: mockCustomer,
      standard_name: baseCase.standard_name,
      certification_scope: mockApplication.certification_scope,
    },
    summary: { total_items: 11, completed_items: 6, pending_items: 4, completion_percentage: 55, dossier_status: "in_progress" },
    common_items: [
      { item_no: 1, document_key: "certification_application", document_name: "Đơn đăng ký chứng nhận", storage_type: "entity", status: "completed", reference_id: mockApplication.id },
      { item_no: 2, document_key: "application_review", document_name: "Thẩm xét đơn đăng ký", storage_type: "entity", status: "completed", reference_id: "dev-review-001" },
      { item_no: 3, document_key: "commercial_acceptance", document_name: "Chấp thuận thương mại", storage_type: "entity", status: "completed", reference_id: "dev-contract-001" },
    ],
    items: [],
    dossiers: [{
      dossier_key: "initial-certification",
      dossier_type: "initial",
      dossier_label: "Chứng nhận lần đầu",
      dossier_description: "Chu kỳ chứng nhận lần đầu cho hệ thống quản lý tích hợp tại ba địa điểm.",
      sequence_no: 1,
      plan_ids: ["dev-plan-001"],
      plan_codes: ["KH-MAU-2026-0108"],
      planned_start_date: "2026-09-14T08:00:00+07:00",
      planned_end_date: "2026-09-17T17:00:00+07:00",
      planned_mandays: 8.5,
      next_action: {
        code: "TECHNICAL_REVIEW",
        label: "Mở thẩm xét kỹ thuật",
        event_id: "dev-event-001",
        plan_id: "dev-plan-001",
        item_key: "technical_review_report",
        responsible_roles: ["TECHNICAL_REVIEWER"],
        responsible_label: "Chuyên gia thẩm xét kỹ thuật — Trần Hải Yến",
      },
      summary: { total_items: 11, completed_items: 6, pending_items: 4, completion_percentage: 55, dossier_status: "in_progress" },
      items: [
        { item_no: 1, document_key: "audit_program", document_name: "Chương trình đánh giá ba năm", storage_type: "entity", status: "completed", reference_id: "dev-program-001" },
        { item_no: 2, document_key: "audit_team_assignment", document_name: "Bố trí đoàn đánh giá tích hợp", storage_type: "entity", status: "completed", reference_id: "dev-team-001" },
        { item_no: 3, document_key: "stage1_audit_plan", document_name: "Kế hoạch đánh giá giai đoạn 1", storage_type: "entity", status: "completed", reference_id: "dev-plan-stage1" },
        { item_no: 4, document_key: "stage1_audit_report", document_name: "Báo cáo đánh giá giai đoạn 1", storage_type: "entity", status: "completed", reference_id: "dev-report-stage1" },
        { item_no: 5, document_key: "stage2_audit_plan", document_name: "Kế hoạch đánh giá giai đoạn 2", storage_type: "entity", status: "completed", reference_id: "dev-plan-001" },
        { item_no: 6, document_key: "stage2_audit_report", document_name: "Báo cáo đánh giá giai đoạn 2", storage_type: "entity", status: "completed", reference_id: "dev-report-stage2" },
        { item_no: 7, document_key: "nc_cap", document_name: "Hành động khắc phục điểm không phù hợp", storage_type: "entity", status: "not_applicable", reference_id: "dev-cap-001" },
        { item_no: 8, document_key: "technical_review_report", document_name: "Thẩm xét kỹ thuật hồ sơ chứng nhận", storage_type: "entity", status: "pending", reference_id: "dev-tech-review-001" },
        { item_no: 9, document_key: "certification_decision", document_name: "Quyết định chứng nhận", storage_type: "entity", status: "pending", reference_id: "dev-decision-001" },
        { item_no: 10, document_key: "audit_result_notification", document_name: "Thông báo kết quả đánh giá", storage_type: "entity", status: "pending", reference_id: "dev-result-001" },
        { item_no: 11, document_key: "certificate", document_name: "Phát hành chứng chỉ", storage_type: "entity", status: "pending", reference_id: "dev-certificate-001" },
      ],
    }],
    current_dossier_key: "initial-certification",
    source_records: { application: mockApplication },
    files: [
      { id: "dev-file-001", entity_type: "audit_report", entity_id: "dev-report-stage2", document_type: "audit_report", file_kind: "official", original_name: "Bao-cao-danh-gia-giai-doan-2-ban-chinh-thuc.pdf", file_url: null, version_no: 2, is_current: true, uploaded_at: "2026-09-02T15:35:00+07:00" },
      { id: "dev-file-002", entity_type: "audit_plan", entity_id: "dev-plan-001", document_type: "audit_plan", file_kind: "approved", original_name: "Ke-hoach-danh-gia-tich-hop-ba-dia-diem.pdf", file_url: null, version_no: 2, is_current: true, uploaded_at: "2026-08-28T11:00:00+07:00" },
      { id: "dev-file-003", entity_type: "application", entity_id: mockApplication.id, document_type: "customer_evidence", file_kind: "business_registration", original_name: "Ho-so-phap-ly-khach-hang-mau.pdf", file_url: null, version_no: 1, is_current: true, uploaded_at: "2026-08-15T08:10:00+07:00" },
      { id: "dev-file-004", entity_type: "technical_review", entity_id: "dev-tech-review-001", document_type: "technical_review_draft", file_kind: "working", original_name: "Du-thao-bien-ban-tham-xet-ky-thuat.docx", file_url: null, version_no: 1, is_current: true, uploaded_at: "2026-09-03T16:05:00+07:00" },
    ],
  },
  alerts: {
    warning_days: 90,
    generated_at: "2026-09-04T08:00:00+07:00",
    summary: { total: 2, critical: 1, warning: 1, info: 0 },
    alerts: [
      { alert_type: "technical_review_upcoming", severity: "critical", message: "Thẩm xét kỹ thuật đang chờ xác nhận tính độc lập của người thẩm xét.", reference_id: "dev-tech-review-001", due_date: "2026-09-06T17:00:00+07:00" },
      { alert_type: "decision_upcoming", severity: "warning", message: "Mốc dự kiến hoàn tất quyết định chứng nhận còn 5 ngày làm việc.", reference_id: "dev-decision-001", due_date: "2026-09-11T17:00:00+07:00" },
    ],
  },
};
