"use client";

import {
  CheckCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  NotificationOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
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
  type ModalProps,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader, ReadOnlyState, DomainStatusBadge } from "./design-system";

import { api, getErrorMessage } from "../lib/api";
import { downloadDocumentFile } from "../lib/document-file-client";

const { Text, Title } = Typography;

type FocusTab = "overview" | "decision" | "notification";

interface GeneratedFile {
  id: string;
  original_name: string;
  file_kind: string;
  version_no?: number | null;
  is_current?: boolean | null;
  created_at?: string | null;
  download_url?: string | null;
}

interface DecisionRecord {
  id: string;
  technical_review_id: string;
  decision_number: string;
  decision_date: string;
  decision_result: string;
  decision_type?: DecisionType | null;
  certificate_series_id?: string | null;
  organization_name: string;
  organization_address?: string | null;
  management_system?: string | null;
  standard_name: string;
  certification_scope: string;
  effective_date?: string | null;
  expiry_date?: string | null;
  surveillance_interval_months?: number | null;
  signatory_name: string;
  signatory_title: string;
  status: string;
  change_reason?: string | null;
  note?: string | null;
  lifecycle?: {
    requires_certificate_version: boolean;
    preserves_current_certificate: boolean;
  } | null;
}

type DecisionType =
  | "GRANT"
  | "MAINTAIN"
  | "RECERTIFY"
  | "AMEND"
  | "EXTEND_SCOPE"
  | "REDUCE_SCOPE"
  | "SUSPEND"
  | "RESTORE"
  | "WITHDRAW"
  | "REFUSE";

interface CertificateSummary {
  id: string;
  certificate_series_id: string;
  cert_number: string;
  version_no: number;
  issue_date?: string | null;
  expire_date?: string | null;
  status?: string | null;
  organization_name: string;
  organization_address?: string | null;
  management_system?: string | null;
  standard_name: string;
  certification_scope: string;
  verification_code: string;
  official_pdf_available: boolean;
}

interface NotificationRecord {
  id: string;
  technical_review_id: string;
  certification_decision_id?: string | null;
  notification_number: string;
  notification_date: string;
  audit_type: string;
  audit_start_date?: string | null;
  audit_end_date?: string | null;
  notification_result: string;
  has_certification_changes: boolean;
  organization_name: string;
  organization_address?: string | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  management_system?: string | null;
  standard_name: string;
  certification_scope: string;
  next_audit_due_date?: string | null;
  signatory_name: string;
  signatory_title: string;
  status: string;
  sent_at?: string | null;
}

export interface DecisionWorkspace {
  case_id?: string;
  can_generate_decision?: boolean;
  independence?: string;
  assignment_basis?: string;
  upstream_errors?: string[];
  supporting_documents?: GeneratedFile[];
  plan: {
    id: string;
    plan_code?: string | null;
    audit_type?: string | null;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
    project_id: string;
    project_code: string;
  };
  lifecycle_type: "initial" | "surveillance" | "recertification" | "special";
  is_surveillance: boolean;
  requires_decision_by_default: boolean;
  surveillance_no_change_allowed: boolean;
  allowed_decision_types: DecisionType[];
  current_status: string | null;
  allowed_status_actions: Array<"SUSPEND" | "RESTORE" | "WITHDRAW">;
  certificate_series: Array<{
    id: string;
    series_code: string;
    status: string;
    current_certificate: CertificateSummary | null;
    allowed_status_actions: Array<"SUSPEND" | "RESTORE" | "WITHDRAW">;
  }>;
  active_certificate: CertificateSummary | null;
  current_certificate: CertificateSummary | null;
  report: {
    id: string;
    report_code?: string | null;
    status?: string | null;
    audit_start_date?: string | null;
    audit_end_date?: string | null;
  } | null;
  technical_review: {
    id: string;
    status: string;
    completed_at?: string | null;
    reviewer_name?: string | null;
    recommendation?: string | null;
    recommendation_comment?: string | null;
    conditions?: string | null;
  } | null;
  decision: DecisionRecord | null;
  notification: NotificationRecord | null;
  decision_history: GeneratedFile[];
  notification_history: GeneratedFile[];
  can_issue_decision: boolean;
  can_issue_notification: boolean;
  eligibility_errors: string[];
  defaults: {
    organization_name: string;
    organization_name_en?: string | null;
    organization_address: string;
    standard_name: string;
    management_system: string;
    certification_scope: string;
    contract_number?: string | null;
    contract_date?: string | null;
    agreement_number?: string | null;
    agreement_date?: string | null;
    decision_number: string;
    decision_date: string;
    effective_date: string;
    expiry_date: string;
    surveillance_interval_months: number;
    audit_type: "initial" | "surveillance" | "recertification" | "special";
    notification_result: NotificationFormValues["notification_result"];
    has_certification_changes: boolean;
    notification_number: string;
    notification_date: string;
    audit_start_date?: string | null;
    audit_end_date?: string | null;
    next_audit_due_date?: string | null;
    recipient_name?: string | null;
    recipient_email?: string | null;
    signatory_name?: string | null;
    signatory_title?: string | null;
  };
}

interface DecisionFormValues {
  decision_number: string;
  decision_date: Dayjs;
  decision_result: "approved" | "rejected" | "deferred";
  decision_type: DecisionType;
  certificate_series_id?: string;
  organization_name: string;
  organization_address?: string;
  management_system?: string;
  standard_name: string;
  certification_scope: string;
  change_reason?: string;
  effective_date?: Dayjs;
  expiry_date?: Dayjs;
  surveillance_interval_months: number;
  signatory_name: string;
  signatory_title: string;
  note?: string;
}

