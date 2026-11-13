"use client";

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Grid,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Text, Title } = Typography;

function activateKpiWithKeyboard(event: KeyboardEvent<HTMLDivElement>, activate: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  activate();
}

type TaskPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";
type TimeFilter = "all" | "overdue" | "due_soon" | "no_due";
type StatusFilter = "ACTIVE" | "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

interface WorkTaskItem {
  id: string;
  work_type: string;
  action_code: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: string;
  entity_type: string;
  entity_id: string;
  project_id: string | null;
  project_code: string | null;
  organization_name: string | null;
  assignee: string | null;
  due_at: string | null;
  is_overdue: boolean;
  sla_state: string;
  sla_label: string;
  days_until_due: number | null;
  days_overdue: number;
  escalation_level: 1 | 2 | 3 | null;
  destination_path: string | null;
  context: Record<string, unknown> | null;
  can_execute: boolean;
  can_view?: boolean;
  is_delegated: boolean;
  delegated_from_user?: {
    id: string;
    username: string;
    full_name?: string | null;
  } | null;
  delegation_validity?: {
    effective_from: string;
    effective_to: string;
  } | null;
  cycle_key?: string | null;
  audit_event_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkTaskResponse {
  generated_at: string;
  summary: {
    total: number;
    overdue: number;
    due_soon: number;
    high_priority: number;
  };
  filter: { limit: number; };
  pagination?: { page: number; page_size: number; total: number; page_count: number; has_more: boolean; };
  items: WorkTaskItem[];
}

interface MyTasksScreenProps {
  roles: string[];
  onOpenPath: (
    path: string | null,
    context?: Record<string, unknown> | null,
  ) => void;
}

const priorityMeta: Record<
  TaskPriority,
  { color: string; label: string }
> = {
  URGENT: { color: "red", label: "Khẩn cấp" },
  HIGH: { color: "orange", label: "Ưu tiên cao" },
  NORMAL: { color: "blue", label: "Bình thường" },
  LOW: { color: "default", label: "Ưu tiên thấp" },
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

function normalizeWorkType(value: string) {
  return value.trim().replace(/[\s-]+/g, "_").toUpperCase();
}

function getWorkTypeLabel(value: string) {
  return workTypeLabels[normalizeWorkType(value)] ?? "Công việc nghiệp vụ";
}

function getTaskActionLabel(item: Pick<WorkTaskItem, "work_type" | "can_execute">) {
  if (!item.can_execute) return "Xem chi tiết";

  const actionLabels: Record<string, string> = {
    CUSTOMER_APPLICATION_INTAKE: "Tiếp nhận đơn",
    APPLICATION_REVIEW: "Xem xét đơn",
    SURVEILLANCE_CHANGE_REVIEW: "Xem xét thay đổi",
    F04_TEAM_APPOINTMENT: "Phân công đoàn",
    AUDIT_PLAN: "Lập kế hoạch",
    AUDIT_EXECUTION: "Thực hiện đánh giá",
    CAP_ACTION_OR_REVIEW: "Xử lý NC/CAP",
    REVIEWER_ASSIGNMENT: "Phân công thẩm xét",
    TECHNICAL_REVIEW: "Thẩm xét hồ sơ",
    CERTIFICATION_DECISION: "Ra quyết định",
    CERTIFICATE_ISSUE: "Phát hành chứng chỉ",
  };

  return actionLabels[normalizeWorkType(item.work_type)] ?? "Xử lý";
}

function getTaskTitle(item: Pick<WorkTaskItem, "title" | "work_type">) {
  const normalizedTitle = normalizeWorkType(item.title);
  const normalizedType = normalizeWorkType(item.work_type);
  if (normalizedTitle === normalizedType || workTypeLabels[normalizedTitle]) {
    return workTypeLabels[normalizedTitle] ?? getWorkTypeLabel(item.work_type);
  }
  return item.title;
}

const statusLabels: Record<string, string> = {
  active: "Đang hiệu lực",
  assigned: "Đã phân công",
  corrective_action_required: "Chờ khắc phục NC",
  cancelled: "Đã hủy",
  done: "Đã hoàn thành",
  draft: "Bản nháp",
  in_progress: "Đang xử lý",
  in_review: "Đang thẩm xét",
  issued: "Đã phát hành",
  pending: "Chờ xử lý",
  pending_decision: "Chờ quyết định",
  pending_technical_review: "Chờ thẩm xét kỹ thuật",
  planned: "Đã lập kế hoạch",
  open: "Mới mở",
  project_created: "Đã tạo hồ sơ",
  resubmitted: "Đã gửi lại",
  response_submitted: "Đã gửi phản hồi",
  revision_required: "Yêu cầu bổ sung",
  submitted: "Đã gửi",
  technical_review_completed: "Đã thẩm xét kỹ thuật",
  under_review: "Đang xem xét",
};

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function getStatusLabel(value?: string | null) {
  const status = normalize(value);
  return statusLabels[status] ?? status.replaceAll("_", " ");
}

function formatDateTime(value?: string | number | null) {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("HH:mm · DD/MM/YYYY") : "—";
}

function getDueMeta(value?: string | null) {
  if (!value) {
    return {
      label: "Chưa thiết lập",
      className: "task-due-neutral",
    };
  }

  const dueDate = dayjs(value).startOf("day");
  const today = dayjs().startOf("day");
  const days = dueDate.diff(today, "day");

  if (days < 0) {
    return {
      label: `Quá hạn ${Math.abs(days)} ngày`,
      className: "task-due-overdue",
    };
  }

  if (days === 0) {
    return {
      label: "Hạn hôm nay",
      className: "task-due-today",
    };
  }

  if (days <= 7) {
    return {
      label: `Còn ${days} ngày`,
      className: "task-due-soon",
    };
  }

  return {
    label: dueDate.format("DD/MM/YYYY"),
    className: "task-due-neutral",
  };
}

export function MyTasksScreen({ onOpenPath }: MyTasksScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [openingItemId, setOpeningItemId] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<WorkTaskItem | null>(null);
  const [serverPage, setServerPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pageSize = 20;
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchTerm]);
  const screens = Grid.useBreakpoint();
  const useMobileTaskCards = !screens.md;

  const taskQuery = useQuery({
    queryKey: ["work-tasks", "me", statusFilter, timeFilter, priorityFilter, groupFilter, debouncedSearch, serverPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(serverPage), limit: String(pageSize) });
      if (statusFilter !== "ACTIVE") params.set("status", statusFilter);
      if (timeFilter !== "all") params.set("due", timeFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter === "important" ? "IMPORTANT" : priorityFilter);
      if (groupFilter !== "all") params.set("work_type", groupFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const response = await api.get<WorkTaskResponse>(`/my-work?${params.toString()}`);
      return response.data;
    },
    staleTime: 20_000,
  });

