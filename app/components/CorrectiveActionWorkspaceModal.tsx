"use client";

import {
  CheckCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FormOutlined,
  HistoryOutlined,
  InboxOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Progress,
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Timeline,
  Typography,
  Upload,
} from "antd";
import type { ModalProps, UploadFile } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { downloadDocumentFile } from "../lib/document-file-client";
import { CapWorkspaceView } from "./certification-cap/CapWorkspaceView";
import type { CapSection, CapWorkspaceProjection } from "./certification-cap/cap-model";
import type {
  AuditDocumentCard,
  AuditDocumentPreview,
} from "./AuditDocumentCenterModal";

const { Text, Title } = Typography;

interface CorrectiveActionWorkspaceModalProps {
  open: boolean;
  planId: string | null;
  initialFindingId?: string | null;
  roles: string[];
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
  onOpenFinding?: (findingId: string) => void;
  page?: {
    data: CapWorkspaceProjection;
    section: CapSection;
    versionId: string | null;
    onSection: (section: CapSection) => void;
    onVersion: (id: string | null) => void;
    onOpenPath: (path: string) => void;
  };
}

interface UserSummary {
  full_name?: string | null;
}

interface EvidenceFile {
  id: string;
  original_name: string;
  file_kind?: string | null;
  version_no?: number | null;
  is_current?: boolean | null;
  created_at?: string | null;
  download_url: string;
}

interface CorrectiveActionVersion {
  id: string;
  version_no: number;
  root_cause: string;
  correction: string;
  corrective_action_plan: string;
  responsible_person?: string | null;
  target_date?: string | null;
  status: string;
  submitted_by?: string | null;
  submitted_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
  submitted_by_user?: UserSummary | null;
  reviewed_by_user?: UserSummary | null;
  evidence_files?: EvidenceFile[];
  form_data?: Record<string, unknown> | null;
}

interface AuditFindingDetail {
  id: string;
  finding_code: string;
  finding_type: string;
  clause?: string | null;
  requirement?: string | null;
  description: string;
  objective_evidence: string;
  detected_date?: string | null;
  due_date?: string | null;
  status: string;
  is_overdue?: boolean;
  corrective_actions: CorrectiveActionVersion[];
}

