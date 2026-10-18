"use client";

import { useQuery } from "@tanstack/react-query";
import { Button, Descriptions, Space, Typography } from "antd";

import { api, getErrorMessage } from "../lib/api";
import {
  DetailDrawer,
  DomainStatusBadge,
  EmptyState,
  EntityList,
  EntityRow,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
} from "./design-system";

interface CustomerCertificationCase {
  id: string;
  project_code: string;
  standard_name: string | null;
  status: string;
  certification_scope: string | null;
  application: {
    id: string;
    application_code: string;
  };
  customer: {
    id: string;
    customer_code: string;
    company_name: string;
  };
  created_at: string;
  updated_at: string;
}

interface CustomerCertificationsScreenProps {
  selectedCaseId?: string | null;
  onSelectCase?: (caseId: string | null) => void;
}

export function CustomerCertificationsScreen({
  selectedCaseId,
  onSelectCase,
}: CustomerCertificationsScreenProps) {
  const query = useQuery({
    queryKey: ["customer-portal", "certifications"],
    queryFn: async () => (
      await api.get<CustomerCertificationCase[]>("/customer-portal/me/certifications")
    ).data,
    staleTime: 20_000,
  });

  if (query.isLoading) {
    return <LoadingSkeleton variant="list" rows={8} />;
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        title="Không tải được hồ sơ chứng nhận"
        description={getErrorMessage(query.error)}
        retry={{ label: "Thử lại", onAction: () => void query.refetch() }}
      />
    );
  }

  const selected = query.data.find((item) => item.id === selectedCaseId) ?? null;

  return (
    <div className="cmp-page-stack customer-portal-screen">
      <PageHeader
        identity="Cổng khách hàng"
        title="Hồ sơ chứng nhận"
        description="Theo dõi các hồ sơ chứng nhận thuộc tổ chức mà tài khoản của bạn được phép truy cập."
      />

      <EntityList
        ariaLabel="Danh sách hồ sơ chứng nhận"
        items={query.data}
        itemKey={(item) => item.id}
        empty={(
          <EmptyState
            title="Chưa có hồ sơ chứng nhận"
            description="Hồ sơ sẽ xuất hiện sau khi đơn đăng ký được chấp thuận và tạo hồ sơ chứng nhận."
          />
        )}
        renderItem={(item) => (
          <EntityRow
            title={item.project_code}
            description={`${item.customer.company_name} · ${item.standard_name ?? "Chưa xác định tiêu chuẩn"}`}
            metadata={(
              <Space wrap size={8}>
                <Typography.Text type="secondary">Đơn {item.application.application_code}</Typography.Text>
                {item.certification_scope ? (
                  <Typography.Text type="secondary" ellipsis style={{ maxWidth: 560 }}>
                    {item.certification_scope}
                  </Typography.Text>
                ) : null}
              </Space>
            )}
            status={<DomainStatusBadge domain="case" code={item.status} />}
            onSelect={() => onSelectCase?.(item.id)}
          />
        )}
      />

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => onSelectCase?.(null)}
        title={selected ? `Hồ sơ ${selected.project_code}` : "Hồ sơ chứng nhận"}
        size="lg"
      >
        {selected ? (
          <div className="cmp-section-stack">
            <DomainStatusBadge domain="case" code={selected.status} />
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Khách hàng">{selected.customer.company_name}</Descriptions.Item>
              <Descriptions.Item label="Mã khách hàng">{selected.customer.customer_code}</Descriptions.Item>
              <Descriptions.Item label="Tiêu chuẩn">{selected.standard_name ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Phạm vi">{selected.certification_scope ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Đơn đăng ký">{selected.application.application_code}</Descriptions.Item>
            </Descriptions>
            <Typography.Text type="secondary">
              Tiến trình chi tiết theo chu kỳ sẽ được chuyển sang workspace Hồ sơ chứng nhận customer-safe ở bước workflow UX. Không hiển thị dữ liệu thẩm xét nội bộ, SoD hoặc audit log tại đây.
            </Typography.Text>
            <Button onClick={() => onSelectCase?.(null)}>Đóng</Button>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}
