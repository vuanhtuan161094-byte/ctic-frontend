"use client";

import {
  EyeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { CertificationBodyCapabilitiesPanel } from "./CertificationBodyCapabilitiesPanel";
import { MasterDataConfigurationPanel } from "./MasterDataConfigurationPanel";
import { CustomerPortalAccountModal } from "./CustomerPortalAccountModal";

const { Text } = Typography;

type SchedulerStatus = {
  enabled: boolean;
  environment_disabled: boolean;
  shutting_down: boolean;
  in_flight: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_failure_category: string | null;
};

type Overview = {
  users: {
    total: number;
    active: number;
    inactive: number;
    locked: number;
    internal: number;
    customer: number;
    without_active_role_or_access: number;
    last_login_available: false;
  };
  customer_access: {
    active: number;
    pending_requests: number;
    revoked: number;
    mutation_authority: string;
  };
  experts: {
    active_without_account: number;
    active_with_inactive_account: number;
    suspended_or_deactivated: number;
  };
  security: {
    failed_or_blocked_events: number;
    arbitrary_role_designer: false;
    arbitrary_permission_designer: false;
  };
  notifications: { overdue_unread: number };
  invariants: Array<{ key: string; status: string }>;
  scheduler: SchedulerStatus;
};

type Page<T> = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  items: T[];
};

type CustomerAccess = {
  id: string;
  status: string;
  updated_at: string;
  customer: { customer_code: string; company_name: string };
  user: {
    username: string;
    email: string;
    full_name: string | null;
    status: string;
  };
};

type AuditLog = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  outcome: string | null;
  status_code: number | null;
  duration_ms: number | null;
  details: unknown;
  created_at: string;
  user: {
    username: string;
    full_name: string | null;
    email?: string;
  } | null;
};

type NotificationRecord = {
  id: string;
  category: string;
  title: string;
  severity: string;
  delivery_status: string;
  status: string;
  due_date: string | null;
  created_at: string;
  users: { username: string; full_name: string | null };
};

type ImportRecord = {
  id: string;
  entity_type: string;
  import_mode: string;
  source_file_name: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  committed_rows: number;
  created_at: string;
};

type Health = {
  status: "ok" | "degraded";
  application: {
    alive: boolean;
    version: string;
    build_identifier: string | null;
    environment_category: string;
  };
  database: {
    status: string;
    schema: string;
    migration_count: number;
    latest_migration: string | null;
  };
  storage: { status: string; provider: string };
  scheduler: SchedulerStatus;
  secrets_exposed: false;
};

type DocumentGovernance = {
  storage_provider: string;
  raw_paths_exposed: false;
  document_file_count: number;
  controlled_document_count: number;
  recorded_integrity_failures: number;
  full_storage_scan_performed: false;
};

function statusColor(value: string) {
  const normalized = value.toLowerCase();
  if (
    [
      "active",
      "ok",
      "success",
      "delivered",
      "compatible",
      "writable",
      "connected",
      "committed",
      "recorded",
    ].includes(normalized)
  ) {
    return "green";
  }
  if (
    [
      "failure",
      "blocked",
      "degraded",
      "unavailable",
      "invalid",
      "locked",
    ].includes(normalized)
  ) {
    return "red";
  }
  return "blue";
}

const systemValueLabels: Record<string, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
  locked: "Đã khóa",
  pending: "Chờ xử lý",
  approved: "Đã phê duyệt",
  rejected: "Đã từ chối",
  revoked: "Đã thu hồi",
  ok: "Bình thường",
  success: "Thành công",
  failure: "Thất bại",
  failed: "Thất bại",
  blocked: "Bị chặn",
  degraded: "Suy giảm",
  unavailable: "Không khả dụng",
  invalid: "Không hợp lệ",
  valid: "Hợp lệ",
  delivered: "Đã gửi",
  pending_delivery: "Chờ gửi",
  compatible: "Tương thích",
  writable: "Có thể ghi",
  connected: "Đã kết nối",
  committed: "Đã ghi dữ liệu",
  recorded: "Đã ghi nhận",
  draft: "Bản nháp",
  validated: "Đã kiểm tra",
  warning: "Cảnh báo",
  critical: "Nghiêm trọng",
  info: "Thông tin",
  normal: "Bình thường",
  enabled: "Đang bật",
  disabled: "Đang tắt",
  local: "Cục bộ",
  true: "Có",
  false: "Không",
};

