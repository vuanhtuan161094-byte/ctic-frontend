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
  Grid,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Tabs,
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
  const breakpoints = Grid.useBreakpoint();
  const useCompactPortalList = !breakpoints.lg;
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<RequestFormValues>();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [targetUser, setTargetUser] = useState<PortalUser | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [activeAccessSection, setActiveAccessSection] = useState("users");

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
  const userPageCount = Math.max(1, Math.ceil((selectedGroup?.users.length ?? 0) / 10));
  const visibleUserPage = Math.min(userPage, userPageCount);
  const visibleUsers = selectedGroup?.users.slice((visibleUserPage - 1) * 10, visibleUserPage * 10) ?? [];
  const requestsPageCount = Math.max(1, Math.ceil(customerRequests.length / 10));
  const visibleRequestsPage = Math.min(requestsPage, requestsPageCount);
  const visibleRequests = customerRequests.slice((visibleRequestsPage - 1) * 10, visibleRequestsPage * 10);
  const historyPageCount = Math.max(1, Math.ceil((selectedGroup?.history.length ?? 0) / 10));
  const visibleHistoryPage = Math.min(historyPage, historyPageCount);
  const visibleHistory = selectedGroup?.history.slice((visibleHistoryPage - 1) * 10, visibleHistoryPage * 10) ?? [];

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

  const renderUserAction = (record: PortalUser) => record.access_status.toLowerCase() === "active" ? (
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
  );

  const userColumns: TableColumnsType<PortalUser> = [
    {
      title: "Người dùng",
      key: "user",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
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
      render: (_, record) => renderUserAction(record),
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

  if (accessQuery.isLoading) {
    return <Card><Alert showIcon title="Đang tải người dùng Portal..." type="info" /></Card>;
  }

  if (accessQuery.isError) {
    return (
      <Alert
        action={<Button onClick={() => void accessQuery.refetch()}>Thử lại</Button>}
        description={getErrorMessage(accessQuery.error)}
        showIcon
        title="Không tải được người dùng Portal"
        type="error"
      />
    );
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
              onChange={(value) => {
                setSelectedCustomerId(value);
                setUserPage(1);
                setRequestsPage(1);
                setHistoryPage(1);
                setActiveAccessSection("users");
              }}
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
          <Tabs
            activeKey={activeAccessSection}
            className="customer-portal-users__tabs"
            items={[
              { key: "users", label: "Người dùng" },
              { key: "requests", label: "Yêu cầu" },
              { key: "history", label: "Lịch sử quyền" },
            ]}
            onChange={setActiveAccessSection}
            size="small"
          />
          {activeAccessSection === "users" ? (
          <Card
            extra={useCompactPortalList ? null : <Button icon={<PlusOutlined />} onClick={() => openRequest("ADD_USER")} type="primary">Đề nghị bổ sung người dùng</Button>}
            title={<Space><UserOutlined /><span>{selectedGroup.company_name}</span><Tag>{selectedGroup.customer_code}</Tag></Space>}
          >
            {useCompactPortalList ? (
              <Button className="customer-portal-users__mobile-add" icon={<PlusOutlined />} onClick={() => openRequest("ADD_USER")} type="primary">
                Đề nghị bổ sung người dùng
              </Button>
            ) : null}
            {activeCount <= 1 ? <Alert title="Hệ thống không cho phép ngừng người dùng Portal cuối cùng của tổ chức." showIcon style={{ marginBottom: 16 }} type="info" /> : null}
            {useCompactPortalList ? (
              selectedGroup.users.length ? (
                <>
                  <div aria-label="Người dùng Portal" className="portal-mobile-list">
                    {visibleUsers.map((record) => (
                      <article className="portal-mobile-card" key={record.access_id}>
                        <div className="portal-mobile-card__heading">
                          <div className="portal-mobile-card__identity">
                            <strong>{record.full_name || record.email}</strong>
                            <small>{record.email}</small>
                          </div>
                          <Tag color={record.access_status.toLowerCase() === "active" ? "green" : "default"}>
                            {record.access_status.toLowerCase() === "active" ? "Đang hoạt động" : "Đã ngừng"}
                          </Tag>
                        </div>
                        <div className="portal-mobile-card__meta">
                          <span><strong>Tài khoản:</strong> {record.account_status.toLowerCase() === "active" ? "Hoạt động" : "Ngừng"}</span>
                        </div>
                        <Space className="portal-mobile-card__actions portal-mobile-card__actions--single" wrap>
                          {renderUserAction(record)}
                        </Space>
                      </article>
                    ))}
                  </div>
                  {selectedGroup.users.length > 10 ? (
                    <Pagination
                      className="compact-mobile-pagination"
                      current={visibleUserPage}
                      onChange={setUserPage}
                      pageSize={10}
                      responsive
                      showSizeChanger={false}
                      showTotal={(total) => `${total} người dùng`}
                      total={selectedGroup.users.length}
                    />
                  ) : null}
                </>
              ) : <Empty description="Chưa có người dùng Portal" />
            ) : (
              <Table<PortalUser> columns={userColumns} dataSource={selectedGroup.users} locale={{ emptyText: <Empty description="Chưa có người dùng Portal" /> }} pagination={{ pageSize: 10, hideOnSinglePage: true }} rowKey="access_id" />
            )}
          </Card>
          ) : null}

          {activeAccessSection === "requests" ? (
          <Card title="Lịch sử yêu cầu quản trị tài khoản">
            {requestsQuery.isLoading ? (
              <Alert showIcon title="Đang tải lịch sử yêu cầu quản trị tài khoản..." type="info" />
            ) : requestsQuery.isError ? (
              <Alert
                action={<Button onClick={() => void requestsQuery.refetch()}>Thử lại</Button>}
                description={getErrorMessage(requestsQuery.error)}
                showIcon
                title="Không tải được lịch sử yêu cầu quản trị tài khoản"
                type="error"
              />
            ) : useCompactPortalList ? (
              customerRequests.length ? (
                <>
                  <div aria-label="Lịch sử yêu cầu quản trị tài khoản" className="portal-mobile-list">
                    {visibleRequests.map((request) => {
                      const meta = requestStatusMeta[request.status];
                      const requestedUser = request.resolved_user?.full_name
                        || request.target_user?.full_name
                        || request.requested_full_name
                        || request.resolved_user?.email
                        || request.target_user?.email
                        || request.requested_email
                        || "—";
                      return (
                        <article className="portal-mobile-card" key={request.id}>
                          <div className="portal-mobile-card__heading">
                            <div className="portal-mobile-card__identity">
                              <strong>{request.request_code}</strong>
                              <small>{requestTypeLabels[request.request_type]}</small>
                            </div>
                            <Tag color={meta.color}>{meta.label}</Tag>
                          </div>
                          <div className="portal-mobile-card__meta">
                            <span><strong>Người dùng:</strong> {requestedUser}</span>
                            <span><strong>Ngày gửi:</strong> {formatDateTime(request.submitted_at)}</span>
                            <span><strong>Lý do:</strong> {request.reason}</span>
                            {request.review_comment ? <span><strong>Phản hồi:</strong> {request.review_comment}</span> : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {customerRequests.length > 10 ? (
                    <Pagination
                      className="compact-mobile-pagination"
                      current={visibleRequestsPage}
                      onChange={setRequestsPage}
                      pageSize={10}
                      responsive
                      showSizeChanger={false}
                      showTotal={(total) => `${total} yêu cầu`}
                      total={customerRequests.length}
                    />
                  ) : null}
                </>
              ) : <Empty description="Chưa có yêu cầu quản trị tài khoản" />
            ) : (
              <Table<UserAccessRequest> columns={requestColumns} dataSource={customerRequests} loading={requestsQuery.isLoading} pagination={{ pageSize: 10 }} rowKey="id" />
            )}
          </Card>
          ) : null}

          {activeAccessSection === "history" ? (
          <Card title="Lịch sử quyền truy cập">
            {useCompactPortalList ? (
              selectedGroup.history.length ? (
                <>
                  <div aria-label="Lịch sử quyền truy cập" className="portal-mobile-list">
                    {visibleHistory.map((record) => (
                      <article className="portal-mobile-card" key={record.id}>
                        <div className="portal-mobile-card__heading">
                          <div className="portal-mobile-card__identity">
                            <strong>{record.full_name || record.email}</strong>
                            <small>{record.email}</small>
                          </div>
                          <Tag>{historyLabels[record.action]}</Tag>
                        </div>
                        <div className="portal-mobile-card__meta">
                          <span><strong>Nguồn:</strong> {record.source === "CUSTOMER_REQUEST" ? "Yêu cầu khách hàng" : "Tổ chức chứng nhận"}</span>
                          <span><strong>Mã yêu cầu:</strong> {record.request_code || "—"}</span>
                          <span><strong>Thời điểm:</strong> {formatDateTime(record.changed_at)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                  {selectedGroup.history.length > 10 ? (
                    <Pagination
                      className="compact-mobile-pagination"
                      current={visibleHistoryPage}
                      onChange={setHistoryPage}
                      pageSize={10}
                      responsive
                      showSizeChanger={false}
                      showTotal={(total) => `${total} thay đổi`}
                      total={selectedGroup.history.length}
                    />
                  ) : null}
                </>
              ) : <Empty description="Chưa có lịch sử quyền truy cập" />
            ) : (
              <Table<AccessHistory> columns={historyColumns} dataSource={selectedGroup.history} pagination={{ pageSize: 10 }} rowKey="id" />
            )}
          </Card>
          ) : null}
        </>
      ) : <Card><Empty description="Chưa có tổ chức được gán cho tài khoản" /></Card>}

      <Modal
        forceRender
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
            title="Người dùng được đề nghị"
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
