"use client";

import {
  AuditOutlined,
  BookOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FileSearchOutlined,
  PlusOutlined,
  StopOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Select,
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
import { ResponsiveCardList, type ResponsiveCardItem } from "./design-system";

const { Text } = Typography;

type Attachment = {
  id: string;
  original_name: string;
  mime_type?: string | null;
  download_url?: string | null;
};

type CompetencyOption = {
  id: string;
  management_system: string;
  standard_code: string;
  competency_role: string;
  iaf_code: string;
  nace_code?: string | null;
  approval_status: string;
};

type TrainingRecord = {
  id: string;
  training_type: string;
  title: string;
  provider?: string | null;
  delivery_mode?: string | null;
  management_system?: string | null;
  standard_code?: string | null;
  start_date: string;
  end_date?: string | null;
  duration_hours?: number | string | null;
  status: string;
  completion_result?: string | null;
  certificate_number?: string | null;
  note?: string | null;
  effectiveness_method?: string | null;
  effectiveness_score?: number | string | null;
  effectiveness_result?: string | null;
  effectiveness_comment?: string | null;
  evaluated_at?: string | null;
  competency?: CompetencyOption | null;
  evaluator?: { full_name?: string | null; username?: string | null } | null;
  attachments: Attachment[];
};

type WitnessItem = {
  id?: string;
  criterion_code: string;
  criterion_label: string;
  rating: string;
  comment?: string | null;
};

type MonitoringRecord = {
  id: string;
  monitoring_method: string;
  monitoring_content: string;
  plan_type: string;
  planned_date: string;
  due_date?: string | null;
  management_system?: string | null;
  standard_code?: string | null;
  status: string;
  performed_date?: string | null;
  result?: string | null;
  score?: number | string | null;
  summary?: string | null;
  finding?: string | null;
  required_action?: string | null;
  next_monitoring_date?: string | null;
  competency?: CompetencyOption | null;
  audit_plan?: {
    id: string;
    plan_code?: string | null;
    audit_type?: string | null;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
  } | null;
  assessor?: { full_name?: string | null; username?: string | null } | null;
  witness_items: WitnessItem[];
  attachments: Attachment[];
};

type DevelopmentResponse = {
  expert: {
    id: string;
    full_name: string;
    employee_code?: string | null;
    profile_status: string;
  };
  competencies: CompetencyOption[];
  trainings: TrainingRecord[];
  monitoring: MonitoringRecord[];
  audit_plan_options: Array<{
    id: string;
    plan_code?: string | null;
    audit_type?: string | null;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
    team_role?: string | null;
  }>;
  governance: {
    training: {
      planned: number;
      completed: number;
      effectiveness_pending: number;
      unsatisfactory: number;
    };
    monitoring: {
      planned: number;
      overdue: number;
      unsatisfactory: number;
      improvement_required: number;
    };
    witness: {
      applicable: boolean;
      last_witness_date?: string | null;
      due_date?: string | null;
      status: string;
      frequency_years: number;
    };
    current_cycle_coverage: {
      audit_report_review_12m: boolean;
      customer_or_market_feedback_12m: boolean;
      witness_current: boolean;
      documented_follow_up_complete: boolean;
      ems_auditor: boolean;
      ems_required_methods_met: boolean;
    };
    management_action_required: boolean;
  };
};

interface ExpertDevelopmentPanelProps {
  expertId: string;
  canManage: boolean;
}

interface TrainingFormValues {
  training_type: string;
  title: string;
  provider?: string;
  delivery_mode?: string;
  competency_id?: string;
  start_date: Dayjs;
  end_date?: Dayjs;
  duration_hours?: number;
  status: string;
  completion_result?: string;
  certificate_number?: string;
  note?: string;
}

interface TrainingEvaluationValues {
  method: string;
  result: string;
  score?: number;
  comment?: string;
}

interface MonitoringFormValues {
  monitoring_method: string;
  monitoring_content: string;
  plan_type: string;
  planned_date: Dayjs;
  due_date?: Dayjs;
  competency_id?: string;
  audit_plan_id?: string;
}

interface MonitoringCompleteValues {
  performed_date: Dayjs;
  result: string;
  score?: number;
  summary?: string;
  finding?: string;
  required_action?: string;
  next_monitoring_date?: Dayjs;
}

const trainingTypeLabels: Record<string, string> = {
  INTERNAL: "Đào tạo nội bộ",
  EXTERNAL: "Đào tạo bên ngoài",
  AUDITOR_COURSE: "Khóa chuyên gia đánh giá",
  SPECIALIZED: "Đào tạo chuyên môn",
  WITNESS_PRACTICE: "Thực tập / chứng kiến",
  OTHER: "Khác",
};

const monitoringMethodLabels: Record<string, string> = {
  WITNESS: "Đánh giá chứng kiến",
  AUDIT_REPORT_REVIEW: "Xem xét báo cáo đánh giá",
  CUSTOMER_FEEDBACK: "Phản hồi khách hàng",
  MARKET_FEEDBACK: "Phản hồi thị trường",
  INTERVIEW: "Phỏng vấn trực tiếp",
  THEORY_TEST: "Kiểm tra lý thuyết",
  SITUATION_TEST: "Xử lý tình huống",
  OTHER: "Khác",
};

const resultLabels: Record<string, string> = {
  SATISFACTORY: "Đạt",
  IMPROVEMENT_REQUIRED: "Cần cải tiến",
  UNSATISFACTORY: "Không đạt",
};

const effectivenessMethodLabels: Record<string, string> = {
  PRESENTATION: "Trình bày lại nội dung",
  INTERVIEW: "Phỏng vấn trực tiếp",
  TEST: "Làm bài kiểm tra",
  OBSERVATION: "Quan sát thực hiện đánh giá",
  OTHER: "Khác",
};

const WITNESS_CRITERIA: Array<{ code: string; label: string }> = [
  { code: "PLANNING", label: "Hoạch định, chuẩn bị đánh giá" },
  { code: "OPENING_MEETING", label: "Họp khai mạc" },
  { code: "INTRODUCTION", label: "Giới thiệu" },
  { code: "SCOPE_OBJECTIVES", label: "Phạm vi, mục tiêu đánh giá" },
  { code: "AUDIT_PLAN", label: "Kế hoạch đánh giá" },
  { code: "METHODOLOGY", label: "Phương pháp đánh giá" },
  { code: "COMMUNICATION", label: "Xác nhận kênh trao đổi thông tin" },
  { code: "CONFIDENTIALITY", label: "Cam kết bảo mật" },
  { code: "SAFETY", label: "Xác nhận yêu cầu an toàn lao động" },
  { code: "RESOURCES", label: "Xác nhận nguồn lực và phương tiện cần thiết" },
  { code: "CLOSING_ARRANGEMENT", label: "Thời gian, địa điểm họp kết thúc" },
  { code: "QUESTIONS", label: "Hỏi và đáp" },
  { code: "PLAN_COMPLIANCE", label: "Tuân thủ kế hoạch đánh giá" },
  { code: "OBJECTIVITY", label: "Khách quan, không áp đặt" },
  { code: "QUESTIONING", label: "Cách hỏi, kiểm tra chéo, độ sâu và kiên trì" },
  { code: "OBJECTIVE_EVIDENCE", label: "Kết luận dựa trên bằng chứng khách quan" },
  { code: "ETHICS", label: "Nguyên tắc nghề nghiệp" },
  { code: "TEAM_COMMENTS", label: "Họp nội bộ: thu thập ý kiến" },
  { code: "FINDINGS", label: "Họp nội bộ: tổng hợp phát hiện" },
  { code: "NCR_CLASSIFICATION", label: "Thống nhất mức độ không phù hợp" },
  { code: "SCOPE_COVERAGE", label: "Đảm bảo đánh giá đầy đủ phạm vi" },
  { code: "CLOSING_FINDINGS", label: "Họp kết thúc: trình bày và giải thích phát hiện" },
  { code: "SYSTEM_EFFECTIVENESS", label: "Đánh giá hiệu lực hệ thống trong đáp ứng mục tiêu" },
  { code: "PROCEDURE_COMPLIANCE", label: "Tuân thủ các thủ tục đánh giá" },
  { code: "ORAL_REPORTING", label: "Báo cáo rõ ràng, chính xác bằng lời" },
  { code: "WRITTEN_REPORTING", label: "Báo cáo rõ ràng, chính xác bằng văn bản" },
  { code: "TEAM_RELATIONSHIP", label: "Quan hệ với thành viên khác trong đoàn" },
  { code: "CLIENT_RELATIONSHIP", label: "Quan hệ với khách hàng" },
  { code: "OPEN_MINDED", label: "Biết lắng nghe" },
  { code: "MATURITY", label: "Chín chắn" },
  { code: "COMPLEX_OPERATIONS", label: "Khả năng nắm bắt các vấn đề phức tạp" },
  { code: "STANDARD_INTERPRETATION", label: "Mức độ bao quát và hiểu các yêu cầu của tiêu chuẩn" },
];

function formatDate(value?: string | null) {
  return value ? dayjs(value).format("DD/MM/YYYY") : "—";
}

function statusTag(status?: string | null) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "COMPLETED") return <Tag color="green">Hoàn thành</Tag>;
  if (normalized === "CANCELLED") return <Tag color="default">Đã hủy</Tag>;
  return <Tag color="blue">Kế hoạch</Tag>;
}

