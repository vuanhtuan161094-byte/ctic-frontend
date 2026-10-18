"use client";

import {
  CheckCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  QrcodeOutlined,
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
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  List,
  Modal,
  Skeleton,
  Space,
  Steps,
  Tag,
  Timeline,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { buildPublicApiUrl } from "../lib/deployment-config";
import { previewDocumentFile } from "../lib/document-file-client";
import { CertificateResourcePage, type CertificatePageData } from "./certificate-workspace/CertificateResourcePage";

const { Text, Title } = Typography;

export interface CertificateDocument {
  id: string;
  document_type: string;
  file_kind: string;
  original_name: string;
  version_no: number;
  mime_type?: string | null;
  is_current?: boolean | null;
  created_at: string;
}

interface CertificateHistoryItem {
  id: string;
  from_status: string;
  to_status: string;
  reason: string;
  effective_date: string;
  created_at: string;
  changed_by_user?: {
    id: string;
    username?: string | null;
    full_name?: string | null;
  } | null;
  certification_decision?: {
    id: string;
    decision_number: string;
    decision_type: "SUSPEND" | "RESTORE" | "WITHDRAW";
    decision_result: string;
  } | null;
}

interface CertificateRecord {
  id: string;
  verification_code: string;
  technical_review_id: string;
  cert_number: string;
  certificate_series_id: string;
  version_no: number;
  supersedes_certificate_id?: string | null;
  change_reason?: string | null;
  organization_name: string;
  organization_address?: string | null;
  management_system?: string | null;
  standard_name: string;
  certification_scope: string;
  site_snapshot_json?: string | null;
  issue_date?: string | null;
  expire_date?: string | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateIssuanceWorkspace {
  plan: {
    id: string;
    plan_code?: string | null;
    audit_type?: string | null;
    project_id: string;
    project_code: string;
    standard_name?: string | null;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
  };
  report: {
    id: string;
    report_code?: string | null;
    version_no: number;
    status: string;
  } | null;
  technical_review: {
    id: string;
    status: string;
    completed_at?: string | null;
  } | null;
  decision: {
    id: string;
    decision_number: string;
    decision_date: string;
    decision_result: string;
    decision_type?: "GRANT" | "MAINTAIN" | "RECERTIFY" | "AMEND" | "EXTEND_SCOPE" | "REDUCE_SCOPE" | "SUSPEND" | "RESTORE" | "WITHDRAW" | null;
    change_reason?: string | null;
    organization_name: string;
    organization_address?: string | null;
    management_system?: string | null;
    standard_name: string;
    certification_scope: string;
    effective_date?: string | null;
    expiry_date?: string | null;
    status: string;
  } | null;
  notification: {
    id: string;
    notification_number: string;
    notification_date: string;
    notification_result: string;
    status: string;
    sent_at?: string | null;
  } | null;
  certificate: CertificateRecord | null;
  current_certificate: CertificateRecord | null;
  current_status: string | null;
  allowed_status_actions: Array<"SUSPEND" | "RESTORE" | "WITHDRAW">;
  current_series: {
    id: string;
    series_code: string;
    status: string;
  } | null;
  version_timeline: Array<CertificateRecord & {
    is_current: boolean;
    official_pdf_available: boolean;
    certification_decision?: {
      decision_number: string;
      decision_date: string;
      decision_type?: string | null;
      decision_result: string;
    } | null;
    documents: CertificateDocument[];
  }>;
  documents: CertificateDocument[];
  history: CertificateHistoryItem[];
  status_history: CertificateHistoryItem[];
  can_issue_status_decision: boolean;
  can_issue_certificate: boolean;
  requires_certificate_issuance: boolean;
  maintains_current_certificate: boolean;
  eligibility_errors: string[];
  issuance_preview: {
    previous_version: {
      id: string;
      version_no: number;
      cert_number: string;
      expire_date?: string | null;
      status?: string | null;
    } | null;
    proposed_version: {
      version_no: number;
      cert_number: string;
      organization_name: string;
      organization_address?: string | null;
      management_system?: string | null;
      standard_name: string;
      certification_scope: string;
      site_snapshot_json?: string | null;
      issue_date?: string | null;
      expire_date?: string | null;
    } | null;
  };
  defaults: {
    cert_number: string;
    issue_date: string;
    expire_date?: string | null;
    change_reason?: string | null;
  };
}

interface IssueFormValues {
  cert_number: string;
  issue_date: Dayjs;
  expire_date: Dayjs;
  change_reason?: string;
}

interface Props {
  page?: { data: CertificatePageData; onOpenPath: (path: string) => void };
  open: boolean;
  planId: string | null;
  roles: string[];
  onClose: () => void;
  onStartStatusDecision?: (decisionType: "SUSPEND" | "RESTORE" | "WITHDRAW") => void;
  onChanged?: () => void | Promise<void>;
}

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : "—";
}

function statusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    active: "Đang hiệu lực",
    suspended: "Đình chỉ",
    withdrawn: "Đã thu hồi",
    expired: "Hết hiệu lực",
    replaced: "Đã được thay thế",
    completed: "Hoàn thành",
    issued: "Đã ban hành",
    sent: "Đã gửi",
  };
  const key = (value ?? "").trim().toLowerCase();
  return labels[key] ?? (value || "—").replaceAll("_", " ");
}

