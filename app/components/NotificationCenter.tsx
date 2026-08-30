"use client";

import {
  BellOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Empty,
  Popover,
  Skeleton,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import type {
  NotificationCategory,
  NotificationResponse,
  PersonalNotification,
} from "../types/notification";

const { Text } = Typography;

export const notificationCategoryLabels: Record<NotificationCategory, string> = {
  WORK_ASSIGNED: "Công việc mới",
  WORK_DUE_SOON: "Nhắc hạn",
  WORK_OVERDUE: "Quá hạn",
  WORK_ESCALATED: "Cảnh báo quá hạn",
  WORKFLOW_UPDATE: "Cập nhật hồ sơ",
  CAP_DUE: "NC / Hành động khắc phục",
  TECHNICAL_REVIEW_READY: "Sẵn sàng thẩm xét",
  CERTIFICATION_DECISION_READY: "Sẵn sàng ra quyết định",
  CERTIFICATE_ISSUE_READY: "Sẵn sàng phát hành",
  CERTIFICATE_EXPIRING: "Chứng chỉ sắp hết hiệu lực",
  CERTIFICATE_STATUS_CHANGED: "Trạng thái chứng chỉ",
};

export function notificationSeverityMeta(severity: PersonalNotification["severity"]) {
  if (severity === "CRITICAL") return { color: "red", label: "Nghiêm trọng" };
  if (severity === "WARNING") return { color: "orange", label: "Cần theo dõi" };
  if (severity === "NORMAL") return { color: "blue", label: "Bình thường" };
  return { color: "default", label: "Thông tin" };
}

export function notificationIcon(category: NotificationCategory) {
  if (category.startsWith("CERTIFICATE_")) return <SafetyCertificateOutlined />;
  if (["WORK_OVERDUE", "WORK_ESCALATED"].includes(category)) return <WarningOutlined />;
  if (["WORK_DUE_SOON", "CAP_DUE"].includes(category)) return <ClockCircleOutlined />;
  return <BellOutlined />;
}

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

interface NotificationCenterProps {
  customerMode?: boolean;
  onOpenPath: (path: string | null, context?: Record<string, unknown> | null) => void;
  onViewAll: () => void;
}

export function NotificationCenter({ customerMode = false, onOpenPath, onViewAll }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const notificationQuery = useQuery({
    queryKey: ["notifications", "me", customerMode ? "customer" : "internal", "compact"],
    queryFn: async () => {
      const response = await api.get<NotificationResponse>(
        customerMode
          ? "/customer-portal/me/notifications?limit=8"
          : "/notifications/me?status=all&limit=8",
      );
      return response.data;
    },
    refetchInterval: 60_000,
    staleTime: 20_000,
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
  const items = notificationQuery.data?.items ?? [];
  const unreadCount = notificationQuery.data?.summary.total ?? 0;

  const content = (
    <div className="notification-popover-panel">
      <div className="notification-popover-actions">
        <Text type="secondary">{unreadCount} thông báo chưa đọc</Text>
        <Button
          disabled={unreadCount === 0}
          loading={markAll.isPending}
          onClick={() => markAll.mutate()}
          size="small"
          type="link"
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {notificationQuery.isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} title={false} />
      ) : items.length ? (
        <div className="notification-popover-list">
          {items.map((item) => {
            const severity = notificationSeverityMeta(item.severity);
            return (
              <button
                className={`notification-popover-item ${item.status === "unread" ? "is-unread" : ""}`}
                key={item.id}
                onClick={() => {
                  if (item.status === "unread") markOne.mutate(item.id);
                  setOpen(false);
                  onOpenPath(item.destination_path, item.context);
                }}
                type="button"
              >
                <span className={`notification-category-icon severity-${item.severity.toLowerCase()}`}>
                  {notificationIcon(item.category)}
                </span>
                <span className="notification-popover-copy">
                  <span><strong>{item.title}</strong>{item.status === "unread" ? <i /> : null}</span>
                  <small>{item.message}</small>
                  <em>{dayjs(item.created_at).format("HH:mm · DD/MM/YYYY")}</em>
                </span>
                <Tag color={severity.color}>{severity.label}</Tag>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa có thông báo" />
      )}

      <Button
        block
        onClick={() => {
          setOpen(false);
          onViewAll();
        }}
        type="primary"
      >
        Xem tất cả thông báo
      </Button>
    </div>
  );

  return (
    <Popover
      content={content}
      onOpenChange={setOpen}
      open={open}
      placement="bottomRight"
      title={<span>Thông báo</span>}
      trigger="click"
    >
      <Badge count={unreadCount} size="small">
        <Button aria-label="Thông báo" icon={<BellOutlined />} shape="circle" />
      </Badge>
    </Popover>
  );
}