interface NotificationFormValues {
  notification_number: string;
  notification_date: Dayjs;
  notification_result:
    | "certification_granted"
    | "certification_maintained"
    | "certification_not_granted"
    | "certification_suspended"
    | "certification_withdrawn";
  has_certification_changes?: boolean;
  organization_name: string;
  organization_address?: string;
  recipient_name?: string;
  recipient_email?: string;
  management_system?: string;
  standard_name: string;
  certification_scope: string;
  audit_start_date?: Dayjs;
  audit_end_date?: Dayjs;
  next_audit_due_date?: Dayjs;
  signatory_name: string;
  signatory_title: string;
  note?: string;
}

interface Props {
  open: boolean;
  planId: string | null;
  focus?: FocusTab;
  roles: string[];
  preferredDecisionType?: DecisionType | null;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
  page?: { data: DecisionWorkspace; section: "overview" | "decision"; onSection: (key: string) => void; context?: ReactNode };
}

function ResultContainer({ page, children, ...props }: ModalProps & { page: boolean }) {
  return page ? <section className="cmp-decision-content">{children}</section> : <Modal {...props}>{children}</Modal>;
}

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}

function resultLabel(value?: string | null) {
  const labels: Record<string, string> = {
    certification_recommended: "Kiến nghị chứng nhận",
    certification_not_recommended: "Không kiến nghị chứng nhận",
    approved: "Chấp thuận",
    rejected: "Không chấp thuận",
    deferred: "Hoãn quyết định",
    certification_granted: "Cấp chứng nhận",
    certification_maintained: "Duy trì chứng nhận",
    certification_not_granted: "Không cấp chứng nhận",
    certification_suspended: "Đình chỉ chứng nhận",
    certification_withdrawn: "Thu hồi chứng nhận",
  };
  return labels[value ?? ""] ?? (value || "—").replaceAll("_", " ");
}

const decisionTypeLabels: Record<DecisionType, string> = {
  GRANT: "Cấp chứng nhận",
  MAINTAIN: "Duy trì chứng nhận",
  RECERTIFY: "Tái chứng nhận",
  AMEND: "Sửa đổi chứng chỉ",
  EXTEND_SCOPE: "Mở rộng phạm vi chứng nhận",
  REDUCE_SCOPE: "Thu hẹp phạm vi chứng nhận",
  SUSPEND: "Đình chỉ chứng chỉ",
  RESTORE: "Khôi phục hiệu lực chứng chỉ",
  WITHDRAW: "Thu hồi chứng chỉ",
  REFUSE: "Từ chối cấp chứng nhận",
};

const decisionConsequences: Record<DecisionType, string> = {
  GRANT: "Sau khi chấp thuận, hệ thống sẽ cho phép phát hành chứng chỉ lần đầu.",
  MAINTAIN: "Chứng chỉ hiện hành tiếp tục có hiệu lực. Không phát hành phiên bản mới.",
  RECERTIFY: "Sau khi chấp thuận, hệ thống sẽ cho phép phát hành phiên bản chứng chỉ mới trong cùng dòng chứng nhận và giữ nguyên toàn bộ lịch sử của phiên bản trước.",
  AMEND: "Hệ thống sẽ tạo phiên bản chứng chỉ mới và lưu phiên bản hiện tại trong lịch sử.",
  EXTEND_SCOPE: "Hệ thống sẽ tạo phiên bản mới với phạm vi chứng nhận được mở rộng.",
  REDUCE_SCOPE: "Hệ thống sẽ tạo phiên bản mới với phạm vi chứng nhận được thu hẹp.",
  SUSPEND: "Chứng chỉ hiện hành chuyển sang Đình chỉ. Phiên bản, PDF và mã xác minh không thay đổi.",
  RESTORE: "Chứng chỉ đang đình chỉ được khôi phục hiệu lực nếu chưa hết hạn. Không phát hành phiên bản mới.",
  WITHDRAW: "Chứng chỉ hiện hành chuyển sang Đã thu hồi và không thể khôi phục. Không phát hành phiên bản mới.",
  REFUSE: "Không cấp chứng nhận và không tạo phiên bản chứng chỉ.",
};

const statusLabels: Record<string, string> = {
  active: "Đang hiệu lực",
  suspended: "Đình chỉ",
  withdrawn: "Đã thu hồi",
  expired: "Hết hiệu lực",
  replaced: "Đã được thay thế",
};

function statusLabel(value?: string | null) {
  return statusLabels[(value ?? "").trim().toLowerCase()] ?? "—";
}

function decisionTypeLabel(value?: string | null) {
  return decisionTypeLabels[value as DecisionType] ?? "—";
}

