"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Empty, Skeleton, Space, Statistic, Tag, Typography } from "antd";
import dayjs from "dayjs";

import { getErrorMessage } from "../lib/api";
import type { PersonalWorkspace } from "../types/personal-workspace";
import { EmptyWorkspaceIllustration } from "./design-system/EmptyWorkspaceIllustration";

const { Text, Title } = Typography;

interface PersonalDashboardScreenProps {
  workspace?: PersonalWorkspace;
  loading: boolean;
  error: unknown;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenPath: (path: string | null, context?: Record<string, unknown> | null) => void;
  onViewAllWork: () => void;
  onViewCalendar: () => void;
}

const personaLabels: Record<string, string> = {
  ADMIN: "Quản trị hệ thống",
  SALES: "Kinh doanh",
  STAFF: "Nghiệp vụ chứng nhận",
  COORDINATOR: "Điều phối chứng nhận",
  LEAD_AUDITOR: "Trưởng đoàn đánh giá",
  AUDITOR: "Chuyên gia đánh giá",
  TECHNICAL_EXPERT: "Chuyên gia kỹ thuật",
  TECHNICAL_REVIEWER: "Thẩm xét kỹ thuật",
  DECISION_MAKER: "Quyết định chứng nhận",
};

const workTypeLabels: Record<string, string> = {
  CUSTOMER_APPLICATION_INTAKE: "Tiếp nhận đơn đăng ký",
  APPLICATION_REVIEW: "Xem xét đăng ký",
  SURVEILLANCE_CHANGE_REVIEW: "Rà soát thay đổi giám sát",
  F04_TEAM_APPOINTMENT: "Bổ nhiệm đoàn đánh giá",
  AUDIT_PLAN: "Kế hoạch đánh giá",
  AUDIT_EXECUTION: "Thực hiện đánh giá",
  CAP_ACTION_OR_REVIEW: "NC / Hành động khắc phục",
  REVIEWER_ASSIGNMENT: "Phân công người thẩm xét",
  TECHNICAL_REVIEW: "Thẩm xét kỹ thuật",
  CERTIFICATION_DECISION: "Quyết định chứng nhận",
  CERTIFICATE_ISSUE: "Phát hành chứng chỉ",
};

const priorityMeta = {
  URGENT: { color: "red", label: "Khẩn cấp" },
  HIGH: { color: "orange", label: "Ưu tiên cao" },
  NORMAL: { color: "blue", label: "Bình thường" },
  LOW: { color: "default", label: "Ưu tiên thấp" },
} as const;

function formatDate(value?: string | null) {
  return value && dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY") : "Chưa có hạn";
}

function calendarTypeLabel(type: string) {
  const labels: Record<string, string> = {
    AUDIT: "Lịch đánh giá",
    WORK_DUE: "Hạn công việc",
    REVIEW_DUE: "Hạn thẩm xét",
    DECISION_DUE: "Hạn quyết định",
    CERTIFICATE_ACTION_DUE: "Hạn xử lý chứng chỉ",
  };
  return labels[type] ?? type;
}

function workTypeLabel(value: string) {
  const normalized = value.trim().replace(/[\s-]+/g, "_").toUpperCase();
  return workTypeLabels[normalized] ?? "Công việc nghiệp vụ";
}

function taskTitle(title: string, workType: string) {
  const normalizedTitle = title.trim().replace(/[\s-]+/g, "_").toUpperCase();
  const normalizedType = workType.trim().replace(/[\s-]+/g, "_").toUpperCase();
  if (normalizedTitle === normalizedType || workTypeLabels[normalizedTitle]) {
    return workTypeLabel(workTypeLabels[normalizedTitle] ? normalizedTitle : normalizedType);
  }
  return title;
}

