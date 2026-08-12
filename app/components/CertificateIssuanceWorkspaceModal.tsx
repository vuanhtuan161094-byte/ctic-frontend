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

const { Text, Title } = Typography;

interface CertificateDocument {
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
}

interface CertificateRecord {
  id: string;
  verification_code: string;
  technical_review_id: string;
  cert_number: string;
  issue_date?: string | null;
  expire_date?: string | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
}

interface CertificateIssuanceWorkspace {
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
  documents: CertificateDocument[];
  history: CertificateHistoryItem[];
  can_issue_certificate: boolean;
  eligibility_errors: string[];
  defaults: {
    cert_number: string;
    issue_date: string;
    expire_date?: string | null;
  };
}

interface IssueFormValues {
  cert_number: string;
  issue_date: Dayjs;
  expire_date: Dayjs;
}

interface Props {
  open: boolean;
  planId: string | null;
  roles: string[];
  onClose: () => void;
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

function statusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    active: "Đang hiệu lực",
    suspended: "Tạm đình chỉ",
    withdrawn: "Đã thu hồi",
    expired: "Đã hết hạn",
    replaced: "Đã thay thế",
    completed: "Hoàn thành",
    issued: "Đã ban hành",
    sent: "Đã gửi",
  };
  const key = (value ?? "").trim().toLowerCase();
  return labels[key] ?? (value || "—").replaceAll("_", " ");
}

