"use client";

import {
  AuditOutlined,
  BellOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Empty,
  List,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";

import { api, getErrorMessage } from "../lib/api";

const { Text, Title } = Typography;

interface CustomerPortalDashboard {
  customers: Array<{
    id: string;
    customer_code: string;
    company_name: string;
  }>;
  summary: {
    applications: number;
    active_projects: number;
    open_corrective_actions: number;
    active_certificates: number;
    unread_notifications: number;
  };
  upcoming_audits: Array<{
    id: string;
    plan_code: string | null;
    audit_type: string | null;
    planned_start_date: string | null;
    planned_end_date: string | null;
    location: string | null;
    project_code: string;
    standard_name: string | null;
  }>;
}

interface CustomerPortalDashboardScreenProps {
  onOpenApplications: () => void;
  onOpenCertifications: () => void;
  onOpenCorrectiveActions: () => void;
  onOpenCertificates: () => void;
  onOpenNotifications: () => void;
  onOpenSchedule: () => void;
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start) return "Chưa xác định";
  const startDate = dayjs(start);
  const endDate = end ? dayjs(end) : null;
  if (!startDate.isValid()) return "Chưa xác định";
  if (!endDate?.isValid() || startDate.isSame(endDate, "day")) {
    return startDate.format("DD/MM/YYYY");
  }
  return `${startDate.format("DD/MM/YYYY")} – ${endDate.format("DD/MM/YYYY")}`;
}

export function CustomerPortalDashboardScreen({
  onOpenApplications,
  onOpenCertifications,
  onOpenCorrectiveActions,
  onOpenCertificates,
  onOpenNotifications,
  onOpenSchedule,
}: CustomerPortalDashboardScreenProps) {
  const query = useQuery({
    queryKey: ["customer-portal", "dashboard"],
    queryFn: async () => (
      await api.get<CustomerPortalDashboard>("/customer-portal/me/dashboard")
    ).data,
    staleTime: 20_000,
  });

  if (query.isLoading) {
    return <Card><Skeleton active paragraph={{ rows: 10 }} /></Card>;
  }

  if (query.isError || !query.data) {
    return (
      <Alert
        action={<Button onClick={() => void query.refetch()}>Thử lại</Button>}
        description={getErrorMessage(query.error)}
        message="Không tải được cổng khách hàng"
        showIcon
        type="error"
      />
    );
  }

  const data = query.data;
  const organizationLabel = data.customers.length === 1
    ? data.customers[0].company_name
    : `${data.customers.length} tổ chức được phân quyền`;

  return (
    <div className="projects-screen customer-portal-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">CỔNG KHÁCH HÀNG</span>
          <Title level={2}>Tổng quan chứng nhận</Title>
          <Text type="secondary">
            {organizationLabel}. Theo dõi đơn đăng ký, lịch đánh giá, NC/CAP, kết quả và chứng chỉ trong một nơi.
          </Text>
        </div>
      </div>

      <section className="project-summary-grid" aria-label="Tổng hợp cổng khách hàng">
        <Card onClick={onOpenApplications} className="clickable-summary-card">
          <Statistic prefix={<FileTextOutlined />} title="Đơn đăng ký" value={data.summary.applications} />
        </Card>
        <Card onClick={onOpenCertifications} className="clickable-summary-card">
          <Statistic prefix={<FolderOpenOutlined />} title="Hồ sơ đang hoạt động" value={data.summary.active_projects} />
        </Card>
        <Card onClick={onOpenCorrectiveActions} className="clickable-summary-card">
          <Statistic prefix={<AuditOutlined />} title="NC/CAP đang xử lý" value={data.summary.open_corrective_actions} />
        </Card>
        <Card onClick={onOpenCertificates} className="clickable-summary-card">
          <Statistic prefix={<SafetyCertificateOutlined />} title="Chứng chỉ hiệu lực" value={data.summary.active_certificates} />
        </Card>
        <Card onClick={onOpenNotifications} className="clickable-summary-card">
          <Statistic prefix={<BellOutlined />} title="Thông báo chưa đọc" value={data.summary.unread_notifications} />
        </Card>
      </section>

      <Card
        extra={<Button onClick={onOpenSchedule}>Xem toàn bộ lịch</Button>}
        title="Lịch đánh giá sắp tới"
      >
        {data.upcoming_audits.length ? (
          <List
            dataSource={data.upcoming_audits}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  description={(
                    <Space size={6} wrap>
                      <Tag>{item.audit_type ?? "Đánh giá"}</Tag>
                      <Text>{formatDateRange(item.planned_start_date, item.planned_end_date)}</Text>
                      {item.location ? <Text type="secondary">{item.location}</Text> : null}
                    </Space>
                  )}
                  title={(
                    <Space wrap>
                      <Text strong>{item.project_code}</Text>
                      <Text>{item.plan_code ?? "Kế hoạch đánh giá"}</Text>
                      {item.standard_name ? <Tag color="blue">{item.standard_name}</Tag> : null}
                    </Space>
                  )}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="Chưa có lịch đánh giá sắp tới được công bố" />
        )}
      </Card>
    </div>
  );
}
