"use client";

import {
  ArrowLeftOutlined,
  AuditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DownOutlined,
  FileDoneOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  EyeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MenuProps, TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Input,
  List,
  Modal,
  Progress,
  Skeleton,
  Space,
  Steps,
  Table,
  Tag,
  Tabs,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

import { api, getErrorMessage } from "../lib/api";
import { isPdfDocument, openDocumentFile, previewDocumentFile } from "../lib/document-file-client";
import { invalidatePersonalWorkflowQueries } from "../lib/workspace-query-cache";
import CommercialDocumentsPanel from "./CommercialDocumentsPanel";
import { ResponsiveCardList, type ResponsiveCardItem } from "./design-system";
import type { AuditExecutionWorkspaceMode } from "./AuditExecutionWorkspaceModal";
import type {
  AuditDocumentFocus,
  AuditDocumentPreview,
  AuditDocumentType,
} from "./AuditDocumentCenterModal";

const AuditExecutionWorkspaceModal = lazy(() => import("./AuditExecutionWorkspaceModal"));
const CorrectiveActionWorkspaceModal = lazy(() => import("./CorrectiveActionWorkspaceModal"));
const TechnicalReviewWorkspaceModal = lazy(() => import("./TechnicalReviewWorkspaceModal"));
const CertificationResultWorkspaceModal = lazy(() => import("./CertificationResultWorkspaceModal"));
const CertificateIssuanceWorkspaceModal = lazy(() => import("./CertificateIssuanceWorkspaceModal"));
const AuditDocumentCenterModal = lazy(() => import("./AuditDocumentCenterModal"));
const SurveillanceInformationSnapshotModal = lazy(() => import("./SurveillanceInformationSnapshotModal"));
const ScheduleResourcesScreen = lazy(() =>
  import("./ScheduleResourcesScreen").then((module) => ({ default: module.ScheduleResourcesScreen })),
);

const { Text, Title } = Typography;

interface ProjectCustomer {
  id: string;
  customer_code: string;
  company_name: string;
  tax_code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface ProjectApplication {
  id: string;
  application_code: string;
  certification_type?: string | null;
  certification_scope?: string | null;
  standard_name: string;
  status: string;
  employee_count?: number | null;
  site_count?: number | null;
  requested_audit_date?: string | null;
  requested_stage1_date?: string | null;
  requested_stage2_date?: string | null;
  application_date?: string | null;
  other_certification_type?: string | null;
  company_name_en?: string | null;
  headquarters_address?: string | null;
  representative_name?: string | null;
  representative_position?: string | null;
  representative_phone?: string | null;
  representative_email?: string | null;
  contact_name?: string | null;
  contact_position?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  total_employee_count?: number | null;
  shift_count?: number | null;
  shift1_count?: number | null;
  shift2_count?: number | null;
  shift3_count?: number | null;
  excluded_clauses?: string | null;
  external_provider_used?: boolean | null;
  outsourced_processes?: string | null;
  management_system_details?: string | null;
  associated_documents?: string | null;
  consultant_organization?: string | null;
  consultant_name?: string | null;
  certificate_languages?: string | null;
  other_requests?: string | null;
  customers?: ProjectCustomer | null;
  sites?: Array<{
    id: string;
    site_no: number;
    site_name?: string | null;
    address?: string | null;
    activities?: string | null;
    employee_count?: number | null;
    is_headquarters?: boolean | null;
  }>;
}

interface ProjectContract {
  id: string;
  contract_number: string;
  sign_date: string | null;
}

interface ProjectAgreement {
  id: string;
  agreement_number: string;
  sign_date: string | null;
}

interface ProjectAuditPlan {
  id: string;
  audit_event_id?: string | null;
  plan_code?: string | null;
  audit_type?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  location?: string | null;
  status?: string | null;
  version_no: number;
  audit_event?: {
    id: string;
    event_type?: string | null;
    sequence_no?: number | null;
    planned_mandays?: number | string | null;
    status?: string | null;
  } | null;
}

interface CertificationProjectDetail {
  id: string;
  project_code: string;
  standard_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  certification_applications?: ProjectApplication | null;
  contracts?: ProjectContract | null;
  certification_agreements?: ProjectAgreement | null;
  audit_plans: ProjectAuditPlan[];
  audit_plan_diagnostics?: CanonicalPlanDiagnostic[];
}

interface CanonicalPlanDiagnostic {
  code: "DUPLICATE_OPERATIONAL_AUDIT_PLANS";
  audit_event_id: string;
  canonical_plan_id: string;
  canonical_plan_code?: string | null;
  duplicate_plan_ids: string[];
  duplicate_plan_codes: Array<string | null>;
  message: string;
}

interface DossierItem {
  item_no: number;
  document_key: string;
  document_name: string;
  storage_type: "system_record" | "uploaded_file" | string;
  status: "completed" | "pending" | "not_applicable" | string;
  reference_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  action_event_id?: string | null;
}

interface DossierGroup {
  dossier_key: string;
  dossier_type: string;
  dossier_label: string;
  dossier_description?: string | null;
  sequence_no: number;
  plan_ids: string[];
  plan_codes?: Array<string | null | undefined>;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  planned_mandays?: number | string | null;
  next_action?: {
    code: DossierNextActionCode;
    label: string;
    event_id?: string | null;
    plan_id?: string | null;
    item_key?: string | null;
    responsible_roles?: string[];
    responsible_label?: string | null;
  } | null;
  summary: {
    total_items: number;
    completed_items: number;
    pending_items: number;
    completion_percentage: number;
    dossier_status: string;
  };
  items: DossierItem[];
}

interface DossierFile {
  id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  file_kind: string;
  original_name: string;
  file_url: string | null;
  version_no: number;
  is_current?: boolean;
  uploaded_at: string;
}

interface ApplicationReviewSource {
  id: string;
  result?: string | null;
  workflow_status?: string | null;
  review_date?: string | null;
  audit_field?: string | null;
  iaf_code?: string | null;
  isic_code?: string | null;
  industry_scopes_json?: string | null;
  effective_personnel?: number | null;
  risk_level?: string | null;
  manday_method?: string | null;
  base_mandays?: number | string | null;
  increase_factors?: string | null;
  increase_percent?: number | string | null;
  reduction_factors?: string | null;
  reduction_percent?: number | string | null;
  integration_reduction_percent?: number | string | null;
  final_mandays?: number | string | null;
  stage1_mandays?: number | string | null;
  stage2_mandays?: number | string | null;
  surveillance_mandays?: number | string | null;
  recertification_mandays?: number | string | null;
  conclusion?: string | null;
  client_code?: string | null;
  checked_by_name?: string | null;
  approved_by_name?: string | null;
  checker_comment?: string | null;
  approver_comment?: string | null;
  created_at?: string | null;
  prepared_by?: { full_name?: string | null; username?: string | null } | null;
  users?: { full_name?: string | null; username?: string | null } | null;
  checker?: { full_name?: string | null; username?: string | null } | null;
  approver?: { full_name?: string | null; username?: string | null } | null;
  workflow_actions?: Array<{
    id: string;
    action?: string | null;
    from_status?: string | null;
    to_status?: string | null;
    comment?: string | null;
    created_at?: string | null;
    actor?: { full_name?: string | null; username?: string | null } | null;
  }>;
}

interface ProjectDossier {
  project: {
    id: string;
    project_code: string;
    status: string;
    customer: ProjectCustomer;
    standard_name: string;
    certification_scope?: string | null;
  };
  summary: {
    total_items: number;
    completed_items: number;
    pending_items: number;
    completion_percentage: number;
    dossier_status: string;
  };
  items: DossierItem[];
  common_items?: DossierItem[];
  dossiers?: DossierGroup[];
  current_dossier_key?: string | null;
  source_records?: {
    application?: ProjectApplication | null;
    application_review?: ApplicationReviewSource | null;
  };
  files: DossierFile[];
  diagnostics?: CanonicalPlanDiagnostic[];
}

interface ProjectAlertItem {
  alert_type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  reference_id: string | null;
  due_date: string | null;
}

interface ProjectAlerts {
  warning_days: number;
  generated_at: string;
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  alerts: ProjectAlertItem[];
}

interface CertificationProjectDetailScreenProps {
  projectId: string;
  roles: string[];
  initialDossierKey?: string | null;
  initialWorkspacePath?: string | null;
  onBack: () => void;
}

interface DocumentUploadTarget {
  title: string;
  entityType: string;
  entityId: string;
  documentType: string;
  fileKind: string;
  currentVersion?: number;
  pdfOnly?: boolean;
  officialCopy?: boolean;
}

const documentManageRoles = new Set([
  "admin",
  "staff",
  "sales",
  "coordinator",
  "lead_auditor",
  "auditor",
]);

const projectStatusLabels: Record<string, string> = {
  draft: "Khởi tạo",
  not_started: "Chưa bắt đầu",
  in_progress: "Đang thực hiện",
  pending: "Chờ xử lý",
  pending_technical_review: "Chờ thẩm xét",
  planned: "Đã lập kế hoạch",
  approved: "Đã phê duyệt",
  issued: "Đã phát hành",
  active: "Đang hiệu lực",
  replaced: "Đã thay thế",
  suspended: "Tạm đình chỉ",
  withdrawn: "Đã thu hồi",
  technical_review_completed: "Đã thẩm xét",
  corrective_action_required: "Chờ khắc phục NC",
  conformity: "Phù hợp",
  conformity_after_ca: "Phù hợp sau khắc phục",
  nonconformities_found: "Có điểm không phù hợp",
  response_submitted: "Đã gửi phản hồi",
  ready_for_technical_review: "Sẵn sàng thẩm xét",
  certificate_issued: "Đã cấp chứng chỉ",
  completed: "Hoàn thành",
  closed: "Đã đóng",
  cancelled: "Đã hủy",
};

const auditTypeLabels: Record<string, string> = {
  initial: "Chứng nhận lần đầu",
  stage1: "Đánh giá giai đoạn 1",
  stage2: "Đánh giá giai đoạn 2",
  surveillance: "Đánh giá giám sát",
  surveillance1: "Giám sát lần 1",
  surveillance2: "Giám sát lần 2",
  recertification: "Tái chứng nhận",
};

const documentTypeLabels: Record<string, string> = {
  audit_checklist: "Bảng kiểm đánh giá",
  audit_log: "Xác nhận đánh giá và ngày công",
  business_license: "Giấy phép đăng ký kinh doanh",
  certificate_pdf: "Chứng chỉ PDF",
  opening_closing_attendance: "Danh sách họp khai mạc/kết thúc",
  technical_review_report: "Báo cáo thẩm xét kỹ thuật",
};

function normalize(value?: string | null) {
  return (value ?? "unknown").trim().toLowerCase();
}

function readableStatus(value?: string | null) {
  const normalized = normalize(value);
  return projectStatusLabels[normalized] ?? normalized.replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY") : "—";
}

function readableDocumentType(value?: string | null) {
  const normalized = normalize(value);
  return documentTypeLabels[normalized]
    ?? normalized
      .split("_")
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ");
}

function parseStructuredList(value?: string | null): Array<Record<string, unknown>> {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
    }
    return parsed && typeof parsed === "object" ? [parsed as Record<string, unknown>] : [];
  } catch {
    return [];
  }
}

function displayUser(value?: { full_name?: string | null; username?: string | null } | null) {
  return value?.full_name || value?.username || "—";
}

function ProjectStatusTag({ status }: { status?: string | null }) {
  const normalized = normalize(status);
  const color = normalized === "certificate_issued"
    ? "blue"
    : ["completed", "closed", "technical_review_completed"].includes(normalized)
      ? "green"
      : normalized === "corrective_action_required"
        ? "orange"
        : normalized === "cancelled"
          ? "red"
          : "processing";

  return <Tag color={color}>{readableStatus(status)}</Tag>;
}