export default function CertificationResultWorkspaceModal({
  open,
  planId,
  focus = "overview",
  roles,
  preferredDecisionType,
  onClose,
  onChanged,
  page,
}: Props) {
  const { message, modal } = App.useApp();
  const [decisionForm] = Form.useForm<DecisionFormValues>();
  const [notificationForm] = Form.useForm<NotificationFormValues>();
  const tabContext = `${planId ?? ""}:${focus}`;
  const [tabSelection, setTabSelection] = useState<{
    context: string;
    tab: FocusTab;
  } | null>(null);
  const activeTab = page?.section ?? (tabSelection?.context === tabContext
    ? tabSelection.tab
    : focus);
  const setActiveTab = (tab: FocusTab) => {
    if (page) { page.onSection(tab === "notification" ? "decision" : tab); return; }
    setTabSelection({ context: tabContext, tab });
  };
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  const normalizedRoles = useMemo(() => roles.map(normalize), [roles]);
  const canDecision = normalizedRoles.includes("decisionmaker") && (!page || page.data.can_issue_decision);
  const canCreateNotification = normalizedRoles.some((role) => ["admin", "decisionmaker"].includes(role));
  const canManageNotification = normalizedRoles.some((role) => ["admin", "decisionmaker", "coordinator"].includes(role));

  const workspaceQuery = useQuery<DecisionWorkspace>({
    enabled: !page && open && Boolean(planId),
    queryKey: ["certification-result-workspace", planId],
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch đánh giá");
      return (await api.get<DecisionWorkspace>(`/certification-results/plan/${planId}/workspace`)).data;
    },
  });

  const workspace = page?.data ?? workspaceQuery.data;
  const currentCertificate = workspace?.current_certificate ?? workspace?.active_certificate ?? null;
  const selectedDecisionType = Form.useWatch("decision_type", decisionForm);
  const selectedDecisionResult = Form.useWatch("decision_result", decisionForm);
  const proposedScope = Form.useWatch("certification_scope", decisionForm) ?? "";
  const isChangeDecision = Boolean(selectedDecisionType && ["AMEND", "EXTEND_SCOPE", "REDUCE_SCOPE"].includes(selectedDecisionType));
  const isRecertificationDecision = selectedDecisionType === "RECERTIFY";
  const isScopeChange = selectedDecisionType === "EXTEND_SCOPE" || selectedDecisionType === "REDUCE_SCOPE";
  const isStatusDecision = Boolean(selectedDecisionType && ["SUSPEND", "RESTORE", "WITHDRAW"].includes(selectedDecisionType));
  const selectedConsequence = selectedDecisionType
    ? decisionConsequences[selectedDecisionType]
    : "Chọn loại quyết định để xem tác động tới chứng chỉ.";

  useEffect(() => {
    if (selectedDecisionType !== "REFUSE") return;
    decisionForm.setFieldsValue({
      decision_result: "rejected",
      certificate_series_id: undefined,
    });
  }, [decisionForm, selectedDecisionType]);

  useEffect(() => {
    if (!workspace || workspace.decision) return;
    const value = workspace.defaults;
    decisionForm.setFieldsValue({
      decision_number: value.decision_number,
      decision_date: dayjs(value.decision_date),
      decision_result: "approved",
      decision_type: preferredDecisionType && workspace.allowed_decision_types.includes(preferredDecisionType)
        ? preferredDecisionType
        : workspace.allowed_decision_types[0],
      certificate_series_id: workspace.certificate_series.length === 1
        ? workspace.certificate_series[0].id
        : undefined,
      organization_name: value.organization_name,
      organization_address: value.organization_address,
      management_system: value.management_system,
      standard_name: value.standard_name,
      certification_scope: value.certification_scope,
      effective_date: dayjs(value.effective_date),
      expiry_date: dayjs(value.expiry_date),
      surveillance_interval_months: value.surveillance_interval_months || 12,
      signatory_name: value.signatory_name || "",
      signatory_title: value.signatory_title || "Tổng Giám đốc",
    });
  }, [decisionForm, preferredDecisionType, workspace]);

  useEffect(() => {
    if (page || !workspace || workspace.notification) return;
    const value = workspace.defaults;
    notificationForm.setFieldsValue({
      notification_number: value.notification_number,
      notification_date: dayjs(value.notification_date),
      notification_result: value.notification_result,
      has_certification_changes: value.has_certification_changes,
      organization_name: value.organization_name,
      organization_address: value.organization_address,
      recipient_name: value.recipient_name || "",
      recipient_email: value.recipient_email || "",
      management_system: value.management_system,
      standard_name: value.standard_name,
      certification_scope: value.certification_scope,
      audit_start_date: value.audit_start_date ? dayjs(value.audit_start_date) : undefined,
      audit_end_date: value.audit_end_date ? dayjs(value.audit_end_date) : undefined,
      next_audit_due_date: value.next_audit_due_date ? dayjs(value.next_audit_due_date) : undefined,
      signatory_name: value.signatory_name || "",
      signatory_title: value.signatory_title || "Tổng Giám đốc",
    });
  }, [notificationForm, workspace, page]);

  const refresh = async () => {
    await Promise.all([page ? Promise.resolve() : workspaceQuery.refetch(), onChanged?.()]);
  };

  const decisionMutation = useMutation({
    mutationFn: async (values: DecisionFormValues) => {
      if (!workspace?.technical_review?.id) throw new Error("Chưa có hồ sơ thẩm xét hoàn thành");
      return (
        await api.post<DecisionRecord>("/certification-decisions", {
          technical_review_id: workspace.technical_review.id,
          decision_number: values.decision_number.trim(),
          decision_date: values.decision_date.format("YYYY-MM-DD"),
          decision_result: values.decision_result,
          decision_type: values.decision_type,
          certificate_series_id: ["GRANT", "REFUSE"].includes(values.decision_type)
            ? undefined
            : values.certificate_series_id,
          organization_name: values.organization_name.trim(),
          organization_address: values.organization_address?.trim() || undefined,
          management_system: values.management_system?.trim() || undefined,
          standard_name: values.standard_name.trim(),
          certification_scope: values.certification_scope.trim(),
          change_reason: values.change_reason?.trim() || undefined,
          effective_date: values.effective_date?.format("YYYY-MM-DD"),
          expiry_date: values.expiry_date?.format("YYYY-MM-DD"),
          surveillance_interval_months: values.surveillance_interval_months,
          signatory_name: values.signatory_name.trim(),
          signatory_title: values.signatory_title.trim(),
          note: values.note?.trim() || undefined,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã ban hành quyết định chứng nhận");
      await refresh();
      setActiveTab("notification");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const submitDecision = (values: DecisionFormValues) => {
    if (
      values.decision_result !== "approved"
      || !["SUSPEND", "RESTORE", "WITHDRAW"].includes(values.decision_type)
    ) {
      decisionMutation.mutate(values);
      return;
    }

    const effectiveDate = values.effective_date?.format("DD/MM/YYYY") ?? "ngày đã chọn";
    const confirmation = values.decision_type === "SUSPEND"
      ? `Xác nhận đình chỉ hiệu lực chứng chỉ này từ ngày ${effectiveDate}?`
      : values.decision_type === "RESTORE"
        ? `Xác nhận khôi phục hiệu lực chứng chỉ từ ngày ${effectiveDate}?`
        : "Xác nhận thu hồi chứng chỉ này? Sau khi thu hồi, chứng chỉ không thể khôi phục.";

    modal.confirm({
      cancelText: "Hủy",
      content: decisionConsequences[values.decision_type],
      okButtonProps: values.decision_type === "WITHDRAW" ? { danger: true } : undefined,
      okText: values.decision_type === "WITHDRAW" ? "Xác nhận thu hồi" : "Xác nhận",
      onOk: () => decisionMutation.mutateAsync(values),
      title: confirmation,
    });
  };

  const notificationMutation = useMutation({
    mutationFn: async (values: NotificationFormValues) => {
      if (!workspace?.technical_review?.id) throw new Error("Chưa có hồ sơ thẩm xét hoàn thành");
      return (
        await api.post<NotificationRecord>("/audit-result-notifications", {
          technical_review_id: workspace.technical_review.id,
          certification_decision_id: workspace.decision?.id,
          notification_number: values.notification_number.trim(),
          notification_date: values.notification_date.format("YYYY-MM-DD"),
          audit_type: workspace.lifecycle_type,
          audit_start_date: values.audit_start_date?.format("YYYY-MM-DD"),
          audit_end_date: values.audit_end_date?.format("YYYY-MM-DD"),
          notification_result: values.notification_result,
          has_certification_changes: Boolean(values.has_certification_changes),
          organization_name: values.organization_name.trim(),
          organization_address: values.organization_address?.trim() || undefined,
          recipient_name: values.recipient_name?.trim() || undefined,
          recipient_email: values.recipient_email?.trim() || undefined,
          management_system: values.management_system?.trim() || undefined,
          standard_name: values.standard_name.trim(),
          certification_scope: values.certification_scope.trim(),
          next_audit_due_date: values.next_audit_due_date?.format("YYYY-MM-DD"),
          signatory_name: values.signatory_name.trim(),
          signatory_title: values.signatory_title.trim(),
          note: values.note?.trim() || undefined,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã lập thông báo kết quả đánh giá");
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const markSentMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.notification?.id) throw new Error("Chưa có thông báo");
      return (await api.post(`/audit-result-notifications/${workspace.notification.id}/mark-sent`, {})).data;
    },
    onSuccess: async () => {
      message.success("Đã ghi nhận thông báo được gửi cho khách hàng");
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const downloadFile = async (file: GeneratedFile) => {
    if (!file.download_url) return;
    setDownloadingId(file.id);
    try {
      await downloadDocumentFile({
        url: file.download_url,
        filename: file.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  };

  const generate = useMutation({
    mutationFn: async (input: { kind: "decision" | "notification"; format: "docx" | "pdf" }) => {
      const record = input.kind === "decision" ? workspace?.decision : workspace?.notification;
      if (!record?.id) throw new Error("Chưa có hồ sơ để xuất");
      return (
        await api.post<{ document: GeneratedFile }>(
          `/certification-results/${input.kind}/${record.id}/generate?format=${input.format}`,
        )
      ).data;
    },
    onSuccess: async (result) => {
      message.success("Đã sinh tài liệu");
      if (result.document?.download_url) await downloadFile(result.document);
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const renderHistory = (files: GeneratedFile[]) => (
    <List
      dataSource={files}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa sinh tài liệu" /> }}
      renderItem={(file) => (
        <List.Item
          actions={[
            <Button
              icon={<DownloadOutlined />}
              key="download"
              loading={downloadingId === file.id}
              onClick={() => void downloadFile(file)}
              size="small"
            >
              Tải
            </Button>,
          ]}
        >
          <List.Item.Meta
            avatar={file.file_kind === "generated_pdf" ? <FilePdfOutlined /> : <FileWordOutlined />}
            title={<Space><span>{file.original_name}</span>{file.is_current ? <Tag color="green">Hiện hành</Tag> : null}</Space>}
            description={`Phiên bản ${file.version_no ?? 1} · ${formatDate(file.created_at)}`}
          />
        </List.Item>
      )}
    />
  );

  const tabs = [
    { key: "overview", label: "Tổng quan" },
    {
      key: "decision",
      label: "Quyết định chứng nhận",
    },
    {
      key: "notification",
      label: workspace?.is_surveillance
        ? "Thông báo duy trì"
        : workspace?.lifecycle_type === "recertification"
          ? "Thông báo tái chứng nhận"
        : "Thông báo kết quả",
    },
  ];

  return (
    <ResultContainer
      page={Boolean(page)}
      destroyOnHidden
      footer={null}
      onCancel={() => {
        setTabSelection(null);
        onClose();
      }}
      open={open}
      title={(
        <div>
          <Text type="secondary">{workspace?.is_surveillance
            ? "KHÔNG GIAN KẾT QUẢ GIÁM SÁT"
            : workspace?.lifecycle_type === "recertification"
              ? "KHÔNG GIAN KẾT QUẢ TÁI CHỨNG NHẬN"
              : "KHÔNG GIAN KẾT QUẢ CHỨNG NHẬN"}</Text>
          <Title level={4} style={{ margin: "2px 0 0" }}>{workspace?.plan.plan_code || "Đang tải..."}</Title>
        </div>
      )}
      width={1180}
    >
      {workspaceQuery.isLoading ? <Skeleton active /> : null}
      {workspaceQuery.isError ? <Alert type="error" showIcon message="Không tải được dữ liệu" description={getErrorMessage(workspaceQuery.error)} /> : null}
      {workspace ? (
        <>
          {page ? <><PageHeader title="Quyết định chứng nhận" description={workspace.defaults.organization_name} metadata={<DomainStatusBadge domain="decisionResult" code={workspace.decision?.decision_result ?? "pending"} label={!workspace.decision ? "Chưa ban hành" : undefined} />} />{page.context}{!canDecision && !workspace.decision ? <ReadOnlyState reason={workspace.independence === "CONFLICT" ? "Tài khoản hiện tại có xung đột độc lập với thẩm xét hoặc đoàn đánh giá." : "Chưa có xác nhận quyền ban hành cho tài khoản hiện tại. Máy chủ kiểm tra lại quyền và điều kiện khi thao tác."} /> : null}</> : null}
          <Tabs activeKey={activeTab} items={page ? tabs.filter(tab => tab.key !== "notification") : tabs} onChange={(key) => setActiveTab(key as FocusTab)} />
          {page ? <><Space style={{ marginBottom: 16 }}>
            {activeTab === "overview" && !workspace.decision && canDecision ? <Button type="primary" onClick={() => setActiveTab("decision")}>Lập quyết định chứng nhận</Button> : null}
            <Button onClick={() => setDocumentsOpen(true)}>Tài liệu và lịch sử</Button>
          </Space><Drawer title="Tài liệu đầu vào và lịch sử quyết định" open={documentsOpen} onClose={() => setDocumentsOpen(false)} width={560}>
            <Title level={5}>Thẩm xét kỹ thuật F.11</Title>{renderHistory(workspace.supporting_documents ?? [])}
            <Title level={5}>Lịch sử quyết định F.13</Title>{renderHistory(workspace.decision_history)}
          </Drawer></> : null}

          {workspace.eligibility_errors.length ? (
            <Alert
              description={workspace.eligibility_errors.map((item) => <div key={item}>• {item}</div>)}
              message="Chưa đủ điều kiện lập kết quả chứng nhận"
              showIcon
              type="warning"
              style={{ marginBottom: 16 }}
            />
          ) : null}

          {workspace.is_surveillance ? (
            <Alert
              description={currentCertificate
                ? `Chứng chỉ hiện hành ${currentCertificate.cert_number}, phiên bản ${currentCertificate.version_no}, trạng thái ${statusLabel(currentCertificate.status)}, hiệu lực đến ${formatDate(currentCertificate.expire_date)}. Các thao tác được backend giới hạn theo trạng thái hiện tại.`
                : "Chưa xác định được chứng chỉ hiện hành của dự án."}
              message="Workflow đánh giá giám sát"
              showIcon
              type="info"
              style={{ marginBottom: 16 }}
            />
          ) : null}

          {workspace.lifecycle_type === "recertification" ? (
            <Alert
              description={currentCertificate
                ? `Chứng chỉ ${currentCertificate.cert_number}, phiên bản ${currentCertificate.version_no}, hết hiệu lực ngày ${formatDate(currentCertificate.expire_date)}. Backend chỉ cho phép Tái chứng nhận khi phiên bản hiện hành đang hiệu lực.`
                : "Chưa xác định được dòng chứng nhận hiện hữu; không thể lập quyết định tái chứng nhận."}
              message="Chu kỳ tái chứng nhận"
              showIcon
              type="info"
              style={{ marginBottom: 16 }}
            />
          ) : null}

          <Card title="Bối cảnh kỳ đánh giá" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={page ? { xs: 1, sm: 2 } : 2} size="small">
              <Descriptions.Item label="Khách hàng" span={2}>{workspace.defaults.organization_name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Hồ sơ chứng nhận">{workspace.plan.project_code}</Descriptions.Item>
              <Descriptions.Item label="Loại đánh giá">{page ? workspace.plan.audit_type || "Chưa có dữ liệu" : workspace.is_surveillance
                ? "Đánh giá giám sát"
                : workspace.lifecycle_type === "recertification"
                  ? "Đánh giá tái chứng nhận"
                  : "Đánh giá chứng nhận lần đầu – Giai đoạn 2"}</Descriptions.Item>
              <Descriptions.Item label="Tiêu chuẩn / chương trình" span={2}>{workspace.defaults.standard_name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Ngày bắt đầu đánh giá">{formatDate(workspace.report?.audit_start_date ?? workspace.plan.planned_start_date)}</Descriptions.Item>
              <Descriptions.Item label="Ngày kết thúc đánh giá">{formatDate(workspace.report?.audit_end_date ?? workspace.plan.planned_end_date)}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái thẩm xét" span={2}>{workspace.technical_review?.status === "completed" ? "Đã hoàn thành" : "Chưa hoàn thành"}</Descriptions.Item>
            </Descriptions>
          </Card>

          {activeTab === "overview" ? (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <div className="cmp-decision-metrics" style={{ display: "grid", gridTemplateColumns: `repeat(${page ? 2 : 4}, minmax(0, 1fr))`, gap: 12 }}>
                <Card><Statistic title="Thẩm xét kỹ thuật" value={workspace.technical_review?.status === "completed" ? "Hoàn thành" : "Chưa hoàn thành"} prefix={<CheckCircleOutlined />} /></Card>
                <Card><Statistic title="Quyết định chứng nhận" value={workspace.decision ? "Đã ban hành" : "Chưa có"} prefix={<SafetyCertificateOutlined />} /></Card>
                {!page ? <><Card><Statistic title="Thông báo kết quả" value={workspace.notification ? "Đã lập" : "Chưa có"} prefix={<NotificationOutlined />} /></Card>
                <Card><Statistic title="Đã gửi khách hàng" value={workspace.notification?.status === "sent" ? "Đã gửi" : "Chưa gửi"} prefix={<SendOutlined />} /></Card></> : null}
              </div>
              <Card title="Kết quả thẩm xét">
                <Descriptions column={page ? { xs: 1, sm: 2 } : 2} size="small">
                  <Descriptions.Item label="Người thẩm xét">{workspace.technical_review?.reviewer_name || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Ngày hoàn thành">{formatDate(workspace.technical_review?.completed_at)}</Descriptions.Item>
                  <Descriptions.Item label="Kiến nghị">{resultLabel(workspace.technical_review?.recommendation)}</Descriptions.Item>
                  <Descriptions.Item label="Điều kiện">{workspace.technical_review?.conditions || "Không"}</Descriptions.Item>
                  <Descriptions.Item label="Nhận xét" span={2}>{workspace.technical_review?.recommendation_comment || "—"}</Descriptions.Item>
                </Descriptions>
              </Card>
              <Card title="Chứng chỉ hiện hành">
                  {currentCertificate ? (
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      {normalize(currentCertificate.status) === "suspended" ? <Alert showIcon type="warning" message="Chứng chỉ hiện đang bị đình chỉ." /> : null}
                      <Descriptions column={page ? { xs: 1, sm: 2 } : 2} size="small">
                        <Descriptions.Item label="Số chứng chỉ">{currentCertificate.cert_number}</Descriptions.Item>
                        <Descriptions.Item label="Phiên bản">{currentCertificate.version_no}</Descriptions.Item>
                        <Descriptions.Item label="Trạng thái"><Tag color={normalize(currentCertificate.status) === "active" ? "green" : "orange"}>{statusLabel(currentCertificate.status)}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Ngày cấp">{formatDate(currentCertificate.issue_date)}</Descriptions.Item>
                        <Descriptions.Item label="Hết hiệu lực">{formatDate(currentCertificate.expire_date)}</Descriptions.Item>
                        <Descriptions.Item label="Tiêu chuẩn">{currentCertificate.standard_name}</Descriptions.Item>
                        <Descriptions.Item label="Phạm vi" span={2}>{currentCertificate.certification_scope}</Descriptions.Item>
                      </Descriptions>
                    </Space>
                  ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có chứng chỉ được cấp." />}
              </Card>
            </Space>
          ) : null}

          {activeTab === "decision" ? (
            workspace.decision ? (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Alert type="success" showIcon message="Quyết định chứng nhận đã được ban hành" />
                  <Alert
                    type={workspace.decision.lifecycle?.preserves_current_certificate ? "info" : "success"}
                    showIcon
                    message={workspace.decision.decision_type ? decisionConsequences[workspace.decision.decision_type] : "Quyết định đã được ghi nhận."}
                    description={workspace.decision.lifecycle?.preserves_current_certificate && currentCertificate
                    ? `Duy trì chứng nhận số ${currentCertificate.cert_number}, phiên bản ${currentCertificate.version_no}; không yêu cầu phát hành lại.`
                    : undefined}
                />
                <Card title="Quyết định chứng nhận" extra={!page || workspace.can_generate_decision ? <Space>
                  <Button icon={<FileWordOutlined />} loading={generate.isPending} onClick={() => generate.mutate({ kind: "decision", format: "docx" })}>Xuất Word</Button>
                  <Button icon={<FilePdfOutlined />} loading={generate.isPending} onClick={() => generate.mutate({ kind: "decision", format: "pdf" })}>Xuất PDF</Button>
                </Space> : null}>
                  <Descriptions column={page ? { xs: 1, sm: 2 } : 2} size="small">
                    <Descriptions.Item label="Số quyết định">{workspace.decision.decision_number}</Descriptions.Item>
                    <Descriptions.Item label="Ngày quyết định">{formatDate(workspace.decision.decision_date)}</Descriptions.Item>
                    <Descriptions.Item label="Loại quyết định"><Tag color="blue">{decisionTypeLabel(workspace.decision.decision_type)}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Kết quả"><Tag color={workspace.decision.decision_result === "approved" ? "green" : "default"}>{resultLabel(workspace.decision.decision_result)}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Người ký">{workspace.decision.signatory_name} – {workspace.decision.signatory_title}</Descriptions.Item>
                    <Descriptions.Item label="Tiêu chuẩn" span={2}>{workspace.decision.standard_name}</Descriptions.Item>
                    <Descriptions.Item label="Phạm vi" span={2}>{workspace.decision.certification_scope}</Descriptions.Item>
                    <Descriptions.Item label="Hiệu lực">{formatDate(workspace.decision.effective_date)}</Descriptions.Item>
                    <Descriptions.Item label="Hết hiệu lực">{formatDate(workspace.decision.expiry_date)}</Descriptions.Item>
                    {workspace.decision.change_reason ? <Descriptions.Item label="Lý do / căn cứ" span={2}>{workspace.decision.change_reason}</Descriptions.Item> : null}
                    {workspace.decision.note ? <Descriptions.Item label="Ghi chú" span={2}>{workspace.decision.note}</Descriptions.Item> : null}
                  </Descriptions>
                </Card>
                {!page ? <Card title="Lịch sử tài liệu quyết định">{renderHistory(workspace.decision_history)}</Card> : null}
              </Space>
            ) : (
              <Card title="Lập quyết định chứng nhận">
                <Form form={decisionForm} disabled={Boolean(page && !canDecision)} layout="vertical" onFinish={submitDecision}>
                  <div className="certification-result-form-grid">
                    <Form.Item label="Số quyết định" name="decision_number" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item label="Ngày quyết định" name="decision_date" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                    <Form.Item label="Loại quyết định" name="decision_type" rules={[{ required: true, message: "Chọn loại quyết định" }]}>
                      <Select options={workspace.allowed_decision_types.map((value) => ({ value, label: decisionTypeLabels[value] }))} />
                    </Form.Item>
                    <Form.Item label="Kết quả quyết định" name="decision_result" rules={[{ required: true }]}>
                      <Select
                        disabled={selectedDecisionType === "REFUSE"}
                        options={[
                          { value: "approved", label: "Chấp thuận" },
                          { value: "rejected", label: "Không chấp thuận" },
                          { value: "deferred", label: "Hoãn quyết định" },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item label="Chu kỳ giám sát (tháng)" name="surveillance_interval_months" rules={[{ required: true }]}><InputNumber min={1} max={36} style={{ width: "100%" }} /></Form.Item>
                  </div>
                  {selectedDecisionType && !["GRANT", "REFUSE"].includes(selectedDecisionType) ? (
                    <Form.Item label="Chứng chỉ áp dụng" name="certificate_series_id" rules={[{ required: true, message: "Chọn chứng chỉ hiện hành" }]}>
                      <Select
                        options={workspace.certificate_series.map((series) => ({
                          value: series.id,
                          label: series.current_certificate
                            ? `${series.current_certificate.cert_number} · phiên bản ${series.current_certificate.version_no}`
                            : series.series_code,
                        }))}
                        placeholder="Chọn chứng chỉ hiện hành"
                      />
                    </Form.Item>
                  ) : null}
                  <Form.Item label="Tên tổ chức" name="organization_name" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item label="Địa chỉ" name="organization_address"><Input /></Form.Item>
                  <div className="certification-result-form-grid">
                    <Form.Item label="Hệ thống quản lý" name="management_system"><Input /></Form.Item>
                    <Form.Item label="Tiêu chuẩn" name="standard_name" rules={[{ required: true }]}><Input /></Form.Item>
                  </div>
                  <Form.Item label="Phạm vi chứng nhận" name="certification_scope" rules={[{ required: true }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} /></Form.Item>
                  {isScopeChange ? (
                    <Card size="small" title="Đối chiếu phạm vi" style={{ marginBottom: 16 }}>
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Phạm vi hiện hành">{currentCertificate?.certification_scope || "Chưa có"}</Descriptions.Item>
                        <Descriptions.Item label="Phạm vi đề xuất">{proposedScope || "Chưa nhập"}</Descriptions.Item>
                      </Descriptions>
                    </Card>
                  ) : null}
                  {isRecertificationDecision && currentCertificate ? (
                    <Card size="small" title="Dòng chứng nhận sẽ tiếp tục" style={{ marginBottom: 16 }}>
                      <Descriptions column={page ? { xs: 1, sm: 2 } : 2} size="small">
                        <Descriptions.Item label="Phiên bản trước">{currentCertificate.version_no}</Descriptions.Item>
                        <Descriptions.Item label="Số chứng chỉ trước">{currentCertificate.cert_number}</Descriptions.Item>
                        <Descriptions.Item label="Hết hiệu lực">{formatDate(currentCertificate.expire_date)}</Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">{statusLabel(currentCertificate.status)}</Descriptions.Item>
                      </Descriptions>
                    </Card>
                  ) : null}
                  {isChangeDecision || isStatusDecision ? (
                    <Form.Item
                      label={selectedDecisionType === "SUSPEND"
                        ? "Lý do đình chỉ"
                        : selectedDecisionType === "RESTORE"
                          ? "Căn cứ khôi phục"
                          : selectedDecisionType === "WITHDRAW"
                            ? "Lý do thu hồi"
                            : "Lý do thay đổi"}
                      name="change_reason"
                      rules={isStatusDecision || selectedDecisionResult === "approved"
                        ? [{ required: true, whitespace: true, message: "Nhập đầy đủ lý do hoặc căn cứ" }]
                        : []}
                    >
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} maxLength={1000} showCount />
                    </Form.Item>
                  ) : null}
                  <div className="certification-result-form-grid">
                    {selectedDecisionType !== "MAINTAIN" ? (
                      <Form.Item
                        label={selectedDecisionType === "SUSPEND"
                          ? "Ngày hiệu lực đình chỉ"
                          : selectedDecisionType === "RESTORE"
                            ? "Ngày hiệu lực khôi phục"
                            : selectedDecisionType === "WITHDRAW"
                              ? "Ngày hiệu lực thu hồi"
                              : "Ngày hiệu lực"}
                        name="effective_date"
                        rules={isStatusDecision ? [{ required: true, message: "Chọn ngày hiệu lực" }] : []}
                      >
                        <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                      </Form.Item>
                    ) : null}
                    {selectedDecisionType !== "MAINTAIN" && !isStatusDecision ? <Form.Item label="Ngày hết hiệu lực" name="expiry_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item> : null}
                    <Form.Item label="Người ký" name="signatory_name" rules={[{ required: true, message: "Nhập người ký" }]}><Input /></Form.Item>
                    <Form.Item label="Chức danh" name="signatory_title" rules={[{ required: true }]}><Input /></Form.Item>
                  </div>
                  <Alert
                    showIcon
                    type={isChangeDecision && selectedDecisionResult === "approved" ? "warning" : "info"}
                    message="Tác động sau khi lưu quyết định"
                    description={selectedDecisionResult === "approved" ? selectedConsequence : "Kết quả này không cho phép phát hành hoặc thay đổi chứng chỉ."}
                    style={{ marginBottom: 16 }}
                  />
                  <Form.Item label="Ghi chú" name="note"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item>
                  <Button disabled={!workspace.can_issue_decision || !canDecision} htmlType="submit" loading={decisionMutation.isPending} type="primary" icon={<SafetyCertificateOutlined />}>Ban hành quyết định</Button>
                  {!canDecision ? <Text type="secondary" style={{ marginLeft: 12 }}>Chỉ người ra quyết định chứng nhận được ban hành.</Text> : null}
                </Form>
              </Card>
            )
          ) : null}

          {activeTab === "notification" ? (
            workspace.notification ? (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Alert type={workspace.notification.status === "sent" ? "success" : "info"} showIcon message={workspace.notification.status === "sent" ? "Thông báo đã gửi cho khách hàng" : "Thông báo đã được lập; chưa ghi nhận gửi khách hàng"} />
                <Card title="Thông báo kết quả đánh giá" extra={<Space>
                  <Button icon={<FileWordOutlined />} loading={generate.isPending} onClick={() => generate.mutate({ kind: "notification", format: "docx" })}>Xuất Word</Button>
                  <Button icon={<FilePdfOutlined />} loading={generate.isPending} onClick={() => generate.mutate({ kind: "notification", format: "pdf" })}>Xuất PDF</Button>
                  {workspace.notification.status !== "sent" && canManageNotification ? <Button icon={<SendOutlined />} loading={markSentMutation.isPending} onClick={() => markSentMutation.mutate()} type="primary">Đánh dấu đã gửi</Button> : null}
                </Space>}>
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="Số thông báo">{workspace.notification.notification_number}</Descriptions.Item>
                    <Descriptions.Item label="Ngày thông báo">{formatDate(workspace.notification.notification_date)}</Descriptions.Item>
                    <Descriptions.Item label="Kết quả">{resultLabel(workspace.notification.notification_result)}</Descriptions.Item>
                    <Descriptions.Item label="Người nhận">{workspace.notification.recipient_name || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Email">{workspace.notification.recipient_email || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Đánh giá tiếp theo">{formatDate(workspace.notification.next_audit_due_date)}</Descriptions.Item>
                  </Descriptions>
                </Card>
                <Card title="Lịch sử tài liệu thông báo">{renderHistory(workspace.notification_history)}</Card>
              </Space>
            ) : (
              <Card title="Lập thông báo kết quả">
                {!workspace.decision ? <Alert showIcon type="warning" message="Phải ban hành quyết định chứng nhận trước khi lập thông báo kết quả." style={{ marginBottom: 16 }} /> : null}
                <Form form={notificationForm} layout="vertical" onFinish={(values) => notificationMutation.mutate(values)}>
                  <div className="certification-result-form-grid">
                    <Form.Item label="Số thông báo" name="notification_number" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item label="Ngày thông báo" name="notification_date" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                    <Form.Item label="Kết quả thông báo" name="notification_result" rules={[{ required: true }]}>
                      <Select
                        disabled
                        options={workspace.decision?.decision_result === "approved"
                          ? workspace.decision.decision_type === "SUSPEND"
                            ? [{ value: "certification_suspended", label: "Đình chỉ chứng nhận" }]
                            : workspace.decision.decision_type === "WITHDRAW"
                              ? [{ value: "certification_withdrawn", label: "Thu hồi chứng nhận" }]
                              : workspace.decision.decision_type === "MAINTAIN" || workspace.decision.decision_type === "RESTORE"
                            ? [{ value: "certification_maintained", label: "Duy trì chứng nhận" }]
                            : [{ value: "certification_granted", label: "Chấp thuận chứng nhận" }]
                          : [{ value: "certification_not_granted", label: "Không chấp thuận chứng nhận" }]}
                      />
                    </Form.Item>
                    <Form.Item label="Ngày đánh giá tiếp theo" name="next_audit_due_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                  </div>
                  <Form.Item label="Tên tổ chức" name="organization_name" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item label="Địa chỉ" name="organization_address"><Input /></Form.Item>
                  <div className="certification-result-form-grid">
                    <Form.Item label="Người nhận" name="recipient_name"><Input /></Form.Item>
                    <Form.Item label="Email nhận" name="recipient_email"><Input type="email" /></Form.Item>
                    <Form.Item label="Ngày bắt đầu đánh giá" name="audit_start_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                    <Form.Item label="Ngày kết thúc đánh giá" name="audit_end_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                  </div>
                  <div className="certification-result-form-grid">
                    <Form.Item label="Hệ thống quản lý" name="management_system"><Input /></Form.Item>
                    <Form.Item label="Tiêu chuẩn" name="standard_name" rules={[{ required: true }]}><Input /></Form.Item>
                  </div>
                  <Form.Item label="Phạm vi chứng nhận" name="certification_scope" rules={[{ required: true }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} /></Form.Item>
                  <div className="certification-result-form-grid">
                    <Form.Item label="Người ký" name="signatory_name" rules={[{ required: true, message: "Nhập người ký" }]}><Input /></Form.Item>
                    <Form.Item label="Chức danh" name="signatory_title" rules={[{ required: true }]}><Input /></Form.Item>
                  </div>
                  <Form.Item label="Ghi chú" name="note"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item>
                  <Button
                    disabled={
                      !workspace.can_issue_notification
                      || !canCreateNotification
                    }
                    htmlType="submit"
                    loading={notificationMutation.isPending}
                    type="primary"
                    icon={<NotificationOutlined />}
                  >
                    {workspace.is_surveillance ? "Phát hành thông báo giám sát" : "Lập thông báo kết quả"}
                  </Button>
                  {!canCreateNotification ? <Text type="secondary" style={{ marginLeft: 12 }}>Chỉ người ra quyết định hoặc quản trị viên được lập thông báo; điều phối viên có thể gửi thông báo đã lập.</Text> : null}
                </Form>
              </Card>
            )
          ) : null}
        </>
      ) : null}
    </ResultContainer>
  );
}
