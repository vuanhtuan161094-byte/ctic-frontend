import type { AuditDocumentPreview } from "../AuditDocumentCenterModal";
import type { ExecutionWorkspace } from "../AuditExecutionWorkspaceModal";
import { DEV_CERTIFICATION_CASE_WORKSPACE } from "../certification-case/dev-certification-case-fixture";

export const DEV_AUDIT_ID = "dev-plan-001";

export const DEV_CERTIFICATION_AUDIT_CASE_WORKSPACE = {
  ...DEV_CERTIFICATION_CASE_WORKSPACE,
  allowed_actions: [{
    code: "audit.execute",
    label: "Tiếp tục báo cáo đánh giá",
    work_item_id: "dev-work-audit-001",
    due_at: "2026-09-17T17:00:00+07:00",
    destination: {
      route_name: "certification_case.audit",
      params: { id: "dev-case-001" },
      query: { audit_plan_id: DEV_AUDIT_ID, workspace: "audit-execution" },
      legacy_path: "/projects/dev-case-001?workspace=audit-execution&audit_plan_id=dev-plan-001",
      contract_version: "2.0" as const,
    },
  }],
};

export const DEV_AUDIT_EXECUTION_WORKSPACE: ExecutionWorkspace = {
  plan: {
    id: DEV_AUDIT_ID,
    project_id: "dev-case-001",
    plan_code: "KHĐG-MAU-2026-0042-GĐ2",
    audit_type: "initial_stage2",
    planned_start_date: "2026-09-14T08:00:00+07:00",
    planned_end_date: "2026-09-17T17:00:00+07:00",
    location: "Trụ sở và nhà máy chính · Khu công nghiệp mẫu",
    audit_scope: "Thiết kế, sản xuất, lắp đặt và bảo trì hệ thống xử lý nước công nghiệp.",
    audit_criteria: "ISO 9001:2015 · ISO 14001:2015 · ISO 45001:2018",
    audit_objectives: "Đánh giá mức độ phù hợp và hiệu lực của hệ thống quản lý tích hợp.",
    status: "in_progress",
    stage2_lifecycle_gate: {
      applicable: true,
      allowed: true,
      code: "STAGE1_ACCEPTED",
      message: "Giai đoạn 1 đã được chấp nhận.",
    },
    audit_event: { id: "dev-event-001", planned_mandays: 8.5, actual_mandays: 6.5, status: "in_progress" },
  },
  appointment: {
    id: "dev-team-001",
    appointment_number: "QĐ-MAU-2026-0044",
    status: "issued",
    members: [
      { id: "dev-member-001", team_role: "team_leader", planned_start_date: "2026-09-14T08:00:00+07:00", planned_end_date: "2026-09-17T17:00:00+07:00", planned_mandays: 4, assignment_status: "confirmed", experts: { id: "dev-expert-001", full_name: "Nguyễn Minh An" } },
      { id: "dev-member-002", team_role: "auditor", planned_start_date: "2026-09-14T08:00:00+07:00", planned_end_date: "2026-09-17T17:00:00+07:00", planned_mandays: 3, assignment_status: "confirmed", experts: { id: "dev-expert-002", full_name: "Lê Quốc Bảo" } },
      { id: "dev-member-003", team_role: "technical_expert", planned_start_date: "2026-09-15T08:00:00+07:00", planned_end_date: "2026-09-16T17:00:00+07:00", planned_mandays: 1.5, assignment_status: "pending_confirmation", experts: { id: "dev-expert-003", full_name: "Phạm Thu Hà" } },
    ],
  },
  reports: [{
    id: "dev-report-001",
    report_code: "BCĐG-MAU-2026-0042-GĐ2",
    version_no: 2,
    report_date: "2026-09-17T16:00:00+07:00",
    audit_start_date: "2026-09-14T08:00:00+07:00",
    audit_end_date: "2026-09-17T16:00:00+07:00",
    audit_result: "corrective_action_required",
    conclusion: "Hệ thống được vận hành; cần hoàn tất hành động khắc phục cho các điểm không phù hợp.",
    status: "draft",
  }],
};

export const DEV_AUDIT_READINESS = {
  ready_to_issue: true,
  reasons: [{ code: "MEMBER_CONFIRMATION_PENDING", severity: "WARNING", message: "Một chuyên gia kỹ thuật chưa xác nhận tham gia." }],
};

export const DEV_AUDIT_DOCUMENTS: AuditDocumentPreview = {
  plan: {
    id: DEV_AUDIT_ID,
    plan_code: DEV_AUDIT_EXECUTION_WORKSPACE.plan.plan_code,
    audit_type: DEV_AUDIT_EXECUTION_WORKSPACE.plan.audit_type,
    planned_start_date: DEV_AUDIT_EXECUTION_WORKSPACE.plan.planned_start_date,
    planned_end_date: DEV_AUDIT_EXECUTION_WORKSPACE.plan.planned_end_date,
  },
  supplemental_data: {
    audit_language: "vi",
    issue_date: "2026-09-08",
    schedule_rows: [],
    opening_date: "2026-09-14",
    opening_time: "08:00",
    closing_date: "2026-09-17",
    closing_time: "16:00",
    attendance_rows: [],
    checklists: [],
  },
  documents: [
    {
      document_type: "audit_plan_f05",
      stored_document_type: "audit_plan",
      form_code: "F.05",
      label: "Kế hoạch đánh giá",
      entity_type: "audit_plan",
      entity_id: DEV_AUDIT_ID,
      card_key: "audit-plan",
      missing_fields: [],
      can_generate: true,
      history: [{ id: "dev-file-001", original_name: "F05_Ke_hoach_danh_gia_v2.pdf", file_kind: "official", version_no: 2, is_current: true, created_at: "2026-09-08T09:00:00+07:00", download_url: "#" }],
    },
    {
      document_type: "audit_checklist_f06",
      stored_document_type: "audit_checklist",
      form_code: "F.06",
      label: "Phiếu ghi chép đánh giá",
      entity_type: "audit_plan",
      entity_id: DEV_AUDIT_ID,
      card_key: "audit-checklist",
      missing_fields: ["checklist_rows"],
      can_generate: false,
      history: [],
    },
  ],
};
