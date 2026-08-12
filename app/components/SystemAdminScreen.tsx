"use client";

import {
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Text, Title } = Typography;

interface SystemAdminScreenProps {
  currentUserId: string;
  roles: string[];
}

interface UserRole {
  id: string;
  role_name: string;
  description: string | null;
  permissions: string[];
}

interface SystemUser {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  status: "active" | "inactive" | "locked" | string;
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
  roles: UserRole[];
}

interface RoleItem {
  id: string;
  role_name: string;
  description: string | null;
  user_count: number;
  permissions: string[];
}

interface CreateUserValues {
  username: string;
  email: string;
  full_name?: string;
  password: string;
  role_names: string[];
}

interface UpdateUserValues {
  username: string;
  email: string;
  full_name?: string;
  status: string;
}

interface UpdateRolesValues {
  role_names: string[];
}

interface ResetPasswordValues {
  new_password: string;
  confirm_password: string;
}

const statusLabels: Record<string, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
  locked: "Đã khóa",
};

const statusColors: Record<string, string> = {
  active: "green",
  inactive: "default",
  locked: "red",
};

const roleLabels: Record<string, string> = {
  admin: "Quản trị viên",
  staff: "Nhân viên nghiệp vụ",
  sales: "Kinh doanh",
  coordinator: "Điều phối viên",
  lead_auditor: "Trưởng đoàn đánh giá",
  auditor: "Chuyên gia đánh giá",
  technical_reviewer: "Thẩm xét viên kỹ thuật",
  decision_maker: "Người ra quyết định",
};

function normalizeRole(value: string) {
  return value.trim().toLowerCase();
}

function getRoleLabel(value: string) {
  const normalized = normalizeRole(value);
  return roleLabels[normalized] ?? value;
}

function UserStatusTag({ status }: { status: string }) {
  const normalized = status?.toLowerCase() ?? "inactive";
  return (
    <Tag color={statusColors[normalized] ?? "default"}>
      {statusLabels[normalized] ?? status}
    </Tag>
  );
}