const decisionTypeLabels: Record<string, string> = {
  GRANT: "Cấp chứng nhận",
  MAINTAIN: "Duy trì chứng nhận",
  RECERTIFY: "Tái chứng nhận",
  AMEND: "Sửa đổi chứng chỉ",
  EXTEND_SCOPE: "Mở rộng phạm vi chứng nhận",
  REDUCE_SCOPE: "Thu hẹp phạm vi chứng nhận",
  SUSPEND: "Đình chỉ chứng chỉ",
  RESTORE: "Khôi phục hiệu lực chứng chỉ",
  WITHDRAW: "Thu hồi chứng chỉ",
};

const statusActionLabels = {
  SUSPEND: "Đình chỉ",
  RESTORE: "Khôi phục hiệu lực",
  WITHDRAW: "Thu hồi",
} as const;

function parseSites(value?: string | null): Array<Record<string, unknown>> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
  } catch {
    return [];
  }
}

export default function CertificateIssuanceWorkspaceModal({
  open,
  planId,
  roles,
  onClose,
  onStartStatusDecision,
  onChanged,
  page,
}: Props) {
  const { message } = App.useApp();
  const breakpoints = Grid.useBreakpoint();
  const descriptionsLayout = breakpoints.xs ? "vertical" : "horizontal";
  const [form] = Form.useForm<IssueFormValues>();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const normalizedRoles = useMemo(() => roles.map(normalize), [roles]);
  const canIssue = normalizedRoles.includes("decisionmaker");
  const canManageLifecycle = normalizedRoles.includes("decisionmaker");
  const canUpload = normalizedRoles.includes("decisionmaker") && (!page || page.data.can_upload_pdf);

  const workspaceQuery = useQuery<CertificateIssuanceWorkspace>({
    enabled: !page && open && Boolean(planId),
    queryKey: ["certificate-issuance-workspace", planId],
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch Giai đoạn 2");
      return (await api.get<CertificateIssuanceWorkspace>(`/certificates/plan/${planId}/workspace`)).data;
    },
  });

  const workspace = page?.data ?? workspaceQuery.data;
  const certificate = workspace?.certificate ?? null;
  const currentCertificate = workspace?.current_certificate ?? certificate;
  const displayedCertificate = certificate ?? currentCertificate;
  const documentOwnerCertificate = workspace?.requires_certificate_issuance && !certificate
    ? null
    : displayedCertificate;
  const selectedVersion = workspace?.version_timeline.find((item) => item.id === selectedVersionId) ?? null;
  const decisionType = workspace?.decision?.decision_type ?? null;
  const isReissue = Boolean(decisionType && ["RECERTIFY", "AMEND", "EXTEND_SCOPE", "REDUCE_SCOPE"].includes(decisionType));
  const isRecertification = decisionType === "RECERTIFY";
  const requiresChangeReason = Boolean(decisionType && ["AMEND", "EXTEND_SCOPE", "REDUCE_SCOPE"].includes(decisionType));
  const currentPdf = documentOwnerCertificate
    ? workspace?.documents.find((file) =>
      file.document_type === "certificate_pdf"
        && file.mime_type === "application/pdf"
        && file.is_current,
    ) ?? workspace?.documents.find((file) => file.document_type === "certificate_pdf" && file.mime_type === "application/pdf")
    : undefined;

  useEffect(() => {
    if (!workspace || workspace.certificate || !workspace.requires_certificate_issuance) return;
    form.setFieldsValue({
      cert_number: workspace.defaults.cert_number,
      issue_date: dayjs(workspace.defaults.issue_date),
      expire_date: workspace.defaults.expire_date ? dayjs(workspace.defaults.expire_date) : dayjs(workspace.defaults.issue_date).add(3, "year").subtract(1, "day"),
      change_reason: workspace.defaults.change_reason || undefined,
    });
  }, [form, workspace]);

  const refresh = async () => {
    await Promise.all([page ? Promise.resolve() : workspaceQuery.refetch(), onChanged?.()]);
  };

  const issueMutation = useMutation({
    mutationFn: async (values: IssueFormValues) => {
      if (!workspace?.technical_review?.id) throw new Error("Chưa có hồ sơ thẩm xét kỹ thuật hoàn thành");
      return (
        await api.post<CertificateRecord>("/certificates", {
          technical_review_id: workspace.technical_review.id,
          cert_number: values.cert_number.trim(),
          issue_date: values.issue_date.format("YYYY-MM-DD"),
          expire_date: values.expire_date.format("YYYY-MM-DD"),
          change_reason: values.change_reason?.trim() || undefined,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã cấp giấy chứng nhận và tạo mã xác minh QR.");
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const uploadCertificatePdf = async () => {
    if (page && (!canUpload || page.data.is_historical)) return;
    if (!documentOwnerCertificate) {
      setUploadError("Cần cấp giấy chứng nhận trước khi tải PDF chính thức.");
      return;
    }
    if (!uploadFile) {
      setUploadError("Hãy chọn file PDF chứng chỉ.");
      return;
    }
    if (uploadFile.type !== "application/pdf" && !uploadFile.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Giấy chứng nhận chính thức phải là file PDF.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const data = new FormData();
      data.append("file", uploadFile);
      await api.post(`/certificates/${documentOwnerCertificate.id}/pdf`, data);
      setUploadFile(null);
      message.success("Đã tải PDF chứng chỉ. Phiên bản mới trở thành bản hiện hành.");
      await refresh();
    } catch (error) {
      setUploadError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (file: CertificateDocument) => {
    setOpeningDocumentId(file.id);
    try {
      await previewDocumentFile({
        url: `/document-files/${file.id}/download`,
        filename: file.original_name,
        mimeType: file.mime_type,
        title: file.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const publicPdfUrl = documentOwnerCertificate && currentPdf && normalize(documentOwnerCertificate.status) === "active"
    ? buildPublicApiUrl(`/public/certificates/${documentOwnerCertificate.verification_code}/pdf`)
    : null;
  const qrUrl = documentOwnerCertificate && currentPdf && normalize(documentOwnerCertificate.status) === "active"
    ? buildPublicApiUrl(`/public/certificates/${documentOwnerCertificate.verification_code}/qr`)
    : null;

  const workflowItems = [
    { title: "Thẩm xét", status: workspace?.technical_review?.status === "completed" ? "finish" as const : "wait" as const },
    { title: "Quyết định", status: workspace?.decision?.decision_result === "approved" ? "finish" as const : "wait" as const },
    { title: "Thông báo", status: workspace?.notification?.status === "sent" ? "finish" as const : "wait" as const },
    ...(workspace?.maintains_current_certificate
      ? [{ title: "Duy trì chứng nhận", status: "finish" as const }]
      : [{ title: isReissue ? "Phát hành phiên bản mới" : "Phát hành chứng chỉ", status: certificate ? "finish" as const : "process" as const }]),
    { title: "PDF & QR", status: currentPdf ? "finish" as const : displayedCertificate ? "process" as const : "wait" as const },
  ];

  if (page) return <CertificateResourcePage data={page.data} onOpenPath={page.onOpenPath} onOpenDocument={openDocument}
    canUpload={canUpload} uploadFile={uploadFile} uploading={uploading} uploadError={uploadError}
    onSelectFile={file => { setUploadFile(file); setUploadError(null); }} onUpload={() => void uploadCertificatePdf()} />;

  return (
    <Modal
      centered
      className="certificate-issuance-workspace-modal"
      destroyOnHidden
      footer={null}
      onCancel={() => {
        setSelectedVersionId(null);
        onClose();
      }}
      open={open}
      title={null}
      width={1120}
    >
      <div className="certificate-issuance-workspace">
        <div className="certificate-issuance-heading">
          <div>
            <Text type="secondary">CHỨNG CHỈ TRONG HỒ SƠ CHỨNG NHẬN</Text>
            <Title level={3}>{workspace?.plan.project_code ?? "Hồ sơ chứng nhận"}</Title>
          </div>
          {displayedCertificate ? <Tag color={normalize(displayedCertificate.status) === "active" ? "green" : normalize(displayedCertificate.status) === "withdrawn" ? "red" : "orange"} icon={<CheckCircleOutlined />}>{statusLabel(displayedCertificate.status)}</Tag> : <Tag color="blue">Chưa cấp</Tag>}
        </div>

        {workspaceQuery.isLoading ? <Skeleton active paragraph={{ rows: 10 }} /> : null}
        {workspaceQuery.isError ? <Alert showIcon type="error" message="Không tải được không gian cấp chứng chỉ" description={getErrorMessage(workspaceQuery.error)} /> : null}

        {workspace ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card size="small">
              <Steps responsive size="small" items={workflowItems} />
            </Card>

            {workspace.eligibility_errors.length && workspace.requires_certificate_issuance && !certificate ? (
              <Alert
                showIcon
                type="warning"
                icon={<WarningOutlined />}
                message="Chưa đủ điều kiện cấp giấy chứng nhận"
                description={(
                  <ul className="certificate-issuance-errors">
                    {workspace.eligibility_errors.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              />
            ) : null}

            <Card title="Căn cứ phát hành" size="small">
              <Descriptions bordered column={{ xs: 1, sm: 2 }} layout={descriptionsLayout} size="small">
                <Descriptions.Item label="PLAN">{workspace.plan.plan_code || "—"}</Descriptions.Item>
                <Descriptions.Item label="Báo cáo">{workspace.report?.report_code || "—"}</Descriptions.Item>
                <Descriptions.Item label="Thẩm xét">{statusLabel(workspace.technical_review?.status)}</Descriptions.Item>
                <Descriptions.Item label="Quyết định">{workspace.decision?.decision_number || "—"}</Descriptions.Item>
                <Descriptions.Item label="Loại quyết định"><Tag color="blue">{decisionType ? decisionTypeLabels[decisionType] : "—"}</Tag></Descriptions.Item>
                <Descriptions.Item label="Thông báo kết quả">{workspace.notification?.notification_number || "—"}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái thông báo">{statusLabel(workspace.notification?.status)}</Descriptions.Item>
                <Descriptions.Item label="Tổ chức" span="filled">{workspace.decision?.organization_name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Tiêu chuẩn" span="filled">{workspace.decision?.standard_name || workspace.plan.standard_name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Phạm vi" span="filled">{workspace.decision?.certification_scope || "—"}</Descriptions.Item>
                {workspace.decision?.change_reason ? <Descriptions.Item label="Lý do thay đổi" span="filled">{workspace.decision.change_reason}</Descriptions.Item> : null}
              </Descriptions>
            </Card>

            <Card className={currentCertificate ? undefined : "cmp-compact-empty-card"} title="Chứng chỉ hiện hành" size="small">
              {currentCertificate ? (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {normalize(currentCertificate.status) === "suspended" ? <Alert showIcon type="warning" message="Chứng chỉ hiện đang bị đình chỉ." /> : null}
                  <Descriptions bordered column={{ xs: 1, sm: 2 }} layout={descriptionsLayout} size="small">
                    <Descriptions.Item label="Số chứng chỉ">{currentCertificate.cert_number}</Descriptions.Item>
                    <Descriptions.Item label="Phiên bản">{currentCertificate.version_no}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái"><Tag color={normalize(currentCertificate.status) === "active" ? "green" : normalize(currentCertificate.status) === "withdrawn" ? "red" : "orange"}>{statusLabel(currentCertificate.status)}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Ngày hết hạn">{formatDate(currentCertificate.expire_date)}</Descriptions.Item>
                    <Descriptions.Item label="Tiêu chuẩn">{currentCertificate.standard_name}</Descriptions.Item>
                    <Descriptions.Item label="PDF chính thức">{workspace.version_timeline.find((item) => item.id === currentCertificate.id)?.official_pdf_available ? "Đã có" : "Chưa có"}</Descriptions.Item>
                    <Descriptions.Item label="Phạm vi chứng nhận" span="filled">{currentCertificate.certification_scope}</Descriptions.Item>
                    <Descriptions.Item label="Mã xác minh" span="filled"><Text copyable>{currentCertificate.verification_code}</Text></Descriptions.Item>
                  </Descriptions>
                  {workspace.can_issue_status_decision && canManageLifecycle && workspace.allowed_status_actions.length ? (
                    <Space wrap>
                      {workspace.allowed_status_actions.map((decisionType) => (
                        <Button
                          danger={decisionType === "WITHDRAW"}
                          key={decisionType}
                          onClick={() => onStartStatusDecision?.(decisionType)}
                          type={decisionType === "WITHDRAW" ? "default" : "primary"}
                        >
                          {statusActionLabels[decisionType]}
                        </Button>
                      ))}
                    </Space>
                  ) : null}
                  {!canManageLifecycle && workspace.allowed_status_actions.length ? <Text type="secondary">Bạn có quyền xem nhưng không có quyền ban hành quyết định thay đổi hiệu lực.</Text> : null}
                </Space>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có chứng chỉ được cấp." />}
            </Card>

            {workspace.maintains_current_certificate ? (
              <Alert
                showIcon
                type="success"
                message="Duy trì chứng nhận"
                description={currentCertificate
                  ? `Chứng chỉ ${currentCertificate.cert_number}, phiên bản ${currentCertificate.version_no}, tiếp tục có hiệu lực đến ${formatDate(currentCertificate.expire_date)}. Quyết định ngày ${formatDate(workspace.decision?.decision_date)} không yêu cầu phát hành lại.`
                  : "Quyết định duy trì không tạo phiên bản chứng chỉ mới."}
              />
            ) : null}

            {workspace.requires_certificate_issuance && !certificate ? (
              <Card title={isRecertification ? "Phát hành chứng chỉ tái chứng nhận" : isReissue ? "Phát hành phiên bản chứng chỉ mới" : "Phát hành chứng chỉ"} size="small">
                <Alert
                  showIcon
                  type={isReissue ? "warning" : "info"}
                  message={isReissue ? "Xác nhận nội dung phiên bản mới" : "Xác nhận nội dung chứng chỉ lần đầu"}
                  description={isReissue && currentCertificate
                    ? `Phiên bản ${currentCertificate.version_no} sẽ được lưu trong lịch sử với trạng thái Đã thay thế. Phiên bản mới dùng snapshot từ quyết định đã chấp thuận.`
                    : "Chứng chỉ chỉ được tạo sau khi người có thẩm quyền xác nhận phát hành."}
                  style={{ marginBottom: 16 }}
                />
                <Descriptions bordered column={{ xs: 1, sm: 2 }} layout={descriptionsLayout} size="small" style={{ marginBottom: 16 }}>
                  {workspace.issuance_preview.previous_version ? (
                    <>
                      <Descriptions.Item label="Phiên bản trước">{workspace.issuance_preview.previous_version.version_no}</Descriptions.Item>
                      <Descriptions.Item label="Số chứng chỉ trước">{workspace.issuance_preview.previous_version.cert_number}</Descriptions.Item>
                      <Descriptions.Item label="Hết hiệu lực phiên bản trước">{formatDate(workspace.issuance_preview.previous_version.expire_date)}</Descriptions.Item>
                      <Descriptions.Item label="Trạng thái phiên bản trước">{statusLabel(workspace.issuance_preview.previous_version.status)}</Descriptions.Item>
                    </>
                  ) : null}
                  <Descriptions.Item label="Tên tổ chức" span="filled">{workspace.decision?.organization_name || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ" span="filled">{workspace.decision?.organization_address || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Hệ thống quản lý">{workspace.decision?.management_system || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Tiêu chuẩn">{workspace.decision?.standard_name || "—"}</Descriptions.Item>
                  {isReissue && currentCertificate ? <Descriptions.Item label="Phạm vi hiện hành" span="filled">{currentCertificate.certification_scope}</Descriptions.Item> : null}
                  <Descriptions.Item label={isReissue ? "Phạm vi đề xuất" : "Phạm vi chứng nhận"} span="filled">{workspace.decision?.certification_scope || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Ngày cấp mới">{formatDate(workspace.issuance_preview.proposed_version?.issue_date)}</Descriptions.Item>
                  <Descriptions.Item label="Ngày hết hạn mới">{formatDate(workspace.issuance_preview.proposed_version?.expire_date)}</Descriptions.Item>
                  <Descriptions.Item label="Số chứng chỉ dự kiến">{workspace.issuance_preview.proposed_version?.cert_number || workspace.defaults.cert_number}</Descriptions.Item>
                  <Descriptions.Item label="Phiên bản dự kiến">{workspace.issuance_preview.proposed_version?.version_no ?? 1}</Descriptions.Item>
                  <Descriptions.Item label="Địa điểm chứng nhận mới" span="filled">
                    {parseSites(workspace.issuance_preview.proposed_version?.site_snapshot_json).length
                      ? <List
                        size="small"
                        dataSource={parseSites(workspace.issuance_preview.proposed_version?.site_snapshot_json)}
                        renderItem={(site, index) => <List.Item>{String(site.site_name ?? `Địa điểm ${index + 1}`)} · {String(site.address ?? "Chưa có địa chỉ")}</List.Item>}
                      />
                      : "Không có địa điểm bổ sung trong snapshot"}
                  </Descriptions.Item>
                </Descriptions>
                <Form form={form} layout="vertical" onFinish={(values) => issueMutation.mutate(values)}>
                  <div className="certificate-issuance-form-grid">
                    <Form.Item label="Số chứng chỉ" name="cert_number" rules={[{ required: true, whitespace: true, message: "Nhập số chứng chỉ" }]}>
                      <Input maxLength={50} />
                    </Form.Item>
                    <Form.Item label="Ngày cấp" name="issue_date" rules={[{ required: true, message: "Chọn ngày cấp" }]}>
                      <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item
                      label="Ngày hết hạn"
                      name="expire_date"
                      dependencies={["issue_date"]}
                      rules={[
                        { required: true, message: "Chọn ngày hết hạn" },
                        ({ getFieldValue }) => ({
                          validator(_, value: Dayjs | undefined) {
                            const issue = getFieldValue("issue_date") as Dayjs | undefined;
                            if (!value || !issue || value.isAfter(issue, "day")) return Promise.resolve();
                            return Promise.reject(new Error("Ngày hết hạn phải sau ngày cấp"));
                          },
                        }),
                      ]}
                    >
                      <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                    </Form.Item>
                  </div>
                  {requiresChangeReason ? (
                    <Form.Item label="Lý do thay đổi" name="change_reason" rules={[{ required: true, whitespace: true, message: "Nhập lý do thay đổi" }]}>
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} maxLength={1000} showCount />
                    </Form.Item>
                  ) : null}
                  <Alert
                    showIcon
                    type="info"
                    message="Ngày cấp/hết hạn mặc định lấy từ Quyết định F.13; có thể điều chỉnh trước khi phát hành."
                    style={{ marginBottom: 16 }}
                  />
                  <Button
                    disabled={!workspace.can_issue_certificate || !canIssue}
                    htmlType="submit"
                    icon={<SafetyCertificateOutlined />}
                    loading={issueMutation.isPending}
                    type="primary"
                  >
                    {isRecertification ? "Phát hành chứng chỉ tái chứng nhận" : isReissue ? "Phát hành phiên bản chứng chỉ mới" : "Phát hành chứng chỉ"}
                  </Button>
                  {!canIssue ? <Text type="secondary" style={{ marginLeft: 12 }}>Chỉ người ra quyết định chứng nhận được cấp chứng chỉ.</Text> : null}
                </Form>
              </Card>
            ) : certificate ? (
              <Card title={certificate.version_no > 1 ? "Phiên bản chứng chỉ mới đã phát hành" : "Giấy chứng nhận đã cấp"} size="small">
                <Descriptions bordered column={{ xs: 1, sm: 2 }} layout={descriptionsLayout} size="small">
                  <Descriptions.Item label="Số chứng chỉ">{certificate.cert_number}</Descriptions.Item>
                  <Descriptions.Item label="Phiên bản">{certificate.version_no}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái"><Tag color={normalize(certificate.status) === "active" ? "green" : "orange"}>{statusLabel(certificate.status)}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Ngày cấp">{formatDate(certificate.issue_date)}</Descriptions.Item>
                  <Descriptions.Item label="Ngày hết hạn">{formatDate(certificate.expire_date)}</Descriptions.Item>
                  <Descriptions.Item label="Mã xác minh" span="filled"><Text copyable>{certificate.verification_code}</Text></Descriptions.Item>
                </Descriptions>
              </Card>
            ) : null}

            {documentOwnerCertificate ? (
              <Card title="PDF chính thức & QR tra cứu" size="small">
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {!currentPdf ? (
                    <Alert
                      showIcon
                      type="warning"
                      message="Chưa có PDF chứng chỉ chính thức"
                      description="QR chỉ được đưa vào sử dụng sau khi PDF chính thức được tải lên."
                    />
                  ) : (
                    <Alert showIcon type="success" message={`PDF hiện hành: ${currentPdf.original_name}`} />
                  )}

                  {canUpload ? (
                    <div className="certificate-pdf-upload-row">
                      <label className="certificate-pdf-picker">
                        <UploadOutlined />
                        <span>{uploadFile?.name || "Chọn PDF chứng chỉ chính thức"}</span>
                        <input
                          accept="application/pdf,.pdf"
                          onChange={(event) => {
                            setUploadFile(event.target.files?.[0] ?? null);
                            setUploadError(null);
                          }}
                          type="file"
                        />
                      </label>
                      <Button disabled={!uploadFile} loading={uploading} onClick={() => void uploadCertificatePdf()} type="primary">
                        {currentPdf ? "Tạo phiên bản PDF mới" : "Tải PDF lên"}
                      </Button>
                    </div>
                  ) : null}
                  {uploadError ? <Alert showIcon type="error" message={uploadError} /> : null}

                  <Space wrap>
                    {currentPdf ? <Button icon={<EyeOutlined />} loading={openingDocumentId === currentPdf.id} onClick={() => void openDocument(currentPdf)}>Mở PDF nội bộ</Button> : null}
                    {publicPdfUrl ? <Button href={publicPdfUrl} icon={<EyeOutlined />} target="_blank">Tra cứu công khai</Button> : null}
                    {qrUrl ? <Button href={qrUrl} icon={<QrcodeOutlined />} target="_blank" type="primary">Tải QR</Button> : null}
                  </Space>

                  <List
                    dataSource={workspace.documents}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tệp chứng chỉ" /> }}
                    renderItem={(file) => (
                      <List.Item actions={[
                        <Button key="open" icon={<DownloadOutlined />} loading={openingDocumentId === file.id} onClick={() => void openDocument(file)} size="small">Mở</Button>,
                      ]}>
                        <List.Item.Meta
                          avatar={<FilePdfOutlined />}
                          title={<Space>{file.original_name}{file.is_current ? <Tag color="green">Hiện hành</Tag> : null}</Space>}
                          description={`Phiên bản ${file.version_no} · ${formatDate(file.created_at)}`}
                        />
                      </List.Item>
                    )}
                  />
                </Space>
              </Card>
            ) : null}

            {workspace.version_timeline.length ? (
              <Card title="Lịch sử phiên bản chứng chỉ" size="small">
                <Timeline items={workspace.version_timeline.map((version) => ({
                  color: version.is_current ? "green" : "gray",
                  children: (
                    <div className="certificate-history-item">
                      <Space wrap>
                        <strong>Phiên bản {version.version_no} · {version.cert_number}</strong>
                        {version.is_current ? <Tag color="green">Phiên bản hiện hành</Tag> : null}
                        {normalize(version.status) === "replaced" ? <Tag>Đã được thay thế</Tag> : null}
                        <Tag color="blue">{decisionTypeLabels[version.certification_decision?.decision_type ?? ""] ?? "Cấp chứng nhận"}</Tag>
                      </Space>
                      <div>{formatDate(version.issue_date)} – {formatDate(version.expire_date)}</div>
                      {version.change_reason ? <div>Lý do: {version.change_reason}</div> : null}
                      <Space wrap>
                        <Text type="secondary">PDF chính thức: {version.official_pdf_available ? "Đã có" : "Chưa có"}</Text>
                        <Button onClick={() => setSelectedVersionId(version.id)} size="small">Xem chi tiết</Button>
                        {version.documents[0] ? <Button loading={openingDocumentId === version.documents[0].id} onClick={() => void openDocument(version.documents[0])} size="small">Mở PDF phiên bản này</Button> : null}
                      </Space>
                    </div>
                  ),
                }))} />

                {selectedVersion ? (
                  <Card type="inner" title={`Chi tiết bất biến · Phiên bản ${selectedVersion.version_no}`} extra={<Button onClick={() => setSelectedVersionId(null)} size="small">Đóng</Button>}>
                    <Alert showIcon type="info" message="Dữ liệu dưới đây là snapshot tại thời điểm phát hành và chỉ được xem." style={{ marginBottom: 12 }} />
                    <Descriptions bordered column={{ xs: 1, sm: 2 }} layout={descriptionsLayout} size="small">
                      <Descriptions.Item label="Tên tổ chức" span="filled">{selectedVersion.organization_name}</Descriptions.Item>
                      <Descriptions.Item label="Địa chỉ" span="filled">{selectedVersion.organization_address || "—"}</Descriptions.Item>
                      <Descriptions.Item label="Hệ thống quản lý">{selectedVersion.management_system || "—"}</Descriptions.Item>
                      <Descriptions.Item label="Tiêu chuẩn">{selectedVersion.standard_name}</Descriptions.Item>
                      <Descriptions.Item label="Phạm vi chứng nhận" span="filled">{selectedVersion.certification_scope}</Descriptions.Item>
                      <Descriptions.Item label="Lý do thay đổi" span="filled">{selectedVersion.change_reason || "Cấp chứng nhận lần đầu"}</Descriptions.Item>
                      <Descriptions.Item label="Địa điểm chứng nhận" span="filled">
                        {parseSites(selectedVersion.site_snapshot_json).length
                          ? <List
                            size="small"
                            dataSource={parseSites(selectedVersion.site_snapshot_json)}
                            renderItem={(site, index) => <List.Item>{String(site.site_name ?? `Địa điểm ${index + 1}`)} · {String(site.address ?? "Chưa có địa chỉ")}</List.Item>}
                          />
                          : "Không có địa điểm bổ sung trong snapshot"}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                ) : null}
              </Card>
            ) : null}

            {documentOwnerCertificate ? (
              <Card title="Lịch sử trạng thái chứng chỉ" size="small">
                {workspace.history.length ? (
                <Timeline items={workspace.history.map((item) => ({
                  color: normalize(item.to_status) === "active" ? "green" : "orange",
                  children: (
                    <div>
                      <strong>{statusLabel(item.from_status)} → {statusLabel(item.to_status)}</strong>
                      <div>Thao tác: {item.certification_decision?.decision_type ? decisionTypeLabels[item.certification_decision.decision_type] : "Cập nhật hệ thống"}</div>
                      <div>Lý do: {item.reason}</div>
                      <div>Hiệu lực: {formatDate(item.effective_date)}</div>
                      {item.certification_decision ? <div>Quyết định: {item.certification_decision.decision_number}</div> : null}
                      <Text type="secondary">{item.changed_by_user?.full_name || item.changed_by_user?.username || "Hệ thống"} · {formatDateTime(item.created_at)}</Text>
                    </div>
                  ),
                }))} />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thay đổi trạng thái" />}
              </Card>
            ) : null}
          </Space>
        ) : null}
      </div>
    </Modal>
  );
}
