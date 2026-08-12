"use client";

import {
  AuditOutlined,
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
  Avatar,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
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

const { Text, Title } = Typography;

interface ExpertsScreenProps {
  roles: string[];
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
  match_status: string;
  reasons: string[];
  checks: {
    account_linked: boolean;
    profile_approved: boolean;
    program_and_role: boolean;
    scope_complete: boolean;
    schedule_available: boolean;
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
  nace_revision?: string;
  nace_code?: string;
  scope_description?: string;
  competency_level: string;
  effective_date: Dayjs;
  expiry_date?: Dayjs;
  approval_basis?: string;
  evidence_summary?: string;
  restriction?: string;
  notes?: string;
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

const competencyLevelOptions = [
  { value: "TRAINEE", label: "Tập sự" },
  { value: "UNDER_SUPERVISION", label: "Dưới giám sát" },
  { value: "QUALIFIED", label: "Đủ năng lực" },
  { value: "SENIOR", label: "Cấp cao" },
  { value: "EXPERT", label: "Chuyên gia" },
];

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
  DRAFT: "Chờ phê duyệt",
  APPROVED: "Đã phê duyệt",
  SUSPENDED: "Tạm đình chỉ",
};

const approvalColors: Record<string, string> = {
  DRAFT: "gold",
  APPROVED: "green",
  SUSPENDED: "red",
};

const matchLabels: Record<string, string> = {
  ELIGIBLE: "Đủ điều kiện",
  SCHEDULE_CONFLICT: "Trùng lịch",
  INSUFFICIENT_SCOPE: "Thiếu phạm vi",
};

const matchColors: Record<string, string> = {
  ELIGIBLE: "green",
  SCHEDULE_CONFLICT: "red",
  INSUFFICIENT_SCOPE: "gold",
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

export function ExpertsScreen({ roles }: ExpertsScreenProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileMode, setProfileMode] = useState<"create" | "edit">("create");
  const [competencyModalOpen, setCompetencyModalOpen] = useState(false);
  const [workModalOpen, setWorkModalOpen] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);
  const [recommendationModalOpen, setRecommendationModalOpen] = useState(false);
  const [recommendationPlanId, setRecommendationPlanId] = useState<string>();
  const [recommendationRole, setRecommendationRole] = useState("TEAM_LEADER");
  const [profileForm] = Form.useForm<ExpertFormValues>();
  const [competencyForm] = Form.useForm<CompetencyFormValues>();
  const [workForm] = Form.useForm<WorkExperienceFormValues>();
  const [certificateForm] = Form.useForm<CertificateFormValues>();

  const canManage = roles.some((role) => role.toLowerCase() === "admin");

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
        await api.post<ExpertCompetency>("/expert-competencies", {
          expert_id: selectedExpertId,
          management_system: values.management_system,
          standard_code: values.standard_code,
          competency_role: values.competency_role,
          scope_level: values.scope_level,
          iaf_code: values.iaf_code,
          nace_revision: values.scope_level === "NACE" ? values.nace_revision || "NACE_REV_2" : undefined,
          nace_code: values.scope_level === "NACE" ? values.nace_code : undefined,
          scope_description: values.scope_description,
          competency_level: values.competency_level,
          effective_date: values.effective_date.format("YYYY-MM-DD"),
          expiry_date: values.expiry_date?.format("YYYY-MM-DD"),
          approval_basis: values.approval_basis,
          evidence_summary: values.evidence_summary,
          restriction: values.restriction,
          notes: values.notes,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã thêm chương trình và phạm vi năng lực");
      setCompetencyModalOpen(false);
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

  const suspendCompetencyMutation = useMutation({
    mutationFn: async (id: string) => (
      await api.post(`/expert-competencies/${id}/suspend`, {
        reason: "Tạm đình chỉ theo quyết định quản lý năng lực.",
      })
    ).data,
    onSuccess: async () => {
      message.success("Đã tạm đình chỉ năng lực");
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

  const competencyColumns = useMemo<TableColumnsType<ExpertCompetency>>(() => [
    {
      title: "Chương trình / vai trò",
      key: "program",
      render: (_, record) => (
        <div className="expert-summary-cell">
          <strong>{record.standard_code}</strong>
          <small>{roleLabels[normalize(record.competency_role)] ?? record.competency_role} · {record.competency_level}</small>
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
      render: (_, record) => profileStatusTag(record.approval_status),
    },
    {
      title: "",
      key: "action",
      width: 170,
      render: (_, record) => canManage ? (
        <Space>
          {normalize(record.approval_status) === "DRAFT" ? (
            <Popconfirm title="Phê duyệt phạm vi năng lực này?" onConfirm={() => approveCompetencyMutation.mutate(record.id)}>
              <Button size="small" type="primary">Phê duyệt</Button>
            </Popconfirm>
          ) : null}
          {normalize(record.approval_status) === "APPROVED" ? (
            <Popconfirm title="Tạm đình chỉ phạm vi năng lực này?" onConfirm={() => suspendCompetencyMutation.mutate(record.id)}>
              <Button danger size="small">Đình chỉ</Button>
            </Popconfirm>
          ) : null}
        </Space>
      ) : null,
    },
  ], [canManage]);

  const workColumns = useMemo<TableColumnsType<ExpertWorkExperience>>(() => [
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
  ], [canManage]);

  const certificateColumns = useMemo<TableColumnsType<ExpertCertificate>>(() => [
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
  ], [canManage]);

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
          <small>{record.reasons.join("; ")}</small>
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
      title: "Lịch",
      key: "availability",
      width: 180,
      render: (_, record) => record.availability.available ? (
        <Tag color="green">Sẵn sàng</Tag>
      ) : (
        <div className="expert-summary-cell">
          <Tag color="red">Trùng lịch</Tag>
          <small>{record.availability.conflicts.map((item) => item.plan_code || "Kế hoạch khác").join(", ")}</small>
        </div>
      ),
    },
  ], []);

  const selectedExpert = detailQuery.data;
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
          <Text className="screen-eyebrow">QUẢN LÝ NGUỒN LỰC</Text>
          <Title level={1}>Chuyên gia & năng lực</Title>
          <Text type="secondary">
            Hồ sơ chuyên gia gắn với tài khoản, chương trình chứng nhận, mã IAF/NACE, chứng chỉ và lịch sử đánh giá.
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
        <Card><Statistic prefix={<LinkOutlined />} title="Đã gắn tài khoản" value={overviewQuery.data?.experts.linked_accounts ?? 0} /></Card>
        <Card><Statistic prefix={<CheckCircleOutlined />} title="Hồ sơ đã duyệt" value={overviewQuery.data?.experts.approved_profiles ?? 0} /></Card>
        <Card><Statistic prefix={<SafetyCertificateOutlined />} title="Năng lực đã duyệt" value={overviewQuery.data?.competencies.approved ?? 0} /></Card>
        <Card><Statistic prefix={<WarningOutlined />} title="Chứng chỉ hết hạn trong 90 ngày" value={overviewQuery.data?.certificates.expiring_90_days ?? 0} /></Card>
      </div>

      <Card className="expert-list-card" title="Danh sách chuyên gia">
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
                        competencyForm.setFieldsValue({
                          management_system: "QMS",
                          standard_code: standardBySystem.QMS,
                          competency_role: "AUDITOR",
                          scope_level: "IAF",
                          competency_level: "QUALIFIED",
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
        confirmLoading={createCompetencyMutation.isPending}
        okText="Tạo hồ sơ năng lực"
        onCancel={() => setCompetencyModalOpen(false)}
        onOk={() => void competencyForm.validateFields().then((values) => createCompetencyMutation.mutate(values))}
        open={competencyModalOpen}
        title={`Thêm chương trình và lĩnh vực · ${selectedExpert?.full_name ?? ""}`}
        width={850}
      >
        <Form form={competencyForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Chương trình chứng nhận" name="management_system" rules={[{ required: true }]}>
              <Select onChange={(value) => competencyForm.setFieldValue("standard_code", standardBySystem[value])} options={managementSystemOptions} />
            </Form.Item>
            <Form.Item label="Tiêu chuẩn được đánh giá" name="standard_code" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label="Vai trò được phê duyệt" name="competency_role" rules={[{ required: true }]}><Select options={competencyRoleOptions} /></Form.Item>
            <Form.Item label="Mức năng lực" name="competency_level" rules={[{ required: true }]}><Select options={competencyLevelOptions} /></Form.Item>
            <Form.Item label="Cấp mã lĩnh vực" name="scope_level" rules={[{ required: true }]}><Select options={[{ value: "IAF", label: "IAF" }, { value: "NACE", label: "NACE chi tiết" }]} /></Form.Item>
            <Form.Item label="Mã IAF" name="iaf_code" rules={[{ required: true, message: "Nhập mã IAF" }]}><Input placeholder="14" /></Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, current) => prev.scope_level !== current.scope_level}>
              {({ getFieldValue }) => getFieldValue("scope_level") === "NACE" ? (
                <>
                  <Form.Item label="Phiên bản NACE" name="nace_revision"><Input placeholder="NACE_REV_2" /></Form.Item>
                  <Form.Item label="Mã NACE" name="nace_code" rules={[{ required: true, message: "Nhập mã NACE" }]}><Input placeholder="22.29" /></Form.Item>
                </>
              ) : null}
            </Form.Item>
            <Form.Item label="Ngày hiệu lực" name="effective_date" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Ngày hết hiệu lực" name="expiry_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
          </div>
          <Form.Item label="Lĩnh vực/hoạt động được đánh giá" name="scope_description"><Input.TextArea rows={2} placeholder="Ví dụ: Sản xuất sản phẩm nhựa, cao su; gia công cơ khí..." /></Form.Item>
          <Form.Item label="Cơ sở phê duyệt" name="approval_basis"><Input.TextArea rows={2} placeholder="Đào tạo, kinh nghiệm, đánh giá chứng kiến, hồ sơ chuyên môn..." /></Form.Item>
          <Form.Item label="Tóm tắt bằng chứng năng lực" name="evidence_summary"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="Hạn chế năng lực" name="restriction"><Input.TextArea rows={2} /></Form.Item>
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
            <Table columns={recommendationColumns} dataSource={recommendationQuery.data.recommendations} locale={{ emptyText: <Empty description="Chưa có chuyên gia đã phê duyệt đáp ứng chương trình và vai trò này" /> }} pagination={false} rowKey={(record) => record.expert.id} scroll={{ x: 1180 }} />
          </div>
        ) : recommendationPlanId ? null : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chọn kế hoạch để đối chiếu tài khoản, hồ sơ phê duyệt, chương trình, IAF/NACE và lịch chuyên gia" />
        )}
      </Modal>
    </div>
  );
}