interface AuditPlanSummary {
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

interface CustomerCorrectiveActionWorkspace {
  plan: AuditPlanSummary;
  findings: AuditFindingDetail[];
}

interface CorrectiveActionFormValues {
  root_cause: string;
  correction: string;
  corrective_action_plan: string;
  responsible_person?: string;
  target_date?: Dayjs;
  customer_comment?: string;
}

interface ReviewFormValues {
  review_result: "accepted" | "revision_required";
  review_comment?: string;
}

interface CloseFormValues {
  close_comment?: string;
}

interface GeneratedDocumentResponse {
  document: EvidenceFile;
  form_code: string;
  format: "docx" | "pdf";
}

type FilterKey = "open" | "closed" | "all";

const ncTypeLabels: Record<string, string> = {
  minor_nc: "NC nhẹ",
  major_nc: "NC nặng",
};

const statusLabels: Record<string, string> = {
  open: "Chờ phản hồi",
  response_submitted: "Đã gửi phản hồi",
  revision_required: "Yêu cầu bổ sung",
  action_accepted: "Hành động được chấp nhận",
  accepted: "Đã chấp nhận",
  submitted: "Chờ xem xét",
  closed: "Đã đóng",
};

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function statusLabel(value?: string | null) {
  const key = normalize(value);
  return statusLabels[key] ?? (value || "Chưa cập nhật").replaceAll("_", " ");
}

function statusColor(value?: string | null) {
  const key = normalize(value);
  if (["closed", "accepted", "action_accepted"].includes(key)) return "green";
  if (["revision_required"].includes(key)) return "red";
  if (["response_submitted", "submitted"].includes(key)) return "blue";
  return "orange";
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "—";
  return parsed.format(withTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY");
}

function displayUser(user?: UserSummary | null) {
  return user?.full_name || "—";
}

function isNc(finding: AuditFindingDetail) {
  return ["minor_nc", "major_nc"].includes(normalize(finding.finding_type));
}

function ResponseContainer({ page, ...props }: Omit<ModalProps, "onCancel"> & { page: boolean; onCancel?: () => void }) {
  if (!page) return <Modal {...props} />;
  if (!props.open) return null;
  return <section className="cmp-cap-response" aria-label="Soạn phản hồi HĐKP">
    <Title level={4}>{props.title}</Title>{props.children}
    <Space wrap><Button onClick={props.onCancel}>Hủy</Button><Button type="primary" loading={props.okButtonProps?.loading} onClick={props.onOk}>Lưu và gửi phản hồi</Button></Space>
  </section>;
}

export default function CorrectiveActionWorkspaceModal({
  open,
  planId,
  initialFindingId = null,
  roles,
  onClose,
  onChanged,
  onOpenFinding,
  page,
}: CorrectiveActionWorkspaceModalProps) {
  const { message } = App.useApp();
  const [responseForm] = Form.useForm<CorrectiveActionFormValues>();
  const [reviewForm] = Form.useForm<ReviewFormValues>();
  const [closeForm] = Form.useForm<CloseFormValues>();
  const [filter, setFilter] = useState<FilterKey>("open");
  const [responseFinding, setResponseFinding] = useState<AuditFindingDetail | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    finding: AuditFindingDetail;
    action: CorrectiveActionVersion;
  } | null>(null);
  const [closeFinding, setCloseFinding] = useState<AuditFindingDetail | null>(null);
  const [evidenceTarget, setEvidenceTarget] = useState<{
    finding: AuditFindingDetail;
    action: CorrectiveActionVersion;
  } | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<UploadFile[]>([]);

  const normalizedRoles = useMemo(() => roles.map(normalize), [roles]);
  const isCustomer = normalizedRoles.includes("customer");
  const legacyOpen = open && !page;
  const canEnterResponse = normalizedRoles.some((role) =>
    ["admin", "staff", "coordinator", "auditor", "lead_auditor", "customer"].includes(role),
  );
  const canUploadEvidence = normalizedRoles.some((role) =>
    ["admin", "staff", "coordinator", "auditor", "lead_auditor", "customer"].includes(role),
  );
  const canReview = normalizedRoles.some((role) =>
    ["admin", "auditor", "lead_auditor"].includes(role),
  );

  const customerWorkspaceQuery = useQuery<CustomerCorrectiveActionWorkspace>({
    enabled: legacyOpen && Boolean(planId) && isCustomer,
    queryKey: ["corrective-action-workspace", "customer", planId],
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      return (
        await api.get<CustomerCorrectiveActionWorkspace>(
          `/audit-findings/customer/plan/${planId}`,
        )
      ).data;
    },
  });

