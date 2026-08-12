"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  SendOutlined,
  SyncOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  App,
  Button,
  Calendar,
  Card,
  DatePicker,
  Descriptions,
  Divider,
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
  Tooltip,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { openDocumentFile } from "../lib/document-file-client";
import { IntegratedMandayAllocationPanel } from "./IntegratedMandayAllocationPanel";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface CustomerSummary {
  id?: string;
  customer_code?: string | null;
  company_name?: string | null;
  tax_code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface CertificationProjectSummary {
  id: string;
  project_code: string;
  standard_name?: string | null;
  status?: string | null;
  created_at?: string | null;
  certification_applications?: {
    id?: string;
    application_code?: string | null;
    standard_name?: string | null;
    certification_scope?: string | null;
    status?: string | null;
    customers?: CustomerSummary | null;
  } | null;
}

interface AuditPlan {
  id: string;
  project_id: string;
  audit_event_id?: string | null;
  plan_code: string;
  version_no?: number | null;
  audit_type?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  location?: string | null;
  audit_scope?: string | null;
  audit_criteria?: string | null;
  audit_objectives?: string | null;
  status?: string | null;
  certification_projects?: CertificationProjectSummary | null;
  audit_event?: {
    planned_mandays?: number | string | null;
    event_type?: string | null;
    audit_programs?: {
      program_code?: string | null;
      organization_name?: string | null;
      standard_name?: string | null;
    } | null;
  } | null;
}

interface ExpertSummary {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
}

interface AppointmentMemberScope {
  id?: string;
  project_scope_id?: string | null;
  iaf_code?: string | null;
  nace_code?: string | null;
  activity_description?: string | null;
  coverage_type?: string | null;
  planned_mandays?: number | string | null;
  project_scope?: {
    standard_code?: string | null;
    management_system?: string | null;
  } | null;
}

interface AppointmentMember {
  id: string;
  expert_id?: string | null;
  team_role?: string | null;
  assignment_status?: string | null;
  competency_status?: string | null;
  competency_note?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  planned_mandays?: number | string | null;
  experts?: ExpertSummary | null;
  scopes?: AppointmentMemberScope[];
}

interface ScopeSyncResponse {
  project_id: string;
  project_code?: string | null;
  synchronized_count: number;
  review_id?: string | null;
  scopes: ProjectScopeOption[];
}

interface AppointmentFormErrorItem {
  key: string;
  name: Array<string | number>;
  label: string;
  message: string;
}

interface ProjectScopeOption {
  project_scope_id: string;
  management_system?: string | null;
  standard_code?: string | null;
  certification_scope?: string | null;
  isic?: {
    revision?: string | null;
    code?: string | null;
    name?: string | null;
  } | null;
  nace?: {
    revision?: string | null;
    code?: string | null;
    name?: string | null;
  } | null;
  iaf?: {
    code?: string | null;
    name?: string | null;
  } | null;
}

interface AuditTeamAppointment {
  id: string;
  audit_plan_id: string;
  appointment_number?: string | null;
  appointment_date?: string | null;
  note?: string | null;
  status?: string | null;
  members?: AppointmentMember[];
  audit_plans?: AuditPlan | null;
}

interface AppointmentFormMember {
  expert_id: string;
  team_role: string;
  planned_dates?: [Dayjs, Dayjs];
  planned_mandays?: number;
  project_scope_ids?: string[];
  program_keys?: string[];
}

interface AppointmentFormValues {
  appointment_number: string;
  appointment_date: Dayjs;
  note?: string;
  members: AppointmentFormMember[];
}

interface AppointmentPayload {
  audit_plan_id?: string;
  appointment_number: string;
  appointment_date: string;
  note?: string;
  members: Array<{
    expert_id: string;
    team_role: string;
    planned_start_date?: string;
    planned_end_date?: string;
    planned_mandays?: number;
    scopes?: Array<{
      project_scope_id: string;
      activity_description?: string;
      coverage_type: string;
      planned_mandays?: number;
    }>;
  }>;
}


interface ProjectProgramOption {
  key: string;
  standard_code: string;
  management_system: string;
  project_scope_ids: string[];
}

interface ProjectProgramCapability extends ProjectProgramOption {
  competency_roles: string[];
  can_lead: boolean;
}

interface ProjectExpertSuitabilityOption {
  expert_id: string;
  full_name: string;
  email?: string | null;
  employee_code?: string | null;
  is_relevant: boolean;
  can_lead: boolean;
  covered_scope_ids: string[];
  covered_standards: string[];
  covered_scope_labels: string[];
  coverage_count: number;
  required_scope_count: number;
  program_capabilities?: ProjectProgramCapability[];
  covered_program_codes?: string[];
}

interface ProjectExpertSuitabilityResponse {
  project_id: string;
  project_code: string;
  required_scope_count: number;
  required_programs?: ProjectProgramOption[];
  experts: ProjectExpertSuitabilityOption[];
}

interface ExpertBusyDatesResponse {
  expert: {
    id: string;
    full_name: string;
  };
  busy_dates: string[];
  assignments: Array<{
    appointment_id: string;
    appointment_number?: string | null;
    appointment_status?: string | null;
    plan_id: string;
    plan_code?: string | null;
    audit_type?: string | null;
    plan_status?: string | null;
    project_id: string;
    project_code: string;
    customer_name: string;
    start_date: string;
    end_date: string;
  }>;
}

interface ProjectBriefReview {
  id: string;
  result?: string | null;
  workflow_status?: string | null;
  audit_field?: string | null;
  iaf_code?: string | null;
  isic_code?: string | null;
  industry_scopes_json?: string | null;
  effective_personnel?: number | null;
  risk_level?: string | null;
  manday_method?: string | null;
  base_mandays?: number | string | null;
  final_mandays?: number | string | null;
  stage1_mandays?: number | string | null;
  stage2_mandays?: number | string | null;
  conclusion?: string | null;
  checked_by_name?: string | null;
  checker?: { full_name?: string | null; username?: string | null } | null;
  created_at?: string | null;
}

interface ProjectBriefApplication {
  id: string;
  application_code?: string | null;
  application_date?: string | null;
  certification_type?: string | null;
  standard_name?: string | null;
  certification_scope?: string | null;
  excluded_clauses?: string | null;
  headquarters_address?: string | null;
  employee_count?: number | null;
  total_employee_count?: number | null;
  site_count?: number | null;
  representative_name?: string | null;
  representative_position?: string | null;
  representative_phone?: string | null;
  representative_email?: string | null;
  contact_name?: string | null;
  contact_position?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  customers?: CustomerSummary | null;
  sites?: Array<{
    id: string;
    site_no: number;
    site_name?: string | null;
    address?: string | null;
    activities?: string | null;
    employee_count?: number | null;
  }>;
  application_reviews?: ProjectBriefReview[];
}

interface ProjectBriefDetail {
  id: string;
  project_code: string;
  standard_name?: string | null;
  status?: string | null;
  certification_applications?: ProjectBriefApplication | null;
}

interface ProjectBriefManday {
  id: string;
  calculation_code?: string | null;
  status?: string | null;
  effective_personnel?: number | null;
  base_mandays?: number | string | null;
  final_mandays?: number | string | null;
  stage1_mandays?: number | string | null;
  stage2_mandays?: number | string | null;
  created_at?: string | null;
}

interface ProjectBriefFile {
  id: string;
  entity_id: string;
  document_type: string;
  original_name: string;
  version_no: number;
  uploaded_at: string;
}

interface ProjectBriefDossier {
  files?: ProjectBriefFile[];
}

interface ScheduleResourcesScreenProps {
  initialPlanId?: string | null;
  onOpenProject: (projectId: string) => void;
  roles: string[];
}

const auditTypeLabels: Record<string, string> = {
  project_team: "Chỉ định đoàn theo hồ sơ",
  initial: "Đánh giá lần đầu",
  stage1: "Đánh giá giai đoạn 1",
  stage2: "Đánh giá giai đoạn 2",
  surveillance: "Đánh giá giám sát",
  surveillance1: "Giám sát lần 1",
  surveillance2: "Giám sát lần 2",
  recertification: "Tái chứng nhận",
  special: "Đánh giá đặc biệt",
};

const statusLabels: Record<string, string> = {
  approved: "Đã phê duyệt",
  cancelled: "Đã hủy",
  completed: "Hoàn thành",
  draft: "Bản nháp",
  in_progress: "Đang thực hiện",
  issued: "Đã ban hành",
  planned: "Đã lập kế hoạch",
  pending: "Chờ xử lý",
};

const roleLabels: Record<string, string> = {
  team_leader: "Trưởng đoàn đánh giá",
  lead_auditor: "Trưởng đoàn đánh giá",
  auditor: "Chuyên gia đánh giá",
  technical_expert: "Chuyên gia kỹ thuật",
  observer: "Quan sát viên",
  trainee: "Chuyên gia tập sự",
  witness_evaluator: "Đánh giá viên chứng kiến",
};

const rolesRequiringProjectScope = new Set([
  "TEAM_LEADER",
  "AUDITOR",
  "TECHNICAL_EXPERT",
  "WITNESS_EVALUATOR",
]);

const rolesCountingMandays = new Set([
  "TEAM_LEADER",
  "AUDITOR",
]);

const teamRoleOptions = [
  { label: "Trưởng đoàn đánh giá", value: "TEAM_LEADER" },
  { label: "Chuyên gia đánh giá", value: "AUDITOR" },
  { label: "Chuyên gia kỹ thuật", value: "TECHNICAL_EXPERT" },
  { label: "Chuyên gia tập sự", value: "TRAINEE" },
  { label: "Quan sát viên", value: "OBSERVER" },
  { label: "Đánh giá viên chứng kiến", value: "WITNESS_EVALUATOR" },
];

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function countsTowardMandays(teamRole?: string | null) {
  return rolesCountingMandays.has((teamRole ?? "").trim().toUpperCase());
}

function isStage1AuditType(auditType?: string | null, eventType?: string | null) {
  const value = `${auditType ?? ""} ${eventType ?? ""}`.toLowerCase();
  return /stage\s*1|stage1|giai[_\s-]*doan[_\s-]*1|gđ1/.test(value);
}

function projectProgramKey(managementSystem?: string | null, standardCode?: string | null) {
  return `${(managementSystem ?? "").trim().toUpperCase()}::${(standardCode ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase()}`;
}

function programDisplayLabel(program: Pick<ProjectProgramOption, "standard_code" | "management_system">) {
  const standard = program.standard_code?.trim() || "Tiêu chuẩn";
  const system = program.management_system?.trim();
  return system && normalize(system) !== normalize(standard)
    ? `${standard} · ${system}`
    : standard;
}

function acceptedProgramRoles(teamRole?: string | null) {
  const role = (teamRole ?? "").trim().toUpperCase();
  const map: Record<string, string[]> = {
    TEAM_LEADER: ["LEAD_AUDITOR", "AUDITOR"],
    AUDITOR: ["AUDITOR", "LEAD_AUDITOR"],
    TECHNICAL_EXPERT: ["TECHNICAL_EXPERT"],
    WITNESS_EVALUATOR: ["WITNESS_EVALUATOR", "LEAD_AUDITOR", "AUDITOR"],
  };
  return map[role] ?? [];
}

function capabilitySupportsRole(capability: ProjectProgramCapability | undefined, teamRole?: string | null) {
  if (!capability) return false;
  const accepted = acceptedProgramRoles(teamRole);
  return capability.competency_roles.some((role) => accepted.includes(role.toUpperCase()));
}

function labelFromMap(value: string | null | undefined, labels: Record<string, string>, fallback = "Chưa cập nhật") {
  const key = normalize(value);
  return labels[key] ?? (value || fallback);
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format("DD/MM/YYYY") : "Chưa xếp lịch";
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start) return "Chưa xếp lịch";
  if (!end || dayjs(start).isSame(dayjs(end), "day")) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function parseNumber(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return undefined;
  const result = Number(value);
  return Number.isFinite(result) ? result : undefined;
}

function inclusiveDayCount(value?: [Dayjs, Dayjs]) {
  if (!value?.[0] || !value?.[1]) return undefined;
  return Math.max(value[1].startOf("day").diff(value[0].startOf("day"), "day") + 1, 1);
}

function formatMandays(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("vi-VN", { minimumFractionDigits: value % 1 ? 1 : 0, maximumFractionDigits: 1 });
}


function httpStatus(error: unknown) {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

function downloadDiagnosticReport(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formFieldLabel(name: Array<string | number>) {
  const memberIndex = name.findIndex((part) => part === "members");
  if (memberIndex >= 0 && typeof name[memberIndex + 1] === "number") {
    const row = Number(name[memberIndex + 1]) + 1;
    const field = String(name[memberIndex + 2] ?? "");
    const labels: Record<string, string> = {
      expert_id: "Chuyên gia",
      team_role: "Vai trò",
      planned_dates: "Thời gian phân công",
      planned_mandays: "Ngày công",
      project_scope_ids: "Phạm vi dự án phụ trách",
      program_keys: "Chương trình/tiêu chuẩn phụ trách",
    };
    return `Thành viên ${row} · ${labels[field] ?? field}`;
  }

  const last = String(name.at(-1) ?? "Trường dữ liệu");
  const labels: Record<string, string> = {
    appointment_number: "Số chỉ định đoàn",
    appointment_date: "Ngày chỉ định",
    members: "Thành viên đoàn đánh giá",
  };
  return labels[last] ?? last;
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

function PlanStatusTag({ status }: { status?: string | null }) {
  const normalized = normalize(status);
  const color = normalized === "completed" || normalized === "issued"
    ? "green"
    : normalized === "cancelled"
      ? "default"
      : normalized === "in_progress"
        ? "gold"
        : "blue";
  return <Tag color={color}>{labelFromMap(status, statusLabels)}</Tag>;
}

interface BusyDateRangePickerProps {
  expertId?: string;
  value?: [Dayjs, Dayjs];
  onChange?: (value: [Dayjs, Dayjs] | undefined) => void;
  onSuggestedMandaysChange?: (value: number | undefined) => void;
  excludeAppointmentId?: string;
  defaultAnchor?: Dayjs;
  planStart?: Dayjs | null;
  planEnd?: Dayjs | null;
}

function BusyDateRangePicker({
  expertId,
  value,
  onChange,
  onSuggestedMandaysChange,
  excludeAppointmentId,
  defaultAnchor,
  planStart,
  planEnd,
}: BusyDateRangePickerProps) {
  const anchor = value?.[0] ?? planStart ?? defaultAnchor ?? dayjs();
  const lookupStart = anchor.subtract(1, "year").startOf("year");
  const lookupEnd = anchor.add(2, "year").endOf("year");

  const busyQuery = useQuery({
    enabled: Boolean(expertId),
    queryKey: [
      "expert-busy-dates",
      expertId,
      lookupStart.format("YYYY-MM-DD"),
      lookupEnd.format("YYYY-MM-DD"),
      excludeAppointmentId ?? null,
    ],
    queryFn: async () => (
      await api.get<ExpertBusyDatesResponse>(
        `/audit-team-appointments/expert/${expertId}/busy-dates`,
        {
          params: {
            start_date: lookupStart.format("YYYY-MM-DD"),
            end_date: lookupEnd.format("YYYY-MM-DD"),
            exclude_appointment_id: excludeAppointmentId,
          },
        },
      )
    ).data,
    retry: false,
    staleTime: 30_000,
  });

  const busyDateSet = useMemo(
    () => new Set(busyQuery.data?.busy_dates ?? []),
    [busyQuery.data?.busy_dates],
  );

  const assignmentByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const assignment of busyQuery.data?.assignments ?? []) {
      let cursor = dayjs(assignment.start_date).startOf("day");
      const end = dayjs(assignment.end_date).startOf("day");
      const statusLabel = normalize(assignment.appointment_status) === "issued" ? "Đã xác nhận" : "Dự kiến";
      const label = `${statusLabel}: ${assignment.customer_name} · ${assignment.plan_code ?? assignment.project_code}`;
      while (!cursor.isAfter(end)) {
        const key = cursor.format("YYYY-MM-DD");
        map.set(key, [...(map.get(key) ?? []), label]);
        cursor = cursor.add(1, "day");
      }
    }
    return map;
  }, [busyQuery.data?.assignments]);

  const busyStatusByDate = useMemo(() => {
    const map = new Map<string, "confirmed" | "tentative">();
    for (const assignment of busyQuery.data?.assignments ?? []) {
      let cursor = dayjs(assignment.start_date).startOf("day");
      const end = dayjs(assignment.end_date).startOf("day");
      const nextStatus = normalize(assignment.appointment_status) === "issued" ? "confirmed" : "tentative";
      while (!cursor.isAfter(end)) {
        const key = cursor.format("YYYY-MM-DD");
        if (nextStatus === "confirmed" || !map.has(key)) map.set(key, nextStatus);
        cursor = cursor.add(1, "day");
      }
    }
    return map;
  }, [busyQuery.data?.assignments]);

  const outsidePlan = (current: Dayjs) => (
    Boolean(planStart && current.startOf("day").isBefore(planStart.startOf("day")))
    || Boolean(planEnd && current.startOf("day").isAfter(planEnd.startOf("day")))
  );

  return (
    <div className="expert-busy-date-picker">
      <RangePicker
        cellRender={(current, info) => {
          const key = current.format("YYYY-MM-DD");
          if (!busyDateSet.has(key)) return info.originNode;
          const details = assignmentByDate.get(key) ?? ["Chuyên gia đã có lịch đánh giá"];
          return (
            <Tooltip title={details.join("; ")}>
              <div className={`expert-busy-calendar-cell is-${busyStatusByDate.get(key) ?? "confirmed"}`}>
                {info.originNode}
              </div>
            </Tooltip>
          );
        }}
        disabled={!expertId}
        disabledDate={(current) => outsidePlan(current) || busyDateSet.has(current.format("YYYY-MM-DD"))}
        format="DD/MM/YYYY"
        onChange={(dates) => {
          if (!dates?.[0] || !dates?.[1]) {
            onChange?.(undefined);
            onSuggestedMandaysChange?.(undefined);
            return;
          }
          const normalized: [Dayjs, Dayjs] = [dates[0], dates[1]];
          onChange?.(normalized);
          onSuggestedMandaysChange?.(inclusiveDayCount(normalized));
        }}
        status={busyQuery.isError ? "error" : undefined}
        style={{ width: "100%" }}
        value={value}
      />
      <div className="expert-busy-date-guidance">
        {planStart ? (
          <Text type="secondary">
            Chỉ chọn trong thời gian kế hoạch: {planStart.format("DD/MM/YYYY")}–{(planEnd ?? planStart).format("DD/MM/YYYY")}.
          </Text>
        ) : null}
        {expertId ? (
          <div className="expert-busy-date-legend">
            <span className="expert-busy-dot is-confirmed" />
            <Text type="secondary">Đã xác nhận</Text>
            <span className="expert-busy-dot is-tentative" />
            <Text type="secondary">Dự kiến</Text>
            <Text type="secondary">
              {busyQuery.isLoading
                ? "Đang tải lịch..."
                : busyQuery.isError
                  ? `Không tải được lịch: ${getErrorMessage(busyQuery.error)}`
                  : `${busyDateSet.size} ngày không thể chọn`}
            </Text>
          </div>
        ) : (
          <Text type="secondary">Chọn chuyên gia trước để xem các ngày đã có lịch.</Text>
        )}
      </div>
    </div>
  );
}

export function ScheduleResourcesScreen({ initialPlanId, onOpenProject, roles }: ScheduleResourcesScreenProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [appointmentForm] = Form.useForm<AppointmentFormValues>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [auditTypeFilter, setAuditTypeFilter] = useState("all");
  const [workspaceTab, setWorkspaceTab] = useState("projects");
  const [calendarMonth, setCalendarMonth] = useState(dayjs().startOf("month"));
  const watchedMembers = Form.useWatch("members", appointmentForm) ?? [];
  const requestedProjectId = initialPlanId?.startsWith("project:")
    ? initialPlanId.slice("project:".length)
    : null;
  const requestedPlanId = initialPlanId && !requestedProjectId
    ? initialPlanId
    : null;
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(requestedPlanId);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [planDateEditorOpen, setPlanDateEditorOpen] = useState(false);
  const [planDateRange, setPlanDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [appointmentFormErrors, setAppointmentFormErrors] = useState<AppointmentFormErrorItem[]>([]);
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const [projectSourceRecord, setProjectSourceRecord] = useState<"application" | "review" | null>(null);
  const [projectSourceTab, setProjectSourceTab] = useState<"system" | "scan">("system");
  const [openingSourceFileId, setOpeningSourceFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialPlanId?.startsWith("project:")) {
      setSelectedPlanId(initialPlanId ?? null);
    }
  }, [initialPlanId]);

  const normalizedRoles = useMemo(() => roles.map(normalize), [roles]);
  const canReadExperts = normalizedRoles.some((role) =>
    ["admin", "coordinator", "lead_auditor", "technical_reviewer"].includes(role),
  );
  const canManageTeam = normalizedRoles.some((role) => ["admin", "coordinator"].includes(role));

  const projectsQuery = useQuery({
    queryKey: ["certification-projects", "schedule-resources"],
    queryFn: async () => (
      await api.get<CertificationProjectSummary[]>("/certification-projects")
    ).data,
  });

  const plansQuery = useQuery({
    queryKey: ["audit-plans", "schedule-resources"],
    queryFn: async () => (await api.get<AuditPlan[]>("/audit-plans")).data,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["audit-team-appointments", "schedule-resources"],
    queryFn: async () => (await api.get<AuditTeamAppointment[]>("/audit-team-appointments")).data,
  });
  const projectContextQuery = useQuery({
    enabled: Boolean(requestedProjectId && canManageTeam),
    queryKey: ["audit-team-project-context", requestedProjectId],
    queryFn: async () => (
      await api.post<AuditPlan>(
        `/audit-team-appointments/project/${requestedProjectId}/ensure-context`,
      )
    ).data,
    retry: false,
  });

  const expertsQuery = useQuery({
    enabled: canReadExperts,
    queryKey: ["experts", "schedule-resources"],
    queryFn: async () => (await api.get<ExpertSummary[]>("/experts", { params: { status: "active" } })).data,
  });
  const projectScopesQuery = useQuery({
    enabled: Boolean(selectedPlanId && canManageTeam),
    queryKey: ["audit-team-available-project-scopes", selectedPlanId],
    queryFn: async () => (
      await api.get<ProjectScopeOption[]>(`/audit-team-appointments/plan/${selectedPlanId}/available-scopes`)
    ).data,
    retry: false,
  });

  useEffect(() => {
    if (!projectContextQuery.data) return;

    queryClient.setQueryData<AuditPlan[]>(
      ["audit-plans", "schedule-resources"],
      (current = []) => {
        if (current.some((plan) => plan.id === projectContextQuery.data!.id)) {
          return current;
        }
        return [projectContextQuery.data!, ...current];
      },
    );
    setSelectedPlanId(projectContextQuery.data.id);
  }, [projectContextQuery.data, queryClient]);

  const appointmentsByPlan = useMemo(() => {
    const map = new Map<string, AuditTeamAppointment>();
    for (const appointment of appointmentsQuery.data ?? []) {
      if (normalize(appointment.status) === "cancelled") continue;
      const existing = map.get(appointment.audit_plan_id);
      if (!existing || normalize(appointment.status) === "issued") {
        map.set(appointment.audit_plan_id, appointment);
      }
    }
    return map;
  }, [appointmentsQuery.data]);

  const allPlans = plansQuery.data ?? [];
  const projectAppointmentsByProject = useMemo(() => {
    const map = new Map<string, AuditTeamAppointment>();
    for (const appointment of appointmentsQuery.data ?? []) {
      if (normalize(appointment.status) === "cancelled") continue;
      if (normalize(appointment.audit_plans?.audit_type) !== "project_team") continue;
      const projectId = appointment.audit_plans?.project_id
        ?? appointment.audit_plans?.certification_projects?.id;
      if (!projectId) continue;
      const existing = map.get(projectId);
      if (!existing || normalize(appointment.status) === "issued") {
        map.set(projectId, appointment);
      }
    }
    return map;
  }, [appointmentsQuery.data]);

  const plans = allPlans.filter((plan) => normalize(plan.audit_type) !== "project_team");
  const projects = projectsQuery.data ?? [];
  const today = dayjs().startOf("day");
  const upcomingPlans = useMemo(
    () => plans.filter((plan) => {
      const status = normalize(plan.status);
      return Boolean(plan.planned_start_date)
        && !["cancelled", "completed"].includes(status)
        && !dayjs(plan.planned_start_date).isBefore(today);
    }),
    [plans],
  );
  const unassignedPlans = useMemo(
    () => plans.filter((plan) => {
      const status = normalize(plan.status);
      return !["cancelled", "completed"].includes(status)
        && !(appointmentsByPlan.get(plan.id)?.members?.length);
    }),
    [appointmentsByPlan, plans],
  );
  const distinctAssignedExperts = useMemo(() => {
    const experts = new Map<string, ExpertSummary>();
    for (const appointment of appointmentsQuery.data ?? []) {
      if (normalize(appointment.status) === "cancelled") continue;
      for (const member of appointment.members ?? []) {
        if (member.experts?.id) experts.set(member.experts.id, member.experts);
      }
    }
    return [...experts.values()];
  }, [appointmentsQuery.data]);
  const activeExperts = canReadExperts
    ? (expertsQuery.data ?? []).filter((expert) => normalize(expert.status || "active") === "active")
    : distinctAssignedExperts;

  const customerOptions = useMemo(() => {
    const values = new Map<string, string>();
    for (const plan of plans) {
      const customer = plan.certification_projects?.certification_applications?.customers;
      const value = customer?.id ?? customer?.company_name ?? "";
      if (value) values.set(value, customer?.company_name ?? value);
    }
    return [
      { label: "Tất cả khách hàng", value: "all" },
      ...[...values.entries()]
        .sort((left, right) => left[1].localeCompare(right[1], "vi"))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [plans]);

  const auditTypeOptions = useMemo(() => {
    const values: string[] = Array.from(
      new Set<string>(plans.map((plan) => normalize(plan.audit_type)).filter(Boolean)),
    );
    return [
      { label: "Tất cả đợt đánh giá", value: "all" },
      ...values.map((value) => ({ value, label: labelFromMap(value, auditTypeLabels) })),
    ];
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const term = normalize(searchTerm);
    return plans.filter((plan) => {
      const project = plan.certification_projects;
      const customer = project?.certification_applications?.customers;
      const appointment = appointmentsByPlan.get(plan.id);
      const matchesSearch = !term || [
        plan.plan_code,
        plan.audit_type,
        project?.project_code,
        project?.standard_name,
        customer?.customer_code,
        customer?.company_name,
        appointment?.appointment_number,
      ].some((value) => normalize(value).includes(term));
      const customerValue = customer?.id ?? customer?.company_name ?? "";
      const matchesCustomer = customerFilter === "all" || customerValue === customerFilter;
      const matchesAuditType = auditTypeFilter === "all" || normalize(plan.audit_type) === auditTypeFilter;
      const matchesStatus = statusFilter === "all" || normalize(plan.status) === statusFilter;
      const start = plan.planned_start_date ? dayjs(plan.planned_start_date) : null;
      const status = normalize(plan.status);
      const matchesPeriod = periodFilter === "all"
        || (periodFilter === "upcoming" && Boolean(start) && !start!.isBefore(today) && !["completed", "cancelled"].includes(status))
        || (periodFilter === "completed" && status === "completed")
        || (periodFilter === "unassigned" && !["completed", "cancelled"].includes(status) && !(appointment?.members?.length));
      return matchesSearch && matchesCustomer && matchesAuditType && matchesStatus && matchesPeriod;
    });
  }, [appointmentsByPlan, auditTypeFilter, customerFilter, periodFilter, plans, searchTerm, statusFilter]);

  const monthPlans = useMemo(() => {
    const monthStart = calendarMonth.startOf("month");
    const monthEnd = calendarMonth.endOf("month");
    return plans.filter((plan) => {
      if (!plan.planned_start_date) return false;
      const start = dayjs(plan.planned_start_date).startOf("day");
      const end = dayjs(plan.planned_end_date ?? plan.planned_start_date).startOf("day");
      return !end.isBefore(monthStart) && !start.isAfter(monthEnd);
    });
  }, [calendarMonth, plans]);

  const selectedPlan = allPlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const selectedAppointment = selectedPlan ? appointmentsByPlan.get(selectedPlan.id) ?? null : null;
  const selectedIsProjectContext = normalize(selectedPlan?.audit_type) === "project_team";
  const selectedIsStage1 = isStage1AuditType(
    selectedPlan?.audit_type,
    selectedPlan?.audit_event?.event_type,
  );
  const selectedDisplayCode = selectedIsProjectContext
    ? selectedPlan?.certification_projects?.project_code ?? selectedPlan?.plan_code
    : selectedPlan?.plan_code;

  const selectedPlanStart = selectedPlan?.planned_start_date
    ? dayjs(selectedPlan.planned_start_date).startOf("day")
    : null;
  const selectedPlanEnd = selectedPlan?.planned_end_date
    ? dayjs(selectedPlan.planned_end_date).startOf("day")
    : selectedPlanStart;
  const selectedRequiredMandays = parseNumber(selectedPlan?.audit_event?.planned_mandays);
  const draftAllocatedMandays = useMemo(
    () => (watchedMembers as AppointmentFormMember[]).reduce(
      (total, member) => countsTowardMandays(member?.team_role)
        ? total + (parseNumber(member?.planned_mandays) ?? 0)
        : total,
      0,
    ),
    [watchedMembers],
  );
  const draftMandayDifference = selectedRequiredMandays === undefined
    ? undefined
    : draftAllocatedMandays - selectedRequiredMandays;
  const selectedPlanCalendarDays = selectedPlanStart && selectedPlanEnd
    ? selectedPlanEnd.diff(selectedPlanStart, "day") + 1
    : 0;
  const draftCountingMemberCount = (watchedMembers as AppointmentFormMember[]).filter(
    (member) => countsTowardMandays(member?.team_role),
  ).length;
  const draftPlanCapacity = selectedPlanCalendarDays * draftCountingMemberCount;
  const draftPlanCapacityInsufficient = Boolean(
    selectedRequiredMandays !== undefined
      && selectedRequiredMandays > 0
      && draftPlanCapacity + 0.001 < selectedRequiredMandays,
  );
  const selectedAppointmentAllocatedMandays = useMemo(
    () => (selectedAppointment?.members ?? []).reduce(
      (total, member) => countsTowardMandays(member.team_role)
        ? total + (parseNumber(member.planned_mandays) ?? 0)
        : total,
      0,
    ),
    [selectedAppointment?.members],
  );
  const selectedAppointmentMandayDifference = selectedRequiredMandays === undefined
    ? undefined
    : selectedAppointmentAllocatedMandays - selectedRequiredMandays;
  const selectedAppointmentMandaysBalanced = selectedIsProjectContext
    || (selectedRequiredMandays !== undefined
      && selectedAppointmentAllocatedMandays + 0.001 >= selectedRequiredMandays);

  const projectBriefQuery = useQuery({
    enabled: Boolean(selectedIsProjectContext && selectedPlan?.project_id),
    queryKey: ["audit-team-project-brief", selectedPlan?.project_id],
    queryFn: async () => {
      const projectId = selectedPlan!.project_id;
      const [projectResponse, mandayResponse, dossierResponse] = await Promise.all([
        api.get<ProjectBriefDetail>(`/certification-projects/${projectId}`),
        api.get<ProjectBriefManday[]>(`/manday-calculations/project/${projectId}`),
        api.get<ProjectBriefDossier>(`/certification-projects/${projectId}/dossier`),
      ]);
      return {
        project: projectResponse.data,
        mandays: mandayResponse.data,
        dossier: dossierResponse.data,
      };
    },
    retry: false,
    staleTime: 30_000,
  });

  const projectExpertSuitabilityQuery = useQuery({
    enabled: Boolean(selectedPlan?.project_id && canReadExperts),
    queryKey: ["audit-team-project-expert-suitability", selectedPlan?.project_id],
    queryFn: async () => (
      await api.get<ProjectExpertSuitabilityResponse>(
        `/audit-team-appointments/project/${selectedPlan!.project_id}/expert-suitability`,
      )
    ).data,
    retry: false,
    staleTime: 30_000,
  });

  const expertSuitabilityMap = useMemo(
    () => new Map(
      (projectExpertSuitabilityQuery.data?.experts ?? []).map((expert) => [expert.expert_id, expert]),
    ),
    [projectExpertSuitabilityQuery.data?.experts],
  );

  const selectedProjectAppointment = selectedPlan?.project_id
    ? projectAppointmentsByProject.get(selectedPlan.project_id) ?? null
    : null;
  const issuedProjectAppointment = normalize(selectedProjectAppointment?.status) === "issued"
    ? selectedProjectAppointment
    : null;
  const projectTeamExpertIds = useMemo(
    () => new Set(
      (issuedProjectAppointment?.members ?? [])
        .map((member) => member.experts?.id ?? member.expert_id)
        .filter((expertId): expertId is string => Boolean(expertId)),
    ),
    [issuedProjectAppointment],
  );
  const selectableExperts = useMemo(
    () => selectedIsProjectContext
      ? activeExperts
      : activeExperts.filter((expert) => projectTeamExpertIds.has(expert.id)),
    [activeExperts, projectTeamExpertIds, selectedIsProjectContext],
  );
  const requiredPrograms = useMemo<ProjectProgramOption[]>(() => {
    if (projectExpertSuitabilityQuery.data?.required_programs?.length) {
      return projectExpertSuitabilityQuery.data.required_programs;
    }
    const map = new Map<string, ProjectProgramOption>();
    for (const scope of projectScopesQuery.data ?? []) {
      const key = projectProgramKey(scope.management_system, scope.standard_code);
      const current = map.get(key);
      if (current) current.project_scope_ids.push(scope.project_scope_id);
      else map.set(key, {
        key,
        standard_code: scope.standard_code ?? scope.management_system ?? "Tiêu chuẩn",
        management_system: scope.management_system ?? "",
        project_scope_ids: [scope.project_scope_id],
      });
    }
    return [...map.values()];
  }, [projectExpertSuitabilityQuery.data?.required_programs, projectScopesQuery.data]);
  const programMap = useMemo(
    () => new Map(requiredPrograms.map((program) => [program.key, program])),
    [requiredPrograms],
  );
  const programCapabilityMap = useMemo(() => {
    const map = new Map<string, Map<string, ProjectProgramCapability>>();
    for (const expert of projectExpertSuitabilityQuery.data?.experts ?? []) {
      map.set(
        expert.expert_id,
        new Map((expert.program_capabilities ?? []).map((capability) => [capability.key, capability])),
      );
    }
    return map;
  }, [projectExpertSuitabilityQuery.data?.experts]);
  const planTeamPrerequisiteBlocked = !selectedIsProjectContext && !issuedProjectAppointment;

  const projectBrief = projectBriefQuery.data?.project ?? null;
  const projectBriefApplication = projectBrief?.certification_applications ?? null;
  const projectBriefReview = projectBriefApplication?.application_reviews?.[0] ?? null;
  const projectBriefManday = useMemo(() => {
    const rows = [...(projectBriefQuery.data?.mandays ?? [])];
    return rows.sort((left, right) => {
      const approvedDelta = Number(normalize(right.status) === "approved") - Number(normalize(left.status) === "approved");
      if (approvedDelta) return approvedDelta;
      return dayjs(right.created_at ?? 0).valueOf() - dayjs(left.created_at ?? 0).valueOf();
    })[0] ?? null;
  }, [projectBriefQuery.data?.mandays]);
  const projectIndustryScopes = useMemo(
    () => parseStructuredList(projectBriefReview?.industry_scopes_json),
    [projectBriefReview?.industry_scopes_json],
  );
  const projectSourceRecordId = projectSourceRecord === "application"
    ? projectBriefApplication?.id
    : projectBriefReview?.id;
  const projectSourceFiles = useMemo(
    () => (projectBriefQuery.data?.dossier.files ?? [])
      .filter((file) => file.entity_id === projectSourceRecordId)
      .sort((left, right) => right.version_no - left.version_no),
    [projectBriefQuery.data?.dossier.files, projectSourceRecordId],
  );

  const openProjectSourceFile = async (file: ProjectBriefFile) => {
    setOpeningSourceFileId(file.id);
    try {
      await openDocumentFile({
        url: `/document-files/${file.id}/download`,
        filename: file.original_name,
        title: file.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setOpeningSourceFileId(null);
    }
  };

  const teamCoverage = useMemo(() => {
    const requiredScopes = projectScopesQuery.data ?? [];
    const qualifiedScopeIds = new Set<string>();
    let leaderSelected = false;
    let leaderQualified = false;

    for (const member of watchedMembers as AppointmentFormMember[]) {
      if (!member?.expert_id) continue;
      const suitability = expertSuitabilityMap.get(member.expert_id);
      if (member.team_role === "TEAM_LEADER") {
        leaderSelected = true;
        leaderQualified = Boolean(suitability?.can_lead);
      }
      const assignedScopeIds = new Set(member.project_scope_ids ?? []);
      for (const scopeId of suitability?.covered_scope_ids ?? []) {
        if (assignedScopeIds.has(scopeId)) qualifiedScopeIds.add(scopeId);
      }
    }

    const missingScopes = requiredScopes.filter((scope) => !qualifiedScopeIds.has(scope.project_scope_id));
    return {
      required: requiredScopes.length,
      covered: requiredScopes.length - missingScopes.length,
      missingScopes,
      leaderSelected,
      leaderQualified,
      sufficient: requiredScopes.length > 0
        && missingScopes.length === 0
        && leaderSelected
        && leaderQualified,
    };
  }, [expertSuitabilityMap, projectScopesQuery.data, watchedMembers]);

  const planProgramCoverage = useMemo(() => {
    if (selectedIsStage1) {
      const leaders = (watchedMembers as AppointmentFormMember[]).filter(
        (member) => member?.team_role === "TEAM_LEADER" && member?.expert_id,
      );
      const membersQualified = (watchedMembers as AppointmentFormMember[]).every(
        (member) => !member?.expert_id || projectTeamExpertIds.has(member.expert_id),
      );
      return {
        required: 0,
        covered: 0,
        missingPrograms: [] as ProjectProgramOption[],
        leaderSelected: leaders.length === 1,
        leaderQualified: leaders.length === 1,
        membersQualified,
        sufficient: leaders.length === 1 && membersQualified,
      };
    }

    const coveredKeys = new Set<string>();
    let leaderSelected = false;
    let leaderQualified = false;
    let membersQualified = true;

    for (const member of watchedMembers as AppointmentFormMember[]) {
      if (!member?.expert_id) continue;
      if (!projectTeamExpertIds.has(member.expert_id)) membersQualified = false;
      const acceptedRoles = acceptedProgramRoles(member.team_role);
      if (!acceptedRoles.length) continue;
      const capabilities = programCapabilityMap.get(member.expert_id) ?? new Map<string, ProjectProgramCapability>();
      const selectedPrograms = member.program_keys ?? [];
      if (!selectedPrograms.length) membersQualified = false;

      for (const programKey of selectedPrograms) {
        const capability = capabilities.get(programKey);
        if (capabilitySupportsRole(capability, member.team_role)) {
          if (countsTowardMandays(member.team_role)) coveredKeys.add(programKey);
        } else membersQualified = false;
      }

      if (member.team_role === "TEAM_LEADER") {
        leaderSelected = true;
        leaderQualified = selectedPrograms.some((programKey) => capabilities.get(programKey)?.can_lead);
      }
    }

    const missingPrograms = requiredPrograms.filter((program) => !coveredKeys.has(program.key));
    return {
      required: requiredPrograms.length,
      covered: requiredPrograms.length - missingPrograms.length,
      missingPrograms,
      leaderSelected,
      leaderQualified,
      membersQualified,
      sufficient: requiredPrograms.length > 0
        && missingPrograms.length === 0
        && leaderSelected
        && leaderQualified
        && membersQualified,
    };
  }, [programCapabilityMap, projectTeamExpertIds, requiredPrograms, selectedIsStage1, watchedMembers]);

  const projectScopeStatus = httpStatus(projectScopesQuery.error);
  const scopeAccessDenied = projectScopesQuery.isError && projectScopeStatus === 403;
  const scopeLoadFailed = projectScopesQuery.isError && !scopeAccessDenied;
  const scopeMissing = !projectScopesQuery.isLoading
    && !projectScopesQuery.isError
    && !(projectScopesQuery.data?.length);
  const scopePrerequisiteBlocked = projectScopesQuery.isLoading
    || scopeAccessDenied
    || scopeLoadFailed
    || scopeMissing;

  const downloadScopeIssueReport = () => {
    const report = [
      "BÁO CÁO LỖI ĐIỀU PHỐI ĐOÀN ĐÁNH GIÁ",
      `Thời gian: ${dayjs().format("DD/MM/YYYY HH:mm:ss")}`,
      `${selectedIsProjectContext ? "Hồ sơ" : "Kế hoạch"}: ${selectedDisplayCode ?? "—"}`,
      `Plan ID: ${selectedPlan?.id ?? "—"}`,
      `Project ID: ${selectedPlan?.project_id ?? "—"}`,
      `Hồ sơ: ${selectedPlan?.certification_projects?.project_code ?? "—"}`,
      `HTTP status: ${projectScopeStatus ?? "—"}`,
      `Mô tả: ${scopeAccessDenied
        ? "Tài khoản không có quyền đọc phạm vi dự án"
        : scopeLoadFailed
          ? getErrorMessage(projectScopesQuery.error)
          : scopeMissing
            ? "Hồ sơ chưa có phạm vi ISIC/NACE/IAF được phê duyệt"
            : "Lỗi biểu mẫu phân công đoàn"}`,
    ].join("\r\n");

    downloadDiagnosticReport(
      `bao-cao-loi-${selectedDisplayCode ?? "audit-dossier"}-${dayjs().format("YYYYMMDD-HHmmss")}.txt`,
      report,
    );
    message.success("Đã tải báo cáo lỗi để gửi quản trị viên");
  };

  const focusFormError = (item: AppointmentFormErrorItem) => {
    appointmentForm.scrollToField(item.name, {
      behavior: "smooth",
      block: "center",
    });
  };

  const openProjectAssignment = async (projectId: string) => {
    setOpeningProjectId(projectId);
    try {
      const context = (
        await api.post<AuditPlan>(
          `/audit-team-appointments/project/${projectId}/ensure-context`,
        )
      ).data;

      queryClient.setQueryData<AuditPlan[]>(
        ["audit-plans", "schedule-resources"],
        (current = []) => (
          current.some((plan) => plan.id === context.id)
            ? current
            : [context, ...current]
        ),
      );
      setSelectedPlanId(context.id);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setOpeningProjectId(null);
    }
  };

  const refresh = async () => {
    await Promise.all([
      projectsQuery.refetch(),
      plansQuery.refetch(),
      appointmentsQuery.refetch(),
      canReadExperts ? expertsQuery.refetch() : Promise.resolve(),
      selectedPlanId && canManageTeam ? projectScopesQuery.refetch() : Promise.resolve(),
      selectedPlan?.project_id && canReadExperts ? projectExpertSuitabilityQuery.refetch() : Promise.resolve(),
    ]);
  };

  const invalidateScheduleData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["audit-team-appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["audit-plans"] }),
      queryClient.invalidateQueries({ queryKey: ["certification-projects"] }),
      queryClient.invalidateQueries({ queryKey: ["my-work-tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["my-work-task-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["expert-busy-dates"] }),
      queryClient.invalidateQueries({ queryKey: ["audit-team-project-expert-suitability"] }),
    ]);
  };

  const updatePlanDatesMutation = useMutation({
    mutationFn: async (range: [Dayjs, Dayjs]) => {
      if (!selectedPlan) throw new Error("Chưa chọn kế hoạch đánh giá");
      if (normalize(selectedPlan.status) === "completed" || normalize(selectedPlan.status) === "cancelled") {
        throw new Error("Không thể sửa thời gian của kế hoạch đã hoàn thành hoặc đã hủy");
      }
      const [start, end] = range;
      if (end.isBefore(start, "day")) throw new Error("Ngày kết thúc không được trước ngày bắt đầu");
      return (
        await api.patch<AuditPlan>(`/audit-plans/${selectedPlan.id}`, {
          planned_start_date: start.format("YYYY-MM-DD"),
          planned_end_date: end.format("YYYY-MM-DD"),
        })
      ).data;
    },
    onSuccess: async (updatedPlan, range) => {
      const previousStart = selectedPlanStart;
      const previousEnd = selectedPlanEnd;
      const [nextStart, nextEnd] = range;
      queryClient.setQueryData<AuditPlan[]>(
        ["audit-plans", "schedule-resources"],
        (current = []) => current.map((plan) => plan.id === updatedPlan.id ? { ...plan, ...updatedPlan } : plan),
      );

      const members = (appointmentForm.getFieldValue("members") ?? []) as AppointmentFormMember[];
      appointmentForm.setFieldValue(
        "members",
        members.map((member) => {
          const currentStart = member.planned_dates?.[0]?.startOf("day");
          const currentEnd = member.planned_dates?.[1]?.startOf("day");
          const matchedPreviousRange = Boolean(
            currentStart && currentEnd && previousStart && previousEnd
              && currentStart.isSame(previousStart, "day")
              && currentEnd.isSame(previousEnd, "day"),
          );
          const outsideNextRange = Boolean(
            currentStart && currentEnd
              && (currentStart.isBefore(nextStart, "day") || currentEnd.isAfter(nextEnd, "day")),
          );
          if (!matchedPreviousRange && !outsideNextRange) return member;

          const maximumMandays = nextEnd.diff(nextStart, "day") + 1;
          const currentMandays = parseNumber(member.planned_mandays);
          return {
            ...member,
            planned_dates: [nextStart, nextEnd] as [Dayjs, Dayjs],
            planned_mandays: countsTowardMandays(member.team_role)
              ? Math.min(currentMandays ?? maximumMandays, maximumMandays)
              : 0,
          };
        }),
      );

      setPlanDateEditorOpen(false);
      setPlanDateRange(null);
      await invalidateScheduleData();
      message.success("Đã cập nhật khung ngày của kế hoạch đánh giá");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const syncProjectScopesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan?.project_id) {
        throw new Error("Kế hoạch chưa liên kết với hồ sơ chứng nhận");
      }

      return (
        await api.post<ScopeSyncResponse>(
          `/certification-project-scopes/project/${selectedPlan.project_id}/sync-from-review`,
        )
      ).data;
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(
        ["audit-team-available-project-scopes", selectedPlanId],
        result.scopes,
      );
      await Promise.all([
        projectScopesQuery.refetch(),
        projectExpertSuitabilityQuery.refetch(),
      ]);

      const scopeIds = result.scopes.map((scope) => scope.project_scope_id);
      const members = appointmentForm.getFieldValue("members") ?? [];
      appointmentForm.setFieldsValue({
        members: members.map((member: AppointmentFormMember) => ({
          ...member,
          project_scope_ids: rolesRequiringProjectScope.has(member.team_role)
            ? (member.project_scope_ids?.length
              ? member.project_scope_ids
              : (expertSuitabilityMap.get(member.expert_id)?.covered_scope_ids ?? []).filter((scopeId) => scopeIds.includes(scopeId)))
            : [],
        })),
      });
      setAppointmentFormErrors([]);
      message.success(`Đã đồng bộ ${result.synchronized_count} phạm vi ngành từ bước xem xét đơn`);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const saveAppointmentMutation = useMutation({
    mutationFn: async (values: AppointmentFormValues) => {
      if (!selectedPlan) throw new Error("Chưa chọn kế hoạch đánh giá");

      let preservedProgramWeights: Array<{ program_key: string; pre_ims_mandays: number }> = [];
      if (selectedAppointment && !selectedIsProjectContext && !selectedIsStage1) {
        try {
          const currentAllocation = (
            await api.get<{
              programs?: Array<{ program_key: string; pre_ims_mandays?: number | null }>;
            }>(`/audit-team-appointments/${selectedAppointment.id}/manday-allocation`)
          ).data;
          preservedProgramWeights = (currentAllocation.programs ?? []).map((program) => ({
            program_key: program.program_key,
            pre_ims_mandays: Number(program.pre_ims_mandays ?? 0),
          }));
        } catch {
          preservedProgramWeights = [];
        }
      }

      const leaderCount = values.members.filter((member) => member.team_role === "TEAM_LEADER").length;
      if (leaderCount !== 1) throw new Error("Đoàn đánh giá phải có đúng 01 Trưởng đoàn đánh giá");

      const expertIds = values.members.map((member) => member.expert_id);
      if (new Set(expertIds).size !== expertIds.length) {
        throw new Error("Một chuyên gia không được phân công nhiều lần trong cùng đoàn");
      }

      const availableScopes = projectScopesQuery.data ?? [];
      const availableScopeMap = new Map<string, ProjectScopeOption>(
        availableScopes.map((scope) => [scope.project_scope_id, scope]),
      );
      const selectedScopeIds = new Set<string>();
      const selectedProgramKeys = new Set<string>();

      if (!selectedIsProjectContext && !issuedProjectAppointment) {
        throw new Error("Cần ban hành chỉ định đoàn cấp hồ sơ trước khi phân công cho từng cuộc đánh giá");
      }

      for (const member of values.members) {
        if (!selectedIsProjectContext) {
          if (!member.planned_dates?.[0] || !member.planned_dates?.[1]) {
            throw new Error("Phải chọn thời gian tham gia cho từng chuyên gia");
          }

          const memberStart = member.planned_dates[0].startOf("day");
          const memberEnd = member.planned_dates[1].startOf("day");
          if (selectedPlanStart && memberStart.isBefore(selectedPlanStart)) {
            throw new Error(`Ngày tham gia không được trước ngày bắt đầu kế hoạch ${selectedPlanStart.format("DD/MM/YYYY")}`);
          }
          if (selectedPlanEnd && memberEnd.isAfter(selectedPlanEnd)) {
            throw new Error(`Ngày tham gia không được sau ngày kết thúc kế hoạch ${selectedPlanEnd.format("DD/MM/YYYY")}`);
          }

          const maximumMandays = inclusiveDayCount(member.planned_dates) ?? 0;
          const memberCountsMandays = countsTowardMandays(member.team_role);
          const memberMandays = memberCountsMandays
            ? parseNumber(member.planned_mandays) ?? maximumMandays
            : 0;
          if (memberMandays < 0 || Math.abs(memberMandays * 2 - Math.round(memberMandays * 2)) > 0.001) {
            throw new Error("Ngày công phải từ 0 MD và theo bước 0,5 MD");
          }
          if (memberMandays > maximumMandays) {
            throw new Error(`Ngày công ${memberMandays} MD vượt quá ${maximumMandays} ngày tham gia đã chọn`);
          }
          if (!memberCountsMandays && (parseNumber(member.planned_mandays) ?? 0) > 0) {
            throw new Error("Chuyên gia kỹ thuật, quan sát viên và chuyên gia tập sự không được tính man-day");
          }

          if (!projectTeamExpertIds.has(member.expert_id)) {
            throw new Error("Có chuyên gia không thuộc quyết định chỉ định đoàn cấp hồ sơ đã ban hành");
          }

          const acceptedRoles = acceptedProgramRoles(member.team_role);
          const assignedProgramKeys = selectedIsStage1 ? [] : member.program_keys ?? [];
          if (!selectedIsStage1 && acceptedRoles.length && !assignedProgramKeys.length) {
            throw new Error("Có thành viên chưa được phân công chương trình/tiêu chuẩn đánh giá");
          }

          const capabilities = programCapabilityMap.get(member.expert_id) ?? new Map<string, ProjectProgramCapability>();
          for (const programKey of assignedProgramKeys) {
            const program = programMap.get(programKey);
            if (!program) {
              throw new Error("Có chương trình/tiêu chuẩn không còn thuộc phạm vi chứng nhận đã phê duyệt");
            }
            if (!capabilitySupportsRole(capabilities.get(programKey), member.team_role)) {
              throw new Error(
                `${expertSuitabilityMap.get(member.expert_id)?.full_name ?? "Chuyên gia"} chưa được phê duyệt năng lực ${programDisplayLabel(program)} cho vai trò đã chọn`,
              );
            }
            if (countsTowardMandays(member.team_role)) selectedProgramKeys.add(programKey);
          }
          continue;
        }

        const assignedScopeIds = member.project_scope_ids ?? [];
        const invalidScope = assignedScopeIds.some((scopeId) => !availableScopeMap.has(scopeId));
        if (invalidScope) {
          throw new Error("Có phạm vi phân công không còn thuộc danh sách phạm vi đã phê duyệt của hồ sơ");
        }

        const suitability = expertSuitabilityMap.get(member.expert_id);
        if (rolesRequiringProjectScope.has(member.team_role)) {
          if (!suitability?.is_relevant) {
            throw new Error("Có thành viên không có năng lực phù hợp với bất kỳ tiêu chuẩn/phạm vi nào của hồ sơ");
          }
          const unsupportedScope = assignedScopeIds.find(
            (scopeId) => !suitability.covered_scope_ids.includes(scopeId),
          );
          if (unsupportedScope) {
            throw new Error("Phạm vi giao cho thành viên không khớp năng lực đã được phê duyệt của chuyên gia");
          }
        }

        assignedScopeIds.forEach((scopeId) => selectedScopeIds.add(scopeId));
      }

      const leader = values.members.find((member) => member.team_role === "TEAM_LEADER");
      if (selectedIsProjectContext) {
        const missingScopes = availableScopes.filter((scope) => !selectedScopeIds.has(scope.project_scope_id));
        if (missingScopes.length) {
          throw new Error(
            `Tổng thể đoàn chưa bao phủ: ${missingScopes
              .map((scope) => `${scope.standard_code ?? "Tiêu chuẩn"} · IAF ${scope.iaf?.code ?? "—"} · NACE ${scope.nace?.code ?? "—"}`)
              .join("; ")}`,
          );
        }
        if (!leader || !expertSuitabilityMap.get(leader.expert_id)?.can_lead) {
          throw new Error("Trưởng đoàn phải có năng lực LEAD_AUDITOR phù hợp với ít nhất một tiêu chuẩn/phạm vi của hồ sơ");
        }
      } else if (selectedIsStage1) {
        if (!leader || !projectTeamExpertIds.has(leader.expert_id)) {
          throw new Error("Trưởng đoàn Giai đoạn 1 phải thuộc quyết định chỉ định đoàn cấp hồ sơ đã ban hành");
        }
      } else {
        const missingPrograms = requiredPrograms.filter((program) => !selectedProgramKeys.has(program.key));
        if (missingPrograms.length) {
          throw new Error(
            `Cuộc đánh giá chưa được phân đủ chương trình/tiêu chuẩn: ${missingPrograms.map(programDisplayLabel).join("; ")}`,
          );
        }
        const leaderCapabilities = leader
          ? programCapabilityMap.get(leader.expert_id) ?? new Map<string, ProjectProgramCapability>()
          : new Map<string, ProjectProgramCapability>();
        const leaderQualified = Boolean(
          leader?.program_keys?.some((programKey) => leaderCapabilities.get(programKey)?.can_lead),
        );
        if (!leader || !leaderQualified) {
          throw new Error("Trưởng đoàn phải có năng lực LEAD_AUDITOR đối với ít nhất một chương trình/tiêu chuẩn được phân công");
        }
      }

      const payload: AppointmentPayload = {
        appointment_number: values.appointment_number.trim(),
        appointment_date: values.appointment_date.format("YYYY-MM-DD"),
        note: values.note?.trim() || undefined,
        members: values.members.map((member) => {
          const memberMandays = !selectedIsProjectContext
            ? countsTowardMandays(member.team_role)
              ? parseNumber(member.planned_mandays) ?? inclusiveDayCount(member.planned_dates)
              : 0
            : undefined;
          const scopeIds = selectedIsProjectContext
            ? member.project_scope_ids ?? []
            : selectedIsStage1
              ? []
              : Array.from(new Set(
                (member.program_keys ?? []).flatMap(
                  (programKey) => programMap.get(programKey)?.project_scope_ids ?? [],
                ),
              ));

          return {
            expert_id: member.expert_id,
            team_role: member.team_role,
            ...(!selectedIsProjectContext && member.planned_dates
              ? {
                planned_start_date: member.planned_dates[0].format("YYYY-MM-DD"),
                planned_end_date: member.planned_dates[1].format("YYYY-MM-DD"),
                planned_mandays: memberMandays,
              }
              : {}),
            scopes: rolesRequiringProjectScope.has(member.team_role)
              ? scopeIds.map((scopeId) => {
                const scope = availableScopeMap.get(scopeId)!;
                const program = programMap.get(projectProgramKey(scope.management_system, scope.standard_code));
                return {
                  project_scope_id: scopeId,
                  activity_description: selectedIsProjectContext
                    ? scope.certification_scope ?? undefined
                    : program
                      ? programDisplayLabel(program)
                      : scope.standard_code ?? scope.management_system ?? undefined,
                  coverage_type: "full",
                };
              })
              : [],
          };
        }),
      };

      const savedAppointment = selectedAppointment
        ? (await api.patch<AuditTeamAppointment>(`/audit-team-appointments/${selectedAppointment.id}`, payload)).data
        : (await api.post<AuditTeamAppointment>("/audit-team-appointments", {
          ...payload,
          audit_plan_id: selectedPlan.id,
        })).data;

      let allocationWarning: string | null = null;
      if (!selectedIsProjectContext && !selectedIsStage1) {
        try {
          await api.post(
            `/audit-team-appointments/${savedAppointment.id}/manday-allocation/auto`,
            { program_weights: preservedProgramWeights },
          );
        } catch (error) {
          allocationWarning = getErrorMessage(error);
        }
      }

      return { savedAppointment, allocationWarning };
    },
    onSuccess: async ({ allocationWarning }) => {
      await invalidateScheduleData();
      setAppointmentModalOpen(false);
      setAppointmentFormErrors([]);
      appointmentForm.resetFields();
      if (allocationWarning) {
        message.warning(`Đã lưu dự thảo nhưng chưa tự phân bổ được ma trận man-day: ${allocationWarning}`);
      } else {
        message.success(
          selectedAppointment
            ? selectedIsProjectContext || selectedIsStage1
              ? "Đã cập nhật dự thảo phân công"
              : "Đã cập nhật dự thảo và tự động phân bổ lại man-day theo chương trình"
            : selectedIsProjectContext
              ? "Đã tạo dự thảo chỉ định đoàn"
              : selectedIsStage1
                ? "Đã lưu phân công Giai đoạn 1"
                : "Đã lưu phân công và tự động phân bổ man-day theo chương trình",
        );
      }
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const issueAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) =>
      (await api.post<AuditTeamAppointment>(`/audit-team-appointments/${appointmentId}/issue`)).data,
    onSuccess: async () => {
      await invalidateScheduleData();
      message.success(selectedIsProjectContext
        ? "Đã ban hành chỉ định đoàn cấp hồ sơ"
        : "Đã ban hành phân công cho cuộc đánh giá");
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error);
      message.error(errorMessage);
      if (/phạm vi|isic|nace|iaf|chương trình|tiêu chuẩn|năng lực|trưởng đoàn|tổng thể đoàn|ngày công|manday|thời gian|lịch/i.test(errorMessage)) {
        setAppointmentModalOpen(true);
        projectScopesQuery.refetch();
      }
    },
  });

  const openAppointmentForm = () => {
    if (!selectedPlan) return;
    setAppointmentFormErrors([]);
    const planStart = selectedPlan.planned_start_date ? dayjs(selectedPlan.planned_start_date) : dayjs();
    const planEnd = selectedPlan.planned_end_date ? dayjs(selectedPlan.planned_end_date) : planStart;
    const inheritedProjectAppointment = !selectedIsProjectContext && selectedPlan.project_id
      ? projectAppointmentsByProject.get(selectedPlan.project_id)
      : null;
    const inheritedMembers = inheritedProjectAppointment?.members ?? [];
    const sourceMembers = selectedAppointment?.members?.length
      ? selectedAppointment.members
      : selectedIsStage1
        ? inheritedMembers.filter((member) => normalize(member.team_role) === "team_leader")
        : inheritedMembers;

    const defaultMembers: AppointmentFormMember[] = sourceMembers.length
      ? sourceMembers.map((member) => {
        const expertId = member.experts?.id ?? member.expert_id ?? "";
        const teamRole = member.team_role?.toUpperCase() ?? "AUDITOR";
        const programKeys = Array.from(new Set(
          (member.scopes ?? [])
            .map((scope) => {
              if (scope.project_scope?.standard_code || scope.project_scope?.management_system) {
                return projectProgramKey(
                  scope.project_scope.management_system,
                  scope.project_scope.standard_code,
                );
              }
              const scopeOption = scope.project_scope_id
                ? (projectScopesQuery.data ?? []).find((item) => item.project_scope_id === scope.project_scope_id)
                : undefined;
              return scopeOption
                ? projectProgramKey(scopeOption.management_system, scopeOption.standard_code)
                : null;
            })
            .filter((key): key is string => typeof key === "string" && key.length > 0 && programMap.has(key)),
        ));
        const supportedProgramKeys = acceptedProgramRoles(teamRole).length
          ? programKeys.filter((key) => capabilitySupportsRole(
            programCapabilityMap.get(expertId)?.get(key),
            teamRole,
          ))
          : [];

        return {
          expert_id: expertId,
          team_role: teamRole,
          planned_dates: selectedIsProjectContext
            ? undefined
            : [
              selectedAppointment && member.planned_start_date ? dayjs(member.planned_start_date) : planStart,
              selectedAppointment && member.planned_end_date ? dayjs(member.planned_end_date) : planEnd,
            ],
          planned_mandays: selectedIsProjectContext
            ? undefined
            : countsTowardMandays(teamRole)
              ? selectedAppointment
                ? parseNumber(member.planned_mandays)
                  ?? inclusiveDayCount([
                    member.planned_start_date ? dayjs(member.planned_start_date) : planStart,
                    member.planned_end_date ? dayjs(member.planned_end_date) : planEnd,
                  ])
                : selectedIsStage1
                  ? Math.min(
                    selectedRequiredMandays ?? inclusiveDayCount([planStart, planEnd]) ?? 0.5,
                    inclusiveDayCount([planStart, planEnd]) ?? 0.5,
                  )
                  : inclusiveDayCount([planStart, planEnd])
              : 0,
          project_scope_ids: selectedIsProjectContext
            ? member.scopes
              ?.map((scope) => scope.project_scope_id)
              .filter((scopeId): scopeId is string => Boolean(scopeId)) ?? []
            : [],
          program_keys: selectedIsProjectContext ? [] : supportedProgramKeys,
        };
      })
      : [{
        expert_id: "",
        team_role: "TEAM_LEADER",
        planned_dates: selectedIsProjectContext ? undefined : [planStart, planEnd],
        planned_mandays: selectedIsProjectContext
          ? undefined
          : selectedIsStage1
            ? Math.min(
              selectedRequiredMandays ?? inclusiveDayCount([planStart, planEnd]) ?? 0.5,
              inclusiveDayCount([planStart, planEnd]) ?? 0.5,
            )
            : inclusiveDayCount([planStart, planEnd]),
        project_scope_ids: [],
        program_keys: [],
      }];

    appointmentForm.setFieldsValue({
      appointment_number: selectedAppointment?.appointment_number
        ?? (selectedIsProjectContext
          ? `F04-${dayjs().format("YYYYMMDD-HHmmss")}`
          : `${selectedPlan.plan_code}-TEAM`),
      appointment_date: selectedAppointment?.appointment_date
        ? dayjs(selectedAppointment.appointment_date)
        : dayjs(),
      note: selectedAppointment?.note
        ?? (!selectedIsProjectContext && inheritedProjectAppointment
          ? `Phân công cho ${selectedPlan.plan_code} từ đoàn đã ban hành của hồ sơ ${selectedPlan.certification_projects?.project_code ?? ""}`
          : undefined),
      members: defaultMembers,
    });
    setAppointmentModalOpen(true);
  };

  const columns: TableColumnsType<AuditPlan> = [
    {
      key: "plan_code",
      title: "Kỳ đánh giá",
      width: 180,
      render: (_, record) => {
        const project = record.certification_projects;
        const isProjectContext = normalize(record.audit_type) === "project_team";
        return (
          <div className="schedule-code-cell">
            <strong>{isProjectContext ? project?.project_code ?? record.plan_code : record.plan_code}</strong>
            <span>{labelFromMap(record.audit_type, auditTypeLabels)}</span>
          </div>
        );
      },
    },
    {
      key: "project",
      title: "Khách hàng & hồ sơ",
      width: 280,
      render: (_, record) => {
        const project = record.certification_projects;
        const customer = project?.certification_applications?.customers;
        return (
          <div className="schedule-project-cell">
            <strong>{customer?.company_name ?? record.audit_event?.audit_programs?.organization_name ?? "Chưa xác định tổ chức"}</strong>
            <span>{project?.project_code ?? "Chưa liên kết hồ sơ"} · {project?.standard_name ?? record.audit_event?.audit_programs?.standard_name ?? "—"}</span>
          </div>
        );
      },
    },
    {
      dataIndex: "planned_start_date",
      key: "date",
      title: "Thời gian",
      width: 180,
      render: (_, record) => (
        <div className="schedule-date-cell">
          <CalendarOutlined />
          <span>{formatDateRange(record.planned_start_date, record.planned_end_date)}</span>
        </div>
      ),
    },
    {
      key: "team",
      title: "Đoàn đánh giá",
      width: 210,
      render: (_, record) => {
        const appointment = appointmentsByPlan.get(record.id);
        const count = appointment?.members?.length ?? 0;
        return (
          <div className={count ? "schedule-team-cell" : "schedule-team-cell schedule-team-missing"}>
            <TeamOutlined />
            <div>
              <strong>{count ? `${count} thành viên` : "Chưa phân công"}</strong>
              <span>{appointment?.appointment_number ?? "Chưa có quyết định chỉ định"}</span>
            </div>
          </div>
        );
      },
    },
    {
      dataIndex: "status",
      key: "status",
      title: "Trạng thái",
      width: 150,
      render: (status) => <PlanStatusTag status={status} />,
    },
    {
      key: "action",
      title: "",
      width: 105,
      fixed: "right",
      render: (_, record) => <Button type="primary" ghost onClick={() => setSelectedPlanId(record.id)}>Chi tiết</Button>,
    },
  ];

  const projectColumns: TableColumnsType<CertificationProjectSummary> = [
    {
      key: "project_code",
      title: "Mã hồ sơ chứng nhận",
      width: 190,
      render: (_, record) => (
        <div className="schedule-code-cell">
          <strong>{record.project_code}</strong>
          <span>{record.certification_applications?.application_code ?? "Hồ sơ chứng nhận"}</span>
        </div>
      ),
    },
    {
      key: "customer",
      title: "Khách hàng",
      render: (_, record) => (
        <div className="schedule-project-cell">
          <strong>{record.certification_applications?.customers?.company_name ?? "Chưa xác định"}</strong>
          <span>{record.standard_name ?? record.certification_applications?.standard_name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "scope",
      title: "Phạm vi",
      render: (_, record) => (
        <Text ellipsis={{ tooltip: record.certification_applications?.certification_scope ?? "Chưa cập nhật" }}>
          {record.certification_applications?.certification_scope ?? "Chưa cập nhật"}
        </Text>
      ),
    },
    {
      key: "team",
      title: "Chỉ định đoàn",
      width: 220,
      render: (_, record) => {
        const appointment = projectAppointmentsByProject.get(record.id);
        const count = appointment?.members?.length ?? 0;
        return (
          <div className={count ? "schedule-team-cell" : "schedule-team-cell schedule-team-missing"}>
            <TeamOutlined />
            <div>
              <strong>{count ? `${count} thành viên` : "Chưa chỉ định"}</strong>
              <span>{appointment?.appointment_number ?? "Cần lập trước chương trình"}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      width: 150,
      render: (_, record) => {
        const appointment = projectAppointmentsByProject.get(record.id);
        if (!appointment) return <Tag color="default">Chưa lập</Tag>;
        return <PlanStatusTag status={appointment.status} />;
      },
    },
    {
      key: "action",
      title: "",
      width: 150,
      align: "right",
      render: (_, record) => (
        <Button
          icon={<TeamOutlined />}
          loading={openingProjectId === record.id}
          onClick={() => void openProjectAssignment(record.id)}
          type={projectAppointmentsByProject.has(record.id) ? "default" : "primary"}
        >
          {projectAppointmentsByProject.has(record.id) ? "Mở chỉ định" : "Chỉ định đoàn"}
        </Button>
      ),
    },
  ];

  const loading = projectsQuery.isLoading
    || plansQuery.isLoading
    || appointmentsQuery.isLoading
    || (canReadExperts && expertsQuery.isLoading)
    || (Boolean(requestedProjectId) && projectContextQuery.isLoading);
  const error = projectsQuery.error
    || plansQuery.error
    || appointmentsQuery.error
    || (canReadExperts ? expertsQuery.error : null);

  if (loading) {
    return <div className="screen-loading"><Skeleton active paragraph={{ rows: 10 }} /></div>;
  }

  return (
    <div className="schedule-resources-screen">
      <div className="screen-heading-row">
        <div>
          <Text className="page-eyebrow">ĐIỀU PHỐI ĐÁNH GIÁ</Text>
          <Title level={1}>Lịch & nguồn lực</Title>
          <Text type="secondary">Chỉ định đoàn theo mã hồ sơ chứng nhận; kế hoạch đánh giá là tài liệu chi tiết được lập sau chương trình.</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>Làm mới</Button>
      </div>

      {error ? <Alert action={<Button onClick={() => void refresh()}>Thử lại</Button>} description={getErrorMessage(error)} message="Không thể tải dữ liệu lịch và nguồn lực" showIcon type="error" /> : null}
      {projectContextQuery.isError ? (
        <Alert
          action={<Button onClick={() => void projectContextQuery.refetch()}>Thử lại</Button>}
          description={getErrorMessage(projectContextQuery.error)}
          message="Không mở được hồ sơ để chỉ định đoàn"
          showIcon
          type="error"
        />
      ) : null}

      <section className="resource-summary-grid">
        <Card><Statistic prefix={<FolderOpenOutlined />} title="Tổng hồ sơ" value={projects.length} /></Card>
        <Card><Statistic prefix={<WarningOutlined />} title="Hồ sơ chưa chỉ định đoàn" value={projects.filter((project) => !projectAppointmentsByProject.has(project.id)).length} /></Card>
        <Card><Statistic prefix={<ClockCircleOutlined />} title="Kế hoạch sắp tới" value={upcomingPlans.length} /></Card>
        <Card><Statistic prefix={<UserOutlined />} title={canReadExperts ? "Chuyên gia đang hoạt động" : "Chuyên gia đã phân công"} value={activeExperts.length} /></Card>
      </section>

      <Card className="schedule-workspace-card">
        <Tabs
          activeKey={workspaceTab}
          items={[
            {
              key: "projects",
              label: "Theo hồ sơ chứng nhận",
              children: (
                <div className="schedule-workspace-panel">
                  <Alert
                    description="Dùng để chỉ định thành phần đoàn ở cấp hồ sơ PRJ trước khi lập chương trình. Ngày và man-day được phân bổ tại từng đợt đánh giá."
                    message="Quản lý cuốn chiếu theo hồ sơ"
                    showIcon
                    type="info"
                  />
                  <Table
                    columns={projectColumns}
                    dataSource={projects}
                    locale={{
                      emptyText: <Empty description="Chưa có hồ sơ chứng nhận" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                    }}
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                    rowKey="id"
                    scroll={{ x: 1120 }}
                  />
                </div>
              ),
            },
            {
              key: "plans",
              label: "Theo đợt đánh giá",
              children: (
                <div className="schedule-workspace-panel">
                  <div className="schedule-toolbar">
                    <Input allowClear onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm mã kế hoạch, hồ sơ, khách hàng, tiêu chuẩn..." prefix={<SearchOutlined />} value={searchTerm} />
                    <Select onChange={setCustomerFilter} options={customerOptions} showSearch value={customerFilter} />
                    <Select onChange={setAuditTypeFilter} options={auditTypeOptions} value={auditTypeFilter} />
                    <Select onChange={setPeriodFilter} options={[
                      { label: "Tất cả thời gian", value: "all" },
                      { label: "Lịch sắp tới", value: "upcoming" },
                      { label: "Đã hoàn thành", value: "completed" },
                      { label: "Chưa phân công đoàn", value: "unassigned" },
                    ]} value={periodFilter} />
                    <Select onChange={setStatusFilter} options={[
                      { label: "Tất cả trạng thái", value: "all" },
                      { label: "Bản nháp", value: "draft" },
                      { label: "Đã lập kế hoạch", value: "planned" },
                      { label: "Đang thực hiện", value: "in_progress" },
                      { label: "Hoàn thành", value: "completed" },
                      { label: "Đã hủy", value: "cancelled" },
                    ]} value={statusFilter} />
                  </div>
                  <Table columns={columns} dataSource={filteredPlans} locale={{ emptyText: <Empty description="Không có kế hoạch phù hợp bộ lọc" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} pagination={{ pageSize: 10, showSizeChanger: false }} rowKey="id" scroll={{ x: 1120 }} />
                </div>
              ),
            },
            {
              key: "calendar",
              label: "Lịch tháng",
              children: (
                <div className="resource-month-calendar">
                  <div className="resource-calendar-header">
                    <div>
                      <Text strong>{monthPlans.length} đợt đánh giá trong tháng {calendarMonth.format("MM/YYYY")}</Text>
                      <Text type="secondary">Bấm vào đợt đánh giá để mở chi tiết và phân công chuyên gia.</Text>
                    </div>
                    <Space wrap>
                      <Tag color="blue">Dự kiến/bản nháp</Tag>
                      <Tag color="gold">Đang thực hiện</Tag>
                      <Tag color="green">Hoàn thành</Tag>
                    </Space>
                  </div>
                  <Calendar
                    cellRender={(current, info) => {
                      if (info.type !== "date") return info.originNode;
                      const dayPlans = monthPlans.filter((plan) => {
                        if (!plan.planned_start_date) return false;
                        const start = dayjs(plan.planned_start_date).startOf("day");
                        const endDate = dayjs(plan.planned_end_date ?? plan.planned_start_date).startOf("day");
                        return !current.startOf("day").isBefore(start) && !current.startOf("day").isAfter(endDate);
                      });
                      return (
                        <div className="resource-calendar-cell">
                          {info.originNode}
                          <div className="resource-calendar-events">
                            {dayPlans.slice(0, 3).map((plan) => (
                              <button
                                className={`resource-calendar-event status-${normalize(plan.status) || "draft"}`}
                                key={plan.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedPlanId(plan.id);
                                }}
                                type="button"
                              >
                                <strong>{plan.plan_code}</strong>
                                <span>{plan.certification_projects?.certification_applications?.customers?.company_name ?? "Khách hàng"}</span>
                              </button>
                            ))}
                            {dayPlans.length > 3 ? <Text type="secondary">+{dayPlans.length - 3} đợt khác</Text> : null}
                          </div>
                        </div>
                      );
                    }}
                    onPanelChange={(value) => setCalendarMonth(value.startOf("month"))}
                    value={calendarMonth}
                  />
                </div>
              ),
            },
          ]}
          onChange={setWorkspaceTab}
        />
      </Card>

      <Drawer
        destroyOnHidden
        onClose={() => setSelectedPlanId(null)}
        open={Boolean(selectedPlan)}
        title={<div><Text type="secondary">{selectedIsProjectContext ? "Chỉ định đoàn theo hồ sơ chứng nhận" : "Chi tiết kế hoạch đánh giá"}</Text><div className="drawer-code-title">{selectedDisplayCode}</div></div>}
        width={760}
      >
        {selectedPlan ? (
          <div className="schedule-detail-content">
            <Card>
              <div className="schedule-detail-title">
                <div><Text type="secondary">{labelFromMap(selectedPlan.audit_type, auditTypeLabels)}</Text><Title level={3}>{selectedIsProjectContext ? selectedPlan.certification_projects?.project_code ?? selectedPlan.plan_code : selectedPlan.plan_code}</Title></div>
                <PlanStatusTag status={selectedPlan.status} />
              </div>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Hồ sơ">{selectedPlan.certification_projects?.project_code ?? "Chưa liên kết"}</Descriptions.Item>
                <Descriptions.Item label="Tiêu chuẩn">{selectedPlan.certification_projects?.standard_name ?? selectedPlan.audit_criteria ?? "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Thời gian">
                  {selectedIsProjectContext
                    ? "Được phân bổ tại từng kế hoạch đánh giá"
                    : formatDateRange(selectedPlan.planned_start_date, selectedPlan.planned_end_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Địa điểm">{selectedPlan.location ?? "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Phạm vi" span={2}>{selectedPlan.audit_scope ?? selectedPlan.certification_projects?.certification_applications?.certification_scope ?? "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Mục tiêu" span={2}>{selectedPlan.audit_objectives ?? "Chưa cập nhật"}</Descriptions.Item>
              </Descriptions>
              {selectedPlan.project_id ? <Button icon={<FolderOpenOutlined />} onClick={() => onOpenProject(selectedPlan.project_id)}>Mở hồ sơ chứng nhận</Button> : null}
            </Card>

            {selectedIsProjectContext ? <Card className="project-assignment-brief" title="Thông tin làm căn cứ chỉ định đoàn">
              {projectBriefQuery.isLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : projectBriefQuery.isError ? (
                <Alert
                  action={<Button onClick={() => void projectBriefQuery.refetch()}>Thử lại</Button>}
                  description={getErrorMessage(projectBriefQuery.error)}
                  message="Không tải được thông tin hồ sơ"
                  showIcon
                  type="error"
                />
              ) : projectBriefApplication ? <>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Khách hàng">{projectBriefApplication.customers?.company_name ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Mã đơn">{projectBriefApplication.application_code ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Tiêu chuẩn" span={2}>{projectBriefApplication.standard_name ?? projectBrief?.standard_name ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Phạm vi chứng nhận" span={2}>{projectBriefApplication.certification_scope ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Nhân sự hiệu dụng">{projectBriefReview?.effective_personnel ?? projectBriefApplication.employee_count ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Số địa điểm">{projectBriefApplication.site_count ?? projectBriefApplication.sites?.length ?? 0}</Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ trụ sở" span={2}>{projectBriefApplication.headquarters_address ?? projectBriefApplication.customers?.address ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Man-day đã duyệt">{projectBriefManday?.final_mandays ?? projectBriefReview?.final_mandays ?? "Chưa có"}</Descriptions.Item>
                  <Descriptions.Item label="Stage 1 / Stage 2">{projectBriefManday ? `${projectBriefManday.stage1_mandays ?? "—"} / ${projectBriefManday.stage2_mandays ?? "—"}` : `${projectBriefReview?.stage1_mandays ?? "—"} / ${projectBriefReview?.stage2_mandays ?? "—"}`}</Descriptions.Item>
                </Descriptions>

                {projectIndustryScopes.length ? <div className="project-assignment-scope-tags">
                  <Text strong>Phạm vi ngành đã xác nhận</Text>
                  <Space wrap>
                    {projectIndustryScopes.map((scope, index) => (
                      <Tag color="geekblue" key={`${String(scope.standard_code ?? "std")}-${String(scope.iaf_code ?? "iaf")}-${index}`}>
                        {String(scope.standard_code ?? scope.management_system ?? "Tiêu chuẩn")} · IAF {String(scope.iaf_code ?? "—")} · NACE {String(scope.nace_code ?? "—")}
                      </Tag>
                    ))}
                  </Space>
                </div> : null}

                {projectBriefApplication.sites?.length ? <Table
                  columns={[
                    { title: "Địa điểm", dataIndex: "site_name", key: "site_name", render: (value: string | null, row: { site_no: number }) => value || `Địa điểm ${row.site_no}` },
                    { title: "Địa chỉ", dataIndex: "address", key: "address" },
                    { title: "Hoạt động", dataIndex: "activities", key: "activities", render: (value: string | null) => value || "—" },
                    { title: "Nhân sự", dataIndex: "employee_count", key: "employee_count", width: 90, render: (value: number | null) => value ?? "—" },
                  ]}
                  dataSource={projectBriefApplication.sites}
                  pagination={false}
                  rowKey="id"
                  size="small"
                  style={{ marginTop: 12 }}
                /> : null}

                <Space style={{ marginTop: 12 }} wrap>
                  <Button icon={<EyeOutlined />} onClick={() => { setProjectSourceRecord("application"); setProjectSourceTab("system"); }}>Xem phiếu đăng ký</Button>
                  <Button disabled={!projectBriefReview} icon={<EyeOutlined />} onClick={() => { setProjectSourceRecord("review"); setProjectSourceTab("system"); }}>Xem phiếu xem xét</Button>
                  {selectedPlan.project_id ? <Button icon={<FolderOpenOutlined />} onClick={() => onOpenProject(selectedPlan.project_id)}>Mở toàn bộ hồ sơ</Button> : null}
                </Space>
              </> : <Empty description="Hồ sơ chưa có thông tin nguồn" />}
            </Card> : null}

            <Card
              extra={canManageTeam ? (
                <Space>
                  {selectedAppointment && normalize(selectedAppointment.status) === "draft" ? (
                    <Button icon={<EditOutlined />} onClick={openAppointmentForm}>Sửa dự thảo</Button>
                  ) : null}
                  {!selectedAppointment ? (
                    <Button icon={<PlusOutlined />} type="primary" onClick={openAppointmentForm}>
                      {selectedIsProjectContext ? "Lập chỉ định đoàn" : "Phân công cho đợt đánh giá"}
                    </Button>
                  ) : null}
                  {selectedAppointment && normalize(selectedAppointment.status) === "draft" ? (
                    <Popconfirm
                      cancelText="Chưa"
                      description="Sau khi ban hành, dự thảo sẽ được khóa để bảo đảm tính kiểm soát."
                      okText="Ban hành"
                      onConfirm={() => issueAppointmentMutation.mutate(selectedAppointment.id)}
                      title="Ban hành chỉ định đoàn?"
                    >
                      <Tooltip
                        title={!selectedAppointmentMandaysBalanced
                          ? `Cần bố trí tối thiểu ${formatMandays(selectedRequiredMandays)} MD trước khi ban hành`
                          : undefined}
                      >
                        <Button
                          disabled={!selectedAppointmentMandaysBalanced}
                          icon={<SendOutlined />}
                          loading={issueAppointmentMutation.isPending}
                          type="primary"
                        >
                          Ban hành
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  ) : null}
                </Space>
              ) : null}
              title={selectedIsProjectContext ? "Quyết định chỉ định đoàn cấp hồ sơ" : "Phân công đoàn cho cuộc đánh giá"}
            >
              {selectedAppointment ? (
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Số quyết định">{selectedAppointment.appointment_number ?? "Chưa cập nhật"}</Descriptions.Item>
                  <Descriptions.Item label="Ngày chỉ định">{formatDate(selectedAppointment.appointment_date)}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái"><PlanStatusTag status={selectedAppointment.status} /></Descriptions.Item>
                  <Descriptions.Item label="Số thành viên">{selectedAppointment.members?.length ?? 0}</Descriptions.Item>
                  {selectedAppointment.note ? <Descriptions.Item label="Ghi chú" span={2}>{selectedAppointment.note}</Descriptions.Item> : null}
                </Descriptions>
              ) : <Empty description={canManageTeam ? (selectedIsProjectContext ? "Hồ sơ chưa có quyết định chỉ định đoàn" : "Cuộc đánh giá chưa có phân công đoàn") : "Chưa có dữ liệu phân công"} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              {selectedAppointment && !selectedIsProjectContext ? (
                <Alert
                  className="drawer-manday-allocation-alert"
                  description={selectedRequiredMandays === undefined
                    ? "Kỳ đánh giá chưa có man-day trong chương trình. Cập nhật chương trình trước khi ban hành phân công."
                    : selectedAppointmentAllocatedMandays + 0.001 < selectedRequiredMandays
                      ? `Đang thiếu ${formatMandays(Math.abs(Number(selectedAppointmentMandayDifference)))} MD. Mở Sửa dự thảo để bổ sung.`
                      : Number(selectedAppointmentMandayDifference) > 0.001
                        ? `Đã bố trí cao hơn mức kế hoạch ${formatMandays(Number(selectedAppointmentMandayDifference))} MD. Đây là phương án hợp lệ; toàn bộ phần vượt sẽ vẫn được phân vào chương trình.`
                        : "Tổng ngày công bố trí đúng bằng mức man-day kế hoạch."}
                  message={`Man-day bố trí: ${formatMandays(selectedAppointmentAllocatedMandays)} MD · Kế hoạch tối thiểu: ${formatMandays(selectedRequiredMandays)} MD`}
                  showIcon
                  type={selectedRequiredMandays === undefined ? "info" : selectedAppointmentMandaysBalanced ? "success" : "warning"}
                />
              ) : null}
            </Card>

            <Card title="Đoàn đánh giá">
              {selectedAppointment?.members?.length ? (
                <div className="schedule-member-list">
                  {selectedAppointment.members.map((member) => (
                    <div className="schedule-member-item" key={member.id}>
                      <div className="schedule-member-avatar"><UserOutlined /></div>
                      <div className="schedule-member-info">
                        <strong>{member.experts?.full_name ?? "Chưa cập nhật chuyên gia"}</strong>
                        <span>{labelFromMap(member.team_role, roleLabels)} · {member.experts?.email ?? "Chưa có email"}</span>
                        {member.scopes?.length ? (
                          <div className="schedule-member-scopes">
                            {selectedIsProjectContext
                              ? member.scopes.map((scope, scopeIndex) => (
                                <Tag key={scope.id ?? `${member.id}-${scopeIndex}`}>
                                  IAF {scope.iaf_code ?? "—"} · NACE {scope.nace_code ?? "—"}
                                </Tag>
                              ))
                              : Array.from(new Map(
                                member.scopes.map((scope) => {
                                  const key = projectProgramKey(
                                    scope.project_scope?.management_system,
                                    scope.project_scope?.standard_code,
                                  );
                                  const label = scope.project_scope?.standard_code
                                    ? programDisplayLabel({
                                      standard_code: scope.project_scope.standard_code,
                                      management_system: scope.project_scope.management_system ?? "",
                                    })
                                    : scope.activity_description ?? "Chương trình đánh giá";
                                  return [key || label, label] as const;
                                }),
                              ).entries()).map(([key, label]) => (
                                <Tag color="blue" key={`${member.id}-${key}`}>{label}</Tag>
                              ))}
                          </div>
                        ) : rolesRequiringProjectScope.has((member.team_role ?? "").toUpperCase()) ? (
                          <Text type="warning">{selectedIsProjectContext ? "Chưa phân công phạm vi dự án" : "Chưa phân công chương trình/tiêu chuẩn"}</Text>
                        ) : null}
                      </div>
                      {!selectedIsProjectContext ? (
                        <div className="schedule-member-period">
                          <CheckCircleOutlined /> {formatDateRange(member.planned_start_date, member.planned_end_date)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : <Empty description="Chưa có thành viên được phân công" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </Card>

            {selectedPlan.location ? <div className="schedule-location-note"><EnvironmentOutlined /> Địa điểm đánh giá: {selectedPlan.location}</div> : null}
          </div>
        ) : null}
      </Drawer>

      <Modal
        cancelButtonProps={{ style: { display: "none" } }}
        destroyOnHidden
        footer={null}
        onCancel={() => setProjectSourceRecord(null)}
        open={Boolean(projectSourceRecord)}
        title={projectSourceRecord === "application"
          ? `Phiếu đăng ký ${projectBriefApplication?.application_code ?? ""}`
          : "Xem xét đăng ký chứng nhận"}
        width={880}
      >
        <Tabs
          activeKey={projectSourceTab}
          items={[
            { key: "system", label: "Dữ liệu hệ thống" },
            { key: "scan", label: `Bản scan/tệp đính kèm (${projectSourceFiles.length})` },
          ]}
          onChange={(key) => setProjectSourceTab(key as "system" | "scan")}
        />

        {projectSourceTab === "system" && projectSourceRecord === "application" ? (
          projectBriefApplication ? <div className="project-source-record-view">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Khách hàng">{projectBriefApplication.customers?.company_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Mã đơn">{projectBriefApplication.application_code ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Ngày đăng ký">{formatDate(projectBriefApplication.application_date)}</Descriptions.Item>
              <Descriptions.Item label="Loại chứng nhận">{projectBriefApplication.certification_type ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Tiêu chuẩn" span={2}>{projectBriefApplication.standard_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Phạm vi" span={2}>{projectBriefApplication.certification_scope ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Điều khoản loại trừ">{projectBriefApplication.excluded_clauses ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Nhân sự hiệu dụng">{projectBriefApplication.employee_count ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Người đại diện">{projectBriefApplication.representative_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Liên hệ đại diện">{[projectBriefApplication.representative_phone, projectBriefApplication.representative_email].filter(Boolean).join(" · ") || "—"}</Descriptions.Item>
              <Descriptions.Item label="Người liên hệ">{projectBriefApplication.contact_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Liên hệ">{[projectBriefApplication.contact_phone, projectBriefApplication.contact_email].filter(Boolean).join(" · ") || "—"}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ trụ sở" span={2}>{projectBriefApplication.headquarters_address ?? projectBriefApplication.customers?.address ?? "—"}</Descriptions.Item>
            </Descriptions>
            <Divider orientation="left">Địa điểm chứng nhận</Divider>
            <Table
              columns={[
                { title: "STT", dataIndex: "site_no", key: "site_no", width: 64 },
                { title: "Tên địa điểm", dataIndex: "site_name", key: "site_name", render: (value: string | null, row: { site_no: number }) => value || `Địa điểm ${row.site_no}` },
                { title: "Địa chỉ", dataIndex: "address", key: "address" },
                { title: "Hoạt động", dataIndex: "activities", key: "activities", render: (value: string | null) => value || "—" },
                { title: "Nhân sự", dataIndex: "employee_count", key: "employee_count", width: 90, render: (value: number | null) => value ?? "—" },
              ]}
              dataSource={projectBriefApplication.sites ?? []}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </div> : <Empty description="Không có dữ liệu phiếu đăng ký" />
        ) : null}

        {projectSourceTab === "system" && projectSourceRecord === "review" ? (
          projectBriefReview ? <div className="project-source-record-view">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Kết quả"><PlanStatusTag status={projectBriefReview.result} /></Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><PlanStatusTag status={projectBriefReview.workflow_status} /></Descriptions.Item>
              <Descriptions.Item label="Người kiểm tra">{projectBriefReview.checker?.full_name ?? projectBriefReview.checked_by_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Lĩnh vực">{projectBriefReview.audit_field ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Mã IAF">{projectBriefReview.iaf_code ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Mã ISIC">{projectBriefReview.isic_code ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Mức rủi ro/phức tạp">{projectBriefReview.risk_level ?? "Không áp dụng"}</Descriptions.Item>
              <Descriptions.Item label="Phương pháp MD">{projectBriefReview.manday_method ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Nhân sự hiệu dụng">{projectBriefReview.effective_personnel ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="MD cơ sở">{projectBriefReview.base_mandays ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="MD lần đầu">{projectBriefReview.final_mandays ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Stage 1 / Stage 2">{projectBriefReview.stage1_mandays ?? "—"} / {projectBriefReview.stage2_mandays ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Kết luận" span={2}>{projectBriefReview.conclusion ?? "—"}</Descriptions.Item>
            </Descriptions>
            {projectIndustryScopes.length ? <>
              <Divider orientation="left">Phạm vi ngành đã xác nhận</Divider>
              <Space wrap>
                {projectIndustryScopes.map((scope, index) => (
                  <Tag color="geekblue" key={index}>
                    {String(scope.standard_code ?? scope.management_system ?? "Tiêu chuẩn")} · ISIC {String(scope.isic_code ?? "—")} · NACE {String(scope.nace_code ?? "—")} · IAF {String(scope.iaf_code ?? "—")}
                  </Tag>
                ))}
              </Space>
            </> : null}
          </div> : <Empty description="Không có dữ liệu xem xét" />
        ) : null}

        {projectSourceTab === "scan" ? (
          <Table
            columns={[
              { title: "Tên tệp", dataIndex: "original_name", key: "original_name" },
              { title: "Loại", dataIndex: "document_type", key: "document_type", render: (value: string) => value.replaceAll("_", " ") },
              { title: "Phiên bản", dataIndex: "version_no", key: "version_no", width: 90 },
              { title: "Ngày tải", dataIndex: "uploaded_at", key: "uploaded_at", width: 120, render: (value: string) => formatDate(value) },
              { title: "", key: "action", width: 100, render: (_: unknown, file: ProjectBriefFile) => <Button icon={<EyeOutlined />} loading={openingSourceFileId === file.id} onClick={() => void openProjectSourceFile(file)} size="small">Mở</Button> },
            ]}
            dataSource={projectSourceFiles}
            locale={{ emptyText: <Empty description="Chưa có bản scan hoặc tệp đính kèm" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            pagination={false}
            rowKey="id"
            size="small"
          />
        ) : null}
      </Modal>

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        maskClosable={false}
        okButtonProps={{
          disabled: scopePrerequisiteBlocked
            || planTeamPrerequisiteBlocked
            || !selectableExperts.length
            || projectExpertSuitabilityQuery.isLoading
            || projectExpertSuitabilityQuery.isError
            || (selectedIsProjectContext ? !teamCoverage.sufficient : !planProgramCoverage.sufficient),
          icon: <SaveOutlined />,
          loading: saveAppointmentMutation.isPending,
        }}
        okText={selectedAppointment
          ? "Lưu thay đổi"
          : selectedIsProjectContext
            ? "Tạo dự thảo chỉ định"
            : "Lưu phân công"}
        onCancel={() => {
          setAppointmentModalOpen(false);
          setAppointmentFormErrors([]);
        }}
        onOk={() => appointmentForm.submit()}
        open={appointmentModalOpen}
        title={selectedAppointment
          ? `Sửa chỉ định đoàn ${selectedAppointment.appointment_number ?? ""}`
          : selectedIsProjectContext
            ? `Chỉ định đoàn cho hồ sơ ${selectedDisplayCode ?? ""}`
            : `Phân công đoàn cho đợt ${selectedDisplayCode ?? ""}`}
        width={920}
      >
        {selectedIsProjectContext ? <Card className="appointment-modal-project-brief" size="small" title="Hồ sơ cần chỉ định đoàn">
          {projectBriefQuery.isLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : projectBriefApplication ? <>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Khách hàng">{projectBriefApplication.customers?.company_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Mã hồ sơ">{selectedDisplayCode ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Tiêu chuẩn" span={2}>{projectBriefApplication.standard_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Phạm vi" span={2}>{projectBriefApplication.certification_scope ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Nhân sự / địa điểm">{projectBriefReview?.effective_personnel ?? projectBriefApplication.employee_count ?? "—"} / {projectBriefApplication.site_count ?? projectBriefApplication.sites?.length ?? 0}</Descriptions.Item>
              <Descriptions.Item label="MD lần đầu">{projectBriefManday?.final_mandays ?? projectBriefReview?.final_mandays ?? "Chưa có"}</Descriptions.Item>
            </Descriptions>
            <Space wrap>
              <Button icon={<EyeOutlined />} onClick={() => { setProjectSourceRecord("application"); setProjectSourceTab("system"); }} size="small">Phiếu đăng ký</Button>
              <Button disabled={!projectBriefReview} icon={<EyeOutlined />} onClick={() => { setProjectSourceRecord("review"); setProjectSourceTab("system"); }} size="small">Phiếu xem xét</Button>
              {selectedPlan?.project_id ? <Button icon={<FolderOpenOutlined />} onClick={() => onOpenProject(selectedPlan.project_id)} size="small">Mở hồ sơ</Button> : null}
            </Space>
          </> : <Alert message="Chưa tải được thông tin hồ sơ" showIcon type="warning" />}
        </Card> : null}

        {!selectableExperts.length ? (
          <Alert
            description={selectedIsProjectContext
              ? "Hãy tạo hoặc kích hoạt hồ sơ chuyên gia trước khi phân công đoàn đánh giá."
              : "Chỉ các chuyên gia thuộc quyết định chỉ định đoàn cấp hồ sơ đã ban hành mới được phân công cho cuộc đánh giá này."}
            message={selectedIsProjectContext ? "Chưa có chuyên gia đang hoạt động" : "Không có chuyên gia hợp lệ để phân công"}
            showIcon
            type="warning"
          />
        ) : null}
        {projectScopesQuery.isLoading ? (
          <Alert
            className="appointment-scope-alert"
            message="Đang kiểm tra điều kiện phân công đoàn..."
            showIcon
            type="info"
          />
        ) : null}

        {scopeAccessDenied ? (
          <Alert
            action={(
              <Space wrap>
                {selectedPlan?.project_id ? (
                  <Button icon={<FolderOpenOutlined />} onClick={() => onOpenProject(selectedPlan.project_id)}>
                    Mở hồ sơ
                  </Button>
                ) : null}
                <Button icon={<FileTextOutlined />} onClick={downloadScopeIssueReport}>
                  Tải báo cáo lỗi
                </Button>
              </Space>
            )}
            className="appointment-scope-alert appointment-prerequisite-alert"
            description="Tài khoản hiện tại không có quyền đọc phạm vi dự án. Hãy dùng tài khoản Điều phối viên/Quản trị viên hoặc đề nghị quản trị viên cấp quyền projects.read và audit_teams.read."
            message="Không có quyền truy cập phạm vi ngành"
            showIcon
            type="error"
          />
        ) : null}

        {scopeLoadFailed ? (
          <Alert
            action={(
              <Space wrap>
                <Button icon={<ReloadOutlined />} loading={projectScopesQuery.isFetching} onClick={() => projectScopesQuery.refetch()}>
                  Thử lại
                </Button>
                <Button icon={<FileTextOutlined />} onClick={downloadScopeIssueReport}>
                  Tải báo cáo lỗi
                </Button>
              </Space>
            )}
            className="appointment-scope-alert appointment-prerequisite-alert"
            description={getErrorMessage(projectScopesQuery.error)}
            message="Không tải được phạm vi dự án"
            showIcon
            type="error"
          />
        ) : null}

        {scopeMissing ? (
          <Alert
            action={(
              <Space wrap>
                <Button
                  icon={<SyncOutlined />}
                  loading={syncProjectScopesMutation.isPending}
                  onClick={() => syncProjectScopesMutation.mutate()}
                  type="primary"
                >
                  Đồng bộ từ xem xét đơn
                </Button>
                {selectedPlan?.project_id ? (
                  <Button icon={<FolderOpenOutlined />} onClick={() => onOpenProject(selectedPlan.project_id)}>
                    Mở hồ sơ
                  </Button>
                ) : null}
                <Button icon={<FileTextOutlined />} onClick={downloadScopeIssueReport}>
                  Tải báo cáo lỗi
                </Button>
              </Space>
            )}
            className="appointment-scope-alert appointment-prerequisite-alert"
            description="Bước xem xét đơn phải hoàn tất mã ISIC → NACE → IAF trước khi tạo hồ sơ. Với hồ sơ cũ, bấm Đồng bộ để chuyển phạm vi đã duyệt sang dự án; hệ thống không cho phân công đoàn khi điều kiện này chưa đạt."
            message="Chưa đạt điều kiện phân công đoàn"
            showIcon
            type="warning"
          />
        ) : null}

        {!scopePrerequisiteBlocked && !planTeamPrerequisiteBlocked ? (
        <Form<AppointmentFormValues>
          className="appointment-form"
          form={appointmentForm}
          layout="vertical"
          onFinish={(values) => {
            setAppointmentFormErrors([]);
            saveAppointmentMutation.mutate(values);
          }}
          onFinishFailed={({ errorFields }) => {
            const normalizedErrors = errorFields.map((field, index) => ({
              key: `${field.name.join("-")}-${index}`,
              name: field.name,
              label: formFieldLabel(field.name),
              message: String(field.errors[0] ?? "Dữ liệu chưa hợp lệ"),
            }));
            setAppointmentFormErrors(normalizedErrors);
            if (normalizedErrors[0]) focusFormError(normalizedErrors[0]);
          }}
        >
          {appointmentFormErrors.length ? (
            <Alert
              className="appointment-form-error-summary"
              description={(
                <div className="appointment-form-error-links">
                  {appointmentFormErrors.map((item) => (
                    <Button icon={<WarningOutlined />} key={item.key} onClick={() => focusFormError(item)} type="link">
                      {item.label}: {item.message}
                    </Button>
                  ))}
                </div>
              )}
              message={`Còn ${appointmentFormErrors.length} nội dung cần xử lý`}
              showIcon
              type="error"
            />
          ) : null}
          <div className="appointment-form-grid">
            <Form.Item
              label={selectedIsProjectContext ? "Số chỉ định đoàn" : "Mã phân công đợt đánh giá"}
              name="appointment_number"
              rules={[{ required: true, message: selectedIsProjectContext ? "Nhập số chỉ định đoàn" : "Nhập mã phân công" }]}
            >
              <Input maxLength={50} placeholder={selectedIsProjectContext ? "Ví dụ: F04-20260803-001" : "Ví dụ: ASSIGN-PLAN-2026-0004"} />
            </Form.Item>
            <Form.Item label={selectedIsProjectContext ? "Ngày chỉ định" : "Ngày lập phân công"} name="appointment_date" rules={[{ required: true, message: "Chọn ngày lập" }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea maxLength={1000} placeholder="Ghi chú về phạm vi, yêu cầu hoặc điều kiện phân công" rows={2} showCount />
          </Form.Item>

          {!selectedIsProjectContext ? (
            <div className="plan-allocation-summary">
              <Descriptions bordered column={4} size="small">
                <Descriptions.Item label="Kế hoạch">{selectedPlan?.plan_code ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Thời gian">{formatDateRange(selectedPlan?.planned_start_date, selectedPlan?.planned_end_date)}</Descriptions.Item>
                <Descriptions.Item label="MD yêu cầu">{selectedRequiredMandays === undefined ? "Chưa xác định" : `${formatMandays(selectedRequiredMandays)} MD`}</Descriptions.Item>
                <Descriptions.Item label="MD đã phân">{formatMandays(draftAllocatedMandays)} MD</Descriptions.Item>
              </Descriptions>
              <Alert
                description={selectedRequiredMandays === undefined
                  ? "Kỳ đánh giá chưa có ngày công trong chương trình. Có thể lưu dự thảo, nhưng cần cập nhật chương trình trước khi ban hành."
                  : draftAllocatedMandays + 0.001 < selectedRequiredMandays
                    ? `Đang thiếu ${formatMandays(Math.abs(Number(draftMandayDifference)))} MD. Dự thảo vẫn lưu được nhưng chưa thể ban hành.`
                    : Number(draftMandayDifference) > 0.001
                      ? `Đã bố trí vượt kế hoạch ${formatMandays(Number(draftMandayDifference))} MD. Hệ thống cho phép và sẽ phân toàn bộ số MD này vào ma trận chương trình.`
                      : "Tổng ngày công bố trí đúng bằng mức kế hoạch."}
                message={selectedRequiredMandays === undefined
                  ? "Chưa có cơ sở đối chiếu man-day"
                  : `MD bố trí: ${formatMandays(draftAllocatedMandays)} MD · Kế hoạch tối thiểu: ${formatMandays(selectedRequiredMandays)} MD`}
                showIcon
                type={selectedRequiredMandays === undefined
                  ? "info"
                  : draftAllocatedMandays + 0.001 >= selectedRequiredMandays
                    ? "success"
                    : "warning"}
              />
              {draftPlanCapacityInsufficient ? (
                <Alert
                  action={canManageTeam ? (
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => {
                        setPlanDateRange([selectedPlanStart ?? dayjs(), selectedPlanEnd ?? selectedPlanStart ?? dayjs()]);
                        setPlanDateEditorOpen(true);
                      }}
                      size="small"
                      type="primary"
                    >
                      Sửa khung ngày kế hoạch
                    </Button>
                  ) : undefined}
                  description={`Khung kế hoạch hiện có ${selectedPlanCalendarDays} ngày và ${draftCountingMemberCount} thành viên tính MD, tối đa ${formatMandays(draftPlanCapacity)} MD; kỳ đánh giá yêu cầu ${formatMandays(selectedRequiredMandays ?? 0)} MD. Hãy kéo dài khung ngày hoặc bổ sung đánh giá viên.`}
                  message="Khung ngày hiện tại chưa đủ khả năng bố trí man-day"
                  showIcon
                  type="warning"
                />
              ) : null}
            </div>
          ) : null}

          <div className="appointment-members-heading">
            <div>
              <strong>Thành viên đoàn đánh giá</strong>
              <Text type="secondary">
                {selectedIsProjectContext
                  ? "Chỉ định thành phần đoàn và phạm vi năng lực cho hồ sơ. Thời gian, lịch bận và ngày công được phân bổ tại từng kế hoạch PLAN-."
                  : "Phân bổ thời gian và ngày công cho đúng đợt đánh giá; đoàn phải có đúng 01 Trưởng đoàn."}
              </Text>
            </div>
          </div>

          {selectedIsProjectContext ? (
            <Alert
              className="appointment-team-coverage-alert"
              description={teamCoverage.missingScopes.length
                ? `Còn thiếu: ${teamCoverage.missingScopes
                  .map((scope) => `${scope.standard_code ?? "Tiêu chuẩn"} · IAF ${scope.iaf?.code ?? "—"} · NACE ${scope.nace?.code ?? "—"}`)
                  .join("; ")}`
                : !teamCoverage.leaderSelected
                  ? "Chưa chọn đúng 01 Trưởng đoàn đánh giá. Hãy đổi vai trò của một chuyên gia có nhãn ‘Có thể làm trưởng đoàn’."
                  : !teamCoverage.leaderQualified
                    ? "Trưởng đoàn đã chọn chưa có năng lực LEAD_AUDITOR phù hợp với ít nhất một tiêu chuẩn/phạm vi của hồ sơ."
                    : "Các phạm vi được bao phủ bởi ít nhất một thành viên phù hợp; không yêu cầu mọi thành viên phải có đủ toàn bộ IAF/NACE."}
              message={projectExpertSuitabilityQuery.isLoading
                ? "Đang đối chiếu năng lực chuyên gia..."
                : projectExpertSuitabilityQuery.isError
                  ? `Không tải được ma trận năng lực: ${getErrorMessage(projectExpertSuitabilityQuery.error)}`
                  : `Độ bao phủ tổng thể đoàn: ${teamCoverage.covered}/${teamCoverage.required} phạm vi`}
              showIcon
              type={teamCoverage.sufficient ? "success" : projectExpertSuitabilityQuery.isError ? "error" : "warning"}
            />
          ) : (
            <Alert
              className="appointment-team-coverage-alert"
              description={planTeamPrerequisiteBlocked
                ? "Hãy quay lại hồ sơ chính, hoàn thiện và ban hành quyết định chỉ định đoàn trước. Sau đó từng cuộc đánh giá chỉ phân chương trình/tiêu chuẩn, lịch và man-day cho các thành viên của đoàn."
                : selectedIsStage1
                  ? "Giai đoạn 1 không chia man-day theo chương trình. Trưởng đoàn chịu trách nhiệm chính; có thể bổ sung đánh giá viên khi cần. Tổng MD của trưởng đoàn và đánh giá viên phải khớp MD Giai đoạn 1; vai trò hỗ trợ bằng 0 MD."
                : planProgramCoverage.missingPrograms.length
                  ? `Chưa phân đủ: ${planProgramCoverage.missingPrograms.map(programDisplayLabel).join("; ")}`
                  : !planProgramCoverage.leaderSelected
                    ? "Chưa chọn đúng 01 Trưởng đoàn đánh giá."
                    : !planProgramCoverage.leaderQualified
                      ? "Trưởng đoàn chưa có năng lực LEAD_AUDITOR cho chương trình/tiêu chuẩn được phân công."
                      : !planProgramCoverage.membersQualified
                        ? "Có thành viên không thuộc đoàn cấp hồ sơ hoặc chương trình được giao chưa phù hợp với năng lực đã phê duyệt."
                        : "IAF/NACE đã được kiểm tra và khóa tại chỉ định đoàn cấp hồ sơ. Ở từng cuộc đánh giá chỉ cần phân chương trình/tiêu chuẩn, ngày tham gia và man-day."}
              message={planTeamPrerequisiteBlocked
                ? "Chưa có chỉ định đoàn cấp hồ sơ đã ban hành"
                : selectedIsStage1
                  ? "Phân công Giai đoạn 1"
                  : `Phân công chương trình: ${planProgramCoverage.covered}/${planProgramCoverage.required}`}
              showIcon
              type={planProgramCoverage.sufficient ? "success" : "warning"}
            />
          )}

          <Form.List name="members" rules={[{
            validator: async (_, members: AppointmentFormMember[] | undefined) => {
              if (!members?.length) throw new Error("Phải có ít nhất 01 thành viên");
            },
          }]}>
            {(fields, { add, remove }, { errors }) => (
              <>
                <div className="appointment-member-form-list">
                  {fields.map((field, index) => {
                    const selectedMember = (watchedMembers as AppointmentFormMember[])[index];
                    const selectedExpertId = selectedMember?.expert_id;
                    const selectedSuitability = selectedExpertId
                      ? expertSuitabilityMap.get(selectedExpertId)
                      : undefined;
                    const compatibleScopeIds = new Set(selectedSuitability?.covered_scope_ids ?? []);
                    const selectedProgramCapabilities = selectedExpertId
                      ? programCapabilityMap.get(selectedExpertId) ?? new Map<string, ProjectProgramCapability>()
                      : new Map<string, ProjectProgramCapability>();
                    const compatibleProgramKeys = new Set(
                      requiredPrograms
                        .filter((program) => capabilitySupportsRole(
                          selectedProgramCapabilities.get(program.key),
                          selectedMember?.team_role,
                        ))
                        .map((program) => program.key),
                    );
                    const selectedExpertIds = (watchedMembers as AppointmentFormMember[])
                      .map((member, memberIndex) => memberIndex === index ? null : member?.expert_id)
                      .filter(Boolean);
                    return (
                      <div className="appointment-member-form" key={field.key}>
                        <div className="appointment-member-number">{index + 1}</div>
                        <div className="appointment-member-fields">
                          <Form.Item
                            extra={selectedSuitability ? (
                              <Space size={4} wrap>
                                {selectedIsProjectContext ? (
                                  <Tag color={selectedSuitability.is_relevant ? "green" : "default"}>
                                    Phù hợp {selectedSuitability.coverage_count}/{selectedSuitability.required_scope_count} phạm vi
                                  </Tag>
                                ) : (
                                  <Tag color={selectedProgramCapabilities.size ? "green" : "default"}>
                                    Thực hiện được {selectedProgramCapabilities.size}/{requiredPrograms.length} chương trình
                                  </Tag>
                                )}
                                {selectedSuitability.can_lead ? <Tag color="blue">Có thể làm trưởng đoàn</Tag> : null}
                              </Space>
                            ) : selectedIsProjectContext
                              ? "Chỉ hiển thị chuyên gia có ít nhất một năng lực phù hợp với hồ sơ."
                              : "Chỉ hiển thị thành viên thuộc quyết định chỉ định đoàn cấp hồ sơ đã ban hành."}
                            label="Chuyên gia"
                            name={[field.name, "expert_id"]}
                            rules={[{ required: true, message: "Chọn chuyên gia" }]}
                          >
                            <Select
                              disabled={!selectableExperts.length}
                              onChange={(expertId: string) => {
                                const suitability = expertSuitabilityMap.get(expertId);
                                const teamRole = appointmentForm.getFieldValue(["members", field.name, "team_role"]);
                                if (selectedIsProjectContext) {
                                  appointmentForm.setFieldValue(
                                    ["members", field.name, "project_scope_ids"],
                                    rolesRequiringProjectScope.has(teamRole)
                                      ? suitability?.covered_scope_ids ?? []
                                      : [],
                                  );
                                  appointmentForm.setFieldValue(["members", field.name, "program_keys"], []);
                                  return;
                                }

                                const capabilities = programCapabilityMap.get(expertId) ?? new Map<string, ProjectProgramCapability>();
                                appointmentForm.setFieldValue(
                                  ["members", field.name, "program_keys"],
                                  acceptedProgramRoles(teamRole).length
                                    ? requiredPrograms
                                      .filter((program) => capabilitySupportsRole(capabilities.get(program.key), teamRole))
                                      .map((program) => program.key)
                                    : [],
                                );
                                appointmentForm.setFieldValue(["members", field.name, "project_scope_ids"], []);
                              }}
                              optionFilterProp="label"
                              options={selectableExperts.map((expert) => {
                                const suitability = expertSuitabilityMap.get(expert.id);
                                const programCount = suitability?.program_capabilities?.length ?? 0;
                                const suitabilityLabel = selectedIsProjectContext
                                  ? suitability
                                    ? ` · phù hợp ${suitability.coverage_count}/${suitability.required_scope_count}${suitability.can_lead ? " · trưởng đoàn" : ""}`
                                    : ""
                                  : ` · ${programCount}/${requiredPrograms.length} chương trình${suitability?.can_lead ? " · trưởng đoàn" : ""}`;
                                return {
                                  disabled: selectedExpertIds.includes(expert.id)
                                    || Boolean(selectedIsProjectContext && projectExpertSuitabilityQuery.data && !suitability?.is_relevant),
                                  label: `${expert.full_name ?? "Chưa cập nhật tên"}${expert.email ? ` · ${expert.email}` : ""}${suitabilityLabel}`,
                                  value: expert.id,
                                };
                              })}
                              placeholder={projectExpertSuitabilityQuery.isLoading
                                ? "Đang đối chiếu năng lực..."
                                : selectedIsProjectContext
                                  ? "Chọn chuyên gia phù hợp"
                                  : "Chọn thành viên của đoàn cấp hồ sơ"}
                              showSearch
                            />
                          </Form.Item>
                          <Form.Item
                            label="Vai trò"
                            name={[field.name, "team_role"]}
                            rules={[{ required: true, message: "Chọn vai trò" }]}
                          >
                            <Select
                              onChange={(teamRole: string) => {
                                if (!selectedIsProjectContext) {
                                  if (!countsTowardMandays(teamRole)) {
                                    appointmentForm.setFieldValue(["members", field.name, "planned_mandays"], 0);
                                  } else if (selectedIsStage1) {
                                    const plannedDates = appointmentForm.getFieldValue(["members", field.name, "planned_dates"]);
                                    const suggestedMandays = inclusiveDayCount(plannedDates) ?? 0.5;
                                    appointmentForm.setFieldValue(
                                      ["members", field.name, "planned_mandays"],
                                      Math.max(0.5, suggestedMandays),
                                    );
                                  }
                                }
                                if (selectedIsProjectContext) {
                                  if (!rolesRequiringProjectScope.has(teamRole)) {
                                    appointmentForm.setFieldValue(["members", field.name, "project_scope_ids"], []);
                                  } else if (selectedSuitability) {
                                    appointmentForm.setFieldValue(
                                      ["members", field.name, "project_scope_ids"],
                                      selectedSuitability.covered_scope_ids,
                                    );
                                  }
                                  return;
                                }

                                appointmentForm.setFieldValue(
                                  ["members", field.name, "program_keys"],
                                  acceptedProgramRoles(teamRole).length
                                    ? requiredPrograms
                                      .filter((program) => capabilitySupportsRole(
                                        selectedProgramCapabilities.get(program.key),
                                        teamRole,
                                      ))
                                      .map((program) => program.key)
                                    : [],
                                );
                              }}
                              options={teamRoleOptions}
                            />
                          </Form.Item>
                          {!selectedIsProjectContext ? (
                            <Form.Item
                              label="Thời gian tham gia đợt đánh giá"
                              name={[field.name, "planned_dates"]}
                              rules={[{ required: true, message: "Chọn thời gian tham gia" }]}
                            >
                              <BusyDateRangePicker
                                defaultAnchor={selectedPlanStart ?? dayjs()}
                                excludeAppointmentId={selectedAppointment?.id}
                                expertId={selectedExpertId}
                                onSuggestedMandaysChange={(suggested) => {
                                  const teamRole = appointmentForm.getFieldValue(["members", field.name, "team_role"]);
                                  appointmentForm.setFieldValue(
                                    ["members", field.name, "planned_mandays"],
                                    !countsTowardMandays(teamRole) ? 0 : suggested,
                                  );
                                }}
                                planEnd={selectedPlanEnd}
                                planStart={selectedPlanStart}
                              />
                            </Form.Item>
                          ) : null}
                          {!selectedIsProjectContext ? (
                            <Form.Item
                              extra={!countsTowardMandays(selectedMember?.team_role)
                                ? "Vai trò này tham gia hỗ trợ nhưng không được tính man-day."
                                : selectedIsStage1
                                  ? selectedMember?.planned_dates
                                    ? `Gợi ý ${formatMandays(inclusiveDayCount(selectedMember.planned_dates))} MD theo thời gian tham gia. Tổng MD của trưởng đoàn và đánh giá viên phải tối thiểu ${formatMandays(selectedRequiredMandays ?? 0)} MD.`
                                    : "Giai đoạn 1 không chia theo chương trình; nhập man-day trực tiếp cho từng người tham gia."
                                  : selectedMember?.planned_dates
                                    ? `Đã tự tính ${formatMandays(inclusiveDayCount(selectedMember.planned_dates))} MD theo ${inclusiveDayCount(selectedMember.planned_dates)} ngày đã chọn. Có thể điều chỉnh lại theo bước 0,5 MD; khi lưu hệ thống tự phân bổ lại ma trận chương trình.`
                                    : "Chọn thời gian để hệ thống xác định năng lực nhận man-day tối đa."}
                              label="Ngày công"
                              name={[field.name, "planned_mandays"]}
                              rules={[
                                { required: true, message: "Nhập ngày công" },
                                {
                                  validator: async (_, value) => {
                                    const mandays = parseNumber(value);
                                    const maximumMandays = inclusiveDayCount(selectedMember?.planned_dates);
                                    const counting = countsTowardMandays(selectedMember?.team_role);
                                    if (mandays === undefined || mandays < 0) throw new Error("Tối thiểu 0 MD");
                                    if (!counting && mandays !== 0) throw new Error("Vai trò này không tính man-day");
                                    if (selectedIsStage1 && counting && mandays < 0.5) {
                                      throw new Error("Thành viên tính man-day tham gia Giai đoạn 1 phải có tối thiểu 0,5 MD");
                                    }
                                    if (Math.abs(mandays * 2 - Math.round(mandays * 2)) > 0.001) throw new Error("Ngày công phải theo bước 0,5 MD");
                                    if (maximumMandays !== undefined && mandays > maximumMandays) {
                                      throw new Error(`Không vượt quá ${maximumMandays} MD theo thời gian đã chọn`);
                                    }
                                  },
                                },
                              ]}
                            >
                              <InputNumber
                                disabled={!countsTowardMandays(selectedMember?.team_role)}
                                min={0}
                                precision={1}
                                step={0.5}
                                style={{ width: "100%" }}
                              />
                            </Form.Item>
                          ) : null}
                          {selectedIsProjectContext ? (
                            <Form.Item
                              className="appointment-member-scope-field"
                              label="Phạm vi năng lực thành viên phụ trách"
                              name={[field.name, "project_scope_ids"]}
                            >
                              <Select
                                allowClear
                                disabled={!projectScopesQuery.data?.length || !selectedExpertId}
                                loading={projectScopesQuery.isLoading || projectExpertSuitabilityQuery.isLoading}
                                maxTagCount="responsive"
                                mode="multiple"
                                optionFilterProp="label"
                                options={(projectScopesQuery.data ?? []).map((scope) => ({
                                  disabled: Boolean(selectedExpertId && !compatibleScopeIds.has(scope.project_scope_id)),
                                  label: `${scope.standard_code ?? scope.management_system ?? "Tiêu chuẩn"} · IAF ${scope.iaf?.code ?? "—"} · NACE ${scope.nace?.code ?? "—"} · ${scope.certification_scope ?? scope.nace?.name ?? "Phạm vi dự án"}`,
                                  value: scope.project_scope_id,
                                }))}
                                placeholder="Chọn phạm vi phù hợp với năng lực chuyên gia"
                                showSearch
                              />
                            </Form.Item>
                          ) : selectedIsStage1 ? (
                            <Alert
                              className="appointment-member-scope-field"
                              message={countsTowardMandays(selectedMember?.team_role)
                                ? selectedMember?.team_role === "TEAM_LEADER"
                                  ? "Trưởng đoàn chịu trách nhiệm chính và được phân man-day Giai đoạn 1"
                                  : "Đánh giá viên có thể tham gia và được phân man-day Giai đoạn 1"
                                : "Vai trò hỗ trợ tham gia nhưng không được tính man-day"}
                              showIcon
                              type="info"
                            />
                          ) : (
                            <Form.Item
                              className="appointment-member-scope-field"
                              extra="Không kiểm tra lại IAF/NACE tại đây. Hệ thống chỉ đối chiếu chương trình/tiêu chuẩn với năng lực đã phê duyệt của thành viên."
                              label="Chương trình/tiêu chuẩn phụ trách"
                              name={[field.name, "program_keys"]}
                              rules={[{
                                validator: async (_, value: string[] | undefined) => {
                                  if (acceptedProgramRoles(selectedMember?.team_role).length && !value?.length) {
                                    throw new Error("Chọn ít nhất 01 chương trình/tiêu chuẩn");
                                  }
                                },
                              }]}
                            >
                              <Select
                                allowClear
                                disabled={!requiredPrograms.length || !selectedExpertId}
                                loading={projectScopesQuery.isLoading || projectExpertSuitabilityQuery.isLoading}
                                maxTagCount="responsive"
                                mode="multiple"
                                optionFilterProp="label"
                                options={requiredPrograms.map((program) => ({
                                  disabled: Boolean(selectedExpertId && !compatibleProgramKeys.has(program.key)),
                                  label: programDisplayLabel(program),
                                  value: program.key,
                                }))}
                                placeholder="Chọn chương trình chuyên gia thực hiện trong cuộc đánh giá"
                                showSearch
                              />
                            </Form.Item>
                          )}
                        </div>
                        <Button
                          aria-label="Xóa thành viên"
                          danger
                          disabled={fields.length === 1}
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                          type="text"
                        />
                      </div>
                    );
                  })}
                </div>
                <Form.ErrorList errors={errors} />
                <Button
                  block
                  disabled={!selectableExperts.length}
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const planStart = selectedPlan?.planned_start_date ? dayjs(selectedPlan.planned_start_date) : dayjs();
                    const planEnd = selectedPlan?.planned_end_date ? dayjs(selectedPlan.planned_end_date) : planStart;
                    add({
                      expert_id: "",
                      team_role: "AUDITOR",
                      planned_dates: selectedIsProjectContext ? undefined : [planStart, planEnd],
                      planned_mandays: selectedIsProjectContext
                        ? undefined
                        : selectedIsStage1
                          ? 0.5
                          : inclusiveDayCount([planStart, planEnd]),
                      project_scope_ids: [],
                      program_keys: [],
                    });
                  }}
                  type="dashed"
                >
                  Thêm thành viên
                </Button>
              </>
            )}
          </Form.List>

          {!selectedIsProjectContext && selectedAppointment ? (
            <IntegratedMandayAllocationPanel
              appointmentId={selectedAppointment.id}
              onChanged={async () => {
                await invalidateScheduleData();
              }}
            />
          ) : !selectedIsProjectContext ? (
            <Alert
              message="Lưu dự thảo trước khi phân bổ ma trận man-day"
              description="Sau khi lưu thành phần đoàn và lịch tham gia, mở lại dự thảo để bấm Tự động phân bổ theo Thành viên + Chương trình."
              showIcon
              type="info"
            />
          ) : null}
        </Form>
        ) : null}
      </Modal>

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        okButtonProps={{
          disabled: !planDateRange,
          loading: updatePlanDatesMutation.isPending,
        }}
        okText="Cập nhật khung ngày"
        onCancel={() => {
          setPlanDateEditorOpen(false);
          setPlanDateRange(null);
        }}
        onOk={() => {
          if (planDateRange) updatePlanDatesMutation.mutate(planDateRange);
        }}
        open={planDateEditorOpen}
        title={`Sửa thời gian kế hoạch ${selectedPlan?.plan_code ?? ""}`}
        width={620}
      >
        <Alert
          description="Chương trình ba năm chỉ lưu tháng dự kiến. Đây là khung ngày cụ thể của PLAN dùng để chọn lịch chuyên gia; có thể sửa mà không thay đổi tháng dự kiến trong chương trình."
          message="Khung ngày kế hoạch và tháng dự kiến là hai dữ liệu khác nhau"
          showIcon
          style={{ marginBottom: 16 }}
          type="info"
        />
        <RangePicker
          allowClear={false}
          format="DD/MM/YYYY"
          onChange={(dates) => {
            if (dates?.[0] && dates?.[1]) setPlanDateRange([dates[0], dates[1]]);
          }}
          style={{ width: "100%" }}
          value={planDateRange}
        />
        {planDateRange && selectedRequiredMandays !== undefined ? (
          <Alert
            description={`Khoảng đã chọn có ${planDateRange[1].diff(planDateRange[0], "day") + 1} ngày. Sau khi cập nhật, hãy phân ngày và MD cho từng thành viên; tổng phải tối thiểu ${formatMandays(selectedRequiredMandays)} MD; có thể bố trí cao hơn khi cần.`}
            message="Kiểm tra khả năng bố trí sau khi chọn thành viên"
            showIcon
            style={{ marginTop: 16 }}
            type="warning"
          />
        ) : null}
      </Modal>
    </div>
  );
}
