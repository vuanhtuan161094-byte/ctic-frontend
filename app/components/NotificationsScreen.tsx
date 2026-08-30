"use client";

import { CheckOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  List,
  Segmented,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import type { NotificationResponse, PersonalNotification } from "../types/notification";
import {
  markNotificationRead,
  notificationCategoryLabels,
  notificationIcon,
  notificationSeverityMeta,
} from "./NotificationCenter";

const { Text, Title } = Typography;

type ViewFilter = "all" | "unread" | "work" | "reminder" | "overdue" | "certificate";

interface NotificationsScreenProps {
  customerMode?: boolean;
  onOpenPath: (path: string | null, context?: Record<string, unknown> | null) => void;
}

function matchesView(item: PersonalNotification, filter: ViewFilter) {
  if (filter === "all") return true;
  if (filter === "unread") return item.status === "unread";
  if (filter === "work") return ["WORK_ASSIGNED", "TECHNICAL_REVIEW_READY", "CERTIFICATION_DECISION_READY", "CERTIFICATE_ISSUE_READY"].includes(item.category);
  if (filter === "reminder") return ["WORK_DUE_SOON", "CAP_DUE"].includes(item.category);
  if (filter === "overdue") return ["WORK_OVERDUE", "WORK_ESCALATED"].includes(item.category);
  return item.category.startsWith("CERTIFICATE_");
}

export function NotificationsScreen({ customerMode = false, onOpenPath }: NotificationsScreenProps) {
  const [view, setView] = useState<ViewFilter>("all");
  const [severity, setSeverity] = useState("all");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications", "me", customerMode ? "customer" : "internal", "all", severity],
    queryFn: async () => {
      const severityQuery = severity === "all" ? "" : `&severity=${severity}`;
      const response = await api.get<NotificationResponse>(
        customerMode
          ? "/customer-portal/me/notifications?limit=200"
          : `/notifications/me?status=all&limit=200${severityQuery}`,
      );
      return response.data;
    },
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications", "me"] });
  };
  const markOne = useMutation({
    mutationFn: async (id: string) => customerMode
      ? api.patch(`/customer-portal/me/notifications/${id}/read`)
      : markNotificationRead(id),
    onSuccess: refresh,
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const markAll = useMutation({
    mutationFn: async () => api.patch(
      customerMode
        ? "/customer-portal/me/notifications/read-all"
        : "/notifications/me/read-all",
    ),
    onSuccess: refresh,
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const items = useMemo(
    () => (query.data?.items ?? []).filter((item) => (
      matchesView(item, view)
      && (severity === "all" || item.severity === severity)
    )),
    [query.data?.items, severity, view],
  );

  if (query.isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (query.isError) return <Alert message="Không thể tải thông báo" description={getErrorMessage(query.error)} type="error" showIcon />;

  return (
    <div className="notifications-screen">
      <div className="screen-heading-row">
        <div>
          <Text className="screen-eyebrow">TRUNG TÂM THÔNG BÁO</Text>
          <Title level={1}>Thông báo của tôi</Title>
          <Text type="secondary">Thông báo là lịch sử truyền tin; công việc vẫn được xử lý trong đúng hồ sơ nghiệp vụ.</Text>
        </div>
        <Space>
          <Button icon={<CheckOutlined />} loading={markAll.isPending} onClick={() => markAll.mutate()}>
            Đánh dấu tất cả đã đọc
          </Button>
          <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button>
        </Space>
      </div>

      <Card className="notification-list-card">
        <div className="notification-screen-filters">
          <Segmented
            onChange={(value) => setView(value as ViewFilter)}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "unread", label: "Chưa đọc" },
              { value: "work", label: "Công việc" },
              { value: "reminder", label: "Nhắc hạn" },
              { value: "overdue", label: "Quá hạn" },
              { value: "certificate", label: "Chứng nhận" },
            ]}
            value={view}
          />
          <Select
            aria-label="Lọc mức độ thông báo"
            onChange={setSeverity}
            options={[
              { value: "all", label: "Tất cả mức độ" },
              { value: "CRITICAL", label: "Nghiêm trọng" },
              { value: "WARNING", label: "Cần theo dõi" },
              { value: "NORMAL", label: "Bình thường" },
              { value: "INFO", label: "Thông tin" },
            ]}
            value={severity}
          />
        </div>

        <List
          dataSource={items}
          locale={{ emptyText: <Empty description="Không có thông báo trong nhóm này" /> }}
          renderItem={(item) => {
            const severityMeta = notificationSeverityMeta(item.severity);
            return (
              <List.Item
                actions={[
                  item.status === "unread" ? (
                    <Button key="read" onClick={() => markOne.mutate(item.id)} size="small" type="link">Đánh dấu đã đọc</Button>
                  ) : null,
                  <Button key="open" onClick={() => {
                    if (item.status === "unread") markOne.mutate(item.id);
                    onOpenPath(item.destination_path, item.context);
                  }} size="small" type="primary">Mở nội dung</Button>,
                ].filter(Boolean)}
                className={item.status === "unread" ? "notification-list-item is-unread" : "notification-list-item"}
              >
                <List.Item.Meta
                  avatar={<span className={`notification-category-icon severity-${item.severity.toLowerCase()}`}>{notificationIcon(item.category)}</span>}
                  description={(
                    <div>
                      <p>{item.message}</p>
                      <Space size={6} wrap>
                        <Tag>{notificationCategoryLabels[item.category] ?? "Cập nhật khách hàng"}</Tag>
                        <Tag color={severityMeta.color}>{severityMeta.label}</Tag>
                        <Text type="secondary">{dayjs(item.created_at).format("HH:mm · DD/MM/YYYY")}</Text>
                        {item.work_item?.completed ? <Tag color="green">Công việc đã hoàn thành</Tag> : null}
                      </Space>
                    </div>
                  )}
                  title={<Space>{item.status === "unread" ? <Badge status="processing" /> : null}<Text strong>{item.title}</Text></Space>}
                />
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}