const entityTypeLabels: Record<string, string> = {
  user: "Tài khoản người dùng",
  users: "Tài khoản người dùng",
  customer: "Khách hàng",
  customers: "Khách hàng",
  customer_document_requests: "Yêu cầu tài liệu khách hàng",
  customer_user_access: "Quyền truy cập khách hàng",
  customer_user_access_requests: "Yêu cầu quyền truy cập khách hàng",
  audit_log: "Nhật ký hệ thống",
  audit_logs: "Nhật ký hệ thống",
  notification: "Thông báo",
  notifications: "Thông báo",
  import_job: "Phiên nhập dữ liệu",
  import_jobs: "Phiên nhập dữ liệu",
  document_file: "Tệp tài liệu",
  document_files: "Tệp tài liệu",
};

const auditActionLabels: Record<string, string> = {
  USER_CREATED: "Tạo tài khoản",
  USER_UPDATED: "Cập nhật tài khoản",
  USER_ROLES_UPDATED: "Cập nhật vai trò tài khoản",
  USER_PASSWORD_RESET: "Đặt lại mật khẩu",
  CUSTOMER_PORTAL_USER_CREATED: "Tạo tài khoản cổng khách hàng",
  CUSTOMER_PORTAL_USER_PROVISIONED: "Tạo và cấp quyền tài khoản khách hàng",
  CUSTOMER_PORTAL_ACCESS_LINKED: "Liên kết quyền Portal khách hàng",
  CUSTOMER_PORTAL_PASSWORD_RESET: "Tạo mật khẩu mới cho khách hàng",
  POST_USERS: "Tạo tài khoản",
  PATCH_USERS_ID: "Cập nhật tài khoản",
  PATCH_USERS_ID_ROLES: "Cập nhật vai trò tài khoản",
};

const notificationCategoryLabels: Record<string, string> = {
  GENERAL: "Chung",
  SLA: "Thời hạn xử lý",
  CERTIFICATE: "Chứng chỉ",
  AUDIT: "Đánh giá",
  FINDING: "Phát hiện đánh giá",
  CUSTOMER: "Khách hàng",
  DOCUMENT: "Tài liệu",
  WORK_ITEM: "Công việc",
  SECURITY: "Bảo mật",
  SYSTEM: "Hệ thống",
};

const importEntityLabels: Record<string, string> = {
  SCHEME: "Chương trình chứng nhận",
  STANDARD_EDITION: "Phiên bản tiêu chuẩn",
  IAF_SCOPE: "Lĩnh vực IAF",
  INDUSTRY_CLASSIFICATION: "Phân loại ngành",
  NACE_IAF_MAPPING: "Liên kết NACE - IAF",
};

const importModeLabels: Record<string, string> = {
  CREATE_ONLY: "Chỉ tạo mới",
  UPSERT: "Tạo mới hoặc cập nhật",
};

const auditDetailKeyLabels: Record<string, string> = {
  before: "Trước thay đổi",
  after: "Sau thay đổi",
  username: "Tên đăng nhập",
  email: "Thư điện tử",
  full_name: "Họ và tên",
  status: "Trạng thái",
  roles: "Vai trò",
  role_name: "Vai trò",
  user_id: "Mã tài khoản",
  entity_id: "Mã đối tượng",
  request_id: "Mã yêu cầu",
  customer_id: "Mã khách hàng",
  created_new_user: "Tạo tài khoản mới",
};