export function PersonalDashboardScreen({
  workspace,
  loading,
  error,
  refreshing,
  onRefresh,
  onOpenPath,
  onViewAllWork,
  onViewCalendar,
}: PersonalDashboardScreenProps) {
  if (loading) {
    return <div className="dashboard-loading"><Skeleton active paragraph={{ rows: 12 }} /></div>;
  }

  if (error || !workspace) {
    return (
      <Alert
        action={<Button onClick={onRefresh}>Thử lại</Button>}
        description={getErrorMessage(error)}
        message="Không tải được trang tổng quan"
        showIcon
        type="error"
      />
    );
  }

  const personaText = workspace.user_context.personas
    .map((persona) => personaLabels[persona] ?? persona)
    .join(" · ");
  const personaKpis = workspace.user_context.personas
    .map((persona) => workspace.role_kpis.find((kpi) => kpi.persona === persona))
    .filter((kpi): kpi is PersonalWorkspace["role_kpis"][number] => Boolean(kpi));
  const visibleKpis = [
    ...personaKpis,
    ...workspace.role_kpis.filter((kpi) => !personaKpis.some((selected) => selected.key === kpi.key)),
  ].slice(0, 5);

  return (
    <div className="personal-dashboard">
      <div className="page-heading page-heading-v2 personal-dashboard-heading">
        <div>
          <span className="eyebrow">CÔNG VIỆC VÀ LỊCH</span>
          <Title level={2}>Tổng quan</Title>
          <Text type="secondary">{personaText} · {dayjs().format("DD/MM/YYYY")}</Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>Làm mới</Button>
      </div>

      <section className="personal-kpi-grid" aria-label="Chỉ số theo vai trò">
        {visibleKpis.map((kpi) => (
          <button
            className={`personal-kpi-card kpi-tone-${kpi.tone}`}
            key={kpi.key}
            onClick={() => onOpenPath(kpi.destination_path)}
            type="button"
          >
            <Statistic title={kpi.label} value={kpi.value} />
          </button>
        ))}
      </section>

      <section className="personal-dashboard-main-grid">
        <Card
          className="dashboard-card"
          extra={<Button onClick={onViewAllWork} type="link">Xem tất cả công việc</Button>}
          title={<Space><CheckCircleOutlined />Việc cần xử lý</Space>}
        >
          {workspace.priority_work_items.length ? (
            <ul aria-label="Việc cần xử lý" className="personal-dashboard-list">
              {workspace.priority_work_items.map((item) => (
                <li className={`personal-dashboard-list-item personal-work-row${item.is_overdue ? " is-overdue" : ""}`} key={item.id}>
                  <div className="personal-dashboard-list-copy">
                    <div className="personal-dashboard-list-title">
                      <Text strong>{taskTitle(item.title, item.work_type)}</Text>
                      <Tag color={priorityMeta[item.priority].color}>{priorityMeta[item.priority].label}</Tag>
                    </div>
                    <div className="personal-dashboard-list-description">
                      <Space size={[6, 4]} wrap>
                        <Tag>{item.project_code ?? "Chưa tạo hồ sơ"}</Tag>
                        <span>{item.organization_name ?? workTypeLabel(item.work_type)}</span>
                        <span className={item.is_overdue ? "metric-danger" : ""}>
                          {item.is_overdue ? <WarningOutlined /> : <ClockCircleOutlined />} {formatDate(item.due_at)}
                        </span>
                      </Space>
                    </div>
                  </div>
                  <Button
                    disabled={!item.can_execute}
                    onClick={() => onOpenPath(item.destination_path, item.context)}
                    size="small"
                    type="primary"
                  >
                    Mở
                  </Button>
                </li>
              ))}
            </ul>
          ) : <Empty image={<EmptyWorkspaceIllustration kind="work" />} description="Hiện không có công việc cần xử lý." />}
        </Card>

        <Card
          className="dashboard-card"
          extra={<Button onClick={onViewCalendar} type="link">Mở lịch</Button>}
          title={<Space><CalendarOutlined />Lịch sắp tới</Space>}
        >
          {workspace.calendar_items.length ? (
            <ul aria-label="Lịch sắp tới" className="personal-dashboard-list">
              {workspace.calendar_items.slice(0, 6).map((item) => (
                <li className="personal-dashboard-list-item personal-calendar-row" key={item.id}>
                  <div className="personal-calendar-preview-date">
                    <strong>{dayjs(item.start).format("DD")}</strong>
                    <span>{dayjs(item.start).format("MM/YYYY")}</span>
                  </div>
                  <div className="personal-dashboard-list-copy">
                    <div className="personal-dashboard-list-title">
                      <Tag color={item.type === "AUDIT" ? "green" : "blue"}>{calendarTypeLabel(item.type)}</Tag>
                      <Text strong>{item.title}</Text>
                    </div>
                    <div className="personal-dashboard-list-description">
                      {item.project_code ?? "—"} · {item.organization_name ?? calendarTypeLabel(item.type)}
                    </div>
                  </div>
                  <Button onClick={() => onOpenPath(item.destination_path, item.context)} size="small">Mở</Button>
                </li>
              ))}
            </ul>
          ) : <Empty image={<EmptyWorkspaceIllustration kind="calendar" />} description="Không có lịch đánh giá sắp tới." />}
        </Card>
      </section>

      <section className="personal-dashboard-secondary-grid">
        <Card className="dashboard-card" title={<Space><WarningOutlined />Việc cần lưu ý</Space>}>
          {workspace.exceptions.length ? (
            <ul aria-label="Việc cần lưu ý" className="personal-dashboard-list">
              {workspace.exceptions.map((item) => (
                <li className="personal-dashboard-list-item" key={item.id}>
                  <div className="personal-dashboard-list-copy">
                    <Text className="personal-dashboard-list-danger" type="danger">{item.title}</Text>
                    <div className="personal-dashboard-list-description">{item.message} · Hạn {formatDate(item.due_at)}</div>
                  </div>
                  <Button onClick={() => onOpenPath(item.destination_path, item.context)} size="small">Xử lý</Button>
                </li>
              ))}
            </ul>
          ) : <Empty image={<EmptyWorkspaceIllustration kind="work" />} description="Không có công việc quá hạn." />}
        </Card>

        <Card className="dashboard-card" title={<Space><FolderOpenOutlined />Hồ sơ vừa cập nhật</Space>}>
          {workspace.recent_records.length ? (
            <ul aria-label="Hồ sơ vừa cập nhật" className="personal-dashboard-list">
              {workspace.recent_records.slice(0, 6).map((item) => (
                <li className="personal-dashboard-list-item" key={item.id}>
                  <div className="personal-dashboard-list-copy">
                    <div className="personal-dashboard-list-title">
                      <CheckCircleOutlined />
                      <Text>{item.title}</Text>
                    </div>
                    <div className="personal-dashboard-list-description">
                      {item.project_code ?? "—"} · {dayjs(item.occurred_at).format("DD/MM/YYYY HH:mm")}
                    </div>
                  </div>
                  <Button onClick={() => onOpenPath(item.destination_path, item.context)} size="small">Mở</Button>
                </li>
              ))}
            </ul>
          ) : <Empty image={<EmptyWorkspaceIllustration kind="records" />} description="Chưa có hồ sơ nghiệp vụ gần đây." />}
        </Card>
      </section>

      {workspace.meta.sales_assignment_limitation ? (
        <Alert message={workspace.meta.sales_assignment_limitation} showIcon type="info" />
      ) : null}
    </div>
  );
}
