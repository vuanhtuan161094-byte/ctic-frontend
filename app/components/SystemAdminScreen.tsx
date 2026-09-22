"use client";

import {
  CheckCircleOutlined,
  DownOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
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
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { CustomerPortalAccountModal } from "./CustomerPortalAccountModal";
import { DataTable, PageHeader, SearchToolbar } from "./design-system";
import { SystemGovernancePanel } from "./SystemGovernancePanel";

const { Text } = Typography;

interface SystemAdminScreenProps {
  currentUserId: string;
  roles: string[];
  routeMode?: boolean;
  onOpenUser?: (userId: string) => void;
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
  assignable: boolean;
}

interface PermissionCatalogItem {
  id: string;
  permission_name: string;
  _count?: {
    role_permissions: number;
  };
}

interface PermissionOverrideEntry {
  permission_name: string;
  reason: string | null;
  changed_at: string;
  changed_by: {
    id: string;
    username: string;
    full_name: string | null;
  } | null;
}

interface UserPermissionProfile {
  user_id: string;
  role_names: string[];
  base_permissions: string[];
  allow_overrides: PermissionOverrideEntry[];
  deny_overrides: PermissionOverrideEntry[];
  effective_permissions: string[];
  can_override: boolean;
  restriction_reason: string | null;
  role_scope_note: string;
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

interface UpdatePermissionOverridesValues {
  allow_permissions: string[];
  deny_permissions: string[];
  reason: string;
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
  technical_expert: "Chuyên gia kỹ thuật",
  technical_reviewer: "Thẩm xét viên kỹ thuật",
  decision_maker: "Người ra quyết định",
  customer: "Người dùng khách hàng",
};

const permissionResourceLabels: Record<string, string> = {
  applications: "đơn đăng ký",
  application: "đơn đăng ký",
  audit_plans: "kế hoạch đánh giá",
  audit_programs: "chương trình đánh giá",
  audit_teams: "đoàn đánh giá",
  audits: "hoạt động đánh giá",
  audit: "hoạt động đánh giá",
  audit_logs: "nhật ký hệ thống",
  certificates: "chứng chỉ",
  certification_decisions: "quyết định chứng nhận",
  certification_decision: "quyết định chứng nhận",
  classifications: "phân loại ngành",
  competencies: "năng lực chuyên gia",
  contracts: "hợp đồng",
  customer_changes: "thay đổi khách hàng",
  customer_documents: "tài liệu khách hàng",
  customer_portal: "cổng khách hàng",
  customer_user_requests: "yêu cầu tài khoản khách hàng",
  customers: "khách hàng",
  dashboard: "tổng quan",
  documents: "tài liệu",
  experts: "chuyên gia",
  findings: "phát hiện đánh giá",
  mandays: "ngày công",
  notifications: "thông báo",
  projects: "hồ sơ chứng nhận",
  reports: "báo cáo",
  technical_review: "thẩm xét kỹ thuật",
  technical_reviews: "thẩm xét kỹ thuật",
  users: "tài khoản người dùng",
};

const permissionActionLabels: Record<string, string> = {
  read: "Xem",
  manage: "Quản lý",
  review: "Xem xét",
  execute: "Thực hiện",
  issue: "Ban hành",
  assign: "Phân công",
  perform: "Thực hiện",
  approve: "Phê duyệt",
  access: "Truy cập",
  create: "Tạo",
  update: "Cập nhật",
  delete: "Xóa",
  reassign: "Phân công lại",
  respond: "Phản hồi",
  intake: "Tiếp nhận",
  prepare: "Lập",
  decision: "Ra quyết định",
  investigate: "Điều tra",
  acknowledge: "Tiếp nhận",
  follow_up: "Theo dõi",
  change_review: "Xem xét thay đổi",
  admin_override: "Ghi đè quản trị",
};

type PermissionGroupDefinition = {
  key: string;
  label: string;
  resources: string[];
};

type PermissionGroup = PermissionGroupDefinition & {
  permissions: string[];
};

const permissionGroupDefinitions: PermissionGroupDefinition[] = [
  { key: "overview", label: "Tổng quan", resources: ["dashboard"] },
  {
    key: "customer",
    label: "Khách hàng & cổng khách hàng",
    resources: [
      "customers",
      "customer_changes",
      "customer_documents",
      "customer_portal",
      "customer_user_requests",
    ],
  },
  {
    key: "application",
    label: "Đăng ký & hợp đồng",
    resources: ["applications", "application", "contracts", "classifications"],
  },
  {
    key: "audit",
    label: "Đánh giá & nguồn lực",
    resources: [
      "projects",
      "audit_plans",
      "audit_programs",
      "audit_teams",
      "audits",
      "audit",
      "findings",
      "mandays",
    ],
  },
  {
    key: "review",
    label: "Báo cáo & thẩm xét",
    resources: ["reports", "technical_review", "technical_reviews"],
  },
  {
    key: "certificate",
    label: "Chứng chỉ & quyết định",
    resources: ["certificates", "certification_decisions", "certification_decision"],
  },
  { key: "documents", label: "Tài liệu", resources: ["documents"] },
  { key: "experts", label: "Chuyên gia & năng lực", resources: ["experts", "competencies"] },
  { key: "notifications", label: "Thông báo & thời hạn xử lý", resources: ["notifications"] },
  { key: "administration", label: "Quản trị hệ thống", resources: ["users", "audit_logs"] },
];

function humanizePermissionToken(value: string) {
  const normalized = value.replace(/_/g, " ").trim();
  if (!normalized) return value;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getPermissionLabel(permission: string) {
  const [resource, ...actionParts] = permission.split(".");
  const resourceLabel = permissionResourceLabels[resource] ?? humanizePermissionToken(resource).toLowerCase();
  const actionKey = actionParts.join(".");
  const actionLabel =
    permissionActionLabels[actionKey] ??
    permissionActionLabels[actionParts[0] ?? ""] ??
    humanizePermissionToken(actionKey || "Truy cập");

  return `${actionLabel} ${resourceLabel}`.trim();
}

function buildPermissionGroups(permissions: string[]): PermissionGroup[] {
  const buckets = new Map<string, string[]>();
  const other: string[] = [];

  for (const permission of permissions) {
    const resource = permission.split(".")[0];
    const group = permissionGroupDefinitions.find((item) => item.resources.includes(resource));

    if (!group) {
      other.push(permission);
      continue;
    }

    const values = buckets.get(group.key) ?? [];
    values.push(permission);
    buckets.set(group.key, values);
  }

  const groups = permissionGroupDefinitions
    .map((definition) => ({
      ...definition,
      permissions: (buckets.get(definition.key) ?? []).sort((a, b) =>
        getPermissionLabel(a).localeCompare(getPermissionLabel(b), "vi"),
      ),
    }))
    .filter((group) => group.permissions.length > 0);

  if (other.length > 0) {
    groups.push({
      key: "other",
      label: "Quyền khác",
      resources: [],
      permissions: other.sort((a, b) => a.localeCompare(b)),
    });
  }

  return groups;
}

function applyPermissionOverrides(
  basePermissions: string[],
  allowPermissions: string[],
  denyPermissions: string[],
) {
  const effective = new Set([
    ...basePermissions.map((permission) => permission.trim().toLowerCase()),
    ...allowPermissions.map((permission) => permission.trim().toLowerCase()),
  ]);

  for (const permission of denyPermissions) {
    effective.delete(permission.trim().toLowerCase());
  }

  return Array.from(effective).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function buildPermissionSelectGroups(permissions: string[]) {
  return buildPermissionGroups(permissions).map((group) => ({
    label: group.label,
    options: group.permissions.map((permission) => ({
      value: permission,
      label: getPermissionLabel(permission),
    })),
  }));
}

function RolePermissionPreview({
  roles,
  totalPermissions,
  emptyText = "Chưa chọn vai trò.",
}: {
  roles: RoleItem[];
  totalPermissions: string[];
  emptyText?: string;
}) {
  if (roles.length === 0) {
    return (
      <div className="system-role-permission-preview system-role-permission-preview-empty">
        <Text type="secondary">{emptyText}</Text>
      </div>
    );
  }

  return (
    <div className="system-role-permission-preview">
      <div className="system-role-permission-preview-heading">
        <div>
          <strong>Quyền của các vai trò đang chọn</strong>
          <small>
            Tổng {totalPermissions.length} quyền khác nhau. Quyền trùng giữa nhiều vai trò chỉ được tính một lần.
          </small>
        </div>
        <Tag color="blue">Tổng {totalPermissions.length} quyền</Tag>
      </div>

      <div className="system-role-permission-preview-list">
        {roles.map((role) => (
          <details className="system-role-permission-preview-role" key={role.id}>
            <summary>
              <span>
                <strong>{getRoleLabel(role.role_name)}</strong>
                {role.description ? <small>{role.description}</small> : null}
              </span>
              <span className="system-role-permission-preview-count">{role.permissions.length} quyền</span>
              <DownOutlined className="system-role-permission-preview-chevron" />
            </summary>
            <div className="system-role-permission-preview-permissions">
              {buildPermissionGroups(role.permissions).map((group) => (
                <div className="system-role-permission-preview-group" key={`${role.id}-${group.key}`}>
                  <strong>{group.label}</strong>
                  <div>
                    {group.permissions.map((permission) => (
                      <span key={`${role.id}-${permission}`}>
                        <CheckCircleOutlined />
                        {getPermissionLabel(permission)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

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

function isCustomerAccount(user: SystemUser) {
  return user.roles.some((role) => normalizeRole(role.role_name) === "customer");
}

function UserAudienceTag({ user }: { user: SystemUser }) {
  const customer = isCustomerAccount(user);
  return <Tag color={customer ? "blue" : "default"}>{customer ? "Khách hàng" : "Nội bộ"}</Tag>;
}

export function SystemAdminScreen({ currentUserId, roles, routeMode = false, onOpenUser }: SystemAdminScreenProps) {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [createForm] = Form.useForm<CreateUserValues>();
  const [editForm] = Form.useForm<UpdateUserValues>();
  const [rolesForm] = Form.useForm<UpdateRolesValues>();
  const [permissionForm] = Form.useForm<UpdatePermissionOverridesValues>();
  const [passwordForm] = Form.useForm<ResetPasswordValues>();
  const watchedRoleNames = Form.useWatch("role_names", rolesForm);
  const watchedCreateRoleNames = Form.useWatch("role_names", createForm);
  const watchedAllowPermissionNames = Form.useWatch("allow_permissions", permissionForm);
  const watchedDenyPermissionNames = Form.useWatch("deny_permissions", permissionForm);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [customerCreateOpen, setCustomerCreateOpen] = useState(false);
  const [permissionEditorOpen, setPermissionEditorOpen] = useState(false);
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

  const permissionsQuery = useQuery({
    queryKey: ["system-permissions"],
    queryFn: async () => (await api.get<PermissionCatalogItem[]>("/users/permissions")).data,
    enabled: canManage,
  });

  const permissionProfileQuery = useQuery({
    queryKey: ["system-user-permission-profile", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) throw new Error("Chưa chọn tài khoản");
      return (await api.get<UserPermissionProfile>(`/users/${selectedUserId}/permission-profile`)).data;
    },
    enabled: canManage && Boolean(selectedUserId),
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const availableRoles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const openUser = (userId: string) => onOpenUser ? onOpenUser(userId) : setSelectedUserId(userId);
  const openUserEditor = (userId: string) => {
    setPermissionEditorOpen(false);
    setSelectedUserId(userId);
  };
  const persistedRoleNames = useMemo(
    () => selectedUser?.roles.map((role) => role.role_name) ?? [],
    [selectedUser],
  );
  const previewRoleNames = watchedRoleNames ?? persistedRoleNames;
  const roleSelectionChanged = useMemo(() => {
    const normalize = (values: string[]) =>
      values.map((value) => normalizeRole(value)).sort((a, b) => a.localeCompare(b));
    return JSON.stringify(normalize(previewRoleNames)) !== JSON.stringify(normalize(persistedRoleNames));
  }, [persistedRoleNames, previewRoleNames]);
  const previewSelectedRoles = useMemo(
    () => availableRoles.filter((role) =>
      previewRoleNames.some((roleName) => normalizeRole(roleName) === normalizeRole(role.role_name)),
    ),
    [availableRoles, previewRoleNames],
  );
  const basePermissions = useMemo(
    () => Array.from(new Set(previewSelectedRoles.flatMap((role) => role.permissions))).sort((a, b) =>
      a.localeCompare(b),
    ),
    [previewSelectedRoles],
  );
  const createPreviewRoleNames = useMemo(() => watchedCreateRoleNames ?? [], [watchedCreateRoleNames]);
  const createSelectedRoles = useMemo(
    () => availableRoles.filter((role) =>
      createPreviewRoleNames.some((roleName) => normalizeRole(roleName) === normalizeRole(role.role_name)),
    ),
    [availableRoles, createPreviewRoleNames],
  );
  const createBasePermissions = useMemo(
    () => Array.from(new Set(createSelectedRoles.flatMap((role) => role.permissions))).sort((a, b) =>
      a.localeCompare(b),
    ),
    [createSelectedRoles],
  );

  const permissionProfile = permissionProfileQuery.data ?? null;
  const allowOverrideNames = useMemo(
    () => permissionProfile?.allow_overrides.map((item) => item.permission_name) ?? [],
    [permissionProfile],
  );
  const denyOverrideNames = useMemo(
    () => permissionProfile?.deny_overrides.map((item) => item.permission_name) ?? [],
    [permissionProfile],
  );
  const effectivePermissions = useMemo(
    () => applyPermissionOverrides(basePermissions, allowOverrideNames, denyOverrideNames),
    [allowOverrideNames, basePermissions, denyOverrideNames],
  );
  const permissionGroups = useMemo(
    () => buildPermissionGroups(effectivePermissions),
    [effectivePermissions],
  );

  const permissionCatalogNames = useMemo(
    () => (permissionsQuery.data ?? []).map((item) => item.permission_name).sort((a, b) => a.localeCompare(b)),
    [permissionsQuery.data],
  );
  const allowPermissionOptions = useMemo(
    () => buildPermissionSelectGroups(permissionCatalogNames.filter((permission) => !basePermissions.includes(permission))),
    [basePermissions, permissionCatalogNames],
  );
  const denyPermissionOptions = useMemo(
    () => buildPermissionSelectGroups(basePermissions),
    [basePermissions],
  );

  useEffect(() => {
    if (!selectedUser) {
      editForm.resetFields();
      rolesForm.resetFields();
      permissionForm.resetFields();
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
  }, [editForm, passwordForm, permissionForm, rolesForm, selectedUser]);

  useEffect(() => {
    if (!permissionProfile) {
      permissionForm.resetFields();
      return;
    }

    permissionForm.setFieldsValue({
      allow_permissions: permissionProfile.allow_overrides.map((item) => item.permission_name),
      deny_permissions: permissionProfile.deny_overrides.map((item) => item.permission_name),
      reason: "",
    });
  }, [permissionForm, permissionProfile]);

  const invalidateUsers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["system-users"] }),
      queryClient.invalidateQueries({ queryKey: ["system-roles"] }),
      queryClient.invalidateQueries({ queryKey: ["system-permissions"] }),
      queryClient.invalidateQueries({ queryKey: ["system-user-permission-profile"] }),
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

  const permissionOverridesMutation = useMutation({
    mutationFn: async (values: UpdatePermissionOverridesValues) => {
      if (!selectedUserId) throw new Error("Chưa chọn tài khoản");
      return (
        await api.patch<UserPermissionProfile>(`/users/${selectedUserId}/permission-overrides`, values)
      ).data;
    },
    onSuccess: async (profile) => {
      queryClient.setQueryData(["system-user-permission-profile", selectedUserId], profile);
      await queryClient.invalidateQueries({ queryKey: ["system-user-permission-profile", selectedUserId] });
      setPermissionEditorOpen(false);
      permissionForm.setFieldsValue({ reason: "" });
      messageApi.success("Đã cập nhật quyền riêng của tài khoản");
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
      const customerAudience = isCustomerAccount(user);
      const matchesAudience = audienceFilter === "all"
        || (audienceFilter === "customer" ? customerAudience : !customerAudience);

      return matchesSearch && matchesStatus && matchesRole && matchesAudience;
    });
  }, [audienceFilter, roleFilter, search, statusFilter, users]);

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "active").length,
      locked: users.filter((user) => user.status === "locked").length,
      inactive: users.filter((user) => user.status === "inactive").length,
    }),
    [users],
  );

  const roleFilterOptions = availableRoles.map((role) => ({
    value: role.role_name,
    label: `${getRoleLabel(role.role_name)}${role.assignable ? "" : " · Vai trò cũ (chỉ đọc)"}`,
    assignable: role.assignable === true,
  }));
  const roleOptions = availableRoles
    .filter((role) => role.assignable === true)
    .map((role) => ({
      value: role.role_name,
      label: `${getRoleLabel(role.role_name)} · ${role.permissions.length} quyền`,
    }));
  const internalRoleOptions = roleOptions.filter((option) => normalizeRole(option.value) !== "customer");

  const columns: TableColumnsType<SystemUser> = [
    {
      title: "Tài khoản",
      key: "account",
      width: 300,
      render: (_, record) => (
        <button
          className="system-user-name-button"
          onClick={() => openUser(record.id)}
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
      title: "Thư điện tử",
      dataIndex: "email",
      key: "email",
      width: 260,
    },
    {
      title: "Nhóm",
      key: "audience",
      width: 125,
      render: (_, record) => <UserAudienceTag user={record} />,
    },
    {
      title: "Vai trò",
      key: "roles",
      render: (_, record) => {
        const roleNames = record.roles.map((role) => getRoleLabel(role.role_name));
        const visibleRoles = roleNames.slice(0, 3);
        const hiddenCount = Math.max(0, roleNames.length - visibleRoles.length);

        if (roleNames.length === 0) {
          return <Text type="secondary">Chưa gán vai trò</Text>;
        }

        return (
          <Tooltip title={roleNames.join(" · ")}>
            <Space size={[4, 4]} wrap>
              {visibleRoles.map((roleName) => (
                <Tag key={roleName}>{roleName}</Tag>
              ))}
              {hiddenCount > 0 ? <Tag>+{hiddenCount}</Tag> : null}
            </Space>
          </Tooltip>
        );
      },
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
      width: routeMode ? 160 : 80,
      fixed: "right",
      render: (_, record) => (
        <Space size={6}>
          <Button onClick={() => openUser(record.id)} size="small">Mở</Button>
          {routeMode ? <Button onClick={() => openUserEditor(record.id)} size="small" type="link">Chỉnh sửa</Button> : null}
        </Space>
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

      <PageHeader
        identity="TÀI KHOẢN & TRUY CẬP"
        title="Tài khoản người dùng"
        description="Quản lý tập trung tài khoản nội bộ và khách hàng. Hai nhóm dùng quy trình cấp quyền riêng nhưng cùng được theo dõi tại đây."
        secondaryActions={<Space>
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
          <Button icon={<PlusOutlined />} onClick={() => setCreateChoiceOpen(true)} type="primary">
            Thêm tài khoản
          </Button>
        </Space>}
      />

      <section className="system-admin-kpi-grid">
        <Card><Statistic prefix={<TeamOutlined />} title="Tổng tài khoản" value={summary.total} /></Card>
        <Card><Statistic prefix={<SafetyCertificateOutlined />} title="Đang hoạt động" value={summary.active} /></Card>
        <Card><Statistic prefix={<LockOutlined />} title="Đã khóa" value={summary.locked} /></Card>
        <Card><Statistic prefix={<UserOutlined />} title="Ngừng hoạt động" value={summary.inactive} /></Card>
      </section>

      {!routeMode ? <SystemGovernancePanel /> : null}

      <Card className="system-admin-table-card" title="Danh sách tài khoản">
        <SearchToolbar
          placeholder="Tìm theo tên, tên đăng nhập hoặc thư điện tử..."
          query={search}
          onQueryChange={setSearch}
          filterControl={<Space wrap>
            <Select
              aria-label="Lọc theo trạng thái"
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
              aria-label="Lọc theo vai trò"
              onChange={setRoleFilter}
              options={[{ value: "all", label: "Tất cả vai trò" }, ...roleFilterOptions]}
              showSearch
              value={roleFilter}
            />
            <Select
              aria-label="Lọc theo nhóm tài khoản"
              onChange={setAudienceFilter}
              options={[
                { value: "all", label: "Nội bộ & khách hàng" },
                { value: "internal", label: "Tài khoản nội bộ" },
                { value: "customer", label: "Tài khoản khách hàng" },
              ]}
              value={audienceFilter}
            />
          </Space>}
        />

        <DataTable<SystemUser>
          columns={columns}
          dataSource={filteredUsers}
          loading={usersQuery.isLoading}
          locale={{ emptyText: usersQuery.isError ? getErrorMessage(usersQuery.error) : "Không có tài khoản phù hợp" }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} tài khoản` }}
          rowKey="id"
          scroll={{ x: 1080 }}
          responsiveCards={filteredUsers.map((user) => ({
            key: user.id,
            title: user.full_name || user.username,
            status: <UserStatusTag status={user.status} />,
            fields: [
              { key: "identity", label: "Tài khoản", value: `@${user.username} · ${user.email}` },
              { key: "roles", label: "Vai trò", value: user.roles.map((role) => getRoleLabel(role.role_name)).join(" · ") || "Chưa gán vai trò" },
              { key: "audience", label: "Nhóm", value: isCustomerAccount(user) ? "Khách hàng" : "Nội bộ" },
            ],
            actions: <Space><Button size="small" onClick={() => openUser(user.id)}>Mở tài khoản</Button>{routeMode ? <Button size="small" onClick={() => openUserEditor(user.id)}>Chỉnh sửa</Button> : null}</Space>,
          }))}
        />
      </Card>

      <Modal
        destroyOnHidden
        footer={null}
        onCancel={() => setCreateChoiceOpen(false)}
        open={createChoiceOpen}
        title="Thêm tài khoản"
        width={680}
      >
        <div className="system-account-create-options">
          <button
            className="system-account-create-option"
            onClick={() => {
              setCreateChoiceOpen(false);
              setCreateOpen(true);
            }}
            type="button"
          >
            <span className="system-account-create-option__icon"><UserOutlined /></span>
            <span>
              <strong>Tài khoản nội bộ</strong>
              <small>Dành cho nhân viên, chuyên gia và người dùng nghiệp vụ của tổ chức chứng nhận.</small>
            </span>
          </button>
          <button
            className="system-account-create-option"
            onClick={() => {
              setCreateChoiceOpen(false);
              setCustomerCreateOpen(true);
            }}
            type="button"
          >
            <span className="system-account-create-option__icon"><TeamOutlined /></span>
            <span>
              <strong>Tài khoản khách hàng</strong>
              <small>Chọn tổ chức khách hàng và cấp quyền Portal theo đúng phạm vi dữ liệu của tổ chức đó.</small>
            </span>
          </button>
        </div>
        <Alert
          className="system-account-create-note"
          showIcon
          type="info"
          message="Hai loại tài khoản dùng hai cơ chế cấp quyền riêng"
          description="Tài khoản nội bộ nhận vai trò nghiệp vụ. Tài khoản khách hàng luôn nhận vai trò CUSTOMER và phải liên kết với một tổ chức khách hàng."
        />
      </Modal>

      <Modal
        destroyOnHidden
        footer={null}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        open={createOpen}
        title="Tạo tài khoản nội bộ"
        width={820}
      >
        <Form<CreateUserValues>
          form={createForm}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <div className="system-admin-form-grid">
            <Form.Item
              label="Tên đăng nhập"
              name="username"
              rules={[
                { required: true, message: "Nhập tên đăng nhập" },
                { min: 3, message: "Tên đăng nhập tối thiểu 3 ký tự" },
                { pattern: /^[A-Za-z0-9._-]+$/, message: "Tên đăng nhập không được chứa khoảng trắng" },
              ]}
            >
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item
              label="Thư điện tử"
              name="email"
              rules={[{ required: true, type: "email", message: "Nhập địa chỉ thư điện tử hợp lệ" }]}
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
          <Alert
            message="Tài khoản nội bộ chỉ nhận các vai trò nghiệp vụ nội bộ."
            description="Tài khoản khách hàng được tạo bằng flow riêng để luôn liên kết đúng với tổ chức khách hàng và quyền Portal."
            showIcon
            type="info"
          />
          <div className="system-permission-catalog-summary">
            <span><strong>{internalRoleOptions.length}</strong> vai trò nội bộ có thể gán</span>
            <span><strong>{permissionCatalogNames.length}</strong> quyền trong hệ thống</span>
            <span><strong>{createBasePermissions.length}</strong> quyền từ lựa chọn hiện tại</span>
          </div>
          <Form.Item
            extra="Tên mỗi vai trò hiển thị luôn số quyền. Có thể gán nhiều vai trò; quyền trùng chỉ tính một lần."
            label="Vai trò"
            name="role_names"
            rules={[{ required: true, message: "Chọn ít nhất một vai trò" }]}
          >
            <Select
              maxTagCount="responsive"
              mode="multiple"
              optionFilterProp="label"
              options={internalRoleOptions}
              placeholder="Chọn vai trò nội bộ · mỗi vai trò có hiển thị số quyền"
              showSearch
            />
          </Form.Item>
          <RolePermissionPreview
            emptyText="Chọn vai trò để xem trước tổng quyền và quyền cụ thể trước khi tạo tài khoản."
            roles={createSelectedRoles}
            totalPermissions={createBasePermissions}
          />
          <div className="system-admin-modal-actions">
            <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button htmlType="submit" loading={createMutation.isPending} type="primary">
              Tạo tài khoản nội bộ
            </Button>
          </div>
        </Form>
      </Modal>

      <CustomerPortalAccountModal
        open={customerCreateOpen}
        onClose={() => setCustomerCreateOpen(false)}
        onSuccess={async () => {
          await invalidateUsers();
          setAudienceFilter("customer");
          setRoleFilter("all");
          setStatusFilter("all");
        }}
      />

      <Drawer
        destroyOnClose
        onClose={() => {
          setPermissionEditorOpen(false);
          setSelectedUserId(null);
        }}
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
        width={860}
      >
        {selectedUser ? (
          <div className="system-user-detail-stack">
            {selectedUser.id === currentUserId ? (
              <Alert
                message="Đây là tài khoản đang đăng nhập. Hệ thống không cho phép tự khóa, ngừng hoạt động hoặc tự thu hồi vai trò Quản trị viên."
                showIcon
                type="info"
              />
            ) : null}

            <Tabs
              className="system-user-detail-tabs"
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
                          label="Tên đăng nhập"
                          name="username"
                          rules={[
                            { required: true, message: "Nhập tên đăng nhập" },
                            { min: 3, message: "Tên đăng nhập tối thiểu 3 ký tự" },
                            { pattern: /^[A-Za-z0-9._-]+$/, message: "Tên đăng nhập không được chứa khoảng trắng" },
                          ]}
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item
                          label="Thư điện tử"
                          name="email"
                          rules={[{ required: true, type: "email", message: "Nhập địa chỉ thư điện tử hợp lệ" }]}
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
                      <section className="system-role-editor">
                        <div className="system-role-editor-heading">
                          <div>
                            <strong>Vai trò của tài khoản</strong>
                            <Text type="secondary">
                              Chọn vai trò nghiệp vụ. Quyền hiệu lực được tính tự động từ các vai trò đã chọn.
                            </Text>
                          </div>
                          <Space size={8}>
                            {roleSelectionChanged ? <Tag color="gold">Chưa lưu</Tag> : <Tag color="green">Đã đồng bộ</Tag>}
                            <Button
                              disabled={selectedUser.id === currentUserId || isCustomerAccount(selectedUser) || !roleSelectionChanged}
                              htmlType="submit"
                              loading={rolesMutation.isPending}
                              type="primary"
                            >
                              Lưu vai trò
                            </Button>
                          </Space>
                        </div>

                        {selectedUser.id === currentUserId ? (
                          <Alert
                            message="Không thể thay đổi vai trò của tài khoản đang đăng nhập."
                            description="Quy tắc này giúp tránh tự thu hồi quyền quản trị hoặc thay đổi quyền của chính phiên đang sử dụng."
                            showIcon
                            type="info"
                          />
                        ) : null}
                        {isCustomerAccount(selectedUser) ? (
                          <Alert
                            message="Vai trò CUSTOMER được quản lý bởi flow tài khoản khách hàng"
                            description="Không chuyển CUSTOMER sang vai trò nội bộ tại đây. Liên kết tổ chức và quyền Portal được quản lý theo customer access để giữ đúng phạm vi dữ liệu khách hàng."
                            showIcon
                            type="info"
                          />
                        ) : null}

                        <div className="system-permission-catalog-summary">
                          <span><strong>{permissionCatalogNames.length}</strong> quyền trong hệ thống</span>
                          <span><strong>{previewSelectedRoles.length}</strong> vai trò đang chọn</span>
                          <span><strong>{basePermissions.length}</strong> quyền từ vai trò</span>
                        </div>

                        <Form.Item
                          className="system-role-select-item"
                          extra="Tên mỗi vai trò hiển thị số quyền. Chọn hoặc bỏ chọn để xem trước quyền ngay bên dưới trước khi lưu."
                          name="role_names"
                          rules={[{ required: true, message: "Chọn ít nhất một vai trò" }]}
                        >
                          <Select
                            disabled={selectedUser.id === currentUserId || isCustomerAccount(selectedUser)}
                            maxTagCount="responsive"
                            mode="multiple"
                            optionFilterProp="label"
                            options={roleOptions}
                            placeholder="Chọn vai trò · mỗi vai trò có hiển thị số quyền"
                            showSearch
                          />
                        </Form.Item>

                        <RolePermissionPreview
                          emptyText="Chọn vai trò để xem trước quyền trước khi lưu."
                          roles={previewSelectedRoles}
                          totalPermissions={basePermissions}
                        />
                      </section>

                      <Card
                        className="system-user-permission-override-card"
                        size="small"
                        title={
                          <div className="system-permission-card-title">
                            <div>
                              <span>Quyền riêng theo tài khoản</span>
                              <small>Giữ nguyên vai trò chuẩn, chỉ tạo ngoại lệ cho người dùng này.</small>
                            </div>
                            {permissionProfile ? (
                              <Space size={6} wrap>
                                <Tag color={allowOverrideNames.length > 0 ? "blue" : "default"}>
                                  Cấp thêm {allowOverrideNames.length}
                                </Tag>
                                <Tag color={denyOverrideNames.length > 0 ? "volcano" : "default"}>
                                  Thu hồi {denyOverrideNames.length}
                                </Tag>
                              </Space>
                            ) : null}
                          </div>
                        }
                      >
                        {permissionProfileQuery.isLoading ? (
                          <Text type="secondary">Đang tải hồ sơ quyền...</Text>
                        ) : permissionProfile?.can_override ? (
                          <div className="system-user-permission-override-body">
                            <Alert
                              message="Vai trò xác định phạm vi công việc; quyền riêng chỉ tinh chỉnh trong phạm vi đó."
                              description={permissionProfile.role_scope_note}
                              showIcon
                              type="info"
                            />

                            {(allowOverrideNames.length > 0 || denyOverrideNames.length > 0) ? (
                              <div className="system-user-permission-override-summary">
                                {allowOverrideNames.length > 0 ? (
                                  <div>
                                    <strong>Được cấp thêm</strong>
                                    <Space size={[6, 6]} wrap>
                                      {allowOverrideNames.map((permission) => (
                                        <Tag color="blue" key={`allow-${permission}`}>
                                          + {getPermissionLabel(permission)}
                                        </Tag>
                                      ))}
                                    </Space>
                                  </div>
                                ) : null}
                                {denyOverrideNames.length > 0 ? (
                                  <div>
                                    <strong>Đã thu hồi riêng</strong>
                                    <Space size={[6, 6]} wrap>
                                      {denyOverrideNames.map((permission) => (
                                        <Tag color="volcano" key={`deny-${permission}`}>
                                          − {getPermissionLabel(permission)}
                                        </Tag>
                                      ))}
                                    </Space>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <Text type="secondary">Chưa có ngoại lệ quyền. Tài khoản đang dùng đúng quyền mặc định từ vai trò.</Text>
                            )}

                            <div className="system-user-permission-override-actions">
                              {roleSelectionChanged ? (
                                <Text type="warning">Lưu thay đổi vai trò trước khi chỉnh quyền riêng.</Text>
                              ) : null}
                              <Button
                                disabled={roleSelectionChanged}
                                onClick={() => setPermissionEditorOpen(true)}
                              >
                                Điều chỉnh quyền riêng
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Alert
                            message="Không áp dụng quyền riêng cho tài khoản này"
                            description={permissionProfile?.restriction_reason ?? "Hồ sơ quyền chưa sẵn sàng."}
                            showIcon
                            type="info"
                          />
                        )}
                      </Card>

                      <Card
                        className="system-permission-summary-card"
                        size="small"
                        title={
                          <div className="system-permission-card-title">
                            <div>
                              <span>{roleSelectionChanged ? "Quyền sau khi lưu" : "Quyền truy cập hiệu lực"}</span>
                              <small>
                                {permissionGroups.length} nhóm nghiệp vụ · {effectivePermissions.length} quyền
                              </small>
                            </div>
                            {roleSelectionChanged ? <Tag color="gold">Xem trước</Tag> : <Tag>{effectivePermissions.length} quyền</Tag>}
                          </div>
                        }
                      >
                        <Alert
                          className="system-permission-info"
                          message={
                            roleSelectionChanged
                              ? "Đây là bản xem trước quyền theo các vai trò đang chọn và các ngoại lệ quyền riêng đã lưu. Quyền vai trò chỉ có hiệu lực sau khi bấm Lưu vai trò."
                              : allowOverrideNames.length > 0 || denyOverrideNames.length > 0
                                ? `Quyền hiệu lực = ${basePermissions.length} quyền từ vai trò + ${allowOverrideNames.length} cấp thêm − ${denyOverrideNames.length} thu hồi.`
                                : "Quyền được tổng hợp tự động từ các vai trò hiện tại."
                          }
                          showIcon
                          type={roleSelectionChanged ? "warning" : "info"}
                        />

                        {permissionGroups.length > 0 ? (
                          <div className="system-permission-groups system-permission-groups-collapsible">
                            {permissionGroups.map((group) => (
                              <details className="system-permission-group" key={group.key}>
                                <summary className="system-permission-group-heading">
                                  <strong>{group.label}</strong>
                                  <span className="system-permission-group-count">{group.permissions.length}</span>
                                  <DownOutlined className="system-permission-group-chevron" />
                                </summary>
                                <div className="system-permission-list">
                                  {group.permissions.map((permission) => (
                                    <div className="system-permission-item" key={permission}>
                                      <CheckCircleOutlined />
                                      <span>
                                        <strong>{getPermissionLabel(permission)}</strong>
                                        {allowOverrideNames.includes(permission) ? (
                                          <small className="system-permission-source system-permission-source-allow">Cấp riêng cho tài khoản</small>
                                        ) : (
                                          <small className="system-permission-source">Từ vai trò</small>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                        ) : (
                          <Empty
                            description="Tài khoản chưa có quyền hiệu lực"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        )}
                      </Card>
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

      <Modal
        footer={null}
        onCancel={() => {
          setPermissionEditorOpen(false);
          if (permissionProfile) {
            permissionForm.setFieldsValue({
              allow_permissions: permissionProfile.allow_overrides.map((item) => item.permission_name),
              deny_permissions: permissionProfile.deny_overrides.map((item) => item.permission_name),
              reason: "",
            });
          }
        }}
        open={permissionEditorOpen}
        title={`Điều chỉnh quyền riêng${selectedUser ? ` · ${selectedUser.full_name || selectedUser.username}` : ""}`}
        width={760}
      >
        <Form<UpdatePermissionOverridesValues>
          form={permissionForm}
          layout="vertical"
          onFinish={(values) => permissionOverridesMutation.mutate(values)}
        >
          <Alert
            className="system-permission-override-modal-alert"
            message="Giữ nguyên vai trò, chỉ tạo ngoại lệ cho tài khoản này"
            description="Cấp thêm dùng cho quyền chưa có trong vai trò. Thu hồi dùng để chặn một quyền vốn có từ vai trò. Quyền riêng không vượt qua các ràng buộc vai trò hoặc phân tách nhiệm vụ của quy trình."
            showIcon
            type="info"
          />

          <div className="system-permission-catalog-summary system-permission-catalog-summary-modal">
            <span><strong>{permissionCatalogNames.length}</strong> quyền toàn hệ thống</span>
            <span><strong>{basePermissions.length}</strong> quyền từ vai trò</span>
            <span><strong>{Math.max(permissionCatalogNames.length - basePermissions.length, 0)}</strong> quyền có thể cấp thêm</span>
            <span><strong>{basePermissions.length}</strong> quyền có thể thu hồi</span>
          </div>

          <Form.Item
            extra={`Đã chọn ${(watchedAllowPermissionNames ?? []).length}/${Math.max(permissionCatalogNames.length - basePermissions.length, 0)} quyền có thể cấp thêm.`}
            help="Chỉ hiển thị các quyền chưa có trong vai trò hiện tại."
            label={`Cấp thêm quyền · ${(watchedAllowPermissionNames ?? []).length} đã chọn`}
            name="allow_permissions"
          >
            <Select
              allowClear
              maxTagCount="responsive"
              mode="multiple"
              optionFilterProp="label"
              options={allowPermissionOptions}
              placeholder="Chọn quyền cần cấp thêm"
              showSearch
            />
          </Form.Item>

          <Form.Item
            extra={`Đã chọn ${(watchedDenyPermissionNames ?? []).length}/${basePermissions.length} quyền có thể thu hồi.`}
            help="Chỉ hiển thị các quyền đang có từ vai trò; quyền bị thu hồi sẽ không còn hiệu lực với tài khoản này."
            label={`Thu hồi quyền từ vai trò · ${(watchedDenyPermissionNames ?? []).length} đã chọn`}
            name="deny_permissions"
          >
            <Select
              allowClear
              maxTagCount="responsive"
              mode="multiple"
              optionFilterProp="label"
              options={denyPermissionOptions}
              placeholder="Chọn quyền cần thu hồi"
              showSearch
            />
          </Form.Item>

          <Form.Item
            label="Lý do điều chỉnh quyền"
            name="reason"
            rules={[
              { required: true, message: "Nhập lý do điều chỉnh quyền" },
              { min: 3, message: "Lý do tối thiểu 3 ký tự" },
              { max: 500, message: "Lý do tối đa 500 ký tự" },
            ]}
          >
            <Input.TextArea
              maxLength={500}
              placeholder="Ví dụ: Giới hạn phạm vi thẩm xét theo quyết định phân công nội bộ"
              rows={3}
              showCount
            />
          </Form.Item>

          <div className="system-admin-modal-actions">
            <Button
              onClick={() => {
                setPermissionEditorOpen(false);
                if (permissionProfile) {
                  permissionForm.setFieldsValue({
                    allow_permissions: permissionProfile.allow_overrides.map((item) => item.permission_name),
                    deny_permissions: permissionProfile.deny_overrides.map((item) => item.permission_name),
                    reason: "",
                  });
                }
              }}
            >
              Hủy
            </Button>
            <Button
              htmlType="submit"
              loading={permissionOverridesMutation.isPending}
              type="primary"
            >
              Lưu quyền riêng
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