const technicalTokenLabels: Record<string, string> = {
  user: "tài khoản",
  users: "tài khoản",
  customer: "khách hàng",
  customers: "khách hàng",
  access: "quyền truy cập",
  request: "yêu cầu",
  requests: "yêu cầu",
  document: "tài liệu",
  documents: "tài liệu",
  audit: "đánh giá",
  audits: "đánh giá",
  log: "nhật ký",
  logs: "nhật ký",
  plan: "kế hoạch",
  plans: "kế hoạch",
  program: "chương trình",
  programs: "chương trình",
  team: "đoàn đánh giá",
  teams: "đoàn đánh giá",
  certificate: "chứng chỉ",
  certificates: "chứng chỉ",
  certification: "chứng nhận",
  decision: "quyết định",
  decisions: "quyết định",
  application: "đơn đăng ký",
  applications: "đơn đăng ký",
  report: "báo cáo",
  reports: "báo cáo",
  finding: "phát hiện",
  findings: "phát hiện",
  project: "hồ sơ",
  projects: "hồ sơ",
  expert: "chuyên gia",
  experts: "chuyên gia",
  competency: "năng lực",
  competencies: "năng lực",
  contract: "hợp đồng",
  contracts: "hợp đồng",
  notification: "thông báo",
  notifications: "thông báo",
  work: "công việc",
  item: "mục",
  items: "mục",
  import: "nhập dữ liệu",
  job: "phiên",
  jobs: "phiên",
  governance: "quản trị",
  case: "vụ việc",
  cases: "vụ việc",
  role: "vai trò",
  roles: "vai trò",
  permission: "quyền",
  permissions: "quyền",
  created: "đã tạo",
  updated: "đã cập nhật",
  deleted: "đã xóa",
  approved: "đã phê duyệt",
  rejected: "đã từ chối",
  status: "trạng thái",
};

function translateTechnicalTokens(value: string) {
  const tokens = value
    .replace(/[./-]+/g, "_")
    .split("_")
    .filter(Boolean);
  const translated = tokens.map((token) => technicalTokenLabels[token.toLowerCase()] ?? token);
  const text = translated.join(" ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : value;
}

function systemValueLabel(value: string | null | undefined) {
  if (!value) return "—";
  return systemValueLabels[value.trim().toLowerCase()] ?? translateTechnicalTokens(value);
}

function entityTypeLabel(value: string | null | undefined) {
  if (!value) return "—";
  return entityTypeLabels[value.trim().toLowerCase()] ?? translateTechnicalTokens(value);
}

function auditActionLabel(value: string) {
  if (auditActionLabels[value]) return auditActionLabels[value];

  const normalizedRoute = value
    .replace(/^POST\s+\/users$/i, "POST_USERS")
    .replace(/^PATCH\s+\/users\/:?id$/i, "PATCH_USERS_ID")
    .replace(/^PATCH\s+\/users\/:?id\/roles$/i, "PATCH_USERS_ID_ROLES");

  if (auditActionLabels[normalizedRoute]) return auditActionLabels[normalizedRoute];

  const routeMatch = value.match(/^(GET|POST|PATCH|PUT|DELETE)\s+\/(.+)$/i);
  if (routeMatch) {
    const verbLabels: Record<string, string> = {
      GET: "Xem",
      POST: "Tạo",
      PATCH: "Cập nhật",
      PUT: "Cập nhật",
      DELETE: "Xóa",
    };
    const pathLabel = translateTechnicalTokens(
      routeMatch[2].replace(/:?id/gi, "").replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ""),
    );
    return `${verbLabels[routeMatch[1].toUpperCase()] ?? "Thực hiện"} ${pathLabel.toLowerCase()}`.trim();
  }

  return translateTechnicalTokens(value);
}

function notificationCategoryLabel(value: string) {
  return notificationCategoryLabels[value.toUpperCase()] ?? translateTechnicalTokens(value);
}

function importEntityLabel(value: string) {
  return importEntityLabels[value.toUpperCase()] ?? translateTechnicalTokens(value);
}