  const items = useMemo(() => taskQuery.data?.items ?? [], [taskQuery.data?.items]);
  const summary = taskQuery.data?.summary ?? {
    total: 0,
    overdue: 0,
    due_soon: 0,
    high_priority: 0,
  };

  // P.09 groups remain selectable even when current page has no such work type.
  const groupOptions = Object.keys(workTypeLabels)
    .sort((left, right) => getWorkTypeLabel(left).localeCompare(getWorkTypeLabel(right), "vi"))
    .map((value) => ({ value, label: getWorkTypeLabel(value) }));
  // Search/filter/paging are evaluated server-side after resource scope checks.
  const filteredItems = items;
  const matchingTotal = taskQuery.data?.pagination?.total ?? items.length;
  const mobilePageItems = filteredItems;

  const openTask = async (item: WorkTaskItem) => {
    if (!item.can_execute && item.can_view) {
      setHistoryItem(item);
      return;
    }

    setOpeningItemId(item.id);

    try {
      if (!item.destination_path) {
        throw new Error("Công việc chưa có đường dẫn đích hợp lệ.");
      }

      onOpenPath(item.destination_path, item.context);
    } catch (error) {
      const detail = error instanceof Error && error.constructor === Error
        ? error.message
        : getErrorMessage(error);
      message.warning(detail);
    } finally {
      setOpeningItemId(null);
    }
  };