function resultTag(result?: string | null) {
  const normalized = (result ?? "").toUpperCase();
  if (!normalized) return <Tag>Chưa đánh giá</Tag>;
  if (normalized === "SATISFACTORY") return <Tag color="green">Đạt</Tag>;
  if (normalized === "IMPROVEMENT_REQUIRED") return <Tag color="gold">Cần cải tiến</Tag>;
  return <Tag color="red">Không đạt</Tag>;
}

function witnessStatusTag(status: string) {
  if (status === "NOT_APPLICABLE") return <Tag>Không áp dụng</Tag>;
  if (status === "CURRENT") return <Tag color="green">Chu kỳ witness còn hiệu lực</Tag>;
  if (status === "DUE_90_DAYS") return <Tag color="gold">Witness đến hạn trong 90 ngày</Tag>;
  return <Tag color="red">Witness quá hạn</Tag>;
}

export default function ExpertDevelopmentPanel({ expertId, canManage }: ExpertDevelopmentPanelProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [trainingForm] = Form.useForm<TrainingFormValues>();
  const [trainingEvaluationForm] = Form.useForm<TrainingEvaluationValues>();
  const [monitoringForm] = Form.useForm<MonitoringFormValues>();
  const [monitoringCompleteForm] = Form.useForm<MonitoringCompleteValues>();
  const [cancelForm] = Form.useForm<{ reason: string }>();

  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [trainingFile, setTrainingFile] = useState<File | null>(null);
  const [trainingEvaluationId, setTrainingEvaluationId] = useState<string | null>(null);
  const [monitoringModalOpen, setMonitoringModalOpen] = useState(false);
  const [monitoringFile, setMonitoringFile] = useState<File | null>(null);
  const [monitoringCompleteId, setMonitoringCompleteId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ type: "training" | "monitoring"; id: string } | null>(null);
  const [witnessValues, setWitnessValues] = useState<Record<string, { rating?: string; comment?: string }>>({});
  const [mobilePage, setMobilePage] = useState<{ tab: string; page: number }>({ tab: "training", page: 1 });
  const [activeDevelopmentTab, setActiveDevelopmentTab] = useState("training");
  const [mobileDevelopmentOpen, setMobileDevelopmentOpen] = useState(false);

  const developmentQuery = useQuery({
    queryKey: ["experts", "development", expertId],
    queryFn: async () => (await api.get<DevelopmentResponse>(`/experts/${expertId}/development`)).data,
    enabled: Boolean(expertId),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["experts", "development", expertId] }),
      queryClient.invalidateQueries({ queryKey: ["experts", "overview"] }),
      queryClient.invalidateQueries({ queryKey: ["experts", "detail", expertId] }),
    ]);
  };

  const uploadAttachment = async (
    entityType: string,
    entityId: string,
    documentType: string,
    file: File | null,
    note: string,
  ) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId);
    formData.append("document_type", documentType);
    formData.append("file_kind", "attachment");
    formData.append("note", note);
    await api.post("/document-files/upload", formData);
  };

  const createTrainingMutation = useMutation({
    mutationFn: async (values: TrainingFormValues) => {
      const competency = developmentQuery.data?.competencies.find((item) => item.id === values.competency_id);
      const record = (
        await api.post<TrainingRecord>(`/experts/${expertId}/trainings`, {
          training_type: values.training_type,
          title: values.title,
          provider: values.provider,
          delivery_mode: values.delivery_mode,
          competency_id: values.competency_id,
          management_system: competency?.management_system,
          standard_code: competency?.standard_code,
          start_date: values.start_date.format("YYYY-MM-DD"),
          end_date: values.end_date?.format("YYYY-MM-DD"),
          duration_hours: values.duration_hours,
          status: values.status,
          completion_result: values.completion_result,
          certificate_number: values.certificate_number,
          note: values.note,
        })
      ).data;
      await uploadAttachment(
        "expert_training_record",
        record.id,
        "training_evidence",
        trainingFile,
        values.title,
      );
      return record;
    },
    onSuccess: async () => {
      message.success("Đã lưu hồ sơ đào tạo chuyên gia");
      setTrainingModalOpen(false);
      setTrainingFile(null);
      trainingForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const evaluateTrainingMutation = useMutation({
    mutationFn: async (values: TrainingEvaluationValues) => {
      if (!trainingEvaluationId) throw new Error("Chưa chọn hồ sơ đào tạo");
      return (
        await api.post(`/experts/${expertId}/trainings/${trainingEvaluationId}/evaluate`, values)
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã ghi nhận đánh giá hiệu quả sau đào tạo");
      setTrainingEvaluationId(null);
      trainingEvaluationForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const createMonitoringMutation = useMutation({
    mutationFn: async (values: MonitoringFormValues) => {
      const competency = developmentQuery.data?.competencies.find((item) => item.id === values.competency_id);
      const record = (
        await api.post<MonitoringRecord>(`/experts/${expertId}/monitoring`, {
          monitoring_method: values.monitoring_method,
          monitoring_content: values.monitoring_content,
          plan_type: values.plan_type,
          planned_date: values.planned_date.format("YYYY-MM-DD"),
          due_date: values.due_date?.format("YYYY-MM-DD"),
          competency_id: values.competency_id,
          management_system: competency?.management_system,
          standard_code: competency?.standard_code,
          audit_plan_id: values.audit_plan_id,
        })
      ).data;
      await uploadAttachment(
        "expert_monitoring_record",
        record.id,
        "monitoring_evidence",
        monitoringFile,
        values.monitoring_content,
      );
      return record;
    },
    onSuccess: async () => {
      message.success("Đã lập kế hoạch giám sát năng lực F.12");
      setMonitoringModalOpen(false);
      setMonitoringFile(null);
      monitoringForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const completeMonitoringMutation = useMutation({
    mutationFn: async (values: MonitoringCompleteValues) => {
      if (!monitoringCompleteId) throw new Error("Chưa chọn hồ sơ giám sát");
      const record = developmentQuery.data?.monitoring.find((item) => item.id === monitoringCompleteId);
      if (!record) throw new Error("Không tìm thấy hồ sơ giám sát");
      let witness_items: Array<{ criterion_code: string; criterion_label: string; rating: string; comment?: string }> | undefined;
      if (record.monitoring_method === "WITNESS") {
        const missing = WITNESS_CRITERIA.filter((item) => !witnessValues[item.code]?.rating);
        if (missing.length > 0) {
          throw new Error(`Cần chấm đủ ${WITNESS_CRITERIA.length} tiêu chí F.09 trước khi hoàn tất witness`);
        }
        witness_items = WITNESS_CRITERIA.map((item) => ({
          criterion_code: item.code,
          criterion_label: item.label,
          rating: witnessValues[item.code]?.rating || "N",
          comment: witnessValues[item.code]?.comment,
        }));
      }
      return (
        await api.post(`/experts/${expertId}/monitoring/${monitoringCompleteId}/complete`, {
          performed_date: values.performed_date.format("YYYY-MM-DD"),
          result: values.result,
          score: values.score,
          summary: values.summary,
          finding: values.finding,
          required_action: values.required_action,
          next_monitoring_date: values.next_monitoring_date?.format("YYYY-MM-DD"),
          witness_items,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã hoàn tất giám sát năng lực");
      setMonitoringCompleteId(null);
      setWitnessValues({});
      monitoringCompleteForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: async (values: { reason: string }) => {
      if (!cancelTarget) throw new Error("Chưa chọn hồ sơ cần hủy");
      const suffix = cancelTarget.type === "training"
        ? `trainings/${cancelTarget.id}/cancel`
        : `monitoring/${cancelTarget.id}/cancel`;
      return (await api.post(`/experts/${expertId}/${suffix}`, values)).data;
    },
    onSuccess: async () => {
      message.success("Đã hủy kế hoạch và giữ nguyên lịch sử");
      setCancelTarget(null);
      cancelForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const competencyOptions = useMemo(
    () => (developmentQuery.data?.competencies ?? []).map((item) => ({
      value: item.id,
      label: `${item.management_system} · ${item.standard_code} · ${item.competency_role} · IAF ${item.iaf_code}${item.nace_code ? ` / NACE ${item.nace_code}` : ""}`,
    })),
    [developmentQuery.data?.competencies],
  );

  const auditPlanOptions = useMemo(
    () => (developmentQuery.data?.audit_plan_options ?? []).map((item) => ({
      value: item.id,
      label: `${item.plan_code || item.id} · ${item.audit_type || "Audit"} · ${formatDate(item.planned_start_date)}`,
    })),
    [developmentQuery.data?.audit_plan_options],
  );

  const openAttachment = async (file: Attachment) => {
    try {
      await openDocumentFile({
        ...documentRequestFromFile(file),
        title: file.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const attachmentButtons = (attachments: Attachment[]) => attachments.length ? (
    <Space direction="vertical" size={2}>
      {attachments.map((file) => (
        <Button key={file.id} icon={<EyeOutlined />} onClick={() => void openAttachment(file)} size="small" type="link">
          {file.original_name}
        </Button>
      ))}
    </Space>
  ) : <Text type="secondary">—</Text>;

  const trainingActionNode = (row: TrainingRecord) => canManage ? (
    <Space wrap>
      {row.status !== "CANCELLED" && !row.effectiveness_result ? (
        <Button icon={<CheckCircleOutlined />} onClick={() => {
          setTrainingEvaluationId(row.id);
          trainingEvaluationForm.setFieldsValue({ method: "TEST", result: "SATISFACTORY" });
        }} size="small">Đánh giá hiệu quả</Button>
      ) : null}
      {row.status === "PLANNED" ? (
        <Button danger icon={<StopOutlined />} onClick={() => setCancelTarget({ type: "training", id: row.id })} size="small">Hủy</Button>
      ) : null}
    </Space>
  ) : null;

  const trainingColumns: TableColumnsType<TrainingRecord> = [
    {
      title: "Thời gian",
      width: 150,
      render: (_, row) => <span>{formatDate(row.start_date)}{row.end_date ? ` – ${formatDate(row.end_date)}` : ""}</span>,
    },
    {
      title: "Đào tạo",
      width: 310,
      render: (_, row) => (
        <div className="expert-development-main-cell">
          <strong>{row.title}</strong>
          <small>{trainingTypeLabels[row.training_type] || row.training_type}{row.provider ? ` · ${row.provider}` : ""}</small>
          <small>{row.standard_code || row.competency?.standard_code || "Không gắn tiêu chuẩn"}</small>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      width: 150,
      render: (_, row) => <Space direction="vertical" size={2}>{statusTag(row.status)}{resultTag(row.effectiveness_result)}</Space>,
    },
    {
      title: "Hiệu quả sau đào tạo",
      width: 230,
      render: (_, row) => row.effectiveness_result ? (
        <div className="expert-development-main-cell">
          <span>{effectivenessMethodLabels[row.effectiveness_method || ""] || row.effectiveness_method || "—"}</span>
          <small>{row.effectiveness_score != null ? `Điểm: ${row.effectiveness_score}` : "Không chấm điểm"}</small>
          <small>{row.effectiveness_comment || "—"}</small>
        </div>
      ) : <Text type="secondary">Chưa đánh giá hiệu quả</Text>,
    },
    { title: "Minh chứng", width: 220, render: (_, row) => attachmentButtons(row.attachments) },
    {
      title: "Thao tác",
      width: 190,
      fixed: "right",
      render: (_, row) => trainingActionNode(row) ?? "—",
    },
  ];

  const monitoringActionNode = (row: MonitoringRecord) => canManage && row.status === "PLANNED" ? (
    <Space wrap>
      <Button icon={<FileSearchOutlined />} onClick={() => {
        setMonitoringCompleteId(row.id);
        setWitnessValues({});
        monitoringCompleteForm.setFieldsValue({ performed_date: dayjs(), result: "SATISFACTORY" });
      }} size="small">Hoàn tất</Button>
      <Button danger icon={<StopOutlined />} onClick={() => setCancelTarget({ type: "monitoring", id: row.id })} size="small">Hủy</Button>
    </Space>
  ) : null;

  const monitoringColumns: TableColumnsType<MonitoringRecord> = [
    {
      title: "Kế hoạch / thực hiện",
      width: 175,
      render: (_, row) => (
        <div className="expert-development-main-cell">
          <span>Kế hoạch: {formatDate(row.planned_date)}</span>
          <small>Hạn: {formatDate(row.due_date || row.planned_date)}</small>
          <small>Thực hiện: {formatDate(row.performed_date)}</small>
        </div>
      ),
    },
    {
      title: "Nội dung giám sát",
      width: 320,
      render: (_, row) => (
        <div className="expert-development-main-cell">
          <strong>{monitoringMethodLabels[row.monitoring_method] || row.monitoring_method}</strong>
          <span>{row.monitoring_content}</span>
          <small>{row.audit_plan?.plan_code ? `Audit plan: ${row.audit_plan.plan_code}` : "Không gắn audit plan"}</small>
        </div>
      ),
    },
    {
      title: "Kết quả",
      width: 180,
      render: (_, row) => <Space direction="vertical" size={2}>{statusTag(row.status)}{resultTag(row.result)}{row.score != null ? <Tag>{row.score}/100</Tag> : null}</Space>,
    },
    {
      title: "Phát hiện / hành động",
      width: 280,
      render: (_, row) => (
        <div className="expert-development-main-cell">
          <span>{row.finding || row.summary || "—"}</span>
          {row.required_action ? <small>Hành động: {row.required_action}</small> : null}
          {row.next_monitoring_date ? <small>Tiếp theo: {formatDate(row.next_monitoring_date)}</small> : null}
        </div>
      ),
    },
    { title: "Minh chứng", width: 220, render: (_, row) => attachmentButtons(row.attachments) },
    {
      title: "Thao tác",
      width: 175,
      fixed: "right",
      render: (_, row) => monitoringActionNode(row) ?? "—",
    },
  ];

  const trainingCards: ResponsiveCardItem[] = (developmentQuery.data?.trainings ?? []).map((row) => ({
    key: row.id,
    title: row.title,
    status: statusTag(row.status),
    fields: [
      { key: "type", label: "Loại / đơn vị", value: `${trainingTypeLabels[row.training_type] || row.training_type}${row.provider ? ` · ${row.provider}` : ""}` },
      { key: "standard", label: "Tiêu chuẩn", value: row.standard_code || row.competency?.standard_code || "—" },
      { key: "dates", label: "Thời gian", value: `${formatDate(row.start_date)}${row.end_date ? ` – ${formatDate(row.end_date)}` : ""}` },
      { key: "effectiveness", label: "Hiệu quả", value: row.effectiveness_result ? <Space orientation="vertical" size={2}>{resultTag(row.effectiveness_result)}<span>{effectivenessMethodLabels[row.effectiveness_method || ""] || row.effectiveness_method || "—"}{row.effectiveness_score != null ? ` · Điểm: ${row.effectiveness_score}` : ""}</span>{row.effectiveness_comment ? <span>{row.effectiveness_comment}</span> : null}</Space> : "Chưa đánh giá hiệu quả" },
      { key: "attachments", label: "Minh chứng", value: attachmentButtons(row.attachments) },
    ],
    actions: trainingActionNode(row),
  }));
  const monitoringCards: ResponsiveCardItem[] = (developmentQuery.data?.monitoring ?? []).map((row) => ({
    key: row.id,
    title: monitoringMethodLabels[row.monitoring_method] || row.monitoring_method,
    status: statusTag(row.status),
    fields: [
      { key: "content", label: "Nội dung", value: row.monitoring_content },
      { key: "plan", label: "Kế hoạch", value: row.audit_plan?.plan_code || "—" },
      { key: "dates", label: "Thời gian", value: `Kế hoạch ${formatDate(row.planned_date)} · Hạn ${formatDate(row.due_date || row.planned_date)} · Thực hiện ${formatDate(row.performed_date)}` },
      { key: "result", label: "Kết quả", value: <Space wrap>{resultTag(row.result)}{row.score != null ? <Tag>{row.score}/100</Tag> : null}</Space> },
      { key: "finding", label: "Phát hiện / hành động", value: <Space orientation="vertical" size={2}><span>{row.finding || row.summary || "—"}</span>{row.required_action ? <span>Hành động: {row.required_action}</span> : null}{row.next_monitoring_date ? <span>Tiếp theo: {formatDate(row.next_monitoring_date)}</span> : null}</Space> },
      ...(row.monitoring_method === "WITNESS" && row.witness_items.length ? [{ key: "witness", label: "Tiêu chí F.09", value: <Space orientation="vertical" size={2}>{row.witness_items.map((item) => <span key={item.id || item.criterion_code}>{item.criterion_label}: {item.rating}{item.comment ? ` · ${item.comment}` : ""}</span>)}</Space> }] : []),
      { key: "attachments", label: "Minh chứng", value: attachmentButtons(row.attachments) },
    ],
    actions: monitoringActionNode(row),
  }));
  const renderMobileCards = (tab: string, cards: ResponsiveCardItem[], empty: string) => {
    const pageSize = 8;
    const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
    const page = Math.min(mobilePage.tab === tab ? mobilePage.page : 1, pageCount);
    return <>
      <ResponsiveCardList empty={<Empty description={empty} />} items={cards.slice((page - 1) * pageSize, page * pageSize)} />
      {cards.length > pageSize ? <Pagination className="expert-development-mobile-pagination" current={page} onChange={(nextPage) => setMobilePage({ tab, page: nextPage })} pageSize={pageSize} showSizeChanger={false} total={cards.length} /> : null}
    </>;
  };

  const selectedMonitoring = developmentQuery.data?.monitoring.find((item) => item.id === monitoringCompleteId);
  const governance = developmentQuery.data?.governance;

  return (
    <div className="expert-development-stack">
      {governance?.management_action_required ? (
        <Alert
          showIcon
          type="warning"
          message="Có kết quả giám sát/đào tạo không đạt cần xử lý quản lý"
          description="Hệ thống không tự đình chỉ competency. QMR/Admin cần xem xét đào tạo bổ sung, đánh giá lại hoặc thực hiện quyết định đình chỉ tại hồ sơ quản trị năng lực."
        />
      ) : null}

      <div className="expert-development-kpis">
        <Card size="small"><Statistic prefix={<BookOutlined />} title="Đào tạo đang kế hoạch" value={governance?.training.planned ?? 0} /></Card>
        <Card size="small"><Statistic prefix={<WarningOutlined />} title="Chờ đánh giá hiệu quả" value={governance?.training.effectiveness_pending ?? 0} /></Card>
        <Card size="small"><Statistic prefix={<AuditOutlined />} title="Giám sát đang kế hoạch" value={governance?.monitoring.planned ?? 0} /></Card>
        <Card size="small"><Statistic prefix={<WarningOutlined />} title="Giám sát quá hạn" value={governance?.monitoring.overdue ?? 0} /></Card>
      </div>

      <Card size="small" title="Theo dõi năng lực theo P.08">
        <Space wrap size={[8, 8]}>
          {governance ? witnessStatusTag(governance.witness.status) : null}
          <Tag color={governance?.current_cycle_coverage.audit_report_review_12m ? "green" : "gold"}>
            Review báo cáo 12 tháng: {governance?.current_cycle_coverage.audit_report_review_12m ? "Có" : "Chưa có"}
          </Tag>
          <Tag color={governance?.current_cycle_coverage.customer_or_market_feedback_12m ? "green" : "gold"}>
            Feedback KH/thị trường 12 tháng: {governance?.current_cycle_coverage.customer_or_market_feedback_12m ? "Có" : "Chưa có"}
          </Tag>
          {governance?.current_cycle_coverage.ems_auditor ? (
            <Tag color={governance.current_cycle_coverage.ems_required_methods_met ? "green" : "red"}>
              EMS witness + feedback: {governance.current_cycle_coverage.ems_required_methods_met ? "Đủ" : "Thiếu"}
            </Tag>
          ) : null}
        </Space>
        {governance?.witness.applicable ? (
          <div className="expert-development-cycle-note">
            Witness gần nhất: <strong>{formatDate(governance.witness.last_witness_date)}</strong> · Hạn chu kỳ 3 năm: <strong>{formatDate(governance.witness.due_date)}</strong>
          </div>
        ) : null}
      </Card>

      <Select
        aria-label="Mục đào tạo và giám sát"
        className="expert-development-mobile-select"
        onChange={(tab) => { setActiveDevelopmentTab(tab); setMobileDevelopmentOpen(false); }}
        onOpenChange={setMobileDevelopmentOpen}
        open={mobileDevelopmentOpen}
        options={[
          { value: "training", label: `Đào tạo (${developmentQuery.data?.trainings.length ?? 0})` },
          { value: "monitoring", label: `Giám sát F.12 (${developmentQuery.data?.monitoring.length ?? 0})` },
        ]}
        value={activeDevelopmentTab}
      />
      <Tabs activeKey={activeDevelopmentTab} className="expert-development-tabs" onChange={setActiveDevelopmentTab} items={[
        {
          key: "training",
          label: <span><BookOutlined /> Đào tạo ({developmentQuery.data?.trainings.length ?? 0})</span>,
          children: (
            <Card
              className="expert-competency-tab-card"
              title="Kế hoạch, hồ sơ đào tạo và đánh giá hiệu quả sau đào tạo"
              extra={canManage ? (
                <Button icon={<PlusOutlined />} onClick={() => {
                  trainingForm.setFieldsValue({
                    training_type: "INTERNAL",
                    delivery_mode: "IN_PERSON",
                    start_date: dayjs(),
                    status: "PLANNED",
                  });
                  setTrainingFile(null);
                  setTrainingModalOpen(true);
                }} type="primary">Thêm đào tạo</Button>
              ) : null}
            >
              <div className="expert-development-responsive">
              <div className="cmp-data-table--responsive"><Table
                columns={trainingColumns}
                dataSource={developmentQuery.data?.trainings ?? []}
                loading={developmentQuery.isLoading}
                locale={{ emptyText: <Empty description="Chưa có hồ sơ đào tạo chuyên gia" /> }}
                pagination={{ pageSize: 8 }}
                rowKey="id"
                scroll={{ x: 1280 }}
              /></div>
              {renderMobileCards("training", trainingCards, "Chưa có hồ sơ đào tạo chuyên gia")}
              </div>
            </Card>
          ),
        },
        {
          key: "monitoring",
          label: <span><AuditOutlined /> Giám sát F.12 ({developmentQuery.data?.monitoring.length ?? 0})</span>,
          children: (
            <Card
              className="expert-competency-tab-card"
              title="Kế hoạch giám sát năng lực, witness F.09, review báo cáo và feedback"
              extra={canManage ? (
                <Button icon={<PlusOutlined />} onClick={() => {
                  monitoringForm.setFieldsValue({
                    monitoring_method: "WITNESS",
                    plan_type: "SCHEDULED",
                    planned_date: dayjs(),
                  });
                  setMonitoringFile(null);
                  setMonitoringModalOpen(true);
                }} type="primary">Lập kế hoạch giám sát</Button>
              ) : null}
            >
              <div className="expert-development-responsive">
              <div className="cmp-data-table--responsive"><Table
                columns={monitoringColumns}
                dataSource={developmentQuery.data?.monitoring ?? []}
                expandable={{
                  expandedRowRender: (row) => row.monitoring_method === "WITNESS" && row.witness_items.length ? (
                    <Table
                      columns={[
                        { title: "Tiêu chí F.09", dataIndex: "criterion_label", key: "criterion_label" },
                        { title: "Điểm", dataIndex: "rating", key: "rating", width: 90 },
                        { title: "Nhận xét", dataIndex: "comment", key: "comment" },
                      ]}
                      dataSource={row.witness_items}
                      pagination={false}
                      rowKey={(item) => item.id || item.criterion_code}
                      size="small"
                    />
                  ) : <Text type="secondary">Không có bảng tiêu chí witness.</Text>,
                  rowExpandable: (row) => row.monitoring_method === "WITNESS" && row.status === "COMPLETED",
                }}
                loading={developmentQuery.isLoading}
                locale={{ emptyText: <Empty description="Chưa có kế hoạch giám sát năng lực" /> }}
                pagination={{ pageSize: 8 }}
                rowKey="id"
                scroll={{ x: 1400 }}
              /></div>
              {renderMobileCards("monitoring", monitoringCards, "Chưa có kế hoạch giám sát năng lực")}
              </div>
            </Card>
          ),
        },
      ]} />

      <Modal
        confirmLoading={createTrainingMutation.isPending}
        okText="Lưu hồ sơ đào tạo"
        onCancel={() => {
          setTrainingModalOpen(false);
          setTrainingFile(null);
          trainingForm.resetFields();
        }}
        onOk={() => void trainingForm.validateFields().then((values) => createTrainingMutation.mutate(values))}
        open={trainingModalOpen}
        title="Kế hoạch / hồ sơ đào tạo chuyên gia"
        width={900}
      >
        <Form form={trainingForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Loại đào tạo" name="training_type" rules={[{ required: true }]}>
              <Select options={Object.entries(trainingTypeLabels).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
            <Form.Item label="Tên/nội dung đào tạo" name="title" rules={[{ required: true, message: "Nhập nội dung đào tạo" }]}><Input /></Form.Item>
            <Form.Item label="Đơn vị/người đào tạo" name="provider"><Input /></Form.Item>
            <Form.Item label="Hình thức" name="delivery_mode"><Select options={[
              { value: "IN_PERSON", label: "Trực tiếp" },
              { value: "ONLINE", label: "Trực tuyến" },
              { value: "HYBRID", label: "Kết hợp" },
              { value: "OJT", label: "Thực hành/OJT" },
              { value: "OTHER", label: "Khác" },
            ]} /></Form.Item>
            <Form.Item label="Liên kết phạm vi năng lực" name="competency_id"><Select allowClear options={competencyOptions} showSearch optionFilterProp="label" /></Form.Item>
            <Form.Item label="Ngày bắt đầu" name="start_date" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Ngày kết thúc" name="end_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Thời lượng (giờ)" name="duration_hours"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Trạng thái" name="status" rules={[{ required: true }]}><Select options={[
              { value: "PLANNED", label: "Kế hoạch" },
              { value: "COMPLETED", label: "Đã hoàn thành" },
            ]} /></Form.Item>
            <Form.Item label="Kết quả hoàn thành" name="completion_result"><Input placeholder="Hoàn thành / cấp chứng chỉ..." /></Form.Item>
            <Form.Item label="Số chứng chỉ" name="certificate_number"><Input /></Form.Item>
          </div>
          <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="Tài liệu / chứng chỉ đào tạo">
            <input accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => setTrainingFile(event.target.files?.[0] ?? null)} type="file" />
            {trainingFile ? <div className="competency-upload-note">{trainingFile.name}</div> : null}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={evaluateTrainingMutation.isPending}
        okText="Lưu đánh giá hiệu quả"
        onCancel={() => {
          setTrainingEvaluationId(null);
          trainingEvaluationForm.resetFields();
        }}
        onOk={() => void trainingEvaluationForm.validateFields().then((values) => evaluateTrainingMutation.mutate(values))}
        open={Boolean(trainingEvaluationId)}
        title="Đánh giá hiệu quả sau đào tạo · F.05-P.08"
      >
        <Form form={trainingEvaluationForm} layout="vertical">
          <Form.Item label="Phương pháp đánh giá" name="method" rules={[{ required: true }]}>
            <Select options={Object.entries(effectivenessMethodLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item label="Kết quả" name="result" rules={[{ required: true }]}>
            <Select options={Object.entries(resultLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item label="Điểm (0-100)" name="score"><InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} /></Form.Item>
          <Form.Item label="Nhận xét" name="comment"><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={createMonitoringMutation.isPending}
        okText="Lưu kế hoạch F.12"
        onCancel={() => {
          setMonitoringModalOpen(false);
          setMonitoringFile(null);
          monitoringForm.resetFields();
        }}
        onOk={() => void monitoringForm.validateFields().then((values) => createMonitoringMutation.mutate(values))}
        open={monitoringModalOpen}
        title="Kế hoạch giám sát năng lực nhân sự · F.12-P.08"
        width={900}
      >
        <Form form={monitoringForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Hình thức giám sát" name="monitoring_method" rules={[{ required: true }]}>
              <Select options={Object.entries(monitoringMethodLabels).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
            <Form.Item label="Loại kế hoạch" name="plan_type" rules={[{ required: true }]}><Select options={[
              { value: "SCHEDULED", label: "Theo kế hoạch" },
              { value: "UNSCHEDULED", label: "Đột xuất" },
            ]} /></Form.Item>
            <Form.Item label="Ngày dự kiến" name="planned_date" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Hạn hoàn thành" name="due_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Liên kết phạm vi năng lực" name="competency_id"><Select allowClear options={competencyOptions} showSearch optionFilterProp="label" /></Form.Item>
            <Form.Item label="Liên kết audit plan" name="audit_plan_id"><Select allowClear options={auditPlanOptions} showSearch optionFilterProp="label" /></Form.Item>
          </div>
          <Form.Item label="Nội dung giám sát" name="monitoring_content" rules={[{ required: true, message: "Nhập nội dung giám sát" }]}>
            <Input.TextArea rows={3} placeholder="Ví dụ: Đánh giá chứng kiến năng lực thực hiện audit ISO 14001 tại hiện trường" />
          </Form.Item>
          <Form.Item label="Tài liệu kế hoạch / minh chứng ban đầu">
            <input accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => setMonitoringFile(event.target.files?.[0] ?? null)} type="file" />
            {monitoringFile ? <div className="competency-upload-note">{monitoringFile.name}</div> : null}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={completeMonitoringMutation.isPending}
        okText="Hoàn tất giám sát"
        onCancel={() => {
          setMonitoringCompleteId(null);
          setWitnessValues({});
          monitoringCompleteForm.resetFields();
        }}
        onOk={() => void monitoringCompleteForm.validateFields().then((values) => completeMonitoringMutation.mutate(values))}
        open={Boolean(monitoringCompleteId)}
        title={selectedMonitoring?.monitoring_method === "WITNESS" ? "Phiếu đánh giá chứng kiến · F.09-P.08" : "Kết quả giám sát năng lực"}
        width={selectedMonitoring?.monitoring_method === "WITNESS" ? 1180 : 760}
      >
        <Form form={monitoringCompleteForm} layout="vertical">
          <div className="competency-form-grid">
            <Form.Item label="Ngày thực hiện" name="performed_date" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Kết quả chung" name="result" rules={[{ required: true }]}><Select options={Object.entries(resultLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
            <Form.Item label="Điểm tổng hợp (0-100)" name="score"><InputNumber min={0} max={100} precision={2} placeholder="Witness có thể để trống để hệ thống tính từ F.09" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="Ngày giám sát tiếp theo" name="next_monitoring_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
          </div>
          <Form.Item label="Nhận xét chung" name="summary"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="Phát hiện" name="finding"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, current) => prev.result !== current.result}>
            {({ getFieldValue }) => getFieldValue("result") !== "SATISFACTORY" ? (
              <Form.Item label="Hành động yêu cầu" name="required_action" rules={[{ required: true, min: 3, message: "Kết quả chưa đạt phải có hành động yêu cầu" }]}>
                <Input.TextArea rows={3} placeholder="Đào tạo bổ sung, đánh giá lại, xem xét đình chỉ..." />
              </Form.Item>
            ) : <Form.Item label="Hành động / khuyến nghị" name="required_action"><Input.TextArea rows={2} /></Form.Item>}
          </Form.Item>
        </Form>

        {selectedMonitoring?.monitoring_method === "WITNESS" ? (
          <div className="witness-assessment-section">
            <Alert
              showIcon
              type="info"
              message="F.09: chấm 4 → 1 tương ứng Rất tốt → Kém; N = không áp dụng"
              style={{ marginBottom: 12 }}
            />
            <Table
              columns={[
                { title: "Tiêu chí", dataIndex: "label", key: "label", width: 500 },
                {
                  title: "Điểm",
                  key: "rating",
                  width: 150,
                  render: (_: unknown, row: { code: string; label: string }) => (
                    <Select
                      onChange={(value) => setWitnessValues((current) => ({
                        ...current,
                        [row.code]: { ...current[row.code], rating: value },
                      }))}
                      options={["4", "3", "2", "1", "N"].map((value) => ({ value, label: value }))}
                      placeholder="Chọn"
                      value={witnessValues[row.code]?.rating}
                      style={{ width: 100 }}
                    />
                  ),
                },
                {
                  title: "Nhận xét",
                  key: "comment",
                  render: (_: unknown, row: { code: string; label: string }) => (
                    <Input
                      onChange={(event) => setWitnessValues((current) => ({
                        ...current,
                        [row.code]: { ...current[row.code], comment: event.target.value },
                      }))}
                      value={witnessValues[row.code]?.comment}
                    />
                  ),
                },
              ]}
              dataSource={WITNESS_CRITERIA}
              pagination={false}
              rowKey="code"
              scroll={{ y: 430 }}
              size="small"
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        confirmLoading={cancelMutation.isPending}
        okButtonProps={{ danger: true }}
        okText="Hủy kế hoạch"
        onCancel={() => {
          setCancelTarget(null);
          cancelForm.resetFields();
        }}
        onOk={() => void cancelForm.validateFields().then((values) => cancelMutation.mutate(values))}
        open={Boolean(cancelTarget)}
        title="Hủy kế hoạch và giữ lịch sử"
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item label="Lý do" name="reason" rules={[{ required: true, min: 3 }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
