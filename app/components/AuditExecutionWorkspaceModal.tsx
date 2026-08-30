"use client";

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileAddOutlined,
  FileDoneOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  EyeOutlined,
  FlagOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  SendOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { downloadDocumentFile } from "../lib/document-file-client";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

export type AuditExecutionWorkspaceMode = "full" | "report" | "findings" | "complete";
type AuditExecutionTab = "overview" | Exclude<AuditExecutionWorkspaceMode, "full">;

interface AuditExecutionWorkspaceModalProps {
  open: boolean;
  planId: string | null;
  roles: string[];
  mode?: AuditExecutionWorkspaceMode;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
}

interface AuditPlanExecutionDetail {
  id: string;
  plan_code?: string | null;
  audit_type?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  location?: string | null;
  audit_scope?: string | null;
  audit_criteria?: string | null;
  audit_objectives?: string | null;
  status?: string | null;
  stage2_lifecycle_gate?: {
    applicable: boolean;
    allowed: boolean;
    code: string;
    message: string;
    stage1_plan_id?: string | null;
    stage1_plan_status?: string | null;
    stage1_report_id?: string | null;
    stage1_report_status?: string | null;
    stage1_readiness_result?: string | null;
    stage1_report_submitted_at?: string | null;
  } | null;
  certification_projects?: {
    project_code?: string | null;
    standard_name?: string | null;
    certification_applications?: {
      customers?: {
        company_name?: string | null;
      } | null;
    } | null;
  } | null;
  audit_event?: {
    id?: string;
    planned_mandays?: number | string | null;
    actual_mandays?: number | string | null;
    status?: string | null;
  } | null;
}

interface AuditTeamMember {
  id: string;
  team_role?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  planned_mandays?: number | string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  actual_mandays?: number | string | null;
  assignment_status?: string | null;
  experts?: {
    id: string;
    full_name?: string | null;
  } | null;
}

interface AuditTeamAppointment {
  id: string;
  appointment_number?: string | null;
  status?: string | null;
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
  form_data?: Record<string, unknown> | null;
}

interface AuditFinding {
  id: string;
  report_id: string;
  finding_code?: string | null;
  finding_type?: string | null;
  clause?: string | null;
  requirement?: string | null;
  description?: string | null;
  objective_evidence?: string | null;
  detected_date?: string | null;
  due_date?: string | null;
  status?: string | null;
}

interface GeneratedDocumentFile {
  id: string;
  document_type?: string | null;
  file_kind?: string | null;
  original_name: string;
  version_no?: number | null;
  is_current?: boolean | null;
  created_at?: string | null;
  download_url: string;
}

interface ReportDocumentPreview {
  form_code: string;
  document_type: string;
  label: string;
  report_id: string;
  report_code?: string | null;
  report_version?: number | null;
  status?: string | null;
  plan_code?: string | null;
  project_code?: string | null;
  customer_code?: string | null;
  organization_name?: string | null;
  standard_name?: string | null;
  certification_scope?: string | null;
  audit_dates?: string | null;
  audit_mandays?: string | null;
  team_count?: number | null;
  finding_count?: number | null;
  missing_fields?: string[];
  can_generate?: boolean;
}

interface GenerateReportDocumentResponse {
  format: "docx" | "pdf";
  preview: ReportDocumentPreview;
  document: GeneratedDocumentFile;
}

interface ExecutionWorkspace {
  plan: AuditPlanExecutionDetail;
  appointment: AuditTeamAppointment | null;
  reports: AuditReport[];
}

interface Stage1ReportItemValue {
  no: number;
  content: string;
  audit_note?: string;
  comment?: string;
}

interface ReportFormValues {
  actual_dates: [Dayjs, Dayjs];
  stage1_items?: Stage1ReportItemValue[];
  stage1_readiness_result?: string;
  conclusion?: string;
  recommendation_result?: string;
  audit_team_recommendation?: string;
  client_recommendation?: string;
}


interface FindingFormValues {
  finding_type: string;
  clause?: string;
  requirement?: string;
  description: string;
  objective_evidence: string;
  detected_date: Dayjs;
  due_date?: Dayjs;
}

interface CompleteMemberValues {
  member_id: string;
  actual_dates: [Dayjs, Dayjs];
  actual_mandays: number;
}

interface CompleteFormValues {
  member_actuals: CompleteMemberValues[];
  completion_note?: string;
}

const countedRoles = new Set([
  "team_leader",
  "lead_auditor",
  "auditor",
]);

const teamRoleLabels: Record<string, string> = {
  team_leader: "Trưởng đoàn đánh giá",
  lead_auditor: "Trưởng đoàn đánh giá",
  auditor: "Chuyên gia đánh giá",
  technical_expert: "Chuyên gia kỹ thuật",
  observer: "Quan sát viên",
  trainee: "Chuyên gia tập sự",
  witness_evaluator: "Đánh giá viên chứng kiến",
};

const findingTypeLabels: Record<string, string> = {
  conformity: "Điểm phù hợp",
  observation: "Quan sát",
  ofi: "Cơ hội cải tiến",
  minor_nc: "NC nhẹ",
  major_nc: "NC nặng",
};

const statusLabels: Record<string, string> = {
  cancelled: "Đã hủy",
  completed: "Hoàn thành",
  corrective_action_required: "Chờ khắc phục NC",
  draft: "Dự thảo",
  in_progress: "Đang thực hiện",
  issued: "Đã ban hành",
  open: "Chưa đóng",
  planned: "Đã lập kế hoạch",
  ready_for_technical_review: "Sẵn sàng thẩm xét",
  stage1_completed: "Đã nộp báo cáo GĐ1",
  ready_for_stage2: "Sẵn sàng GĐ2",
  not_ready_for_stage2: "Chưa sẵn sàng GĐ2",
  recorded: "Đã ghi nhận",
};

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function normalizedAuditStage(value?: string | null): "stage1" | "stage2" {
  const key = normalize(value).replace(/[\s_-]+/g, "");
  return ["stage1", "initialstage1", "gd1", "gđ1"].includes(key) ? "stage1" : "stage2";
}

function correctiveActionDefaultDays(auditType?: string | null) {
  const key = normalize(auditType).replace(/[\s_-]+/g, "");
  return key.includes("surveillance") || key.includes("giamsat") ? 30 : 45;
}

