"use client";

import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  AuditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FolderOpenOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Input,
  List,
  Modal,
  Progress,
  Skeleton,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Tabs,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { isPdfDocument, openDocumentFile, previewDocumentFile } from "../lib/document-file-client";
import AuditProgramPanel from "./AuditProgramPanel";
import CommercialDocumentsPanel from "./CommercialDocumentsPanel";
import AuditPlanWorkspaceDrawer from "./AuditPlanWorkspaceDrawer";
import AuditExecutionWorkspaceModal, { type AuditExecutionWorkspaceMode } from "./AuditExecutionWorkspaceModal";
import CorrectiveActionWorkspaceModal from "./CorrectiveActionWorkspaceModal";
import TechnicalReviewWorkspaceModal from "./TechnicalReviewWorkspaceModal";
import CertificationResultWorkspaceModal from "./CertificationResultWorkspaceModal";
import CertificateIssuanceWorkspaceModal from "./CertificateIssuanceWorkspaceModal";
import AuditDocumentCenterModal, {
  type AuditDocumentCard,
  type AuditDocumentFocus,
  type AuditDocumentPreview,
  type AuditDocumentType,
} from "./AuditDocumentCenterModal";

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
}

interface AuditProgramSummary {
  id: string;
  program_code?: string | null;
  program_year?: number | null;
  organization_name?: string | null;
  standard_name?: string | null;
  certification_scope?: string | null;
}

interface AuditPlanDetail extends ProjectAuditPlan {
  audit_scope?: string | null;
  audit_criteria?: string | null;
  audit_objectives?: string | null;
  form_data?: Record<string, unknown> | null;
  audit_event?: {
    id: string;
    event_type?: string | null;
    status?: string | null;
    audit_programs?: AuditProgramSummary | null;
  } | null;
}

interface AuditTeamMember {
  id: string;
  team_role?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  experts?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: string | null;
  } | null;
}

interface AuditTeamAppointment {
  id: string;
  appointment_number?: string | null;
  appointment_date?: string | null;
  status?: string | null;
  approved_at?: string | null;
  approved_by_user?: {
    full_name?: string | null;
    username?: string | null;
  } | null;
  members?: AuditTeamMember[];
}

interface AuditReport {
  id: string;
  report_code?: string | null;
  version_no?: number | null;
  report_date?: string | null;
  audit_start_date?: string | null;
  audit_end_date?: string | null;
  audit_result?: string | null;
  conclusion?: string | null;
  status?: string | null;
}

interface AuditFinding {
  id: string;
  report_id: string;
  finding_code?: string | null;
  finding_type?: string | null;
  clause?: string | null;
  description?: string | null;
  due_date?: string | null;
  status?: string | null;
  corrective_actions?: Array<{
    id: string;
    version_no?: number | null;
    status?: string | null;
  }>;
}

interface AuditPlanWorkspace {
  plan: AuditPlanDetail;
  appointment: AuditTeamAppointment | null;
  reports: AuditReport[];
  findings: AuditFinding[];
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
}