function importModeLabel(value: string) {
  return importModeLabels[value.toUpperCase()] ?? translateTechnicalTokens(value);
}

function yesNo(value: boolean | null | undefined) {
  return value ? "Có" : "Không";
}

function localizeAuditDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(localizeAuditDetails);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        auditDetailKeyLabels[key] ?? translateTechnicalTokens(key),
        localizeAuditDetails(child),
      ]),
    );
  }
  if (typeof value === "string") return systemValueLabel(value);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function AuditJsonBlock({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return (
      <Empty
        description="Không có dữ liệu"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <pre className="system-audit-json">
      {JSON.stringify(localizeAuditDetails(value), null, 2)}
    </pre>
  );
}

export function SystemGovernancePanel() {
  const [accessPage, setAccessPage] = useState(1);
  const [notificationPage, setNotificationPage] = useState(1);
  const [importPage, setImportPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState("");
  const [auditEntity, setAuditEntity] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);
  const [portalAccountOpen, setPortalAccountOpen] = useState(false);

  const auditQuery = useMemo(() => {
    const params = new URLSearchParams({
      page: String(auditPage),
      limit: "25",
    });
    if (auditAction.trim()) params.set("action", auditAction.trim());
    if (auditEntity.trim()) params.set("entity_type", auditEntity.trim());
    return params.toString();
  }, [auditAction, auditEntity, auditPage]);

  const overview = useQuery({
    queryKey: ["system-governance", "overview"],
    queryFn: async () =>
      (await api.get<Overview>("/system-administration/overview")).data,
  });
  const access = useQuery({
    queryKey: ["system-governance", "customer-access", accessPage],
    queryFn: async () =>
      (
        await api.get<Page<CustomerAccess>>(
          `/system-administration/customer-access?page=${accessPage}&limit=25`,
        )
      ).data,
  });
  const notifications = useQuery({
    queryKey: ["system-governance", "notifications", notificationPage],
    queryFn: async () =>
      (
        await api.get<Page<NotificationRecord>>(
          `/system-administration/notifications?page=${notificationPage}&limit=25`,
        )
      ).data,
  });
  const imports = useQuery({
    queryKey: ["system-governance", "imports", importPage],
    queryFn: async () =>
      (
        await api.get<Page<ImportRecord>>(
          `/system-administration/imports?page=${importPage}&limit=25`,
        )
      ).data,
  });
  const health = useQuery({
    queryKey: ["system-governance", "health"],
    queryFn: async () =>
      (await api.get<Health>("/system-administration/health")).data,
  });
  const documents = useQuery({
    queryKey: ["system-governance", "documents"],
    queryFn: async () =>
      (
        await api.get<DocumentGovernance>(
          "/system-administration/document-governance",
        )
      ).data,
  });
  const auditLogs = useQuery({
    queryKey: ["system-governance", "audit", auditQuery],
    queryFn: async () =>
      (await api.get<Page<AuditLog>>(`/audit-logs?${auditQuery}`)).data,
  });

  const refresh = () =>
    Promise.all([
      overview.refetch(),
      access.refetch(),
      notifications.refetch(),
      imports.refetch(),
      health.refetch(),
      documents.refetch(),
      auditLogs.refetch(),
    ]);

  const accessColumns: TableColumnsType<CustomerAccess> = [
    {
      title: "Khách hàng",
      render: (_, row) => (
        <>
          <strong>{row.customer.customer_code}</strong>
          <br />
          <Text type="secondary">{row.customer.company_name}</Text>
        </>
      ),
    },
    {
      title: "Tài khoản",
      render: (_, row) => (
        <>
          {row.user.full_name || row.user.username}
          <br />
          <Text type="secondary">{row.user.email}</Text>
        </>
      ),
    },
    {
      title: "Liên kết truy cập",
      dataIndex: "status",
      render: (value: string) => (
        <Tag color={statusColor(value)}>{systemValueLabel(value)}</Tag>
      ),
    },
    {
      title: "Trạng thái tài khoản",
      render: (_, row) => (
        <Tag color={statusColor(row.user.status)}>{systemValueLabel(row.user.status)}</Tag>
      ),
    },
    {
      title: "Cập nhật",
      dataIndex: "updated_at",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
  ];

  const auditColumns: TableColumnsType<AuditLog> = [
    {
      title: "Thời gian",
      dataIndex: "created_at",
      width: 165,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm:ss"),
    },
    {
      title: "Người thực hiện",
      width: 170,
      render: (_, row) => row.user?.full_name || row.user?.username || "Hệ thống",
    },
    { title: "Hành động", dataIndex: "action", width: 190, render: (value: string) => auditActionLabel(value) },
    {
      title: "Đối tượng",
      width: 280,
      render: (_, row) => (
        <>
          {entityTypeLabel(row.entity_type)}
          <br />
          <Text copyable={Boolean(row.entity_id)} type="secondary">
            {row.entity_id || ""}
          </Text>
        </>
      ),
    },
    {
      title: "Mã yêu cầu",
      dataIndex: "request_id",
      width: 280,
      render: (value: string | null) =>
        value ? <Text copyable>{value}</Text> : "—",
    },
    {
      title: "Kết quả",
      width: 110,
      render: (_, row) => {
        const result =
          row.outcome ||
          (row.status_code && row.status_code >= 400 ? "failure" : "recorded");
        return <Tag color={statusColor(result)}>{systemValueLabel(result)}</Tag>;
      },
    },
    {
      title: "",
      key: "detail",
      fixed: "right",
      width: 105,
      render: (_, row) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => setSelectedAudit(row)}
          size="small"
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const notificationColumns: TableColumnsType<NotificationRecord> = [
    {
      title: "Thông báo",
      render: (_, row) => (
        <>
          {row.title}
          <br />
          <Text type="secondary">{notificationCategoryLabel(row.category)}</Text>
        </>
      ),
    },
    {
      title: "Người nhận",
      render: (_, row) => row.users.full_name || row.users.username,
    },
    {
      title: "Mức độ",
      dataIndex: "severity",
      render: (value: string) => (
        <Tag color={statusColor(value)}>{systemValueLabel(value)}</Tag>
      ),
    },
    {
      title: "Tình trạng gửi",
      dataIndex: "delivery_status",
      render: (value: string) => (
        <Tag color={statusColor(value)}>{systemValueLabel(value)}</Tag>
      ),
    },
    {
      title: "Hạn xử lý",
      dataIndex: "due_date",
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
  ];

  const importColumns: TableColumnsType<ImportRecord> = [
    {
      title: "Tệp",
      render: (_, row) => (
        <>
          {row.source_file_name}
          <br />
          <Text type="secondary">
            {importEntityLabel(row.entity_type)} · {importModeLabel(row.import_mode)}
          </Text>
        </>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (value: string) => (
        <Tag color={statusColor(value)}>{systemValueLabel(value)}</Tag>
      ),
    },
    {
      title: "Dòng",
      render: (_, row) =>
        `${row.committed_rows}/${row.valid_rows}/${row.total_rows}`,
    },
    { title: "Không hợp lệ", dataIndex: "invalid_rows" },
    {
      title: "Tạo lúc",
      dataIndex: "created_at",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
  ];

  const overviewContent = overview.isError ? (
    <Alert type="error" message={getErrorMessage(overview.error)} />
  ) : (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic
              title="Tài khoản hoạt động"
              value={overview.data?.users.active ?? 0}
              suffix={`/ ${overview.data?.users.total ?? 0}`}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic
              title="Bị khóa/ngừng"
              value={
                (overview.data?.users.locked ?? 0) +
                (overview.data?.users.inactive ?? 0)
              }
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic
              title="Yêu cầu truy cập khách hàng chờ duyệt"
              value={overview.data?.customer_access.pending_requests ?? 0}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic
              title="Sự kiện bảo mật"
              value={overview.data?.security.failed_or_blocked_events ?? 0}
            />
          </Card>
        </Col>
      </Row>
      <Alert
        showIcon
        type="info"
        message="Vai trò, quyền và các ràng buộc bảo mật được quản trị trong mã nguồn"
        description="Không cho phép tự thiết kế vai trò khi hệ thống đang chạy. Tài khoản khách hàng có thể được quản trị viên tạo trực tiếp theo từng khách hàng hoặc phát sinh từ yêu cầu của khách hàng."
      />
      <Card title="Rà soát tài khoản và quyền truy cập">
        <Space wrap>
          <Tag>Nội bộ: {overview.data?.users.internal ?? 0}</Tag>
          <Tag>Khách hàng: {overview.data?.users.customer ?? 0}</Tag>
          <Tag color="orange">
            Không có vai trò/quyền truy cập: {overview.data?.users.without_active_role_or_access ?? 0}
          </Tag>
          <Tag color="orange">
            Chuyên gia thiếu tài khoản: {overview.data?.experts.active_without_account ?? 0}
          </Tag>
          <Tag>Lần đăng nhập cuối: chưa được ghi nhận</Tag>
        </Space>
      </Card>
    </Space>
  );

  const selectedAuditDetails = isRecord(selectedAudit?.details)
    ? selectedAudit.details
    : null;
  const beforeValue = selectedAuditDetails?.before;
  const afterValue = selectedAuditDetails?.after;
  const hasBeforeAfter =
    beforeValue !== undefined || afterValue !== undefined;

  return (
    <>
      <Card
        className="system-governance-shell"
        title={
          <Space>
            <SafetyCertificateOutlined />
            Quản trị hệ thống
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void refresh()}
          >
            Làm mới tất cả
          </Button>
        }
      >
        <Tabs
          destroyOnHidden
          items={[
            { key: "overview", label: "Tổng quan", children: overviewContent },
            {
              key: "customer-access",
              label: "Quyền truy cập khách hàng",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <Alert
                      type="info"
                      showIcon
                      message="Quản lý tập trung tài khoản Portal của khách hàng"
                      description="Có thể tạo trực tiếp tài khoản mới tại đây. Yêu cầu do khách hàng gửi vẫn được xử lý ở màn Yêu cầu tài khoản KH."
                      style={{ flex: 1, minWidth: 320 }}
                    />
                    <Button
                      type="primary"
                      icon={<UserAddOutlined />}
                      onClick={() => setPortalAccountOpen(true)}
                    >
                      Tạo tài khoản khách hàng
                    </Button>
                  </div>
                  <Table
                    rowKey="id"
                    columns={accessColumns}
                    dataSource={access.data?.items ?? []}
                    loading={access.isLoading}
                    pagination={{
                      current: accessPage,
                      pageSize: 25,
                      total: access.data?.total,
                      onChange: setAccessPage,
                    }}
                  />
                </Space>
              ),
            },
            {
              key: "audit",
              label: "Nhật ký hệ thống",
              children: (
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <div className="system-audit-filter-bar">
                    <Input
                      allowClear
                      placeholder="Lọc theo hành động"
                      value={auditAction}
                      onChange={(event) => {
                        setAuditPage(1);
                        setAuditAction(event.target.value);
                      }}
                    />
                    <Input
                      allowClear
                      placeholder="Lọc theo loại đối tượng"
                      value={auditEntity}
                      onChange={(event) => {
                        setAuditPage(1);
                        setAuditEntity(event.target.value);
                      }}
                    />
                  </div>
                  <Alert
                    type="info"
                    showIcon
                    message="Nhật ký hệ thống chỉ đọc; giao diện không cho phép sửa hoặc xóa"
                    description="Bấm “Chi tiết” ở từng dòng để xem dữ liệu trước/sau thay đổi, mã phản hồi và thông tin yêu cầu khi cần đối chiếu."
                  />
                  <Table
                    rowKey="id"
                    columns={auditColumns}
                    dataSource={auditLogs.data?.items ?? []}
                    loading={auditLogs.isLoading}
                    locale={{
                      emptyText: auditLogs.isError
                        ? getErrorMessage(auditLogs.error)
                        : "Không có nhật ký phù hợp",
                    }}
                    pagination={{
                      current: auditPage,
                      pageSize: 25,
                      total: auditLogs.data?.total,
                      onChange: setAuditPage,
                      showTotal: (total) => `${total} bản ghi`,
                    }}
                    scroll={{ x: 1350 }}
                  />
                </Space>
              ),
            },
            {
              key: "configuration",
              label: "Cấu hình",
              children: (
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                  <Alert
                    type="info"
                    showIcon
                    message="Tái sử dụng cấu hình từ Giai đoạn 7; phân tách nhiệm vụ, cô lập dữ liệu khách hàng và tính bất biến của tài liệu không phải các tùy chọn có thể bật/tắt."
                  />
                  <CertificationBodyCapabilitiesPanel />
                  <MasterDataConfigurationPanel />
                </Space>
              ),
            },
            {
              key: "notifications",
              label: "Thông báo / thời hạn xử lý",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Alert
                    type={
                      overview.data?.scheduler.environment_disabled
                        ? "warning"
                        : "success"
                    }
                    showIcon
                    message={`Bộ lập lịch ${
                      overview.data?.scheduler.environment_disabled
                        ? "được tắt trong môi trường kiểm thử"
                        : "đang bật"
                    }; không cho phép chạy tức thời tùy ý.`}
                  />
                  <Table
                    rowKey="id"
                    columns={notificationColumns}
                    dataSource={notifications.data?.items ?? []}
                    loading={notifications.isLoading}
                    pagination={{
                      current: notificationPage,
                      pageSize: 25,
                      total: notifications.data?.total,
                      onChange: setNotificationPage,
                    }}
                  />
                </Space>
              ),
            },
            {
              key: "imports",
              label: "Trung tâm nhập dữ liệu",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Alert
                    type="info"
                    showIcon
                    message="Phạm vi nhập dữ liệu vẫn do Giai đoạn 7 quy định; Quản trị hệ thống chỉ hiển thị lịch sử."
                  />
                  <Table
                    rowKey="id"
                    columns={importColumns}
                    dataSource={imports.data?.items ?? []}
                    loading={imports.isLoading}
                    pagination={{
                      current: importPage,
                      pageSize: 25,
                      total: imports.data?.total,
                      onChange: setImportPage,
                    }}
                  />
                </Space>
              ),
            },
            {
              key: "health",
              label: "Tình trạng hệ thống",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Alert
                    type={health.data?.status === "ok" ? "success" : "warning"}
                    showIcon
                    message={`Tình trạng ứng dụng: ${systemValueLabel(health.data?.status ?? "pending")}`}
                  />
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={8}>
                      <Card>
                        <Statistic
                          title="Cơ sở dữ liệu / lược đồ"
                          value={`${systemValueLabel(health.data?.database.status)} / ${systemValueLabel(health.data?.database.schema)}`}
                        />
                        <Text type="secondary">
                          Số bản cập nhật cấu trúc: {health.data?.database.migration_count ?? "—"}
                        </Text>
                      </Card>
                    </Col>
                    <Col xs={24} md={8}>
                      <Card>
                        <Statistic
                          title="Lưu trữ"
                          value={`${systemValueLabel(health.data?.storage.provider)} / ${systemValueLabel(health.data?.storage.status)}`}
                        />
                        <Text type="secondary">Không hiển thị đường dẫn vật lý</Text>
                      </Card>
                    </Col>
                    <Col xs={24} md={8}>
                      <Card>
                        <Statistic
                          title="Tác vụ đang chạy"
                          value={health.data?.scheduler.in_flight ?? 0}
                        />
                        <Text type="secondary">
                          Lộ thông tin bí mật: {yesNo(health.data?.secrets_exposed)}
                        </Text>
                      </Card>
                    </Col>
                  </Row>
                  <Card title="Quản trị tài liệu">
                    <Space wrap>
                      <Tag>Tệp: {documents.data?.document_file_count ?? 0}</Tag>
                      <Tag>
                        Tài liệu được kiểm soát: {documents.data?.controlled_document_count ?? 0}
                      </Tag>
                      <Tag
                        color={
                          documents.data?.recorded_integrity_failures ? "red" : "green"
                        }
                      >
                        Lỗi toàn vẹn đã ghi nhận: {documents.data?.recorded_integrity_failures ?? 0}
                      </Tag>
                      <Tag>
                        Quét toàn bộ kho: {yesNo(documents.data?.full_storage_scan_performed)}
                      </Tag>
                    </Space>
                  </Card>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <CustomerPortalAccountModal
        open={portalAccountOpen}
        onClose={() => setPortalAccountOpen(false)}
        onSuccess={async () => {
          await Promise.all([overview.refetch(), access.refetch()]);
        }}
      />

      <Drawer
        destroyOnClose
        onClose={() => setSelectedAudit(null)}
        open={Boolean(selectedAudit)}
        title="Chi tiết nhật ký hệ thống"
        width={760}
      >
        {selectedAudit ? (
          <div className="system-audit-detail-stack">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Thời gian" span={2}>
                {dayjs(selectedAudit.created_at).format("DD/MM/YYYY HH:mm:ss")}
              </Descriptions.Item>
              <Descriptions.Item label="Người thực hiện">
                {selectedAudit.user?.full_name ||
                  selectedAudit.user?.username ||
                  "Hệ thống"}
              </Descriptions.Item>
              <Descriptions.Item label="Kết quả">
                <Tag
                  color={statusColor(
                    selectedAudit.outcome ||
                      (selectedAudit.status_code && selectedAudit.status_code >= 400
                        ? "failure"
                        : "recorded"),
                  )}
                >
                  {systemValueLabel(
                    selectedAudit.outcome ||
                      (selectedAudit.status_code && selectedAudit.status_code >= 400
                        ? "failure"
                        : "recorded"),
                  )}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Hành động">
                <Text strong>{auditActionLabel(selectedAudit.action)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Loại đối tượng">
                {entityTypeLabel(selectedAudit.entity_type)}
              </Descriptions.Item>
              <Descriptions.Item label="Mã đối tượng" span={2}>
                {selectedAudit.entity_id ? (
                  <Text copyable>{selectedAudit.entity_id}</Text>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Mã yêu cầu" span={2}>
                {selectedAudit.request_id ? (
                  <Text copyable>{selectedAudit.request_id}</Text>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Mã phản hồi HTTP">
                {selectedAudit.status_code ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian xử lý">
                {selectedAudit.duration_ms === null
                  ? "—"
                  : `${selectedAudit.duration_ms} ms`}
              </Descriptions.Item>
              <Descriptions.Item label="IP" span={2}>
                {selectedAudit.ip_address || "—"}
              </Descriptions.Item>
            </Descriptions>

            {hasBeforeAfter ? (
              <div className="system-audit-change-grid">
                <Card size="small" title="Trước thay đổi">
                  <AuditJsonBlock value={beforeValue} />
                </Card>
                <Card size="small" title="Sau thay đổi">
                  <AuditJsonBlock value={afterValue} />
                </Card>
              </div>
            ) : (
              <Card size="small" title="Dữ liệu chi tiết">
                <AuditJsonBlock value={selectedAudit.details} />
              </Card>
            )}

            {selectedAudit.user_agent ? (
              <Card size="small" title="Thông tin trình duyệt/thiết bị">
                <Text className="system-audit-user-agent" type="secondary">
                  {selectedAudit.user_agent}
                </Text>
              </Card>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
