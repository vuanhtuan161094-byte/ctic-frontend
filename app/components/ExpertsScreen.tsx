"use client";

import {
  AuditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  IdcardOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  App,
  Alert,
  Avatar,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { documentRequestFromFile, openDocumentFile } from "../lib/document-file-client";
import { CompetencyEvidenceFields } from "./CompetencyEvidenceFields";
import ExpertDevelopmentPanel from "./ExpertDevelopmentPanel";
import ExpertResourceGovernancePanel from "./ExpertResourceGovernancePanel";

const { Text, Title } = Typography;

interface ExpertsScreenProps {
  roles: string[];
  selfService?: boolean;
  currentUserId?: string;
}

interface ExpertOverview {
  generated_at: string;
  experts: {
    total: number;
    active: number;
    inactive: number;
    linked_accounts: number;
    approved_profiles: number;
    pending_profiles: number;
  };
  competencies: {
    total: number;
    approved: number;
    draft: number;
    suspended: number;
    expiring_90_days: number;
    expired: number;
    evidence_gaps: number;
    review_overdue: number;
    review_due_90_days: number;
    management_action_required: number;
  };
  certificates: {
    expiring_90_days: number;
  };
}

interface AccountOption {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  status?: string | null;
  roles: string[];
  available: boolean;
  linked_expert?: {
    id: string;
    employee_code?: string | null;
    full_name: string;
  } | null;
}

interface ExpertListItem {
  id: string;
  user_id?: string | null;
  employee_code?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  organization?: string | null;
  job_title?: string | null;
  employment_type?: string | null;
  profile_status?: string | null;
  status?: string | null;
  user_account?: {
    id: string;
    username: string;
    email: string;
    full_name?: string | null;
    status?: string | null;
  } | null;
  competency_summary?: {
    total: number;
    approved: number;
    draft: number;
    suspended: number;
    expiring: number;
    programs: number;
    industry_codes: string[];
  };
  audit_summary?: {
    total: number;
    last_audit_date?: string | null;
  };
  certificate_summary?: {
    total: number;
  };
}

interface ExpertCompetency {
  action_records?: CompetencyAction[];
  id: string;
  expert_id: string;
  management_system: string;
  standard_code: string;
  competency_role: string;
  scope_level: string;
  iaf_code: string;
  nace_revision?: string | null;
  nace_code?: string | null;
  scope_description?: string | null;
  competency_level: string;
  approval_status: string;
  effective_date: string;
  expiry_date?: string | null;
  restriction?: string | null;
  approval_basis?: string | null;
  evidence_summary?: string | null;
  notes?: string | null;
  approved_at?: string | null;
  suspension_reason?: string | null;
  _count?: {
    evidence_records?: number;
    review_records?: number;
    action_records?: number;
  };
}

interface CompetencyAttachment {
  id: string;
  original_name: string;
  mime_type?: string | null;
  file_size?: number | null;
  sha256?: string | null;
  download_url?: string | null;
  created_at?: string | null;
}

interface CompetencyEvidence {
  id: string;
  competency_id: string;
  evidence_type: string;
  title: string;
  reference_no?: string | null;
  evidence_date?: string | null;
  valid_until?: string | null;
  result?: string | null;
  score?: number | string | null;
  mandays?: number | string | null;
  description?: string | null;
  status: string;
  voided_at?: string | null;
  void_reason?: string | null;
  created_at: string;
  added_by_user?: { full_name?: string | null; username?: string | null } | null;
  voided_by_user?: { full_name?: string | null; username?: string | null } | null;
  attachments: CompetencyAttachment[];
}

interface CompetencyReview {
  id: string;
  review_type: string;
  review_date: string;
  monitoring_methods: string;
  score?: number | string | null;
  result: string;
  finding?: string | null;
  required_action?: string | null;
  next_review_date?: string | null;
  created_at: string;
  reviewed_by_user?: { full_name?: string | null; username?: string | null } | null;
}

interface CompetencyAction {
  actor_id?: string | null;
  id: string;
  action_type: string;
  from_status?: string | null;
  to_status?: string | null;
  reason?: string | null;
  snapshot_json?: string | null;
  created_at: string;
  actor?: { full_name?: string | null; username?: string | null } | null;
}

interface ExpertCompetencyDetail extends ExpertCompetency {
  evidence_records: CompetencyEvidence[];
  review_records: CompetencyReview[];
  action_records: CompetencyAction[];
  governance: {
    validity_status: string;
    active_evidence_count: number;
    evidence_gap: boolean;
    latest_review?: CompetencyReview | null;
    review_due_date?: string | null;
    review_status: string;
    requires_management_action: boolean;
  };
}

interface ExpertWorkExperience {
  id: string;
  organization: string;
  position: string;
  start_date: string;
  end_date?: string | null;
  industry_codes?: string | null;
  responsibility?: string | null;
  achievement_note?: string | null;
}

interface ExpertCertificate {
  id: string;
  certificate_type: string;
  certificate_name: string;
  certificate_number?: string | null;
  issuing_organization?: string | null;
  standard_code?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_url?: string | null;
  note?: string | null;
}

interface AuditHistoryItem {
  id: string;
  team_role?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  planned_mandays?: number | string | null;
  actual_mandays?: number | string | null;
  assignment_status?: string | null;
  scopes?: Array<{
    iaf_code?: string | null;
    nace_code?: string | null;
    activity_description?: string | null;
  }>;
  audit_team_appointments?: {
    appointment_number?: string | null;
    status?: string | null;
    audit_plans?: {
      id: string;
      plan_code?: string | null;
      audit_type?: string | null;
      certification_projects?: {
        project_code?: string | null;
        standard_name?: string | null;
        certification_applications?: {
          customers?: {
            company_name?: string | null;
          } | null;
        } | null;
      } | null;
    } | null;
  } | null;
}

interface ExpertDetail extends ExpertListItem {
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  education_level?: string | null;
  specialization?: string | null;
  education_summary?: string | null;
  experience_summary?: string | null;
  approved_at?: string | null;
  suspension_reason?: string | null;
  account?: {
    id: string;
    username: string;
    email: string;
    full_name?: string | null;
    status?: string | null;
    roles: string[];
  } | null;
  programs: Array<{
    management_system: string;
    standard_code: string;
    roles: string[];
  }>;
  industry_codes: Array<{
    iaf_code: string;
    nace_code?: string | null;
    scope_description?: string | null;
    standard_code: string;
  }>;
  summary: {
    approved_competencies: number;
    pending_competencies: number;
    audit_count: number;
    work_experience_count: number;
    certificate_count: number;
  };
  competencies: ExpertCompetency[];
  work_experiences: ExpertWorkExperience[];
  certificates: ExpertCertificate[];
  audit_team_members: AuditHistoryItem[];
}

interface AuditPlanOption {
  id: string;
  plan_code?: string | null;
  audit_type?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  certification_projects?: {
    project_code?: string | null;
    standard_name?: string | null;
    certification_applications?: {
      customers?: {
        company_name?: string | null;
      } | null;
    } | null;
  } | null;
}

interface ExpertRecommendation {
  expert: {
    id: string;
    user_id?: string | null;
    employee_code?: string | null;
    full_name: string;
    email?: string | null;
    phone?: string | null;
    account?: {
      username: string;
      email: string;
    } | null;
  };
  eligible: boolean;
  match_status: string;
  reasons: string[];
  eligibility_reasons: Array<{
    code: string;
    message: string;
    severity: "BLOCK" | "WARNING";
  }>;
  checks: {
    account_linked: boolean;
    profile_approved: boolean;
    program_and_role: boolean;
    scope_complete: boolean;
    schedule_available: boolean;
    availability_available: boolean;
    independence_eligible: boolean;
    capacity_exceeded: boolean;
  };
  coverage: {
    covered: number;
    total: number;
    scopes: Array<{
      iaf_code: string;
      nace_code: string;
      scope_description?: string | null;
      qualified: boolean;
    }>;
  };
  availability: {
    available: boolean;
    conflicts: Array<{
      plan_code?: string | null;
      start_date: string;
      end_date: string;
    }>;
  };
  workload: {
    assigned_mandays: number;
    engagement_count: number;
    occupied_days: number;
    other_commitments: number;
  };
  competencies: ExpertCompetency[];
}

interface RecommendationResponse {
  plan: {
    id: string;
    plan_code?: string | null;
    project_code?: string | null;
    customer_name?: string | null;
    standard_code?: string | null;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
  };
  required_scopes: Array<{
    iaf_code: string;
    nace_code: string;
    scope_description?: string | null;
  }>;
  recommendations: ExpertRecommendation[];
}

interface ExpertFormValues {
  user_id: string;
  employee_code?: string;
  phone?: string;
  date_of_birth?: Dayjs;
  gender?: string;
  address?: string;
  employment_type?: string;
  organization?: string;
  job_title?: string;
  education_level?: string;
  specialization?: string;
  education_summary?: string;
  experience_summary?: string;
  status: string;
}

interface CompetencyFormValues {
  management_system: string;
  standard_code: string;
  competency_role: string;
  scope_level: string;
  iaf_code: string;
  iaf_codes: string[];
  nace_revision?: string;
  nace_code?: string;
  scope_description?: string;
  effective_date: Dayjs;
  expiry_date?: Dayjs;
  approval_basis?: string;
  evidence_summary?: string;
  restriction?: string;
  notes?: string;
}

interface CompetencyEvidenceFormValues {
  evidence_type: string;
  title: string;
  reference_no?: string;
  evidence_date?: Dayjs;
  valid_until?: Dayjs;
  result?: string;
  score?: number;
  mandays?: number;
  description?: string;
}

interface CompetencyVoidEvidenceFormValues {
  reason: string;
}

interface CompetencySuspendFormValues {
  reason: string;
}

interface CompetencyReviewFormValues {
  review_type: string;
  review_date: Dayjs;
  monitoring_methods: string;
  score?: number;
  result: string;
  finding?: string;
  required_action?: string;
  next_review_date?: Dayjs;
}

interface CompetencyRenewFormValues {
  effective_date: Dayjs;
  expiry_date: Dayjs;
  decision_basis: string;
  note?: string;
}

interface CompetencyReactivateFormValues {
  effective_date?: Dayjs;
  expiry_date?: Dayjs;
  decision_basis: string;
  note?: string;
}

interface WorkExperienceFormValues {
  organization: string;
  position: string;
  start_date: Dayjs;
  end_date?: Dayjs;
  industry_codes?: string;
  responsibility?: string;
  achievement_note?: string;
}

interface CertificateFormValues {
  certificate_type: string;
  certificate_name: string;
  certificate_number?: string;
  issuing_organization?: string;
  standard_code?: string;
  issue_date?: Dayjs;
  expiry_date?: Dayjs;
  credential_url?: string;
  note?: string;
}

const managementSystemOptions = [
  { value: "QMS", label: "QMS · ISO 9001" },
  { value: "EMS", label: "EMS · ISO 14001" },
  { value: "OHSMS", label: "OH&SMS · ISO 45001" },
  { value: "ISMS", label: "ISMS · ISO 27001" },
  { value: "ENERGY", label: "EnMS · ISO 50001" },
];

const standardBySystem: Record<string, string> = {
  QMS: "ISO 9001:2015",
  EMS: "ISO 14001:2015",
  OHSMS: "ISO 45001:2018",
  ISMS: "ISO 27001:2022",
  ENERGY: "ISO 50001:2018",
};

const competencyRoleOptions = [
  { value: "AUDITOR", label: "Chuyên gia đánh giá" },
  { value: "LEAD_AUDITOR", label: "Trưởng đoàn đánh giá" },
  { value: "TECHNICAL_EXPERT", label: "Chuyên gia kỹ thuật" },
  { value: "APPLICATION_REVIEWER", label: "Thẩm xét đăng ký" },
  { value: "TECHNICAL_REVIEWER", label: "Thẩm xét viên kỹ thuật" },
  { value: "CERTIFICATION_DECISION_MAKER", label: "Người ra quyết định" },
  { value: "WITNESS_EVALUATOR", label: "Đánh giá viên chứng kiến" },
  { value: "TRAINER", label: "Giảng viên" },
];

const recommendationRoleOptions = [
  { value: "TEAM_LEADER", label: "Trưởng đoàn đánh giá" },
  { value: "AUDITOR", label: "Chuyên gia đánh giá" },
  { value: "TECHNICAL_EXPERT", label: "Chuyên gia kỹ thuật" },
  { value: "WITNESS_EVALUATOR", label: "Đánh giá viên chứng kiến" },
];

const competencyEvidenceTypeOptions = [
  { value: "TRAINING_CERTIFICATE", label: "Đào tạo / chứng chỉ" },
  { value: "AUDIT_LOG", label: "Nhật ký / kinh nghiệm đánh giá" },
  { value: "WORK_EXPERIENCE", label: "Kinh nghiệm công việc" },
  { value: "WITNESS_ASSESSMENT", label: "Đánh giá chứng kiến" },
  { value: "INTERVIEW_TEST", label: "Phỏng vấn / kiểm tra" },
  { value: "CUSTOMER_FEEDBACK", label: "Phản hồi khách hàng" },
  { value: "AUDIT_REPORT_REVIEW", label: "Xem xét báo cáo đánh giá" },
  { value: "OTHER", label: "Bằng chứng khác" },
];

const competencyReviewTypeOptions = [
  { value: "PERIODIC", label: "Đánh giá định kỳ" },
  { value: "UNSCHEDULED", label: "Đánh giá đột xuất" },
  { value: "RENEWAL", label: "Đánh giá gia hạn" },
  { value: "SCOPE_EXTENSION", label: "Đánh giá mở rộng phạm vi" },
];

const competencyReviewResultOptions = [
  { value: "SATISFACTORY", label: "Đạt yêu cầu" },
  { value: "IMPROVEMENT_REQUIRED", label: "Cần cải thiện" },
  { value: "UNSATISFACTORY", label: "Không đạt" },
];

const evidenceTypeLabels: Record<string, string> = Object.fromEntries(
  competencyEvidenceTypeOptions.map((item) => [item.value, item.label]),
);

const reviewTypeLabels: Record<string, string> = Object.fromEntries(
  competencyReviewTypeOptions.map((item) => [item.value, item.label]),
);

const reviewResultLabels: Record<string, string> = Object.fromEntries(
  competencyReviewResultOptions.map((item) => [item.value, item.label]),
);

const roleLabels: Record<string, string> = Object.fromEntries(
  competencyRoleOptions.map((item) => [item.value, item.label]),
);

const teamRoleLabels: Record<string, string> = {
  TEAM_LEADER: "Trưởng đoàn đánh giá",
  AUDITOR: "Chuyên gia đánh giá",
  TECHNICAL_EXPERT: "Chuyên gia kỹ thuật",
  WITNESS_EVALUATOR: "Đánh giá viên chứng kiến",
  TRAINEE: "Chuyên gia tập sự",
  OBSERVER: "Quan sát viên",
};

const approvalLabels: Record<string, string> = {
  DRAFT: "Dự thảo",
  PENDING_APPROVAL: "Chờ phê duyệt",
  RETURNED: "Cần bổ sung",
  APPROVED: "Đã phê duyệt",
  SUSPENDED: "Tạm đình chỉ",
};

const approvalColors: Record<string, string> = {
  PENDING_APPROVAL: "gold",
  RETURNED: "orange",
  DRAFT: "gold",
  APPROVED: "green",
  SUSPENDED: "red",
};

const matchLabels: Record<string, string> = {
  ELIGIBLE: "Đủ điều kiện",
  SCHEDULE_CONFLICT: "Trùng lịch",
  INSUFFICIENT_SCOPE: "Thiếu phạm vi",
  DATE_CONFLICT: "Trùng lịch",
  LEAVE: "Đang nghỉ phép",
  UNAVAILABLE: "Không sẵn sàng",
  OTHER_COMMITMENT: "Có cam kết khác",
  COMPETENCY_NOT_ELIGIBLE: "Chưa đủ năng lực",
  INDEPENDENCE_CONFLICT: "Xung đột độc lập",
  INDEPENDENCE_RESTRICTED: "Hạn chế độc lập",
  REMOTE_WORKLOAD: "Có workload từ xa",
};

const matchColors: Record<string, string> = {
  ELIGIBLE: "green",
  SCHEDULE_CONFLICT: "red",
  INSUFFICIENT_SCOPE: "gold",
  DATE_CONFLICT: "red",
  LEAVE: "red",
  UNAVAILABLE: "red",
  OTHER_COMMITMENT: "gold",
  COMPETENCY_NOT_ELIGIBLE: "red",
  INDEPENDENCE_CONFLICT: "red",
  INDEPENDENCE_RESTRICTED: "orange",
  REMOTE_WORKLOAD: "gold",
};

const certificateTypeOptions = [
  { value: "AUDITOR", label: "Chứng chỉ chuyên gia đánh giá" },
  { value: "LEAD_AUDITOR", label: "Chứng chỉ trưởng đoàn" },
  { value: "TECHNICAL", label: "Chứng chỉ chuyên môn kỹ thuật" },
  { value: "TRAINING", label: "Chứng nhận đào tạo" },
  { value: "EDUCATION", label: "Bằng cấp" },
  { value: "OTHER", label: "Khác" },
];

function normalize(value?: string | null) {
  return (value ?? "").trim().toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY") : "—";
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "—";
  if (start === end || !end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function profileStatusTag(value?: string | null) {
  const key = normalize(value || "DRAFT");
  return <Tag color={approvalColors[key] ?? "default"}>{approvalLabels[key] ?? key}</Tag>;
}

function activityStatusTag(value?: string | null) {
  const active = (value ?? "active").toLowerCase() === "active";
  return (
    <Tag color={active ? "green" : "default"} icon={active ? <CheckCircleOutlined /> : <StopOutlined />}>
      {active ? "Đang hoạt động" : "Ngừng hoạt động"}
    </Tag>
  );
}

function certificateStatus(expiryDate?: string | null) {
  if (!expiryDate) return <Tag>Không giới hạn</Tag>;
  const days = dayjs(expiryDate).startOf("day").diff(dayjs().startOf("day"), "day");
  if (days < 0) return <Tag color="red">Đã hết hạn</Tag>;
  if (days <= 90) return <Tag color="gold">Sắp hết hạn</Tag>;
  return <Tag color="green">Còn hiệu lực</Tag>;
}

function governanceValidityTag(value?: string | null) {
  const key = normalize(value);
  const labels: Record<string, string> = {
    DRAFT: "Dự thảo",
    SUSPENDED: "Đình chỉ",
    NOT_YET_EFFECTIVE: "Chưa hiệu lực",
    EXPIRED: "Hết hiệu lực",
    EXPIRING_90_DAYS: "Sắp hết hiệu lực",
    ACTIVE: "Có hiệu lực",
  };
  const colors: Record<string, string> = {
    DRAFT: "gold",
    SUSPENDED: "red",
    NOT_YET_EFFECTIVE: "blue",
    EXPIRED: "red",
    EXPIRING_90_DAYS: "gold",
    ACTIVE: "green",
  };
  return <Tag color={colors[key] ?? "default"}>{(labels[key] ?? key) || "—"}</Tag>;
}

function reviewStatusTag(value?: string | null) {
  const key = normalize(value);
  const labels: Record<string, string> = {
    OVERDUE: "Quá hạn đánh giá",
    DUE_90_DAYS: "Đến hạn trong 90 ngày",
    CURRENT: "Đang trong chu kỳ",
    NOT_SCHEDULED: "Chưa lập kỳ đánh giá",
  };
  const colors: Record<string, string> = {
    OVERDUE: "red",
    DUE_90_DAYS: "gold",
    CURRENT: "green",
    NOT_SCHEDULED: "default",
  };
  return <Tag color={colors[key] ?? "default"}>{(labels[key] ?? key) || "—"}</Tag>;
}

function reviewResultTag(value?: string | null) {
  const key = normalize(value);
  const colors: Record<string, string> = {
    SATISFACTORY: "green",
    IMPROVEMENT_REQUIRED: "gold",
    UNSATISFACTORY: "red",
  };
  return <Tag color={colors[key] ?? "default"}>{(reviewResultLabels[key] ?? key) || "—"}</Tag>;
}

function actorName(value?: { full_name?: string | null; username?: string | null } | null) {
  return value?.full_name || value?.username || "—";
}

type OwnCompetency = ExpertCompetency & {
  evidence_records: CompetencyEvidence[];
  action_records: CompetencyAction[];
};

function CompetencyRoleField() {
  const form = Form.useFormInstance();
  const role = Form.useWatch("competency_role", form);
  const secondary = Boolean(role && !["AUDITOR", "LEAD_AUDITOR"].includes(role));
  return <div><Form.Item name="competency_role" label="Vai trò" rules={[{ required: true }]}>
    <Select options={secondary ? competencyRoleOptions.filter((option) => ["AUDITOR", "LEAD_AUDITOR", role].includes(option.value)) : competencyRoleOptions.slice(0, 2)} />
  </Form.Item>
  {role === "LEAD_AUDITOR" ? <Text type="secondary">Bao gồm vai trò chuyên gia đánh giá trong cùng tiêu chuẩn và IAF.</Text> : null}</div>;
}

function CompetencyIafField({ selfService = false, editing = false }: { selfService?: boolean; editing?: boolean }) {
  const form = Form.useFormInstance();
  const legacyScope = Form.useWatch("scope_level", { form, preserve: true }) === "NACE";
  const query = useQuery({ queryKey: ["competency-iaf-catalog", selfService],
    queryFn: async () => (await api.get<Array<{ iaf_code: string; iaf_name: string }>>(selfService ? "/expert-competencies/me/iaf-scopes" : "/industry-classifications/iaf-scopes?active=true")).data });
  return <div><Form.Item name="iaf_codes" label="Phạm vi IAF" rules={[{ required: true, type: "array", min: 1 }]}>
    <Select mode="multiple" maxCount={editing ? 1 : undefined} showSearch optionFilterProp="label" loading={query.isPending} disabled={query.isError || (editing && legacyScope)}
      optionRender={(option) => <span style={{ whiteSpace: "normal" }}>{option.label}</span>}
      options={(query.data ?? []).map((row) => ({ value: row.iaf_code, label: `IAF ${row.iaf_code} — ${row.iaf_name}` }))} />
  </Form.Item>{query.isError ? <Alert type="error" title={getErrorMessage(query.error)} /> : null}</div>;
}

function OwnEvidenceFiles({ evidence, editable }: { evidence: CompetencyEvidence; editable: boolean }) {
  const { message } = App.useApp();
  const query = useQuery({ queryKey: ["own-evidence-files", evidence.id], queryFn: async () =>
    (await api.get<CompetencyAttachment[]>(`/document-files/self/competency-evidence/${evidence.id}/files`)).data });
  const upload = useMutation({ mutationFn: async (file: File) => { const data = new FormData(); data.append("file", file);
    await api.post(`/document-files/self/competency-evidence/${evidence.id}/files`, data); },
    onSuccess: async () => { await query.refetch(); message.success("Đã tải tệp bằng chứng"); }, onError: (e) => message.error(getErrorMessage(e)) });
  return <div><Text strong>{evidence.title}</Text> <Text type="secondary">{evidence.reference_no}</Text>
    {query.isError ? <Alert type="error" title={getErrorMessage(query.error)} /> : null}
    {(query.data ?? []).map((file) => <Button key={file.id} size="small" onClick={() => void openDocumentFile({
      url: `/document-files/self/competency-files/${file.id}/download`, filename: file.original_name,
    }).catch((e) => message.error(getErrorMessage(e)))}>{file.original_name}</Button>)}
    {editable && evidence.status === "ACTIVE" ? <label>Tệp đính kèm <input accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" type="file" aria-label={`Tệp đính kèm ${evidence.title}`} disabled={upload.isPending}
      onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = ""; }} /></label> : null}
  </div>;
}

function OwnCompetenciesWorkspace() {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [editor, setEditor] = useState<OwnCompetency | "new" | null>(null);
  const [evidenceFor, setEvidenceFor] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [form] = Form.useForm<CompetencyFormValues>();
  const [evidenceForm] = Form.useForm<CompetencyEvidenceFormValues>();
  const query = useQuery({
    queryKey: ["expert-competencies", "me"],
    queryFn: async () => (await api.get<OwnCompetency[]>("/expert-competencies/me")).data,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["expert-competencies", "me"] });
  const save = useMutation({
    mutationFn: async (values: CompetencyFormValues) => {
      const payload = {
        management_system: values.management_system, standard_code: values.standard_code,
        competency_role: values.competency_role,
        iaf_code: values.iaf_codes?.[0],
        effective_date: values.effective_date.format("YYYY-MM-DD"),
        expiry_date: values.expiry_date?.format("YYYY-MM-DD"),
        evidence_summary: values.evidence_summary,
        approval_basis: values.approval_basis,
        restriction: values.restriction,
      };
      return editor && editor !== "new"
        ? api.patch(`/expert-competencies/me/${editor.id}`, payload)
        : api.post("/expert-competencies/me/batch", { ...payload, iaf_code: undefined, scope_level: undefined, nace_code: undefined, nace_revision: undefined, iaf_codes: values.iaf_codes });
    },
    onSuccess: async () => { setEditor(null); await refresh(); message.success("Đã lưu dự thảo năng lực"); },
    onError: (e) => message.error(getErrorMessage(e)),
  });
  const submit = useMutation({
    mutationFn: (id: string) => api.post(`/expert-competencies/me/${id}/submit`),
    onSuccess: async () => { await refresh(); message.success("Đã gửi phê duyệt"); },
    onError: (e) => message.error(getErrorMessage(e)),
  });
  const evidence = useMutation({
    mutationFn: async (values: CompetencyEvidenceFormValues) => {
      if (!evidenceFor) throw new Error("Chưa chọn hồ sơ năng lực");
      const created = (await api.post<CompetencyEvidence>(`/expert-competencies/me/${evidenceFor}/evidence`, {
        evidence_type: values.evidence_type,
        title: values.title,
        reference_no: values.reference_no,
        description: values.description,
        evidence_date: values.evidence_date?.format("YYYY-MM-DD"),
        valid_until: values.valid_until?.format("YYYY-MM-DD"),
        result: values.result,
        score: values.score,
        mandays: values.mandays,
      })).data;
      if (evidenceFile) {
        const data = new FormData();
        data.append("file", evidenceFile);
        await api.post(`/document-files/self/competency-evidence/${created.id}/files`, data);
      }
      return created;
    },
    onSuccess: async () => {
      setEvidenceFor(null);
      setEvidenceFile(null);
      evidenceForm.resetFields();
      await refresh();
      message.success("Đã bổ sung bằng chứng");
    },
    onError: (e) => message.error(getErrorMessage(e)),
  });
  const edit = (row?: OwnCompetency) => {
    form.resetFields();
    form.setFieldsValue(row ? { management_system: row.management_system, standard_code: row.standard_code,
      competency_role: row.competency_role, scope_level: row.scope_level, iaf_code: row.iaf_code, iaf_codes: [row.iaf_code],
      nace_code: row.nace_code ?? undefined, effective_date: dayjs(row.effective_date),
      expiry_date: row.expiry_date ? dayjs(row.expiry_date) : undefined, evidence_summary: row.evidence_summary ?? undefined,
      approval_basis: row.approval_basis ?? undefined, restriction: row.restriction ?? undefined } : {
      management_system: "QMS", standard_code: "ISO 9001:2015", competency_role: "AUDITOR",
      scope_level: "IAF", effective_date: dayjs(),
    });
    setEditor(row ?? "new");
  };
  const editable = (row: OwnCompetency) => ["DRAFT", "RETURNED"].includes(row.approval_status);
  return <section className="experts-screen" aria-label="Năng lực của tôi">
    <Space wrap><Title level={3}>Năng lực của tôi</Title><Button onClick={() => edit()} disabled={query.isError || query.isPending}>Thêm năng lực</Button><Button onClick={() => void query.refetch()}>Tải lại</Button></Space>
    {query.isError ? <Alert type="error" showIcon title={getErrorMessage(query.error)} /> : null}
    <Table<OwnCompetency> rowKey="id" dataSource={query.data ?? []} loading={query.isPending} size="small" scroll={{ x: 900 }}
      expandable={{ expandedRowRender: (row) => <Space direction="vertical"><Text>{row.evidence_summary || "Chưa có tóm tắt bằng chứng"}</Text>{row.evidence_records.length ? row.evidence_records.map((item) => <OwnEvidenceFiles key={item.id} evidence={item} editable={editable(row)} />) : <Text>Chưa có bằng chứng. Chọn “Bổ sung bằng chứng” để thêm thông tin và tệp minh chứng.</Text>}</Space> }}
      columns={[
        { title: "Tiêu chuẩn / hệ thống", render: (_, row) => <>{row.standard_code}<div>{row.management_system}</div></> },
        { title: "Vai trò", dataIndex: "competency_role", render: (value) => competencyRoleOptions.find((r) => r.value === value)?.label ?? value },
        { title: "IAF / NACE", render: (_, row) => <>{row.iaf_code}{row.nace_code ? ` / ${row.nace_code}` : ""}</> },
        { title: "Hiệu lực", render: (_, row) => formatDateRange(row.effective_date, row.expiry_date) },
        { title: "Trạng thái", render: (_, row) => <>{profileStatusTag(row.approval_status)}{row.approval_status === "RETURNED" ? <div><Text type="danger">{row.action_records[0]?.reason}</Text></div> : null}</> },
        { title: "Thao tác", render: (_, row) => editable(row) ? <Space wrap>
          <Button size="small" onClick={() => edit(row)}>Sửa</Button>
          <Button size="small" onClick={() => {
            evidenceForm.resetFields();
            evidenceForm.setFieldsValue({ evidence_type: "OTHER", evidence_date: dayjs() });
            setEvidenceFile(null);
            setEvidenceFor(row.id);
          }}>Bổ sung bằng chứng</Button>
          <Popconfirm title="Gửi năng lực này để phê duyệt?" onConfirm={() => submit.mutateAsync(row.id)}><Button size="small" loading={submit.isPending}>Gửi phê duyệt</Button></Popconfirm>
        </Space> : null },
      ]}
    />
    <Modal className="competency-editor" width={680} title={editor === "new" ? "Thêm năng lực" : "Sửa năng lực"} open={editor !== null} onCancel={() => setEditor(null)} confirmLoading={save.isPending} onOk={() => void form.validateFields().then((v) => save.mutate(v))} okText="Lưu dự thảo">
      <Form form={form} layout="vertical">
        <div className="competency-form-grid">
        <Form.Item name="management_system" label="Chương trình" rules={[{ required: true }]}><Select onChange={(value) => form.setFieldValue("standard_code", standardBySystem[value])} options={managementSystemOptions} /></Form.Item>
        <Form.Item name="standard_code" label="Tiêu chuẩn" rules={[{ required: true }]}><Input /></Form.Item>
        <CompetencyRoleField />
        <CompetencyIafField selfService editing={editor !== "new"} />
        {editor && editor !== "new" && editor.scope_level === "NACE" ? <Text>Phạm vi NACE cũ {editor.nace_code} được giữ nguyên.</Text> : null}
        <Form.Item name="effective_date" label="Hiệu lực từ" rules={[{ required: true }]}><DatePicker /></Form.Item>
        <Form.Item name="expiry_date" label="Hiệu lực đến"><DatePicker /></Form.Item>
        </div>
        <Form.Item name="evidence_summary" label="Tóm tắt bằng chứng"><Input.TextArea rows={2} /></Form.Item>
        <Text type="secondary">Sau khi lưu dự thảo, chọn “Bổ sung bằng chứng” để nhập thông tin và đính kèm tệp.</Text>
        <Form.Item name="approval_basis" label="Cơ sở phê duyệt / ghi chú"><Input.TextArea rows={2} /></Form.Item>
        <details><summary>Hạn chế năng lực (không bắt buộc)</summary><Form.Item name="restriction"><Input.TextArea rows={2} /></Form.Item></details>
      </Form>
    </Modal>
    <Modal
      title="Bổ sung bằng chứng"
      open={evidenceFor !== null}
      onCancel={() => { setEvidenceFor(null); setEvidenceFile(null); evidenceForm.resetFields(); }}
      confirmLoading={evidence.isPending}
      onOk={() => void evidenceForm.validateFields().then((v) => evidence.mutate(v))}
      width={720}
    >
      <Form form={evidenceForm} layout="vertical">
        <CompetencyEvidenceFields form={evidenceForm} file={evidenceFile} onFileChange={setEvidenceFile} />
      </Form>
    </Modal>
  </section>;
}

export function ExpertsScreen({ roles, selfService = false, currentUserId }: ExpertsScreenProps) {
  return selfService ? <OwnCompetenciesWorkspace /> : <ManagedExpertsScreen roles={roles} currentUserId={currentUserId} />;
}

function ManagedExpertsScreen({ roles, currentUserId }: ExpertsScreenProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileMode, setProfileMode] = useState<"create" | "edit">("create");
  const [competencyModalOpen, setCompetencyModalOpen] = useState(false);
  const [editingCompetencyId, setEditingCompetencyId] = useState<string | null>(null);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string | null>(null);
  const [competencyEvidenceModalOpen, setCompetencyEvidenceModalOpen] = useState(false);
  const [competencyReviewModalOpen, setCompetencyReviewModalOpen] = useState(false);
  const [competencyVoidEvidenceId, setCompetencyVoidEvidenceId] = useState<string | null>(null);
  const [competencySuspendTargetId, setCompetencySuspendTargetId] = useState<string | null>(null);
  const [competencyRenewModalOpen, setCompetencyRenewModalOpen] = useState(false);
  const [competencyReactivateModalOpen, setCompetencyReactivateModalOpen] = useState(false);
  const [competencyEvidenceFile, setCompetencyEvidenceFile] = useState<File | null>(null);
  const [workModalOpen, setWorkModalOpen] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);
  const [recommendationModalOpen, setRecommendationModalOpen] = useState(false);
  const [recommendationPlanId, setRecommendationPlanId] = useState<string>();
  const [recommendationRole, setRecommendationRole] = useState("TEAM_LEADER");
  const [profileForm] = Form.useForm<ExpertFormValues>();
  const [competencyForm] = Form.useForm<CompetencyFormValues>();
  const [competencyEvidenceForm] = Form.useForm<CompetencyEvidenceFormValues>();
  const [competencyReviewForm] = Form.useForm<CompetencyReviewFormValues>();
  const [competencyVoidEvidenceForm] = Form.useForm<CompetencyVoidEvidenceFormValues>();
  const [competencySuspendForm] = Form.useForm<CompetencySuspendFormValues>();
  const [competencyRenewForm] = Form.useForm<CompetencyRenewFormValues>();
  const [competencyReactivateForm] = Form.useForm<CompetencyReactivateFormValues>();
  const [workForm] = Form.useForm<WorkExperienceFormValues>();
  const [certificateForm] = Form.useForm<CertificateFormValues>();

  const canManage = roles.some((role) => role.toLowerCase() === "admin");
  const selectedExpert = detailQuery.data;
  const canApproveCompetency = (row: ExpertCompetency) => {
    return canManage && row.approval_status === "PENDING_APPROVAL"
      && Boolean(currentUserId && selectedExpert && selectedExpert.account?.id !== currentUserId);
  };

  const overviewQuery = useQuery({
    queryKey: ["experts", "overview"],
    queryFn: async () => (await api.get<ExpertOverview>("/experts/overview")).data,
  });

  const expertsQuery = useQuery({
    queryKey: ["experts", search, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      return (await api.get<ExpertListItem[]>(`/experts?${params.toString()}`)).data;
    },
  });

  const detailQuery = useQuery({
    queryKey: ["experts", "detail", selectedExpertId],
    queryFn: async () => (await api.get<ExpertDetail>(`/experts/${selectedExpertId}`)).data,
    enabled: Boolean(selectedExpertId),
  });

  const competencyGovernanceQuery = useQuery({
    queryKey: ["expert-competency-governance", selectedCompetencyId],
    queryFn: async () => (
      await api.get<ExpertCompetencyDetail>(`/expert-competencies/${selectedCompetencyId}`)
    ).data,
    enabled: Boolean(selectedCompetencyId),
  });

  const accountOptionsQuery = useQuery({
    queryKey: ["experts", "account-options"],
    queryFn: async () => (await api.get<AccountOption[]>("/experts/account-options")).data,
    enabled: canManage && profileModalOpen,
  });

  const plansQuery = useQuery({
    queryKey: ["audit-plans", "expert-recommendation"],
    queryFn: async () => (await api.get<AuditPlanOption[]>("/audit-plans")).data,
    enabled: recommendationModalOpen,
  });

  const recommendationQuery = useQuery({
    queryKey: ["experts", "recommendations", recommendationPlanId, recommendationRole],
    queryFn: async () => (
      await api.get<RecommendationResponse>(
        `/experts/recommendations?plan_id=${encodeURIComponent(recommendationPlanId ?? "")}&team_role=${encodeURIComponent(recommendationRole)}`,
      )
    ).data,
    enabled: recommendationModalOpen && Boolean(recommendationPlanId && recommendationRole),
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["experts"] }),
      queryClient.invalidateQueries({ queryKey: ["expert-competency-governance"] }),
      queryClient.invalidateQueries({ queryKey: ["audit-team-appointments"] }),
    ]);
  };

  const saveProfileMutation = useMutation({
    mutationFn: async (values: ExpertFormValues) => {
      const payload = {
        ...values,
        date_of_birth: values.date_of_birth?.format("YYYY-MM-DD"),
      };
      if (profileMode === "edit" && selectedExpertId) {
        return (await api.patch<ExpertListItem>(`/experts/${selectedExpertId}`, payload)).data;
      }
      return (await api.post<ExpertListItem>("/experts", payload)).data;
    },
    onSuccess: async (saved) => {
      message.success(profileMode === "edit" ? "Đã cập nhật hồ sơ chuyên gia" : "Đã tạo hồ sơ chuyên gia");
      setProfileModalOpen(false);
      profileForm.resetFields();
      await refreshAll();
      setSelectedExpertId(saved.id);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const approveProfileMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/experts/${id}/approve`)).data,
    onSuccess: async () => {
      message.success("Đã phê duyệt hồ sơ chuyên gia");
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const suspendProfileMutation = useMutation({
    mutationFn: async (id: string) => (
      await api.post(`/experts/${id}/suspend`, {
        reason: "Tạm đình chỉ theo quyết định quản lý chuyên gia.",
      })
    ).data,
    onSuccess: async () => {
      message.success("Đã tạm đình chỉ hồ sơ chuyên gia");
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const createCompetencyMutation = useMutation({
    mutationFn: async (values: CompetencyFormValues) => {
      if (!selectedExpertId) throw new Error("Chưa chọn chuyên gia");
      return (
        await api.request<ExpertCompetency>({ method: editingCompetencyId ? "PATCH" : "POST", url: editingCompetencyId ? `/expert-competencies/${editingCompetencyId}` : "/expert-competencies/batch", data: {
          ...(editingCompetencyId ? {} : { expert_id: selectedExpertId }),
          management_system: values.management_system,
          standard_code: values.standard_code,
          competency_role: values.competency_role,
          scope_level: editingCompetencyId ? values.scope_level : undefined,
          iaf_code: editingCompetencyId ? values.iaf_codes?.[0] : undefined,
          iaf_codes: editingCompetencyId ? undefined : values.iaf_codes,
          nace_revision: values.scope_level === "NACE" ? values.nace_revision || "NACE_REV_2" : undefined,
          nace_code: values.scope_level === "NACE" ? values.nace_code : undefined,
          scope_description: values.scope_description,
          effective_date: values.effective_date.format("YYYY-MM-DD"),
          expiry_date: values.expiry_date?.format("YYYY-MM-DD"),
          approval_basis: values.approval_basis,
          evidence_summary: values.evidence_summary,
          restriction: values.restriction,
          notes: values.notes,
        } })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã thêm chương trình và phạm vi năng lực");
      setCompetencyModalOpen(false);
      setEditingCompetencyId(null);
      competencyForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const approveCompetencyMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/expert-competencies/${id}/approve`)).data,
    onSuccess: async () => {
      message.success("Đã phê duyệt năng lực chuyên gia");
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const submitCompetencyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/expert-competencies/${id}/submit`),
    onSuccess: async () => { message.success("Đã gửi phê duyệt"); await refreshAll(); },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const returnCompetency = (id: string) => {
    let reason = "";
    Modal.confirm({
      title: "Yêu cầu bổ sung năng lực",
      content: <Input.TextArea aria-label="Lý do yêu cầu bổ sung" onChange={(event) => { reason = event.target.value; }} />,
      onOk: async () => {
        if (!reason.trim()) { message.error("Phải nhập lý do"); throw new Error("Thiếu lý do"); }
        try { await api.post(`/expert-competencies/${id}/return`, { reason }); await refreshAll(); }
        catch (error) { message.error(getErrorMessage(error)); throw error; }
      },
    });
  };
  const editCompetency = (row: ExpertCompetency) => {
    competencyForm.resetFields();
    competencyForm.setFieldsValue({ management_system: row.management_system, standard_code: row.standard_code,
      competency_role: row.competency_role, scope_level: row.scope_level,
      iaf_code: row.iaf_code, iaf_codes: [row.iaf_code], nace_code: row.nace_code ?? undefined, nace_revision: row.nace_revision ?? undefined,
      effective_date: dayjs(row.effective_date), expiry_date: row.expiry_date ? dayjs(row.expiry_date) : undefined,
      evidence_summary: row.evidence_summary ?? undefined, approval_basis: row.approval_basis ?? undefined,
      scope_description: row.scope_description ?? undefined, restriction: row.restriction ?? undefined });
    setEditingCompetencyId(row.id); setCompetencyModalOpen(true);
  };

  const suspendCompetencyMutation = useMutation({
    mutationFn: async (values: CompetencySuspendFormValues) => {
      if (!competencySuspendTargetId) throw new Error("Chưa chọn hồ sơ năng lực");
      return (
        await api.post(`/expert-competencies/${competencySuspendTargetId}/suspend`, values)
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã tạm đình chỉ năng lực");
      setCompetencySuspendTargetId(null);
      competencySuspendForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const addCompetencyEvidenceMutation = useMutation({
    mutationFn: async (values: CompetencyEvidenceFormValues) => {
      if (!selectedCompetencyId) throw new Error("Chưa chọn hồ sơ năng lực");
      const evidence = (
        await api.post<CompetencyEvidence>(`/expert-competencies/${selectedCompetencyId}/evidence`, {
          evidence_type: values.evidence_type,
          title: values.title,
          reference_no: values.reference_no,
          evidence_date: values.evidence_date?.format("YYYY-MM-DD"),
          valid_until: values.valid_until?.format("YYYY-MM-DD"),
          result: values.result,
          score: values.score,
          mandays: values.mandays,
          description: values.description,
        })
      ).data;

      if (competencyEvidenceFile) {
        const formData = new FormData();
        formData.append("file", competencyEvidenceFile);
        formData.append("entity_type", "expert_competency_evidence");
        formData.append("entity_id", evidence.id);
        formData.append("document_type", "competency_evidence");
        formData.append("file_kind", "attachment");
        formData.append("note", values.title);
        await api.post("/document-files/upload", formData);
      }

      return evidence;
    },
    onSuccess: async () => {
      message.success("Đã thêm bằng chứng năng lực");
      setCompetencyEvidenceModalOpen(false);
      setCompetencyEvidenceFile(null);
      competencyEvidenceForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const voidCompetencyEvidenceMutation = useMutation({
    mutationFn: async (values: CompetencyVoidEvidenceFormValues) => {
      if (!selectedCompetencyId || !competencyVoidEvidenceId) throw new Error("Chưa chọn bằng chứng");
      return (
        await api.post(`/expert-competencies/${selectedCompetencyId}/evidence/${competencyVoidEvidenceId}/void`, values)
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã vô hiệu bằng chứng và giữ nguyên lịch sử");
      setCompetencyVoidEvidenceId(null);
      competencyVoidEvidenceForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const addCompetencyReviewMutation = useMutation({
    mutationFn: async (values: CompetencyReviewFormValues) => {
      if (!selectedCompetencyId) throw new Error("Chưa chọn hồ sơ năng lực");
      return (
        await api.post(`/expert-competencies/${selectedCompetencyId}/reviews`, {
          review_type: values.review_type,
          review_date: values.review_date.format("YYYY-MM-DD"),
          monitoring_methods: values.monitoring_methods,
          score: values.score,
          result: values.result,
          finding: values.finding,
          required_action: values.required_action,
          next_review_date: values.next_review_date?.format("YYYY-MM-DD"),
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã ghi nhận kết quả đánh giá năng lực");
      setCompetencyReviewModalOpen(false);
      competencyReviewForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const renewCompetencyMutation = useMutation({
    mutationFn: async (values: CompetencyRenewFormValues) => {
      if (!selectedCompetencyId) throw new Error("Chưa chọn hồ sơ năng lực");
      return (
        await api.post(`/expert-competencies/${selectedCompetencyId}/renew`, {
          effective_date: values.effective_date.format("YYYY-MM-DD"),
          expiry_date: values.expiry_date.format("YYYY-MM-DD"),
          decision_basis: values.decision_basis,
          note: values.note,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã gia hạn năng lực và ghi lịch sử quyết định");
      setCompetencyRenewModalOpen(false);
      competencyRenewForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const reactivateCompetencyMutation = useMutation({
    mutationFn: async (values: CompetencyReactivateFormValues) => {
      if (!selectedCompetencyId) throw new Error("Chưa chọn hồ sơ năng lực");
      return (
        await api.post(`/expert-competencies/${selectedCompetencyId}/reactivate`, {
          effective_date: values.effective_date?.format("YYYY-MM-DD"),
          expiry_date: values.expiry_date?.format("YYYY-MM-DD"),
          decision_basis: values.decision_basis,
          note: values.note,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã khôi phục năng lực");
      setCompetencyReactivateModalOpen(false);
      competencyReactivateForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const saveWorkMutation = useMutation({
    mutationFn: async (values: WorkExperienceFormValues) => {
      if (!selectedExpertId) throw new Error("Chưa chọn chuyên gia");
      const payload = {
        ...values,
        start_date: values.start_date.format("YYYY-MM-DD"),
        end_date: values.end_date?.format("YYYY-MM-DD"),
      };
      if (editingWorkId) {
        return (await api.patch(`/experts/${selectedExpertId}/work-experiences/${editingWorkId}`, payload)).data;
      }
      return (await api.post(`/experts/${selectedExpertId}/work-experiences`, payload)).data;
    },
    onSuccess: async () => {
      message.success(editingWorkId ? "Đã cập nhật kinh nghiệm công việc" : "Đã thêm kinh nghiệm công việc");
      setWorkModalOpen(false);
      setEditingWorkId(null);
      workForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const deleteWorkMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!selectedExpertId) throw new Error("Chưa chọn chuyên gia");
      return (await api.delete(`/experts/${selectedExpertId}/work-experiences/${id}`)).data;
    },
    onSuccess: async () => {
      message.success("Đã xóa kinh nghiệm công việc");
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const saveCertificateMutation = useMutation({
    mutationFn: async (values: CertificateFormValues) => {
      if (!selectedExpertId) throw new Error("Chưa chọn chuyên gia");
      const payload = {
        ...values,
        issue_date: values.issue_date?.format("YYYY-MM-DD"),
        expiry_date: values.expiry_date?.format("YYYY-MM-DD"),
      };
      if (editingCertificateId) {
        return (await api.patch(`/experts/${selectedExpertId}/certificates/${editingCertificateId}`, payload)).data;
      }
      return (await api.post(`/experts/${selectedExpertId}/certificates`, payload)).data;
    },
    onSuccess: async () => {
      message.success(editingCertificateId ? "Đã cập nhật chứng chỉ" : "Đã thêm chứng chỉ");
      setCertificateModalOpen(false);
      setEditingCertificateId(null);
      certificateForm.resetFields();
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const deleteCertificateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!selectedExpertId) throw new Error("Chưa chọn chuyên gia");
      return (await api.delete(`/experts/${selectedExpertId}/certificates/${id}`)).data;
    },
    onSuccess: async () => {
      message.success("Đã xóa chứng chỉ");
      await refreshAll();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openCreateProfile = () => {
    setProfileMode("create");
    profileForm.resetFields();
    profileForm.setFieldsValue({
      employment_type: "internal",
      status: "active",
    });
    setProfileModalOpen(true);
  };

  const openEditProfile = () => {
    const expert = detailQuery.data;
    if (!expert) return;
    setProfileMode("edit");
    profileForm.setFieldsValue({
      user_id: expert.user_id ?? undefined,
      employee_code: expert.employee_code ?? undefined,
      phone: expert.phone ?? undefined,
      date_of_birth: expert.date_of_birth ? dayjs(expert.date_of_birth) : undefined,
      gender: expert.gender ?? undefined,
      address: expert.address ?? undefined,
      employment_type: expert.employment_type ?? undefined,
      organization: expert.organization ?? undefined,
      job_title: expert.job_title ?? undefined,
      education_level: expert.education_level ?? undefined,
      specialization: expert.specialization ?? undefined,
      education_summary: expert.education_summary ?? undefined,
      experience_summary: expert.experience_summary ?? undefined,
      status: expert.status ?? "active",
    });
    setProfileModalOpen(true);
  };

  const openWorkModal = (record?: ExpertWorkExperience) => {
    setEditingWorkId(record?.id ?? null);
    if (record) {
      workForm.setFieldsValue({
        organization: record.organization,
        position: record.position,
        start_date: dayjs(record.start_date),
        end_date: record.end_date ? dayjs(record.end_date) : undefined,
        industry_codes: record.industry_codes ?? undefined,
        responsibility: record.responsibility ?? undefined,
        achievement_note: record.achievement_note ?? undefined,
      });
    } else {
      workForm.resetFields();
    }
    setWorkModalOpen(true);
  };

  const openCertificateModal = (record?: ExpertCertificate) => {
    setEditingCertificateId(record?.id ?? null);
    if (record) {
      certificateForm.setFieldsValue({
        certificate_type: record.certificate_type,
        certificate_name: record.certificate_name,
        certificate_number: record.certificate_number ?? undefined,
        issuing_organization: record.issuing_organization ?? undefined,
        standard_code: record.standard_code ?? undefined,
        issue_date: record.issue_date ? dayjs(record.issue_date) : undefined,
        expiry_date: record.expiry_date ? dayjs(record.expiry_date) : undefined,
        credential_url: record.credential_url ?? undefined,
        note: record.note ?? undefined,
      });
    } else {
      certificateForm.resetFields();
      certificateForm.setFieldValue("certificate_type", "LEAD_AUDITOR");
    }
    setCertificateModalOpen(true);
  };

  const expertColumns = useMemo<TableColumnsType<ExpertListItem>>(() => [
    {
      title: "Chuyên gia & tài khoản",
      key: "expert",
      render: (_, record) => (
        <button className="expert-name-button" onClick={() => setSelectedExpertId(record.id)} type="button">
          <Avatar icon={<UserOutlined />} />
          <span>
            <strong>{record.full_name}</strong>
            <small>
              {record.employee_code ? `${record.employee_code} · ` : ""}
              {record.user_account?.username || "Chưa liên kết tài khoản"}
            </small>
            <small>{record.email || record.phone || "Chưa có thông tin liên hệ"}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Phê duyệt hồ sơ",
      key: "profile_status",
      width: 160,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          {profileStatusTag(record.profile_status)}
          {activityStatusTag(record.status)}
        </Space>
      ),
    },
    {
      title: "Chương trình & mã lĩnh vực",
      key: "competencies",
      width: 310,
      render: (_, record) => (
        <div className="expert-summary-cell">
          <strong>{record.competency_summary?.programs ?? 0} chương trình · {record.competency_summary?.approved ?? 0} phạm vi đã duyệt</strong>
          <Space size={[4, 4]} wrap>
            {(record.competency_summary?.industry_codes ?? []).slice(0, 4).map((code) => <Tag key={code}>{code}</Tag>)}
            {(record.competency_summary?.industry_codes?.length ?? 0) > 4 ? <Tag>+{(record.competency_summary?.industry_codes?.length ?? 0) - 4}</Tag> : null}
          </Space>
        </div>
      ),
    },
    {
      title: "Hồ sơ hoạt động",
      key: "history",
      width: 190,
      render: (_, record) => (
        <div className="expert-summary-cell">
          <strong>{record.audit_summary?.total ?? 0} cuộc đánh giá</strong>
          <small>{record.certificate_summary?.total ?? 0} chứng chỉ · Gần nhất {formatDate(record.audit_summary?.last_audit_date)}</small>
        </div>
      ),
    },
    {
      title: "",
      key: "action",
      width: 80,
      render: (_, record) => <Button onClick={() => setSelectedExpertId(record.id)}>Mở</Button>,
    },
  ], []);

  const competencyColumns: TableColumnsType<ExpertCompetency> = [
    {
      title: "Chương trình / vai trò",
      key: "program",
      render: (_, record) => (
        <div className="expert-summary-cell">
          <strong>{record.standard_code}</strong>
          <small>{roleLabels[normalize(record.competency_role)] ?? record.competency_role}</small>
        </div>
      ),
    },
    {
      title: "Mã & lĩnh vực được đánh giá",
      key: "scope",
      width: 320,
      render: (_, record) => (
        <div className="expert-summary-cell">
          <Space size={[4, 4]} wrap>
            <Tag>IAF {record.iaf_code}</Tag>
            {record.nace_code ? <Tag>NACE {record.nace_code}</Tag> : null}
          </Space>
          <small>{record.scope_description || "Chưa mô tả lĩnh vực"}</small>
        </div>
      ),
    },
    {
      title: "Hiệu lực",
      key: "validity",
      width: 180,
      render: (_, record) => formatDateRange(record.effective_date, record.expiry_date),
    },
    {
      title: "Trạng thái",
      key: "approval_status",
      width: 145,
      render: (_, record) => <>{profileStatusTag(record.approval_status)}{record.approval_status === "RETURNED" ? <div><Text type="danger">{record.action_records?.find((action) => action.action_type === "RETURN")?.reason}</Text></div> : null}</>,
    },
    {
      title: "",
      key: "action",
      width: 260,
      render: (_, record) => (
        <Space>
          <Button onClick={() => setSelectedCompetencyId(record.id)} size="small">Hồ sơ</Button>
          {canManage && ["DRAFT", "RETURNED"].includes(normalize(record.approval_status)) ? <Space>
            <Button size="small" onClick={() => editCompetency(record)}>Sửa</Button>
            <Popconfirm title="Gửi phê duyệt năng lực?" onConfirm={() => submitCompetencyMutation.mutate(record.id)}><Button size="small">Gửi phê duyệt</Button></Popconfirm>
          </Space> : null}
          {canManage && normalize(record.approval_status) === "PENDING_APPROVAL" ? (
            <Popconfirm title="Phê duyệt phạm vi năng lực này?" onConfirm={() => approveCompetencyMutation.mutate(record.id)}>
              <Button size="small" type="primary" disabled={!canApproveCompetency(record)} title="Không được duyệt năng lực thuộc chính mình">Phê duyệt</Button>
            </Popconfirm>
          ) : null}
          {canManage && normalize(record.approval_status) === "PENDING_APPROVAL" ? <Button size="small" onClick={() => returnCompetency(record.id)}>Yêu cầu bổ sung</Button> : null}
          {canManage && normalize(record.approval_status) === "APPROVED" ? (
            <Button
              danger
              onClick={() => {
                competencySuspendForm.resetFields();
                setCompetencySuspendTargetId(record.id);
              }}
              size="small"
            >
              Đình chỉ
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const competencyEvidenceColumns: TableColumnsType<CompetencyEvidence> = [
    {
      title: "Loại / bằng chứng",
      key: "evidence",
      width: 300,
      render: (_, record) => (
        <div className="expert-summary-cell">
          <strong>{record.title}</strong>
          <small>{evidenceTypeLabels[normalize(record.evidence_type)] ?? record.evidence_type}</small>
          {record.reference_no ? <small>Mã: {record.reference_no}</small> : null}
        </div>
      ),
    },
    {
      title: "Thông tin chính",
      key: "result",
      width: 240,
      render: (_, record) => {
        const facts = [
          record.evidence_date ? formatDate(record.evidence_date) : null,
          record.valid_until ? `đến ${formatDate(record.valid_until)}` : null,
          record.result || null,
          record.score !== null && record.score !== undefined ? `${record.score} điểm` : null,
          record.mandays !== null && record.mandays !== undefined ? `${record.mandays} MD` : null,
        ].filter(Boolean);
        return facts.length ? <div className="expert-summary-cell">{facts.map((fact, index) => <small key={`${fact}-${index}`}>{fact}</small>)}</div> : <Text type="secondary">Xem tệp minh chứng</Text>;
      },
    },
    {
      title: "Tệp minh chứng",
      key: "attachments",
      width: 240,
      render: (_, record) => record.attachments.length ? (
        <Space direction="vertical" size={4}>
          {record.attachments.map((file) => (
            <Button
              icon={<LinkOutlined />}
              key={file.id}
              onClick={() => {
                void openDocumentFile({
                  ...documentRequestFromFile(file),
                  title: file.original_name,
                }).catch((error) => message.error(getErrorMessage(error)));
              }}
              size="small"
            >
              {file.original_name}
            </Button>
          ))}
        </Space>
      ) : <Text type="secondary">Chưa có tệp</Text>,
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 135,
      render: (_, record) => normalize(record.status) === "ACTIVE"
        ? <Tag color="green">Đang dùng</Tag>
        : <Tag color="default">Đã vô hiệu</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 110,
      render: (_, record) => canManage && normalize(record.status) === "ACTIVE" ? (
        <Button
          danger
          onClick={() => {
            competencyVoidEvidenceForm.resetFields();
            setCompetencyVoidEvidenceId(record.id);
          }}
          size="small"
        >
          Vô hiệu
        </Button>
      ) : null,
    },
  ];

  const competencyReviewColumns: TableColumnsType<CompetencyReview> = [
    {
      title: "Kỳ đánh giá",
      key: "review",
      width: 220,
      render: (_, record) => (
        <div className="expert-summary-cell">
          <strong>{reviewTypeLabels[normalize(record.review_type)] ?? record.review_type}</strong>
          <small>{formatDate(record.review_date)} · người đánh giá: {actorName(record.reviewed_by_user)}</small>
        </div>
      ),
    },
    {
      title: "Phương pháp giám sát",
      dataIndex: "monitoring_methods",
      key: "monitoring_methods",
      width: 260,
    },
    {
      title: "Kết quả",
      key: "result",
      width: 175,
      render: (_, record) => (
        <Space direction="vertical" size={3}>
          {reviewResultTag(record.result)}
          {record.score !== null && record.score !== undefined ? <small>{record.score} điểm</small> : null}
        </Space>
      ),
    },
    {
      title: "Phát hiện / hành động",
      key: "finding",
      render: (_, record) => (
        <div className="expert-summary-cell">
          <span>{record.finding || "Không có phát hiện"}</span>
          <small>{record.required_action || "Không yêu cầu hành động"}</small>
        </div>
      ),
    },
    {
      title: "Kỳ tiếp theo",
      dataIndex: "next_review_date",
      key: "next_review_date",
      width: 130,
      render: (value?: string | null) => formatDate(value),
    },
  ];

  const competencyActionColumns: TableColumnsType<CompetencyAction> = [
    {
      title: "Thời điểm",
      dataIndex: "created_at",
      key: "created_at",
      width: 165,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Hành động",
      dataIndex: "action_type",
      key: "action_type",
      width: 175,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 180,
      render: (_, record) => `${record.from_status || "—"} → ${record.to_status || "—"}`,
    },
    {
      title: "Người thực hiện",
      key: "actor",
      width: 190,
      render: (_, record) => actorName(record.actor),
    },
    {
      title: "Căn cứ / lý do",
      dataIndex: "reason",
      key: "reason",
      render: (value?: string | null) => value || "—",
    },
  ];

  const workColumns: TableColumnsType<ExpertWorkExperience> = [
    {
      title: "Đơn vị / vị trí",
      key: "work",
      render: (_, record) => (
        <div className="expert-summary-cell">
          <strong>{record.organization}</strong>
          <small>{record.position}</small>
        </div>
      ),
    },
    {
      title: "Thời gian",
      key: "dates",
      width: 190,
      render: (_, record) => formatDateRange(record.start_date, record.end_date),
    },
    {
      title: "Mã/lĩnh vực công việc",
      dataIndex: "industry_codes",
      key: "industry_codes",
      width: 210,
      render: (value?: string | null) => value || "—",
    },
    {
      title: "Nội dung công việc",
      dataIndex: "responsibility",
      key: "responsibility",
      ellipsis: true,
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_, record) => canManage ? (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openWorkModal(record)} size="small" />
          <Popconfirm title="Xóa kinh nghiệm công việc này?" onConfirm={() => deleteWorkMutation.mutate(record.id)}>
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ) : null,
    },
  ];

  const certificateColumns: TableColumnsType<ExpertCertificate> = [
    {
      title: "Chứng chỉ",
      key: "certificate",
      render: (_, record) => (
        <div className="expert-summary-cell">
          <strong>{record.certificate_name}</strong>
          <small>{record.certificate_number || "Chưa có số"} · {record.issuing_organization || "Chưa có đơn vị cấp"}</small>
        </div>
      ),
    },
    {
      title: "Tiêu chuẩn",
      dataIndex: "standard_code",
      key: "standard_code",
      width: 180,
      render: (value?: string | null) => value || "—",
    },
    {
      title: "Hiệu lực",
      key: "validity",
      width: 210,
      render: (_, record) => (
        <Space direction="vertical" size={3}>
          <span>{formatDateRange(record.issue_date, record.expiry_date)}</span>
          {certificateStatus(record.expiry_date)}
        </Space>
      ),
    },
    {
      title: "Minh chứng",
      key: "credential",
      width: 120,
      render: (_, record) => record.credential_url ? (
        <Button href={record.credential_url} icon={<LinkOutlined />} size="small" target="_blank">Mở</Button>
      ) : "—",
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_, record) => canManage ? (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openCertificateModal(record)} size="small" />
          <Popconfirm title="Xóa chứng chỉ này?" onConfirm={() => deleteCertificateMutation.mutate(record.id)}>
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ) : null,
    },
  ];

  const historyColumns = useMemo<TableColumnsType<AuditHistoryItem>>(() => [
    {
      title: "Kế hoạch / khách hàng",
      key: "plan",
      render: (_, record) => {
        const plan = record.audit_team_appointments?.audit_plans;
        const project = plan?.certification_projects;
        return (
          <div className="expert-summary-cell">
            <strong>{plan?.plan_code || "—"} · {project?.project_code || "—"}</strong>
            <small>{project?.certification_applications?.customers?.company_name || "—"}</small>
          </div>
        );
      },
    },
    {
      title: "Chương trình",
      key: "program",
      width: 180,
      render: (_, record) => record.audit_team_appointments?.audit_plans?.certification_projects?.standard_name || "—",
    },
    {
      title: "Vai trò",
      key: "role",
      width: 190,
      render: (_, record) => teamRoleLabels[normalize(record.team_role)] ?? record.team_role ?? "—",
    },
    {
      title: "Mã/lĩnh vực đã đánh giá",
      key: "scopes",
      width: 260,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {(record.scopes ?? []).map((scope, index) => (
            <Tag key={`${scope.iaf_code}-${scope.nace_code}-${index}`}>
              IAF {scope.iaf_code || "—"}{scope.nace_code ? ` · NACE ${scope.nace_code}` : ""}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Thời gian",
      key: "dates",
      width: 190,
      render: (_, record) => formatDateRange(record.planned_start_date, record.planned_end_date),
    },
    {
      title: "Ngày công",
      key: "mandays",
      width: 100,
      render: (_, record) => record.actual_mandays ?? record.planned_mandays ?? "—",
    },
  ], []);

  const recommendationColumns = useMemo<TableColumnsType<ExpertRecommendation>>(() => [
    {
      title: "Chuyên gia",
      key: "expert",
      render: (_, record) => (
        <div className="expert-summary-cell">
          <strong>{record.expert.full_name}</strong>
          <small>{record.expert.employee_code || "Chưa có mã"} · {record.expert.account?.username || "Chưa có tài khoản"}</small>
          <small>{record.expert.email || "—"}</small>
        </div>
      ),
    },
    {
      title: "Kết quả đối chiếu",
      key: "match",
      width: 190,
      render: (_, record) => (
        <div className="expert-summary-cell">
          <Tag color={matchColors[record.match_status] ?? "default"}>{matchLabels[record.match_status] ?? record.match_status}</Tag>
          {record.eligibility_reasons.map((reason) => (
            <small key={`${reason.code}-${reason.message}`}>
              <Tag color={reason.severity === "BLOCK" ? "red" : "gold"}>{reason.code}</Tag>
              {reason.message}
            </small>
          ))}
          {!record.eligibility_reasons.length ? <small>{record.reasons.join("; ")}</small> : null}
        </div>
      ),
    },
    {
      title: "Chương trình / vai trò",
      key: "program",
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={3}>
          {record.competencies.map((item) => (
            <Tag key={item.id}>{item.standard_code} · {roleLabels[normalize(item.competency_role)] ?? item.competency_role}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Phạm vi đáp ứng",
      key: "coverage",
      width: 300,
      render: (_, record) => (
        <div className="expert-summary-cell">
          <strong>{record.coverage.covered}/{record.coverage.total} phạm vi</strong>
          <Space size={[4, 4]} wrap>
            {record.coverage.scopes.map((scope) => (
              <Tag color={scope.qualified ? "green" : "red"} key={`${scope.iaf_code}-${scope.nace_code}`}>
                IAF {scope.iaf_code} · NACE {scope.nace_code}
              </Tag>
            ))}
          </Space>
        </div>
      ),
    },
    {
      title: "Nguồn lực",
      key: "availability",
      width: 220,
      render: (_, record) => (
        <div className="expert-summary-cell">
          <Tag color={record.eligible ? "green" : "red"}>{record.eligible ? "Có thể phân công" : "Không thể phân công"}</Tag>
          <small>{record.workload.assigned_mandays} MD · {record.workload.engagement_count} engagement</small>
          {record.workload.other_commitments ? <small>{record.workload.other_commitments} cam kết khác</small> : null}
        </div>
      ),
    },
  ], []);

  const selectedCompetency = competencyGovernanceQuery.data;
  const accountOptions = (accountOptionsQuery.data ?? []).filter(
    (account) => account.available || account.id === selectedExpert?.user_id,
  ).map((account) => ({
    value: account.id,
    label: `${account.full_name || account.username} · ${account.username} · ${account.email}`,
  }));

  return (
    <div className="experts-screen">
      <div className="screen-heading-row">
        <div>
          <Title level={3}>Chuyên gia & năng lực</Title>
          <Text type="secondary">
            Hồ sơ, phạm vi IAF và bằng chứng năng lực chuyên gia.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void refreshAll()}>Làm mới</Button>
          <Button icon={<TeamOutlined />} onClick={() => setRecommendationModalOpen(true)}>Đối chiếu chuyên gia</Button>
          {canManage ? <Button icon={<UserAddOutlined />} onClick={openCreateProfile} type="primary">Thêm chuyên gia</Button> : null}
        </Space>
      </div>

      <div className="expert-kpi-grid">
        <Card><Statistic prefix={<TeamOutlined />} title="Tổng chuyên gia" value={overviewQuery.data?.experts.total ?? 0} /></Card>
        <Card><Statistic prefix={<SafetyCertificateOutlined />} title="Năng lực đã duyệt" value={overviewQuery.data?.competencies.approved ?? 0} /></Card>
        <Card><Statistic prefix={<WarningOutlined />} title="Sắp hết hiệu lực" value={overviewQuery.data?.competencies.expiring_90_days ?? 0} /></Card>
        <Card><Statistic prefix={<WarningOutlined />} title="Đánh giá năng lực quá hạn" value={overviewQuery.data?.competencies.review_overdue ?? 0} /></Card>
      </div>

      <Card className="expert-list-card" title="Danh sách chuyên gia">
        <details><summary>Chỉ báo quản trị bổ sung</summary><Space wrap>
          <Text>Năng lực đã hết hiệu lực: {overviewQuery.data?.competencies.expired ?? 0}</Text>
          <Text>Thiếu bằng chứng năng lực: {overviewQuery.data?.competencies.evidence_gaps ?? 0}</Text>
        </Space></details>
        <div className="expert-filter-bar">
          <Input allowClear onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, mã chuyên gia, tài khoản, đơn vị..." prefix={<SearchOutlined />} value={search} />
          <Select onChange={setStatus} options={[
            { value: "all", label: "Tất cả trạng thái" },
            { value: "active", label: "Đang hoạt động" },
            { value: "inactive", label: "Ngừng hoạt động" },
          ]} value={status} />
        </div>
        <Table
          columns={expertColumns}
          size="small"
          dataSource={expertsQuery.data ?? []}
          loading={expertsQuery.isLoading}
          locale={{ emptyText: <Empty description="Chưa có hồ sơ chuyên gia" /> }}
          pagination={{ pageSize: 10, showTotal: (total) => `${total} chuyên gia` }}
          rowKey="id"
          scroll={{ x: 1180 }}
        />
      </Card>

      <Drawer
        destroyOnHidden
        onClose={() => setSelectedExpertId(null)}
        open={Boolean(selectedExpertId)}
        title={selectedExpert ? (
          <div className="expert-drawer-title">
            <Avatar icon={<UserOutlined />} size={44} />
            <span>
              <strong>{selectedExpert.full_name}</strong>
              <small>{selectedExpert.employee_code || "Chưa có mã chuyên gia"} · {selectedExpert.account?.username || "Chưa liên kết tài khoản"}</small>
            </span>
          </div>
        ) : "Hồ sơ chuyên gia"}
        width="min(1280px, 94vw)"
      >
        {detailQuery.isLoading ? <Skeleton active paragraph={{ rows: 12 }} /> : null}
        {selectedExpert ? (
          <div className="expert-detail-stack">
            <div className="expert-detail-kpis">
              <Card size="small"><Statistic title="Chương trình/phạm vi đã duyệt" value={selectedExpert.summary.approved_competencies} /></Card>
              <Card size="small"><Statistic title="Cuộc đánh giá đã tham gia" value={selectedExpert.summary.audit_count} /></Card>
              <Card size="small"><Statistic title="Chứng chỉ chuyên gia" value={selectedExpert.summary.certificate_count} /></Card>
            </div>

            <Card size="small">
              <div className="expert-profile-status-row">
                <Space wrap>
                  {profileStatusTag(selectedExpert.profile_status)}
                  {activityStatusTag(selectedExpert.status)}
                  {selectedExpert.account ? <Tag color="blue" icon={<LinkOutlined />}>Đã gắn tài khoản</Tag> : <Tag color="red">Chưa gắn tài khoản</Tag>}
                </Space>
                {canManage ? (
                  <Space>
                    <Button icon={<EditOutlined />} onClick={openEditProfile}>Sửa hồ sơ</Button>
                    {normalize(selectedExpert.profile_status) !== "APPROVED" ? (
                      <Popconfirm title="Phê duyệt hồ sơ chuyên gia này?" onConfirm={() => approveProfileMutation.mutate(selectedExpert.id)}>
                        <Button type="primary">Phê duyệt chuyên gia</Button>
                      </Popconfirm>
                    ) : (
                      <Popconfirm title="Tạm đình chỉ hồ sơ chuyên gia này?" onConfirm={() => suspendProfileMutation.mutate(selectedExpert.id)}>
                        <Button danger>Đình chỉ</Button>
                      </Popconfirm>
                    )}
                  </Space>
                ) : null}
              </div>
            </Card>

            <Tabs items={[
              {
                key: "profile",
                label: <span><IdcardOutlined /> Hồ sơ cá nhân</span>,
                children: (
                  <div className="expert-profile-grid">
                    <Card title="Tài khoản và thông tin cá nhân">
                      <Descriptions column={2} size="small">
                        <Descriptions.Item label="Tài khoản">{selectedExpert.account?.username || "Chưa liên kết"}</Descriptions.Item>
                        <Descriptions.Item label="Vai trò tài khoản">{selectedExpert.account?.roles?.join(", ") || "—"}</Descriptions.Item>
                        <Descriptions.Item label="Email">{selectedExpert.email || "—"}</Descriptions.Item>
                        <Descriptions.Item label="Điện thoại">{selectedExpert.phone || "—"}</Descriptions.Item>
                        <Descriptions.Item label="Ngày sinh">{formatDate(selectedExpert.date_of_birth)}</Descriptions.Item>
                        <Descriptions.Item label="Giới tính">{selectedExpert.gender || "—"}</Descriptions.Item>
                        <Descriptions.Item label="Địa chỉ" span={2}>{selectedExpert.address || "—"}</Descriptions.Item>
                        <Descriptions.Item label="Loại nhân sự">{selectedExpert.employment_type === "internal" ? "Nội bộ" : selectedExpert.employment_type === "external" ? "Bên ngoài" : "—"}</Descriptions.Item>
                        <Descriptions.Item label="Đơn vị công tác">{selectedExpert.organization || "—"}</Descriptions.Item>
                        <Descriptions.Item label="Chức danh">{selectedExpert.job_title || "—"}</Descriptions.Item>
                        <Descriptions.Item label="Trình độ">{selectedExpert.education_level || "—"}</Descriptions.Item>
                        <Descriptions.Item label="Chuyên ngành" span={2}>{selectedExpert.specialization || "—"}</Descriptions.Item>
                      </Descriptions>
                    </Card>
                    <Card title="Tóm tắt hồ sơ chuyên môn">
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Bằng cấp và đào tạo">{selectedExpert.education_summary || "—"}</Descriptions.Item>
                        <Descriptions.Item label="Kinh nghiệm chuyên môn">{selectedExpert.experience_summary || "—"}</Descriptions.Item>
                        <Descriptions.Item label="Ngày phê duyệt">{formatDate(selectedExpert.approved_at)}</Descriptions.Item>
                        {selectedExpert.suspension_reason ? <Descriptions.Item label="Lý do đình chỉ">{selectedExpert.suspension_reason}</Descriptions.Item> : null}
                      </Descriptions>
                    </Card>
                  </div>
                ),
              },
              {
                key: "competencies",
                label: <span><SafetyCertificateOutlined /> Chương trình & lĩnh vực ({selectedExpert.competencies.length})</span>,
                children: (
                  <Card
                    extra={canManage && selectedExpert.status === "active" ? (
                      <Button icon={<PlusOutlined />} onClick={() => {
                        competencyForm.resetFields(); setEditingCompetencyId(null);
                        competencyForm.setFieldsValue({
                          management_system: "QMS",
                          standard_code: standardBySystem.QMS,
                          competency_role: "AUDITOR",
                          scope_level: "IAF",
                          effective_date: dayjs(),
                        });
                        setCompetencyModalOpen(true);
                      }} type="primary">Thêm chương trình/phạm vi</Button>
                    ) : null}
                    title="Chương trình chứng nhận, vai trò và mã lĩnh vực được phê duyệt"
                  >
                    <Table columns={competencyColumns} dataSource={selectedExpert.competencies} locale={{ emptyText: <Empty description="Chưa có chương trình và phạm vi năng lực" /> }} pagination={false} rowKey="id" scroll={{ x: 1160 }} />
                  </Card>
                ),
              },
              {
                key: "work",
                label: <span><TeamOutlined /> Kinh nghiệm công việc ({selectedExpert.work_experiences.length})</span>,
                children: (
                  <Card extra={canManage ? <Button icon={<PlusOutlined />} onClick={() => openWorkModal()} type="primary">Thêm kinh nghiệm</Button> : null} title="Lịch sử công việc và kinh nghiệm ngành">
                    <Table columns={workColumns} dataSource={selectedExpert.work_experiences} locale={{ emptyText: <Empty description="Chưa có lịch sử công việc" /> }} pagination={false} rowKey="id" scroll={{ x: 1050 }} />
                  </Card>
                ),
              },
              {
                key: "certificates",
                label: <span><SafetyCertificateOutlined /> Chứng chỉ ({selectedExpert.certificates.length})</span>,
                children: (
                  <Card extra={canManage ? <Button icon={<PlusOutlined />} onClick={() => openCertificateModal()} type="primary">Thêm chứng chỉ</Button> : null} title="Bằng cấp, chứng chỉ đánh giá viên và chứng chỉ chuyên môn">
                    <Table columns={certificateColumns} dataSource={selectedExpert.certificates} locale={{ emptyText: <Empty description="Chưa có chứng chỉ chuyên gia" /> }} pagination={false} rowKey="id" scroll={{ x: 1050 }} />
                  </Card>
                ),
              },
              {
                key: "development",
                label: <span><AuditOutlined /> Đào tạo & giám sát</span>,
                children: (
                  <ExpertDevelopmentPanel expertId={selectedExpert.id} canManage={canManage} />
                ),
              },
              {
                key: "resource-governance",
                label: <span><CalendarOutlined /> Nguồn lực & độc lập</span>,
                children: (
                  <ExpertResourceGovernancePanel expertId={selectedExpert.id} canManage={canManage} />
                ),
              },
              {
                key: "history",
                label: <span><AuditOutlined /> Nhật ký đánh giá ({selectedExpert.audit_team_members.length})</span>,
                children: (
                  <Card title="Các cuộc đánh giá chuyên gia đã tham gia">
                    <Table columns={historyColumns} dataSource={selectedExpert.audit_team_members} locale={{ emptyText: <Empty description="Chưa có lịch sử tham gia đoàn đánh giá" /> }} pagination={{ pageSize: 8 }} rowKey="id" scroll={{ x: 1200 }} />
                  </Card>
                ),
              },
            ]} />
          </div>
        ) : null}
      </Drawer>

      <Drawer
        destroyOnHidden
        onClose={() => setSelectedCompetencyId(null)}
        open={Boolean(selectedCompetencyId)}
        title={selectedCompetency ? `${selectedCompetency.standard_code} · ${roleLabels[normalize(selectedCompetency.competency_role)] ?? selectedCompetency.competency_role}` : "Hồ sơ quản trị năng lực"}
        width="min(1320px, 96vw)"
      >
        {competencyGovernanceQuery.isLoading ? <Skeleton active paragraph={{ rows: 12 }} /> : null}
        {selectedCompetency ? (
          <div className="expert-detail-stack">
            <Card size="small">
              <div className="expert-profile-status-row">
                <Space wrap>
                  {governanceValidityTag(selectedCompetency.governance.validity_status)}
                  {reviewStatusTag(selectedCompetency.governance.review_status)}
                  <Tag>IAF {selectedCompetency.iaf_code}</Tag>
                  {selectedCompetency.nace_code ? <Tag>NACE {selectedCompetency.nace_code}</Tag> : null}
                  <Tag color={selectedCompetency.governance.active_evidence_count > 0 ? "blue" : "default"}>
                    {selectedCompetency.governance.active_evidence_count} bằng chứng đang dùng
                  </Tag>
                </Space>
                {canManage ? (
                  <Space wrap>
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => {
                        competencyEvidenceForm.resetFields();
                        competencyEvidenceForm.setFieldsValue({
                          evidence_type: "TRAINING_CERTIFICATE",
                          evidence_date: dayjs(),
                        });
                        setCompetencyEvidenceFile(null);
                        setCompetencyEvidenceModalOpen(true);
                      }}
                    >
                      Thêm bằng chứng
                    </Button>
                    {["APPROVED", "SUSPENDED"].includes(normalize(selectedCompetency.approval_status)) ? (
                      <Button
                        onClick={() => {
                          competencyReviewForm.setFieldsValue({
                            review_type: "PERIODIC",
                            review_date: dayjs(),
                            result: "SATISFACTORY",
                            next_review_date: dayjs().add(12, "month"),
                          });
                          setCompetencyReviewModalOpen(true);
                        }}
                      >
                        Ghi đánh giá năng lực
                      </Button>
                    ) : null}
                    {["DRAFT", "RETURNED"].includes(normalize(selectedCompetency.approval_status)) ? <Space>
                      <Button onClick={() => editCompetency(selectedCompetency)}>Sửa</Button>
                      <Popconfirm title="Gửi phê duyệt năng lực?" onConfirm={() => submitCompetencyMutation.mutate(selectedCompetency.id)}><Button>Gửi phê duyệt</Button></Popconfirm>
                    </Space> : null}
                    {normalize(selectedCompetency.approval_status) === "PENDING_APPROVAL" ? <Button onClick={() => returnCompetency(selectedCompetency.id)}>Yêu cầu bổ sung</Button> : null}
                    {normalize(selectedCompetency.approval_status) === "PENDING_APPROVAL" ? (
                      <Popconfirm
                        title="Phê duyệt hồ sơ năng lực này?"
                        description="Hệ thống sẽ chặn nếu chưa có bằng chứng năng lực."
                        onConfirm={() => approveCompetencyMutation.mutate(selectedCompetency.id)}
                      >
                        <Button type="primary" disabled={!canApproveCompetency(selectedCompetency)} title="Không được duyệt năng lực thuộc chính mình">Phê duyệt</Button>
                      </Popconfirm>
                    ) : null}
                    {normalize(selectedCompetency.approval_status) === "APPROVED" ? (
                      <>
                        <Button
                          danger
                          onClick={() => {
                            competencySuspendForm.resetFields();
                            setCompetencySuspendTargetId(selectedCompetency.id);
                          }}
                        >
                          Đình chỉ
                        </Button>
                        <Button
                          disabled={
                            !selectedCompetency.governance.latest_review ||
                            normalize(selectedCompetency.governance.review_status) === "OVERDUE" ||
                            selectedCompetency.governance.requires_management_action
                          }
                          onClick={() => {
                            const currentExpiry = selectedCompetency.expiry_date ? dayjs(selectedCompetency.expiry_date) : dayjs();
                            competencyRenewForm.setFieldsValue({
                              effective_date: dayjs(),
                              expiry_date: currentExpiry.add(12, "month"),
                            });
                            setCompetencyRenewModalOpen(true);
                          }}
                          title={
                            !selectedCompetency.governance.latest_review
                              ? "Cần có kết quả đánh giá năng lực trước khi gia hạn"
                              : normalize(selectedCompetency.governance.review_status) === "OVERDUE"
                                ? "Kết quả đánh giá năng lực đã quá hạn"
                                : selectedCompetency.governance.requires_management_action
                                  ? "Kết quả đánh giá gần nhất không đạt"
                                  : "Gia hạn năng lực"
                          }
                          type="primary"
                        >
                          Gia hạn
                        </Button>
                      </>
                    ) : null}
                    {normalize(selectedCompetency.approval_status) === "SUSPENDED" ? (
                      <Button
                        disabled={selectedCompetency.governance.requires_management_action}
                        onClick={() => {
                          competencyReactivateForm.setFieldsValue({
                            effective_date: dayjs(),
                            expiry_date: selectedCompetency.expiry_date ? dayjs(selectedCompetency.expiry_date) : undefined,
                          });
                          setCompetencyReactivateModalOpen(true);
                        }}
                        title={selectedCompetency.governance.requires_management_action ? "Cần có đánh giá năng lực phù hợp trước khi khôi phục" : "Khôi phục năng lực"}
                        type="primary"
                      >
                        Khôi phục
                      </Button>
                    ) : null}
                  </Space>
                ) : null}
              </div>
            </Card>

            {selectedCompetency.governance.evidence_gap ? (
              <Card size="small">
                <Text type="danger">
                  Hồ sơ năng lực đã được phê duyệt nhưng hiện không có bằng chứng năng lực đang hoạt động. Cần bổ sung hoặc rà soát hồ sơ.
                </Text>
              </Card>
            ) : null}
            {selectedCompetency.governance.requires_management_action ? (
              <Card size="small">
                <Text type="danger">
                  Kết quả đánh giá năng lực gần nhất là Không đạt. Hệ thống chặn gia hạn cho đến khi có đánh giá phù hợp tiếp theo.
                </Text>
              </Card>
            ) : null}

            <Descriptions bordered column={3} size="small">
              <Descriptions.Item label="Chương trình">{selectedCompetency.management_system} · {selectedCompetency.standard_code}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">{roleLabels[normalize(selectedCompetency.competency_role)] ?? selectedCompetency.competency_role}</Descriptions.Item>
              <Descriptions.Item label="Hiệu lực">{formatDateRange(selectedCompetency.effective_date, selectedCompetency.expiry_date)}</Descriptions.Item>
              <Descriptions.Item label="Đánh giá lại tiếp theo">{formatDate(selectedCompetency.governance.review_due_date)}</Descriptions.Item>
              <Descriptions.Item label="Ngày phê duyệt">{formatDate(selectedCompetency.approved_at)}</Descriptions.Item>
              {selectedCompetency.scope_description ? <Descriptions.Item label="Phạm vi" span={3}>{selectedCompetency.scope_description}</Descriptions.Item> : null}
              {selectedCompetency.approval_basis ? <Descriptions.Item label="Cơ sở phê duyệt" span={3}>{selectedCompetency.approval_basis}</Descriptions.Item> : null}
              {selectedCompetency.evidence_summary ? <Descriptions.Item label="Tóm tắt bằng chứng cũ" span={3}>{selectedCompetency.evidence_summary}</Descriptions.Item> : null}
              {selectedCompetency.restriction ? <Descriptions.Item label="Hạn chế" span={3}>{selectedCompetency.restriction}</Descriptions.Item> : null}
            </Descriptions>

            <Tabs
              items={[
                {
                  key: "evidence",
                  label: `Bằng chứng (${selectedCompetency.evidence_records.length})`,
                  children: (
                    <Table
                      columns={competencyEvidenceColumns}
                      dataSource={selectedCompetency.evidence_records}
                      locale={{ emptyText: <Empty description="Chưa có bằng chứng năng lực" /> }}
                      pagination={false}
                      rowKey="id"
                      scroll={{ x: 1100 }}
                    />
                  ),
                },
                {
                  key: "reviews",
                  label: `Đánh giá năng lực (${selectedCompetency.review_records.length})`,
                  children: (
                    <Table
                      columns={competencyReviewColumns}
                      dataSource={selectedCompetency.review_records}
                      locale={{ emptyText: <Empty description="Chưa có kết quả đánh giá năng lực định kỳ/đột xuất" /> }}
                      pagination={false}
                      rowKey="id"
                      scroll={{ x: 1100 }}
                    />
                  ),
                },
                {
                  key: "actions",
                  label: `Lịch sử quyết định (${selectedCompetency.action_records.length})`,
                  children: (
                    <Table
                      columns={competencyActionColumns}
                      dataSource={selectedCompetency.action_records}
                      locale={{ emptyText: <Empty description="Chưa có lịch sử quyết định" /> }}
                      pagination={{ pageSize: 10 }}
                      rowKey="id"
                      scroll={{ x: 1000 }}
                    />
                  ),
                },
              ]}
            />
          </div>
        ) : null}
      </Drawer>

      <Modal
        confirmLoading={saveProfileMutation.isPending}
        okText={profileMode === "edit" ? "Lưu hồ sơ" : "Tạo hồ sơ"}
        onCancel={() => setProfileModalOpen(false)}
        onOk={() => void profileForm.validateFields().then((values) => saveProfileMutation.mutate(values))}
        open={profileModalOpen}
        title={profileMode === "edit" ? "Cập nhật hồ sơ chuyên gia" : "Tạo chuyên gia từ tài khoản"}
        width={900}
      >
        <Form form={profileForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Tài khoản người dùng" name="user_id" rules={[{ required: true, message: "Chọn tài khoản chuyên gia" }]}>
              <Select loading={accountOptionsQuery.isLoading} options={accountOptions} placeholder="Chọn tài khoản đã tạo trong hệ thống" showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item label="Mã chuyên gia" name="employee_code"><Input placeholder="CG-0001" /></Form.Item>
            <Form.Item label="Điện thoại" name="phone"><Input /></Form.Item>
            <Form.Item label="Ngày sinh" name="date_of_birth"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Giới tính" name="gender"><Select options={[{ value: "male", label: "Nam" }, { value: "female", label: "Nữ" }, { value: "other", label: "Khác" }]} /></Form.Item>
            <Form.Item label="Loại nhân sự" name="employment_type"><Select options={[{ value: "internal", label: "Nhân sự nội bộ" }, { value: "external", label: "Chuyên gia bên ngoài" }]} /></Form.Item>
            <Form.Item label="Đơn vị công tác" name="organization"><Input /></Form.Item>
            <Form.Item label="Chức danh" name="job_title"><Input /></Form.Item>
            <Form.Item label="Trình độ học vấn" name="education_level"><Input placeholder="Đại học, Thạc sĩ..." /></Form.Item>
            <Form.Item label="Chuyên ngành" name="specialization"><Input /></Form.Item>
            <Form.Item label="Trạng thái hoạt động" name="status" rules={[{ required: true }]}><Select options={[{ value: "active", label: "Đang hoạt động" }, { value: "inactive", label: "Ngừng hoạt động" }]} /></Form.Item>
          </div>
          <Form.Item label="Địa chỉ" name="address"><Input /></Form.Item>
          <Form.Item label="Tóm tắt bằng cấp và đào tạo" name="education_summary"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="Tóm tắt kinh nghiệm chuyên môn" name="experience_summary"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        className="competency-editor"
        confirmLoading={createCompetencyMutation.isPending}
        okText="Lưu dự thảo"
        onCancel={() => { setCompetencyModalOpen(false); setEditingCompetencyId(null); }}
        onOk={() => void competencyForm.validateFields().then((values) => createCompetencyMutation.mutate(values))}
        open={competencyModalOpen}
        title={`${editingCompetencyId ? "Sửa" : "Thêm"} năng lực · ${selectedExpert?.full_name ?? ""}`}
        width={680}
      >
        <Form form={competencyForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Chương trình chứng nhận" name="management_system" rules={[{ required: true }]}>
              <Select onChange={(value) => competencyForm.setFieldValue("standard_code", standardBySystem[value])} options={managementSystemOptions} />
            </Form.Item>
            <Form.Item label="Tiêu chuẩn được đánh giá" name="standard_code" rules={[{ required: true }]}><Input /></Form.Item>
            <CompetencyRoleField />
            <CompetencyIafField editing={Boolean(editingCompetencyId)} />
            <Form.Item noStyle shouldUpdate={(prev, current) => prev.scope_level !== current.scope_level}>
              {({ getFieldValue }) => getFieldValue("scope_level") === "NACE" ? (
                <>
                  <Text type="secondary">Phạm vi NACE cũ được giữ nguyên, không tự mở rộng sang IAF.</Text>
                </>
              ) : null}
            </Form.Item>
            <Form.Item label="Ngày hiệu lực" name="effective_date" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Ngày hết hiệu lực" name="expiry_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
          </div>
          <Alert type="info" title="Bằng chứng năng lực" description="Sau khi lưu dự thảo, mở chi tiết từng phạm vi IAF để bổ sung bằng chứng và đính kèm tệp." />
          <Form.Item label="Cơ sở phê duyệt / ghi chú" name="approval_basis"><Input.TextArea rows={2} /></Form.Item>
          <details><summary>Hạn chế năng lực (không bắt buộc)</summary><Form.Item name="restriction"><Input.TextArea rows={2} /></Form.Item></details>
        </Form>
      </Modal>

      <Modal
        confirmLoading={addCompetencyEvidenceMutation.isPending}
        okText="Lưu bằng chứng"
        onCancel={() => {
          setCompetencyEvidenceModalOpen(false);
          setCompetencyEvidenceFile(null);
          competencyEvidenceForm.resetFields();
        }}
        onOk={() => void competencyEvidenceForm.validateFields().then((values) => addCompetencyEvidenceMutation.mutate(values))}
        open={competencyEvidenceModalOpen}
        title="Thêm bằng chứng năng lực"
        width={720}
      >
        <Form form={competencyEvidenceForm} layout="vertical">
          <CompetencyEvidenceFields
            form={competencyEvidenceForm}
            file={competencyEvidenceFile}
            onFileChange={setCompetencyEvidenceFile}
          />
        </Form>
      </Modal>

      <Modal
        confirmLoading={voidCompetencyEvidenceMutation.isPending}
        okButtonProps={{ danger: true }}
        okText="Vô hiệu bằng chứng"
        onCancel={() => {
          setCompetencyVoidEvidenceId(null);
          competencyVoidEvidenceForm.resetFields();
        }}
        onOk={() => void competencyVoidEvidenceForm.validateFields().then((values) => voidCompetencyEvidenceMutation.mutate(values))}
        open={Boolean(competencyVoidEvidenceId)}
        title="Vô hiệu bằng chứng năng lực"
      >
        <Form form={competencyVoidEvidenceForm} layout="vertical">
          <Form.Item
            label="Lý do"
            name="reason"
            rules={[{ required: true, min: 3, message: "Nhập lý do vô hiệu" }]}
          >
            <Input.TextArea rows={4} placeholder="Nêu rõ lý do bằng chứng không còn được sử dụng; dữ liệu lịch sử sẽ không bị xóa." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={suspendCompetencyMutation.isPending}
        okButtonProps={{ danger: true }}
        okText="Đình chỉ năng lực"
        onCancel={() => {
          setCompetencySuspendTargetId(null);
          competencySuspendForm.resetFields();
        }}
        onOk={() => void competencySuspendForm.validateFields().then((values) => suspendCompetencyMutation.mutate(values))}
        open={Boolean(competencySuspendTargetId)}
        title="Tạm đình chỉ năng lực chuyên gia"
      >
        <Form form={competencySuspendForm} layout="vertical">
          <Form.Item
            label="Lý do đình chỉ"
            name="reason"
            rules={[{ required: true, min: 3, message: "Nhập lý do đình chỉ" }]}
          >
            <Input.TextArea rows={4} placeholder="Nêu rõ căn cứ và lý do đình chỉ năng lực." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={addCompetencyReviewMutation.isPending}
        okText="Lưu kết quả đánh giá"
        onCancel={() => {
          setCompetencyReviewModalOpen(false);
          competencyReviewForm.resetFields();
        }}
        onOk={() => void competencyReviewForm.validateFields().then((values) => addCompetencyReviewMutation.mutate(values))}
        open={competencyReviewModalOpen}
        title="Ghi nhận đánh giá năng lực"
        width={820}
      >
        <Form form={competencyReviewForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Loại đánh giá" name="review_type" rules={[{ required: true }]}>
              <Select options={competencyReviewTypeOptions} />
            </Form.Item>
            <Form.Item label="Ngày đánh giá" name="review_date" rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Kết quả" name="result" rules={[{ required: true }]}>
              <Select options={competencyReviewResultOptions} />
            </Form.Item>
            <Form.Item label="Điểm (0-100)" name="score"><InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Ngày đánh giá tiếp theo" name="next_review_date">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item label="Phương pháp giám sát / nguồn thông tin" name="monitoring_methods" rules={[{ required: true, message: "Nhập phương pháp đánh giá" }]}>
            <Input.TextArea rows={3} placeholder="Ví dụ: xem xét audit log, báo cáo đánh giá, phản hồi khách hàng, chứng kiến/phỏng vấn..." />
          </Form.Item>
          <Form.Item label="Phát hiện" name="finding"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="Hành động yêu cầu" name="required_action"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={renewCompetencyMutation.isPending}
        okText="Gia hạn năng lực"
        onCancel={() => {
          setCompetencyRenewModalOpen(false);
          competencyRenewForm.resetFields();
        }}
        onOk={() => void competencyRenewForm.validateFields().then((values) => renewCompetencyMutation.mutate(values))}
        open={competencyRenewModalOpen}
        title="Gia hạn hiệu lực năng lực"
        width={720}
      >
        <Form form={competencyRenewForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Hiệu lực từ" name="effective_date" rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Hiệu lực đến" name="expiry_date" rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item label="Căn cứ quyết định gia hạn" name="decision_basis" rules={[{ required: true, min: 3 }]}>
            <Input.TextArea rows={4} placeholder="Nêu hồ sơ/bằng chứng và kết quả đánh giá làm căn cứ gia hạn." />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={reactivateCompetencyMutation.isPending}
        okText="Khôi phục năng lực"
        onCancel={() => {
          setCompetencyReactivateModalOpen(false);
          competencyReactivateForm.resetFields();
        }}
        onOk={() => void competencyReactivateForm.validateFields().then((values) => reactivateCompetencyMutation.mutate(values))}
        open={competencyReactivateModalOpen}
        title="Khôi phục năng lực đang đình chỉ"
        width={720}
      >
        <Form form={competencyReactivateForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Hiệu lực từ" name="effective_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Hiệu lực đến" name="expiry_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
          </div>
          <Form.Item label="Căn cứ quyết định khôi phục" name="decision_basis" rules={[{ required: true, min: 3 }]}>
            <Input.TextArea rows={4} placeholder="Nêu bằng chứng đã khắc phục/đủ điều kiện để khôi phục." />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={saveWorkMutation.isPending}
        okText={editingWorkId ? "Lưu thay đổi" : "Thêm kinh nghiệm"}
        onCancel={() => setWorkModalOpen(false)}
        onOk={() => void workForm.validateFields().then((values) => saveWorkMutation.mutate(values))}
        open={workModalOpen}
        title={editingWorkId ? "Cập nhật kinh nghiệm công việc" : "Thêm kinh nghiệm công việc"}
        width={760}
      >
        <Form form={workForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Đơn vị công tác" name="organization" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label="Vị trí/chức danh" name="position" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label="Từ ngày" name="start_date" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Đến ngày" name="end_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
          </div>
          <Form.Item label="Mã/lĩnh vực liên quan" name="industry_codes"><Input placeholder="IAF 14; NACE 22.29; nhựa, cao su..." /></Form.Item>
          <Form.Item label="Nhiệm vụ và kinh nghiệm thực tế" name="responsibility"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="Thành tích/ghi chú" name="achievement_note"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={saveCertificateMutation.isPending}
        okText={editingCertificateId ? "Lưu thay đổi" : "Thêm chứng chỉ"}
        onCancel={() => setCertificateModalOpen(false)}
        onOk={() => void certificateForm.validateFields().then((values) => saveCertificateMutation.mutate(values))}
        open={certificateModalOpen}
        title={editingCertificateId ? "Cập nhật chứng chỉ" : "Thêm chứng chỉ chuyên gia"}
        width={760}
      >
        <Form form={certificateForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Loại chứng chỉ" name="certificate_type" rules={[{ required: true }]}><Select options={certificateTypeOptions} /></Form.Item>
            <Form.Item label="Tên chứng chỉ" name="certificate_name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label="Số chứng chỉ" name="certificate_number"><Input /></Form.Item>
            <Form.Item label="Đơn vị cấp" name="issuing_organization"><Input /></Form.Item>
            <Form.Item label="Tiêu chuẩn/chương trình" name="standard_code"><Input placeholder="ISO 14001:2015" /></Form.Item>
            <Form.Item label="Ngày cấp" name="issue_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Ngày hết hạn" name="expiry_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Đường dẫn minh chứng" name="credential_url" rules={[{ type: "url", warningOnly: true }]}><Input /></Form.Item>
          </div>
          <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        footer={null}
        onCancel={() => setRecommendationModalOpen(false)}
        open={recommendationModalOpen}
        title="Đối chiếu chuyên gia theo kế hoạch"
        width={1200}
      >
        <div className="recommendation-filter-grid">
          <Select
            allowClear
            loading={plansQuery.isLoading}
            onChange={setRecommendationPlanId}
            options={(plansQuery.data ?? []).map((plan) => ({
              value: plan.id,
              label: `${plan.plan_code || "Chưa có mã"} · ${plan.certification_projects?.project_code || "—"} · ${plan.certification_projects?.standard_name || "—"}`,
            }))}
            placeholder="Chọn kế hoạch đánh giá"
            showSearch
            optionFilterProp="label"
            value={recommendationPlanId}
          />
          <Select onChange={setRecommendationRole} options={recommendationRoleOptions} value={recommendationRole} />
        </div>

        {recommendationQuery.isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {recommendationQuery.isError ? <Empty description={getErrorMessage(recommendationQuery.error)} /> : null}
        {recommendationQuery.data ? (
          <div className="recommendation-result">
            <Card size="small">
              <Descriptions column={3} size="small">
                <Descriptions.Item label="Kế hoạch">{recommendationQuery.data.plan.plan_code || "—"}</Descriptions.Item>
                <Descriptions.Item label="Hồ sơ">{recommendationQuery.data.plan.project_code || "—"}</Descriptions.Item>
                <Descriptions.Item label="Khách hàng">{recommendationQuery.data.plan.customer_name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Chương trình">{recommendationQuery.data.plan.standard_code || "—"}</Descriptions.Item>
                <Descriptions.Item label="Thời gian">{formatDateRange(recommendationQuery.data.plan.planned_start_date, recommendationQuery.data.plan.planned_end_date)}</Descriptions.Item>
                <Descriptions.Item label="Phạm vi yêu cầu">{recommendationQuery.data.required_scopes.length}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Table columns={recommendationColumns} dataSource={recommendationQuery.data.recommendations} locale={{ emptyText: <Empty description="Chưa có chuyên gia đang hoạt động để đối chiếu" /> }} pagination={false} rowKey={(record) => record.expert.id} scroll={{ x: 1180 }} />
          </div>
        ) : recommendationPlanId ? null : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chọn kế hoạch để đối chiếu tài khoản, hồ sơ phê duyệt, chương trình, IAF/NACE và lịch chuyên gia" />
        )}
      </Modal>
    </div>
  );
}
