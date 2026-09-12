"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Empty, List, Skeleton, Space, Statistic, Tag, Typography } from "antd";
import dayjs from "dayjs";

import { getErrorMessage } from "../lib/api";
import type { PersonalWorkspace } from "../types/personal-workspace";

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
  ADMIN: "Quản trị vận hành",
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
        message="Không thể tải tổng quan vận hành"
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
          <span className="eyebrow">TỔNG QUAN VẬN HÀNH</span>
          <Title level={2}>Tổng quan vận hành</Title>
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
          title={<Space><CheckCircleOutlined />Công việc ưu tiên</Space>}
        >
          <List
            dataSource={workspace.priority_work_items}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hiện không có công việc cần xử lý." />,
            }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    disabled={!item.can_execute}
                    key="open"
                    onClick={() => onOpenPath(item.destination_path, item.context)}
                    size="small"
                    type="primary"
                  >
                    Mở
                  </Button>,
                ]}
                className={item.is_overdue ? "personal-work-row is-overdue" : "personal-work-row"}
              >
                <List.Item.Meta
                  description={(
                    <Space size={[6, 4]} wrap>
                      <Tag>{item.project_code ?? "Chưa tạo hồ sơ"}</Tag>
                      <span>{item.organization_name ?? workTypeLabel(item.work_type)}</span>
                      <span className={item.is_overdue ? "metric-danger" : ""}>
                        {item.is_overdue ? <WarningOutlined /> : <ClockCircleOutlined />} {formatDate(item.due_at)}
                      </span>
                    </Space>
                  )}
                  title={(
                    <Space wrap>
                      <Text strong>{taskTitle(item.title, item.work_type)}</Text>
                      <Tag color={priorityMeta[item.priority].color}>{priorityMeta[item.priority].label}</Tag>
                    </Space>
                  )}
                />
              </List.Item>
            )}
          />
        </Card>

        <Card
          className="dashboard-card"
          extra={<Button onClick={onViewCalendar} type="link">Mở lịch</Button>}
          title={<Space><CalendarOutlined />Lịch sắp tới</Space>}
        >
          <List
            dataSource={workspace.calendar_items.slice(0, 6)}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có lịch đánh giá sắp tới." />,
            }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button key="open" onClick={() => onOpenPath(item.destination_path, item.context)} size="small">Mở</Button>,
                ]}
              >
                <div className="personal-calendar-preview-date">
                  <strong>{dayjs(item.start).format("DD")}</strong>
                  <span>{dayjs(item.start).format("MM/YYYY")}</span>
                </div>
                <List.Item.Meta
                  description={`${item.project_code ?? "—"} · ${item.organization_name ?? calendarTypeLabel(item.type)}`}
                  title={<Space wrap><Tag color={item.type === "AUDIT" ? "green" : "blue"}>{calendarTypeLabel(item.type)}</Tag><Text strong>{item.title}</Text></Space>}
                />
              </List.Item>
            )}
          />
        </Card>
      </section>

      <section className="personal-dashboard-secondary-grid">
        <Card className="dashboard-card" title={<Space><WarningOutlined />Ngoại lệ cần chú ý</Space>}>
          <List
            dataSource={workspace.exceptions}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có công việc quá hạn." /> }}
            renderItem={(item) => (
              <List.Item actions={[<Button key="open" onClick={() => onOpenPath(item.destination_path, item.context)} size="small">Xử lý</Button>]}>
                <List.Item.Meta description={`${item.message} · Hạn ${formatDate(item.due_at)}`} title={<Text type="danger">{item.title}</Text>} />
              </List.Item>
            )}
          />
        </Card>

        <Card className="dashboard-card" title={<Space><FolderOpenOutlined />Hồ sơ gần đây</Space>}>
          <List
            dataSource={workspace.recent_records.slice(0, 6)}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hồ sơ nghiệp vụ gần đây." /> }}
            renderItem={(item) => (
              <List.Item actions={[<Button key="open" onClick={() => onOpenPath(item.destination_path, item.context)} size="small">Mở</Button>]}>
                <List.Item.Meta
                  description={`${item.project_code ?? "—"} · ${dayjs(item.occurred_at).format("DD/MM/YYYY HH:mm")}`}
                  title={<Space><CheckCircleOutlined /><Text>{item.title}</Text></Space>}
                />
              </List.Item>
            )}
          />
        </Card>
      </section>

      {workspace.meta.sales_assignment_limitation ? (
        <Alert message={workspace.meta.sales_assignment_limitation} showIcon type="info" />
      ) : null}
    </div>
  );
}