  const columns: TableColumnsType<WorkTaskItem> = [
      {
        title: "Công việc cần xử lý",
        key: "task",
        render: (_, item) => (
          <div className="my-task-title my-task-title-v2">
            <span className={`my-task-priority-dot priority-${item.priority}`} />
            <div>
              <Space size={8} wrap>
                <Text strong>{getTaskTitle(item)}</Text>
                {item.is_delegated ? (
                  <Tag color="purple">
                    Xử lý thay cho {item.delegated_from_user?.full_name || item.delegated_from_user?.username || "người ủy quyền"}
                  </Tag>
                ) : <Tag color="blue">Được phân công</Tag>}
                {item.project_code ? (
                  <Tag className="task-project-code">{item.project_code}</Tag>
                ) : null}
              </Space>
              <p>{item.description}</p>
              <small>
                {item.organization_name ?? getWorkTypeLabel(item.work_type)}
                {item.assignee ? ` · Phụ trách: ${item.assignee}` : ""}
              </small>
            </div>
          </div>
        ),
      },
      {
        title: "Nhóm nghiệp vụ",
        dataIndex: "work_type",
        key: "group",
        width: 205,
        responsive: ["md"],
        render: (value: string, item) => (
          <div className="table-primary-cell">
            <span>{getWorkTypeLabel(value)}</span>
            <small>{getStatusLabel(item.status)}</small>
          </div>
        ),
      },
      {
        title: "Ưu tiên",
        dataIndex: "priority",
        key: "priority",
        width: 135,
        responsive: ["lg"],
        render: (priority: TaskPriority) => (
          <Tag color={priorityMeta[priority].color}>
            {priorityMeta[priority].label}
          </Tag>
        ),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        key: "status",
        width: 145,
        responsive: ["lg"],
        render: (status: string) => <Tag>{getStatusLabel(status)}</Tag>,
      },
      {
        title: "Hạn xử lý",
        dataIndex: "due_at",
        key: "due_at",
        width: 155,
        render: (value: string | null, item) => {
          const due = getDueMeta(value);
          return (
            <Space orientation="vertical" size={2}>
              <span className={due.className}>{item.sla_label || due.label}</span>
              {item.escalation_level ? (
                <Tag color={item.escalation_level === 3 ? "red" : "orange"}>
                  Mức cảnh báo {item.escalation_level}
                </Tag>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: "",
        key: "action",
        width: 92,
        fixed: "right",
        render: (_, item) => (
          <Button
            disabled={!item.can_execute && !item.can_view}
            icon={<EyeOutlined />}
            loading={openingItemId === item.id}
            onClick={() => void openTask(item)}
            size="small"
            type="primary"
          >
            {getTaskActionLabel(item)}
          </Button>
        ),
      },
    ];

  if (taskQuery.isLoading) {
    return (
      <div className="my-tasks-screen">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  if (taskQuery.isError) {
    return (
      <Alert
        action={
          <Button onClick={() => void taskQuery.refetch()}>Thử lại</Button>
        }
        description={getErrorMessage(taskQuery.error)}
        message="Không thể tải công việc"
        showIcon
        type="error"
      />
    );
  }

  return (
    <div className="my-tasks-screen my-tasks-screen-v2">
      <div className="screen-heading-row my-tasks-heading">
        <div>
          <Title level={1}>Công việc</Title>
          <Text type="secondary">
            Tổng hợp công việc từ hồ sơ, lịch đánh giá, thẩm xét, NC/CAP và chứng chỉ.
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={taskQuery.isFetching}
          onClick={() => void taskQuery.refetch()}
        >
          Làm mới
        </Button>
      </div>

      <section className="my-tasks-kpi-grid my-tasks-kpi-grid-v2">
        <Card
          className={timeFilter === "all" ? "task-kpi-active" : ""}
          role="button"
          tabIndex={0}
          aria-pressed={timeFilter === "all"}
          onKeyDown={(event) => activateKpiWithKeyboard(event, () => { setTimeFilter("all"); setServerPage(1); })}
          onClick={() => { setTimeFilter("all"); setServerPage(1); }}
        >
          <Statistic
            prefix={<CheckCircleOutlined />}
            title="Tổng việc cần xử lý"
            value={summary.total}
          />
        </Card>
        <Card
          className={timeFilter === "overdue" ? "task-kpi-active" : ""}
          role="button"
          tabIndex={0}
          aria-pressed={timeFilter === "overdue"}
          onKeyDown={(event) => activateKpiWithKeyboard(event, () => { setTimeFilter("overdue"); setServerPage(1); })}
          onClick={() => { setTimeFilter("overdue"); setServerPage(1); }}
        >
          <Statistic
            prefix={<WarningOutlined />}
            title="Đã quá hạn"
            value={summary.overdue}
            styles={summary.overdue ? { content: { color: "#cf1322" } } : undefined}
          />
        </Card>
        <Card
          className={timeFilter === "due_soon" ? "task-kpi-active" : ""}
          role="button"
          tabIndex={0}
          aria-pressed={timeFilter === "due_soon"}
          onKeyDown={(event) => activateKpiWithKeyboard(event, () => { setTimeFilter("due_soon"); setServerPage(1); })}
          onClick={() => { setTimeFilter("due_soon"); setServerPage(1); }}
        >
          <Statistic
            prefix={<ClockCircleOutlined />}
            title="Đến hạn trong 7 ngày"
            value={summary.due_soon}
          />
        </Card>
        <Card
          className={priorityFilter === "important" ? "task-kpi-active" : ""}
          role="button"
          tabIndex={0}
          aria-pressed={priorityFilter === "important"}
          onKeyDown={(event) => activateKpiWithKeyboard(event, () => { setPriorityFilter(priorityFilter === "important" ? "all" : "important"); setServerPage(1); })}
          onClick={() =>
            { setPriorityFilter(priorityFilter === "important" ? "all" : "important"); setServerPage(1); }
          }
        >
          <Statistic
            prefix={<WarningOutlined />}
            title="Ưu tiên cao"
            value={summary.high_priority}
          />
        </Card>
      </section>

      {debouncedSearch ? (
        <Text type="secondary">Tìm thấy {matchingTotal} công việc trong phạm vi quyền truy cập.</Text>
      ) : null}

      <Card className="my-tasks-table-card my-tasks-table-card-v2" title="Danh sách công việc">
        <div className="my-tasks-filters my-tasks-filters-v2">
          <Input
            allowClear
            onChange={(event) => { setSearchTerm(event.target.value); setServerPage(1); }}
            placeholder="Tìm mã hồ sơ, khách hàng hoặc nội dung công việc..."
            prefix={<SearchOutlined />}
            value={searchTerm}
          />
          <Select
            aria-label="Lọc thời hạn"
            onChange={(value) => { setTimeFilter(value); setServerPage(1); }}
            options={[
              { value: "all", label: "Tất cả thời hạn" },
              { value: "overdue", label: "Đã quá hạn" },
              { value: "due_soon", label: "Đến hạn trong 7 ngày" },
              { value: "no_due", label: "Chưa có hạn" },
            ]}
            value={timeFilter}
          />
          <Select
            aria-label="Lọc trạng thái"
            onChange={(value) => { setStatusFilter(value); setServerPage(1); }}
            options={[
              { value: "ACTIVE", label: "Đang hoạt động" },
              { value: "OPEN", label: "Mới mở" },
              { value: "IN_PROGRESS", label: "Đang xử lý" },
              { value: "DONE", label: "Đã hoàn thành" },
              { value: "CANCELLED", label: "Đã hủy" },
            ]}
            value={statusFilter}
          />
          <Select
            aria-label="Lọc mức ưu tiên"
            onChange={(value) => { setPriorityFilter(value); setServerPage(1); }}
            options={[
              { value: "all", label: "Tất cả ưu tiên" },
              { value: "important", label: "Khẩn cấp & ưu tiên cao" },
              { value: "URGENT", label: "Khẩn cấp" },
              { value: "HIGH", label: "Ưu tiên cao" },
              { value: "NORMAL", label: "Bình thường" },
              { value: "LOW", label: "Ưu tiên thấp" },
            ]}
            value={priorityFilter}
          />
          <Select
            aria-label="Lọc nhóm nghiệp vụ"
            onChange={(value) => { setGroupFilter(value); setServerPage(1); }}
            options={[
              { value: "all", label: "Tất cả nghiệp vụ" },
              ...groupOptions,
            ]}
            value={groupFilter}
          />
        </div>

        {useMobileTaskCards ? (
          <div className="my-task-mobile-list">
            {mobilePageItems.length ? mobilePageItems.map((item) => {
              const due = getDueMeta(item.due_at);
              return (
                <article className="my-task-mobile-card" key={item.id}>
                  <div className="my-task-mobile-copy">
                    <div className="my-task-mobile-title">
                      <span className={`my-task-priority-dot priority-${item.priority}`} />
                      <div>
                        <Text strong>{getTaskTitle(item)}</Text>
                        <Space size={6} wrap>
                          {item.is_delegated ? (
                            <Tag color="purple">
                              Xử lý thay cho {item.delegated_from_user?.full_name || item.delegated_from_user?.username || "người ủy quyền"}
                            </Tag>
                          ) : <Tag color="blue">Được phân công</Tag>}
                          {item.project_code ? <Tag className="task-project-code">{item.project_code}</Tag> : null}
                        </Space>
                      </div>
                    </div>
                    {item.description ? <p>{item.description}</p> : null}
                    <small>
                      {item.organization_name ?? getWorkTypeLabel(item.work_type)}
                      {item.assignee ? ` · Phụ trách: ${item.assignee}` : ""}
                    </small>
                    <div className="my-task-mobile-meta">
                      <Tag color={priorityMeta[item.priority].color}>{priorityMeta[item.priority].label}</Tag>
                      <Tag>{getStatusLabel(item.status)}</Tag>
                      <span className={due.className}>
                        {item.sla_label || due.label}
                        {item.due_at ? ` · ${dayjs(item.due_at).format("DD/MM/YYYY")}` : ""}
                      </span>
                    </div>
                  </div>
                  <Button
                    disabled={!item.can_execute && !item.can_view}
                    icon={<EyeOutlined />}
                    loading={openingItemId === item.id}
                    onClick={() => void openTask(item)}
                    size="small"
                    type="primary"
                  >
                    {getTaskActionLabel(item)}
                  </Button>
                </article>
              );
            }) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có công việc phù hợp bộ lọc" />
            )}
            {matchingTotal > pageSize ? (
              <Pagination
                current={serverPage}
                onChange={setServerPage}
                pageSize={pageSize}
                showSizeChanger={false}
                showTotal={(total) => `${total} công việc`}
                size="small"
                total={matchingTotal}
              />
            ) : null}
          </div>
        ) : (
          <Table<WorkTaskItem>
            columns={columns}
            dataSource={filteredItems}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Không có công việc phù hợp bộ lọc"
                />
              ),
            }}
            pagination={{
              current: serverPage,
              onChange: setServerPage,
              pageSize,
              total: matchingTotal,
              showSizeChanger: false,
              showTotal: (total) => `${total} công việc`,
            }}
            rowClassName={(item) => `task-row-priority-${item.priority.toLowerCase()}`}
            rowKey="id"
            scroll={{ x: 1040 }}
            size="middle"
          />
        )}
      </Card>

      <Modal
        footer={<Button onClick={() => setHistoryItem(null)}>Đóng</Button>}
        onCancel={() => setHistoryItem(null)}
        open={Boolean(historyItem)}
        title={<Space size={8}><span>Chi tiết công việc</span><Tag>Chỉ xem</Tag></Space>}
      >
        {historyItem ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Công việc">{getTaskTitle(historyItem)}</Descriptions.Item>
            <Descriptions.Item label="Nhóm nghiệp vụ">{getWorkTypeLabel(historyItem.work_type)}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{getStatusLabel(historyItem.status)}</Descriptions.Item>
            <Descriptions.Item label="Hồ sơ / dự án">
              {historyItem.project_code || historyItem.organization_name || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Người phụ trách">{historyItem.assignee || "—"}</Descriptions.Item>
            <Descriptions.Item label="Hạn xử lý">{formatDateTime(historyItem.due_at)}</Descriptions.Item>
            <Descriptions.Item label="Cập nhật cuối">{formatDateTime(historyItem.updated_at)}</Descriptions.Item>
            <Descriptions.Item label="Mô tả">{historyItem.description || "—"}</Descriptions.Item>
            {historyItem.is_delegated ? (
              <Descriptions.Item label="Ủy quyền">
                Xử lý thay cho {historyItem.delegated_from_user?.full_name || historyItem.delegated_from_user?.username || "người ủy quyền"}
              </Descriptions.Item>
            ) : null}
          </Descriptions>
        ) : null}
        <Alert
          description="Chỉ hiển thị dấu vết công việc; không mở lại thao tác nghiệp vụ đã hoàn thành, đã hủy hoặc đang bị chặn bởi phân quyền/SoD."
          message="Bản ghi chỉ xem"
          showIcon
          style={{ marginTop: 16 }}
          type="info"
        />
      </Modal>

      <Text className="my-tasks-updated-at" type="secondary">
        Dữ liệu cập nhật lúc {formatDateTime(taskQuery.data?.generated_at)}
      </Text>
    </div>
  );
}
