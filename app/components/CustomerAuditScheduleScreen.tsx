"use client";

import { CalendarOutlined, EnvironmentOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Alert, Button, Card, Empty, Skeleton, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";

import { api, getErrorMessage } from "../lib/api";

const { Text, Title } = Typography;

interface CustomerAuditPlan {
  id: string;
  plan_code: string | null;
  audit_type: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  location: string | null;
  audit_scope: string | null;
  audit_criteria: string | null;
  status: string | null;
  project: {
    id: string;
    project_code: string;
    standard_name: string | null;
  };
  customer: {
    customer_code: string;
    company_name: string;
  };
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}

function auditTypeLabel(value?: string | null) {
  const key = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const labels: Record<string, string> = {
    stage1: "Giai đoạn 1",
    stage2: "Giai đoạn 2",
    surveillance1: "Giám sát lần 1",
    surveillance_1: "Giám sát lần 1",
    surveillance2: "Giám sát lần 2",
    surveillance_2: "Giám sát lần 2",
    recertification: "Tái chứng nhận",
    special: "Đánh giá đặc biệt",
  };
  return labels[key] ?? (value || "Đánh giá");
}

function planStatusLabel(value?: string | null) {
  const key = (value ?? "").trim().toLowerCase();
  const labels: Record<string, string> = {
    issued: "Đã ban hành",
    approved: "Đã phê duyệt",
    confirmed: "Đã xác nhận",
    in_progress: "Đang thực hiện",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
  };
  return labels[key] ?? (value || "—").replaceAll("_", " ");
}

export function CustomerAuditScheduleScreen() {
  const query = useQuery({
    queryKey: ["customer-portal", "schedule"],
    queryFn: async () => (
      await api.get<CustomerAuditPlan[]>("/customer-portal/me/schedule")
    ).data,
  });

  const columns: TableColumnsType<CustomerAuditPlan> = [
    {
      title: "Hồ sơ",
      key: "project",
      render: (_, item) => (
        <div className="table-primary-cell">
          <strong>{item.project.project_code}</strong>
          <small>{item.project.standard_name ?? "—"}</small>
        </div>
      ),
    },
    {
      title: "Kế hoạch",
      key: "plan",
      render: (_, item) => (
        <Space direction="vertical" size={2}>
          <Text strong>{item.plan_code ?? "Kế hoạch đánh giá"}</Text>
          <Tag>{auditTypeLabel(item.audit_type)}</Tag>
        </Space>
      ),
    },
    {
      title: "Thời gian",
      key: "date",
      render: (_, item) => (
        <Space><CalendarOutlined /><Text>{formatDate(item.planned_start_date)} – {formatDate(item.planned_end_date ?? item.planned_start_date)}</Text></Space>
      ),
    },
    {
      title: "Địa điểm",
      key: "location",
      render: (_, item) => item.location ? <Space><EnvironmentOutlined /><Text>{item.location}</Text></Space> : "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (value: string | null) => <Tag color="blue">{planStatusLabel(value)}</Tag>,
    },
  ];

  if (query.isLoading) return <Card><Skeleton active paragraph={{ rows: 10 }} /></Card>;
  if (query.isError) {
    return <Alert message="Không tải được lịch đánh giá" description={getErrorMessage(query.error)} showIcon type="error" />;
  }

  return (
    <div className="projects-screen customer-portal-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">CỔNG KHÁCH HÀNG</span>
          <Title level={2}>Lịch đánh giá</Title>
          <Text type="secondary">Chỉ hiển thị các kế hoạch đã được công bố cho tổ chức của bạn; không hiển thị phân công nội bộ của đoàn đánh giá.</Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button>
      </div>
      <Card>
        {(query.data ?? []).length ? (
          <Table<CustomerAuditPlan>
            columns={columns}
            dataSource={query.data ?? []}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            rowKey="id"
            scroll={{ x: 900 }}
          />
        ) : <Empty description="Chưa có lịch đánh giá được công bố" />}
      </Card>
    </div>
  );
}
