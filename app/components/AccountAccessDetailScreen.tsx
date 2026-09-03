"use client";

import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Alert, Button, Card, Space, Tag, Typography } from "antd";
import { useMemo } from "react";

import { api, getErrorMessage } from "../lib/api";
import {
  DataTable,
  EntitySummary,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  ReadOnlyState,
  SectionHeader,
} from "./design-system";

export type AccountDetailSection = "overview" | "access" | "sessions" | "activity";

interface AccountAccessDetailScreenProps {
  userId: string;
  section: AccountDetailSection;
  onNavigate: (section: AccountDetailSection) => void;
  onBack: () => void;
}

interface AccountRole {
  id: string;
  role_name: string;
  description: string | null;
  permissions: string[];
}

interface AccountDetail {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  status: string;
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
  roles: AccountRole[];
}

interface OverrideEntry {
  permission_name: string;
  reason: string | null;
  changed_at: string;
  changed_by: { id: string; username: string; full_name: string | null } | null;
}

interface PermissionProfile {
  user_id: string;
  role_names: string[];
  base_permissions: string[];
  allow_overrides: OverrideEntry[];
  deny_overrides: OverrideEntry[];
  effective_permissions: string[];
  can_override: boolean;
  restriction_reason: string | null;
  role_scope_note: string;
}

interface PermissionRow {
  key: string;
  permission: string;
  source: string;
  effective: boolean;
  reason: string | null;
}

const sectionLabels: Record<AccountDetailSection, string> = {
  overview: "Tổng quan",
  access: "Vai trò & quyền hiệu lực",
  sessions: "Phiên & bảo mật",
  activity: "Hoạt động",
};

function permissionLabel(permission: string) {
  const [resource, ...actionParts] = permission.split(".");
  const action = actionParts.join(" ").replaceAll("_", " ");
  return `${resource.replaceAll("_", " ")} — ${action || "truy cập"}`;
}

function AccountLocalNavigation({ section, onNavigate }: Pick<AccountAccessDetailScreenProps, "section" | "onNavigate">) {
  return (
    <nav className="account-detail-nav" aria-label="Khu vực tài khoản">
      {(Object.keys(sectionLabels) as AccountDetailSection[]).map((key) => (
        <Button key={key} type={key === section ? "primary" : "text"} onClick={() => onNavigate(key)}>{sectionLabels[key]}</Button>
      ))}
    </nav>
  );
}

function PermissionInspector({ profile }: { profile: PermissionProfile }) {
  const rows = useMemo<PermissionRow[]>(() => {
    const base = new Set(profile.base_permissions);
    const allowed = new Map(profile.allow_overrides.map((entry) => [entry.permission_name, entry]));
    const denied = new Map(profile.deny_overrides.map((entry) => [entry.permission_name, entry]));
    const effective = new Set(profile.effective_permissions);
    const names = new Set([...base, ...allowed.keys(), ...denied.keys(), ...effective]);
    return [...names].sort().map((permission) => {
      const allow = allowed.get(permission);
      const deny = denied.get(permission);
      const sources = [base.has(permission) ? "Vai trò" : null, allow ? "Điều chỉnh cho phép" : null, deny ? "Điều chỉnh từ chối" : null].filter(Boolean);
      return {
        key: permission,
        permission,
        source: sources.join(" + ") || "Chiếu từ backend",
        effective: effective.has(permission),
        reason: deny?.reason ?? allow?.reason ?? null,
      };
    });
  }, [profile]);

  const columns: TableColumnsType<PermissionRow> = [
    { title: "Quyền", dataIndex: "permission", render: (value: string) => <><strong>{permissionLabel(value)}</strong><div><Typography.Text code>{value}</Typography.Text></div></> },
    { title: "Nguồn", dataIndex: "source", width: 220 },
    { title: "Kết quả hiệu lực", dataIndex: "effective", width: 150, render: (value: boolean) => <Tag color={value ? "green" : "red"}>{value ? "Được phép" : "Bị từ chối"}</Tag> },
    { title: "Lý do điều chỉnh", dataIndex: "reason", render: (value: string | null) => value || "—" },
  ];

  return (
    <div className="cmp-section-stack">
      <SectionHeader title="Quyền hiệu lực" description="Phân biệt quyền từ vai trò, điều chỉnh riêng và kết quả do backend trả về." />
      <Alert
        showIcon
        type="info"
        title="Quyền hiệu lực không phải là quyền thực hiện mọi hành động"
        description="Phạm vi tài nguyên, phân công, năng lực, độc lập và kiểm soát phân tách nhiệm vụ vẫn được backend đánh giá tại thời điểm yêu cầu."
      />
      <DataTable<PermissionRow>
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 12 }}
        rowKey="key"
        responsiveCards={rows.map((row) => ({
          key: row.key,
          title: permissionLabel(row.permission),
          status: <Tag color={row.effective ? "green" : "red"}>{row.effective ? "Được phép" : "Bị từ chối"}</Tag>,
          fields: [
            { key: "code", label: "Mã quyền", value: row.permission },
            { key: "source", label: "Nguồn", value: row.source },
            { key: "reason", label: "Lý do", value: row.reason || "—" },
          ],
        }))}
      />
      <Card size="small" title="Điều chỉnh quyền theo tài khoản">
        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
          <div>Cho phép riêng: {profile.allow_overrides.length ? profile.allow_overrides.map((item) => <Tag key={item.permission_name} color="blue">{item.permission_name}</Tag>) : "Không có"}</div>
          <div>Từ chối riêng: {profile.deny_overrides.length ? profile.deny_overrides.map((item) => <Tag key={item.permission_name} color="red">{item.permission_name}</Tag>) : "Không có"}</div>
          <Typography.Text type="secondary">{profile.role_scope_note}</Typography.Text>
        </Space>
      </Card>
    </div>
  );
}