function dossierBusinessStatus(item: DossierItem) {
  const status = normalize(item.status);
  const key = normalize(item.document_key);
  if (status === "not_applicable") return "Không áp dụng";
  if (status === "pending") return "Chờ thực hiện";
  if (status === "in_progress") return "Đang thực hiện";
  if (status !== "completed") return readableStatus(status);
  if (["audit_team_assignment", "surveillance_information_update"].includes(key)) {
    return "Đã xác nhận";
  }
  if (["audit_program", "stage1_audit_plan", "stage2_audit_plan", "audit_plan"].includes(key)) {
    return "Đã lập";
  }
  return "Hoàn thành";
}

function DossierBusinessStatusTag({ item }: { item: DossierItem }) {
  const status = normalize(item.status);
  const color = status === "completed"
    ? "green"
    : status === "not_applicable"
      ? "default"
      : status === "in_progress"
        ? "blue"
        : "orange";
  return <Tag color={color}>{dossierBusinessStatus(item)}</Tag>;
}

function cleanDocumentName(item: DossierItem) {
  if (item.document_key === "audit_log") return "Xác nhận đánh giá và ngày công";
  return item.document_name;
}

const dossierAuditDocumentDefinitions: Record<string, {
  documentType: AuditDocumentType;
  formCode: string;
  title: string;
}> = {
  audit_team_assignment: { documentType: "audit_team_assignment_f04", formCode: "F.04", title: "Chỉ định đoàn đánh giá" },
  audit_program: { documentType: "audit_program_f03", formCode: "F.03", title: "Chương trình đánh giá" },
  stage1_audit_plan: { documentType: "audit_plan_f05", formCode: "F.05", title: "Kế hoạch đánh giá Giai đoạn 1" },
  stage2_audit_plan: { documentType: "audit_plan_f05", formCode: "F.05", title: "Kế hoạch đánh giá Giai đoạn 2" },
  audit_plan: { documentType: "audit_plan_f05", formCode: "F.05", title: "Kế hoạch đánh giá" },
  audit_checklist: { documentType: "audit_checklist_f06", formCode: "F.06", title: "Bảng kiểm đánh giá" },
  opening_closing_attendance: { documentType: "audit_attendance_f07", formCode: "F.07", title: "Danh sách họp khai mạc/kết thúc" },
  audit_log: { documentType: "audit_log_f15", formCode: "F.15", title: "Xác nhận đánh giá và ngày công" },
  audit_monitoring: { documentType: "audit_monitoring_f17", formCode: "F.17", title: "Theo dõi quá trình đánh giá" },
  nc_cap: { documentType: "corrective_action_request_f10", formCode: "F.10", title: "Phiếu yêu cầu hành động khắc phục" },
  technical_review_report: { documentType: "technical_review_report_f11", formCode: "F.11", title: "Báo cáo thẩm xét kỹ thuật" },
};

function dossierAuditDocumentDefinition(documentKey?: string | null) {
  return dossierAuditDocumentDefinitions[normalize(documentKey)] ?? null;
}

function dossierFormCode(documentKey?: string | null) {
  const normalized = normalize(documentKey);
  if (normalized === "stage1_audit_report") return "F.09-01";
  if (["stage2_audit_report", "audit_report"].includes(normalized)) return "F.09-02";
  return dossierAuditDocumentDefinition(documentKey)?.formCode ?? null;
}

function normalizedAuditPlanType(plan?: ProjectAuditPlan | null) {
  return normalize(plan?.audit_type).replace(/[^a-z0-9]/g, "");
}

const initialWorkflowStageDefinitions = [
  {
    title: "Tiếp nhận hồ sơ",
    keys: ["certification_application", "application_review", "business_license", "surveillance_information_update"],
  },
  {
    title: "Chuẩn bị & Giai đoạn 1",
    keys: ["audit_team_assignment", "audit_program", "stage1_audit_plan", "stage1_audit_report"],
  },
  {
    title: "Giai đoạn 2 & khắc phục",
    keys: ["stage2_audit_plan", "audit_checklist", "opening_closing_attendance", "stage2_audit_report", "nc_cap", "audit_log"],
  },
  {
    title: "Thẩm xét kỹ thuật",
    keys: ["technical_review_report"],
  },
  {
    title: "Quyết định & thông báo",
    keys: ["certification_decision", "audit_result_notification"],
  },
  {
    title: "Phát hành & lưu hồ sơ",
    keys: ["certificate", "audit_monitoring"],
  },
] as const;

const surveillanceWorkflowStageDefinitions = [
  {
    title: "Tiếp nhận & cập nhật",
    keys: ["surveillance_information_update"],
  },
  {
    title: "Chuẩn bị & chỉ định đoàn",
    keys: ["audit_team_assignment"],
  },
  {
    title: "Kế hoạch & đánh giá",
    keys: ["audit_plan", "audit_checklist", "opening_closing_attendance", "audit_report", "nc_cap", "audit_log"],
  },
  {
    title: "Thẩm xét kỹ thuật",
    keys: ["technical_review_report"],
  },
  {
    title: "Quyết định & thông báo",
    keys: ["certification_decision", "audit_result_notification"],
  },
  {
    title: "Phát hành & lưu hồ sơ",
    keys: ["certificate"],
  },
] as const;

type WorkflowStageDefinition = {
  readonly title: string;
  readonly keys: readonly string[];
};

function buildWorkflowStages(items: DossierItem[], definitions: readonly WorkflowStageDefinition[]) {
  const stages = definitions.map((definition) => {
    const stageItems = items.filter((item) => definition.keys.some((key) => key === item.document_key));
    const satisfiedItems = stageItems.filter((item) => ["completed", "not_applicable"].includes(normalize(item.status)));
    const isComplete = stageItems.length > 0 && satisfiedItems.length === stageItems.length;

    return {
      title: definition.title,
      completed: satisfiedItems.length,
      total: stageItems.length,
      isComplete,
    };
  });

  const currentIndex = stages.findIndex((stage) => !stage.isComplete);

  return stages.map((stage, index) => ({
    title: stage.title,
    description: `${stage.completed}/${stage.total} thành phần`,
    status: stage.isComplete
      ? "finish" as const
      : index === (currentIndex === -1 ? stages.length - 1 : currentIndex)
        ? "process" as const
        : "wait" as const,
  }));
}

