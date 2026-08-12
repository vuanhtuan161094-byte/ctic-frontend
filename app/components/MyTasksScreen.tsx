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
  Empty,
  Input,
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
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import {
  resolveTaskNavigation,
  type TaskDestination,
} from "../lib/task-navigation";

const { Text, Title } = Typography;

type TaskPriority = "critical" | "high" | "normal";
type TimeFilter = "all" | "overdue" | "due_soon" | "no_due";

interface WorkTaskItem {
  id: string;
  task_type: string;
  title: string;
  description: string;
  group: string;
  priority: TaskPriority;
  source_status: string;
  entity_type: string;
  entity_id: string | null;
  project_id: string | null;
  project_code: string | null;
  organization_name: string | null;
  assignee: string | null;
  due_date: string | null;
  destination: TaskDestination;
  target_id: string | null;
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
  filter: {
    limit: number;
  };
  items: WorkTaskItem[];
}

interface MyTasksScreenProps {
  roles: string[];
  onNavigate: (destination: TaskDestination, entityId?: string | null) => void;
}

const priorityMeta: Record<
  TaskPriority,
  { color: string; label: string }
> = {
  critical: { color: "red", label: "Khẩn cấp" },
  high: { color: "orange", label: "Ưu tiên cao" },
  normal: { color: "blue", label: "Bình thường" },
};

