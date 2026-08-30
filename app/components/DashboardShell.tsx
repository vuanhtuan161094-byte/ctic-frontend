"use client";

import {
  AppstoreOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MenuOutlined,
  NotificationOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { InputRef, MenuProps } from "antd";
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  Dropdown,
  Empty,
  Grid,
  Input,
  Layout,
  List,
  Menu,
  Modal,
  Select,
  Space,
  Tag,
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
  DashboardOverview,
} from "../types/dashboard";
import type { PersonalWorkspace } from "../types/personal-workspace";
import { CertificationProjectDetailScreen } from "./CertificationProjectDetailScreen";
import { CertificationProjectsScreen } from "./CertificationProjectsScreen";
import { CertificatesScreen } from "./CertificatesScreen";
import { CustomersScreen } from "./CustomersScreen";
import { CustomerCorrectiveActionsScreen } from "./CustomerCorrectiveActionsScreen";
import { CustomerPortalDashboardScreen } from "./CustomerPortalDashboardScreen";
import { CustomerProfileScreen } from "./CustomerProfileScreen";
import { CustomerApplicationsScreen } from "./CustomerApplicationsScreen";
import { CustomerAuditScheduleScreen } from "./CustomerAuditScheduleScreen";
import { CustomerResultNotificationsScreen } from "./CustomerResultNotificationsScreen";
import { CustomerCertificatesScreen } from "./CustomerCertificatesScreen";
import { CustomerChangeRequestsScreen } from "./CustomerChangeRequestsScreen";
import { CustomerPortalUsersScreen } from "./CustomerPortalUsersScreen";
import { CustomerUserRequestsScreen } from "./CustomerUserRequestsScreen";
import { CustomerDocumentsScreen } from "./CustomerDocumentsScreen";
import { CustomerDocumentRequestsScreen } from "./CustomerDocumentRequestsScreen";
import { DocumentsScreen } from "./DocumentsScreen";
import { GovernanceCasesScreen } from "./GovernanceCasesScreen";
import { CustomerCasesScreen } from "./CustomerCasesScreen";
import { ExpertsScreen } from "./ExpertsScreen";
import { MyTasksScreen } from "./MyTasksScreen";
import { MyCalendarScreen } from "./MyCalendarScreen";
import { NotificationCenter } from "./NotificationCenter";
import { NotificationsScreen } from "./NotificationsScreen";
import { PersonalDashboardScreen } from "./PersonalDashboardScreen";
import { ManagementCockpitScreen } from "./ManagementCockpitScreen";
import { ScheduleResourcesScreen } from "./ScheduleResourcesScreen";
import { SystemAdminScreen } from "./SystemAdminScreen";
import { DelegationScreen } from "./DelegationScreen";

const { Header, Content, Sider } = Layout;
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
  description: string | null;
  work_type: string;
  priority: "URGENT" | "HIGH" | "NORMAL" | "LOW";
  status: string;
  due_at: string | null;
  destination_path: string | null;
  project_id: string | null;
  project_code: string | null;
  context: Record<string, unknown> | null;
  cycle_key?: string | null;
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
  | "my-calendar"
  | "notifications"
  | "delegations"
  | "customers"
  | "applications"
  | "projects"
  | "project-detail"
  | "schedule-resources"
  | "certificates"
  | "documents"
  | "experts"
  | "reports"
  | "system-admin"
  | "customer-results"
  | "customer-change-requests"
  | "customer-portal-users"
  | "customer-user-requests"
  | "customer-documents"
  | "customer-document-requests"
  | "governance-cases";

interface BrowserNavigationState {
  activeView: ActiveView;
  selectedProjectId: string | null;
  selectedCertificateId: string | null;
  selectedAuditPlanId: string | null;
}

