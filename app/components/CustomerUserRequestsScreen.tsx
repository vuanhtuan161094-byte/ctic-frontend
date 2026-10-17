"use client";

import {
  CheckOutlined,
  EyeOutlined,
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
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Text, Title } = Typography;
const { TextArea } = Input;

type RequestType = "ADD_USER" | "REVOKE_ACCESS" | "REACTIVATE_ACCESS";
type RequestStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
type ResolutionMode = "CREATE_NEW_USER" | "EXISTING_CUSTOMER_USER" | "CONFLICT" | null;

interface UserRef {
  id: string;
  email: string;
  full_name: string | null;
  status?: string | null;
}

interface CustomerUserRequest {
  id: string;
  request_code: string;
  request_type: RequestType;
  status: RequestStatus;
  reason: string;
  requested_email: string | null;
  requested_full_name: string | null;
  target_user_id: string | null;
  resolved_user_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  applied_at: string | null;
  review_comment: string | null;
  customer: { id: string; customer_code: string; company_name: string };
  requester: UserRef;
  target_user: UserRef | null;
  resolved_user: UserRef | null;
  resolution_mode: ResolutionMode;
  existing_user: (UserRef & { username: string }) | null;
}

interface ReviewFormValues {
  comment?: string;
  username?: string;
  temporary_password?: string;
}

const requestTypeLabels: Record<RequestType, string> = {
  ADD_USER: "Bổ sung người dùng",
  REVOKE_ACCESS: "Ngừng quyền truy cập",
  REACTIVATE_ACCESS: "Khôi phục quyền truy cập",
};