export function SystemAdminScreen({ currentUserId, roles }: SystemAdminScreenProps) {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [createForm] = Form.useForm<CreateUserValues>();
  const [editForm] = Form.useForm<UpdateUserValues>();
  const [rolesForm] = Form.useForm<UpdateRolesValues>();
  const [passwordForm] = Form.useForm<ResetPasswordValues>();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const canManage = roles.some((role) => normalizeRole(role) === "admin");

  const usersQuery = useQuery({
    queryKey: ["system-users"],
    queryFn: async () => (await api.get<SystemUser[]>("/users")).data,
    enabled: canManage,
  });

  const rolesQuery = useQuery({
    queryKey: ["system-roles"],
    queryFn: async () => (await api.get<RoleItem[]>("/users/roles")).data,
    enabled: canManage,
  });

  const users = usersQuery.data ?? [];
  const availableRoles = rolesQuery.data ?? [];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  useEffect(() => {
    if (!selectedUser) {
      editForm.resetFields();
      rolesForm.resetFields();
      passwordForm.resetFields();
      return;
    }

    editForm.setFieldsValue({
      username: selectedUser.username,
      email: selectedUser.email,
      full_name: selectedUser.full_name ?? "",
      status: selectedUser.status,
    });

    rolesForm.setFieldsValue({
      role_names: selectedUser.roles.map((role) => role.role_name),
    });

    passwordForm.resetFields();
  }, [editForm, passwordForm, rolesForm, selectedUser]);

  const invalidateUsers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["system-users"] }),
      queryClient.invalidateQueries({ queryKey: ["system-roles"] }),
      queryClient.invalidateQueries({ queryKey: ["expert-users"] }),
      queryClient.invalidateQueries({ queryKey: ["experts"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (values: CreateUserValues) =>
      (await api.post<SystemUser>("/users", values)).data,
    onSuccess: async (user) => {
      await invalidateUsers();
      setCreateOpen(false);
      createForm.resetFields();
      setSelectedUserId(user.id);
      messageApi.success("Đã tạo tài khoản");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: UpdateUserValues) => {
      if (!selectedUserId) throw new Error("Chưa chọn tài khoản");
      return (await api.patch<SystemUser>(`/users/${selectedUserId}`, values)).data;
    },
    onSuccess: async () => {
      await invalidateUsers();
      messageApi.success("Đã cập nhật tài khoản");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const rolesMutation = useMutation({
    mutationFn: async (values: UpdateRolesValues) => {
      if (!selectedUserId) throw new Error("Chưa chọn tài khoản");
      return (await api.patch<SystemUser>(`/users/${selectedUserId}/roles`, values)).data;
    },
    onSuccess: async () => {
      await invalidateUsers();
      messageApi.success("Đã cập nhật vai trò");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: ResetPasswordValues) => {
      if (!selectedUserId) throw new Error("Chưa chọn tài khoản");
      return (
        await api.patch(`/users/${selectedUserId}/reset-password`, {
          new_password: values.new_password,
        })
      ).data;
    },
    onSuccess: () => {
      passwordForm.resetFields();
      messageApi.success("Đã đặt lại mật khẩu và thu hồi các phiên đăng nhập cũ");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !keyword ||
        [user.username, user.email, user.full_name ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      const matchesRole =
        roleFilter === "all" ||
        user.roles.some((role) => normalizeRole(role.role_name) === normalizeRole(roleFilter));

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [roleFilter, search, statusFilter, users]);

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "active").length,
      locked: users.filter((user) => user.status === "locked").length,
      inactive: users.filter((user) => user.status === "inactive").length,
    }),
    [users],
  );

  const roleOptions = availableRoles.map((role) => ({
    value: role.role_name,
    label: `${getRoleLabel(role.role_name)}${role.description ? ` · ${role.description}` : ""}`,
  }));

  const columns: TableColumnsType<SystemUser> = [
    {
      title: "Tài khoản",
      key: "account",
      width: 300,
      render: (_, record) => (
        <button
          className="system-user-name-button"
          onClick={() => setSelectedUserId(record.id)}
          type="button"
        >
          <span className="system-user-avatar"><UserOutlined /></span>
          <span>
            <strong>{record.full_name || record.username}</strong>
            <small>@{record.username}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 260,
    },
    {
      title: "Vai trò",
      key: "roles",
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {record.roles.map((role) => (
            <Tag key={role.id}>{getRoleLabel(role.role_name)}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (status: string) => <UserStatusTag status={status} />,
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      width: 130,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "",
      key: "action",
      width: 80,
      fixed: "right",
      render: (_, record) => (
        <Button onClick={() => setSelectedUserId(record.id)} size="small">
          Mở
        </Button>
      ),
    },
  ];

  if (!canManage) {
    return (
      <Card>
        <Empty description="Bạn không có quyền truy cập Quản trị hệ thống" />
      </Card>
    );
  }

  return (
    <div className="system-admin-screen">
      {contextHolder}

      <div className="page-heading page-heading-v2">
        <div>
          <span className="eyebrow">QUẢN TRỊ HỆ THỐNG</span>
          <Title level={2}>Tài khoản người dùng</Title>
          <Text type="secondary">
            Quản lý thông tin đăng nhập, trạng thái, vai trò và mật khẩu của người dùng nội bộ.
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            loading={usersQuery.isFetching || rolesQuery.isFetching}
            onClick={() => {
              void usersQuery.refetch();
              void rolesQuery.refetch();
            }}
          >
            Làm mới
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} type="primary">
            Thêm tài khoản
          </Button>
        </Space>
      </div>

      <section className="system-admin-kpi-grid">
        <Card><Statistic prefix={<TeamOutlined />} title="Tổng tài khoản" value={summary.total} /></Card>
        <Card><Statistic prefix={<SafetyCertificateOutlined />} title="Đang hoạt động" value={summary.active} /></Card>
        <Card><Statistic prefix={<LockOutlined />} title="Đã khóa" value={summary.locked} /></Card>
        <Card><Statistic prefix={<UserOutlined />} title="Ngừng hoạt động" value={summary.inactive} /></Card>
      </section>

      <Card className="system-admin-table-card" title="Danh sách tài khoản">
        <div className="system-admin-filter-bar">
          <Input
            allowClear
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên, username hoặc email..."
            prefix={<SearchOutlined />}
            value={search}
          />
          <Select
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "active", label: "Đang hoạt động" },
              { value: "locked", label: "Đã khóa" },
              { value: "inactive", label: "Ngừng hoạt động" },
            ]}
            value={statusFilter}
          />
          <Select
            onChange={setRoleFilter}
            options={[{ value: "all", label: "Tất cả vai trò" }, ...roleOptions]}
            showSearch
            value={roleFilter}
          />
        </div>

        <Table<SystemUser>
          columns={columns}
          dataSource={filteredUsers}
          loading={usersQuery.isLoading}
          locale={{ emptyText: usersQuery.isError ? getErrorMessage(usersQuery.error) : "Không có tài khoản phù hợp" }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} tài khoản` }}
          rowKey="id"
          scroll={{ x: 1080 }}
        />
      </Card>

      <Modal
        destroyOnHidden
        footer={null}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        open={createOpen}
        title="Tạo tài khoản nội bộ"
        width={680}
      >
        <Form<CreateUserValues>
          form={createForm}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <div className="system-admin-form-grid">
            <Form.Item
              label="Username"
              name="username"
              rules={[
                { required: true, message: "Nhập username" },
                { min: 3, message: "Username tối thiểu 3 ký tự" },
                { pattern: /^[A-Za-z0-9._-]+$/, message: "Username không được chứa khoảng trắng" },
              ]}
            >
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, type: "email", message: "Nhập email hợp lệ" }]}
            >
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item label="Họ và tên" name="full_name" rules={[{ required: true, message: "Nhập họ và tên" }]}>
              <Input />
            </Form.Item>
            <Form.Item
              label="Mật khẩu ban đầu"
              name="password"
              rules={[{ required: true, min: 8, message: "Mật khẩu tối thiểu 8 ký tự" }]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </div>
          <Form.Item
            label="Vai trò"
            name="role_names"
            rules={[{ required: true, message: "Chọn ít nhất một vai trò" }]}
          >
            <Select mode="multiple" options={roleOptions} placeholder="Chọn vai trò" />
          </Form.Item>
          <div className="system-admin-modal-actions">
            <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button htmlType="submit" loading={createMutation.isPending} type="primary">
              Tạo tài khoản
            </Button>
          </div>
        </Form>
      </Modal>

      <Drawer
        destroyOnClose
        onClose={() => setSelectedUserId(null)}
        open={Boolean(selectedUser)}
        title={
          selectedUser ? (
            <div className="system-user-drawer-title">
              <span className="system-user-avatar"><UserOutlined /></span>
              <span>
                <strong>{selectedUser.full_name || selectedUser.username}</strong>
                <small>{selectedUser.email}</small>
              </span>
            </div>
          ) : null
        }
        width={720}
      >
        {selectedUser ? (
          <div className="system-user-detail-stack">
            {selectedUser.id === currentUserId ? (
              <Alert
                message="Đây là tài khoản đang đăng nhập. Hệ thống không cho phép tự khóa, ngừng hoạt động hoặc tự thu hồi vai trò ADMIN."
                showIcon
                type="info"
              />
            ) : null}

            <Tabs
              items={[
                {
                  key: "account",
                  label: "Thông tin tài khoản",
                  children: (
                    <Form<UpdateUserValues>
                      form={editForm}
                      layout="vertical"
                      onFinish={(values) => updateMutation.mutate(values)}
                    >
                      <div className="system-admin-form-grid">
                        <Form.Item
                          label="Username"
                          name="username"
                          rules={[
                            { required: true, message: "Nhập username" },
                            { min: 3, message: "Username tối thiểu 3 ký tự" },
                            { pattern: /^[A-Za-z0-9._-]+$/, message: "Username không được chứa khoảng trắng" },
                          ]}
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item
                          label="Email"
                          name="email"
                          rules={[{ required: true, type: "email", message: "Nhập email hợp lệ" }]}
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item label="Họ và tên" name="full_name" rules={[{ required: true, message: "Nhập họ và tên" }]}>
                          <Input />
                        </Form.Item>
                        <Form.Item label="Trạng thái" name="status" rules={[{ required: true }]}>
                          <Select
                            disabled={selectedUser.id === currentUserId}
                            options={[
                              { value: "active", label: "Đang hoạt động" },
                              { value: "locked", label: "Khóa tài khoản" },
                              { value: "inactive", label: "Ngừng hoạt động" },
                            ]}
                          />
                        </Form.Item>
                      </div>
                      <Alert
                        message="Khi tài khoản đã liên kết với hồ sơ chuyên gia, họ tên và email sẽ được đồng bộ sang hồ sơ chuyên gia."
                        showIcon
                        type="warning"
                      />
                      <div className="system-admin-drawer-actions">
                        <Button htmlType="submit" loading={updateMutation.isPending} type="primary">
                          Lưu thông tin
                        </Button>
                      </div>
                    </Form>
                  ),
                },
                {
                  key: "roles",
                  label: "Vai trò & quyền",
                  children: (
                    <Form<UpdateRolesValues>
                      form={rolesForm}
                      layout="vertical"
                      onFinish={(values) => rolesMutation.mutate(values)}
                    >
                      <Form.Item
                        label="Vai trò được gán"
                        name="role_names"
                        rules={[{ required: true, message: "Chọn ít nhất một vai trò" }]}
                      >
                        <Select mode="multiple" options={roleOptions} />
                      </Form.Item>
                      <Card size="small" title="Quyền hiệu lực từ các vai trò">
                        <Space size={[6, 6]} wrap>
                          {Array.from(
                            new Set(selectedUser.roles.flatMap((role) => role.permissions)),
                          ).sort().map((permission) => (
                            <Tag key={permission}>{permission}</Tag>
                          ))}
                        </Space>
                      </Card>
                      <div className="system-admin-drawer-actions">
                        <Button htmlType="submit" loading={rolesMutation.isPending} type="primary">
                          Lưu vai trò
                        </Button>
                      </div>
                    </Form>
                  ),
                },
                {
                  key: "password",
                  label: "Đặt lại mật khẩu",
                  children: (
                    <Form<ResetPasswordValues>
                      form={passwordForm}
                      layout="vertical"
                      onFinish={(values) => passwordMutation.mutate(values)}
                    >
                      <Alert
                        message="Sau khi đặt lại mật khẩu, tất cả phiên đăng nhập cũ của tài khoản sẽ bị thu hồi."
                        showIcon
                        type="warning"
                      />
                      <Form.Item
                        label="Mật khẩu mới"
                        name="new_password"
                        rules={[{ required: true, min: 8, message: "Mật khẩu tối thiểu 8 ký tự" }]}
                      >
                        <Input.Password autoComplete="new-password" />
                      </Form.Item>
                      <Form.Item
                        dependencies={["new_password"]}
                        label="Nhập lại mật khẩu"
                        name="confirm_password"
                        rules={[
                          { required: true, message: "Nhập lại mật khẩu" },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue("new_password") === value) return Promise.resolve();
                              return Promise.reject(new Error("Mật khẩu nhập lại không khớp"));
                            },
                          }),
                        ]}
                      >
                        <Input.Password autoComplete="new-password" />
                      </Form.Item>
                      <div className="system-admin-drawer-actions">
                        <Button danger htmlType="submit" loading={passwordMutation.isPending}>
                          Đặt lại mật khẩu
                        </Button>
                      </div>
                    </Form>
                  ),
                },
              ]}
            />
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
