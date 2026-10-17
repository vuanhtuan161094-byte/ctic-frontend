"use client";

import {
  CheckOutlined,
  EyeOutlined,
  FileAddOutlined,
  ReloadOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
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
  Grid,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { openDocumentFile } from "../lib/document-file-client";

const { Text, Title } = Typography;
const { TextArea } = Input;

type Category = "LEGAL" | "MANAGEMENT_SYSTEM" | "SCOPE_SITE" | "EMPLOYEE" | "OTHER";
type RequestStatus = "REQUESTED" | "SUBMITTED" | "REVISION_REQUIRED" | "ACCEPTED" | "CANCELLED";

interface DocumentFile {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  version_no: number;
  is_current: boolean;
  download_url: string;
}

interface DocumentRequest {
  id: string;
  request_code: string;
  category: Category;
  title: string;
  description: string | null;
  due_date: string | null;
  status: RequestStatus;
  response_note: string | null;
  submitted_at: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  customer: { customer_code: string; company_name: string };
  application: { application_code: string; standard_name: string };
  responder: { id: string; full_name: string | null; email: string } | null;
  documents: DocumentFile[];
}

interface ApplicationOption {
  id: string;
  application_code: string;
  standard_name: string;
  customers: { customer_code: string; company_name: string };
}

interface CreateValues {
  application_id: string;
  category: Category;
  title: string;
  description?: string;
  due_date?: Dayjs;
}

interface ReviewValues {
  comment?: string;
}

const categoryLabels: Record<Category, string> = {
  LEGAL: "Pháp lý",
  MANAGEMENT_SYSTEM: "Hệ thống quản lý",
  SCOPE_SITE: "Phạm vi / địa điểm",
  EMPLOYEE: "Nhân sự",
  OTHER: "Khác",
};

const statusMeta: Record<RequestStatus, { label: string; color: string }> = {
  REQUESTED: { label: "Chờ khách hàng", color: "orange" },
  SUBMITTED: { label: "Chờ xem xét", color: "blue" },
  REVISION_REQUIRED: { label: "Yêu cầu bổ sung", color: "volcano" },
  ACCEPTED: { label: "Đã chấp nhận", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function CustomerDocumentRequestsScreen() {
  const breakpoints = Grid.useBreakpoint();
  const useCompactList = !breakpoints.lg;
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [createForm] = Form.useForm<CreateValues>();
  const [reviewForm] = Form.useForm<ReviewValues>();
  const [status, setStatus] = useState<RequestStatus | "ALL">("SUBMITTED");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<DocumentRequest | null>(null);
  const [decision, setDecision] = useState<"ACCEPT" | "REVISION_REQUIRED" | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [mobilePage, setMobilePage] = useState(1);

  const requestQuery = useQuery({
    queryKey: ["customer-document-requests", status],
    queryFn: async () => (
      await api.get<DocumentRequest[]>(`/customer-document-requests${status === "ALL" ? "" : `?status=${status}`}`)
    ).data,
  });

  const applicationsQuery = useQuery({
    queryKey: ["applications", "document-request-options"],
    queryFn: async () => {
      const response = await api.get<ApplicationOption[]>("/certification-applications");
      return response.data;
    },
  });

  const requests = useMemo(() => requestQuery.data ?? [], [requestQuery.data]);
  const mobilePageCount = Math.max(1, Math.ceil(requests.length / 10));
  const visibleMobilePage = Math.min(mobilePage, mobilePageCount);
  const visibleRequests = requests.slice((visibleMobilePage - 1) * 10, visibleMobilePage * 10);
  const applicationOptions = useMemo(
    () => (applicationsQuery.data ?? []).map((item) => ({
      value: item.id,
      label: `${item.application_code} · ${item.customers?.company_name ?? "Khách hàng"} · ${item.standard_name}`,
    })),
    [applicationsQuery.data],
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customer-document-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["personal-workspace"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (values: CreateValues) => (
      await api.post("/customer-document-requests", {
        ...values,
        due_date: values.due_date?.format("YYYY-MM-DD"),
      })
    ).data,
    onSuccess: async () => {
      message.success("Đã gửi yêu cầu bổ sung tài liệu tới khách hàng.");
      setCreateOpen(false);
      createForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const reviewMutation = useMutation({
    mutationFn: async (values: ReviewValues) => {
      if (!selected || !decision) throw new Error("Chưa chọn quyết định.");
      return (await api.post(`/customer-document-requests/${selected.id}/review`, {
        decision,
        comment: values.comment?.trim() || undefined,
      })).data;
    },
    onSuccess: async () => {
      message.success(decision === "ACCEPT" ? "Đã chấp nhận tài liệu khách hàng." : "Đã gửi yêu cầu bổ sung lại.");
      setDecision(null);
      setSelected(null);
      reviewForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openFile = async (file: DocumentFile) => {
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

  const columns: TableColumnsType<DocumentRequest> = [
    { title: "Mã", dataIndex: "request_code", key: "request_code", width: 190, render: (value: string) => <Text strong>{value}</Text> },
    {
      title: "Khách hàng / Đơn",
      key: "application",
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Text strong>{item.customer.company_name}</Text>
          <Text type="secondary">{item.application.application_code} · {item.application.standard_name}</Text>
        </Space>
      ),
    },
    { title: "Tài liệu yêu cầu", dataIndex: "title", key: "title" },
    { title: "Hạn", dataIndex: "due_date", key: "due_date", width: 110, render: formatDate },
    { title: "Trạng thái", dataIndex: "status", key: "status", width: 160, render: (value: RequestStatus) => <Tag color={statusMeta[value].color}>{statusMeta[value].label}</Tag> },
    { title: "", key: "action", width: 90, render: (_, item) => <Button icon={<EyeOutlined />} onClick={() => setSelected(item)} size="small">Xem</Button> },
  ];

  return (
    <div className="projects-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ CHỨNG NHẬN</span>
          <Title level={2}>Yêu cầu tài liệu khách hàng</Title>
          <Text type="secondary">Điều phối viên tạo yêu cầu theo đơn đăng ký và xem xét phản hồi có truy xuất phiên bản.</Text>
        </div>
        <Space className="customer-document-requests__toolbar">
          <Select
            onChange={setStatus}
            options={[{ value: "ALL", label: "Tất cả" }, ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))]}
            value={status}
            style={{ width: 180 }}
          />
          <Button icon={<ReloadOutlined />} loading={requestQuery.isFetching} onClick={() => void requestQuery.refetch()}>Làm mới</Button>
          <Button icon={<FileAddOutlined />} onClick={() => { createForm.resetFields(); setCreateOpen(true); }} type="primary">Tạo yêu cầu</Button>
        </Space>
      </div>

      {requestQuery.isError ? <Alert description={getErrorMessage(requestQuery.error)} message="Không tải được yêu cầu tài liệu" showIcon type="error" /> : (
        <Card loading={useCompactList && requestQuery.isLoading}>
          {useCompactList ? (
            requests.length ? (
              <>
                <div aria-label="Yêu cầu tài liệu khách hàng" className="portal-mobile-list">
                  {visibleRequests.map((item) => (
                    <article className="portal-mobile-card" key={item.id}>
                      <div className="portal-mobile-card__heading">
                        <div className="portal-mobile-card__identity">
                          <strong>{item.request_code}</strong>
                          <small>{item.title}</small>
                        </div>
                        <Tag color={statusMeta[item.status].color}>{statusMeta[item.status].label}</Tag>
                      </div>
                      <div className="portal-mobile-card__meta">
                        <span><strong>Khách hàng:</strong> {item.customer.company_name} · {item.customer.customer_code}</span>
                        <span><strong>Đơn đăng ký:</strong> {item.application.application_code} · {item.application.standard_name}</span>
                        <span><strong>Nhóm:</strong> {categoryLabels[item.category]}</span>
                        <span><strong>Hạn cung cấp:</strong> {formatDate(item.due_date)}</span>
                      </div>
                      <Space className="portal-mobile-card__actions portal-mobile-card__actions--single" wrap>
                        <Button icon={<EyeOutlined />} onClick={() => setSelected(item)} size="small">Xem yêu cầu</Button>
                      </Space>
                    </article>
                  ))}
                </div>
                {requests.length > 10 ? (
                  <Pagination
                    className="compact-mobile-pagination"
                    current={visibleMobilePage}
                    onChange={setMobilePage}
                    pageSize={10}
                    responsive
                    showSizeChanger={false}
                    showTotal={(total) => `${total} yêu cầu`}
                    total={requests.length}
                  />
                ) : null}
              </>
            ) : <Empty description="Không có yêu cầu tài liệu" />
          ) : (
            <Table<DocumentRequest>
              columns={columns}
              dataSource={requests}
              loading={requestQuery.isLoading}
              locale={{ emptyText: <Empty description="Không có yêu cầu tài liệu" /> }}
              pagination={{ pageSize: 20 }}
              rowKey="id"
            />
          )}
        </Card>
      )}

      <Modal
        okButtonProps={{ loading: createMutation.isPending }}
        okText="Gửi yêu cầu"
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        open={createOpen}
        title="Tạo yêu cầu bổ sung tài liệu"
      >
        <Form<CreateValues> form={createForm} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item label="Đơn đăng ký" name="application_id" rules={[{ required: true, message: "Chọn đơn đăng ký" }]}>
            <Select loading={applicationsQuery.isLoading} options={applicationOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item label="Nhóm tài liệu" name="category" rules={[{ required: true }]} initialValue="LEGAL">
            <Select options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item label="Tên tài liệu / yêu cầu" name="title" rules={[{ required: true, message: "Nhập tên tài liệu cần cung cấp" }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <TextArea maxLength={4000} rows={4} showCount />
          </Form.Item>
          <Form.Item label="Hạn cung cấp" name="due_date">
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        title={selected ? `${selected.request_code} · ${selected.customer.customer_code}` : "Yêu cầu tài liệu"}
        width={breakpoints.md ? 720 : "100%"}
      >
        {selected ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Khách hàng">{selected.customer.company_name}</Descriptions.Item>
              <Descriptions.Item label="Đơn đăng ký">{selected.application.application_code}</Descriptions.Item>
              <Descriptions.Item label="Nhóm">{categoryLabels[selected.category]}</Descriptions.Item>
              <Descriptions.Item label="Yêu cầu">{selected.title}</Descriptions.Item>
              <Descriptions.Item label="Hạn">{formatDate(selected.due_date)}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><Tag color={statusMeta[selected.status].color}>{statusMeta[selected.status].label}</Tag></Descriptions.Item>
            </Descriptions>
            {selected.description ? <Alert description={selected.description} message="Nội dung yêu cầu" showIcon type="info" /> : null}
            {selected.response_note ? <Alert description={selected.response_note} message="Ghi chú phản hồi của khách hàng" showIcon type="info" /> : null}
            {selected.review_comment ? <Alert description={selected.review_comment} message="Ý kiến xem xét gần nhất" showIcon type={selected.status === "REVISION_REQUIRED" ? "warning" : "success"} /> : null}
            <Card size="small" title="Tài liệu phản hồi">
              {selected.documents.length ? (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {selected.documents.map((file) => (
                    <Button key={file.id} loading={openingFileId === file.id} onClick={() => void openFile(file)}>
                      {file.original_name} · v{file.version_no}{file.is_current ? " · hiện hành" : ""}
                    </Button>
                  ))}
                </Space>
              ) : <Text type="secondary">Khách hàng chưa tải tài liệu phản hồi.</Text>}
            </Card>
            {selected.status === "SUBMITTED" ? (
              <Space>
                <Button icon={<CheckOutlined />} onClick={() => { reviewForm.resetFields(); setDecision("ACCEPT"); }} type="primary">Chấp nhận</Button>
                <Button danger icon={<StopOutlined />} onClick={() => { reviewForm.resetFields(); setDecision("REVISION_REQUIRED"); }}>Yêu cầu bổ sung</Button>
              </Space>
            ) : null}
          </Space>
        ) : null}
      </Drawer>

      <Modal
        okButtonProps={{ danger: decision === "REVISION_REQUIRED", loading: reviewMutation.isPending }}
        okText={decision === "ACCEPT" ? "Xác nhận chấp nhận" : "Gửi yêu cầu bổ sung"}
        onCancel={() => setDecision(null)}
        onOk={() => reviewForm.submit()}
        open={Boolean(decision)}
        title={decision === "ACCEPT" ? "Chấp nhận tài liệu" : "Yêu cầu khách hàng bổ sung/chỉnh sửa"}
      >
        <Form<ReviewValues> form={reviewForm} layout="vertical" onFinish={(values) => reviewMutation.mutate(values)}>
          <Form.Item label="Ý kiến xem xét" name="comment" rules={decision === "REVISION_REQUIRED" ? [{ required: true, message: "Nhập nội dung cần bổ sung/chỉnh sửa" }] : undefined}>
            <TextArea maxLength={4000} rows={4} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