const statusMeta: Record<RequestStatus, { label: string; color: string }> = {
  SUBMITTED: { label: "Chờ xem xét", color: "blue" },
  APPROVED: { label: "Đã chấp thuận", color: "green" },
  REJECTED: { label: "Không chấp thuận", color: "red" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CustomerUserRequestsScreen() {
  const breakpoints = Grid.useBreakpoint();
  const useCompactList = !breakpoints.lg;
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ReviewFormValues>();
  const [status, setStatus] = useState<RequestStatus>("SUBMITTED");
  const [selected, setSelected] = useState<CustomerUserRequest | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [mobilePage, setMobilePage] = useState(1);

  const query = useQuery({
    queryKey: ["customer-user-requests", status],
    queryFn: async () => (
      await api.get<CustomerUserRequest[]>(`/customer-user-requests?status=${encodeURIComponent(status)}`)
    ).data,
  });
  const items = useMemo(() => query.data ?? [], [query.data]);
  const mobilePageCount = Math.max(1, Math.ceil(items.length / 10));
  const visibleMobilePage = Math.min(mobilePage, mobilePageCount);
  const visibleItems = items.slice((visibleMobilePage - 1) * 10, visibleMobilePage * 10);

  const reviewMutation = useMutation({
    mutationFn: async (values: ReviewFormValues) => {
      if (!selected || !decision) throw new Error("Chưa chọn quyết định.");
      return (
        await api.post(`/customer-user-requests/${selected.id}/review`, {
          decision,
          comment: values.comment || undefined,
          username: decision === "APPROVE" && selected.resolution_mode === "CREATE_NEW_USER" ? values.username : undefined,
          temporary_password: decision === "APPROVE" && selected.resolution_mode === "CREATE_NEW_USER" ? values.temporary_password : undefined,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success(decision === "APPROVE" ? "Đã chấp thuận và áp dụng quyền Portal." : "Đã từ chối yêu cầu tài khoản Portal.");
      setDecision(null);
      setSelected(null);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-user-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["personal-workspace"] }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
      ]);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const requestedUserLabel = (record: CustomerUserRequest) => record.requested_full_name
    || record.target_user?.full_name
    || record.requested_email
    || record.target_user?.email
    || "—";

  const columns: TableColumnsType<CustomerUserRequest> = [
    { title: "Mã yêu cầu", dataIndex: "request_code", key: "request_code", width: 190, render: (value: string) => <Text strong>{value}</Text> },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.customer.company_name}</Text>
          <Text type="secondary">{record.customer.customer_code}</Text>
        </Space>
      ),
    },
    { title: "Loại", dataIndex: "request_type", key: "request_type", width: 170, render: (value: RequestType) => requestTypeLabels[value] },
    {
      title: "Người dùng",
      key: "target",
      render: (_, record) => requestedUserLabel(record),
    },
    { title: "Ngày gửi", dataIndex: "submitted_at", key: "submitted_at", width: 160, render: (value: string) => formatDateTime(value) },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (value: RequestStatus) => <Tag color={statusMeta[value].color}>{statusMeta[value].label}</Tag>,
    },
    { title: "", key: "action", width: 90, render: (_, record) => <Button icon={<EyeOutlined />} onClick={() => setSelected(record)} size="small">Xem</Button> },
  ];

  const canApprove = selected?.status === "SUBMITTED" && selected.resolution_mode !== "CONFLICT";
  const requiresCredentials = selected?.request_type === "ADD_USER" && selected.resolution_mode === "CREATE_NEW_USER";

  return (
    <div className="projects-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">QUẢN TRỊ HỆ THỐNG</span>
          <Title level={2}>Yêu cầu tài khoản khách hàng</Title>
          <Text type="secondary">Chỉ Admin được tạo tài khoản hoặc thay đổi quyền Portal. Yêu cầu từ khách hàng không tự cấp quyền và không thể thay đổi vai trò nội bộ.</Text>
        </div>
        <Space className="customer-user-requests__toolbar">
          <Select<RequestStatus>
            onChange={setStatus}
            options={Object.entries(statusMeta).map(([value, meta]) => ({ value: value as RequestStatus, label: meta.label }))}
            value={status}
            style={{ width: 180 }}
          />
          <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button>
        </Space>
      </div>

      {query.isError ? (
        <Alert description={getErrorMessage(query.error)} message="Không tải được yêu cầu tài khoản" showIcon type="error" />
      ) : (
        <Card loading={useCompactList && query.isLoading}>
          {useCompactList ? (
            items.length ? (
              <>
                <div aria-label="Yêu cầu tài khoản khách hàng" className="portal-mobile-list">
                  {visibleItems.map((record) => (
                    <article className="portal-mobile-card" key={record.id}>
                      <div className="portal-mobile-card__heading">
                        <div className="portal-mobile-card__identity">
                          <strong>{record.request_code}</strong>
                          <small>{requestTypeLabels[record.request_type]}</small>
                        </div>
                        <Tag color={statusMeta[record.status].color}>{statusMeta[record.status].label}</Tag>
                      </div>
                      <div className="portal-mobile-card__meta">
                        <span><strong>Khách hàng:</strong> {record.customer.company_name} · {record.customer.customer_code}</span>
                        <span><strong>Người dùng:</strong> {requestedUserLabel(record)}</span>
                        <span><strong>Ngày gửi:</strong> {formatDateTime(record.submitted_at)}</span>
                      </div>
                      <Space className="portal-mobile-card__actions portal-mobile-card__actions--single" wrap>
                        <Button icon={<EyeOutlined />} onClick={() => setSelected(record)} size="small">Xem yêu cầu</Button>
                      </Space>
                    </article>
                  ))}
                </div>
                {items.length > 10 ? (
                  <Pagination
                    className="compact-mobile-pagination"
                    current={visibleMobilePage}
                    onChange={setMobilePage}
                    pageSize={10}
                    responsive
                    showSizeChanger={false}
                    showTotal={(total) => `${total} yêu cầu`}
                    total={items.length}
                  />
                ) : null}
              </>
            ) : <Empty description="Không có yêu cầu trong trạng thái này" />
          ) : (
            <Table<CustomerUserRequest>
              columns={columns}
              dataSource={items}
              loading={query.isLoading}
              locale={{ emptyText: <Empty description="Không có yêu cầu trong trạng thái này" /> }}
              pagination={{ pageSize: 20 }}
              rowKey="id"
            />
          )}
        </Card>
      )}

      <Drawer
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        title={selected ? `${selected.request_code} · ${selected.customer.customer_code}` : "Yêu cầu tài khoản"}
        width={breakpoints.md ? 680 : "100%"}
      >
        {selected ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Alert description={selected.reason} message="Lý do yêu cầu" showIcon type="info" />
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Loại yêu cầu">{requestTypeLabels[selected.request_type]}</Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{selected.customer.company_name}</Descriptions.Item>
              <Descriptions.Item label="Người gửi">{selected.requester.full_name || selected.requester.email}</Descriptions.Item>
              <Descriptions.Item label="Người dùng đề nghị">{selected.requested_full_name || selected.target_user?.full_name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Email">{selected.requested_email || selected.target_user?.email || "—"}</Descriptions.Item>
              <Descriptions.Item label="Ngày gửi">{formatDateTime(selected.submitted_at)}</Descriptions.Item>
            </Descriptions>

            {selected.request_type === "ADD_USER" ? (
              selected.resolution_mode === "CREATE_NEW_USER" ? (
                <Alert message="Chưa có tài khoản trùng email. Khi chấp thuận, Admin phải đặt username và mật khẩu tạm thời." showIcon type="warning" />
              ) : selected.resolution_mode === "EXISTING_CUSTOMER_USER" ? (
                <Alert description={selected.existing_user ? `${selected.existing_user.username} · ${selected.existing_user.email}` : undefined} message="Sẽ dùng lại tài khoản CUSTOMER hiện có và chỉ cập nhật mapping Portal." showIcon type="success" />
              ) : (
                <Alert message="Email đang thuộc tài khoản không phù hợp để cấp Portal tự động. Cần xử lý tài khoản trong Quản trị hệ thống hoặc từ chối yêu cầu." showIcon type="error" />
              )
            ) : null}

            {selected.review_comment ? <Alert description={selected.review_comment} message="Ý kiến xem xét" showIcon type={selected.status === "REJECTED" ? "warning" : "success"} /> : null}

            {selected.status === "SUBMITTED" ? (
              <Space>
                <Button disabled={!canApprove} icon={<CheckOutlined />} onClick={() => { form.resetFields(); setDecision("APPROVE"); }} type="primary">Chấp thuận</Button>
                <Button danger icon={<StopOutlined />} onClick={() => { form.resetFields(); setDecision("REJECT"); }}>Từ chối</Button>
              </Space>
            ) : null}
          </Space>
        ) : null}
      </Drawer>

      <Modal
        destroyOnHidden
        okButtonProps={{ danger: decision === "REJECT", loading: reviewMutation.isPending }}
        okText={decision === "APPROVE" ? "Xác nhận chấp thuận" : "Xác nhận từ chối"}
        onCancel={() => { setDecision(null); form.resetFields(); }}
        onOk={() => form.submit()}
        open={Boolean(decision)}
        title={decision === "APPROVE" ? "Chấp thuận yêu cầu tài khoản" : "Từ chối yêu cầu tài khoản"}
      >
        <Form<ReviewFormValues> form={form} layout="vertical" onFinish={(values) => reviewMutation.mutate(values)}>
          {decision === "APPROVE" && requiresCredentials ? (
            <>
              <Alert message="Mật khẩu tạm thời chỉ được dùng để tạo tài khoản và không được lưu trong yêu cầu/audit log." showIcon style={{ marginBottom: 16 }} type="warning" />
              <Form.Item label="Username" name="username" rules={[{ required: true, message: "Nhập username cho tài khoản mới" }, { min: 3, message: "Username tối thiểu 3 ký tự" }]}>
                <Input maxLength={50} autoComplete="off" />
              </Form.Item>
              <Form.Item label="Mật khẩu tạm thời" name="temporary_password" rules={[{ required: true, message: "Nhập mật khẩu tạm thời" }, { min: 8, message: "Mật khẩu tối thiểu 8 ký tự" }]}>
                <Input.Password maxLength={100} autoComplete="new-password" />
              </Form.Item>
            </>
          ) : null}
          <Form.Item
            label="Ý kiến xem xét"
            name="comment"
            rules={decision === "REJECT" ? [{ required: true, message: "Nhập lý do từ chối" }] : undefined}
          >
            <TextArea maxLength={2000} rows={4} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
