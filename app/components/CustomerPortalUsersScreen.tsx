"use client";

import {
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  UndoOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
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

interface PortalUser {
  access_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  account_status: string;
  access_status: string;
  created_at: string;
  updated_at: string;
}

interface AccessHistory {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  action: "ASSIGNED" | "REACTIVATED" | "REVOKED";
  source: "CUSTOMER_REQUEST" | "CERTIFICATION_BODY";
  request_code: string | null;
  changed_at: string;
}

interface CustomerAccessGroup {
  customer_id: string;
  customer_code: string;
  company_name: string;
  users: PortalUser[];
  history: AccessHistory[];
}

interface UserAccessRequest {
  id: string;
  request_code: string;
  customer_id: string;
  request_type: RequestType;
  target_user_id: string | null;
  requested_email: string | null;
  requested_full_name: string | null;
  status: RequestStatus;
  reason: string;
  review_comment: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  customer: { customer_code: string; company_name: string };
  target_user: { email: string; full_name: string | null } | null;
  resolved_user: { email: string; full_name: string | null } | null;
}

interface RequestFormValues {
  email?: string;
  full_name?: string;
  reason: string;
}

const requestTypeLabels: Record<RequestType, string> = {
  ADD_USER: "Bổ sung người dùng",
  REVOKE_ACCESS: "Ngừng quyền truy cập",
  REACTIVATE_ACCESS: "Khôi phục quyền truy cập",
};

const requestStatusMeta: Record<RequestStatus, { label: string; color: string }> = {
  SUBMITTED: { label: "Chờ xem xét", color: "blue" },
  APPROVED: { label: "Đã chấp thuận", color: "green" },
  REJECTED: { label: "Không chấp thuận", color: "red" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

const historyLabels: Record<AccessHistory["action"], string> = {
  ASSIGNED: "Đã cấp quyền",
  REACTIVATED: "Đã khôi phục",
  REVOKED: "Đã ngừng",
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

export function CustomerPortalUsersScreen() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<RequestFormValues>();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [targetUser, setTargetUser] = useState<PortalUser | null>(null);

  const accessQuery = useQuery({
    queryKey: ["customer-portal", "user-access"],
    queryFn: async () => (
      await api.get<CustomerAccessGroup[]>("/customer-portal/me/user-access")
    ).data,
  });

  const requestsQuery = useQuery({
    queryKey: ["customer-portal", "user-access-requests"],
    queryFn: async () => (
      await api.get<UserAccessRequest[]>("/customer-portal/me/user-access-requests")
    ).data,
  });

  const groups = useMemo(() => accessQuery.data ?? [], [accessQuery.data]);
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const effectiveCustomerId = selectedCustomerId ?? groups[0]?.customer_id ?? null;
  const selectedGroup = useMemo(
    () => groups.find((group) => group.customer_id === effectiveCustomerId) ?? null,
    [effectiveCustomerId, groups],
  );
  const customerRequests = useMemo(
    () => requests.filter((request) => request.customer_id === effectiveCustomerId),
    [effectiveCustomerId, requests],
  );
  const activeCount = selectedGroup?.users.filter((user) => user.access_status.toLowerCase() === "active").length ?? 0;

  const mutation = useMutation({
    mutationFn: async (values: RequestFormValues) => {
      if (!selectedGroup || !requestType) throw new Error("Chưa chọn tổ chức hoặc loại yêu cầu.");
      return (
        await api.post("/customer-portal/me/user-access-requests", {
          customer_id: selectedGroup.customer_id,
          request_type: requestType,
          target_user_id: targetUser?.user_id,
          email: requestType === "ADD_USER" ? values.email : undefined,
          full_name: requestType === "ADD_USER" ? values.full_name : undefined,
          reason: values.reason,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success("Đã gửi yêu cầu tới tổ chức chứng nhận để phê duyệt.");
      setRequestType(null);
      setTargetUser(null);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-portal", "user-access"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-portal", "user-access-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-portal", "dashboard"] }),
      ]);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openRequest = (type: RequestType, user?: PortalUser) => {
    setRequestType(type);
    setTargetUser(user ?? null);
    form.resetFields();
  };

  const userColumns: TableColumnsType<PortalUser> = [
    {
      title: "Người dùng",
      key: "user",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.full_name || record.email}</Text>
          <Text type="secondary">{record.email}</Text>
        </Space>
      ),
    },
    {
      title: "Tài khoản",
      dataIndex: "account_status",
      key: "account_status",
      width: 130,
      render: (value: string) => <Tag>{value.toLowerCase() === "active" ? "Hoạt động" : "Ngừng"}</Tag>,
    },
    {
      title: "Quyền Portal",
      dataIndex: "access_status",
      key: "access_status",
      width: 140,
      render: (value: string) => (
        <Tag color={value.toLowerCase() === "active" ? "green" : "default"}>
          {value.toLowerCase() === "active" ? "Đang hoạt động" : "Đã ngừng"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 190,
      render: (_, record) => record.access_status.toLowerCase() === "active" ? (
        <Button
          danger
          disabled={activeCount <= 1}
          icon={<StopOutlined />}
          onClick={() => openRequest("REVOKE_ACCESS", record)}
          size="small"
        >
          Đề nghị ngừng
        </Button>
      ) : (
        <Button
          icon={<UndoOutlined />}
          onClick={() => openRequest("REACTIVATE_ACCESS", record)}
          size="small"
        >
          Đề nghị khôi phục
        </Button>
      ),
    },
  ];

  const requestColumns: TableColumnsType<UserAccessRequest> = [
    { title: "Mã yêu cầu", dataIndex: "request_code", key: "request_code", width: 190 },
    {
      title: "Loại",
      dataIndex: "request_type",
      key: "request_type",
      width: 180,
      render: (value: RequestType) => requestTypeLabels[value],
    },
    {
      title: "Người dùng",
      key: "user",
      render: (_, record) => record.resolved_user?.full_name
        || record.target_user?.full_name
        || record.requested_full_name
        || record.resolved_user?.email
        || record.target_user?.email
        || record.requested_email
        || "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (value: RequestStatus) => {
        const meta = requestStatusMeta[value];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Ngày gửi",
      dataIndex: "submitted_at",
      key: "submitted_at",
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Phản hồi",
      dataIndex: "review_comment",
      key: "review_comment",
      ellipsis: true,
      render: (value: string | null) => value || "—",
    },
  ];

  const historyColumns: TableColumnsType<AccessHistory> = [
    {
      title: "Người dùng",
      key: "user",
      render: (_, record) => record.full_name || record.email,
    },
    {
      title: "Thay đổi",
      dataIndex: "action",
      key: "action",
      width: 150,
      render: (value: AccessHistory["action"]) => historyLabels[value],
    },
    {
      title: "Nguồn",
      dataIndex: "source",
      key: "source",
      width: 180,
      render: (value: AccessHistory["source"]) => value === "CUSTOMER_REQUEST" ? "Yêu cầu khách hàng" : "Tổ chức chứng nhận",
    },
    { title: "Mã yêu cầu", dataIndex: "request_code", key: "request_code", width: 180, render: (value: string | null) => value || "—" },
    { title: "Thời điểm", dataIndex: "changed_at", key: "changed_at", width: 160, render: (value: string) => formatDateTime(value) },
  ];

  if (accessQuery.isError) {
    return <Alert description={getErrorMessage(accessQuery.error)} message="Không tải được người dùng Portal" showIcon type="error" />;
  }

  return (
    <div className="projects-screen customer-portal-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">CỔNG KHÁCH HÀNG</span>
          <Title level={2}>Tài khoản Portal</Title>
          <Text type="secondary">Khách hàng chỉ gửi yêu cầu. Việc tạo tài khoản, cấp hoặc ngừng quyền truy cập chỉ có hiệu lực sau khi tổ chức chứng nhận phê duyệt.</Text>
        </div>
        <Space>
          {groups.length > 1 ? (
            <Select
              onChange={setSelectedCustomerId}
              options={groups.map((group) => ({ value: group.customer_id, label: `${group.customer_code} · ${group.company_name}` }))}
              value={effectiveCustomerId ?? undefined}
              style={{ minWidth: 280 }}
            />
          ) : null}
          <Button icon={<ReloadOutlined />} loading={accessQuery.isFetching || requestsQuery.isFetching} onClick={() => void Promise.all([accessQuery.refetch(), requestsQuery.refetch()])}>Làm mới</Button>
        </Space>
      </div>

      {selectedGroup ? (
        <>
          <Card
            extra={<Button icon={<PlusOutlined />} onClick={() => openRequest("ADD_USER")} type="primary">Đề nghị bổ sung người dùng</Button>}
            title={<Space><UserOutlined /><span>{selectedGroup.company_name}</span><Tag>{selectedGroup.customer_code}</Tag></Space>}
          >
            {activeCount <= 1 ? <Alert message="Hệ thống không cho phép ngừng người dùng Portal cuối cùng của tổ chức." showIcon style={{ marginBottom: 16 }} type="info" /> : null}
            <Table<PortalUser> columns={userColumns} dataSource={selectedGroup.users} locale={{ emptyText: <Empty description="Chưa có người dùng Portal" /> }} pagination={false} rowKey="access_id" />
          </Card>

          <Card style={{ marginTop: 16 }} title="Lịch sử yêu cầu quản trị tài khoản">
            <Table<UserAccessRequest> columns={requestColumns} dataSource={customerRequests} loading={requestsQuery.isLoading} pagination={{ pageSize: 10 }} rowKey="id" />
          </Card>

          <Card style={{ marginTop: 16 }} title="Lịch sử quyền truy cập">
            <Table<AccessHistory> columns={historyColumns} dataSource={selectedGroup.history} pagination={{ pageSize: 10 }} rowKey="id" />
          </Card>
        </>
      ) : <Card><Empty description="Chưa có tổ chức được gán cho tài khoản" /></Card>}

      <Modal
        destroyOnHidden
        okButtonProps={{ loading: mutation.isPending }}
        okText="Gửi yêu cầu"
        onCancel={() => {
          setRequestType(null);
          setTargetUser(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        open={Boolean(requestType)}
        title={requestType ? requestTypeLabels[requestType] : "Yêu cầu tài khoản"}
      >
        {targetUser ? (
          <Alert
            description={`${targetUser.full_name || targetUser.email} · ${targetUser.email}`}
            message="Người dùng được đề nghị"
            showIcon
            style={{ marginBottom: 16 }}
            type="info"
          />
        ) : null}
        <Form<RequestFormValues> form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
          {requestType === "ADD_USER" ? (
            <>
              <Form.Item label="Họ và tên" name="full_name" rules={[{ required: true, message: "Nhập họ và tên" }]}>
                <Input maxLength={100} />
              </Form.Item>
              <Form.Item label="Email" name="email" rules={[{ required: true, message: "Nhập email" }, { type: "email", message: "Email không hợp lệ" }]}>
                <Input maxLength={255} />
              </Form.Item>
            </>
          ) : null}
          <Form.Item label="Lý do / nhu cầu" name="reason" rules={[{ required: true, message: "Nhập lý do yêu cầu" }]}>
            <TextArea maxLength={2000} rows={4} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