const stage1DefaultContents = [
  "Hồ sơ pháp lý của Tổ chức",
  "Các quy định liên quan (Giấy phép con, chứng nhận năng lực hoạt động,…)",
  "Địa chỉ trụ sở văn phòng và địa chỉ nhà máy sản xuất",
  "Phạm vi chứng nhận",
  "Hệ thống thống tin dạng văn bản",
  "Hồ sơ đánh giá nội bộ",
  "Hồ sơ xem xét của  lãnh đạo",
  "Sơ đồ tổ chức",
  "Lưu đồ sản xuất",
  "Sơ đồ nhà xưởng; Danh mục máy móc thiết bị; Hồ sơ Kiểm định máy móc thiết bị yêu cầu nghiêm ngặt",
  "Mức độ kiểm soát được thiết lập (đặc biệt là trong trường hợp khách hàng có nhiều địa điểm)",
];

function nestedArray(root: Record<string, unknown> | null | undefined, ...path: string[]) {
  let current: unknown = root ?? {};
  for (const key of path) {
    current = asObject(current)[key];
  }
  return Array.isArray(current) ? current : [];
}

function numberValue(value?: number | string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusLabel(value?: string | null) {
  const key = normalize(value);
  return statusLabels[key] ?? (value || "Chưa cập nhật").replaceAll("_", " ");
}

function statusColor(value?: string | null) {
  const key = normalize(value);
  if (["completed", "issued", "ready_for_technical_review", "recorded"].includes(key)) return "green";
  if (["corrective_action_required", "open"].includes(key)) return "orange";
  if (["cancelled"].includes(key)) return "default";
  return "blue";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nestedText(root: Record<string, unknown> | null | undefined, ...path: string[]) {
  let current: unknown = root ?? {};
  for (const key of path) {
    current = asObject(current)[key];
  }
  return typeof current === "string" ? current : "";
}

async function optionalData<T>(promise: Promise<{ data: T }>): Promise<T | null> {
  try {
    return (await promise).data;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

export default function AuditExecutionWorkspaceModal({
  open,
  planId,
  roles,
  mode = "full",
  onClose,
  onChanged,
}: AuditExecutionWorkspaceModalProps) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [reportForm] = Form.useForm<ReportFormValues>();
  const [findingForm] = Form.useForm<FindingFormValues>();
  const [completeForm] = Form.useForm<CompleteFormValues>();
  const [reportSelection, setReportSelection] = useState<{
    planId: string | null;
    reportId: string | null;
  } | null>(null);
  const [findingOpen, setFindingOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<ReportDocumentPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tabSelection, setTabSelection] = useState<{
    context: string;
    tab: AuditExecutionTab;
  } | null>(null);

  const focusedTab = mode === "full" ? null : mode;
  const defaultTab: AuditExecutionTab = focusedTab ?? "overview";
  const tabContext = `${planId ?? ""}:${defaultTab}`;
  const activeTab = tabSelection?.context === tabContext
    ? tabSelection.tab
    : defaultTab;
  const setActiveTab = (tab: AuditExecutionTab) => {
    setTabSelection({ context: tabContext, tab });
  };

  const normalizedRoles = useMemo(() => roles.map(normalize), [roles]);
  const canExecute = normalizedRoles.some((role) =>
    ["auditor", "lead_auditor"].includes(role),
  );

  const workspaceQuery = useQuery<ExecutionWorkspace>({
    enabled: open && Boolean(planId),
    queryKey: ["audit-execution", planId],
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      const [planResponse, appointment, reportsResponse] = await Promise.all([
        api.get<AuditPlanExecutionDetail>(`/audit-plans/${planId}`),
        optionalData(api.get<AuditTeamAppointment>(`/audit-team-appointments/plan/${planId}`)),
        api.get<AuditReport[]>(`/reports/plan/${planId}`),
      ]);
      return {
        plan: planResponse.data,
        appointment,
        reports: reportsResponse.data,
      };
    },
  });

  const workspace = workspaceQuery.data;
  const plan = workspace?.plan;
  const reportStage = normalizedAuditStage(plan?.audit_type);
  const isStage1Report = reportStage === "stage1";
  const stage2LifecycleGate = plan?.stage2_lifecycle_gate ?? null;
  const appointment = workspace?.appointment;
  const reports = workspace?.reports ?? [];
  const selectedReportId = reportSelection?.planId === planId
    && reports.some((item) => item.id === reportSelection.reportId)
    ? reportSelection.reportId
    : reports[0]?.id ?? null;
  const setSelectedReportId = (reportId: string | null) => {
    setReportSelection({ planId, reportId });
  };
  const selectedReport = reports.find((item) => item.id === selectedReportId) ?? reports[0] ?? null;

  const findingsQuery = useQuery<AuditFinding[]>({
    enabled: open && Boolean(selectedReport?.id),
    queryKey: ["audit-execution", "findings", selectedReport?.id],
    queryFn: async () => (
      await api.get<AuditFinding[]>(`/audit-findings/report/${selectedReport!.id}`)
    ).data,
  });

  const findings = findingsQuery.data ?? [];
  const generatedDocumentsQuery = useQuery<GeneratedDocumentFile[]>({
    enabled: open && Boolean(selectedReport?.id),
    queryKey: ["audit-execution", "generated-documents", selectedReport?.id],
    queryFn: async () => (
      await api.get<GeneratedDocumentFile[]>(`/document-files/entity/report/${selectedReport!.id}`)
    ).data,
  });

  const generatedDocuments = generatedDocumentsQuery.data ?? [];

  const unresolvedNc = findings.filter((finding) =>
    ["major_nc", "minor_nc"].includes(normalize(finding.finding_type))
      && normalize(finding.status) !== "closed",
  );

  const reportSubmittedAt = selectedReport
    ? nestedText(selectedReport.form_data, "workflow", "submitted_at")
    : "";
  const reportLocked = selectedReport
    ? Boolean(reportSubmittedAt) || [
      "approved",
      "completed",
      "technical_review_completed",
      "ready_for_technical_review",
      "stage1_completed",
    ].includes(normalize(selectedReport.status))
    : false;
  const canEditReport = canExecute
    && normalize(plan?.status) === "in_progress"
    && Boolean(selectedReport)
    && !reportLocked;

  useEffect(() => {
    if (!selectedReport) {
      reportForm.resetFields();
      return;
    }

    const start = dayjs(selectedReport.audit_start_date ?? plan?.planned_start_date);
    const end = dayjs(selectedReport.audit_end_date ?? plan?.planned_end_date ?? selectedReport.audit_start_date ?? plan?.planned_start_date);

    if (isStage1Report) {
      const savedRows = nestedArray(selectedReport.form_data, "stage1_report", "audit_content");
      const stage1Items = stage1DefaultContents.map((content, index) => {
        const saved = asObject(savedRows[index]);
        return {
          no: index + 1,
          content: typeof saved.content === "string" && saved.content.trim() ? saved.content : content,
          audit_note: typeof saved.audit_note === "string" ? saved.audit_note : "",
          comment: typeof saved.comment === "string" ? saved.comment : "",
        };
      });

      reportForm.setFieldsValue({
        actual_dates: [
          start.isValid() ? start : dayjs(),
          end.isValid() ? end : start.isValid() ? start : dayjs(),
        ],
        stage1_items: stage1Items,
        stage1_readiness_result: nestedText(selectedReport.form_data, "stage1_report", "readiness_result"),
        conclusion: selectedReport.conclusion ?? "",
        recommendation_result: undefined,
        audit_team_recommendation: undefined,
        client_recommendation: undefined,
      });
      return;
    }

    reportForm.setFieldsValue({
      actual_dates: [
        start.isValid() ? start : dayjs(),
        end.isValid() ? end : start.isValid() ? start : dayjs(),
      ],
      stage1_items: undefined,
      stage1_readiness_result: undefined,
      conclusion: undefined,
      recommendation_result: nestedText(selectedReport.form_data, "recommendation", "result"),
      audit_team_recommendation: nestedText(selectedReport.form_data, "stage2_report", "audit_team_recommendation"),
      client_recommendation: nestedText(selectedReport.form_data, "stage2_report", "client_recommendation"),
    });
  }, [isStage1Report, plan?.planned_end_date, plan?.planned_start_date, reportForm, selectedReport]);

  const refreshWorkspace = async () => {
    await queryClient.invalidateQueries({ queryKey: ["audit-execution", planId] });
    await queryClient.invalidateQueries({ queryKey: ["audit-plan", planId] });
    await queryClient.invalidateQueries({ queryKey: ["audit-plans"] });
    await queryClient.invalidateQueries({ queryKey: ["reports-screen"] });
    await queryClient.invalidateQueries({ queryKey: ["audit-execution", "generated-documents", selectedReport?.id] });
    await workspaceQuery.refetch();
    await onChanged?.();
  };

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error("Không tìm thấy kế hoạch đánh giá");
      await api.post(`/audit-plans/${plan.id}/start`, {
        actual_start_date: plan.planned_start_date,
      });
    },
    onSuccess: async () => {
      message.success("Đã bắt đầu cuộc đánh giá.");
      await refreshWorkspace();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const createReportMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error("Không tìm thấy kế hoạch đánh giá");
      const response = await api.post<AuditReport>("/reports", {
        audit_plan_id: plan.id,
        report_date: normalizedAuditStage(plan.audit_type) === "stage2"
          ? plan.planned_end_date
          : undefined,
        audit_start_date: plan.planned_start_date,
        audit_end_date: plan.planned_end_date,
        status: "draft",
        form_data: {
          report_identity: {
            stage: normalizedAuditStage(plan.audit_type),
          },
        },
      });
      return response.data;
    },
    onSuccess: async (report) => {
      setSelectedReportId(report.id);
      message.success("Đã tạo báo cáo từ kế hoạch đánh giá.");
      await refreshWorkspace();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const buildReportPayload = (values: ReportFormValues) => {
    const [start, end] = values.actual_dates;

    if (isStage1Report) {
      return {
        audit_start_date: start.format("YYYY-MM-DD"),
        audit_end_date: end.format("YYYY-MM-DD"),
        conclusion: values.conclusion?.trim() || null,
        form_data: {
          report_identity: {
            stage: "stage1",
          },
          stage1_report: {
            audit_content: (values.stage1_items ?? []).map((item, index) => ({
              no: index + 1,
              content: item.content || stage1DefaultContents[index] || `Nội dung ${index + 1}`,
              audit_note: item.audit_note?.trim() || null,
              comment: item.comment?.trim() || null,
            })),
            readiness_result: values.stage1_readiness_result || null,
          },
        },
      };
    }

    return {
      audit_start_date: start.format("YYYY-MM-DD"),
      audit_end_date: end.format("YYYY-MM-DD"),
      conclusion: values.audit_team_recommendation?.trim() || null,
      form_data: {
        report_identity: {
          stage: "stage2",
        },
        recommendation: {
          result: values.recommendation_result || null,
        },
        stage2_report: {
          audit_team_recommendation: values.audit_team_recommendation?.trim() || null,
          client_recommendation: values.client_recommendation?.trim() || null,
        },
      },
    };
  };

  const saveReportMutation = useMutation({
    mutationFn: async ({ values, submit }: { values: ReportFormValues; submit: boolean }) => {
      if (!selectedReport) throw new Error("Chưa có báo cáo đánh giá");
      await api.patch(`/reports/${selectedReport.id}`, buildReportPayload(values));
      if (submit) {
        await api.post(`/reports/${selectedReport.id}/submit`, {});
      }
    },
    onSuccess: async (_, variables) => {
      message.success(variables.submit ? "Đã nộp báo cáo đánh giá." : "Đã lưu dự thảo báo cáo.");
      await refreshWorkspace();
      await findingsQuery.refetch();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const saveCurrentDraftBeforeDocument = async () => {
    if (!selectedReport || !canEditReport) return;

    const values = reportForm.getFieldsValue(true);
    if (!values.actual_dates?.[0] || !values.actual_dates?.[1]) {
      throw new Error("Chọn ngày đánh giá thực tế trước khi xuất báo cáo.");
    }

    await api.patch(`/reports/${selectedReport.id}`, buildReportPayload(values));
  };

  const downloadGeneratedDocument = async (document: GeneratedDocumentFile) => {
    try {
      await downloadDocumentFile({
        url: document.download_url,
        filename: document.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const previewDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) throw new Error("Chưa có báo cáo đánh giá");
      await saveCurrentDraftBeforeDocument();
      return (
        await api.get<ReportDocumentPreview>(`/reports/${selectedReport.id}/document-preview`)
      ).data;
    },
    onSuccess: async (preview) => {
      setDocumentPreview(preview);
      setPreviewOpen(true);
      await refreshWorkspace();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const generateDocumentMutation = useMutation({
    mutationFn: async (format: "docx" | "pdf") => {
      if (!selectedReport) throw new Error("Chưa có báo cáo đánh giá");
      await saveCurrentDraftBeforeDocument();
      return (
        await api.post<GenerateReportDocumentResponse>(
          `/reports/${selectedReport.id}/documents/generate`,
          {},
          { params: { format } },
        )
      ).data;
    },
    onSuccess: async (result) => {
      message.success(result.format === "pdf" ? "Đã sinh báo cáo PDF." : "Đã sinh báo cáo Word.");
      await generatedDocumentsQuery.refetch();
      await refreshWorkspace();
      await downloadGeneratedDocument(result.document);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openFindingModal = (defaultType: string = "ofi") => {
    if (!selectedReport || !plan) return;
    const detected = dayjs(selectedReport.audit_end_date ?? plan.planned_end_date);
    const detectedDate = detected.isValid() ? detected : dayjs();
    const isNcType = ["major_nc", "minor_nc"].includes(normalize(defaultType));
    findingForm.setFieldsValue({
      finding_type: defaultType,
      detected_date: detectedDate,
      due_date: isNcType
        ? detectedDate.add(correctiveActionDefaultDays(plan.audit_type), "day")
        : undefined,
    });
    setFindingOpen(true);
  };

  const createFindingMutation = useMutation({
    mutationFn: async (values: FindingFormValues) => {
      if (!selectedReport) throw new Error("Chưa có báo cáo đánh giá");
      await api.post("/audit-findings", {
        report_id: selectedReport.id,
        finding_type: values.finding_type,
        clause: values.clause?.trim() || undefined,
        requirement: values.requirement?.trim() || undefined,
        description: values.description.trim(),
        objective_evidence: values.objective_evidence.trim(),
        detected_date: values.detected_date.format("YYYY-MM-DD"),
        due_date: values.due_date?.format("YYYY-MM-DD"),
      });
    },
    onSuccess: async () => {
      message.success("Đã ghi nhận phát hiện đánh giá.");
      setFindingOpen(false);
      findingForm.resetFields();
      await findingsQuery.refetch();
      await refreshWorkspace();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const completeMutation = useMutation({
    mutationFn: async (values: CompleteFormValues) => {
      if (!plan) throw new Error("Không tìm thấy kế hoạch đánh giá");
      await api.post(`/audit-plans/${plan.id}/complete`, {
        member_actuals: values.member_actuals.map((item) => ({
          member_id: item.member_id,
          actual_start_date: item.actual_dates[0].format("YYYY-MM-DD"),
          actual_end_date: item.actual_dates[1].format("YYYY-MM-DD"),
          actual_mandays: item.actual_mandays,
        })),
        completion_note: values.completion_note?.trim() || undefined,
      });
    },
    onSuccess: async () => {
      message.success("Đã hoàn thành và khóa cuộc đánh giá.");
      setCompleteOpen(false);
      await refreshWorkspace();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openCompletion = () => {
    if (!appointment?.members?.length || !selectedReport) return;
    const reportStart = dayjs(selectedReport.audit_start_date ?? plan?.planned_start_date);
    const reportEnd = dayjs(selectedReport.audit_end_date ?? plan?.planned_end_date);
    completeForm.setFieldsValue({
      member_actuals: appointment.members.map((member) => {
        const start = dayjs(member.actual_start_date ?? member.planned_start_date ?? reportStart);
        const end = dayjs(member.actual_end_date ?? member.planned_end_date ?? reportEnd);
        return {
          member_id: member.id,
          actual_dates: [
            start.isValid() ? start : reportStart,
            end.isValid() ? end : reportEnd,
          ],
          actual_mandays: countedRoles.has(normalize(member.team_role))
            ? numberValue(member.actual_mandays ?? member.planned_mandays)
            : 0,
        };
      }),
      completion_note: "",
    });
    setCompleteOpen(true);
  };

  const findingType = Form.useWatch("finding_type", findingForm);
  const isNc = ["major_nc", "minor_nc"].includes(normalize(findingType));

  const mainContent = workspaceQuery.isLoading ? (
    <Skeleton active paragraph={{ rows: 14 }} />
  ) : workspaceQuery.isError ? (
    <Alert
      action={<Button onClick={() => void workspaceQuery.refetch()}>Thử lại</Button>}
      description={getErrorMessage(workspaceQuery.error)}
      message="Không tải được không gian thực hiện đánh giá"
      showIcon
      type="error"
    />
  ) : !plan ? (
    <Empty description="Không tìm thấy kế hoạch đánh giá" />
  ) : (
    <Tabs
      activeKey={focusedTab ?? activeTab}
      onChange={(key) => setActiveTab(key as AuditExecutionTab)}
      tabBarStyle={focusedTab ? { display: "none", margin: 0 } : undefined}
      items={[
        {
          key: "overview",
          label: "Tổng quan",
          children: (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                <Card size="small"><Statistic prefix={<ClockCircleOutlined />} title="Trạng thái" value={statusLabel(plan.status)} /></Card>
                <Card size="small"><Statistic prefix={<TeamOutlined />} title="Đoàn đánh giá" value={appointment?.members?.length ?? 0} suffix="người" /></Card>
                <Card size="small"><Statistic prefix={<FileDoneOutlined />} title="Báo cáo" value={reports.length} /></Card>
                <Card size="small"><Statistic prefix={<WarningOutlined />} title="NC chưa đóng" value={unresolvedNc.length} /></Card>
              </div>

              <Card title="Thông tin cuộc đánh giá" size="small">
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Mã kế hoạch">{plan.plan_code || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Hồ sơ">{plan.certification_projects?.project_code || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Khách hàng">{plan.certification_projects?.certification_applications?.customers?.company_name || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Tiêu chuẩn">{plan.certification_projects?.standard_name || plan.audit_criteria || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Thời gian">{formatDate(plan.planned_start_date)} – {formatDate(plan.planned_end_date)}</Descriptions.Item>
                  <Descriptions.Item label="Man-day kế hoạch">{numberValue(plan.audit_event?.planned_mandays).toFixed(1)} MD</Descriptions.Item>
                  {stage2LifecycleGate?.applicable ? (
                    <Descriptions.Item label="Điều kiện GĐ2">
                      <Tag color={stage2LifecycleGate.allowed ? "success" : "error"}>
                        {stage2LifecycleGate.allowed ? "GĐ1 đã sẵn sàng" : "Chưa đủ điều kiện"}
                      </Tag>
                    </Descriptions.Item>
                  ) : null}
                  <Descriptions.Item label="Địa điểm" span={2}>{plan.location || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Phạm vi" span={2}>{plan.audit_scope || "—"}</Descriptions.Item>
                </Descriptions>
              </Card>

              {!canExecute ? (
                <Alert message="Tài khoản hiện tại chỉ có quyền xem dữ liệu thực hiện đánh giá." showIcon type="info" />
              ) : normalize(plan.status) === "completed" ? (
                <Alert message="Cuộc đánh giá đã hoàn thành và dữ liệu thực hiện đã được khóa." showIcon type="success" />
              ) : normalize(plan.status) !== "in_progress" ? (
                stage2LifecycleGate?.applicable && !stage2LifecycleGate.allowed ? (
                  <Alert
                    description={stage2LifecycleGate.message}
                    message="Chưa đủ điều kiện bắt đầu Giai đoạn 2"
                    showIcon
                    type="error"
                  />
                ) : (
                  <Alert
                    action={(
                      <Button
                        icon={<PlayCircleOutlined />}
                        loading={startMutation.isPending}
                        onClick={() => modal.confirm({
                          title: "Bắt đầu cuộc đánh giá?",
                          content: stage2LifecycleGate?.applicable
                            ? "Backend sẽ kiểm tra lại việc hoàn thành Giai đoạn 1, kết luận sẵn sàng Giai đoạn 2, quyết định chỉ định đoàn, lịch và man-day trước khi cho phép bắt đầu."
                            : "Backend sẽ kiểm tra lại kế hoạch, quyết định chỉ định đoàn, lịch và man-day trước khi cho phép bắt đầu.",
                          okText: "Bắt đầu",
                          cancelText: "Hủy",
                          onOk: async () => startMutation.mutateAsync(),
                        })}
                        type="primary"
                      >
                        Bắt đầu đánh giá
                      </Button>
                    )}
                    description={stage2LifecycleGate?.applicable
                      ? "Giai đoạn 1 đã hoàn thành và kết luận sẵn sàng. Hệ thống vẫn kiểm tra lại toàn bộ điều kiện tại backend khi bắt đầu GĐ2."
                      : "Chỉ bắt đầu khi quyết định chỉ định đoàn đã ban hành và tổng man-day phân công khớp kỳ đánh giá."}
                    message="Cuộc đánh giá chưa bắt đầu"
                    showIcon
                    type="warning"
                  />
                )
              ) : !selectedReport ? (
                <Empty description="Chưa có báo cáo đánh giá" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                  <Button
                    icon={<FileAddOutlined />}
                    loading={createReportMutation.isPending}
                    onClick={() => createReportMutation.mutate()}
                    type="primary"
                  >
                    Tạo báo cáo từ kế hoạch
                  </Button>
                </Empty>
              ) : (
                <Alert
                  description="Nhập nội dung báo cáo, ghi nhận các phát hiện và nộp báo cáo trước khi xác nhận ngày công thực tế."
                  message="Cuộc đánh giá đang được thực hiện"
                  showIcon
                  type="info"
                />
              )}
            </Space>
          ),
        },
        {
          key: "report",
          label: `Báo cáo (${reports.length})`,
          children: selectedReport ? (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <Space wrap>
                  <Select
                    onChange={setSelectedReportId}
                    options={reports.map((report) => ({
                      value: report.id,
                      label: `${report.report_code || "Báo cáo"} · Phiên bản ${report.version_no ?? 1}`,
                    }))}
                    style={{ minWidth: 280 }}
                    value={selectedReport.id}
                  />
                  <Tag color={statusColor(selectedReport.status)}>{statusLabel(selectedReport.status)}</Tag>
                  <Tag>{selectedReport.audit_result ? statusLabel(selectedReport.audit_result) : "Chưa kết luận"}</Tag>
                </Space>
                <Space wrap>
                  <Button
                    icon={<EyeOutlined />}
                    loading={previewDocumentMutation.isPending}
                    onClick={() => previewDocumentMutation.mutate()}
                  >
                    Xem trước
                  </Button>
                  <Button
                    disabled={!canExecute}
                    icon={<FileWordOutlined />}
                    loading={generateDocumentMutation.isPending && generateDocumentMutation.variables === "docx"}
                    onClick={() => generateDocumentMutation.mutate("docx")}
                  >
                    Xuất Word
                  </Button>
                  <Button
                    disabled={!canExecute}
                    icon={<FilePdfOutlined />}
                    loading={generateDocumentMutation.isPending && generateDocumentMutation.variables === "pdf"}
                    onClick={() => generateDocumentMutation.mutate("pdf")}
                  >
                    Xuất PDF
                  </Button>
                  {canExecute && normalize(plan.status) === "in_progress" && !reportLocked ? (
                    <Button icon={<FileAddOutlined />} loading={createReportMutation.isPending} onClick={() => createReportMutation.mutate()}>
                      Tạo phiên bản mới
                    </Button>
                  ) : null}
                </Space>
              </div>

              <Alert
                message={isStage1Report
                  ? "F.09-P.09-01 · Báo cáo đánh giá Giai đoạn 1"
                  : "F.09-P.09-02 · Báo cáo đánh giá chứng nhận"}
                description={isStage1Report
                  ? "Giai đoạn 1 tập trung xem xét hồ sơ, mức độ sẵn sàng và kết luận có đủ điều kiện chuyển sang Giai đoạn 2 hay không."
                  : "Giai đoạn 2 tập trung vào các phát hiện đánh giá, kiến nghị của đoàn và ý kiến của khách hàng. Không dùng lại biểu nhập liệu của Giai đoạn 1."}
                showIcon
                type="info"
              />

              <Form<ReportFormValues> form={reportForm} layout="vertical">
                <Card title="Thông tin chung" size="small">
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="Khách hàng">{plan.certification_projects?.certification_applications?.customers?.company_name || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Loại báo cáo">{isStage1Report ? "Giai đoạn 1 · F.09-P.09-01" : "Giai đoạn 2 · F.09-P.09-02"}</Descriptions.Item>
                    <Descriptions.Item label="Tiêu chuẩn">{plan.certification_projects?.standard_name || plan.audit_criteria || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Phạm vi">{plan.audit_scope || "—"}</Descriptions.Item>
                  </Descriptions>
                  <Form.Item
                    name="actual_dates"
                    label="Ngày đánh giá thực tế"
                    rules={[{ required: true, message: "Chọn ngày đánh giá thực tế" }]}
                    style={{ marginTop: 16, marginBottom: 0 }}
                  >
                    <RangePicker allowClear={false} disabled={!canEditReport} format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Card>

                {isStage1Report ? (
                  <>
                    <Card
                      title="4. Nội dung đánh giá / Audit content"
                      size="small"
                      style={{ marginTop: 16 }}
                    >
                      <Alert
                        message="11 nội dung được lấy đúng theo F.09-P.09-01 mẫu"
                        description="Chỉ nhập Ghi chép đánh giá và Nhận xét cho từng dòng. Không nhập các trường kết luận/chứng nhận của Giai đoạn 2 tại đây."
                        showIcon
                        style={{ marginBottom: 16 }}
                        type="info"
                      />
                      <Form.List name="stage1_items">
                        {(fields) => (
                          <Space direction="vertical" size={12} style={{ width: "100%" }}>
                            {fields.map((field, index) => (
                              <Card
                                key={field.key}
                                size="small"
                                title={`${index + 1}. ${stage1DefaultContents[index] ?? `Nội dung ${index + 1}`}`}
                              >
                                <Form.Item name={[field.name, "content"]} hidden>
                                  <Input />
                                </Form.Item>
                                <Form.Item
                                  name={[field.name, "audit_note"]}
                                  label="Ghi chép đánh giá / Audit note"
                                  rules={[{ required: true, message: "Nhập ghi chép đánh giá" }]}
                                >
                                  <Input.TextArea
                                    disabled={!canEditReport}
                                    rows={3}
                                    placeholder="Tài liệu/hồ sơ đã xem xét, thông tin xác nhận, bằng chứng và nhận định..."
                                  />
                                </Form.Item>
                                <Form.Item
                                  name={[field.name, "comment"]}
                                  label="Nhận xét / Comment"
                                  rules={[{ required: true, message: "Nhập nhận xét" }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Select
                                    disabled={!canEditReport}
                                    options={[
                                      { value: "Phù hợp", label: "Phù hợp" },
                                      { value: "Cần bổ sung", label: "Cần bổ sung" },
                                      { value: "Chưa phù hợp", label: "Chưa phù hợp" },
                                      { value: "Không áp dụng", label: "Không áp dụng" },
                                    ]}
                                    placeholder="Chọn nhận xét"
                                  />
                                </Form.Item>
                              </Card>
                            ))}
                          </Space>
                        )}
                      </Form.List>
                    </Card>

                    <Card title="5. Kết luận / Conclusion" size="small" style={{ marginTop: 16 }}>
                      <Form.Item
                        name="stage1_readiness_result"
                        label="Mức độ sẵn sàng cho Giai đoạn 2"
                        rules={[{ required: true, message: "Chọn mức độ sẵn sàng" }]}
                      >
                        <Select
                          disabled={!canEditReport}
                          options={[
                            { value: "ready_for_stage2", label: "Sẵn sàng cho đánh giá Giai đoạn 2" },
                            { value: "not_ready_for_stage2", label: "Chưa sẵn sàng cho đánh giá Giai đoạn 2" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item
                        name="conclusion"
                        label="Kết luận của đoàn đánh giá"
                        rules={[{ required: true, message: "Nhập kết luận Giai đoạn 1" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input.TextArea
                          disabled={!canEditReport}
                          rows={4}
                          placeholder="Ví dụ: Tổ chức đã sẵn sàng cho đánh giá Giai đoạn 2..."
                        />
                      </Form.Item>
                    </Card>
                  </>
                ) : (
                  <>
                    <Card title="4. Kết quả phát hiện đánh giá / Finding results" size="small" style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          <Text strong>{findings.length} phát hiện đã ghi nhận</Text>
                          <div><Text type="secondary">NC và OFI sẽ tự động đổ vào bảng mục 4 của F.09-P.09-02.</Text></div>
                        </div>
                        {canEditReport ? (
                          <Button icon={<PlusOutlined />} onClick={() => openFindingModal("ofi")}>
                            Ghi nhận phát hiện
                          </Button>
                        ) : null}
                      </div>
                      {findings.length ? (
                        <List
                          dataSource={findings}
                          style={{ marginTop: 12 }}
                          renderItem={(finding) => (
                            <List.Item>
                              <List.Item.Meta
                                title={`${finding.finding_code || "—"} · ${findingTypeLabels[normalize(finding.finding_type)] ?? finding.finding_type ?? "Phát hiện"}`}
                                description={`${finding.clause || "—"} · ${finding.description || "—"}`}
                              />
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Empty description="Chưa ghi nhận NC/OFI" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 12 }} />
                      )}
                    </Card>

                    <Card title="5. Kiến nghị của đoàn đánh giá / Audit Team Recommendation" size="small" style={{ marginTop: 16 }}>
                      <Form.Item
                        name="recommendation_result"
                        label="Kết quả đề nghị dùng cho workflow"
                        rules={[{ required: true, message: "Chọn kết quả đề nghị" }]}
                      >
                        <Select
                          disabled={!canEditReport}
                          options={[
                            { value: "certification_recommended", label: "Đề nghị cấp/duy trì chứng nhận" },
                            { value: "certification_not_recommended", label: "Không đề nghị cấp/duy trì chứng nhận" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item
                        name="audit_team_recommendation"
                        label="Nội dung kiến nghị ghi trên F.09-P.09-02"
                        rules={[{ required: true, message: "Nhập kiến nghị của đoàn đánh giá" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input.TextArea
                          disabled={!canEditReport}
                          rows={6}
                          placeholder="Nhập nguyên văn kiến nghị của đoàn đánh giá theo kết quả cuộc đánh giá..."
                        />
                      </Form.Item>
                    </Card>

                    <Card title="6. Kiến nghị của khách hàng / Client Recommendation" size="small" style={{ marginTop: 16 }}>
                      <Form.Item name="client_recommendation" label="Ý kiến/kiến nghị của khách hàng" style={{ marginBottom: 0 }}>
                        <Input.TextArea disabled={!canEditReport} rows={3} placeholder="Nếu không có, có thể để trống." />
                      </Form.Item>
                    </Card>
                  </>
                )}

                {canEditReport ? (
                  <Space style={{ marginTop: 16 }} wrap>
                    <Button
                      icon={<SaveOutlined />}
                      loading={saveReportMutation.isPending}
                      onClick={() => {
                        const values = reportForm.getFieldsValue(true);
                        if (!values.actual_dates?.[0] || !values.actual_dates?.[1]) {
                          message.error("Chọn ngày đánh giá thực tế trước khi lưu.");
                          return;
                        }
                        saveReportMutation.mutate({ values, submit: false });
                      }}
                    >
                      Lưu dự thảo
                    </Button>
                    <Button
                      icon={<SendOutlined />}
                      loading={saveReportMutation.isPending}
                      onClick={async () => {
                        const values = await reportForm.validateFields();
                        modal.confirm({
                          title: isStage1Report ? "Nộp báo cáo Giai đoạn 1?" : "Nộp báo cáo Giai đoạn 2?",
                          content: isStage1Report
                            ? "Sau khi nộp, báo cáo Giai đoạn 1 sẽ được khóa và ghi nhận kết quả sẵn sàng cho Giai đoạn 2. Báo cáo GĐ1 không chuyển thẳng sang thẩm xét kỹ thuật."
                            : "Sau khi nộp, báo cáo Giai đoạn 2 sẽ chuyển sang chờ khắc phục NC hoặc sẵn sàng thẩm xét kỹ thuật.",
                          okText: "Nộp báo cáo",
                          cancelText: "Hủy",
                          onOk: async () => saveReportMutation.mutateAsync({ values, submit: true }),
                        });
                      }}
                      type="primary"
                    >
                      Nộp báo cáo
                    </Button>
                  </Space>
                ) : null}
              </Form>

              <Card title="Tài liệu báo cáo đã sinh" size="small">
                {generatedDocumentsQuery.isLoading ? (
                  <Skeleton active paragraph={{ rows: 2 }} />
                ) : generatedDocuments.length ? (
                  <List
                    dataSource={generatedDocuments}
                    renderItem={(document) => (
                      <List.Item
                        actions={[
                          <Button
                            key="download"
                            onClick={() => void downloadGeneratedDocument(document)}
                            size="small"
                          >
                            Tải lại
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={document.original_name}
                          description={`${document.file_kind === "generated_pdf" ? "PDF" : "Word"} · Phiên bản ${document.version_no ?? 1} · ${document.is_current ? "Hiện hành" : "Lưu trữ"}`}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Chưa sinh bản Word/PDF" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Space>
          ) : (
            <Empty description={normalize(plan.status) === "in_progress" || normalize(plan.status) === "completed" ? "Chưa có báo cáo đánh giá" : "Hãy bắt đầu cuộc đánh giá trước khi tạo báo cáo"}>
              {canExecute && ["in_progress", "completed"].includes(normalize(plan.status)) ? (
                <Button icon={<FileAddOutlined />} loading={createReportMutation.isPending} onClick={() => createReportMutation.mutate()} type="primary">
                  {normalize(plan.status) === "completed" ? "Khôi phục và tạo báo cáo" : "Tạo báo cáo"}
                </Button>
              ) : canExecute ? (
                <Button icon={<PlayCircleOutlined />} loading={startMutation.isPending} onClick={() => startMutation.mutate()} type="primary">
                  Bắt đầu đánh giá
                </Button>
              ) : null}
            </Empty>
          ),
        },
        {
          key: "findings",
          label: `Phát hiện (${findings.length})`,
          children: selectedReport ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <Title level={5} style={{ margin: 0 }}>Phát hiện trong cuộc đánh giá</Title>
                  <Text type="secondary">Điểm phù hợp, quan sát, cơ hội cải tiến và điểm không phù hợp.</Text>
                </div>
                <Button
                  disabled={!canEditReport}
                  icon={<PlusOutlined />}
                  onClick={() => openFindingModal("ofi")}
                  type="primary"
                >
                  Thêm phát hiện
                </Button>
              </div>

              {findingsQuery.isLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : (
                <List<AuditFinding>
                  bordered
                  dataSource={findings}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa ghi nhận phát hiện" /> }}
                  renderItem={(finding) => (
                    <List.Item>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, width: "100%" }}>
                        <div>
                          <Space wrap>
                            <strong>{finding.finding_code || "Chưa cấp mã"}</strong>
                            <Tag color={normalize(finding.finding_type) === "major_nc" ? "red" : normalize(finding.finding_type) === "minor_nc" ? "orange" : "blue"}>
                              {findingTypeLabels[normalize(finding.finding_type)] ?? finding.finding_type}
                            </Tag>
                            {finding.clause ? <Tag>Điều khoản {finding.clause}</Tag> : null}
                          </Space>
                          <p style={{ margin: "8px 0 4px" }}>{finding.description}</p>
                          <Text type="secondary">Bằng chứng: {finding.objective_evidence || "—"}</Text>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <Tag color={statusColor(finding.status)}>{statusLabel(finding.status)}</Tag>
                          <div><Text type="secondary">Hạn: {formatDate(finding.due_date)}</Text></div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </Space>
          ) : <Empty description="Chưa có báo cáo để ghi nhận phát hiện" />,
        },
        {
          key: "complete",
          label: "Hoàn thành",
          children: (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Card title="Điều kiện hoàn thành" size="small">
                <List
                  dataSource={[
                    { ok: normalize(plan.status) === "in_progress" || normalize(plan.status) === "completed", text: "Cuộc đánh giá đã được bắt đầu" },
                    { ok: Boolean(selectedReport), text: "Đã tạo báo cáo đánh giá" },
                    { ok: ["ready_for_technical_review", "corrective_action_required"].includes(normalize(selectedReport?.status)), text: "Báo cáo đã được nộp" },
                    { ok: Boolean(appointment?.members?.length), text: "Có dữ liệu đoàn đánh giá để xác nhận ngày công thực tế" },
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Space>{item.ok ? <CheckCircleOutlined style={{ color: "#389e0d" }} /> : <ClockCircleOutlined />}<span>{item.text}</span></Space>
                    </List.Item>
                  )}
                />
              </Card>

              {normalize(plan.status) === "completed" ? (
                <Alert
                  description={`Man-day thực tế của kỳ đánh giá: ${numberValue(plan.audit_event?.actual_mandays).toFixed(1)} MD.`}
                  message="Cuộc đánh giá đã hoàn thành"
                  showIcon
                  type="success"
                />
              ) : (
                <Alert
                  action={(
                    <Button
                      disabled={!canExecute || !["ready_for_technical_review", "corrective_action_required"].includes(normalize(selectedReport?.status))}
                      icon={<FlagOutlined />}
                      onClick={openCompletion}
                      type="primary"
                    >
                      Xác nhận ngày công và hoàn thành
                    </Button>
                  )}
                  description={unresolvedNc.length
                    ? `Báo cáo còn ${unresolvedNc.length} NC chưa đóng. Cuộc đánh giá có thể hoàn thành về mặt thực hiện và tiếp tục theo dõi NC/CAP.`
                    : "Sau khi hoàn thành, kế hoạch và ngày công thực tế sẽ được khóa để chuyển sang thẩm xét kỹ thuật."}
                  message="Xác nhận kết quả thực hiện"
                  showIcon
                  type={unresolvedNc.length ? "warning" : "info"}
                />
              )}
            </Space>
          ),
        },
      ]}
    />
  );

  return (
    <>
      <Modal
        cancelText="Đóng"
        destroyOnHidden
        footer={null}
        maskClosable={false}
        onCancel={() => {
          setTabSelection(null);
          onClose();
        }}
        open={open}
        title={(
          <div>
            <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#667085" }}>
              {mode === "report"
                ? "KHÔNG GIAN BÁO CÁO ĐÁNH GIÁ"
                : mode === "findings"
                  ? "KHÔNG GIAN PHÁT HIỆN ĐÁNH GIÁ"
                  : mode === "complete"
                    ? "HOÀN THÀNH CUỘC ĐÁNH GIÁ"
                    : "KHÔNG GIAN THỰC HIỆN ĐÁNH GIÁ"}
            </span>
            <strong>{plan?.plan_code || "Đang tải kế hoạch..."}</strong>
          </div>
        )}
        width={mode === "report" ? 1180 : 1120}
      >
        {mainContent}
      </Modal>

      <Modal
        cancelText="Đóng"
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        open={previewOpen}
        title="Xem trước dữ liệu xuất báo cáo"
        width={760}
      >
        {documentPreview ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {documentPreview.missing_fields?.length ? (
              <Alert
                description={`Các trường chưa có dữ liệu sẽ hiển thị dấu —: ${documentPreview.missing_fields.join("; ")}.`}
                message="Báo cáo còn dữ liệu cần bổ sung"
                showIcon
                type="warning"
              />
            ) : (
              <Alert message="Dữ liệu chính đã đầy đủ để sinh tài liệu." showIcon type="success" />
            )}
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Biểu mẫu">{documentPreview.form_code}</Descriptions.Item>
              <Descriptions.Item label="Báo cáo">{documentPreview.report_code || "—"} · R{documentPreview.report_version ?? 1}</Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{documentPreview.customer_code || "—"}</Descriptions.Item>
              <Descriptions.Item label="Kế hoạch">{documentPreview.plan_code || "—"}</Descriptions.Item>
              <Descriptions.Item label="Tổ chức" span={2}>{documentPreview.organization_name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Tiêu chuẩn" span={2}>{documentPreview.standard_name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Phạm vi" span={2}>{documentPreview.certification_scope || "—"}</Descriptions.Item>
              <Descriptions.Item label="Ngày đánh giá">{documentPreview.audit_dates || "—"}</Descriptions.Item>
              <Descriptions.Item label="Man-day">{documentPreview.audit_mandays || "—"}</Descriptions.Item>
              <Descriptions.Item label="Đoàn đánh giá">{documentPreview.team_count ?? 0} người</Descriptions.Item>
              <Descriptions.Item label="Phát hiện">{documentPreview.finding_count ?? 0}</Descriptions.Item>
            </Descriptions>
            <Space wrap>
              <Button disabled={!canExecute} icon={<FileWordOutlined />} loading={generateDocumentMutation.isPending} onClick={() => generateDocumentMutation.mutate("docx")} type="primary">
                Xuất Word
              </Button>
              <Button disabled={!canExecute} icon={<FilePdfOutlined />} loading={generateDocumentMutation.isPending} onClick={() => generateDocumentMutation.mutate("pdf")}>
                Xuất PDF
              </Button>
            </Space>
          </Space>
        ) : <Skeleton active />}
      </Modal>

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        maskClosable={false}
        okButtonProps={{ loading: createFindingMutation.isPending }}
        okText="Ghi nhận phát hiện"
        onCancel={() => setFindingOpen(false)}
        onOk={() => findingForm.submit()}
        open={findingOpen}
        title="Thêm phát hiện đánh giá"
        width={720}
      >
        <Form<FindingFormValues>
          form={findingForm}
          layout="vertical"
          onFinish={(values) => createFindingMutation.mutate(values)}
        >
          <Form.Item name="finding_type" label="Loại phát hiện" rules={[{ required: true, message: "Chọn loại phát hiện" }]}>
            <Select
              onChange={(value) => {
                const detected = findingForm.getFieldValue("detected_date") as Dayjs | undefined;
                if (["major_nc", "minor_nc"].includes(normalize(value))) {
                  const baseDate = detected?.isValid() ? detected : dayjs();
                  findingForm.setFieldValue(
                    "due_date",
                    baseDate.add(correctiveActionDefaultDays(plan?.audit_type), "day"),
                  );
                } else {
                  findingForm.setFieldValue("due_date", undefined);
                }
              }}
              options={Object.entries(findingTypeLabels).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="clause" label="Điều khoản"><Input placeholder="Ví dụ: 7.5" /></Form.Item>
            <Form.Item name="detected_date" label="Ngày phát hiện" rules={[{ required: true, message: "Chọn ngày phát hiện" }]}>
              <DatePicker
                format="DD/MM/YYYY"
                onChange={(value) => {
                  const type = normalize(findingForm.getFieldValue("finding_type"));
                  if (["major_nc", "minor_nc"].includes(type) && value?.isValid()) {
                    findingForm.setFieldValue(
                      "due_date",
                      value.add(correctiveActionDefaultDays(plan?.audit_type), "day"),
                    );
                  }
                }}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </div>
          <Form.Item name="requirement" label="Yêu cầu của tiêu chuẩn hoặc quy định"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="description" label="Mô tả phát hiện" rules={[{ required: true, message: "Nhập mô tả phát hiện" }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="objective_evidence" label="Bằng chứng khách quan" rules={[{ required: true, message: "Nhập bằng chứng khách quan" }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item
            name="due_date"
            label="Hạn hành động khắc phục"
            rules={[{
              validator: async (_, value) => {
                if (isNc && !value) throw new Error("NC phải có hạn hành động khắc phục");
              },
            }]}
          >
            <DatePicker disabled={!isNc} format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        maskClosable={false}
        okButtonProps={{ loading: completeMutation.isPending }}
        okText="Hoàn thành cuộc đánh giá"
        onCancel={() => setCompleteOpen(false)}
        onOk={() => completeForm.submit()}
        open={completeOpen}
        title="Xác nhận ngày công thực tế"
        width={860}
      >
        <Form<CompleteFormValues>
          form={completeForm}
          layout="vertical"
          onFinish={(values) => completeMutation.mutate(values)}
        >
          <Alert
            description="Ngày tham gia phải nằm trong khoảng ngày thực tế của báo cáo. Man-day được nhập theo bước 0,5 MD và không lớn hơn số ngày tham gia."
            showIcon
            style={{ marginBottom: 16 }}
            type="info"
          />
          <Form.List name="member_actuals">
            {(fields) => (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {fields.map((field, index) => {
                  const member = appointment?.members?.[index];
                  const counted = countedRoles.has(normalize(member?.team_role));
                  return (
                    <Card
                      key={field.key}
                      size="small"
                      title={`${member?.experts?.full_name || "Thành viên"} · ${teamRoleLabels[normalize(member?.team_role)] ?? statusLabel(member?.team_role)}`}
                    >
                      <Form.Item name={[field.name, "member_id"]} hidden><Input /></Form.Item>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                        <Form.Item name={[field.name, "actual_dates"]} label="Ngày tham gia thực tế" rules={[{ required: true, message: "Chọn ngày tham gia" }]}>
                          <RangePicker allowClear={false} format="DD/MM/YYYY" style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item name={[field.name, "actual_mandays"]} label="Man-day thực tế" rules={[{ required: true, message: "Nhập man-day" }]}>
                          <InputNumber disabled={!counted} min={0} step={0.5} style={{ width: "100%" }} />
                        </Form.Item>
                      </div>
                    </Card>
                  );
                })}
              </Space>
            )}
          </Form.List>
          <Divider />
          <Form.Item name="completion_note" label="Ghi chú hoàn thành hoặc lý do chênh lệch man-day">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