const activeViewValues: ActiveView[] = [
  "dashboard",
  "my-tasks",
  "my-calendar",
  "notifications",
  "delegations",
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
  "customer-results",
  "customer-change-requests",
  "customer-portal-users",
  "customer-user-requests",
  "customer-documents",
  "customer-document-requests",
  "governance-cases",
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

const roleMenuKeys: Record<string, string[]> = {
  admin: ["dashboard", "my-tasks", "my-calendar", "customers", "customer-change-requests", "governance-cases", "customer-user-requests", "customer-document-requests", "applications", "projects", "schedule-resources", "certificates", "documents", "experts", "reports", "system-admin"],
  staff: ["dashboard", "my-tasks", "my-calendar", "customers", "applications", "projects", "schedule-resources", "certificates", "documents", "reports"],
  sales: ["dashboard", "my-tasks", "my-calendar", "customers", "applications", "projects", "documents", "reports"],
  coordinator: ["dashboard", "my-tasks", "my-calendar", "customers", "customer-change-requests", "governance-cases", "customer-document-requests", "applications", "projects", "schedule-resources", "certificates", "documents", "experts", "reports"],
  lead_auditor: ["dashboard", "my-tasks", "my-calendar", "governance-cases", "projects", "schedule-resources", "documents", "experts"],
  auditor: ["dashboard", "my-tasks", "my-calendar", "governance-cases", "projects", "documents"],
  technical_expert: ["dashboard", "my-tasks", "my-calendar", "projects", "documents"],
  technical_reviewer: ["dashboard", "my-tasks", "my-calendar", "governance-cases", "applications", "projects", "documents", "experts"],
  decision_maker: ["dashboard", "my-tasks", "my-calendar", "governance-cases", "applications", "projects", "certificates", "documents"],
  customer: ["dashboard", "customers", "customer-portal-users", "applications", "customer-documents", "governance-cases", "schedule-resources", "projects", "customer-results", "certificates", "notifications"],
};

function normalizeStatus(status?: string | null) {
  return (status ?? "unknown").trim().toLowerCase();
}

function translateTechnicalText(value?: string | null) {
  if (!value) return "";

  return Object.entries(statusLabels).reduce(
    (text, [technicalKey, label]) =>
      text.replace(new RegExp(`\\b${technicalKey}\\b`, "gi"), label),
    value,
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY") : "—";
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
    technical_expert: "Chuyên gia kỹ thuật",
  };
  return labels[role?.toLowerCase() ?? ""] ?? role ?? "Người dùng";
}

function getDisplayName(session: AuthSession) {
  return session.user.full_name?.trim() || session.user.username;
}

function MenuLabel({ label, count }: { label: string; count?: number }) {
  return (
    <span className="menu-label-with-count">
      <span>{label}</span>
      {count ? <Badge count={count} size="small" /> : null}
    </span>
  );
}

export function DashboardShell({ session, onLogout }: DashboardShellProps) {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectDossierKey, setSelectedProjectDossierKey] = useState<string | null>(null);
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | null>(null);
  const [selectedAuditPlanId, setSelectedAuditPlanId] = useState<string | null>(null);
  const [selectedProjectWorkspacePath, setSelectedProjectWorkspacePath] = useState<string | null>(null);
  const [selectedApplicationReviewId, setSelectedApplicationReviewId] = useState<string | null>(null);
  const [openingAlertId, setOpeningAlertId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const warningDays = 30;
  const searchInputRef = useRef<InputRef>(null);
  const historyReadyRef = useRef(false);
  const restoringHistoryRef = useRef(false);
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const normalizedRoles = useMemo(
    () => session.user.roles.map((role) => normalizeStatus(role)),
    [session.user.roles],
  );
  const customerPortalMode = normalizedRoles.includes("customer");

  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview", warningDays],
    queryFn: async () => {
      const response = await api.get<DashboardOverview>(`/dashboard/overview?warning_days=${warningDays}`);
      return response.data;
    },
    enabled: false,
  });

  const workspaceQuery = useQuery({
    queryKey: ["personal-workspace", session.user.id],
    queryFn: async () => {
      const response = await api.get<PersonalWorkspace>("/me/workspace");
      return response.data;
    },
    enabled: !customerPortalMode,
    staleTime: 20_000,
  });

  const taskSummaryQuery = {
    data: workspaceQuery.data
      ? {
        summary: {
          total: workspaceQuery.data.work_summary.open + workspaceQuery.data.work_summary.in_progress,
          overdue: workspaceQuery.data.work_summary.overdue,
          due_soon: workspaceQuery.data.work_summary.due_soon,
          high_priority: workspaceQuery.data.work_summary.high_priority,
        },
        items: workspaceQuery.data.priority_work_items.slice(0, 5) as WorkTaskPreview[],
      } satisfies WorkTaskPreviewResponse
      : undefined,
    isLoading: workspaceQuery.isLoading,
    refetch: workspaceQuery.refetch,
  };

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

  const searchResults = useMemo<SearchResult[]>(() => {
    if (searchTerm.trim().length < 2) return [];
    const keyword = searchTerm.trim().toLocaleLowerCase("vi");
    const results: SearchResult[] = [];

    if (!customerPortalMode && workspaceQuery.data) {
      workspaceQuery.data.priority_work_items.forEach((item) => {
        const searchable = [item.title, item.project_code, item.organization_name].filter(Boolean).join(" ").toLocaleLowerCase("vi");
        if (searchable.includes(keyword)) {
          results.push({ key: `work-${item.id}`, type: "Công việc", title: item.title, description: `${item.project_code ?? "—"} · ${item.organization_name ?? item.work_type}`, destination: item.project_id ? "project-detail" : "projects", entityId: item.project_id });
        }
      });
      workspaceQuery.data.recent_records.forEach((item) => {
        const searchable = [item.title, item.project_code, item.organization_name].filter(Boolean).join(" ").toLocaleLowerCase("vi");
        if (searchable.includes(keyword)) {
          const projectMatch = item.destination_path?.match(/^\/projects\/([^/?#]+)/);
          results.push({ key: `recent-${item.id}`, type: "Hồ sơ gần đây", title: item.title, description: `${item.project_code ?? "—"} · ${item.organization_name ?? "—"}`, destination: projectMatch ? "project-detail" : "projects", entityId: projectMatch ? decodeURIComponent(projectMatch[1]) : null });
        }
      });
      return results.slice(0, 10);
    }

    if (!data) return [];

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
  }, [customerPortalMode, data, searchTerm, workspaceQuery.data]);

  const openPlannedScreen = (label: string) => {
    message.info(`${label} đang được hoàn thiện trong bước tiếp theo.`);
  };

  const openTaskDestination = (
    destination: TaskDestination,
    entityId?: string | null,
    dossierKey?: string | null,
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
      setSelectedProjectDossierKey(dossierKey ?? null);
      setSelectedProjectWorkspacePath(null);
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

    if (destination === "applications") {
      setSelectedApplicationReviewId(null);
      setActiveView("applications");
      return;
    }

    setActiveView("projects");
  };

  const openWorkspacePath = (
    path: string | null,
    context?: Record<string, unknown> | null,
  ) => {
    if (!path) {
      message.warning("Nội dung này chưa có đường dẫn nghiệp vụ hợp lệ.");
      return;
    }

    if (path.startsWith("/my-work")) {
      setActiveView("my-tasks");
      return;
    }

    if (path.startsWith("/my-calendar")) {
      setActiveView("my-calendar");
      return;
    }

    if (path.startsWith("/delegations")) {
      setActiveView("delegations");
      return;
    }

    if (customerPortalMode) {
      if (path.startsWith("/customer-portal/profile")) {
        setActiveView("customers");
        return;
      }
      if (path.startsWith("/customer-portal/users")) {
        setActiveView("customer-portal-users");
        return;
      }
      if (path.startsWith("/customer-portal/documents")) {
        setActiveView("customer-documents");
        return;
      }
      if (path.startsWith("/customer-portal/corrective-actions")) {
        setActiveView("projects");
        return;
      }
      if (path.startsWith("/customer-portal/certificates")) {
        setActiveView("certificates");
        return;
      }
      if (path.startsWith("/customer-portal/results")) {
        setActiveView("customer-results");
        return;
      }
      if (path.startsWith("/customer-portal/notifications")) {
        setActiveView("notifications");
        return;
      }
      if (path.startsWith("/customer-portal/cases")) {
        setActiveView("governance-cases");
        return;
      }
    }

    if (path.startsWith("/governance-cases")) {
      setActiveView("governance-cases");
      return;
    }

    if (path.startsWith("/customer-change-requests")) {
      setActiveView("customer-change-requests");
      return;
    }

    if (path.startsWith("/customer-user-requests")) {
      setActiveView("customer-user-requests");
      return;
    }

    if (path.startsWith("/customer-document-requests")) {
      setActiveView("customer-document-requests");
      return;
    }

    const projectMatch = path.match(/^\/projects\/([^/?#]+)/);
    if (projectMatch) {
      const dossierKey = typeof context?.dossier_key === "string"
        ? context.dossier_key
        : null;
      openTaskDestination("project-detail", decodeURIComponent(projectMatch[1]), dossierKey);
      setSelectedProjectWorkspacePath(path);
      return;
    }

    const certificateMatch = path.match(/^\/certificates\/([^/?#]+)/);
    if (certificateMatch) {
      openTaskDestination("certificates", decodeURIComponent(certificateMatch[1]));
      return;
    }

    if (path.startsWith("/certificates")) {
      openTaskDestination("certificates", null);
      return;
    }

    if (path.startsWith("/applications")) {
      try {
        const url = new URL(path, window.location.origin);
        setSelectedApplicationReviewId(url.searchParams.get("review_id"));
      } catch {
        setSelectedApplicationReviewId(null);
      }
      setActiveView("applications");
      return;
    }

    message.warning("Không xác định được màn hình nghiệp vụ của nội dung này.");
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

  const navigationItems: MenuProps["items"] = (() => {
    if (customerPortalMode) {
      return [
        {
          key: "customer-main-group",
          type: "group",
          label: "CỔNG KHÁCH HÀNG",
          children: [
            { key: "dashboard", icon: <AppstoreOutlined />, label: "Tổng quan" },
            { key: "customers", icon: <BankOutlined />, label: "Hồ sơ tổ chức" },
            { key: "customer-portal-users", icon: <TeamOutlined />, label: "Tài khoản Portal" },
            { key: "applications", icon: <FileSearchOutlined />, label: "Đơn đăng ký" },
            { key: "customer-documents", icon: <FileDoneOutlined />, label: "Tài liệu & yêu cầu" },
            { key: "governance-cases", icon: <FileSearchOutlined />, label: "Thay đổi & phản hồi" },
            { key: "schedule-resources", icon: <CalendarOutlined />, label: "Lịch đánh giá" },
            { key: "projects", icon: <CheckCircleOutlined />, label: "NC / CAP" },
            { key: "customer-results", icon: <FileDoneOutlined />, label: "Kết quả đánh giá" },
            { key: "certificates", icon: <SafetyCertificateOutlined />, label: "Chứng chỉ" },
            { key: "notifications", icon: <NotificationOutlined />, label: "Thông báo" },
          ],
        },
      ];
    }
    const visibleKeys = new Set(
      (customerPortalMode ? ["customer"] : normalizedRoles)
        .flatMap((role) => roleMenuKeys[role] ?? [])
        .concat(normalizedRoles.length ? [] : roleMenuKeys.staff),
    );
    const filterItems = (items: NonNullable<MenuProps["items"]>) => items.filter((item) => item && "key" in item && visibleKeys.has(String(item.key)));

    const groups: NonNullable<MenuProps["items"]> = [
      {
        key: "workspace-group",
        type: "group",
        label: "ĐIỀU HÀNH",
        children: filterItems([
          { key: "dashboard", icon: <AppstoreOutlined />, label: "Tổng quan" },
          { key: "my-tasks", icon: <CheckCircleOutlined />, label: <MenuLabel label="Công việc của tôi" count={taskCount} /> },
          { key: "my-calendar", icon: <CalendarOutlined />, label: "Lịch của tôi" },
        ]),
      },
      {
        key: "operations-group",
        type: "group",
        label: "QUẢN LÝ CHỨNG NHẬN",
        children: filterItems([
          { key: "customers", icon: <BankOutlined />, label: "Khách hàng" },
          { key: "customer-change-requests", icon: <FileSearchOutlined />, label: "Yêu cầu thay đổi KH" },
          { key: "governance-cases", icon: <FileSearchOutlined />, label: "Thay đổi & Case" },
          { key: "customer-user-requests", icon: <TeamOutlined />, label: "Yêu cầu tài khoản KH" },
          { key: "customer-document-requests", icon: <FileDoneOutlined />, label: "Yêu cầu tài liệu KH" },
          { key: "applications", icon: <FileSearchOutlined />, label: "Đơn đăng ký" },
          { key: "projects", icon: <FolderOpenOutlined />, label: "Hồ sơ chứng nhận" },
          { key: "schedule-resources", icon: <CalendarOutlined />, label: "Lịch & nguồn lực" },
          { key: "certificates", icon: <SafetyCertificateOutlined />, label: <MenuLabel label="Chứng chỉ" count={data?.summary.certificates.expiring ?? workspaceQuery.data?.role_kpis.find((item) => item.key === "certificates_expiring")?.value} /> },
          { key: "documents", icon: <FileDoneOutlined />, label: "Tài liệu & Mẫu biểu" },
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
  })();


  const accountItems: MenuProps["items"] = [
    { key: "account", icon: <UserOutlined />, label: session.user.username, disabled: true },
    ...(!customerPortalMode ? [{ key: "delegations", icon: <TeamOutlined />, label: "Ủy quyền công việc", onClick: () => setActiveView("delegations") }] : []),
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
          else if (key === "my-calendar") {
            setActiveView("my-calendar");
            setSelectedProjectId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "customers") {
            setActiveView("customers");
            setSelectedProjectId(null);
            setSelectedCertificateId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "customer-change-requests") {
            setActiveView("customer-change-requests");
            setSelectedProjectId(null);
            setSelectedCertificateId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "governance-cases") {
            setActiveView("governance-cases");
            setSelectedProjectId(null);
            setSelectedCertificateId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "customer-document-requests") {
            setActiveView("customer-document-requests");
            setSelectedProjectId(null);
            setSelectedCertificateId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "customer-documents") {
            setActiveView("customer-documents");
            setSelectedProjectId(null);
            setSelectedCertificateId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "applications") {
            setSelectedApplicationReviewId(null);
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
          else if (key === "customer-results") {
            setActiveView("customer-results");
            setSelectedProjectId(null);
            setSelectedAuditPlanId(null);
          }
          else if (key === "notifications") {
            setActiveView("notifications");
            setSelectedProjectId(null);
            setSelectedAuditPlanId(null);
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
            <NotificationCenter
              customerMode={customerPortalMode}
              onOpenPath={openWorkspacePath}
              onViewAll={() => setActiveView("notifications")}
            />
            <Dropdown menu={{ items: accountItems }} placement="bottomRight">
              <button className="account-button" type="button"><Avatar icon={<UserOutlined />} />{isDesktop ? <span><strong>{getDisplayName(session)}</strong><small>{formatRole(session.user.roles?.[0])}</small></span> : null}</button>
            </Dropdown>
          </Space>
        </Header>

        <Content className="application-content dashboard-v2">
          {activeView === "project-detail" && selectedProjectId && !customerPortalMode ? (
            <CertificationProjectDetailScreen
              initialDossierKey={selectedProjectDossierKey}
              initialWorkspacePath={selectedProjectWorkspacePath}
              onBack={() => {
                setActiveView("projects");
                setSelectedProjectId(null);
                setSelectedProjectDossierKey(null);
                setSelectedProjectWorkspacePath(null);
              }}
              projectId={selectedProjectId}
              roles={session.user.roles}
            />
          ) : activeView === "my-tasks" ? (
            <MyTasksScreen
              onOpenPath={openWorkspacePath}
              roles={session.user.roles}
            />
          ) : activeView === "my-calendar" ? (
            <MyCalendarScreen
              items={workspaceQuery.data?.calendar_items ?? []}
              onOpenPath={openWorkspacePath}
              onRefresh={() => void workspaceQuery.refetch()}
              refreshing={workspaceQuery.isFetching}
            />
          ) : activeView === "notifications" ? (
            <NotificationsScreen customerMode={customerPortalMode} onOpenPath={openWorkspacePath} />
          ) : activeView === "delegations" ? (
            <DelegationScreen roles={session.user.roles} />
          ) : activeView === "customers" && customerPortalMode ? (
            <CustomerProfileScreen />
          ) : activeView === "customer-portal-users" && customerPortalMode ? (
            <CustomerPortalUsersScreen />
          ) : activeView === "customers" ? (
            <CustomersScreen
              onOpenProject={(projectId) => {
                setSelectedProjectId(projectId);
                setSelectedProjectDossierKey(null);
                setSelectedProjectWorkspacePath(null);
                setActiveView("project-detail");
              }}
              roles={session.user.roles}
            />
          ) : activeView === "customer-change-requests" && !customerPortalMode ? (
            <CustomerChangeRequestsScreen />
          ) : activeView === "governance-cases" && customerPortalMode ? (
            <CustomerCasesScreen />
          ) : activeView === "governance-cases" ? (
            <GovernanceCasesScreen />
          ) : activeView === "customer-user-requests" && !customerPortalMode ? (
            <CustomerUserRequestsScreen />
          ) : activeView === "customer-document-requests" && !customerPortalMode ? (
            <CustomerDocumentRequestsScreen />
          ) : activeView === "customer-documents" && customerPortalMode ? (
            <CustomerDocumentsScreen />
          ) : activeView === "applications" && customerPortalMode ? (
            <CustomerApplicationsScreen />
          ) : activeView === "applications" ? (
            <CertificationProjectsScreen
              initialReviewId={selectedApplicationReviewId}
              mode="applications"
              onOpenProject={(projectId) => {
                setSelectedProjectId(projectId);
                setSelectedProjectDossierKey(null);
                setSelectedProjectWorkspacePath(null);
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
                  setSelectedProjectDossierKey(null);
                  setActiveView("project-detail");
                }}
              />
            )
          ) : activeView === "schedule-resources" && customerPortalMode ? (
            <CustomerAuditScheduleScreen />
          ) : activeView === "schedule-resources" ? (
            <ScheduleResourcesScreen
              initialPlanId={selectedAuditPlanId}
              onOpenProject={(projectId, dossierKey) => {
                setSelectedProjectId(projectId);
                setSelectedProjectDossierKey(dossierKey ?? null);
                setActiveView("project-detail");
              }}
              roles={session.user.roles}
            />
          ) : activeView === "customer-results" && customerPortalMode ? (
            <CustomerResultNotificationsScreen />
          ) : activeView === "certificates" && customerPortalMode ? (
            <CustomerCertificatesScreen />
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
            <ManagementCockpitScreen roles={session.user.roles} />
          ) : activeView === "system-admin" ? (
            <SystemAdminScreen
              currentUserId={session.user.id}
              roles={session.user.roles}
            />
          ) : !customerPortalMode ? (
            <PersonalDashboardScreen
              error={workspaceQuery.error}
              loading={workspaceQuery.isLoading}
              onOpenPath={openWorkspacePath}
              onRefresh={() => void workspaceQuery.refetch()}
              onViewAllWork={() => setActiveView("my-tasks")}
              onViewCalendar={() => setActiveView("my-calendar")}
              refreshing={workspaceQuery.isFetching}
              workspace={workspaceQuery.data}
            />
          ) : (
            <CustomerPortalDashboardScreen
              onOpenApplications={() => setActiveView("applications")}
              onOpenCertificates={() => setActiveView("certificates")}
              onOpenCorrectiveActions={() => setActiveView("projects")}
              onOpenNotifications={() => setActiveView("notifications")}
              onOpenSchedule={() => setActiveView("schedule-resources")}
            />
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
