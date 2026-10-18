"use client";

import {
  CloudUploadOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UploadFile } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { TableColumnsType } from "antd";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { openDocumentFile } from "../lib/document-file-client";

const { Text, Title } = Typography;
const { TextArea } = Input;

type Category = "LEGAL" | "MANAGEMENT_SYSTEM" | "SCOPE_SITE" | "EMPLOYEE" | "OTHER";
type RequestStatus = "REQUESTED" | "SUBMITTED" | "REVISION_REQUIRED" | "ACCEPTED" | "CANCELLED";

interface PortalDocument {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  version_no: number;
  is_current: boolean;
  note: string | null;
  created_at: string;
  category?: Category;
  download_url: string;
}

interface PortalApplication {
  id: string;
  application_code: string;
  standard_name: string;
  status: string;
  customers: { customer_code: string; company_name: string };
  documents: PortalDocument[];
}

interface PortalRequest {
  id: string;
  request_code: string;
  application_id: string;
  category: Category;
  title: string;
  description: string | null;
  due_date: string | null;
  status: RequestStatus;
  response_note: string | null;
  submitted_at: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  application: { application_code: string; standard_name: string };
  documents: PortalDocument[];
}

interface PortalDocumentsPayload {
  applications: PortalApplication[];
  requests: PortalRequest[];
}

const categoryLabels: Record<Category, string> = {
  LEGAL: "Pháp lý",
  MANAGEMENT_SYSTEM: "Hệ thống quản lý",
  SCOPE_SITE: "Phạm vi / địa điểm",
  EMPLOYEE: "Nhân sự",
  OTHER: "Khác",
};

