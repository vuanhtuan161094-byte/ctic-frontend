"use client";

import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Card, Tag, Typography } from "antd";

import { api, getErrorMessage } from "../lib/api";
import { DataTable, ErrorState, LoadingSkeleton, PageHeader, ReadOnlyState, SectionHeader } from "./design-system";

interface RoleDefinition {
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
}

const permissionDomains: Array<{ key: string; label: string; prefixes: string[] }> = [
  { key: "customers", label: "Khách hàng & Portal", prefixes: ["customers", "customer_"] },
  { key: "applications", label: "Đơn đăng ký", prefixes: ["applications", "application"] },
  { key: "certification", label: "Hồ sơ chứng nhận", prefixes: ["projects", "certification_"] },
  { key: "audit", label: "Lập kế hoạch & thực hiện đánh giá", prefixes: ["audit", "findings", "mandays"] },
  { key: "review", label: "Thẩm xét & quyết định", prefixes: ["technical_review", "decision"] },
  { key: "certificates", label: "Chứng chỉ", prefixes: ["certificates"] },
  { key: "documents", label: "Tài liệu", prefixes: ["documents"] },
  { key: "configuration", label: "Cấu hình", prefixes: ["classifications"] },
  { key: "administration", label: "Quản trị", prefixes: ["users", "audit_logs"] },
];

function groupPermissions(permissions: string[]) {
  const remaining = new Set(permissions);
  const groups = permissionDomains.map((domain) => {
    const items = permissions.filter((permission) => domain.prefixes.some((prefix) => permission.startsWith(prefix)));
    items.forEach((item) => remaining.delete(item));
    return { ...domain, items };
  }).filter((group) => group.items.length);
  if (remaining.size) groups.push({ key: "other", label: "Nghiệp vụ khác", prefixes: [], items: [...remaining] });
  return groups;
}

function permissionLabel(permission: string) {
  const [resource, action = "access"] = permission.split(".");
  return `${resource.replaceAll("_", " ")} — ${action.replaceAll("_", " ")}`;
}

export function RolesPermissionsScreen() {
  const roles = useQuery({ queryKey: ["system-roles"], queryFn: async () => (await api.get<RoleDefinition[]>("/users/roles")).data });
  const catalog = useQuery({ queryKey: ["system-permissions"], queryFn: async () => (await api.get<PermissionCatalogItem[]>("/users/permissions")).data });

  if (roles.isLoading || catalog.isLoading) return <LoadingSkeleton variant="page" rows={6} />;
  if (roles.isError || catalog.isError) {
    return <ErrorState description={getErrorMessage(roles.error ?? catalog.error)} retry={{ label: "Thử lại", onAction: () => { void roles.refetch(); void catalog.refetch(); } }} />;
  }

  const rows = roles.data ?? [];
  const columns: TableColumnsType<RoleDefinition> = [
    { title: "Vai trò", dataIndex: "role_name", width: 220, render: (value: string, record) => <><strong>{value}</strong><div><Typography.Text type="secondary">{record.description || "Chưa có mô tả nghiệp vụ"}</Typography.Text></div></> },
    { title: "Tài khoản", dataIndex: "user_count", width: 110 },
    { title: "Trạng thái gán", dataIndex: "assignable", width: 140, render: (value: boolean) => <Tag color={value ? "green" : "default"}>{value ? "Có thể gán" : "Chỉ đọc"}</Tag> },
    { title: "Quyền được cấp", dataIndex: "permissions", render: (permissions: string[]) => <div className="role-permission-groups">{groupPermissions(permissions).map((group) => <details key={group.key}><summary>{group.label} · {group.items.length}</summary><div>{group.items.map((permission) => <Tag key={permission} title={permission}>{permissionLabel(permission)}</Tag>)}</div></details>)}</div> },
  ];

  return (
    <div className="roles-permissions-page">
      <PageHeader
        identity="TÀI KHOẢN & TRUY CẬP"
        title="Vai trò & quyền"
        description="Vai trò là định nghĩa cấp quyền; quyền hiệu lực của từng tài khoản còn bao gồm điều chỉnh riêng do backend tính toán."
        metadata={<span>{rows.length} vai trò · {catalog.data?.length ?? 0} quyền trong danh mục</span>}
      />
      <SectionHeader title="Định nghĩa vai trò" description="Quyền được nhóm theo ngữ cảnh nghiệp vụ để tránh một ma trận quyền khó đọc." />
      <ReadOnlyState reason="Màn hình này mô tả định nghĩa hiện hành. Hệ thống không mở trình tạo vai trò/quyền tùy ý; thay đổi tài khoản vẫn đi qua các API ADMIN được bảo vệ." />
      <Card bordered={false}>
        <DataTable<RoleDefinition>
          columns={columns}
          dataSource={rows}
          pagination={false}
          rowKey="id"
          responsiveCards={rows.map((role) => ({
            key: role.id,
            title: role.role_name,
            status: <Tag color={role.assignable ? "green" : "default"}>{role.assignable ? "Có thể gán" : "Chỉ đọc"}</Tag>,
            fields: [
              { key: "description", label: "Ý nghĩa", value: role.description || "Chưa có mô tả nghiệp vụ" },
              { key: "users", label: "Tài khoản", value: role.user_count },
              { key: "permissions", label: "Quyền", value: `${role.permissions.length} quyền được cấp` },
            ],
          }))}
        />
      </Card>
    </div>
  );
}
