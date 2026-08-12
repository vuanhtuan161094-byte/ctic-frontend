"use client";

import {
  AppstoreOutlined,
  BankOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoreOutlined,
  NotificationOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { InputRef, MenuProps, TableColumnsType } from "antd";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Drawer,
  Dropdown,
  Empty,
  Grid,
  Input,
  Layout,
  List,
  Menu,
  Modal,
  Popover,
  Progress,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";

import { api, type AuthSession, getErrorMessage } from "../lib/api";
import { PLATFORM_BRANDING } from "../lib/platform-branding";
import {
  resolveTaskNavigation,
  type TaskDestination,
} from "../lib/task-navigation";
import type {
  DashboardAlert,
  DashboardOverview,
  RecentCertificate,
  RecentProject,
  StatusCount,
  UpcomingAudit,
} from "../types/dashboard";
import { CertificationProjectDetailScreen } from "./CertificationProjectDetailScreen";
import { CertificationProjectsScreen } from "./CertificationProjectsScreen";
import { CertificatesScreen } from "./CertificatesScreen";
import { CustomersScreen } from "./CustomersScreen";
import { CustomerCorrectiveActionsScreen } from "./CustomerCorrectiveActionsScreen";
import { DocumentsScreen } from "./DocumentsScreen";
import { ExpertsScreen } from "./ExpertsScreen";
import { MyTasksScreen } from "./MyTasksScreen";
import { ReportsScreen } from "./ReportsScreen";
import { ScheduleResourcesScreen } from "./ScheduleResourcesScreen";
import { SystemAdminScreen } from "./SystemAdminScreen";

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

interface DashboardShellProps {
  session: AuthSession;
  onLogout: () => void;
}

interface SearchResult {
  key: string;
  type: string;
  title: string;
  description: string;
  destination?: TaskDestination;
  entityType?: string | null;
  entityId?: string | null;
}

interface WorkTaskPreview {
  id: string;
  title: string;
  description: string;
  group: string;
  priority: "critical" | "high" | "normal";
  source_status: string;
  due_date: string | null;
  destination: TaskDestination;
  target_id: string | null;
  project_code: string | null;
}

interface WorkTaskPreviewResponse {
  summary: {
    total: number;
    overdue: number;
    due_soon: number;
    high_priority: number;
  };
  items: WorkTaskPreview[];
}

type ActiveView =
  | "dashboard"
  | "my-tasks"
  | "customers"
  | "applications"
  | "projects"
  | "project-detail"
  | "schedule-resources"
  | "certificates"
  | "documents"
  | "experts"
  | "reports"
  | "system-admin";

interface BrowserNavigationState {
  activeView: ActiveView;
  selectedProjectId: string | null;
  selectedCertificateId: string | null;
  selectedAuditPlanId: string | null;
}

const activeViewValues: ActiveView[] = [
  "dashboard",
  "my-tasks",
  "customers",
  "applications",
  "projects",
  "project-detail",
  "schedule-resources",
  "certificates",
  "documents",
  "experts",
  "reports",
  "system-admin",
];

function isActiveView(value: unknown): value is ActiveView {
  return typeof value === "string" && activeViewValues.includes(value as ActiveView);
}

function readBrowserNavigationState(rawState: unknown): BrowserNavigationState | null {
  if (!rawState || typeof rawState !== "object") return null;

  const wrapped = (rawState as { cticNavigation?: unknown }).cticNavigation;
  if (!wrapped || typeof wrapped !== "object") return null;

  const candidate = wrapped as Partial<BrowserNavigationState>;
  if (!isActiveView(candidate.activeView)) return null;

  return {
    activeView: candidate.activeView,
    selectedProjectId: typeof candidate.selectedProjectId === "string" ? candidate.selectedProjectId : null,
    selectedCertificateId: typeof candidate.selectedCertificateId === "string" ? candidate.selectedCertificateId : null,
    selectedAuditPlanId: typeof candidate.selectedAuditPlanId === "string" ? candidate.selectedAuditPlanId : null,
  };
}

function createBrowserHistoryPayload(navigation: BrowserNavigationState) {
  const currentState = window.history.state;
  const baseState = currentState && typeof currentState === "object" ? currentState : {};

  return {
    ...baseState,
    cticNavigation: navigation,
  };
}

const statusLabels: Record<string, string> = {
  accepted: "Đã chấp nhận",
  active: "Đang hiệu lực",
  approved: "Đã phê duyệt",
  certificate_issued: "Đã cấp chứng chỉ",
  closed: "Đã đóng",
  completed: "Hoàn thành",
  conformity_after_ca: "Phù hợp sau khắc phục",
  corrective_action_required: "Chờ khắc phục NC",
  draft: "Bản nháp",
  expired: "Đã hết hạn",
  in_progress: "Đang xử lý",
  in_review: "Đang thẩm xét",
  initial: "Đánh giá chứng nhận lần đầu",
  issued: "Đã phát hành",
  overdue: "Quá hạn",
  pending: "Chờ xử lý",
  pending_technical_review: "Chờ thẩm xét kỹ thuật",
  planned: "Đã lập kế hoạch",
  project_created: "Đã tạo dự án",
  recertification: "Đánh giá chứng nhận lại",
  replaced: "Đã được thay thế",
  response_submitted: "Đã gửi phản hồi",
  revision_required: "Yêu cầu bổ sung",
  stage1: "Đánh giá giai đoạn 1",
  stage2: "Đánh giá giai đoạn 2",
  submitted: "Đã gửi",
  suspended: "Tạm đình chỉ",
  surveillance: "Đánh giá giám sát",
  surveillance1: "Đánh giá giám sát lần 1",
  surveillance2: "Đánh giá giám sát lần 2",
  technical_review_completed: "Đã thẩm xét kỹ thuật",
  under_review: "Đang xem xét",
  withdrawn: "Đã thu hồi",
};

const statusColors: Record<string, string> = {
  accepted: "green",
  active: "green",
  approved: "green",
  certificate_issued: "blue",
  closed: "green",
  completed: "green",
  corrective_action_required: "orange",
  draft: "default",
  expired: "red",
  in_progress: "processing",
  in_review: "processing",
  issued: "blue",
  overdue: "red",
  pending: "gold",
  planned: "cyan",
  project_created: "blue",
  replaced: "default",
  response_submitted: "blue",
  revision_required: "orange",
  suspended: "orange",
  technical_review_completed: "green",
  under_review: "processing",
  withdrawn: "red",
};

const taskAlertTypes = new Set([
  "open_finding",
  "overdue_finding",
  "technical_review_revision",
  "unsent_notification",
]);

const roleMenuKeys: Record<string, string[]> = {
  admin: ["dashboard", "my-tasks", "customers", "applications", "projects", "schedule-resources", "certificates", "documents", "experts", "reports", "system-admin"],
  staff: ["dashboard", "my-tasks", "customers", "applications", "projects", "schedule-resources", "certificates", "documents", "reports"],
  sales: ["dashboard", "my-tasks", "customers", "applications", "projects", "documents", "reports"],
  coordinator: ["dashboard", "my-tasks", "customers", "applications", "projects", "schedule-resources", "certificates", "documents", "experts", "reports"],
  lead_auditor: ["dashboard", "my-tasks", "projects", "schedule-resources", "documents", "experts", "reports"],
  auditor: ["dashboard", "my-tasks", "projects", "schedule-resources", "documents", "reports"],
  technical_reviewer: ["dashboard", "my-tasks", "applications", "projects", "documents", "experts", "reports"],
  decision_maker: ["dashboard", "my-tasks", "applications", "projects", "certificates", "documents", "reports"],
  customer: ["dashboard", "my-tasks", "projects", "certificates"],
};

function normalizeStatus(status?: string | null) {
  return (status ?? "unknown").trim().toLowerCase();
}

function getStatusLabel(status?: string | null) {
  const normalized = normalizeStatus(status);
  return statusLabels[normalized] ?? normalized.replaceAll("_", " ");
}

function translateTechnicalText(value?: string | null) {
  if (!value) return "";

  return Object.entries(statusLabels).reduce(
    (text, [technicalKey, label]) =>
      text.replace(new RegExp(`\\b${technicalKey}\\b`, "gi"), label),
    value,
  );
}

function StatusTag({ status }: { status?: string | null }) {
  const normalized = normalizeStatus(status);
  const icon = ["active", "approved", "completed", "closed"].includes(normalized)
    ? <CheckCircleOutlined />
    : ["expired", "overdue", "withdrawn"].includes(normalized)
      ? <WarningOutlined />
      : <ClockCircleOutlined />;

  return (
    <Tag color={statusColors[normalized] ?? "default"} icon={icon}>
      {getStatusLabel(status)}
    </Tag>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY") : "—";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("HH:mm · DD/MM/YYYY") : "—";
}

function formatRole(role?: string) {
  const labels: Record<string, string> = {
    admin: "Quản trị viên hệ thống",
    auditor: "Chuyên gia đánh giá",
    coordinator: "Điều phối viên chứng nhận",
    decision_maker: "Người ra quyết định",
    lead_auditor: "Trưởng đoàn đánh giá",
    sales: "Kinh doanh",
    staff: "Nhân viên",
    technical_reviewer: "Thẩm xét viên kỹ thuật",
  };
  return labels[role?.toLowerCase() ?? ""] ?? role ?? "Người dùng";
}

function getDisplayName(session: AuthSession) {
  return session.user.full_name?.trim() || session.user.username;
}

function getDueMeta(value?: string | null) {
  if (!value) return { label: "Chưa thiết lập hạn", className: "due-neutral" };
  const dueDate = dayjs(value).startOf("day");
  const today = dayjs().startOf("day");
  const days = dueDate.diff(today, "day");

  if (days < 0) return { label: `Quá hạn ${Math.abs(days)} ngày`, className: "due-overdue" };
  if (days === 0) return { label: "Đến hạn hôm nay", className: "due-today" };
  if (days <= 3) return { label: `Còn ${days} ngày`, className: "due-soon" };
  if (days <= 7) return { label: `Còn ${days} ngày`, className: "due-watch" };
  return { label: `Hạn ${formatDate(value)}`, className: "due-neutral" };
}

function formatTaskPreviewDue(value?: string | null) {
  if (!value) return "Chưa có hạn";

  const dueDate = dayjs(value).startOf("day");
  const today = dayjs().startOf("day");
  const days = dueDate.diff(today, "day");

  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return "Đến hạn hôm nay";
  if (days <= 7) return `Còn ${days} ngày`;
  return dueDate.format("DD/MM/YYYY");
}

function getAlertIcon(severity: DashboardAlert["severity"]) {
  if (severity === "critical") return <WarningOutlined />;
  if (severity === "warning") return <ClockCircleOutlined />;
  return <NotificationOutlined />;
}

function getAlertClass(severity: DashboardAlert["severity"]) {
  return `alert-indicator alert-${severity}`;
}

function getProjectPriority(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (["corrective_action_required", "revision_required"].includes(normalized)) {
    return <Tag color="orange" icon={<WarningOutlined />}>Cần xử lý</Tag>;
  }
  if (["pending", "under_review", "in_review"].includes(normalized)) {
    return <Tag color="blue" icon={<ClockCircleOutlined />}>Đang theo dõi</Tag>;
  }
  return <Tag icon={<CheckCircleOutlined />}>Bình thường</Tag>;
}

function MenuLabel({ label, count }: { label: string; count?: number }) {
  return (
    <span className="menu-label-with-count">
      <span>{label}</span>
      {count ? <Badge count={count} size="small" /> : null}
    </span>
  );
}

function StatusBreakdown({ data, onSelect }: { data: StatusCount[]; onSelect: (status: string) => void }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (!data.length || (data.length === 1 && data[0]?.count === total)) {
    return (
      <div className="single-stage-state">
        <CheckCircleOutlined />
        <div><strong>{data[0]?.count ?? 0} hồ sơ</strong><span>{getStatusLabel(data[0]?.status)}</span></div>
      </div>
    );
  }

  return (
    <div className="status-breakdown">
      {data.slice(0, 7).map((item) => {
        const percentage = total ? Math.round((item.count / total) * 100) : 0;
        return (
          <button className="status-row-button" key={item.status} onClick={() => onSelect(item.status)} type="button">
            <span className="status-row-heading"><span>{getStatusLabel(item.status)}</span><strong>{item.count}</strong></span>
            <Progress percent={percentage} showInfo={false} strokeColor="#1a6ac7" size="small" />
          </button>
        );
      })}
    </div>
  );
}

export function DashboardShell({ session, onLogout }: DashboardShellProps) {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | null>(null);
  const [selectedAuditPlanId, setSelectedAuditPlanId] = useState<string | null>(null);
  const [openingAlertId, setOpeningAlertId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [warningDays, setWarningDays] = useState(30);
  const [standardFilter, setStandardFilter] = useState("all");
  const [certificateTab, setCertificateTab] = useState("expiring");
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);
  const searchInputRef = useRef<InputRef>(null);
  const historyReadyRef = useRef(false);
  const restoringHistoryRef = useRef(false);
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);

  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview", warningDays],
    queryFn: async () => {
      const response = await api.get<DashboardOverview>(`/dashboard/overview?warning_days=${warningDays}`);
      return response.data;
    },
  });

  const taskSummaryQuery = useQuery({
    queryKey: ["work-tasks", "summary"],
    queryFn: async () => {
      const response = await api.get<WorkTaskPreviewResponse>(
        "/notifications/me/tasks?limit=5",
      );
      return response.data;
    },
    staleTime: 20_000,
  });

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    const applyNavigationState = (navigation: BrowserNavigationState) => {
      setActiveView(navigation.activeView);
      setSelectedProjectId(navigation.selectedProjectId);
      setSelectedCertificateId(navigation.selectedCertificateId);
      setSelectedAuditPlanId(navigation.selectedAuditPlanId);
    };

    const storedNavigation = readBrowserNavigationState(window.history.state);

    if (storedNavigation) {
      restoringHistoryRef.current = true;
      applyNavigationState(storedNavigation);
    } else {
      const initialNavigation: BrowserNavigationState = {
        activeView: "dashboard",
        selectedProjectId: null,
        selectedCertificateId: null,
        selectedAuditPlanId: null,
      };

      window.history.replaceState(
        createBrowserHistoryPayload(initialNavigation),
        "",
      );
    }

    historyReadyRef.current = true;

    const handlePopState = (event: PopStateEvent) => {
      const navigation = readBrowserNavigationState(event.state) ?? {
        activeView: "dashboard",
        selectedProjectId: null,
        selectedCertificateId: null,
        selectedAuditPlanId: null,
      };

      restoringHistoryRef.current = true;
      applyNavigationState(navigation);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!historyReadyRef.current) return;

    const navigation: BrowserNavigationState = {
      activeView,
      selectedProjectId,
      selectedCertificateId,
      selectedAuditPlanId,
    };

    if (restoringHistoryRef.current) {
      restoringHistoryRef.current = false;
      return;
    }

    const currentNavigation = readBrowserNavigationState(window.history.state);
    const isSameNavigation = currentNavigation
      && currentNavigation.activeView === navigation.activeView
      && currentNavigation.selectedProjectId === navigation.selectedProjectId
      && currentNavigation.selectedCertificateId === navigation.selectedCertificateId
      && currentNavigation.selectedAuditPlanId === navigation.selectedAuditPlanId;

    if (isSameNavigation) return;

    window.history.pushState(
      createBrowserHistoryPayload(navigation),
      "",
    );
  }, [activeView, selectedProjectId, selectedCertificateId, selectedAuditPlanId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeView, selectedProjectId, selectedCertificateId, selectedAuditPlanId]);

  const data = overviewQuery.data;
  const taskCount = taskSummaryQuery.data?.summary.total ?? 0;
  const primaryRole = normalizeStatus(session.user.roles?.[0] ?? "staff");
  const customerPortalMode = session.user.roles.some(
    (role) => normalizeStatus(role) === "customer",
  );

  const standards = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set([
      ...data.recent_projects.map((item) => item.standard_name),
      ...data.upcoming_audits.map((item) => item.audit_programs?.standard_name ?? ""),
    ].filter(Boolean))).sort();
  }, [data]);

  const filteredProjects = useMemo(() => {
    if (!data) return [];
    return standardFilter === "all"
      ? data.recent_projects
      : data.recent_projects.filter((item) => item.standard_name === standardFilter);
  }, [data, standardFilter]);

  const filteredAudits = useMemo(() => {
    if (!data) return [];
    return standardFilter === "all"
      ? data.upcoming_audits
      : data.upcoming_audits.filter((item) => item.audit_programs?.standard_name === standardFilter);
  }, [data, standardFilter]);

  const taskItems = useMemo(
    () => data?.priority_alerts.filter((item) => taskAlertTypes.has(item.alert_type)) ?? [],
    [data],
  );

  const alertItems = useMemo(
    () => data?.priority_alerts.filter((item) => !taskAlertTypes.has(item.alert_type)) ?? [],
    [data],
  );

  const certificateItems = useMemo(() => {
    if (!data) return [];
    const today = dayjs();
    return data.recent_certificates.filter((item) => {
      const status = normalizeStatus(item.status);
      if (certificateTab === "new") return status === "active";
      if (certificateTab === "replaced") return status === "replaced";
      if (certificateTab === "suspended") return status === "suspended";
      if (certificateTab === "withdrawn") return status === "withdrawn";
      const days = dayjs(item.expire_date).diff(today, "day");
      return status === "active" && days >= 0 && days <= warningDays;
    });
  }, [certificateTab, data, warningDays]);

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!data || searchTerm.trim().length < 2) return [];
    const keyword = searchTerm.trim().toLocaleLowerCase("vi");
    const results: SearchResult[] = [];

    data.recent_projects.forEach((item) => {
      const customer = item.certification_applications?.customers;
      const searchable = [item.project_code, item.standard_name, customer?.customer_code, customer?.company_name].join(" ").toLocaleLowerCase("vi");
      if (searchable.includes(keyword)) {
        results.push({ key: `project-${item.id}`, type: "Hồ sơ chứng nhận", title: item.project_code, description: `${customer?.company_name ?? "—"} · ${item.standard_name}`, destination: "project-detail", entityId: item.id });
      }
    });

    data.recent_certificates.forEach((item) => {
      if (item.cert_number.toLocaleLowerCase("vi").includes(keyword)) {
        results.push({ key: `certificate-${item.id}`, type: "Chứng chỉ", title: item.cert_number, description: `Hiệu lực đến ${formatDate(item.expire_date)}`, destination: "certificates", entityId: item.id });
      }
    });

    data.priority_alerts.forEach((item) => {
      const searchable = `${item.title} ${item.message}`.toLocaleLowerCase("vi");
      if (searchable.includes(keyword)) {
        results.push({ key: `alert-${item.id}`, type: "Công việc / cảnh báo", title: translateTechnicalText(item.title), description: translateTechnicalText(item.message), entityType: item.entity_type, entityId: item.entity_id });
      }
    });

    return results.slice(0, 10);
  }, [data, searchTerm]);

  const openPlannedScreen = (label: string) => {
    message.info(`${label} đang được hoàn thiện trong bước tiếp theo.`);
  };

  const openTaskDestination = (
    destination: TaskDestination,
    entityId?: string | null,
  ) => {
    setSelectedProjectId(null);
    setSelectedCertificateId(null);
    setSelectedAuditPlanId(null);

    if (destination === "project-detail") {
      if (!entityId) {
        setActiveView("projects");
        return;
      }

      setSelectedProjectId(entityId);
      setActiveView("project-detail");
      return;
    }

    if (destination === "certificates") {
      setSelectedCertificateId(entityId ?? null);
      setActiveView("certificates");
      return;
    }

    if (destination === "schedule-resources") {
      setSelectedAuditPlanId(entityId ?? null);
      setActiveView("schedule-resources");
      return;
    }

    setActiveView("projects");
  };

  const openResolvedTask = async (
    entityType?: string | null,
    entityId?: string | null,
    loadingKey?: string,
  ) => {
    if (loadingKey) setOpeningAlertId(loadingKey);

    try {
      const target = await resolveTaskNavigation(entityType, entityId);
      openTaskDestination(target.destination, target.entityId);
    } catch (error) {
      const detail = error instanceof Error && error.constructor === Error
        ? error.message
        : getErrorMessage(error);
      message.warning(`${detail} Đã mở Trung tâm công việc để bạn tiếp tục tra cứu.`);
      setActiveView("my-tasks");
    } finally {
      if (loadingKey) setOpeningAlertId(null);
    }
  };

  const openSearchResult = async (result: SearchResult) => {
    setSearchOpen(false);
    setSearchTerm("");

    if (result.destination) {
      openTaskDestination(result.destination, result.entityId);
      return;
    }

    await openResolvedTask(result.entityType, result.entityId, result.key);
  };

  const navigationItems = useMemo<MenuProps["items"]>(() => {
    const visibleKeys = new Set(roleMenuKeys[primaryRole] ?? roleMenuKeys.staff);
    const filterItems = (items: NonNullable<MenuProps["items"]>) => items.filter((item) => item && "key" in item && visibleKeys.has(String(item.key)));

    const groups: NonNullable<MenuProps["items"]> = [
      {
        key: "workspace-group",
        type: "group",
        label: "ĐIỀU HÀNH",
        children: filterItems([
          { key: "dashboard", icon: <AppstoreOutlined />, label: "Tổng quan" },
          { key: "my-tasks", icon: <CheckCircleOutlined />, label: <MenuLabel label="Công việc của tôi" count={taskCount} /> },
        ]),
      },
      {
        key: "operations-group",
        type: "group",
        label: "QUẢN LÝ CHỨNG NHẬN",
        children: filterItems([
          { key: "customers", icon: <BankOutlined />, label: "Khách hàng" },
          { key: "applications", icon: <FileSearchOutlined />, label: "Đơn đăng ký" },
          { key: "projects", icon: <FolderOpenOutlined />, label: "Hồ sơ chứng nhận" },
          { key: "schedule-resources", icon: <CalendarOutlined />, label: "Lịch & nguồn lực" },
          { key: "certificates", icon: <SafetyCertificateOutlined />, label: <MenuLabel label="Chứng chỉ" count={data?.summary.certificates.expiring} /> },
          { key: "documents", icon: <FileDoneOutlined />, label: "Tài liệu" },
          { key: "experts", icon: <IdcardOutlined />, label: "Chuyên gia & năng lực" },
          { key: "reports", icon: <NotificationOutlined />, label: "Báo cáo" },
        ]),
      },
      {
        key: "administration-group",
        type: "group",
        label: "HỆ THỐNG",
        children: filterItems([
          { key: "system-admin", icon: <TeamOutlined />, label: "Quản trị hệ thống" },
        ]),
      },
    ];

    return groups.filter((item) => item && "children" in item && Array.isArray(item.children) && item.children.length > 0);
  }, [data?.summary.certificates.expiring, primaryRole, taskCount]);

  const projectColumns = useMemo<TableColumnsType<RecentProject>>(() => [
    { title: "Mã hồ sơ", dataIndex: "project_code", key: "project_code", render: (value: string) => <Text className="code-value" strong>{value}</Text> },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, record) => <div className="table-primary-cell"><span>{record.certification_applications?.customers?.company_name ?? "—"}</span><small>{record.certification_applications?.customers?.customer_code ?? ""}</small></div>,
    },
    { title: "Tiêu chuẩn", dataIndex: "standard_name", key: "standard_name", responsive: ["md"] },
    { title: "Giai đoạn hiện tại", dataIndex: "status", key: "status", render: (value: string) => <StatusTag status={value} /> },
    { title: "Người phụ trách", key: "owner", responsive: ["lg"], render: () => <Text type="secondary">Chưa có dữ liệu</Text> },
    { title: "Hạn xử lý", key: "due_date", responsive: ["xl"], render: () => <Text type="secondary">Chưa thiết lập</Text> },
    { title: "Ưu tiên", dataIndex: "status", key: "priority", render: (value: string) => getProjectPriority(value) },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              { key: `${record.id}-open`, label: "Mở hồ sơ", onClick: () => openTaskDestination("project-detail", record.id) },
              { key: `${record.id}-progress`, label: "Xem tiến độ", onClick: () => openTaskDestination("project-detail", record.id) },
              { key: `${record.id}-assign`, label: "Phân công", onClick: () => openTaskDestination("schedule-resources", null) },
              { key: `${record.id}-documents`, label: "Xem tài liệu", onClick: () => setActiveView("documents") },
              { key: `${record.id}-history`, label: "Xem lịch sử xử lý", onClick: () => openTaskDestination("project-detail", record.id) },
            ],
          }}
          trigger={["click"]}
        >
          <Button aria-label={`Thao tác hồ sơ ${record.project_code}`} icon={<MoreOutlined />} type="text" />
        </Dropdown>
      ),
    },
  ], []);

  const accountItems: MenuProps["items"] = [
    { key: "account", icon: <UserOutlined />, label: session.user.username, disabled: true },
    { type: "divider" },
    { key: "logout", icon: <LogoutOutlined />, label: "Đăng xuất", danger: true, onClick: onLogout },
  ];

  const navigation = (
    <>
      <div className="side-brand">
        <span className="side-brand-mark">{PLATFORM_BRANDING.shortName}</span>
        <span className="side-brand-copy"><strong>{PLATFORM_BRANDING.organizationName}</strong><small>{PLATFORM_BRANDING.platformName}</small></span>
      </div>
      <Menu
        className="main-menu main-menu-v2"
        items={navigationItems}
        mode="inline"
        onClick={({ key }) => {
          setMobileMenuOpen(false);
          if (key === "dashboard") {
            setActiveView("dashboard");
            setSelectedProjectId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "my-tasks") {
            setActiveView("my-tasks");
            setSelectedProjectId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "customers") {
            setActiveView("customers");
            setSelectedProjectId(null);
            setSelectedCertificateId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "applications") {
            setActiveView("applications");
            setSelectedProjectId(null);
            setSelectedCertificateId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "projects") {
            setActiveView("projects");
            setSelectedProjectId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "schedule-resources") {
            setActiveView("schedule-resources");
            setSelectedProjectId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "certificates") {
            setActiveView("certificates");
            setSelectedCertificateId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "documents") {
            setActiveView("documents");
          }
          else if (key === "experts") {
            setActiveView("experts");
            setSelectedProjectId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "reports") {
            setActiveView("reports");
            setSelectedProjectId(null);
          }
          else if (key === "system-admin") {
            setActiveView("system-admin");
            setSelectedProjectId(null);
            setSelectedCertificateId(null);
            setSelectedAuditPlanId(null);
          }
          else openPlannedScreen("Chức năng đã chọn");
        }}
        selectedKeys={[activeView === "project-detail" ? "projects" : activeView]}
        theme="dark"
      />
      <div className="side-module-switcher">
        <span>PHÂN HỆ ĐANG SỬ DỤNG</span>
        <Select
          aria-label="Chọn phân hệ nghiệp vụ"
          defaultValue="management-systems"
          options={[
            { value: "management-systems", label: "Chứng nhận hệ thống quản lý" },
            { value: "products", label: "Chứng nhận sản phẩm", disabled: true },
            { value: "validation", label: "Thẩm tra & xác nhận", disabled: true },
          ]}
          popupMatchSelectWidth={260}
        />
      </div>
    </>
  );

  const renderWorkItem = (item: DashboardAlert, compact = false) => {
    const due = getDueMeta(item.due_date);
    return (
      <List.Item className={compact ? "compact-alert-row" : "work-item-row"}>
        <div className="work-item-main">
          <span className={getAlertClass(item.severity)}>{getAlertIcon(item.severity)}</span>
          <div className="work-item-copy">
            <div className="work-item-title-line"><strong>{translateTechnicalText(item.title)}</strong><Tag color={item.severity === "critical" ? "red" : item.severity === "warning" ? "orange" : "blue"}>{item.severity === "critical" ? "Nghiêm trọng" : item.severity === "warning" ? "Cần theo dõi" : "Thông tin"}</Tag></div>
            <p>{translateTechnicalText(item.message)}</p>
            {!compact ? <div className="work-item-meta"><span>Phụ trách: Chưa có dữ liệu</span><span className={due.className}>{due.label}</span></div> : null}
          </div>
        </div>
        <Button
          loading={openingAlertId === item.id}
          onClick={() => void openResolvedTask(
            item.entity_type,
            item.entity_id,
            item.id,
          )}
          size="small"
        >
          Xem chi tiết
        </Button>
      </List.Item>
    );
  };

  const taskPreviewItems = taskSummaryQuery.data?.items ?? [];
  const taskPreviewSummary = taskSummaryQuery.data?.summary;

  const taskPopoverContent = (
    <div className="task-popover-panel">
      <div className="task-popover-summary">
        <div><span>Tổng việc</span><strong>{taskPreviewSummary?.total ?? 0}</strong></div>
        <div><span>Quá hạn</span><strong className={taskPreviewSummary?.overdue ? "task-popover-danger" : ""}>{taskPreviewSummary?.overdue ?? 0}</strong></div>
        <div><span>Trong 7 ngày</span><strong>{taskPreviewSummary?.due_soon ?? 0}</strong></div>
      </div>

      {taskSummaryQuery.isLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} title={false} />
      ) : taskPreviewItems.length ? (
        <div className="task-popover-list">
          {taskPreviewItems.map((item) => (
            <button
              className="task-popover-item"
              key={item.id}
              onClick={() => {
                setTaskPopoverOpen(false);
                openTaskDestination(item.destination, item.target_id);
              }}
              type="button"
            >
              <span className={`task-popover-dot priority-${item.priority}`} />
              <span className="task-popover-copy">
                <strong>{item.title}</strong>
                <small>{item.project_code ? `${item.project_code} · ` : ""}{item.group}</small>
              </span>
              <span className="task-popover-due">{formatTaskPreviewDue(item.due_date)}</span>
            </button>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có công việc cần xử lý" />
      )}

      <Button
        block
        onClick={() => {
          setTaskPopoverOpen(false);
          setActiveView("my-tasks");
        }}
        type="primary"
      >
        Mở Trung tâm công việc
      </Button>
    </div>
  );

  return (
    <Layout className="application-shell">
      {isDesktop ? <Sider className="desktop-sider" width={268}>{navigation}</Sider> : null}
      <Drawer className="mobile-navigation" closable={false} onClose={() => setMobileMenuOpen(false)} open={mobileMenuOpen} placement="left" styles={{ body: { padding: 0, background: "#082f6b" } }} width={286}>{navigation}</Drawer>

      <Layout>
        <Header className="top-header top-header-v2">
          <div className="header-left">
            {!isDesktop ? <Button aria-label="Mở menu" icon={<MenuOutlined />} onClick={() => setMobileMenuOpen(true)} type="text" /> : null}
            <button className="global-search-trigger" onClick={() => setSearchOpen(true)} type="button"><SearchOutlined /><span>Tìm khách hàng, mã hồ sơ, chứng chỉ...</span><kbd>Ctrl K</kbd></button>
          </div>
          <Space size={isDesktop ? 14 : 8}>
            <Popover
              content={taskPopoverContent}
              onOpenChange={setTaskPopoverOpen}
              open={taskPopoverOpen}
              placement="bottomRight"
              title={<span>Công việc cần xử lý</span>}
              trigger="click"
            >
              <Badge count={taskCount} size="small">
                <Button aria-label="Công việc cần xử lý" icon={<BellOutlined />} shape="circle" />
              </Badge>
            </Popover>
            <Dropdown menu={{ items: accountItems }} placement="bottomRight">
              <button className="account-button" type="button"><Avatar icon={<UserOutlined />} />{isDesktop ? <span><strong>{getDisplayName(session)}</strong><small>{formatRole(session.user.roles?.[0])}</small></span> : null}</button>
            </Dropdown>
          </Space>
        </Header>

        <Content className="application-content dashboard-v2">
          {activeView === "project-detail" && selectedProjectId && !customerPortalMode ? (
            <CertificationProjectDetailScreen
              onBack={() => {
                setActiveView("projects");
                setSelectedProjectId(null);
              }}
              onOpenAuditPlan={(planId) => {
                setSelectedAuditPlanId(planId);
                setActiveView("schedule-resources");
              }}
              onOpenTeamAssignment={(projectId) => {
                setSelectedAuditPlanId(`project:${projectId}`);
                setActiveView("schedule-resources");
              }}
              projectId={selectedProjectId}
              roles={session.user.roles}
            />
          ) : activeView === "my-tasks" ? (
            <MyTasksScreen
              onNavigate={openTaskDestination}
              roles={session.user.roles}
            />
          ) : activeView === "customers" ? (
            <CustomersScreen
              onOpenProject={(projectId) => {
                setSelectedProjectId(projectId);
                setActiveView("project-detail");
              }}
              roles={session.user.roles}
            />
          ) : activeView === "applications" ? (
            <CertificationProjectsScreen
              mode="applications"
              onOpenProject={(projectId) => {
                setSelectedProjectId(projectId);
                setActiveView("project-detail");
              }}
            />
          ) : activeView === "projects" || (activeView === "project-detail" && customerPortalMode) ? (
            customerPortalMode ? (
              <CustomerCorrectiveActionsScreen roles={session.user.roles} />
            ) : (
              <CertificationProjectsScreen
                mode="projects"
                onOpenProject={(projectId) => {
                  setSelectedProjectId(projectId);
                  setActiveView("project-detail");
                }}
              />
            )
          ) : activeView === "schedule-resources" ? (
            <ScheduleResourcesScreen
              initialPlanId={selectedAuditPlanId}
              onOpenProject={(projectId) => {
                setSelectedProjectId(projectId);
                setActiveView("project-detail");
              }}
              roles={session.user.roles}
            />
          ) : activeView === "certificates" ? (
            <CertificatesScreen initialCertificateId={selectedCertificateId} roles={session.user.roles} />
          ) : activeView === "documents" ? (
            <DocumentsScreen
              onOpenProject={(projectId) => {
                setSelectedProjectId(projectId);
                setActiveView("project-detail");
              }}
            />
          ) : activeView === "experts" ? (
            <ExpertsScreen roles={session.user.roles} />
          ) : activeView === "reports" ? (
            <ReportsScreen
              onOpenProject={(projectId) => {
                setSelectedProjectId(projectId);
                setActiveView("project-detail");
              }}
              roles={session.user.roles}
            />
          ) : activeView === "system-admin" ? (
            <SystemAdminScreen
              currentUserId={session.user.id}
              roles={session.user.roles}
            />
          ) : (
            <>
          <div className="page-heading page-heading-v2">
            <div><span className="eyebrow">TRUNG TÂM ĐIỀU HÀNH</span><Title level={2}>Tổng quan hoạt động chứng nhận</Title><Text type="secondary">Theo dõi tiến độ hồ sơ, thời hạn và các công việc cần xử lý.</Text></div>
            <div className="dashboard-filter-area">
              <Select aria-label="Khoảng thời gian" onChange={setWarningDays} options={[{ value: 1, label: "Hôm nay" }, { value: 7, label: "7 ngày" }, { value: 30, label: "30 ngày" }, { value: 90, label: "90 ngày" }]} value={warningDays} />
              <Select aria-label="Tiêu chuẩn" onChange={setStandardFilter} options={[{ value: "all", label: "Tất cả tiêu chuẩn" }, ...standards.map((item) => ({ value: item, label: item }))]} value={standardFilter} />
              <Tooltip title="Làm mới dữ liệu"><Button aria-label="Làm mới dữ liệu" icon={<ReloadOutlined />} loading={overviewQuery.isFetching} onClick={() => { void overviewQuery.refetch(); void taskSummaryQuery.refetch(); }} /></Tooltip>
              {data ? <small>Cập nhật {formatDateTime(data.generated_at)}</small> : null}
            </div>
          </div>

          {overviewQuery.isLoading ? <div className="dashboard-loading"><Skeleton active paragraph={{ rows: 12 }} /></div> : null}
          {overviewQuery.isError ? <Card><Empty description={getErrorMessage(overviewQuery.error)} /><Button onClick={() => void overviewQuery.refetch()}>Thử lại</Button></Card> : null}

          {data ? (
            <>
              <section className="kpi-grid kpi-grid-six" aria-label="Chỉ số tổng quan">
                {[
                  { key: "projects", title: "Hồ sơ đang xử lý", value: data.summary.projects.active, note: `${data.summary.projects.total} dự án trong hệ thống`, tone: "blue" },
                  { key: "tasks", title: "Việc chờ tôi xử lý", value: taskCount, note: `${taskSummaryQuery.data?.summary.overdue ?? 0} việc quá hạn`, tone: "purple" },
                  { key: "reviews", title: "Hồ sơ chờ thẩm xét", value: data.summary.technical_reviews.pending, note: "Cần thẩm xét kỹ thuật", tone: "cyan" },
                  { key: "findings", title: "NC/CAP chưa đóng", value: data.summary.findings.open, note: `${data.summary.findings.overdue} NC đã quá hạn`, tone: "orange" },
                  { key: "audits", title: `Lịch đánh giá ${warningDays === 1 ? "hôm nay" : `${warningDays} ngày tới`}`, value: data.summary.audits.upcoming, note: `${data.summary.audits.overdue} lịch đã quá hạn`, tone: "green" },
                  { key: "certificates", title: "Chứng chỉ sắp hết hạn", value: data.summary.certificates.expiring, note: `${data.summary.certificates.expired} chứng chỉ đã hết hạn`, tone: "red" },
                ].map((item) => (
                  <button
                    className={`kpi-action kpi-tone-${item.tone}`}
                    key={item.key}
                    onClick={() => {
                      if (item.key === "projects") openTaskDestination("projects", null);
                      else if (item.key === "audits") openTaskDestination("schedule-resources", null);
                      else if (item.key === "certificates") openTaskDestination("certificates", null);
                      else setActiveView("my-tasks");
                    }}
                    type="button"
                  ><Statistic title={item.title} value={item.value} /><span>{item.note}</span></button>
                ))}
              </section>

              <section className="work-alert-grid">
                <Card className="dashboard-card compact-card" extra={<Badge count={taskItems.length} showZero />} title="Công việc cần xử lý">
                  <List dataSource={taskItems.slice(0, 6)} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hiện không có công việc ưu tiên" /> }} renderItem={(item) => renderWorkItem(item)} />
                </Card>
                <Card className="dashboard-card compact-card" extra={<Badge count={alertItems.length} showZero />} title="Cảnh báo & thời hạn">
                  <List dataSource={alertItems.slice(0, 6)} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có cảnh báo trong khoảng đã chọn" /> }} renderItem={(item) => renderWorkItem(item, true)} />
                </Card>
              </section>

              <section className="tracking-audit-grid">
                <Card className="dashboard-card projects-card" extra={<Button onClick={() => setActiveView("projects")} type="link">Xem tất cả</Button>} title="Hồ sơ cần theo dõi">
                  <Table columns={projectColumns} dataSource={filteredProjects} locale={{ emptyText: "Không có hồ sơ phù hợp bộ lọc" }} pagination={false} rowKey="id" scroll={{ x: 980 }} size="middle" />
                </Card>
                <Card className="dashboard-card compact-card" title="Lịch đánh giá sắp tới">
                  <List<UpcomingAudit>
                    className="audit-list audit-list-v2"
                    dataSource={filteredAudits.slice(0, 5)}
                    locale={{ emptyText: <div className="action-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Chưa có lịch đánh giá trong ${warningDays} ngày tới`} /><Button icon={<CalendarOutlined />} onClick={() => setActiveView("schedule-resources")}>Mở lịch đánh giá</Button></div> }}
                    renderItem={(item) => (
                      <List.Item>
                        <div className="audit-date"><strong>{item.planned_start_date ? dayjs(item.planned_start_date).format("DD") : "—"}</strong><span>{item.planned_start_date ? dayjs(item.planned_start_date).format("MM/YYYY") : "Chưa xếp"}</span></div>
                        <div className="audit-info"><strong>{item.audit_programs?.organization_name ?? "Chưa xác định tổ chức"}</strong><span>{getStatusLabel(item.event_type)} · {item.audit_programs?.standard_name ?? "—"}</span><small>{item.audit_programs?.program_code ?? "—"}</small></div>
                        <StatusTag status={item.status} />
                      </List.Item>
                    )}
                  />
                </Card>
              </section>

              <section className="dashboard-bottom-grid">
                <Card className="dashboard-card" title="Phân bố hồ sơ theo giai đoạn"><StatusBreakdown data={data.status_breakdown.projects} onSelect={() => openTaskDestination("projects", null)} /></Card>
                <Card className="dashboard-card certificate-watch-card" title="Chứng chỉ cần theo dõi">
                  <Tabs activeKey={certificateTab} items={[{ key: "expiring", label: "Sắp hết hạn" }, { key: "new", label: "Mới cấp" }, { key: "replaced", label: "Đã thay thế" }, { key: "suspended", label: "Đình chỉ" }, { key: "withdrawn", label: "Thu hồi" }]} onChange={setCertificateTab} size="small" />
                  <List<RecentCertificate>
                    dataSource={certificateItems.slice(0, 5)}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có chứng chỉ trong nhóm này" /> }}
                    renderItem={(item) => {
                      const days = dayjs(item.expire_date).diff(dayjs(), "day");
                      return <List.Item><div className="certificate-item"><SafetyCertificateOutlined /><div><strong className="code-value">{item.cert_number}</strong><span>Hiệu lực {formatDate(item.issue_date)} – {formatDate(item.expire_date)}</span></div><div className="certificate-status"><StatusTag status={item.status} />{normalizeStatus(item.status) === "active" ? <small>{days >= 0 ? `Còn ${days} ngày` : `Quá hạn ${Math.abs(days)} ngày`}</small> : null}</div><Button onClick={() => { setSelectedCertificateId(item.id); setActiveView("certificates"); }} size="small">Xem</Button></div></List.Item>;
                    }}
                  />
                </Card>
                <Card className="dashboard-card" title="Chỉ số cần theo dõi">
                  <div className="monitoring-metrics"><div><span>NC/CAP quá hạn</span><strong className={data.summary.findings.overdue ? "metric-danger" : ""}>{data.summary.findings.overdue}</strong></div><div><span>Lịch đánh giá quá hạn</span><strong className={data.summary.audits.overdue ? "metric-danger" : ""}>{data.summary.audits.overdue}</strong></div><div><span>Thông báo chưa gửi</span><strong>{data.summary.notifications.unsent}</strong></div><div><span>Hồ sơ chờ thẩm xét</span><strong>{data.summary.technical_reviews.pending}</strong></div></div>
                </Card>
              </section>

              <footer className="dashboard-footer">Dữ liệu cập nhật {formatDateTime(data.generated_at)} · Khoảng theo dõi {warningDays} ngày</footer>
            </>
          ) : null}
            </>
          )}
        </Content>
      </Layout>

      <Modal footer={null} onCancel={() => { setSearchOpen(false); setSearchTerm(""); }} open={searchOpen} title="Tìm kiếm nhanh" width={680} afterOpenChange={(open) => { if (open) window.setTimeout(() => searchInputRef.current?.focus(), 50); }}>
        <Input ref={searchInputRef} allowClear onChange={(event) => setSearchTerm(event.target.value)} placeholder="Nhập mã hồ sơ, khách hàng, chứng chỉ hoặc NC/CAP..." prefix={<SearchOutlined />} size="large" value={searchTerm} />
        <div className="search-result-area">
          {searchTerm.trim().length < 2 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nhập ít nhất 2 ký tự để tìm trong dữ liệu Dashboard" /> : <List dataSource={searchResults} locale={{ emptyText: "Không tìm thấy kết quả phù hợp" }} renderItem={(item) => <List.Item actions={[<Button key="open" loading={openingAlertId === item.key} onClick={() => void openSearchResult(item)} size="small">Mở</Button>]}><List.Item.Meta description={item.description} title={<span><Tag>{item.type}</Tag> {item.title}</span>} /></List.Item>} />}
        </div>
      </Modal>
    </Layout>
  );
}