const statusLabels: Record<string, string> = {
  active: "Đang hiệu lực",
  assigned: "Đã phân công",
  corrective_action_required: "Chờ khắc phục NC",
  draft: "Bản nháp",
  in_progress: "Đang xử lý",
  in_review: "Đang thẩm xét",
  issued: "Đã phát hành",
  pending: "Chờ xử lý",
  pending_decision: "Chờ quyết định",
  pending_technical_review: "Chờ thẩm xét kỹ thuật",
  planned: "Đã lập kế hoạch",
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

export function MyTasksScreen({ onNavigate }: MyTasksScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [openingItemId, setOpeningItemId] = useState<string | null>(null);

  const taskQuery = useQuery({
    queryKey: ["work-tasks", "me"],
    queryFn: async () => {
      const response = await api.get<WorkTaskResponse>(
        "/notifications/me/tasks?limit=200",
      );
      return response.data;
    },
    staleTime: 20_000,
  });

  const items = taskQuery.data?.items ?? [];
  const summary = taskQuery.data?.summary ?? {
    total: 0,
    overdue: 0,
    due_soon: 0,
    high_priority: 0,
  };

  const groupOptions = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.group)))
        .sort((left, right) => left.localeCompare(right, "vi"))
        .map((value) => ({ value, label: value })),
    [items],
  );

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase("vi");
    const today = dayjs().startOf("day");

    return items.filter((item) => {
      if (
        priorityFilter === "important" &&
        !["critical", "high"].includes(item.priority)
      ) {
        return false;
      }

      if (
        !["all", "important"].includes(priorityFilter) &&
        item.priority !== priorityFilter
      ) {
        return false;
      }

      if (groupFilter !== "all" && item.group !== groupFilter) {
        return false;
      }

      if (timeFilter === "no_due" && item.due_date) {
        return false;
      }

      if (timeFilter === "overdue") {
        if (!item.due_date || !dayjs(item.due_date).startOf("day").isBefore(today)) {
          return false;
        }
      }

      if (timeFilter === "due_soon") {
        if (!item.due_date) return false;
        const days = dayjs(item.due_date).startOf("day").diff(today, "day");
        if (days < 0 || days > 7) return false;
      }

      if (!keyword) return true;

      return [
        item.title,
        item.description,
        item.group,
        item.project_code,
        item.organization_name,
        item.assignee,
        getStatusLabel(item.source_status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(keyword);
    });
  }, [groupFilter, items, priorityFilter, searchTerm, timeFilter]);

  const openTask = async (item: WorkTaskItem) => {
    setOpeningItemId(item.id);

    try {
      if (item.destination && (item.target_id || item.destination === "projects")) {
        onNavigate(item.destination, item.target_id);
        return;
      }

      const target = await resolveTaskNavigation(
        item.entity_type,
        item.entity_id,
      );

      onNavigate(target.destination, target.entityId);
    } catch (error) {
      const detail = error instanceof Error && error.constructor === Error
        ? error.message
        : getErrorMessage(error);
      message.warning(`${detail} Đã mở danh sách hồ sơ để tiếp tục tra cứu.`);
      onNavigate("projects", null);
    } finally {
      setOpeningItemId(null);
    }
  };

  const columns = useMemo<TableColumnsType<WorkTaskItem>>(
    () => [
      {
        title: "Công việc cần xử lý",
        key: "task",
        render: (_, item) => (
          <div className="my-task-title my-task-title-v2">
            <span className={`my-task-priority-dot priority-${item.priority}`} />
            <div>
              <Space size={8} wrap>
                <Text strong>{item.title}</Text>
                {item.project_code ? (
                  <Tag className="task-project-code">{item.project_code}</Tag>
                ) : null}
              </Space>
              <p>{item.description}</p>
              <small>
                {item.organization_name ?? item.group}
                {item.assignee ? ` · Phụ trách: ${item.assignee}` : ""}
              </small>
            </div>
          </div>
        ),
      },
      {
        title: "Nhóm nghiệp vụ",
        dataIndex: "group",
        key: "group",
        width: 205,
        responsive: ["md"],
        render: (value: string, item) => (
          <div className="table-primary-cell">
            <span>{value}</span>
            <small>{getStatusLabel(item.source_status)}</small>
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
        title: "Hạn xử lý",
        dataIndex: "due_date",
        key: "due_date",
        width: 155,
        render: (value: string | null) => {
          const due = getDueMeta(value);
          return <span className={due.className}>{due.label}</span>;
        },
      },
      {
        title: "",
        key: "action",
        width: 92,
        fixed: "right",
        render: (_, item) => (
          <Button
            icon={<EyeOutlined />}
            loading={openingItemId === item.id}
            onClick={() => void openTask(item)}
            size="small"
            type="primary"
          >
            Mở
          </Button>
        ),
      },
    ],
    [openingItemId],
  );

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
          <Text className="screen-eyebrow">TRUNG TÂM CÔNG VIỆC</Text>
          <Title level={1}>Công việc của tôi</Title>
          <Text type="secondary">
            Dữ liệu được tổng hợp trực tiếp từ hồ sơ, lịch đánh giá, thẩm xét,
            NC/CAP và chứng chỉ.
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
          onClick={() => setTimeFilter("all")}
        >
          <Statistic
            prefix={<CheckCircleOutlined />}
            title="Tổng việc cần xử lý"
            value={summary.total}
          />
        </Card>
        <Card
          className={timeFilter === "overdue" ? "task-kpi-active" : ""}
          onClick={() => setTimeFilter("overdue")}
        >
          <Statistic
            prefix={<WarningOutlined />}
            title="Đã quá hạn"
            value={summary.overdue}
            valueStyle={summary.overdue ? { color: "#cf1322" } : undefined}
          />
        </Card>
        <Card
          className={timeFilter === "due_soon" ? "task-kpi-active" : ""}
          onClick={() => setTimeFilter("due_soon")}
        >
          <Statistic
            prefix={<ClockCircleOutlined />}
            title="Đến hạn trong 7 ngày"
            value={summary.due_soon}
          />
        </Card>
        <Card
          className={priorityFilter === "important" ? "task-kpi-active" : ""}
          onClick={() =>
            setPriorityFilter(priorityFilter === "important" ? "all" : "important")
          }
        >
          <Statistic
            prefix={<WarningOutlined />}
            title="Ưu tiên cao"
            value={summary.high_priority}
          />
        </Card>
      </section>

      <Card className="my-tasks-table-card my-tasks-table-card-v2" title="Danh sách công việc">
        <div className="my-tasks-filters my-tasks-filters-v2">
          <Input
            allowClear
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm mã hồ sơ, khách hàng hoặc nội dung công việc..."
            prefix={<SearchOutlined />}
            value={searchTerm}
          />
          <Select
            aria-label="Lọc thời hạn"
            onChange={setTimeFilter}
            options={[
              { value: "all", label: "Tất cả thời hạn" },
              { value: "overdue", label: "Đã quá hạn" },
              { value: "due_soon", label: "Đến hạn trong 7 ngày" },
              { value: "no_due", label: "Chưa có hạn" },
            ]}
            value={timeFilter}
          />
          <Select
            aria-label="Lọc mức ưu tiên"
            onChange={setPriorityFilter}
            options={[
              { value: "all", label: "Tất cả ưu tiên" },
              { value: "important", label: "Khẩn cấp & ưu tiên cao" },
              { value: "critical", label: "Khẩn cấp" },
              { value: "high", label: "Ưu tiên cao" },
              { value: "normal", label: "Bình thường" },
            ]}
            value={priorityFilter}
          />
          <Select
            aria-label="Lọc nhóm nghiệp vụ"
            onChange={setGroupFilter}
            options={[
              { value: "all", label: "Tất cả nghiệp vụ" },
              ...groupOptions,
            ]}
            value={groupFilter}
          />
        </div>

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
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `${total} công việc`,
          }}
          rowClassName={(item) => `task-row-priority-${item.priority}`}
          rowKey="id"
          scroll={{ x: 1040 }}
          size="middle"
        />
      </Card>

      <Text className="my-tasks-updated-at" type="secondary">
        Dữ liệu cập nhật lúc {formatDateTime(taskQuery.data?.generated_at)}
      </Text>
    </div>
  );
}