function dossierCycleIdentity(group: DossierGroup) {
  const value = `${group.dossier_key} ${group.dossier_type}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (value.includes("recert")) return "recertification";
  if (value.includes("surveillance2") || value.includes("surveillanceyear2")) return "surveillance_2";
  if (value.includes("surveillance1") || value.includes("surveillanceyear1")) return "surveillance_1";
  if (value.includes("initial")) return "initial_certification";
  return null;
}

function normalizeCycleDossiers(
  groups: DossierGroup[],
  plans: ProjectAuditPlan[],
  diagnostics: CanonicalPlanDiagnostic[],
) {
  const canonical = [
    { key: "initial_certification", type: "initial", label: "Hồ sơ chứng nhận lần đầu" },
    { key: "surveillance_1", type: "surveillance1", label: "Hồ sơ giám sát lần 1" },
    { key: "surveillance_2", type: "surveillance2", label: "Hồ sơ giám sát lần 2" },
    { key: "recertification", type: "recertification", label: "Hồ sơ tái chứng nhận" },
  ] as const;

  return canonical.flatMap((cycle, index) => {
    const matches = groups.filter((group) => dossierCycleIdentity(group) === cycle.key);
    if (!matches.length) return [];
    const preferred = matches.find((group) => group.dossier_key === cycle.key) ?? matches[0];
    const candidateIds = new Set(matches.flatMap((group) => group.plan_ids ?? []));
    for (const diagnostic of diagnostics) {
      if (diagnostic.duplicate_plan_ids.some((id) => candidateIds.has(id))) {
        candidateIds.add(diagnostic.canonical_plan_id);
      }
      for (const duplicateId of diagnostic.duplicate_plan_ids) candidateIds.delete(duplicateId);
    }
    const canonicalPlans = plans.filter((plan) => (
      candidateIds.has(plan.id)
      && !["cancelled", "canceled"].includes(normalize(plan.status))
    ));
    return [{
      ...preferred,
      dossier_key: cycle.key,
      dossier_type: cycle.type,
      dossier_label: cycle.label,
      sequence_no: index + 1,
      plan_ids: canonicalPlans.map((plan) => plan.id),
      plan_codes: canonicalPlans.map((plan) => plan.plan_code).filter(Boolean),
    }];
  });
}

type DossierNextActionCode =
  | "UPDATE_INFORMATION"
  | "REVIEW_CHANGE"
  | "APPOINT_TEAM"
  | "PLAN_AUDIT"
  | "EXECUTE_AUDIT"
  | "COMPLETE_NC_CAP"
  | "TECHNICAL_REVIEW"
  | "MAKE_DECISION"
  | "NOTIFY_RESULT"
  | "ISSUE_CERTIFICATE";

interface EffectiveNextAction {
  code: DossierNextActionCode;
  label: string;
  itemKey: string;
  responsibleRoles: string[];
  responsibleLabel: string;
}

const nextActionDefinitions: Record<DossierNextActionCode, Omit<EffectiveNextAction, "code">> = {
  UPDATE_INFORMATION: { label: "Cập nhật thông tin", itemKey: "surveillance_information_update", responsibleRoles: ["admin", "staff", "coordinator"], responsibleLabel: "Điều phối viên" },
  REVIEW_CHANGE: { label: "Xem xét thay đổi", itemKey: "surveillance_information_update", responsibleRoles: ["admin", "staff", "coordinator"], responsibleLabel: "Điều phối viên" },
  APPOINT_TEAM: { label: "Chỉ định đoàn đánh giá", itemKey: "audit_team_assignment", responsibleRoles: ["admin", "coordinator"], responsibleLabel: "Điều phối viên" },
  PLAN_AUDIT: { label: "Lập kế hoạch", itemKey: "audit_plan", responsibleRoles: ["admin", "lead_auditor"], responsibleLabel: "Trưởng đoàn đánh giá" },
  EXECUTE_AUDIT: { label: "Thực hiện đánh giá", itemKey: "audit_report", responsibleRoles: ["admin", "lead_auditor", "auditor"], responsibleLabel: "Đoàn đánh giá" },
  COMPLETE_NC_CAP: { label: "Hoàn thiện NC/CAP", itemKey: "nc_cap", responsibleRoles: ["admin", "lead_auditor", "auditor"], responsibleLabel: "Trưởng đoàn đánh giá" },
  TECHNICAL_REVIEW: { label: "Thẩm xét kỹ thuật", itemKey: "technical_review_report", responsibleRoles: ["technical_reviewer"], responsibleLabel: "Chuyên gia thẩm xét kỹ thuật" },
  MAKE_DECISION: { label: "Ra quyết định", itemKey: "certification_decision", responsibleRoles: ["decision_maker"], responsibleLabel: "Người ra quyết định chứng nhận" },
  NOTIFY_RESULT: { label: "Thông báo kết quả", itemKey: "audit_result_notification", responsibleRoles: ["admin", "decision_maker"], responsibleLabel: "Bộ phận thông báo kết quả" },
  ISSUE_CERTIFICATE: { label: "Phát hành chứng chỉ", itemKey: "certificate", responsibleRoles: ["decision_maker"], responsibleLabel: "Người ra quyết định chứng nhận" },
};

function findPendingItem(group: DossierGroup, keys: string[]) {
  return group.items.find((item) => (
    keys.includes(normalize(item.document_key))
    && !["completed", "not_applicable"].includes(normalize(item.status))
  ));
}

function effectiveNextAction(group: DossierGroup): EffectiveNextAction | null {
  if (group.next_action) {
    const definition = nextActionDefinitions[group.next_action.code];
    return {
      code: group.next_action.code,
      label: group.next_action.label || definition.label,
      itemKey: group.next_action.item_key || definition.itemKey,
      responsibleRoles: group.next_action.responsible_roles ?? definition.responsibleRoles,
      responsibleLabel: group.next_action.responsible_label ?? definition.responsibleLabel,
    };
  }

  const ordered: Array<[DossierNextActionCode, string[]]> = [
    ["UPDATE_INFORMATION", ["surveillance_information_update"]],
    ["APPOINT_TEAM", ["audit_team_assignment"]],
    ["PLAN_AUDIT", ["stage1_audit_plan", "stage2_audit_plan", "audit_plan"]],
    ["EXECUTE_AUDIT", ["audit_checklist", "opening_closing_attendance", "stage1_audit_report", "stage2_audit_report", "audit_report", "audit_log"]],
    ["COMPLETE_NC_CAP", ["nc_cap"]],
    ["TECHNICAL_REVIEW", ["technical_review_report"]],
    ["MAKE_DECISION", ["certification_decision"]],
    ["NOTIFY_RESULT", ["audit_result_notification"]],
    ["ISSUE_CERTIFICATE", ["certificate"]],
  ];
  for (const [code, keys] of ordered) {
    const item = findPendingItem(group, keys);
    if (!item) continue;
    const definition = nextActionDefinitions[code];
    return { ...definition, code, itemKey: normalize(item.document_key) };
  }
  return null;
}


function legacyDossierGroups(items: DossierItem[], plans: ProjectAuditPlan[]): DossierGroup[] {
  const auditItems = items.filter((item) => item.item_no >= 4);
  const initialPlanIds = plans
    .filter((plan) => ["stage1", "stage_1", "initial_stage1", "stage2", "stage_2", "initial_stage2", "initial"].includes(normalize(plan.audit_type)))
    .map((plan) => plan.id);
  const surveillancePlans = plans.filter((plan) => normalize(plan.audit_type).includes("surveillance"));

  const makeSummary = (groupItems: DossierItem[]) => {
    const satisfied = groupItems.filter((item) => ["completed", "not_applicable"].includes(normalize(item.status)));
    const pending = groupItems.filter((item) => normalize(item.status) === "pending");
    return {
      total_items: groupItems.length,
      completed_items: satisfied.length,
      pending_items: pending.length,
      completion_percentage: groupItems.length ? Math.round((satisfied.length / groupItems.length) * 100) : 0,
      dossier_status: satisfied.length === groupItems.length && groupItems.length
        ? "completed"
        : satisfied.length ? "in_progress" : "not_started",
    };
  };

  const initialItems = auditItems.length ? auditItems : [];
  const surveillanceTemplate = (label: string): DossierItem[] => [
    { item_no: 1, document_key: "audit_team_assignment", document_name: "Chỉ định đoàn đánh giá", storage_type: "system_record", status: "pending" },
    { item_no: 2, document_key: "audit_plan", document_name: `Kế hoạch ${label.toLowerCase()}`, storage_type: "system_record", status: "pending" },
    { item_no: 3, document_key: "audit_checklist", document_name: "Bảng kiểm đánh giá", storage_type: "uploaded_file", status: "pending" },
    { item_no: 4, document_key: "opening_closing_attendance", document_name: "Danh sách họp khai mạc/kết thúc", storage_type: "uploaded_file", status: "pending" },
    { item_no: 5, document_key: "audit_report", document_name: "Báo cáo đánh giá", storage_type: "system_record", status: "pending" },
    { item_no: 6, document_key: "nc_cap", document_name: "Phiếu yêu cầu hành động khắc phục", storage_type: "system_record", status: "not_applicable" },
  ];

  const groups: DossierGroup[] = [
    {
      dossier_key: "initial_certification",
      dossier_type: "initial",
      dossier_label: "Hồ sơ chứng nhận lần đầu",
      dossier_description: "Đánh giá giai đoạn 1, giai đoạn 2 và quyết định chứng nhận lần đầu.",
      sequence_no: 1,
      plan_ids: initialPlanIds,
      summary: makeSummary(initialItems),
      items: initialItems,
    },
    ...[1, 2].map((number) => {
      const plan = surveillancePlans[number - 1];
      const label = `Hồ sơ giám sát lần ${number}`;
      const groupItems = surveillanceTemplate(label).map((item) => item.document_key === "audit_plan" && plan
        ? { ...item, status: "completed", reference_id: plan.id }
        : item);
      return {
        dossier_key: `surveillance_${number}`,
        dossier_type: `surveillance${number}`,
        dossier_label: label,
        dossier_description: `Đánh giá giám sát năm thứ ${number}; không áp dụng giai đoạn 1.`,
        sequence_no: number + 1,
        plan_ids: plan ? [plan.id] : [],
        planned_start_date: plan?.planned_start_date,
        summary: makeSummary(groupItems),
        items: groupItems,
      };
    }),
  ];

  return groups;
}

function dossierStatusTag(group: DossierGroup) {
  const normalized = normalize(group.summary.dossier_status);
  if (normalized === "completed") return <Tag color="green">Hoàn thành</Tag>;
  if (normalized === "in_progress") return <Tag color="blue">Đang thực hiện</Tag>;
  return <Tag>Chưa bắt đầu</Tag>;
}

export function CertificationProjectDetailScreen({
  projectId,
  roles,
  initialDossierKey,
  initialWorkspacePath,
  onBack,
}: CertificationProjectDetailScreenProps) {
  const dossierSelectionContext = `${projectId}:${initialDossierKey ?? ""}`;
  const [dossierSelection, setDossierSelection] = useState<{
    context: string;
    dossierKey: string | null;
  } | null>(null);
  const selectedDossierKey = dossierSelection?.context === dossierSelectionContext
    ? dossierSelection.dossierKey
    : initialDossierKey ?? null;
  const setSelectedDossierKey = (dossierKey: string | null) => {
    setDossierSelection({ context: dossierSelectionContext, dossierKey });
  };
  const [coordinationTarget, setCoordinationTarget] = useState<string | null>(null);
  const [focusedExecutionWorkspace, setFocusedExecutionWorkspace] = useState<{
    planId: string;
    mode: AuditExecutionWorkspaceMode;
  } | null>(null);
  const [auditDocumentWorkspace, setAuditDocumentWorkspace] = useState<{
    planId: string;
    focus: AuditDocumentFocus;
  } | null>(null);
  const [correctiveActionWorkspacePlanId, setCorrectiveActionWorkspacePlanId] = useState<string | null>(null);
  const [correctiveActionFindingId, setCorrectiveActionFindingId] = useState<string | null>(null);
  const [technicalReviewWorkspacePlanId, setTechnicalReviewWorkspacePlanId] = useState<string | null>(null);
  const [surveillanceInformationEventId, setSurveillanceInformationEventId] = useState<string | null>(null);
  const [certificationResultWorkspace, setCertificationResultWorkspace] = useState<{
    planId: string;
    focus: "overview" | "decision" | "notification";
    preferredDecisionType?: "SUSPEND" | "RESTORE" | "WITHDRAW";
  } | null>(null);
  const [certificateIssuancePlanId, setCertificateIssuancePlanId] = useState<string | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);
  const [documentActionMessage, setDocumentActionMessage] = useState<string | null>(null);
  const [sourceRecordKey, setSourceRecordKey] = useState<"certification_application" | "application_review" | null>(null);
  const [sourceRecordTab, setSourceRecordTab] = useState<"system" | "scan">("system");
  const [uploadTarget, setUploadTarget] = useState<DocumentUploadTarget | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const handledInitialWorkspaceRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const canManageDocuments = roles.some((role) => documentManageRoles.has(normalize(role)));
  const canManageSurveillanceInformation = roles.some((role) => ["admin", "staff", "coordinator"].includes(normalize(role)));
  const detailQuery = useQuery({
    queryKey: ["certification-project", projectId, "workspace"],
    queryFn: async () => {
      const [projectResponse, dossierResponse, alertsResponse] = await Promise.all([
        api.get<CertificationProjectDetail>(`/certification-projects/${projectId}`),
        api.get<ProjectDossier>(`/certification-projects/${projectId}/dossier`),
        api.get<ProjectAlerts>(`/certification-projects/${projectId}/alerts?warning_days=90`),
      ]);

      return {
        project: projectResponse.data,
        dossier: dossierResponse.data,
        alerts: alertsResponse.data,
      };
    },
  });

  useEffect(() => {
    if (!initialWorkspacePath || !detailQuery.data) return;
    if (handledInitialWorkspaceRef.current === initialWorkspacePath) return;

    let url: URL;
    try {
      url = new URL(initialWorkspacePath, window.location.origin);
    } catch {
      return;
    }

    const workspace = normalize(url.searchParams.get("workspace"));
    const planId = url.searchParams.get("audit_plan_id");
    const eventId = url.searchParams.get("audit_event_id");
    const findingId = url.searchParams.get("finding_id");

    if (["audit-team", "audit-plan", "audit-execution", "cap", "technical-review", "certification-decision", "certificate-issue"].includes(workspace) && !planId) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (handledInitialWorkspaceRef.current === initialWorkspacePath) return;
      handledInitialWorkspaceRef.current = initialWorkspacePath;
      setDocumentActionError(null);

      if (workspace === "audit-team" && planId) {
        setCoordinationTarget(`appointment:${planId}`);
        return;
      }

      if (workspace === "audit-plan" && planId) {
        setAuditDocumentWorkspace({
          planId,
          focus: { documentType: "audit_plan_f05", title: "Kế hoạch đánh giá" },
        });
        return;
      }

      if (workspace === "audit-execution" && planId) {
        setFocusedExecutionWorkspace({ planId, mode: "full" });
        return;
      }

      if (workspace === "cap" && planId) {
        setCorrectiveActionFindingId(findingId);
        setCorrectiveActionWorkspacePlanId(planId);
        return;
      }

      if (workspace === "technical-review" && planId) {
        setTechnicalReviewWorkspacePlanId(planId);
        return;
      }

      if (workspace === "certification-decision" && planId) {
        setCertificationResultWorkspace({ planId, focus: "decision" });
        return;
      }

      if (workspace === "certificate-issue" && planId) {
        setCertificateIssuancePlanId(planId);
        return;
      }

      if (workspace === "surveillance-change" && eventId) {
        setSurveillanceInformationEventId(eventId);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [detailQuery.data, initialWorkspacePath]);

  const dossierForDocumentSummary = (() => {
    const data = detailQuery.data;
    if (!data) return null;
    const sourceGroups = data.dossier.dossiers?.length
      ? [...data.dossier.dossiers].sort((left, right) => left.sequence_no - right.sequence_no)
      : legacyDossierGroups(data.dossier.items, data.project.audit_plans);
    const groups = normalizeCycleDossiers(
      sourceGroups,
      data.project.audit_plans,
      data.dossier.diagnostics ?? data.project.audit_plan_diagnostics ?? [],
    );
    return groups.find((group) => group.dossier_key === selectedDossierKey)
      ?? groups.find((group) => group.dossier_key === data.dossier.current_dossier_key)
      ?? groups[0]
      ?? null;
  })();
  const dossierDocumentPlanIds = dossierForDocumentSummary?.plan_ids ?? [];
  const dossierDocumentSummaryQuery = useQuery<AuditDocumentPreview[]>({
    queryKey: ["audit-documents", "dossier-summary", projectId, dossierForDocumentSummary?.dossier_key, dossierDocumentPlanIds.join("|")],
    enabled: Boolean(detailQuery.data && dossierDocumentPlanIds.length),
    queryFn: async () => Promise.all(
      dossierDocumentPlanIds.map(async (planId) => (
        await api.get<AuditDocumentPreview>(`/audit-documents/plan/${planId}`)
      ).data),
    ),
  });

  const openDossierFile = async (file: DossierFile) => {
    setOpeningFileId(file.id);
    setDocumentActionError(null);

    try {
      const request = {
        url: `/document-files/${file.id}/download`,
        filename: file.original_name,
      };

      if (isPdfDocument(file.original_name)) {
        await previewDocumentFile({ ...request, title: file.original_name });
      } else {
        await openDocumentFile(request);
      }
    } catch (error) {
      setDocumentActionError(getErrorMessage(error));
    } finally {
      setOpeningFileId(null);
    }
  };

  const resetUploadDialog = () => {
    setUploadTarget(null);
    setUploadFile(null);
    setUploadNote("");
    setUploadError(null);
  };

  const startMissingDocumentUpload = (item: DossierItem) => {
    const key = normalize(item.document_key);

    if (key === "certificate") {
      setDocumentActionError("PDF giấy chứng nhận phải được tải tại không gian Chứng chỉ để đồng bộ QR và bản công khai.");
      return;
    }

    if (!item.entity_type || !item.entity_id) {
      setDocumentActionError(
        item.storage_type === "uploaded_file"
          ? "Chưa xác định được hồ sơ gốc để gắn tệp. Hãy tải lại trang rồi thử lại."
          : "Hãy hoàn thành nghiệp vụ này trước khi tải lên PDF chính thức.",
      );
      return;
    }

    setDocumentActionError(null);
    setUploadTarget({
      title: cleanDocumentName(item),
      entityType: item.entity_type,
      entityId: item.entity_id,
      documentType: item.document_key,
      fileKind: "signed_scan",
      pdfOnly: true,
      officialCopy: true,
    });
    setUploadFile(null);
    setUploadNote("");
    setUploadError(null);
  };

  const startDocumentVersionUpload = (file: DossierFile) => {
    setUploadTarget({
      title: readableDocumentType(file.document_type),
      entityType: file.entity_type,
      entityId: file.entity_id,
      documentType: file.document_type,
      fileKind: file.file_kind,
      currentVersion: file.version_no,
      pdfOnly: file.file_kind === "signed_scan",
      officialCopy: file.file_kind === "signed_scan",
    });
    setUploadFile(null);
    setUploadNote("");
    setUploadError(null);
  };

  const submitDocumentUpload = async () => {
    if (!uploadTarget) return;
    if (!uploadFile) {
      setUploadError("Vui lòng chọn tệp cần tải lên.");
      return;
    }
    if (uploadFile.size > 20 * 1024 * 1024) {
      setUploadError("Tệp vượt quá dung lượng tối đa 20 MB.");
      return;
    }
    if (uploadTarget.pdfOnly && uploadFile.type !== "application/pdf" && !uploadFile.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Tệp chính thức phải ở định dạng PDF.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setDocumentActionError(null);
    setDocumentActionMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("entity_type", uploadTarget.entityType);
      formData.append("entity_id", uploadTarget.entityId);
      formData.append("document_type", uploadTarget.documentType);
      formData.append("file_kind", uploadTarget.fileKind);
      if (uploadNote.trim()) formData.append("note", uploadNote.trim());

      await api.post("/document-files/upload", formData);
      const message = uploadTarget.currentVersion
        ? `Đã tạo phiên bản ${uploadTarget.currentVersion + 1}. Phiên bản cũ được giữ trong lịch sử.`
        : uploadTarget.officialCopy
          ? `Đã tải lên PDF chính thức của ${uploadTarget.title}.`
          : `Đã bổ sung ${uploadTarget.title} vào hồ sơ.`;
      resetUploadDialog();
      setDocumentActionMessage(message);
      await detailQuery.refetch();
    } catch (error) {
      setUploadError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const resolvePlanForDossierItem = (record: DossierItem) => {
    const data = detailQuery.data;
    if (!data) return null;

    const group = dossierForDocumentSummary;
    const candidates = data.project.audit_plans.filter((plan) => group?.plan_ids.includes(plan.id));
    const key = normalize(record.document_key);
    const groupType = normalize(group?.dossier_type);
    const isInitialDossier = ["initial", "initialcertification"].includes(groupType);
    const stage1 = candidates.find((plan) => ["stage1", "initialstage1"].includes(normalizedAuditPlanType(plan)));
    const stage2 = candidates.find((plan) => ["stage2", "initialstage2"].includes(normalizedAuditPlanType(plan)));

    // Giám sát/tái chứng nhận chỉ có một PLAN nghiệp vụ cho kỳ đó. Không được ép
    // các biểu NC/CAP, thẩm xét, F.12/F.13... đi tìm PLAN Giai đoạn 2.
    if (!isInitialDossier && candidates.length) {
      return candidates[0];
    }

    // Hồ sơ chứng nhận lần đầu phải khóa đúng PLAN theo giai đoạn.
    // Tuyệt đối không fallback GĐ2 sang PLAN GĐ1 vì sẽ tạo sai F.09-01.
    if (key.includes("stage1")) return stage1 ?? null;
    if (key.includes("stage2")) return stage2 ?? null;

    // `audit_report` chỉ còn dùng cho giám sát/tái chứng nhận. Trong hồ sơ lần đầu
    // nó được chuẩn hóa thành `stage2_audit_report` từ backend.
    if (key === "audit_report") return stage2 ?? candidates[0] ?? null;

    if ([
      "audit_checklist",
      "opening_closing_attendance",
      "audit_log",
      "audit_monitoring",
      "nc_cap",
      "technical_review_report",
      "audit_result_notification",
      "certification_decision",
      "certificate",
    ].includes(key)) {
      return stage2 ?? null;
    }

    const plansById = new Map(data.project.audit_plans.map((plan) => [plan.id, plan]));
    if (record.reference_id && plansById.has(record.reference_id)) {
      return plansById.get(record.reference_id) ?? null;
    }

    return stage1 ?? stage2 ?? candidates[0] ?? null;
  };

  const dossierFilesForItem = (record: DossierItem): DossierFile[] => {
    const key = normalize(record.document_key);
    const plan = resolvePlanForDossierItem(record);
    const entityIds = new Set(
      [record.entity_id, record.reference_id, plan?.id]
        .filter(Boolean) as string[],
    );

    const aliases: Record<string, string[]> = {
      certification_application: ["certification_application"],
      application_review: ["application_review"],
      business_license: ["business_license", "business_registration"],
      audit_team_assignment: ["audit_team_assignment", "audit_team_assignment_f04"],
      audit_program: ["audit_program", "audit_program_f03"],
      stage1_audit_plan: ["stage1_audit_plan", "audit_plan_stage1_f05", "audit_plan_f05"],
      stage2_audit_plan: ["stage2_audit_plan", "audit_plan_f05"],
      audit_plan: ["audit_plan", "audit_plan_f05"],
      stage1_audit_report: ["stage1_audit_report"],
      stage2_audit_report: ["stage2_audit_report"],
      audit_report: ["audit_report", "stage2_audit_report"],
      audit_checklist: ["audit_checklist"],
      opening_closing_attendance: ["opening_closing_attendance", "audit_attendance_f07"],
      audit_log: ["audit_log", "audit_log_f15"],
      audit_monitoring: ["audit_monitoring", "audit_monitoring_f17"],
      nc_cap: ["nc_cap", "corrective_action_request_f10"],
      technical_review_report: ["technical_review_report", "technical_review_report_f11"],
      certification_decision: ["certification_decision", "certification_decision_f13"],
      audit_result_notification: ["audit_result_notification", "audit_result_notification_f12"],
      certificate: ["certificate", "certificate_pdf"],
      contract: ["contract"],
      certification_agreement: ["certification_agreement"],
    };

    const acceptedTypes = aliases[key] ?? [key];
    return (detailQuery.data?.dossier.files ?? [])
      .filter((file) => {
        const type = normalize(file.document_type);
        const typeMatches = acceptedTypes.some((candidate) => (
          candidate === "audit_checklist"
            ? type.startsWith("audit_checklist_f06") || type === "audit_checklist"
            : type === candidate
        ));
        if (!typeMatches) return false;
        return entityIds.size === 0 || entityIds.has(file.entity_id);
      })
      .sort((left, right) => {
        const priority = (file: DossierFile) => {
          const isPdf = file.file_kind.includes("pdf") || file.original_name.toLowerCase().endsWith(".pdf");
          if (file.file_kind === "signed_scan" && isPdf) return 0;
          if (file.file_kind === "generated_pdf") return 1;
          if (isPdf) return 2;
          if (file.file_kind === "generated_docx") return 3;
          return 4;
        };
        const priorityDifference = priority(left) - priority(right);
        if (priorityDifference !== 0) return priorityDifference;
        return right.version_no - left.version_no;
      });
  };

  const signedDossierFile = (record: DossierItem) => dossierFilesForItem(record)
    .find((file) => file.file_kind === "signed_scan" && file.original_name.toLowerCase().endsWith(".pdf")) ?? null;

  const openAuditDocumentWorkspace = (record: DossierItem) => {
    const definition = dossierAuditDocumentDefinition(record.document_key);
    if (!definition) return false;
    const plan = resolvePlanForDossierItem(record);
    if (!plan) {
      setDocumentActionError("Kỳ đánh giá chưa có PLAN để mở biểu mẫu này.");
      return true;
    }
    setDocumentActionError(null);
    setAuditDocumentWorkspace({
      planId: plan.id,
      focus: {
        documentType: definition.documentType,
        title: definition.title,
      },
    });
    return true;
  };

  const ensureOperationalPlanForDossierItem = async (record: DossierItem) => {
    const existingPlan = resolvePlanForDossierItem(record);
    if (existingPlan) return existingPlan;

    const canCreatePlan = roles.some((role) => ["admin", "coordinator"].includes(normalize(role)));
    if (!canCreatePlan) {
      setDocumentActionError("Kỳ đánh giá chưa có PLAN. Vui lòng chờ Điều phối viên tạo PLAN trước khi tiếp tục.");
      return null;
    }

    if (!record.action_event_id) {
      setDocumentActionError("Kỳ đánh giá chưa có audit event để khởi tạo PLAN nghiệp vụ.");
      return null;
    }

    try {
      const response = await api.post<ProjectAuditPlan>("/audit-plans", {
        project_id: projectId,
        audit_event_id: record.action_event_id,
        audit_type: dossierForDocumentSummary?.dossier_type ?? "audit",
        status: "draft",
      });
      setDocumentActionError(null);
      await detailQuery.refetch();
      return response.data;
    } catch (error) {
      setDocumentActionError(getErrorMessage(error));
      return null;
    }
  };

  const openDossierItem = async (record: DossierItem) => {
    const sourceDossier = detailQuery.data?.dossier;
    const normalizedKey = normalize(record.document_key);

    if (normalizedKey === "surveillance_information_update") {
      const eventId = record.entity_id ?? record.reference_id;
      if (!eventId) {
        setDocumentActionError("Kỳ giám sát chưa có audit event để lập phiếu cập nhật thông tin.");
        return;
      }
      setDocumentActionError(null);
      setSurveillanceInformationEventId(eventId);
      return;
    }

    if (normalizedKey === "audit_team_assignment") {
      const dossierType = normalize(dossierForDocumentSummary?.dossier_type);
      if (["initial", "initialcertification"].includes(dossierType)) {
        setDocumentActionError(null);
        setCoordinationTarget(`project:${projectId}`);
        return;
      }
      const plan = await ensureOperationalPlanForDossierItem(record);
      if (!plan) return;
      setCoordinationTarget(`appointment:${plan.id}`);
      return;
    }

    if (["stage1_audit_plan", "stage2_audit_plan", "audit_plan"].includes(normalizedKey)) {
      const plan = await ensureOperationalPlanForDossierItem(record);
      if (!plan) return;
      const definition = dossierAuditDocumentDefinition(record.document_key);
      if (!definition) {
        setDocumentActionError("Không xác định được biểu kế hoạch đánh giá F.05.");
        return;
      }
      setDocumentActionError(null);
      setAuditDocumentWorkspace({
        planId: plan.id,
        focus: { documentType: definition.documentType, title: definition.title },
      });
      return;
    }

    if (["stage1_audit_report", "stage2_audit_report", "audit_report"].includes(normalizedKey)) {
      const plan = resolvePlanForDossierItem(record);
      if (!plan) {
        setDocumentActionError(
          normalizedKey.includes("stage2")
            ? "Chưa có Kế hoạch đánh giá Giai đoạn 2. Hãy lập PLAN Giai đoạn 2 trước khi tạo F.09-02."
            : "Kỳ đánh giá chưa có PLAN phù hợp để mở báo cáo đánh giá.",
        );
        return;
      }
      setDocumentActionError(null);
      setFocusedExecutionWorkspace({ planId: plan.id, mode: "report" });
      return;
    }

    if (normalizedKey === "nc_cap") {
      const plan = resolvePlanForDossierItem(record);
      if (!plan) {
        setDocumentActionError("Kỳ đánh giá chưa có PLAN để mở không gian NC/CAP.");
        return;
      }
      setDocumentActionError(null);
      setCorrectiveActionFindingId(null);
      setCorrectiveActionWorkspacePlanId(plan.id);
      return;
    }

    if (normalizedKey === "technical_review_report") {
      const plan = resolvePlanForDossierItem(record);
      if (!plan) {
        setDocumentActionError("Kỳ đánh giá chưa có PLAN để mở không gian thẩm xét kỹ thuật.");
        return;
      }
      setDocumentActionError(null);
      setTechnicalReviewWorkspacePlanId(plan.id);
      return;
    }

    if (["certification_decision", "audit_result_notification"].includes(normalizedKey)) {
      const plan = resolvePlanForDossierItem(record);
      if (!plan) {
        setDocumentActionError("Kỳ đánh giá chưa có PLAN phù hợp để mở không gian kết quả chứng nhận.");
        return;
      }
      setDocumentActionError(null);
      setCertificationResultWorkspace({
        planId: plan.id,
        focus: normalizedKey === "certification_decision" ? "decision" : "notification",
      });
      return;
    }

    if (normalizedKey === "certificate") {
      const plan = resolvePlanForDossierItem(record);
      if (!plan) {
        setDocumentActionError("Kỳ đánh giá chưa có PLAN phù hợp để mở không gian cấp giấy chứng nhận.");
        return;
      }
      setDocumentActionError(null);
      setCertificateIssuancePlanId(plan.id);
      return;
    }

    if (openAuditDocumentWorkspace(record)) return;

    if (normalizedKey === "certification_application" || normalizedKey === "application_review") {
      setSourceRecordKey(normalizedKey as "certification_application" | "application_review");
      setSourceRecordTab("system");
      return;
    }

    if (record.storage_type === "uploaded_file") {
      const matchingFiles = (sourceDossier?.files ?? [])
        .filter((file) => {
          const sameEntity = record.entity_id ? file.entity_id === record.entity_id : true;
          return sameEntity && normalize(file.document_type) === normalizedKey;
        })
        .sort((left, right) => right.version_no - left.version_no);

      if (matchingFiles[0]) {
        await openDossierFile(matchingFiles[0]);
        return;
      }

      if (canManageDocuments) {
        startMissingDocumentUpload(record);
        return;
      }
    }

    setDocumentActionError(
      normalize(record.status) === "pending"
        ? "Nội dung này chưa được tạo trong hệ thống. Hãy hoàn thành nghiệp vụ tương ứng trước."
        : "Màn hình chi tiết cho thành phần hồ sơ này đang được hoàn thiện.",
    );
  };

  const dossierColumns: TableColumnsType<DossierItem> = (() => {
    const columns: TableColumnsType<DossierItem> = [{
      title: "STT",
      dataIndex: "item_no",
      key: "item_no",
      width: 62,
    },
    {
      title: "Thành phần hồ sơ",
      key: "document_name",
      render: (_, record) => (
        <Button
          className="dossier-record-link"
          icon={<FileOutlined />}
          onClick={() => void openDossierItem(record)}
          type="link"
        >
          {cleanDocumentName(record)}
        </Button>
      ),
    },
    {
      title: "Mã biểu",
      key: "form_code",
      width: 118,
      render: (_, record) => {
        const formCode = dossierFormCode(record.document_key);
        return formCode ? <Tag color="blue">{formCode}</Tag> : <Text type="secondary">—</Text>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 142,
      render: (_value: string, record) => <DossierBusinessStatusTag item={record} />,
    },
    {
      title: "Phiên bản / tài liệu",
      key: "current_version",
      responsive: ["md"],
      width: 190,
      render: (_, record) => {
        if (normalize(record.document_key) === "surveillance_information_update") {
          return <Text type="secondary">Dữ liệu nghiệp vụ</Text>;
        }
        const currentFiles = dossierFilesForItem(record).filter((file) => file.is_current !== false);
        const officialPdf = signedDossierFile(record);
        const currentWord = currentFiles.find((file) => (
          file.file_kind === "generated_docx" || /\.docx?$/i.test(file.original_name)
        ));
        const currentGeneratedPdf = currentFiles.find((file) => file.file_kind === "generated_pdf");
        const hasDocumentControl = Boolean(dossierFormCode(record.document_key))
          || currentFiles.length > 0
          || record.storage_type === "uploaded_file";
        if (!hasDocumentControl) return <Text type="secondary">—</Text>;
        return (
          <Space direction="vertical" size={2}>
            {currentWord
              ? <Tag icon={<FileWordOutlined />}>Word v{currentWord.version_no}</Tag>
              : <Tag>Chưa sinh Word</Tag>}
            {officialPdf
              ? <Tag color="green" icon={<FilePdfOutlined />}>PDF chính thức v{officialPdf.version_no}</Tag>
              : currentGeneratedPdf
                ? <Tag icon={<FilePdfOutlined />}>PDF nháp v{currentGeneratedPdf.version_no}</Tag>
                : <Tag color="orange">Chưa có PDF chính thức</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Thao tác",
      key: "document_action",
      align: "right",
      width: 228,
      render: (_, record) => {
        const key = normalize(record.document_key);
        const dossierFiles = dossierFilesForItem(record);
        const officialPdf = signedDossierFile(record);
        const currentPdf = officialPdf ?? dossierFiles.find((file) => (
          file.file_kind.includes("pdf") || file.original_name.toLowerCase().endsWith(".pdf")
        )) ?? null;
        const currentWord = dossierFiles.find((file) => (
          file.file_kind === "generated_docx" || /\.docx?$/i.test(file.original_name)
        )) ?? null;
        const canUploadOfficialPdf = canManageDocuments
          && !["certificate", "surveillance_information_update"].includes(key)
          && normalize(record.status) !== "not_applicable";
        const uploadDisabled = !record.entity_type || !record.entity_id;
        let businessAction = <></>;

        if (key === "surveillance_information_update") {
          const surveillanceAction = dossierForDocumentSummary?.next_action;
          businessAction = (
            <Button className="dossier-row-action" icon={<SolutionOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              {surveillanceAction?.code === "REVIEW_CHANGE"
                ? "Xem xét thay đổi"
                : normalize(record.status) === "completed" ? "Xem cập nhật" : "Cập nhật"}
            </Button>
          );
        } else if (key === "audit_team_assignment") {
          businessAction = (
            <Button className="dossier-row-action" icon={<SolutionOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              {normalize(record.status) === "completed" ? "Mở chỉ định" : "Chỉ định đoàn"}
            </Button>
          );
        } else if (["stage1_audit_plan", "stage2_audit_plan", "audit_plan"].includes(key)) {
          businessAction = (
            <Button className="dossier-row-action" icon={<CalendarOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              {normalize(record.status) === "completed" ? "Mở kế hoạch" : "Lập kế hoạch"}
            </Button>
          );
        } else if (["stage1_audit_report", "stage2_audit_report", "audit_report"].includes(key)) {
          businessAction = (
            <Button className="dossier-row-action" icon={<FileDoneOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              Mở báo cáo
            </Button>
          );
        } else if (key === "nc_cap") {
          businessAction = (
            <Button className="dossier-row-action" icon={<SafetyCertificateOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              Mở NC/CAP
            </Button>
          );
        } else if (key === "technical_review_report") {
          businessAction = (
            <Button className="dossier-row-action" icon={<AuditOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              Thẩm xét
            </Button>
          );
        } else if (key === "audit_result_notification") {
          businessAction = (
            <Button className="dossier-row-action" icon={<SafetyCertificateOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              {normalize(record.status) === "completed" ? "Xem thông báo" : "Thông báo kết quả"}
            </Button>
          );
        } else if (key === "certification_decision") {
          businessAction = (
            <Button className="dossier-row-action" icon={<SafetyCertificateOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              {normalize(record.status) === "completed" ? "Xem quyết định" : "Ra quyết định"}
            </Button>
          );
        } else if (key === "certificate") {
          businessAction = normalize(record.status) === "not_applicable" ? (
            <Tag>Không áp dụng</Tag>
          ) : (
            <Button className="dossier-row-action" icon={<SafetyCertificateOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              {normalize(record.status) === "completed" ? "Xem chứng chỉ" : "Mở chứng chỉ"}
            </Button>
          );
        } else if (dossierAuditDocumentDefinition(record.document_key)) {
          businessAction = (
            <Button className="dossier-row-action" icon={<FileDoneOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              Mở biểu
            </Button>
          );
        } else {
          businessAction = (
            <Button className="dossier-row-action" icon={<EyeOutlined />} onClick={() => void openDossierItem(record)} size="small" style={{ minWidth: 108 }}>
              Xem dữ liệu
            </Button>
          );
        }

        if (key === "surveillance_information_update") {
          return <Space size={6} style={{ justifyContent: "flex-end", whiteSpace: "nowrap" }}>{businessAction}</Space>;
        }

        const documentMenuItems: MenuProps["items"] = [
          ...(currentWord ? [{
            key: "download-word",
            icon: <FileWordOutlined />,
            label: "Tải Word",
          }] : []),
          ...(currentPdf ? [{
            key: "view-pdf",
            icon: <EyeOutlined />,
            label: officialPdf ? "Xem PDF chính thức" : "Xem PDF",
          }] : []),
          ...((currentWord || currentPdf) && canUploadOfficialPdf ? [{ type: "divider" as const }] : []),
          ...(canUploadOfficialPdf ? [{
            key: "upload-official-pdf",
            disabled: uploadDisabled,
            icon: <UploadOutlined />,
            label: officialPdf ? "Thay PDF chính thức" : "Tải lên PDF chính thức",
            title: uploadDisabled ? "Hoàn thành nghiệp vụ trước khi tải lên PDF chính thức" : undefined,
          }] : []),
        ];

        const handleDocumentMenuClick: NonNullable<MenuProps["onClick"]> = ({ key: menuKey }) => {
          if (menuKey === "download-word" && currentWord) {
            void openDossierFile(currentWord);
            return;
          }
          if (menuKey === "view-pdf" && currentPdf) {
            void openDossierFile(currentPdf);
            return;
          }
          if (menuKey === "upload-official-pdf" && !uploadDisabled) {
            startMissingDocumentUpload(record);
          }
        };

        return (
          <Space size={6} style={{ justifyContent: "flex-end", whiteSpace: "nowrap" }}>
            {businessAction}
            <Dropdown
              disabled={!documentMenuItems.length}
              menu={{ items: documentMenuItems, onClick: handleDocumentMenuClick }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Button icon={<FileOutlined />} size="small" style={{ minWidth: 92 }}>
                Tài liệu <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        );
      },
    }];

    return columns;
  })();

  const renderDossierColumn = (columnKey: string, record: DossierItem, index: number) => {
    const column = dossierColumns.find((candidate) => String(candidate.key) === columnKey);
    return typeof column?.render === "function"
      ? column.render(undefined, record, index) as ReactNode
      : null;
  };

  const dossierResponsiveCards = (items: DossierItem[], keyPrefix: string): ResponsiveCardItem[] => items.map((record, index) => ({
    key: `${keyPrefix}-${record.document_key}-${record.item_no}`,
    title: (
      <Button
        className="dossier-record-link"
        icon={<FileOutlined />}
        onClick={() => void openDossierItem(record)}
        type="link"
      >
        {cleanDocumentName(record)}
      </Button>
    ),
    status: renderDossierColumn("status", record, index),
    fields: [
      { key: "item-no", label: "STT", value: record.item_no },
      { key: "form-code", label: "Mã biểu", value: renderDossierColumn("form_code", record, index) },
      { key: "current-version", label: "Phiên bản / tài liệu", value: renderDossierColumn("current_version", record, index) },
    ],
    actions: renderDossierColumn("document_action", record, index),
  }));

  if (detailQuery.isLoading) {
    return <Card className="project-detail-loading"><Skeleton active paragraph={{ rows: 16 }} /></Card>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Card className="project-detail-error">
        <Empty description={getErrorMessage(detailQuery.error)} />
        <Space>
          <Button onClick={onBack}>Quay lại danh sách</Button>
          <Button onClick={() => void detailQuery.refetch()} type="primary">Thử lại</Button>
        </Space>
      </Card>
    );
  }

  const { project, dossier, alerts } = detailQuery.data;
  const application = project.certification_applications;
  const customer = application?.customers;
  const sourceDossierGroups = dossier.dossiers?.length
    ? [...dossier.dossiers].sort((left, right) => left.sequence_no - right.sequence_no)
    : legacyDossierGroups(dossier.items, project.audit_plans);
  const planDiagnostics = dossier.diagnostics ?? project.audit_plan_diagnostics ?? [];
  const dossierGroups = normalizeCycleDossiers(
    sourceDossierGroups,
    project.audit_plans,
    planDiagnostics,
  );
  const allDossierGroups = dossierGroups;
  const commonDossierItems = dossier.common_items
    ?? dossier.items.filter((item) => item.item_no <= 3);
  const selectedDossier = dossierGroups.find((group) => group.dossier_key === selectedDossierKey)
    ?? dossierGroups.find((group) => group.dossier_key === dossier.current_dossier_key)
    ?? dossierGroups[0]
    ?? null;
  const selectedWorkflowStageDefinitions = selectedDossier
    && normalize(selectedDossier.dossier_type) !== "initial"
    ? surveillanceWorkflowStageDefinitions
    : initialWorkflowStageDefinitions;
  const workflowStages = selectedDossier
    ? buildWorkflowStages(selectedDossier.items, selectedWorkflowStageDefinitions)
    : [];
  const allDossierPlanIds = new Set(allDossierGroups.flatMap((group) => group.plan_ids));
  const commonFiles = dossier.files.filter((file) => !allDossierPlanIds.has(file.entity_id));
  const sourceApplication = dossier.source_records?.application ?? application ?? null;
  const sourceReview = dossier.source_records?.application_review ?? null;
  const sourceReviewMandayCorrection = (() => {
    const initial = Number(sourceReview?.final_mandays ?? 0);
    const stage1 = Number(sourceReview?.stage1_mandays ?? 0);
    const stage2 = Number(sourceReview?.stage2_mandays ?? 0);

    if (!Number.isFinite(initial) || initial < 1.5) return null;

    const valid = stage1 >= 0.5
      && stage2 >= 1
      && Math.abs(stage1 * 2 - Math.round(stage1 * 2)) < 0.001
      && Math.abs(stage2 * 2 - Math.round(stage2 * 2)) < 0.001
      && Math.abs(stage1 + stage2 - initial) <= 0.01;

    if (valid) return null;

    let normalizedStage1 = Math.max(
      0.5,
      Math.round((initial * 0.2 + Number.EPSILON) * 2) / 2,
    );
    if (initial - normalizedStage1 < 1) {
      normalizedStage1 = Math.round((initial - 1 + Number.EPSILON) * 2) / 2;
    }
    const normalizedStage2 = Math.round((initial - normalizedStage1 + Number.EPSILON) * 2) / 2;

    return {
      sourceStage1: stage1,
      sourceStage2: stage2,
      normalizedStage1,
      normalizedStage2,
    };
  })();
  const activeSourceRecordId = sourceRecordKey === "certification_application"
    ? sourceApplication?.id
    : sourceReview?.id;
  const activeSourceFiles = activeSourceRecordId
    ? dossier.files
        .filter((file) => file.entity_id === activeSourceRecordId)
        .sort((left, right) => right.version_no - left.version_no)
    : [];
  const reviewIncreaseFactors = parseStructuredList(sourceReview?.increase_factors);
  const reviewReductionFactors = parseStructuredList(sourceReview?.reduction_factors);
  const reviewIndustryScopes = parseStructuredList(sourceReview?.industry_scopes_json);
  const selectedSummary = selectedDossier?.summary ?? {
    total_items: 0,
    completed_items: 0,
    pending_items: 0,
    completion_percentage: 0,
    dossier_status: "not_started",
  };
  const selectedPlans = project.audit_plans.filter((plan) => selectedDossier?.plan_ids.includes(plan.id));
  const selectedPrimaryPlan = selectedPlans[0] ?? null;
  const selectedStartDate = selectedPlans
    .map((plan) => plan.planned_start_date)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? selectedDossier?.planned_start_date ?? null;
  const selectedEndDate = selectedPlans
    .map((plan) => plan.planned_end_date ?? plan.planned_start_date)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? selectedDossier?.planned_end_date ?? selectedStartDate;
  const selectedMandays = selectedPrimaryPlan?.audit_event?.planned_mandays
    ?? selectedDossier?.planned_mandays;
  const selectedNextAction = selectedDossier ? effectiveNextAction(selectedDossier) : null;
  const canPerformNextAction = Boolean(selectedNextAction?.responsibleRoles.some((requiredRole) => (
    roles.some((role) => normalize(role) === normalize(requiredRole))
  )));
  const canSeePlanDiagnostics = roles.some((role) => normalize(role) === "admin");
  const openDossier = (group: DossierGroup) => {
    setSelectedDossierKey(group.dossier_key);
  };

  const nextActionDossierItem = (group: DossierGroup) => {
    const action = effectiveNextAction(group);
    if (!action) return null;
    return group.items.find((item) => normalize(item.document_key) === action.itemKey) ?? null;
  };

  const openDossierNextAction = async (group: DossierGroup) => {
    const item = nextActionDossierItem(group);
    if (item) {
      await openDossierItem(item);
      return;
    }
    setDocumentActionError("Không tìm thấy thành phần hồ sơ tương ứng với việc cần làm tiếp theo.");
  };

  const pendingLabel = (items: DossierItem[]) => {
    const applicable = items.filter((item) => normalize(item.status) !== "not_applicable");
    if (!applicable.length) return "Chưa phát sinh";
    const pending = applicable.filter((item) => normalize(item.status) === "pending").length;
    return pending ? `${pending} thành phần cần bổ sung` : "Đã hoàn thành";
  };

  return (
    <div className="project-detail-screen">
      <div className="project-detail-heading">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Danh sách hồ sơ</Button>
        <div className="project-detail-title-area">
          <span className="eyebrow">KHÔNG GIAN HỒ SƠ CHỨNG NHẬN</span>
          <div className="project-detail-title-line">
            <Title level={2}>{project.project_code}</Title>
            <ProjectStatusTag status={project.status} />
            {selectedDossier ? <Tag color="geekblue">{selectedDossier.dossier_label}</Tag> : null}
          </div>
          <Text type="secondary">
            {customer?.company_name ?? "Chưa xác định khách hàng"} · {project.standard_name}
          </Text>
        </div>
        <Space wrap>
          <Button
            aria-label="Làm mới hồ sơ"
            icon={<ReloadOutlined />}
            loading={detailQuery.isFetching}
            onClick={() => void detailQuery.refetch()}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      <Card
        className="project-detail-card dossier-selector-card dossier-workspace-selector"
        extra={selectedDossier ? dossierStatusTag(selectedDossier) : null}
        title="Chu kỳ chứng nhận"
      >
        <Tabs
          activeKey={selectedDossier?.dossier_key}
          items={dossierGroups.map((group) => ({
            key: group.dossier_key,
            label: (
              <Space size={6}>
                <span>{group.dossier_label}</span>
                {group.summary.pending_items ? <Tag color="orange">{group.summary.pending_items}</Tag> : <Tag color="green"><CheckCircleOutlined /></Tag>}
              </Space>
            ),
          }))}
          onChange={(key) => {
            const group = dossierGroups.find((item) => item.dossier_key === key);
            if (group) openDossier(group);
          }}
          size="small"
        />
      </Card>

      {selectedDossier ? <Card
        className="project-detail-card dossier-workspace-card"
        title={(
          <div className="dossier-workspace-title">
            <div>
              <strong>
                {normalize(selectedDossier.dossier_type) === "surveillance1"
                  ? "GS1"
                  : normalize(selectedDossier.dossier_type) === "surveillance2"
                    ? "GS2"
                    : normalize(selectedDossier.dossier_type) === "recertification"
                      ? "TCC"
                      : "CN lần đầu"}
                {" · "}{auditTypeLabels[normalize(selectedDossier.dossier_type)] ?? selectedDossier.dossier_label}
              </strong>
              <span>{selectedDossier.dossier_description}</span>
            </div>
            <div className="dossier-workspace-meta">
              <span>{formatDate(selectedStartDate)} – {formatDate(selectedEndDate)}</span>
              <span>{selectedMandays == null ? "Chưa xác định MD" : `${selectedMandays} MD`}</span>
              <span>{readableStatus(selectedPrimaryPlan?.status ?? selectedDossier.summary.dossier_status)}</span>
            </div>
          </div>
        )}
      >
        <div className="dossier-cycle-progress">
          <Progress percent={selectedSummary.completion_percentage} size="small" />
          <Text>{selectedSummary.completed_items}/{selectedSummary.total_items} thành phần đã thỏa mãn</Text>
          {alerts.summary.total ? <Tag color="orange">{alerts.summary.total} cảnh báo dự án</Tag> : <Tag color="green">Không có cảnh báo</Tag>}
        </div>
        {documentActionMessage ? <Alert closable message={documentActionMessage} onClose={() => setDocumentActionMessage(null)} showIcon type="success" /> : null}
        {documentActionError ? <Alert closable message="Không thể thực hiện thao tác tài liệu" description={documentActionError} onClose={() => setDocumentActionError(null)} showIcon type="error" /> : null}

        {canSeePlanDiagnostics ? planDiagnostics.map((diagnostic) => (
          <Alert
            description={`Đang dùng ${diagnostic.canonical_plan_code ?? "PLAN canonical"}; các PLAN trùng chỉ được giữ trong cảnh báo quản trị cho đến khi dữ liệu được xử lý.`}
            key={`${diagnostic.audit_event_id}-${diagnostic.canonical_plan_id}`}
            message="Phát hiện PLAN vận hành trùng"
            showIcon
            type="warning"
          />
        )) : null}

        {selectedNextAction ? (
          <Alert
            action={(
              <Button className="dossier-next-action-button" disabled={!canPerformNextAction} onClick={() => void openDossierNextAction(selectedDossier)} type="primary">
                {selectedNextAction.label}
              </Button>
            )}
            className="dossier-next-action"
            description={canPerformNextAction
              ? `Phụ trách: ${selectedNextAction.responsibleLabel}. Thao tác mở trực tiếp đúng thành phần hồ sơ của kỳ này.`
              : `Phụ trách: ${selectedNextAction.responsibleLabel}. Vai trò hiện tại chỉ có thể theo dõi trạng thái.`}
            message={<span>VIỆC CẦN LÀM TIẾP THEO <strong>{selectedNextAction.label}</strong></span>}
            showIcon
            style={{ marginBottom: 16 }}
            type={selectedNextAction.code === "REVIEW_CHANGE" ? "warning" : "info"}
          />
        ) : null}

        <div>
          <Card className="project-workflow-card dossier-workflow-card" title="Tiến trình của kỳ đánh giá này">
            <Steps items={workflowStages} responsive size="small" />
          </Card>
          <div className="dossier-form-stage-list">
            {selectedWorkflowStageDefinitions.map((stage, stageIndex) => {
              const stageItems = selectedDossier.items.filter((item) => stage.keys.some((key) => key === item.document_key));
              if (!stageItems.length) return null;
              const completed = stageItems.filter((item) => ["completed", "not_applicable"].includes(normalize(item.status))).length;
              return (
                <Card
                  className="dossier-form-stage-card"
                  extra={<Tag color={completed === stageItems.length ? "green" : "blue"}>{completed}/{stageItems.length}</Tag>}
                  key={stage.title}
                  size="small"
                  title={<span><strong>{stageIndex + 1}. {stage.title}</strong><Text type="secondary"> · {stageItems.length} thành phần</Text></span>}
                >
                  <>
                    <div className="cmp-data-table--responsive">
                      <Table
                        columns={dossierColumns}
                        dataSource={stageItems}
                        pagination={false}
                        rowClassName={(record) => (
                          selectedNextAction?.itemKey === normalize(record.document_key)
                            ? "dossier-row-next-action"
                            : ""
                        )}
                        rowKey={(record) => `${selectedDossier.dossier_key}-${record.document_key}-${record.item_no}`}
                        size="small"
                      />
                    </div>
                    <ResponsiveCardList items={dossierResponsiveCards(stageItems, selectedDossier.dossier_key)} />
                  </>
                </Card>
              );
            })}
          </div>
        </div>

      </Card> : null}

      <CommercialDocumentsPanel
        agreement={project.certification_agreements ? {
          id: project.certification_agreements.id,
          referenceNumber: project.certification_agreements.agreement_number,
          signDate: project.certification_agreements.sign_date,
        } : null}
        canManage={canManageDocuments}
        contract={project.contracts ? {
          id: project.contracts.id,
          referenceNumber: project.contracts.contract_number,
          signDate: project.contracts.sign_date,
        } : null}
        projectId={project.id}
      />
      <Card
        className="project-detail-card dossier-card"
        extra={<Text type="secondary">{pendingLabel(commonDossierItems)}</Text>}
        title="Hồ sơ dùng chung / xuyên chu kỳ"
      >
        <>
          <div className="cmp-data-table--responsive">
            <Table
              columns={dossierColumns}
              dataSource={commonDossierItems}
              pagination={false}
              rowKey={(record) => `common-${record.document_key}-${record.item_no}`}
              size="small"
            />
          </div>
          <ResponsiveCardList items={dossierResponsiveCards(commonDossierItems, "common")} />
        </>
      </Card>

      <Card className="project-detail-card project-files-card" title="Tệp dùng chung đã lưu">
        {documentActionMessage ? <Alert closable message={documentActionMessage} onClose={() => setDocumentActionMessage(null)} showIcon type="success" /> : null}
        {documentActionError ? <Alert closable message="Không thể thực hiện thao tác tài liệu" description={documentActionError} onClose={() => setDocumentActionError(null)} showIcon type="error" /> : null}
        <List<DossierFile>
          dataSource={commonFiles}
          grid={{ gutter: 12, xs: 1, sm: 1, md: 2, lg: 3 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tệp dùng chung" /> }}
          renderItem={(file) => (
            <List.Item>
              <div className="project-file-item">
                <FileDoneOutlined />
                <div className="project-file-details">
                  <strong title={file.original_name}>{file.original_name}</strong>
                  <span>{readableDocumentType(file.document_type)}</span>
                  <span>Phiên bản {file.version_no} · {formatDate(file.uploaded_at)}</span>
                </div>
                <Space size={6}>
                  <Button icon={<EyeOutlined />} loading={openingFileId === file.id} onClick={() => void openDossierFile(file)} size="small">Mở tệp</Button>
                  {canManageDocuments ? <Button icon={<UploadOutlined />} onClick={() => startDocumentVersionUpload(file)} size="small">Bản mới</Button> : null}
                </Space>
              </div>
            </List.Item>
          )}
        />
      </Card>

      <footer className="project-detail-footer">
        <SafetyCertificateOutlined /> Dữ liệu hồ sơ được tổng hợp trực tiếp từ các nghiệp vụ đã hoàn thành trong hệ thống.
      </footer>

      <Drawer
        destroyOnHidden
        extra={canManageDocuments && activeSourceRecordId ? (
          <Button
            icon={<UploadOutlined />}
            onClick={() => {
              setUploadTarget({
                title: sourceRecordKey === "certification_application" ? "Bản scan phiếu đăng ký" : "Bản scan phiếu xem xét",
                entityType: sourceRecordKey === "certification_application" ? "certification_application" : "application_review",
                entityId: activeSourceRecordId,
                documentType: sourceRecordKey === "certification_application" ? "certification_application_scan" : "application_review_scan",
                fileKind: "scan",
              });
              setUploadFile(null);
              setUploadNote("");
              setUploadError(null);
            }}
          >
            Tải bản scan
          </Button>
        ) : null}
        onClose={() => setSourceRecordKey(null)}
        open={Boolean(sourceRecordKey)}
        title={sourceRecordKey === "certification_application"
          ? `Phiếu đăng ký chứng nhận ${sourceApplication?.application_code ?? ""}`
          : "Xem xét đăng ký chứng nhận"}
        width={860}
      >
        <Tabs
          activeKey={sourceRecordTab}
          items={[
            { key: "system", label: "Dữ liệu hệ thống" },
            { key: "scan", label: `Bản scan/tệp đính kèm (${activeSourceFiles.length})` },
          ]}
          onChange={(key) => setSourceRecordTab(key as "system" | "scan")}
        />

        {sourceRecordTab === "system" && sourceRecordKey === "certification_application" ? (
          sourceApplication ? <div className="source-record-view">
            <Descriptions bordered column={{ xs: 1, md: 2 }} size="small" title="Thông tin tổ chức">
              <Descriptions.Item label="Mã đơn">{sourceApplication.application_code}</Descriptions.Item>
              <Descriptions.Item label="Ngày đăng ký">{formatDate(sourceApplication.application_date)}</Descriptions.Item>
              <Descriptions.Item label="Tên tổ chức">{sourceApplication.customers?.company_name ?? customer?.company_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Tên tiếng Anh">{sourceApplication.company_name_en ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ trụ sở" span={2}>{sourceApplication.headquarters_address ?? customer?.address ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Người đại diện">{sourceApplication.representative_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Chức vụ">{sourceApplication.representative_position ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Liên hệ đại diện">{[sourceApplication.representative_phone, sourceApplication.representative_email].filter(Boolean).join(" · ") || "—"}</Descriptions.Item>
              <Descriptions.Item label="Người liên hệ">{sourceApplication.contact_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Liên hệ">{[sourceApplication.contact_phone, sourceApplication.contact_email].filter(Boolean).join(" · ") || "—"}</Descriptions.Item>
              <Descriptions.Item label="Loại chứng nhận">{sourceApplication.certification_type ?? "—"}</Descriptions.Item>
            </Descriptions>

            <Descriptions bordered column={{ xs: 1, md: 2 }} size="small" title="Thông tin chứng nhận">
              <Descriptions.Item label="Tiêu chuẩn">{sourceApplication.standard_name}</Descriptions.Item>
              <Descriptions.Item label="Điều khoản loại trừ">{sourceApplication.excluded_clauses ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Phạm vi" span={2}>{sourceApplication.certification_scope}</Descriptions.Item>
              <Descriptions.Item label="Nhân sự hiệu dụng">{sourceApplication.employee_count ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Tổng nhân sự">{sourceApplication.total_employee_count ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Các ca">{[sourceApplication.shift1_count ?? 0, sourceApplication.shift2_count ?? 0, sourceApplication.shift3_count ?? 0].join(" / ")}</Descriptions.Item>
              <Descriptions.Item label="Số địa điểm">{sourceApplication.site_count ?? sourceApplication.sites?.length ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Thuê ngoài">{sourceApplication.external_provider_used ? "Có" : "Không"}</Descriptions.Item>
              <Descriptions.Item label="Quá trình thuê ngoài">{sourceApplication.outsourced_processes ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Yêu cầu khác" span={2}>{sourceApplication.other_requests ?? "—"}</Descriptions.Item>
            </Descriptions>

            <Divider titlePlacement="start">Địa điểm chứng nhận</Divider>
            <Table
              columns={[
                { title: "STT", dataIndex: "site_no", key: "site_no", width: 64 },
                { title: "Tên địa điểm", dataIndex: "site_name", key: "site_name", render: (value: string | null) => value || "Địa điểm chứng nhận" },
                { title: "Địa chỉ", dataIndex: "address", key: "address" },
                { title: "Hoạt động/phạm vi", dataIndex: "activities", key: "activities", render: (value: string | null) => value || "—" },
                { title: "Nhân sự", dataIndex: "employee_count", key: "employee_count", width: 90, render: (value: number | null) => value ?? "—" },
              ]}
              dataSource={sourceApplication.sites ?? []}
              locale={{ emptyText: "Chưa có dữ liệu địa điểm" }}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </div> : <Empty description="Không tải được dữ liệu phiếu đăng ký" />
        ) : null}

        {sourceRecordTab === "system" && sourceRecordKey === "application_review" ? (
          sourceReview ? <div className="source-record-view">
            {sourceReviewMandayCorrection ? (
              <Alert
                description={`Bản xem xét lịch sử đang lưu Stage 1 / Stage 2 = ${sourceReviewMandayCorrection.sourceStage1} / ${sourceReviewMandayCorrection.sourceStage2}. Khi đồng bộ sang hồ sơ, hệ thống áp dụng ${sourceReviewMandayCorrection.normalizedStage1} / ${sourceReviewMandayCorrection.normalizedStage2} để bảo đảm Stage 1 tối thiểu 0,5 MD và Stage 2 tối thiểu 1 MD.`}
                message="Phân bổ man-day lịch sử cần chuẩn hóa"
                showIcon
                type="warning"
              />
            ) : null}
            <Descriptions bordered column={{ xs: 1, md: 2 }} size="small" title="Kết quả xem xét">
              <Descriptions.Item label="Kết quả"><ProjectStatusTag status={sourceReview.result} /></Descriptions.Item>
              <Descriptions.Item label="Trạng thái quy trình"><ProjectStatusTag status={sourceReview.workflow_status} /></Descriptions.Item>
              <Descriptions.Item label="Người lập">{displayUser(sourceReview.prepared_by)}</Descriptions.Item>
              <Descriptions.Item label="Reviewer">{displayUser(sourceReview.users) || displayUser(sourceReview.checker) || sourceReview.checked_by_name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Lĩnh vực đánh giá" span={2}>{sourceReview.audit_field ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Mã IAF">{sourceReview.iaf_code ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Mã ISIC">{sourceReview.isic_code ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Mức rủi ro/phức tạp">{sourceReview.risk_level ?? "Không áp dụng"}</Descriptions.Item>
              <Descriptions.Item label="Phương pháp">{sourceReview.manday_method ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Kết luận" span={2}>{sourceReview.conclusion ?? "—"}</Descriptions.Item>
            </Descriptions>

            <Descriptions bordered column={{ xs: 1, md: 4 }} size="small" title="Ngày công đã xác nhận">
              <Descriptions.Item label="Nhân sự hiệu dụng">{sourceReview.effective_personnel ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="MD cơ sở">{sourceReview.base_mandays ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Tổng tăng">{sourceReview.increase_percent ?? 0}%</Descriptions.Item>
              <Descriptions.Item label="Tổng giảm">{sourceReview.reduction_percent ?? 0}%</Descriptions.Item>
              <Descriptions.Item label="Giảm tích hợp">{sourceReview.integration_reduction_percent ?? 0}%</Descriptions.Item>
              <Descriptions.Item label="MD lần đầu">{sourceReview.final_mandays ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Stage 1">{sourceReview.stage1_mandays ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Stage 2">{sourceReview.stage2_mandays ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Giám sát">{sourceReview.surveillance_mandays ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Tái chứng nhận">{sourceReview.recertification_mandays ?? "—"}</Descriptions.Item>
            </Descriptions>

            {reviewIndustryScopes.length ? <>
              <Divider titlePlacement="start">Phạm vi ngành đã xác nhận</Divider>
              <List
                dataSource={reviewIndustryScopes}
                renderItem={(item, index) => (
                  <List.Item>
                    <Space wrap>
                      <Tag color="blue">{String(item.standard_code ?? item.management_system ?? "Tiêu chuẩn")}</Tag>
                      <Tag>ISIC {String(item.isic_code ?? "—")}</Tag>
                      <Tag>NACE {String(item.nace_code ?? "—")}</Tag>
                      <Tag color="geekblue">IAF {String(item.iaf_code ?? "—")}</Tag>
                      <Text>{String(item.activity_description ?? item.certification_scope ?? `Phạm vi ${index + 1}`)}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </> : null}

            {(reviewIncreaseFactors.length || reviewReductionFactors.length) ? <>
              <Divider titlePlacement="start">Yếu tố điều chỉnh và căn cứ</Divider>
              <List
                dataSource={[
                  ...reviewIncreaseFactors.map((item) => ({ ...item, _type: "Tăng" } as Record<string, unknown> & { _type: string })),
                  ...reviewReductionFactors.map((item) => ({ ...item, _type: "Giảm" } as Record<string, unknown> & { _type: string })),
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${String(item._type)} ${String(item.percentage ?? item.percent ?? 0)}% · ${String(item.label ?? item.factor ?? item.factor_code ?? "Yếu tố điều chỉnh")}`}
                      description={String(item.reason ?? item.basis ?? item.description ?? "Chưa ghi căn cứ")}
                    />
                  </List.Item>
                )}
              />
            </> : null}

            {sourceReview.workflow_actions?.length ? <>
              <Divider titlePlacement="start">Lịch sử xử lý</Divider>
              <List
                dataSource={sourceReview.workflow_actions}
                renderItem={(action) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${action.action ?? "Xử lý"} · ${displayUser(action.actor)}`}
                      description={`${formatDate(action.created_at)}${action.comment ? ` · ${action.comment}` : ""}`}
                    />
                  </List.Item>
                )}
              />
            </> : null}
          </div> : <Empty description="Không tải được dữ liệu xem xét đăng ký" />
        ) : null}

        {sourceRecordTab === "scan" ? (
          <List<DossierFile>
            dataSource={activeSourceFiles}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bản scan hoặc tệp đính kèm" /> }}
            renderItem={(file) => (
              <List.Item
                actions={[
                  <Button key="open" icon={<EyeOutlined />} loading={openingFileId === file.id} onClick={() => void openDossierFile(file)} size="small">Mở tệp</Button>,
                  ...(canManageDocuments ? [<Button key="version" icon={<UploadOutlined />} onClick={() => startDocumentVersionUpload(file)} size="small">Bản mới</Button>] : []),
                ]}
              >
                <List.Item.Meta
                  avatar={<FileDoneOutlined />}
                  title={file.original_name}
                  description={`${readableDocumentType(file.document_type)} · Phiên bản ${file.version_no} · ${formatDate(file.uploaded_at)}`}
                />
              </List.Item>
            )}
          />
        ) : null}
      </Drawer>

      {surveillanceInformationEventId ? (
        <Suspense fallback={null}>
        <SurveillanceInformationSnapshotModal
          canEdit={canManageSurveillanceInformation}
          eventId={surveillanceInformationEventId}
          onClose={() => {
            setSurveillanceInformationEventId(null);
            void detailQuery.refetch();
          }}
          onUpdated={() => {
            void detailQuery.refetch();
          }}
          open={Boolean(surveillanceInformationEventId)}
          projectId={projectId}
        />
        </Suspense>
      ) : null}

      {correctiveActionFindingId ? (
        <Suspense fallback={null}>
        <CorrectiveActionWorkspaceModal
          initialFindingId={correctiveActionFindingId}
          onChanged={async () => {
            await Promise.all([
              detailQuery.refetch(),
              dossierDocumentSummaryQuery.refetch(),
              invalidatePersonalWorkflowQueries(queryClient),
            ]);
          }}
          onClose={() => {
            setCorrectiveActionWorkspacePlanId(null);
            setCorrectiveActionFindingId(null);
            void dossierDocumentSummaryQuery.refetch();
            void detailQuery.refetch();
          }}
          open={Boolean(correctiveActionWorkspacePlanId)}
          planId={correctiveActionWorkspacePlanId}
          roles={roles}
        />
        </Suspense>
      ) : null}


      {technicalReviewWorkspacePlanId ? (
        <Suspense fallback={null}>
        <TechnicalReviewWorkspaceModal
          onChanged={async () => {
            await Promise.all([
              detailQuery.refetch(),
              dossierDocumentSummaryQuery.refetch(),
              invalidatePersonalWorkflowQueries(queryClient),
            ]);
          }}
          onClose={() => {
            setTechnicalReviewWorkspacePlanId(null);
            void dossierDocumentSummaryQuery.refetch();
            void detailQuery.refetch();
          }}
          open={Boolean(technicalReviewWorkspacePlanId)}
          planId={technicalReviewWorkspacePlanId}
          roles={roles}
        />
        </Suspense>
      ) : null}

      {certificateIssuancePlanId ? (
        <Suspense fallback={null}>
        <CertificateIssuanceWorkspaceModal
          onChanged={async () => {
            await Promise.all([
              detailQuery.refetch(),
              dossierDocumentSummaryQuery.refetch(),
              invalidatePersonalWorkflowQueries(queryClient),
            ]);
          }}
          onClose={() => {
            setCertificateIssuancePlanId(null);
            void dossierDocumentSummaryQuery.refetch();
            void detailQuery.refetch();
          }}
          onStartStatusDecision={(preferredDecisionType) => {
            if (!certificateIssuancePlanId) return;
            setCertificateIssuancePlanId(null);
            setCertificationResultWorkspace({
              planId: certificateIssuancePlanId,
              focus: "decision",
              preferredDecisionType,
            });
          }}
          open={Boolean(certificateIssuancePlanId)}
          planId={certificateIssuancePlanId}
          roles={roles}
        />
        </Suspense>
      ) : null}

      {certificationResultWorkspace ? (
        <Suspense fallback={null}>
        <CertificationResultWorkspaceModal
          focus={certificationResultWorkspace?.focus ?? "overview"}
          preferredDecisionType={certificationResultWorkspace?.preferredDecisionType}
          onChanged={async () => {
            await Promise.all([
              detailQuery.refetch(),
              dossierDocumentSummaryQuery.refetch(),
              invalidatePersonalWorkflowQueries(queryClient),
            ]);
          }}
          onClose={() => {
            setCertificationResultWorkspace(null);
            void dossierDocumentSummaryQuery.refetch();
            void detailQuery.refetch();
          }}
          open={Boolean(certificationResultWorkspace)}
          planId={certificationResultWorkspace?.planId ?? null}
          roles={roles}
        />
        </Suspense>
      ) : null}

      {auditDocumentWorkspace ? (
        <Suspense fallback={null}>
        <AuditDocumentCenterModal
          focus={auditDocumentWorkspace?.focus ?? null}
          readOnly={!roles.some((role) => ["admin", "staff", "coordinator", "lead_auditor", "auditor"].includes(normalize(role)))}
          onChanged={async () => {
            await Promise.all([
              detailQuery.refetch(),
              dossierDocumentSummaryQuery.refetch(),
              invalidatePersonalWorkflowQueries(queryClient),
            ]);
          }}
          onClose={() => {
            setAuditDocumentWorkspace(null);
            void dossierDocumentSummaryQuery.refetch();
            void detailQuery.refetch();
          }}
          open={Boolean(auditDocumentWorkspace)}
          planId={auditDocumentWorkspace?.planId ?? null}
        />
        </Suspense>
      ) : null}

      <Modal
        cancelButtonProps={{ disabled: uploading }}
        cancelText="Hủy"
        className="document-version-modal"
        destroyOnHidden
        okButtonProps={{ disabled: !uploadFile, loading: uploading }}
        okText={uploadTarget?.currentVersion ? "Tạo phiên bản mới" : uploadTarget?.officialCopy ? "Tải lên PDF chính thức" : "Bổ sung vào hồ sơ"}
        onCancel={resetUploadDialog}
        onOk={() => void submitDocumentUpload()}
        open={Boolean(uploadTarget)}
        title={uploadTarget?.currentVersion ? "Cập nhật phiên bản tài liệu" : uploadTarget?.officialCopy ? "Tải lên PDF chính thức" : "Bổ sung tài liệu hồ sơ"}
      >
        <div className="document-upload-dialog">
          <div className="document-upload-context">
            <span>Loại tài liệu</span>
            <strong>{uploadTarget?.title}</strong>
            {uploadTarget?.currentVersion ? <small>Phiên bản hiện hành: {uploadTarget.currentVersion}</small> : null}
          </div>

          <label className="document-file-picker">
            <UploadOutlined />
            <span>{uploadFile ? uploadFile.name : uploadTarget?.pdfOnly ? "Chọn file PDF đã ký/xác nhận" : "Chọn PDF, Word, JPG hoặc PNG"}</span>
            <input
              accept={uploadTarget?.pdfOnly ? ".pdf,application/pdf" : ".pdf,.doc,.docx,.jpg,.jpeg,.png"}
              onChange={(event) => {
                setUploadFile(event.target.files?.[0] ?? null);
                setUploadError(null);
              }}
              type="file"
            />
          </label>

          <Input.TextArea
            maxLength={500}
            onChange={(event) => setUploadNote(event.target.value)}
            placeholder="Ghi chú cho phiên bản này (không bắt buộc)"
            rows={3}
            showCount
            value={uploadNote}
          />

          {uploadError ? <Alert description={uploadError} showIcon type="error" /> : null}
          <Alert
            description={uploadTarget?.officialCopy
              ? "Đây là bản PDF chính thức sau khi đã ký, đóng dấu, ký số hoặc được xác nhận theo quy trình của tổ chức. Hệ thống ưu tiên bản này khi xem hồ sơ và thẩm xét. Nếu tải lên phiên bản chính thức mới sau khi tài liệu đã được chấp nhận, hạng mục thẩm xét sẽ tự chuyển về chờ thẩm xét lại."
              : "Bản mới sẽ trở thành phiên bản hiện hành; bản cũ vẫn được giữ trong lịch sử. Nếu tài liệu thuộc bước thẩm xét, hồ sơ có thể được mở lại để kiểm tra theo đúng quy trình."}
            showIcon
            type="info"
          />
        </div>
      </Modal>

      {focusedExecutionWorkspace ? (
        <Suspense fallback={null}>
        <AuditExecutionWorkspaceModal
          mode={focusedExecutionWorkspace?.mode ?? "report"}
          onChanged={async () => {
            await Promise.all([
              detailQuery.refetch(),
              invalidatePersonalWorkflowQueries(queryClient),
            ]);
          }}
          onClose={() => setFocusedExecutionWorkspace(null)}
          open={Boolean(focusedExecutionWorkspace)}
          planId={focusedExecutionWorkspace?.planId ?? null}
          roles={roles}
        />
        </Suspense>
      ) : null}

      {coordinationTarget ? (
        <Suspense fallback={null}>
          <ScheduleResourcesScreen
          appointmentEditorOnly
          initialPlanId={coordinationTarget}
          onEditorClose={() => {
            setCoordinationTarget(null);
            void detailQuery.refetch();
          }}
          onOpenProject={() => undefined}
          roles={roles}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