export function AccountAccessDetailScreen({ userId, section, onNavigate, onBack }: AccountAccessDetailScreenProps) {
  const account = useQuery({
    queryKey: ["system-user", userId],
    queryFn: async () => (await api.get<AccountDetail>(`/users/${userId}`)).data,
  });
  const permissionProfile = useQuery({
    queryKey: ["system-user-permission-profile", userId],
    queryFn: async () => (await api.get<PermissionProfile>(`/users/${userId}/permission-profile`)).data,
    enabled: section === "access",
  });

  if (account.isLoading) return <LoadingSkeleton variant="detail" rows={5} />;
  if (account.isError || !account.data) {
    return <ErrorState description={getErrorMessage(account.error)} retry={{ label: "Thử lại", onAction: () => void account.refetch() }} />;
  }

  const user = account.data;
  const isCustomer = user.roles.some((role) => role.role_name.trim().toLowerCase() === "customer");

  return (
    <div className="account-detail-page">
      <PageHeader
        identity={isCustomer ? "TÀI KHOẢN KHÁCH HÀNG" : "TÀI KHOẢN NỘI BỘ"}
        title={user.full_name || user.username}
        description={`@${user.username} · ${user.email}`}
        metadata={<><Tag color={user.status === "active" ? "green" : "red"}>{user.status === "active" ? "Đang hoạt động" : user.status}</Tag>{user.roles.map((role) => <Tag key={role.id}>{role.role_name}</Tag>)}</>}
        secondaryActions={<Button onClick={onBack}>Danh sách tài khoản</Button>}
      />
      <AccountLocalNavigation section={section} onNavigate={onNavigate} />

      {section === "overview" ? (
        <div className="cmp-section-stack">
          <SectionHeader title="Tổng quan tài khoản" description="Thông tin nhận dạng an toàn từ API quản trị tài khoản hiện có." />
          <EntitySummary items={[
            { label: "Họ và tên", value: user.full_name || "Chưa cập nhật" },
            { label: "Tên đăng nhập", value: user.username },
            { label: "Thư điện tử", value: user.email },
            { label: "Nhóm tài khoản", value: isCustomer ? "Khách hàng" : "Nội bộ" },
            { label: "Vai trò", value: user.roles.map((role) => role.role_name).join(" · ") || "Chưa gán vai trò" },
            { label: "Ngày tạo", value: new Date(user.created_at).toLocaleDateString("vi-VN") },
          ]} />
          {isCustomer ? <ReadOnlyState reason="Liên kết tổ chức và trạng thái truy cập Portal do quy trình quản trị Portal ADMIN-only hiện có kiểm soát; màn hình này không suy đoán liên kết khách hàng." /> : null}
        </div>
      ) : null}

      {section === "access" ? (
        permissionProfile.isLoading ? <LoadingSkeleton variant="list" rows={6} /> : permissionProfile.isError || !permissionProfile.data ? (
          <ErrorState description={getErrorMessage(permissionProfile.error)} retry={{ label: "Thử lại", onAction: () => void permissionProfile.refetch() }} />
        ) : <PermissionInspector profile={permissionProfile.data} />
      ) : null}

      {section === "sessions" ? (
        <div className="cmp-section-stack">
          <SectionHeader title="Phiên & bảo mật" description="Trạng thái bảo mật được API tài khoản hiện tại cung cấp." />
          <EntitySummary items={[
            { label: "Số lần đăng nhập thất bại", value: user.failed_login_count },
            { label: "Khóa đến", value: user.locked_until ? new Date(user.locked_until).toLocaleString("vi-VN") : "Không bị khóa theo thời gian" },
          ]} />
          <ReadOnlyState reason="Backend chưa cung cấp danh sách phiên hoạt động hoặc lịch sử bảo mật theo tài khoản có giới hạn. Không hiển thị, mô phỏng hay thu hồi phiên từ dữ liệu frontend." />
        </div>
      ) : null}

      {section === "activity" ? (
        <div className="cmp-section-stack">
          <SectionHeader title="Hoạt động tài khoản" description="Nhật ký bảo mật chỉ được hiển thị khi có projection theo tài khoản được backend giới hạn." />
          <ReadOnlyState reason="Chưa có endpoint lịch sử hoạt động bảo mật theo tài khoản. Nhật ký hệ thống tổng quát vẫn ở khu vực quản trị nhật ký; màn hình này không tạo lịch sử giả từ sự kiện giao diện." />
        </div>
      ) : null}
    </div>
  );
}
