"use client";

import { FileDoneOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Alert, Button, Card, Empty, Grid, Pagination, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Text, Title } = Typography;

interface CustomerResultNotification {
  id: string;
  notification_number: string;
  notification_date: string;
  audit_type: string;
  audit_start_date: string | null;
  audit_end_date: string | null;
  notification_result: string;
  has_certification_changes: boolean;
  organization_name: string;
  standard_name: string;
  certification_scope: string;
  next_audit_due_date: string | null;
  status: string;
  sent_at: string | null;
  plan: { id: string; plan_code: string | null };
  project: { id: string; project_code: string };
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}

function resultLabel(value?: string | null) {
  const key = (value ?? "").trim().toLowerCase();
  const labels: Record<string, string> = {
    certification_granted: "Cấp chứng nhận",
    certification_maintained: "Duy trì chứng nhận",
    certification_not_granted: "Không cấp chứng nhận",
    recertified: "Tái chứng nhận",
    amended: "Sửa đổi chứng chỉ",
    scope_extended: "Mở rộng phạm vi",
    scope_reduced: "Thu hẹp phạm vi",
    suspended: "Đình chỉ chứng chỉ",
    restored: "Khôi phục hiệu lực",
    withdrawn: "Thu hồi chứng chỉ",
  };
  return labels[key] ?? (value || "—").replaceAll("_", " ");
}

export function CustomerResultNotificationsScreen() {
  const breakpoints = Grid.useBreakpoint();
  const useCompactPortalList = !breakpoints.lg;
  const [resultPage, setResultPage] = useState(1);
  const query = useQuery({
    queryKey: ["customer-portal", "results"],
    queryFn: async () => (
      await api.get<CustomerResultNotification[]>("/customer-portal/me/results")
    ).data,
  });

  const columns: TableColumnsType<CustomerResultNotification> = [
    {
      title: "Thông báo",
      key: "notification",
      render: (_, item) => (
        <div className="table-primary-cell">
          <strong>{item.notification_number}</strong>
          <small>{formatDate(item.notification_date)} · {item.audit_type}</small>
        </div>
      ),
    },
    {
      title: "Hồ sơ",
      key: "project",
      render: (_, item) => (
        <div className="table-primary-cell">
          <strong>{item.project.project_code}</strong>
          <small>{item.plan.plan_code ?? "—"}</small>
        </div>
      ),
    },
    {
      title: "Tiêu chuẩn",
      dataIndex: "standard_name",
      key: "standard_name",
    },
    {
      title: "Kết quả",
      dataIndex: "notification_result",
      key: "notification_result",
      render: (value: string, item) => (
        <Tag color={item.has_certification_changes ? "orange" : "green"}>{resultLabel(value)}</Tag>
      ),
    },
    {
      title: "Kỳ tiếp theo",
      dataIndex: "next_audit_due_date",
      key: "next_audit_due_date",
      render: (value: string | null) => formatDate(value),
    },
  ];

  if (query.isError) return <Alert message="Không tải được thông báo kết quả" description={getErrorMessage(query.error)} showIcon type="error" />;

  const results = query.data ?? [];
  const resultPageCount = Math.max(1, Math.ceil(results.length / 10));
  const visibleResultPage = Math.min(resultPage, resultPageCount);
  const visibleResults = results.slice((visibleResultPage - 1) * 10, visibleResultPage * 10);

  return (
    <div className="projects-screen customer-portal-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">CỔNG KHÁCH HÀNG</span>
          <Title level={2}>Kết quả đánh giá</Title>
          <Text type="secondary">Các thông báo kết quả F.12 đã được gửi chính thức cho tổ chức của bạn.</Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button>
      </div>
      <Card loading={query.isLoading} title={<span><FileDoneOutlined /> Thông báo đã gửi</span>}>
        {results.length ? (
          useCompactPortalList ? (
            <>
              <div aria-label="Danh sách kết quả đánh giá" className="portal-mobile-list">
                {visibleResults.map((item) => (
                  <article className="portal-mobile-card" key={item.id}>
                    <div className="portal-mobile-card__heading">
                      <div className="portal-mobile-card__identity">
                        <strong>{item.notification_number}</strong>
                        <small>{formatDate(item.notification_date)} · {item.audit_type}</small>
                      </div>
                      <Tag color={item.has_certification_changes ? "orange" : "green"}>{resultLabel(item.notification_result)}</Tag>
                    </div>
                    <div className="portal-mobile-card__meta">
                      <span><strong>Hồ sơ:</strong> {item.project.project_code} · {item.plan.plan_code ?? "—"}</span>
                      <span><strong>Tiêu chuẩn:</strong> {item.standard_name}</span>
                      <span><strong>Phạm vi:</strong> {item.certification_scope}</span>
                      <span><strong>Ngày đánh giá:</strong> {formatDate(item.audit_start_date)} – {formatDate(item.audit_end_date)}</span>
                      <span><strong>Kỳ tiếp theo:</strong> {formatDate(item.next_audit_due_date)}</span>
                    </div>
                  </article>
                ))}
              </div>
              {results.length > 10 ? <Pagination className="compact-mobile-pagination" current={visibleResultPage} onChange={setResultPage} pageSize={10} responsive showSizeChanger={false} showTotal={(total) => `${total} thông báo`} total={results.length} /> : null}
            </>
          ) : (
          <Table<CustomerResultNotification>
            columns={columns}
            dataSource={results}
            loading={query.isLoading}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            rowKey="id"
            scroll={{ x: 860 }}
          />
          )
        ) : <Empty description="Chưa có thông báo kết quả được gửi" />}
      </Card>
    </div>
  );
}