  const planQuery = useQuery<AuditPlanSummary>({
    enabled: legacyOpen && Boolean(planId) && !isCustomer,
    queryKey: ["corrective-action-workspace", "plan", planId],
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      return (await api.get<AuditPlanSummary>(`/audit-plans/${planId}`)).data;
    },
  });

  const findingsQuery = useQuery<AuditFindingDetail[]>({
    enabled: legacyOpen && Boolean(planId) && !isCustomer,
    queryKey: ["corrective-action-workspace", "findings", planId],
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      return (await api.get<AuditFindingDetail[]>(`/audit-findings/plan/${planId}`)).data;
    },
  });

  const documentsQuery = useQuery<AuditDocumentPreview>({
    enabled: legacyOpen && Boolean(planId) && !isCustomer,
    queryKey: ["corrective-action-workspace", "documents", planId],
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      return (await api.get<AuditDocumentPreview>(`/audit-documents/plan/${planId}`)).data;
    },
  });

  const planData = isCustomer
    ? customerWorkspaceQuery.data?.plan
    : planQuery.data;

  const findingsData = useMemo(
    () => isCustomer
      ? customerWorkspaceQuery.data?.findings ?? []
      : findingsQuery.data ?? [],
    [customerWorkspaceQuery.data?.findings, findingsQuery.data, isCustomer],
  );

  const workspaceLoading = isCustomer
    ? customerWorkspaceQuery.isLoading
    : findingsQuery.isLoading || planQuery.isLoading;

  const workspaceError = isCustomer
    ? customerWorkspaceQuery.error
    : findingsQuery.error ?? planQuery.error;

  const refresh = async () => {
    if (page) { await onChanged?.(); return; }
    if (isCustomer) {
      await Promise.all([
        customerWorkspaceQuery.refetch(),
        onChanged?.(),
      ]);
      return;
    }

    await Promise.all([
      planQuery.refetch(),
      findingsQuery.refetch(),
      documentsQuery.refetch(),
      onChanged?.(),
    ]);
  };

  const allNc = useMemo(
    () => findingsData.filter(isNc),
    [findingsData],
  );

  useEffect(() => {
    if (!open || !initialFindingId) return;
    const focused = allNc.find((item) => item.id === initialFindingId);
    if (!focused) return;
    const timer = window.setTimeout(() => {
      setFilter(normalize(focused.status) === "closed" ? "all" : "open");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [allNc, initialFindingId, open]);

  const summary = useMemo(() => {
    const closed = allNc.filter((item) => normalize(item.status) === "closed").length;
    const waitingReview = allNc.filter((item) =>
      ["response_submitted"].includes(normalize(item.status)),
    ).length;
    const revision = allNc.filter((item) => normalize(item.status) === "revision_required").length;
    const overdue = allNc.filter((item) => item.is_overdue && normalize(item.status) !== "closed").length;
    return {
      total: allNc.length,
      closed,
      open: allNc.length - closed,
      waitingReview,
      revision,
      overdue,
      progress: allNc.length ? Math.round((closed / allNc.length) * 100) : 100,
    };
  }, [allNc]);

  const filteredNc = useMemo(() => {
    const visible = filter === "closed"
      ? allNc.filter((item) => normalize(item.status) === "closed")
      : filter === "open"
        ? allNc.filter((item) => normalize(item.status) !== "closed")
        : [...allNc];

    if (!initialFindingId) return visible;
    return [...visible].sort((left, right) => {
      if (left.id === initialFindingId) return -1;
      if (right.id === initialFindingId) return 1;
      return 0;
    });
  }, [allNc, filter, initialFindingId]);

  const f10CardByFinding = useMemo(() => {
    const map = new Map<string, AuditDocumentCard>();
    for (const document of documentsQuery.data?.documents ?? []) {
      if (document.document_type === "corrective_action_request_f10" && document.finding_id) {
        map.set(document.finding_id, document);
      }
    }
    return map;
  }, [documentsQuery.data]);

  const createResponseMutation = useMutation({
    mutationFn: async (values: CorrectiveActionFormValues) => {
      if (page && !page.data.allowed_actions.respond) throw new Error("Thao tác không còn khả dụng. Vui lòng tải lại.");
      if (!responseFinding) throw new Error("Chưa chọn điểm không phù hợp");
      const customerRole = normalizedRoles.includes("customer");
      const endpoint = customerRole
        ? `/audit-findings/${responseFinding.id}/corrective-actions`
        : `/audit-findings/${responseFinding.id}/corrective-actions/internal`;
      return (
        await api.post<CorrectiveActionVersion>(endpoint, {
          root_cause: values.root_cause.trim(),
          correction: values.correction.trim(),
          corrective_action_plan: values.corrective_action_plan.trim(),
          responsible_person: values.responsible_person?.trim() || undefined,
          target_date: values.target_date?.format("YYYY-MM-DD"),
          custom_content: {
            customer_comment: values.customer_comment?.trim() || "",
          },
        })
      ).data;
    },
    onSuccess: async (action) => {
      message.success(`Đã lưu phản hồi CAP phiên bản ${action.version_no}.`);
      setResponseFinding(null);
      responseForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const uploadEvidenceMutation = useMutation({
    mutationFn: async () => {
      if (page && !page.data.allowed_actions.upload_evidence) throw new Error("Không có quyền tải bằng chứng.");
      const rawFile = evidenceFiles[0]?.originFileObj;
      if (!evidenceTarget || !rawFile) throw new Error("Chưa chọn tệp bằng chứng");
      const formData = new FormData();
      formData.append("file", rawFile);
      formData.append(
        "note",
        `Bằng chứng CAP ${evidenceTarget.finding.finding_code} · phiên bản ${evidenceTarget.action.version_no}`,
      );

      const endpoint = isCustomer
        ? `/document-files/customer/corrective-actions/${evidenceTarget.action.id}/evidence`
        : "/document-files/upload";

      if (!isCustomer) {
        formData.append("entity_type", "corrective_action");
        formData.append("entity_id", evidenceTarget.action.id);
        formData.append("document_type", "corrective_action_evidence");
        formData.append("file_kind", "attachment");
      }

      return (
        await api.post<EvidenceFile>(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120_000,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã tải bằng chứng hành động khắc phục.");
      setEvidenceTarget(null);
      setEvidenceFiles([]);
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const reviewMutation = useMutation({
    mutationFn: async (values: ReviewFormValues) => {
      if (page && !page.data.allowed_actions.review) throw new Error("Không có quyền thẩm xét CAP.");
      if (!reviewTarget) throw new Error("Chưa chọn phản hồi để xem xét");
      return (
        await api.patch(
          `/audit-findings/${reviewTarget.finding.id}/corrective-actions/${reviewTarget.action.id}/review`,
          {
            review_result: values.review_result,
            review_comment: values.review_comment?.trim() || undefined,
          },
        )
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã ghi nhận kết quả xem xét CAP.");
      setReviewTarget(null);
      reviewForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const closeMutation = useMutation({
    mutationFn: async (values: CloseFormValues) => {
      if (page && !page.data.allowed_actions.close) throw new Error("Không có quyền đóng NC.");
      if (!closeFinding) throw new Error("Chưa chọn NC cần đóng");
      return (
        await api.patch(`/audit-findings/${closeFinding.id}/close`, {
          close_comment: values.close_comment?.trim() || undefined,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã đóng điểm không phù hợp.");
      setCloseFinding(null);
      closeForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const generateF10Mutation = useMutation({
    mutationFn: async ({
      findingId,
      format,
    }: {
      findingId: string;
      format: "docx" | "pdf";
    }) => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      return (
        await api.post<GeneratedDocumentResponse>(
          `/audit-documents/plan/${planId}/generate`,
          {},
          {
            params: {
              documentType: "corrective_action_request_f10",
              findingId,
              format,
            },
            timeout: 180_000,
          },
        )
      ).data;
    },
    onSuccess: async (result) => {
      message.success(`Đã sinh ${result.form_code} ${result.format === "pdf" ? "PDF" : "Word"}.`);
      await refresh();
      await downloadFile(result.document);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const downloadFile = async (file: EvidenceFile) => {
    try {
      await downloadDocumentFile({
        url: file.download_url,
        filename: file.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const openResponse = (finding: AuditFindingDetail) => {
    const latest = finding.corrective_actions[0];
    responseForm.setFieldsValue({
      root_cause: latest?.root_cause ?? "",
      correction: latest?.correction ?? "",
      corrective_action_plan: latest?.corrective_action_plan ?? "",
      responsible_person: latest?.responsible_person ?? "",
      target_date: latest?.target_date ? dayjs(latest.target_date) : undefined,
      customer_comment: typeof latest?.form_data?.custom_content === "object"
        ? String((latest.form_data?.custom_content as Record<string, unknown>)?.customer_comment ?? "")
        : "",
    });
    setResponseFinding(finding);
  };

  const openReview = (finding: AuditFindingDetail, action: CorrectiveActionVersion) => {
    reviewForm.setFieldsValue({
      review_result: "accepted",
      review_comment: action.review_comment ?? "",
    });
    setReviewTarget({ finding, action });
  };

  const renderActionTimeline = (finding: AuditFindingDetail) => {
    const actions = [...finding.corrective_actions].sort((left, right) => left.version_no - right.version_no);
    const latestActionId = finding.corrective_actions[0]?.id;
    if (!actions.length) {
      return <Empty description="Khách hàng chưa gửi phản hồi hành động khắc phục" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
    return (
      <Timeline
        items={actions.map((action) => ({
          color: statusColor(action.status),
          children: (
            <Card
              size="small"
              title={(
                <Space wrap>
                  <strong>CAP phiên bản {action.version_no}</strong>
                  <Tag color={statusColor(action.status)}>{statusLabel(action.status)}</Tag>
                </Space>
              )}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Nguyên nhân gốc rễ">{action.root_cause}</Descriptions.Item>
                <Descriptions.Item label="Sửa chữa tức thời">{action.correction}</Descriptions.Item>
                <Descriptions.Item label="Hành động khắc phục">{action.corrective_action_plan}</Descriptions.Item>
                <Descriptions.Item label="Người phụ trách">{action.responsible_person || "—"}</Descriptions.Item>
                <Descriptions.Item label="Ngày dự kiến hoàn thành">{formatDate(action.target_date)}</Descriptions.Item>
                <Descriptions.Item label="Người gửi">{displayUser(action.submitted_by_user)}</Descriptions.Item>
                <Descriptions.Item label="Thời điểm gửi">{formatDate(action.submitted_at, true)}</Descriptions.Item>
                {action.reviewed_at ? (
                  <Descriptions.Item label="Kết quả xem xét">
                    <Space wrap>
                      <Tag color={statusColor(action.status)}>{statusLabel(action.status)}</Tag>
                      <span>{action.review_comment || "Không có nhận xét"}</span>
                      <Text type="secondary">· {displayUser(action.reviewed_by_user)} · {formatDate(action.reviewed_at, true)}</Text>
                    </Space>
                  </Descriptions.Item>
                ) : null}
              </Descriptions>

              <div style={{ marginTop: 12 }}>
                <Text strong>Bằng chứng thực hiện</Text>
                {action.evidence_files?.length ? (
                  <List
                    dataSource={action.evidence_files}
                    size="small"
                    renderItem={(file) => (
                      <List.Item
                        actions={[
                          <Button
                            icon={<DownloadOutlined />}
                            key="download"
                            onClick={() => void downloadFile(file)}
                            size="small"
                            type="text"
                          />,
                        ]}
                      >
                        <List.Item.Meta
                          title={file.original_name}
                          description={`Phiên bản ${file.version_no ?? 1} · ${formatDate(file.created_at, true)}`}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Alert message="Chưa có tệp bằng chứng" showIcon type="warning" />
                )}
              </div>

              <Space style={{ marginTop: 12 }} wrap>
                {canUploadEvidence && (
                  isCustomer
                    ? action.id === latestActionId
                      && normalize(action.status) === "submitted"
                      && normalize(finding.status) === "response_submitted"
                    : normalize(finding.status) !== "closed"
                ) ? (
                  <Button
                    icon={<UploadOutlined />}
                    onClick={() => {
                      setEvidenceFiles([]);
                      setEvidenceTarget({ finding, action });
                    }}
                    size="small"
                  >
                    Tải bằng chứng
                  </Button>
                ) : null}
                {canReview && normalize(finding.status) !== "closed" && normalize(action.status) === "submitted" ? (
                  <Button
                    icon={<SafetyCertificateOutlined />}
                    onClick={() => openReview(finding, action)}
                    size="small"
                    type="primary"
                  >
                    Xem xét CAP
                  </Button>
                ) : null}
              </Space>
            </Card>
          ),
        }))}
      />
    );
  };

  const content = workspaceLoading ? (
    <Skeleton active paragraph={{ rows: 14 }} />
  ) : workspaceError ? (
    <Alert
      action={<Button icon={<ReloadOutlined />} onClick={() => void refresh()}>Thử lại</Button>}
      description={getErrorMessage(workspaceError)}
      message="Không tải được không gian NC/CAP"
      showIcon
      type="error"
    />
  ) : !allNc.length ? (
    <Empty description="Cuộc đánh giá không có NC nhẹ hoặc NC nặng">
      <Alert
        description="Điểm phù hợp, quan sát và OFI không yêu cầu hành động khắc phục nên không hiển thị tại đây."
        message="Không áp dụng F.10"
        showIcon
        type="success"
      />
    </Empty>
  ) : (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
        <Card size="small"><Statistic title="Tổng NC" value={summary.total} /></Card>
        <Card size="small"><Statistic title="Đang xử lý" value={summary.open} /></Card>
        <Card size="small"><Statistic title="Chờ xem xét" value={summary.waitingReview} /></Card>
        <Card size="small"><Statistic title="Quá hạn" value={summary.overdue} valueStyle={summary.overdue ? { color: "#cf1322" } : undefined} /></Card>
        <Card size="small"><Statistic title="Đã đóng" value={summary.closed} /></Card>
      </div>

      <Card size="small">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>Tiến độ xử lý NC/CAP</Title>
              <Text type="secondary">
                {isCustomer
                  ? "Khách hàng nhập CAP và tải bằng chứng cho từng NC. Việc xem xét/đóng NC do đoàn đánh giá thực hiện."
                  : "Chỉ chuyển thẩm xét kỹ thuật khi báo cáo đã nộp và toàn bộ NC bắt buộc đã đóng."}
              </Text>
            </div>
            <Segmented<FilterKey>
              onChange={setFilter}
              options={[
                { label: `Đang xử lý (${summary.open})`, value: "open" },
                { label: `Đã đóng (${summary.closed})`, value: "closed" },
                { label: `Tất cả (${summary.total})`, value: "all" },
              ]}
              value={filter}
            />
          </div>
          <Progress percent={summary.progress} status={summary.progress === 100 ? "success" : "active"} />
        </Space>
      </Card>

      <Collapse
        items={filteredNc.map((finding) => {
          const latest = finding.corrective_actions[0] ?? null;
          const f10 = f10CardByFinding.get(finding.id);
          const currentF10 = f10?.history.filter((file) => file.is_current) ?? [];
          const canClose = canReview
            && normalize(finding.status) === "action_accepted"
            && Boolean(latest);
          const canSubmitResponse = canEnterResponse && (
            isCustomer
              ? ["open", "revision_required"].includes(normalize(finding.status))
              : normalize(finding.status) !== "closed"
                && normalize(finding.status) !== "action_accepted"
          );
          return {
            key: finding.id,
            label: (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", width: "100%" }}>
                <Space wrap>
                  <strong>{finding.finding_code}</strong>
                  {finding.id === initialFindingId ? <Tag color="blue">Công việc đang mở</Tag> : null}
                  <Tag color={normalize(finding.finding_type) === "major_nc" ? "red" : "orange"}>
                    {ncTypeLabels[normalize(finding.finding_type)] ?? finding.finding_type}
                  </Tag>
                  <Tag color={statusColor(finding.status)}>{statusLabel(finding.status)}</Tag>
                  {finding.is_overdue && normalize(finding.status) !== "closed" ? (
                    <Tag color="red" icon={<WarningOutlined />}>Quá hạn</Tag>
                  ) : null}
                </Space>
                <Text type="secondary">Hạn: {formatDate(finding.due_date)}</Text>
              </div>
            ),
            children: (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Card size="small" title="Nội dung điểm không phù hợp">
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="Điều khoản">{finding.clause || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Ngày phát hiện">{formatDate(finding.detected_date)}</Descriptions.Item>
                    <Descriptions.Item label="Yêu cầu" span={2}>{finding.requirement || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Mô tả NC" span={2}>{finding.description}</Descriptions.Item>
                    <Descriptions.Item label="Bằng chứng khách quan" span={2}>{finding.objective_evidence}</Descriptions.Item>
                  </Descriptions>
                </Card>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <Space wrap>
                    {canSubmitResponse ? (
                      <Button icon={<FormOutlined />} onClick={() => openResponse(finding)} type="primary">
                        {latest ? "Gửi phiên bản CAP mới" : "Nhập phản hồi khắc phục"}
                      </Button>
                    ) : null}
                    {onOpenFinding ? <Button onClick={() => onOpenFinding(finding.id)}>Mở trang HĐKP</Button> : null}
                    {canClose ? (
                      <Button icon={<CheckCircleOutlined />} onClick={() => setCloseFinding(finding)}>
                        Đóng NC
                      </Button>
                    ) : null}
                  </Space>
                  {!isCustomer ? (
                    <Space wrap>
                      <Button
                        icon={<FileWordOutlined />}
                        loading={generateF10Mutation.isPending
                          && generateF10Mutation.variables?.findingId === finding.id
                          && generateF10Mutation.variables?.format === "docx"}
                        onClick={() => generateF10Mutation.mutate({ findingId: finding.id, format: "docx" })}
                      >
                        Xuất F.10 Word
                      </Button>
                      <Button
                        icon={<FilePdfOutlined />}
                        loading={generateF10Mutation.isPending
                          && generateF10Mutation.variables?.findingId === finding.id
                          && generateF10Mutation.variables?.format === "pdf"}
                        onClick={() => generateF10Mutation.mutate({ findingId: finding.id, format: "pdf" })}
                      >
                        Xuất PDF
                      </Button>
                    </Space>
                  ) : null}
                </div>

                {currentF10.length ? (
                  <Alert
                    action={(
                      <Space>
                        {currentF10.map((file) => (
                          <Button icon={<DownloadOutlined />} key={file.id} onClick={() => void downloadFile(file)} size="small">
                            {file.file_kind === "generated_pdf" ? "PDF" : "Word"} v{file.version_no ?? 1}
                          </Button>
                        ))}
                      </Space>
                    )}
                    message={`F.10 hiện hành · ${currentF10.length} định dạng`}
                    showIcon
                    type="success"
                  />
                ) : null}

                <Card extra={<Tag>{finding.corrective_actions.length} phiên bản</Tag>} size="small" title={<Space><HistoryOutlined /> Lịch sử CAP và bằng chứng</Space>}>
                  {renderActionTimeline(finding)}
                </Card>
              </Space>
            ),
          };
        })}
      />
    </Space>
  );

  return (
    <>
      {page ? <CapWorkspaceView
        {...page}
        editing={Boolean(responseFinding || reviewTarget || closeFinding)}
        onRefresh={() => void refresh()}
        onRespond={() => {
          page.onVersion(null);
          page.onSection("response");
          openResponse(page.data.finding);
        }}
        onReview={(action) => openReview(page.data.finding, action)}
        onClose={() => setCloseFinding(page.data.finding)}
        onUpload={(action) => { setEvidenceFiles([]); setEvidenceTarget({ finding: page.data.finding, action }); }}
        onDownload={(file) => void downloadFile(file)}
      /> : <Modal
        destroyOnHidden
        footer={null}
        maskClosable={false}
        onCancel={onClose}
        open={open}
        title={(
          <div>
            <span style={{ color: "#667085", display: "block", fontSize: 12, fontWeight: 500 }}>KHÔNG GIAN NC & HÀNH ĐỘNG KHẮC PHỤC</span>
            <strong>{planData?.plan_code || "Đang tải kế hoạch..."}</strong>
            {planData?.certification_projects?.certification_applications?.customers?.company_name ? (
              <Text style={{ display: "block" }} type="secondary">
                {planData.certification_projects.certification_applications.customers.company_name}
              </Text>
            ) : null}
          </div>
        )}
        width={1180}
      >
        {content}
      </Modal>}

      <ResponseContainer
        page={Boolean(page)}
        cancelText="Hủy"
        destroyOnHidden
        maskClosable={false}
        okButtonProps={{ loading: createResponseMutation.isPending }}
        okText="Lưu và gửi phản hồi"
        onCancel={() => {
          setResponseFinding(null);
          responseForm.resetFields();
        }}
        onOk={() => responseForm.submit()}
        open={Boolean(responseFinding) && (!page || (page.section === "response" && !page.versionId))}
        title={`Phản hồi CAP · ${responseFinding?.finding_code ?? ""}`}
        width={820}
      >
        <Form<CorrectiveActionFormValues>
          form={responseForm}
          layout="vertical"
          onFinish={(values) => createResponseMutation.mutate(values)}
        >
          <Alert
            description="Mỗi lần gửi tạo một phiên bản mới. Phiên bản cũ được giữ nguyên để truy xuất."
            message="Phân tích nguyên nhân và hành động khắc phục"
            showIcon
            style={{ marginBottom: 16 }}
            type="info"
          />
          <Form.Item name="root_cause" label="Nguyên nhân gốc rễ" rules={[{ required: true, message: "Nhập nguyên nhân gốc rễ" }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="correction" label="Hành động sửa chữa tức thời" rules={[{ required: true, message: "Nhập hành động sửa chữa tức thời" }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="corrective_action_plan" label="Kế hoạch hành động khắc phục" rules={[{ required: true, message: "Nhập kế hoạch hành động khắc phục" }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <div className={page ? "cmp-cap-response-grid" : undefined} style={page ? undefined : { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="responsible_person" label="Người phụ trách">
              <Input />
            </Form.Item>
            <Form.Item name="target_date" label="Ngày dự kiến hoàn thành">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item name="customer_comment" label="Ghi chú của khách hàng/người nhập">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </ResponseContainer>

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        maskClosable={false}
        okButtonProps={{ loading: uploadEvidenceMutation.isPending }}
        okText="Tải bằng chứng"
        onCancel={() => {
          setEvidenceTarget(null);
          setEvidenceFiles([]);
        }}
        onOk={() => uploadEvidenceMutation.mutate()}
        open={Boolean(evidenceTarget)}
        title={`Bằng chứng CAP · ${evidenceTarget?.finding.finding_code ?? ""}`}
      >
        <Upload.Dragger
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          beforeUpload={() => false}
          fileList={evidenceFiles}
          maxCount={1}
          onChange={({ fileList }) => setEvidenceFiles(fileList.slice(-1))}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Chọn hoặc kéo tệp bằng chứng vào đây</p>
          <p className="ant-upload-hint">PDF, Word, JPG hoặc PNG; tối đa 20 MB.</p>
        </Upload.Dragger>
      </Modal>

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        maskClosable={false}
        okButtonProps={{ loading: reviewMutation.isPending }}
        okText="Ghi nhận kết quả"
        onCancel={() => {
          setReviewTarget(null);
          reviewForm.resetFields();
        }}
        onOk={() => reviewForm.submit()}
        open={Boolean(reviewTarget)}
        title={`Xem xét CAP · ${reviewTarget?.finding.finding_code ?? ""}`}
        width={680}
      >
        <Form<ReviewFormValues>
          form={reviewForm}
          layout="vertical"
          onFinish={(values) => reviewMutation.mutate(values)}
        >
          {!reviewTarget?.action.evidence_files?.length ? (
            <Alert
              description="Backend sẽ không cho chấp nhận CAP khi chưa có bằng chứng thực hiện."
              message="Chưa có bằng chứng"
              showIcon
              style={{ marginBottom: 16 }}
              type="warning"
            />
          ) : null}
          <Form.Item name="review_result" label="Kết quả xem xét" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Chấp nhận hành động khắc phục", value: "accepted" },
                { label: "Yêu cầu bổ sung/chỉnh sửa", value: "revision_required" },
              ]}
            />
          </Form.Item>
          <Form.Item name="review_comment" label="Nhận xét xem xét" rules={[{ required: true, message: "Nhập nhận xét xem xét" }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        maskClosable={false}
        okButtonProps={{ loading: closeMutation.isPending }}
        okText="Đóng NC"
        onCancel={() => {
          setCloseFinding(null);
          closeForm.resetFields();
        }}
        onOk={() => closeForm.submit()}
        open={Boolean(closeFinding)}
        title={`Đóng điểm không phù hợp · ${closeFinding?.finding_code ?? ""}`}
      >
        <Alert
          description="Sau khi đóng, NC được khóa. Khi toàn bộ NC đã đóng và báo cáo đã nộp, hồ sơ sẽ chuyển sang trạng thái sẵn sàng thẩm xét."
          message="Xác nhận đóng NC"
          showIcon
          style={{ marginBottom: 16 }}
          type="success"
        />
        <Form<CloseFormValues> form={closeForm} layout="vertical" onFinish={(values) => closeMutation.mutate(values)}>
          <Form.Item name="close_comment" label="Nhận xét khi đóng NC">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