const statusMeta: Record<RequestStatus, { label: string; color: string }> = {
  REQUESTED: { label: "Chờ cung cấp", color: "orange" },
  SUBMITTED: { label: "Đã gửi - chờ xem xét", color: "blue" },
  REVISION_REQUIRED: { label: "Cần bổ sung", color: "volcano" },
  ACCEPTED: { label: "Đã chấp nhận", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CustomerDocumentsScreen() {
  const breakpoints = Grid.useBreakpoint();
  const useCompactPortalList = !breakpoints.lg;
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [applicationModal, setApplicationModal] = useState<PortalApplication | null>(null);
  const [applicationCategory, setApplicationCategory] = useState<Category>("LEGAL");
  const [applicationFiles, setApplicationFiles] = useState<UploadFile[]>([]);
  const [requestModal, setRequestModal] = useState<PortalRequest | null>(null);
  const [requestFiles, setRequestFiles] = useState<UploadFile[]>([]);
  const [responseNote, setResponseNote] = useState("");
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [requestPage, setRequestPage] = useState(1);
  const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(() => new Set());

  const query = useQuery({
    queryKey: ["customer-portal", "documents"],
    queryFn: async () => (await api.get<PortalDocumentsPayload>("/customer-portal/me/documents")).data,
  });

  const applications = useMemo(() => query.data?.applications ?? [], [query.data?.applications]);
  const requests = useMemo(() => query.data?.requests ?? [], [query.data?.requests]);
  const requestPageCount = Math.max(1, Math.ceil(requests.length / 10));
  const visibleRequestPage = Math.min(requestPage, requestPageCount);
  const visibleRequests = requests.slice((visibleRequestPage - 1) * 10, visibleRequestPage * 10);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customer-portal", "documents"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-portal", "notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-portal", "dashboard"] }),
    ]);
  };

  const uploadApplicationMutation = useMutation({
    mutationFn: async () => {
      if (!applicationModal) throw new Error("Chưa chọn đơn đăng ký.");
      const file = applicationFiles[0]?.originFileObj;
      if (!file) throw new Error("Chọn tệp cần tải lên.");
      const body = new FormData();
      body.append("file", file);
      body.append("category", applicationCategory);
      return (await api.post(`/customer-portal/me/documents/applications/${applicationModal.id}/upload`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      })).data;
    },
    onSuccess: async () => {
      message.success("Đã tải tài liệu đơn đăng ký.");
      setApplicationModal(null);
      setApplicationFiles([]);
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const submitResponseMutation = useMutation({
    mutationFn: async () => {
      if (!requestModal) throw new Error("Chưa chọn yêu cầu tài liệu.");
      const file = requestFiles[0]?.originFileObj;
      if (!file) throw new Error("Chọn tài liệu phản hồi.");
      const body = new FormData();
      body.append("file", file);
      if (responseNote.trim()) body.append("note", responseNote.trim());
      await api.post(`/customer-portal/me/documents/requests/${requestModal.id}/upload`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return (await api.post(`/customer-portal/me/documents/requests/${requestModal.id}/submit`, {
        note: responseNote.trim() || undefined,
      })).data;
    },
    onSuccess: async () => {
      message.success("Đã gửi tài liệu phản hồi tới điều phối viên.");
      setRequestModal(null);
      setRequestFiles([]);
      setResponseNote("");
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openFile = async (file: PortalDocument) => {
    setOpeningFileId(file.id);
    try {
      await openDocumentFile({
        url: file.download_url,
        filename: file.original_name,
        mimeType: file.mime_type,
        title: file.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setOpeningFileId(null);
    }
  };

  const openRequestModal = (item: PortalRequest) => {
    setRequestModal(item);
    setRequestFiles([]);
    setResponseNote("");
  };

  const renderRequestDetails = (item: PortalRequest) => (
    <Space orientation="vertical" style={{ width: "100%" }}>
      {item.description ? <Alert description={item.description} title="Nội dung yêu cầu" showIcon type="info" /> : null}
      {item.review_comment ? <Alert description={item.review_comment} title="Ý kiến xem xét gần nhất" showIcon type={item.status === "REVISION_REQUIRED" ? "warning" : "success"} /> : null}
      {item.documents.length ? (
        <Space className="portal-mobile-card__documents" orientation="vertical" style={{ width: "100%" }}>
          {item.documents.map((file) => (
            <Button key={file.id} loading={openingFileId === file.id} onClick={() => void openFile(file)} size="small">
              {file.original_name} · v{file.version_no} · {formatSize(file.file_size)}
            </Button>
          ))}
        </Space>
      ) : <Text type="secondary">Chưa có tài liệu phản hồi.</Text>}
    </Space>
  );

  const requestColumns: TableColumnsType<PortalRequest> = [
    {
      title: "Yêu cầu",
      key: "request",
      render: (_, item) => (
        <div style={{ display: "grid", rowGap: 2 }}>
          <Space size={8} wrap>
            <Text strong>{item.request_code}</Text>
            <Text type="secondary">{item.application.application_code} · {categoryLabels[item.category]}</Text>
          </Space>
          <Text>{item.title}</Text>
        </div>
      ),
    },
    { title: "Hạn", dataIndex: "due_date", key: "due_date", width: 120, render: formatDate },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 190,
      render: (value: RequestStatus) => <Tag color={statusMeta[value].color}>{statusMeta[value].label}</Tag>,
    },
    {
      title: "Tài liệu",
      key: "documents",
      width: 130,
      render: (_, item) => `${item.documents.length} phiên bản`,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_, item) => (
        <Button
          disabled={!(["REQUESTED", "REVISION_REQUIRED"] as RequestStatus[]).includes(item.status)}
          icon={<SendOutlined />}
          onClick={() => {
            setRequestModal(item);
            setRequestFiles([]);
            setResponseNote("");
          }}
          size="small"
          type={item.status === "REVISION_REQUIRED" ? "primary" : "default"}
        >
          Gửi tài liệu
        </Button>
      ),
    },
  ];

  return (
    <div className="projects-screen customer-portal-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">Cổng khách hàng</span>
          <Title level={2}>Tài liệu & yêu cầu bổ sung</Title>
          <Text type="secondary">Tài liệu kèm đơn đăng ký, yêu cầu bổ sung từ tổ chức chứng nhận và lịch sử phiên bản có kiểm soát.</Text>
        </div>
      </div>

      {query.isLoading ? (
        <Card><Alert showIcon title="Đang tải tài liệu Portal..." type="info" /></Card>
      ) : query.isError ? (
        <Alert
          action={<Button onClick={() => void query.refetch()}>Thử lại</Button>}
          description={getErrorMessage(query.error)}
          showIcon
          title="Không tải được tài liệu Portal"
          type="error"
        />
      ) : (
      <>
      <Card style={{ marginBottom: 16 }} title={<Space><FileSearchOutlined />Yêu cầu bổ sung tài liệu</Space>}>
        {useCompactPortalList ? (
          requests.length ? (
            <>
              <div aria-label="Danh sách yêu cầu bổ sung tài liệu" className="portal-mobile-list">
                {visibleRequests.map((item) => {
                  const isExpanded = expandedRequestIds.has(item.id);
                  return (
                    <article className="portal-mobile-card" key={item.id}>
                      <div className="portal-mobile-card__heading">
                        <div className="portal-mobile-card__identity">
                          <strong>{item.request_code}</strong>
                          <small>{item.title}</small>
                        </div>
                        <Tag color={statusMeta[item.status].color}>{statusMeta[item.status].label}</Tag>
                      </div>
                      <div className="portal-mobile-card__meta">
                        <span><strong>Hồ sơ:</strong> {item.application.application_code} · {categoryLabels[item.category]}</span>
                        <span><strong>Hạn cung cấp:</strong> {formatDate(item.due_date)}</span>
                        <span><strong>Tài liệu:</strong> {item.documents.length} phiên bản</span>
                      </div>
                      {isExpanded ? (
                        <div className="portal-mobile-card__details" id={`request-details-${item.id}`}>
                          {renderRequestDetails(item)}
                        </div>
                      ) : null}
                      <Space className="portal-mobile-card__actions" wrap>
                        <Button
                          aria-controls={`request-details-${item.id}`}
                          aria-expanded={isExpanded}
                          icon={<FileSearchOutlined />}
                          onClick={() => setExpandedRequestIds((current) => {
                            const next = new Set(current);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          })}
                          size="small"
                        >
                          {isExpanded ? "Ẩn chi tiết" : "Chi tiết & tệp"}
                        </Button>
                        <Button
                          disabled={item.status !== "REQUESTED" && item.status !== "REVISION_REQUIRED"}
                          icon={<SendOutlined />}
                          onClick={() => openRequestModal(item)}
                          size="small"
                          type={item.status === "REVISION_REQUIRED" ? "primary" : "default"}
                        >
                          Gửi tài liệu
                        </Button>
                      </Space>
                    </article>
                  );
                })}
              </div>
              {requests.length > 10 ? (
                <Pagination
                  className="compact-mobile-pagination"
                  current={visibleRequestPage}
                  onChange={setRequestPage}
                  pageSize={10}
                  responsive
                  showSizeChanger={false}
                  showTotal={(total) => `${total} yêu cầu`}
                  total={requests.length}
                />
              ) : null}
            </>
          ) : <Empty description="Không có yêu cầu bổ sung tài liệu" />
        ) : (
          <Table<PortalRequest>
            columns={requestColumns}
            dataSource={requests}
            loading={query.isLoading}
            locale={{ emptyText: <Empty description="Không có yêu cầu bổ sung tài liệu" /> }}
            pagination={{ pageSize: 10 }}
            rowKey="id"
            size="small"
            expandable={{ expandedRowRender: renderRequestDetails }}
          />
        )}
      </Card>

      <Card title={<Space><FileDoneOutlined />Tài liệu kèm đơn đăng ký</Space>}>
        {applications.length ? (
          <Collapse
            items={applications.map((application) => ({
              key: application.id,
              label: `${application.application_code} · ${application.standard_name}`,
              extra: (
                <Button
                  icon={<CloudUploadOutlined />}
                  onClick={(event) => {
                    event.stopPropagation();
                    setApplicationModal(application);
                    setApplicationFiles([]);
                    setApplicationCategory("LEGAL");
                  }}
                  size="small"
                >
                  Tải tài liệu
                </Button>
              ),
              children: application.documents.length ? (
                <Space orientation="vertical" style={{ width: "100%" }}>
                  {application.documents.map((file) => (
                    <Button key={file.id} loading={openingFileId === file.id} onClick={() => void openFile(file)}>
                      {categoryLabels[file.category ?? "OTHER"]} · {file.original_name} · v{file.version_no}{file.is_current ? " · hiện hành" : ""}
                    </Button>
                  ))}
                </Space>
              ) : <Empty description="Chưa có tài liệu kèm đơn" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            }))}
          />
        ) : <Empty description="Chưa có đơn đăng ký" />}
      </Card>
      </>
      )}

      <Modal
        okButtonProps={{ disabled: applicationFiles.length === 0, loading: uploadApplicationMutation.isPending }}
        okText="Tải lên"
        onCancel={() => setApplicationModal(null)}
        onOk={() => uploadApplicationMutation.mutate()}
        open={Boolean(applicationModal)}
        title={applicationModal ? `Tải tài liệu · ${applicationModal.application_code}` : "Tải tài liệu"}
      >
        <Form layout="vertical">
          <Form.Item label="Nhóm tài liệu">
            <Select<Category>
              onChange={setApplicationCategory}
              options={Object.entries(categoryLabels).map(([value, label]) => ({ value: value as Category, label }))}
              value={applicationCategory}
            />
          </Form.Item>
          <Form.Item label="Tệp">
            <Upload
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              beforeUpload={() => false}
              fileList={applicationFiles}
              maxCount={1}
              onChange={({ fileList }) => setApplicationFiles(fileList.slice(-1))}
            >
              <Button icon={<CloudUploadOutlined />}>Chọn PDF, Word, JPG hoặc PNG</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        okButtonProps={{ disabled: requestFiles.length === 0, loading: submitResponseMutation.isPending }}
        okText="Tải và gửi phản hồi"
        onCancel={() => setRequestModal(null)}
        onOk={() => submitResponseMutation.mutate()}
        open={Boolean(requestModal)}
        title={requestModal ? `${requestModal.request_code} · Gửi tài liệu phản hồi` : "Gửi tài liệu phản hồi"}
      >
        {requestModal?.review_comment ? <Alert description={requestModal.review_comment} title="Ý kiến cần xử lý" showIcon style={{ marginBottom: 16 }} type="warning" /> : null}
        <Form layout="vertical">
          <Form.Item label="Tài liệu phản hồi" required>
            <Upload
              beforeUpload={() => false}
              fileList={requestFiles}
              maxCount={1}
              onChange={({ fileList }) => setRequestFiles(fileList.slice(-1))}
            >
              <Button icon={<CloudUploadOutlined />}>Chọn tệp</Button>
            </Upload>
          </Form.Item>
          <Form.Item label="Ghi chú phản hồi">
            <TextArea maxLength={4000} onChange={(event) => setResponseNote(event.target.value)} rows={4} showCount value={responseNote} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