interface DossierGroup {
  dossier_key: string;
  dossier_type: string;
  dossier_label: string;
  dossier_description?: string | null;
  sequence_no: number;
  plan_ids: string[];
  plan_codes?: Array<string | null>;
  planned_start_date?: string | null;
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
  onBack: () => void;
  onOpenAuditPlan: (planId: string) => void;
  onOpenTeamAssignment: (projectId: string) => void;
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

const teamRoleLabels: Record<string, string> = {
  team_leader: "Trưởng đoàn đánh giá",
  lead_auditor: "Trưởng đoàn đánh giá",
  auditor: "Chuyên gia đánh giá",
  technical_expert: "Chuyên gia kỹ thuật",
  observer: "Quan sát viên",
};

const findingTypeLabels: Record<string, string> = {
  major_nc: "NC nặng",
  minor_nc: "NC nhẹ",
  ofi: "Cơ hội cải tiến",
  observation: "Quan sát",
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

async function getOptionalData<T>(request: Promise<{ data: T }>): Promise<T | null> {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403 || status === 404) return null;
    throw error;
  }
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

function DossierStatusTag({ status }: { status: string }) {
  const normalized = normalize(status);
  if (normalized === "completed") {
    return <Tag color="green" icon={<CheckCircleOutlined />}>Đã có</Tag>;
  }
  if (normalized === "not_applicable") {
    return <Tag>Không áp dụng</Tag>;
  }
  return <Tag color="orange" icon={<ClockCircleOutlined />}>Còn thiếu</Tag>;
}

function cleanDocumentName(item: DossierItem) {
  if (item.document_key === "audit_log") return "Xác nhận đánh giá và ngày công";
  return item.document_name;
}

function alertIcon(severity: ProjectAlertItem["severity"]) {
  if (severity === "critical") return <WarningOutlined />;
  if (severity === "warning") return <ClockCircleOutlined />;
  return <CalendarOutlined />;
}

const dossierAuditDocumentDefinitions: Record<string, {
  documentType: AuditDocumentType;
  formCode: string;
  title: string;
}> = {
  audit_team_assignment: { documentType: "audit_team_assignment_f04", formCode: "F.04-P.09", title: "Chỉ định đoàn đánh giá" },
  audit_program: { documentType: "audit_program_f03", formCode: "F.03-P.09", title: "Chương trình đánh giá" },
  stage1_audit_plan: { documentType: "audit_plan_f05", formCode: "F.05-P.09", title: "Kế hoạch đánh giá Giai đoạn 1" },
  stage2_audit_plan: { documentType: "audit_plan_f05", formCode: "F.05-P.09", title: "Kế hoạch đánh giá Giai đoạn 2" },
  audit_plan: { documentType: "audit_plan_f05", formCode: "F.05-P.09", title: "Kế hoạch đánh giá" },
  audit_checklist: { documentType: "audit_checklist_f06", formCode: "F.06-P.09", title: "Bảng kiểm đánh giá" },
  opening_closing_attendance: { documentType: "audit_attendance_f07", formCode: "F.07-P.09", title: "Danh sách họp khai mạc/kết thúc" },
  audit_log: { documentType: "audit_log_f15", formCode: "F.15-P.09", title: "Xác nhận đánh giá và ngày công" },
  audit_monitoring: { documentType: "audit_monitoring_f17", formCode: "F.17-P.09", title: "Theo dõi quá trình đánh giá" },
  nc_cap: { documentType: "corrective_action_request_f10", formCode: "F.10-P.09", title: "Phiếu yêu cầu hành động khắc phục" },
  technical_review_report: { documentType: "technical_review_report_f11", formCode: "F.11-P.09", title: "Báo cáo thẩm xét kỹ thuật" },
};

function dossierAuditDocumentDefinition(documentKey?: string | null) {
  return dossierAuditDocumentDefinitions[normalize(documentKey)] ?? null;
}

function dossierFormCode(documentKey?: string | null) {
  const normalized = normalize(documentKey);
  if (normalized === "stage1_audit_report") return "F.09-P.09-01";
  if (["stage2_audit_report", "audit_report"].includes(normalized)) return "F.09-P.09-02";
  return dossierAuditDocumentDefinition(documentKey)?.formCode ?? null;
}

function normalizedAuditPlanType(plan?: ProjectAuditPlan | null) {
  return normalize(plan?.audit_type).replace(/[^a-z0-9]/g, "");
}

const workflowStageDefinitions = [
  {
    title: "Tiếp nhận hồ sơ",
    keys: ["certification_application", "application_review", "business_license"],
  },
  {
    title: "Chuẩn bị đánh giá",
    keys: ["audit_team_assignment", "audit_program", "stage1_audit_plan", "stage1_audit_report", "stage2_audit_plan"],
  },
  {
    title: "Đánh giá & khắc phục",
    keys: ["audit_checklist", "opening_closing_attendance", "stage2_audit_report", "nc_cap"],
  },
  {
    title: "Thẩm xét kỹ thuật",
    keys: ["technical_review_report"],
  },
  {
    title: "Kết quả chứng nhận",
    keys: ["audit_result_notification", "certification_decision"],
  },
  {
    title: "Phát hành & lưu hồ sơ",
    keys: ["certificate", "audit_log", "audit_monitoring"],
  },
] as const;

type WorkspaceTabKey = "overview" | "dossiers" | "documents";
type DossierSectionKey = "records" | "plans" | "review" | "documents";

const workspaceTabAccess: Record<string, WorkspaceTabKey[]> = {
  admin: ["overview", "dossiers", "documents"],
  staff: ["overview", "dossiers", "documents"],
  coordinator: ["overview", "dossiers", "documents"],
  auditor: ["overview", "dossiers", "documents"],
  lead_auditor: ["overview", "dossiers", "documents"],
  technical_reviewer: ["overview", "dossiers", "documents"],
  decision_maker: ["overview", "dossiers", "documents"],
  sales: ["overview", "documents"],
  customer: ["overview", "documents"],
};

function buildWorkflowStages(items: DossierItem[]) {
  const stages = workflowStageDefinitions.map((definition) => {
    const stageItems = items.filter((item) => definition.keys.some((key) => key === item.document_key));
    const applicableItems = stageItems.filter((item) => normalize(item.status) !== "not_applicable");
    const completedItems = applicableItems.filter((item) => normalize(item.status) === "completed");
    const isComplete = applicableItems.length > 0 && completedItems.length === applicableItems.length;

    return {
      title: definition.title,
      completed: completedItems.length,
      total: applicableItems.length,
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


function legacyDossierGroups(items: DossierItem[], plans: ProjectAuditPlan[]): DossierGroup[] {
  const auditItems = items.filter((item) => item.item_no >= 4);
  const initialPlanIds = plans
    .filter((plan) => ["stage1", "stage_1", "initial_stage1", "stage2", "stage_2", "initial_stage2", "initial"].includes(normalize(plan.audit_type)))
    .map((plan) => plan.id);
  const surveillancePlans = plans.filter((plan) => normalize(plan.audit_type).includes("surveillance"));

  const makeSummary = (groupItems: DossierItem[]) => {
    const applicable = groupItems.filter((item) => normalize(item.status) !== "not_applicable");
    const completed = applicable.filter((item) => normalize(item.status) === "completed");
    return {
      total_items: applicable.length,
      completed_items: completed.length,
      pending_items: applicable.length - completed.length,
      completion_percentage: applicable.length ? Math.round((completed.length / applicable.length) * 100) : 0,
      dossier_status: completed.length === applicable.length && applicable.length
        ? "completed"
        : completed.length ? "in_progress" : "not_started",
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
  onBack,
  onOpenAuditPlan,
  onOpenTeamAssignment,
}: CertificationProjectDetailScreenProps) {
  const [alertsVisible, setAlertsVisible] = useState(true);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTabKey>("overview");
  const [activeDossierSection, setActiveDossierSection] = useState<DossierSectionKey>("records");
  const [selectedDossierKey, setSelectedDossierKey] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [focusedExecutionWorkspace, setFocusedExecutionWorkspace] = useState<{
    planId: string;
    mode: AuditExecutionWorkspaceMode;
  } | null>(null);
  const [auditDocumentWorkspace, setAuditDocumentWorkspace] = useState<{
    planId: string;
    focus: AuditDocumentFocus;
  } | null>(null);
  const [correctiveActionWorkspacePlanId, setCorrectiveActionWorkspacePlanId] = useState<string | null>(null);
  const [technicalReviewWorkspacePlanId, setTechnicalReviewWorkspacePlanId] = useState<string | null>(null);
  const [certificationResultWorkspace, setCertificationResultWorkspace] = useState<{
    planId: string;
    focus: "overview" | "decision" | "notification";
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
  const canManageDocuments = roles.some((role) => documentManageRoles.has(normalize(role)));
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

  const dossierForDocumentSummary = (() => {
    const data = detailQuery.data;
    if (!data) return null;
    const groups = data.dossier.dossiers?.length
      ? [...data.dossier.dossiers].sort((left, right) => left.sequence_no - right.sequence_no)
      : legacyDossierGroups(data.dossier.items, data.project.audit_plans);
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
          : "Hãy hoàn thành nghiệp vụ này trước khi tải PDF đã ký/chốt.",
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
      setUploadError("Bản hồ sơ đã ký/chốt phải là file PDF.");
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
          ? `Đã tải bản PDF đã ký/chốt của ${uploadTarget.title}.`
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
    // Tuyệt đối không fallback GĐ2 sang PLAN GĐ1 vì sẽ tạo sai F.09-P.09-01.
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

  const documentCardsForDossierItem = (record: DossierItem): AuditDocumentCard[] => {
    const definition = dossierAuditDocumentDefinition(record.document_key);
    const plan = resolvePlanForDossierItem(record);
    if (!definition || !plan) return [];
    const preview = dossierDocumentSummaryQuery.data?.find((item) => item.plan.id === plan.id);
    return preview?.documents.filter((document) => document.document_type === definition.documentType) ?? [];
  };

  const resultFilesForDossierItem = (record: DossierItem): DossierFile[] => {
    if (!record.reference_id) return [];
    const key = normalize(record.document_key);
    const expectedType = key === "certification_decision"
      ? "certification_decision_f13"
      : key === "audit_result_notification"
        ? "audit_result_notification_f12"
        : key === "certificate"
          ? "certificate_pdf"
          : null;
    if (!expectedType) return [];
    return (detailQuery.data?.dossier.files ?? [])
      .filter((file) => file.entity_id === record.reference_id && normalize(file.document_type) === expectedType)
      .sort((left, right) => right.version_no - left.version_no);
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

  const latestDossierFile = (record: DossierItem) => dossierFilesForItem(record)[0] ?? null;
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

  const openDossierItem = async (record: DossierItem) => {
    const sourceDossier = detailQuery.data?.dossier;
    const normalizedKey = normalize(record.document_key);

    if (["stage1_audit_report", "stage2_audit_report", "audit_report"].includes(normalizedKey)) {
      const plan = resolvePlanForDossierItem(record);
      if (!plan) {
        setDocumentActionError(
          normalizedKey.includes("stage2")
            ? "Chưa có Kế hoạch đánh giá Giai đoạn 2. Hãy lập PLAN Giai đoạn 2 trước khi tạo F.09-P.09-02."
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

    if (normalizedKey === "audit_team_assignment") {
      onOpenTeamAssignment(projectId);
      return;
    }

    if (["stage1_audit_plan", "stage2_audit_plan", "audit_plan"].includes(normalizedKey) && record.reference_id) {
      onOpenAuditPlan(record.reference_id);
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

  const dossierColumns = useMemo<TableColumnsType<DossierItem>>(() => {
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
      title: "Nguồn dữ liệu",
      dataIndex: "storage_type",
      key: "storage_type",
      responsive: ["lg"],
      width: 150,
      render: (value: string, record) => dossierFormCode(record.document_key)
        ? "Biểu mẫu hệ thống"
        : value === "uploaded_file" ? "Tệp tải lên" : "Dữ liệu hệ thống",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (value: string, record) => {
        const cards = documentCardsForDossierItem(record);
        const generated = cards.filter((card) => card.history.length > 0);
        const resultFiles = resultFilesForDossierItem(record);
        return (
          <Space direction="vertical" size={2}>
            <DossierStatusTag status={value} />
            {cards.length ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {generated.length}/{cards.length} biểu đã sinh
              </Text>
            ) : resultFiles.length ? (
              <Text type="secondary" style={{ fontSize: 12 }}>Đã sinh Word/PDF</Text>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: "Phiên bản hiện hành",
      key: "current_version",
      responsive: ["md"],
      width: 165,
      render: (_, record) => {
        const cards = documentCardsForDossierItem(record);
        const cardFiles = cards.flatMap((card) => card.history.filter((file) => file.is_current));
        const resultFiles = resultFilesForDossierItem(record);
        const uploadedFiles = dossierFilesForItem(record);
        const officialPdf = signedDossierFile(record);
        const currentFiles = cards.length
          ? cardFiles
          : resultFiles.length
            ? resultFiles
            : uploadedFiles;
        if (!currentFiles.length && !officialPdf) return <Tag>Chưa có tệp</Tag>;
        const latestVersion = currentFiles.length
          ? Math.max(...currentFiles.map((file) => Number(file.version_no ?? 1)))
          : Number(officialPdf?.version_no ?? 1);
        return (
          <Space size={4} wrap>
            {officialPdf ? <Tag color="green">PDF đã chốt</Tag> : <Tag color="orange">Chưa chốt PDF</Tag>}
            <Tag>v{officialPdf?.version_no ?? latestVersion}</Tag>
            {officialPdf || currentFiles.some((file) => file.file_kind === "generated_pdf") ? <FilePdfOutlined /> : null}
            {!officialPdf && currentFiles.some((file) => file.file_kind !== "generated_pdf") ? <FileWordOutlined /> : null}
            {cards.length > 1 ? <Text type="secondary">{cards.length} biểu</Text> : null}
          </Space>
        );
      },
    },
    {
      title: "Thao tác",
      key: "document_action",
      align: "right",
      width: 330,
      render: (_, record) => {
        const key = normalize(record.document_key);
        const latestFile = latestDossierFile(record);
        const latestFileIsPdf = Boolean(latestFile && (latestFile.file_kind === "generated_pdf" || latestFile.original_name.toLowerCase().endsWith(".pdf")));
        let primaryAction = <></>;

        if (["stage1_audit_report", "stage2_audit_report", "audit_report"].includes(key)) {
          primaryAction = (
            <Button icon={<FileDoneOutlined />} onClick={() => void openDossierItem(record)} size="small" type="primary">
              Mở báo cáo
            </Button>
          );
        } else if (key === "nc_cap") {
          primaryAction = (
            <Button icon={<SafetyCertificateOutlined />} onClick={() => void openDossierItem(record)} size="small" type="primary">
              Mở NC/CAP
            </Button>
          );
        } else if (key === "technical_review_report") {
          primaryAction = (
            <Button icon={<AuditOutlined />} onClick={() => void openDossierItem(record)} size="small" type="primary">
              Mở thẩm xét
            </Button>
          );
        } else if (["certification_decision", "audit_result_notification"].includes(key)) {
          primaryAction = (
            <Button icon={<SafetyCertificateOutlined />} onClick={() => void openDossierItem(record)} size="small" type="primary">
              Mở kết quả
            </Button>
          );
        } else if (key === "certificate") {
          primaryAction = (
            <Button icon={<SafetyCertificateOutlined />} onClick={() => void openDossierItem(record)} size="small" type="primary">
              Mở chứng chỉ
            </Button>
          );
        } else if (dossierAuditDocumentDefinition(record.document_key)) {
          primaryAction = (
            <Button icon={<FileDoneOutlined />} onClick={() => openAuditDocumentWorkspace(record)} size="small" type="primary">
              Mở biểu
            </Button>
          );
        } else {
          primaryAction = (
            <Button icon={<EyeOutlined />} onClick={() => void openDossierItem(record)} size="small">
              Xem dữ liệu
            </Button>
          );
        }

        return (
          <Space size={4} wrap style={{ justifyContent: "flex-end" }}>
            {primaryAction}
            <Button
              disabled={!latestFile}
              icon={latestFileIsPdf ? <EyeOutlined /> : <FileWordOutlined />}
              loading={Boolean(latestFile && openingFileId === latestFile.id)}
              onClick={() => latestFile && void openDossierFile(latestFile)}
              size="small"
            >
              {latestFileIsPdf ? "Xem PDF" : "Tải Word"}
            </Button>
            {canManageDocuments && key !== "certificate" && normalize(record.status) !== "not_applicable" ? (
              <Button
                disabled={!record.entity_type || !record.entity_id}
                icon={<UploadOutlined />}
                onClick={() => startMissingDocumentUpload(record)}
                size="small"
                title={!record.entity_type || !record.entity_id
                  ? "Hoàn thành nghiệp vụ trước khi tải PDF đã ký/chốt"
                  : undefined}
              >
                {signedDossierFile(record) ? "Thay PDF chốt" : "Tải PDF chốt"}
              </Button>
            ) : null}
          </Space>
        );
      },
    }];

    return columns;
  }, [
    canManageDocuments,
    detailQuery.data?.dossier.files,
    dossierDocumentSummaryQuery.data,
    dossierForDocumentSummary,
    openingFileId,
  ]);

  const planColumns = useMemo<TableColumnsType<ProjectAuditPlan>>(() => [
    {
      title: "Mã kế hoạch",
      dataIndex: "plan_code",
      key: "plan_code",
      render: (value: string | null | undefined, record) => (
        <Button
          className="project-detail-code-button"
          onClick={() => setSelectedPlanId(record.id)}
          type="link"
        >
          {value || "Chưa cấp mã"}
        </Button>
      ),
    },
    {
      title: "Loại đánh giá",
      dataIndex: "audit_type",
      key: "audit_type",
      responsive: ["md"],
      render: (value?: string | null) => auditTypeLabels[normalize(value)] ?? readableStatus(value),
    },
    {
      title: "Thời gian",
      key: "planned_date",
      render: (_, record) => `${formatDate(record.planned_start_date)}${record.planned_end_date && record.planned_end_date !== record.planned_start_date ? ` – ${formatDate(record.planned_end_date)}` : ""}`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 135,
      render: (value?: string | null) => <ProjectStatusTag status={value} />,
    },
    {
      title: "",
      key: "action",
      align: "right",
      width: 92,
      render: (_, record) => (
        <Button icon={<EyeOutlined />} onClick={() => setSelectedPlanId(record.id)} size="small">
          Chi tiết
        </Button>
      ),
    },
  ], []);

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
  const allDossierGroups = dossier.dossiers?.length
    ? [...dossier.dossiers].sort((left, right) => left.sequence_no - right.sequence_no)
    : legacyDossierGroups(dossier.items, project.audit_plans);
  const dossierGroups = allDossierGroups.filter((group) => {
    const type = normalize(group.dossier_type);
    const key = normalize(group.dossier_key);
    return !type.includes("recertification") && !key.includes("recertification");
  });
  const commonDossierItems = dossier.common_items
    ?? dossier.items.filter((item) => item.item_no <= 3);
  const selectedDossier = dossierGroups.find((group) => group.dossier_key === selectedDossierKey)
    ?? dossierGroups.find((group) => group.dossier_key === dossier.current_dossier_key)
    ?? dossierGroups[0]
    ?? null;
  const workflowStages = selectedDossier ? buildWorkflowStages(selectedDossier.items) : [];
  const primaryRole = normalize(roles[0] ?? "staff");
  const accessibleTabs = workspaceTabAccess[primaryRole] ?? workspaceTabAccess.staff;
  const workspaceTabs = [
    { key: "overview" as const, label: "Tổng quan chung", icon: <AppstoreOutlined /> },
    { key: "dossiers" as const, label: "Hồ sơ theo kỳ", icon: <FolderOpenOutlined /> },
    { key: "documents" as const, label: "Tài liệu chung", icon: <SafetyCertificateOutlined /> },
  ].filter((tab) => accessibleTabs.includes(tab.key));
  const selectedPlanIds = new Set(selectedDossier?.plan_ids ?? []);
  const allDossierPlanIds = new Set(allDossierGroups.flatMap((group) => group.plan_ids));
  const selectedAuditPlans = project.audit_plans.filter((plan) => selectedPlanIds.has(plan.id));
  const selectedReviewItems = selectedDossier?.items.filter((item) => [
    "technical_review_report",
    "audit_result_notification",
    "certification_decision",
    "certificate",
  ].includes(item.document_key)) ?? [];
  const selectedDocumentItems = selectedDossier?.items.filter((item) => [
    "audit_checklist",
    "opening_closing_attendance",
    "certificate",
    "audit_log",
  ].includes(item.document_key)) ?? [];
  const selectedDossierFiles = dossier.files.filter((file) => selectedPlanIds.has(file.entity_id));
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
  const dossierSectionTabs = [
    { key: "records" as const, label: "Thành phần hồ sơ", icon: <FolderOpenOutlined /> },
    { key: "plans" as const, label: "Kế hoạch & đánh giá", icon: <AuditOutlined /> },
    { key: "review" as const, label: "Thẩm xét & kết quả", icon: <SolutionOutlined /> },
    { key: "documents" as const, label: "Tài liệu kỳ", icon: <FileDoneOutlined /> },
  ];

  const openDossier = (group: DossierGroup, section: DossierSectionKey = "records") => {
    setSelectedDossierKey(group.dossier_key);
    setActiveDossierSection(section);
    setActiveWorkspaceTab("dossiers");
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
            {activeWorkspaceTab === "dossiers" && selectedDossier ? <Tag color="geekblue">{selectedDossier.dossier_label}</Tag> : null}
          </div>
          <Text type="secondary">
            {customer?.company_name ?? "Chưa xác định khách hàng"} · {project.standard_name}
          </Text>
        </div>
        <Space wrap>
          {activeWorkspaceTab === "overview" ? <Button
              icon={alertsVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setAlertsVisible((visible) => !visible)}
            >
              {alertsVisible ? "Ẩn cảnh báo" : "Hiện cảnh báo"}
            </Button> : null}
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

      <Tabs
        activeKey={activeWorkspaceTab}
        className="project-workspace-tabs"
        items={workspaceTabs}
        onChange={(key) => setActiveWorkspaceTab(key as WorkspaceTabKey)}
      />

      {activeWorkspaceTab === "overview" ? <>
      <section className="project-detail-summary-grid" aria-label="Tiến độ hồ sơ đang theo dõi">
        <Card className="completion-card">
          <div className="completion-stat">
            <Progress
              percent={selectedSummary.completion_percentage}
              size={68}
              strokeColor="#1768bd"
              type="circle"
            />
            <div>
              <span>{selectedDossier?.dossier_label ?? "Hồ sơ hiện tại"}</span>
              <strong>{selectedSummary.completed_items}/{selectedSummary.total_items} thành phần</strong>
            </div>
          </div>
        </Card>
        <Card><Statistic prefix={<CheckCircleOutlined />} title="Đã có trong hồ sơ này" value={selectedSummary.completed_items} /></Card>
        <Card><Statistic prefix={<FolderOpenOutlined />} title="Còn thiếu trong hồ sơ này" value={selectedSummary.pending_items} /></Card>
        <Card><Statistic prefix={<WarningOutlined />} title="Cảnh báo toàn dự án" value={alerts.summary.total} /></Card>
      </section>

      <section className={`project-detail-primary-grid${alertsVisible ? "" : " project-detail-primary-grid-wide"}`}>
        <Card className="project-info-card" title="Thông tin xuyên suốt của dự án">
          <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small">
            <Descriptions.Item label="Khách hàng">{customer?.company_name ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Mã khách hàng">{customer?.customer_code ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Mã số thuế">{customer?.tax_code ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Đơn đăng ký">{application?.application_code ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Loại chứng nhận">{auditTypeLabels[normalize(application?.certification_type)] ?? readableStatus(application?.certification_type)}</Descriptions.Item>
            <Descriptions.Item label="Tiêu chuẩn">{project.standard_name}</Descriptions.Item>
            <Descriptions.Item label="Phạm vi" span={3}>{application?.certification_scope ?? "Chưa cập nhật"}</Descriptions.Item>
            <Descriptions.Item label="Hợp đồng">{project.contracts?.contract_number ?? "Chưa có"}</Descriptions.Item>
            <Descriptions.Item label="Thỏa thuận">{project.certification_agreements?.agreement_number ?? "Chưa có"}</Descriptions.Item>
            <Descriptions.Item label="Cập nhật gần nhất">{formatDate(project.updated_at)}</Descriptions.Item>
          </Descriptions>
        </Card>

        {alertsVisible ? <Card className="project-alert-card" title="Công việc & cảnh báo" extra={<Tag color={alerts.summary.critical ? "red" : alerts.summary.total ? "orange" : "green"}>{alerts.summary.total}</Tag>}>
          <List<ProjectAlertItem>
            dataSource={alerts.alerts.slice(0, 8)}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hồ sơ chưa có cảnh báo" /> }}
            renderItem={(item) => (
              <List.Item>
                <div className={`project-alert-item project-alert-${item.severity}`}>
                  <span>{alertIcon(item.severity)}</span>
                  <div>
                    <strong>{item.message}</strong>
                    {item.due_date ? <small>Hạn: {formatDate(item.due_date)}</small> : <small>Cần bổ sung vào hồ sơ</small>}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card> : null}
      </section>

      <Card
        className="project-detail-card dossier-cycle-overview"
        extra={<Text type="secondary">Chọn một kỳ để mở đúng bộ hồ sơ nghiệp vụ</Text>}
        title="Các kỳ đánh giá trong chu kỳ chứng nhận"
      >
        <div className="dossier-cycle-grid">
          {dossierGroups.map((group) => (
            <button
              className={`dossier-cycle-card${selectedDossier?.dossier_key === group.dossier_key ? " dossier-cycle-card-active" : ""}`}
              key={group.dossier_key}
              onClick={() => openDossier(group)}
              type="button"
            >
              <div className="dossier-cycle-card-heading">
                <strong>{group.dossier_label}</strong>
                {dossierStatusTag(group)}
              </div>
              <span>{group.dossier_description}</span>
              <Progress percent={group.summary.completion_percentage} showInfo={false} size="small" />
              <small>
                {group.summary.completed_items}/{group.summary.total_items} thành phần
                {group.plan_codes?.length ? ` · ${group.plan_codes.join(", ")}` : " · Chưa có kế hoạch"}
              </small>
            </button>
          ))}
        </div>
      </Card>

      <AuditProgramPanel
        application={application}
        auditPlans={project.audit_plans}
        onChanged={() => detailQuery.refetch().then(() => undefined)}
        onOpenTeamAssignment={onOpenTeamAssignment}
        projectCreatedAt={project.created_at}
        projectId={project.id}
        roles={roles}
      />
      </> : null}

      {activeWorkspaceTab === "dossiers" ? <>
      <Card
        className="project-detail-card dossier-selector-card dossier-workspace-selector"
        extra={selectedDossier ? dossierStatusTag(selectedDossier) : null}
        title="Chọn kỳ đánh giá"
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
            setSelectedDossierKey(key);
            setActiveDossierSection("records");
          }}
          size="small"
        />
      </Card>

      {selectedDossier ? <Card
        className="project-detail-card dossier-workspace-card"
        title={(
          <div className="dossier-workspace-title">
            <div>
              <strong>{selectedDossier.dossier_label}</strong>
              <span>{selectedDossier.dossier_description}</span>
            </div>
            <div className="dossier-workspace-meta">
              <span>Kế hoạch: {selectedDossier.plan_codes?.length ? selectedDossier.plan_codes.join(", ") : "Chưa lập"}</span>
              <span>Thời gian: {formatDate(selectedDossier.planned_start_date)}</span>
              <span>{selectedDossier.summary.completed_items}/{selectedDossier.summary.total_items} thành phần</span>
            </div>
          </div>
        )}
      >
        <Tabs
          activeKey={activeDossierSection}
          className="dossier-inner-tabs"
          items={dossierSectionTabs}
          onChange={(key) => setActiveDossierSection(key as DossierSectionKey)}
          size="small"
        />

        {documentActionMessage ? <Alert closable message={documentActionMessage} onClose={() => setDocumentActionMessage(null)} showIcon type="success" /> : null}
        {documentActionError ? <Alert closable message="Không thể thực hiện thao tác tài liệu" description={documentActionError} onClose={() => setDocumentActionError(null)} showIcon type="error" /> : null}

        {activeDossierSection === "records" ? <>
          <Card className="project-workflow-card dossier-workflow-card" title="Tiến trình của kỳ đánh giá này">
            <Steps items={workflowStages} responsive size="small" />
          </Card>
          <div className="dossier-form-stage-list">
            {workflowStageDefinitions.map((stage, stageIndex) => {
              const stageItems = selectedDossier.items.filter((item) => stage.keys.some((key) => key === item.document_key));
              if (!stageItems.length) return null;
              const completed = stageItems.filter((item) => normalize(item.status) === "completed").length;
              return (
                <Card
                  className="dossier-form-stage-card"
                  extra={<Tag color={completed === stageItems.length ? "green" : "blue"}>{completed}/{stageItems.length}</Tag>}
                  key={stage.title}
                  size="small"
                  title={<span><strong>{stageIndex + 1}. {stage.title}</strong><Text type="secondary"> · {stageItems.length} thành phần</Text></span>}
                >
                  <Table
                    columns={dossierColumns}
                    dataSource={stageItems}
                    pagination={false}
                    rowKey={(record) => `${selectedDossier.dossier_key}-${record.document_key}-${record.item_no}`}
                    size="middle"
                  />
                </Card>
              );
            })}
          </div>
        </> : null}

        {activeDossierSection === "plans" ? <Table
          columns={planColumns}
          dataSource={selectedAuditPlans}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Kỳ này chưa có kế hoạch đánh giá" /> }}
          pagination={false}
          rowKey="id"
          size="middle"
        /> : null}

        {activeDossierSection === "review" ? <Table
          columns={dossierColumns}
          dataSource={selectedReviewItems}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Kỳ này chưa phát sinh nội dung thẩm xét và kết quả" /> }}
          pagination={false}
          rowKey={(record) => `${selectedDossier.dossier_key}-review-${record.document_key}`}
          size="middle"
        /> : null}

        {activeDossierSection === "documents" ? <div className="dossier-document-workspace">
          <Table
            columns={dossierColumns}
            dataSource={selectedDocumentItems}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Kỳ này chưa có yêu cầu tài liệu riêng" /> }}
            pagination={false}
            rowKey={(record) => `${selectedDossier.dossier_key}-document-${record.document_key}`}
            size="middle"
          />
          <Divider orientation="left">Tệp đã lưu cho kỳ này</Divider>
          <List<DossierFile>
            dataSource={selectedDossierFiles}
            grid={{ gutter: 12, xs: 1, sm: 1, md: 2, lg: 3 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tệp gắn trực tiếp với kế hoạch của kỳ này" /> }}
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
        </div> : null}
      </Card> : null}
      </> : null}

      {activeWorkspaceTab === "documents" ? <>
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
        title="Hồ sơ và tài liệu dùng chung cho toàn chu kỳ"
      >
        <Table
          columns={dossierColumns}
          dataSource={commonDossierItems}
          pagination={false}
          rowKey={(record) => `common-${record.document_key}-${record.item_no}`}
          size="middle"
        />
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
      </> : null}

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

            <Divider orientation="left">Địa điểm chứng nhận</Divider>
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
              <Descriptions.Item label="Người kiểm tra">{displayUser(sourceReview.checker) || sourceReview.checked_by_name || "—"}</Descriptions.Item>
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
              <Divider orientation="left">Phạm vi ngành đã xác nhận</Divider>
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
              <Divider orientation="left">Yếu tố điều chỉnh và căn cứ</Divider>
              <List
                dataSource={[
                  ...reviewIncreaseFactors.map((item) => ({ ...item, _type: "Tăng" })),
                  ...reviewReductionFactors.map((item) => ({ ...item, _type: "Giảm" })),
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
              <Divider orientation="left">Lịch sử xử lý</Divider>
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

      <CorrectiveActionWorkspaceModal
        onChanged={async () => {
          await Promise.all([
            detailQuery.refetch(),
            dossierDocumentSummaryQuery.refetch(),
          ]);
        }}
        onClose={() => {
          setCorrectiveActionWorkspacePlanId(null);
          void dossierDocumentSummaryQuery.refetch();
          void detailQuery.refetch();
        }}
        open={Boolean(correctiveActionWorkspacePlanId)}
        planId={correctiveActionWorkspacePlanId}
        roles={roles}
      />


      <TechnicalReviewWorkspaceModal
        onChanged={async () => {
          await Promise.all([
            detailQuery.refetch(),
            dossierDocumentSummaryQuery.refetch(),
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

      <CertificateIssuanceWorkspaceModal
        onChanged={async () => {
          await Promise.all([
            detailQuery.refetch(),
            dossierDocumentSummaryQuery.refetch(),
          ]);
        }}
        onClose={() => {
          setCertificateIssuancePlanId(null);
          void dossierDocumentSummaryQuery.refetch();
          void detailQuery.refetch();
        }}
        open={Boolean(certificateIssuancePlanId)}
        planId={certificateIssuancePlanId}
        roles={roles}
      />

      <CertificationResultWorkspaceModal
        focus={certificationResultWorkspace?.focus ?? "overview"}
        onChanged={async () => {
          await Promise.all([
            detailQuery.refetch(),
            dossierDocumentSummaryQuery.refetch(),
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

      <AuditDocumentCenterModal
        focus={auditDocumentWorkspace?.focus ?? null}
        onChanged={async () => {
          await Promise.all([
            detailQuery.refetch(),
            dossierDocumentSummaryQuery.refetch(),
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

      <Modal
        cancelButtonProps={{ disabled: uploading }}
        cancelText="Hủy"
        className="document-version-modal"
        destroyOnHidden
        okButtonProps={{ disabled: !uploadFile, loading: uploading }}
        okText={uploadTarget?.currentVersion ? "Tạo phiên bản mới" : uploadTarget?.officialCopy ? "Tải PDF chốt" : "Bổ sung vào hồ sơ"}
        onCancel={resetUploadDialog}
        onOk={() => void submitDocumentUpload()}
        open={Boolean(uploadTarget)}
        title={uploadTarget?.currentVersion ? "Cập nhật phiên bản tài liệu" : uploadTarget?.officialCopy ? "Tải bản PDF đã ký/chốt" : "Bổ sung tài liệu hồ sơ"}
      >
        <div className="document-upload-dialog">
          <div className="document-upload-context">
            <span>Loại tài liệu</span>
            <strong>{uploadTarget?.title}</strong>
            {uploadTarget?.currentVersion ? <small>Phiên bản hiện hành: {uploadTarget.currentVersion}</small> : null}
          </div>

          <label className="document-file-picker">
            <UploadOutlined />
            <span>{uploadFile ? uploadFile.name : uploadTarget?.pdfOnly ? "Chọn file PDF đã ký/chốt" : "Chọn PDF, Word, JPG hoặc PNG"}</span>
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
              ? "Đây là bản PDF chính thức sau khi ký/đóng dấu hoặc ký số. Hệ thống ưu tiên bản này khi xem hồ sơ và khi thẩm xét. Nếu tải bản chốt mới sau khi tài liệu đã được chấp nhận, hạng mục thẩm xét sẽ tự chuyển về chờ thẩm xét lại."
              : "Bản mới sẽ trở thành phiên bản hiện hành; bản cũ vẫn được giữ trong lịch sử. Nếu tài liệu thuộc bước thẩm xét, hồ sơ có thể được mở lại để kiểm tra theo đúng quy trình."}
            showIcon
            type="info"
          />
        </div>
      </Modal>

      <AuditExecutionWorkspaceModal
        mode={focusedExecutionWorkspace?.mode ?? "report"}
        onChanged={() => detailQuery.refetch().then(() => undefined)}
        onClose={() => setFocusedExecutionWorkspace(null)}
        open={Boolean(focusedExecutionWorkspace)}
        planId={focusedExecutionWorkspace?.planId ?? null}
        roles={roles}
      />

      <AuditPlanWorkspaceDrawer
        onChanged={() => detailQuery.refetch().then(() => undefined)}
        onClose={() => setSelectedPlanId(null)}
        onOpenScheduling={onOpenAuditPlan}
        planId={selectedPlanId}
        roles={roles}
      />
    </div>
  );
}