export default function CertificateIssuanceWorkspaceModal({
  open,
  planId,
  roles,
  onClose,
  onChanged,
}: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<IssueFormValues>();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);

  const normalizedRoles = useMemo(() => roles.map(normalize), [roles]);
  const canIssue = normalizedRoles.some((role) => ["admin", "decisionmaker"].includes(role));
  const canUpload = normalizedRoles.some((role) => ["admin", "decisionmaker", "staff", "coordinator"].includes(role));

  const workspaceQuery = useQuery<CertificateIssuanceWorkspace>({
    enabled: open && Boolean(planId),
    queryKey: ["certificate-issuance-workspace", planId],
    queryFn: async () => {
      if (!planId) throw new Error("Chưa chọn kế hoạch Giai đoạn 2");
      return (await api.get<CertificateIssuanceWorkspace>(`/certificates/plan/${planId}/workspace`)).data;
    },
  });

  const workspace = workspaceQuery.data;
  const certificate = workspace?.certificate ?? null;
  const currentPdf = workspace?.documents.find((file) =>
    file.document_type === "certificate_pdf"
      && file.mime_type === "application/pdf"
      && file.is_current,
  ) ?? workspace?.documents.find((file) => file.document_type === "certificate_pdf" && file.mime_type === "application/pdf");

  useEffect(() => {
    if (!workspace || workspace.certificate) return;
    form.setFieldsValue({
      cert_number: workspace.defaults.cert_number,
      issue_date: dayjs(workspace.defaults.issue_date),
      expire_date: workspace.defaults.expire_date ? dayjs(workspace.defaults.expire_date) : dayjs(workspace.defaults.issue_date).add(3, "year").subtract(1, "day"),
    });
  }, [form, workspace]);

  const refresh = async () => {
    await Promise.all([workspaceQuery.refetch(), onChanged?.()]);
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
    if (!certificate) {
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
      await api.post(`/certificates/${certificate.id}/pdf`, data);
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

  const publicPdfUrl = certificate && currentPdf
    ? buildPublicApiUrl(`/public/certificates/${certificate.verification_code}/pdf`)
    : null;
  const qrUrl = certificate && currentPdf
    ? buildPublicApiUrl(`/public/certificates/${certificate.verification_code}/qr`)
    : null;

  const workflowItems = [
    { title: "Thẩm xét", status: workspace?.technical_review?.status === "completed" ? "finish" as const : "wait" as const },
    { title: "Quyết định", status: workspace?.decision?.decision_result === "approved" ? "finish" as const : "wait" as const },
    { title: "Thông báo", status: workspace?.notification?.status === "sent" ? "finish" as const : "wait" as const },
    { title: "Cấp chứng chỉ", status: certificate ? "finish" as const : "process" as const },
    { title: "PDF & QR", status: currentPdf ? "finish" as const : certificate ? "process" as const : "wait" as const },
  ];

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={null}
      width={1120}
    >
      <div className="certificate-issuance-workspace">
        <div className="certificate-issuance-heading">
          <div>
            <Text type="secondary">KHÔNG GIAN CẤP GIẤY CHỨNG NHẬN</Text>
            <Title level={3}>{workspace?.plan.project_code ?? "Hồ sơ chứng nhận"}</Title>
          </div>
          {certificate ? <Tag color="green" icon={<CheckCircleOutlined />}>{statusLabel(certificate.status)}</Tag> : <Tag color="blue">Chưa cấp</Tag>}
        </div>

        {workspaceQuery.isLoading ? <Skeleton active paragraph={{ rows: 10 }} /> : null}
        {workspaceQuery.isError ? <Alert showIcon type="error" message="Không tải được không gian cấp chứng chỉ" description={getErrorMessage(workspaceQuery.error)} /> : null}

        {workspace ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card size="small">
              <Steps responsive={false} size="small" items={workflowItems} />
            </Card>

            {workspace.eligibility_errors.length && !certificate ? (
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
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="PLAN">{workspace.plan.plan_code || "—"}</Descriptions.Item>
                <Descriptions.Item label="Báo cáo">{workspace.report?.report_code || "—"}</Descriptions.Item>
                <Descriptions.Item label="Thẩm xét">{statusLabel(workspace.technical_review?.status)}</Descriptions.Item>
                <Descriptions.Item label="F.13">{workspace.decision?.decision_number || "—"}</Descriptions.Item>
                <Descriptions.Item label="F.12">{workspace.notification?.notification_number || "—"}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái F.12">{statusLabel(workspace.notification?.status)}</Descriptions.Item>
                <Descriptions.Item label="Tổ chức" span={2}>{workspace.decision?.organization_name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Tiêu chuẩn" span={2}>{workspace.decision?.standard_name || workspace.plan.standard_name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Phạm vi" span={2}>{workspace.decision?.certification_scope || "—"}</Descriptions.Item>
              </Descriptions>
            </Card>

            {!certificate ? (
              <Card title="Cấp giấy chứng nhận" size="small">
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
                    Cấp giấy chứng nhận
                  </Button>
                  {!canIssue ? <Text type="secondary" style={{ marginLeft: 12 }}>Chỉ người ra quyết định hoặc quản trị viên được cấp chứng chỉ.</Text> : null}
                </Form>
              </Card>
            ) : (
              <Card title="Giấy chứng nhận đã cấp" size="small">
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Số chứng chỉ">{certificate.cert_number}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái"><Tag color={normalize(certificate.status) === "active" ? "green" : "orange"}>{statusLabel(certificate.status)}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Ngày cấp">{formatDate(certificate.issue_date)}</Descriptions.Item>
                  <Descriptions.Item label="Ngày hết hạn">{formatDate(certificate.expire_date)}</Descriptions.Item>
                  <Descriptions.Item label="Mã xác minh" span={2}><Text copyable>{certificate.verification_code}</Text></Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {certificate ? (
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

            {certificate && workspace.history.length ? (
              <Card title="Lịch sử trạng thái" size="small">
                <Timeline items={workspace.history.map((item) => ({
                  color: normalize(item.to_status) === "active" ? "green" : "orange",
                  children: (
                    <div>
                      <strong>{statusLabel(item.from_status)} → {statusLabel(item.to_status)}</strong>
                      <div>{item.reason}</div>
                      <Text type="secondary">{formatDate(item.effective_date)} · {item.changed_by_user?.full_name || item.changed_by_user?.username || "Hệ thống"}</Text>
                    </div>
                  ),
                }))} />
              </Card>
            ) : null}
          </Space>
        ) : null}
      </div>
    </Modal>
  );
}
