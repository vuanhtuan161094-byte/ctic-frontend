"use client";

import { FilePdfOutlined, QrcodeOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Alert, Button, Card, Empty, Grid, Pagination, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { buildPublicApiUrl } from "../lib/deployment-config";

const { Text, Title } = Typography;

interface CustomerCertificate {
  id: string;
  verification_code: string;
  cert_number: string;
  version_no: number;
  issue_date: string | null;
  expire_date: string | null;
  status: string | null;
  organization_name: string;
  management_system: string | null;
  standard_name: string;
  certification_scope: string;
  series_code: string;
  project: { id: string; project_code: string };
  official_pdf_available: boolean;
  public_verification_path: string;
  public_pdf_path: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}

function statusColor(value?: string | null) {
  const status = (value ?? "").toLowerCase();
  if (status === "active") return "green";
  if (status === "suspended") return "orange";
  if (["withdrawn", "expired"].includes(status)) return "red";
  return "default";
}

function statusLabel(value?: string | null) {
  const key = (value ?? "").trim().toLowerCase();
  const labels: Record<string, string> = {
    active: "Đang hiệu lực",
    suspended: "Đình chỉ",
    withdrawn: "Đã thu hồi",
    expired: "Hết hiệu lực",
    replaced: "Đã được thay thế",
  };
  return labels[key] ?? (value || "—").replaceAll("_", " ");
}

export function CustomerCertificatesScreen() {
  const breakpoints = Grid.useBreakpoint();
  const useCompactPortalList = !breakpoints.lg;
  const [certificatePage, setCertificatePage] = useState(1);
  const query = useQuery({
    queryKey: ["customer-portal", "certificates"],
    queryFn: async () => (
      await api.get<CustomerCertificate[]>("/customer-portal/me/certificates")
    ).data,
  });

  const columns: TableColumnsType<CustomerCertificate> = [
    {
      title: "Chứng chỉ",
      key: "certificate",
      render: (_, item) => (
        <div className="table-primary-cell">
          <strong>{item.cert_number}</strong>
          <small>{item.series_code} · Version {item.version_no}</small>
        </div>
      ),
    },
    { title: "Tiêu chuẩn", dataIndex: "standard_name", key: "standard_name" },
    {
      title: "Hiệu lực",
      key: "dates",
      render: (_, item) => <Text>{formatDate(item.issue_date)} – {formatDate(item.expire_date)}</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (value: string | null) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
    },
    {
      title: "Tra cứu / PDF",
      key: "actions",
      align: "right",
      render: (_, item) => (
        <Space wrap>
          <Button
            icon={<QrcodeOutlined />}
            onClick={() => window.open(buildPublicApiUrl(item.public_verification_path), "_blank", "noopener,noreferrer")}
            size="small"
          >
            Tra cứu
          </Button>
          <Button
            disabled={!item.public_pdf_path}
            icon={<FilePdfOutlined />}
            onClick={() => item.public_pdf_path && window.open(buildPublicApiUrl(item.public_pdf_path), "_blank", "noopener,noreferrer")}
            size="small"
            type={item.official_pdf_available ? "primary" : "default"}
          >
            PDF chính thức
          </Button>
        </Space>
      ),
    },
  ];

  if (query.isError) return <Alert message="Không tải được chứng chỉ" description={getErrorMessage(query.error)} showIcon type="error" />;

  const certificates = query.data ?? [];
  const certificatePageCount = Math.max(1, Math.ceil(certificates.length / 10));
  const visibleCertificatePage = Math.min(certificatePage, certificatePageCount);
  const visibleCertificates = certificates.slice((visibleCertificatePage - 1) * 10, visibleCertificatePage * 10);

  return (
    <div className="projects-screen customer-portal-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">CỔNG KHÁCH HÀNG</span>
          <Title level={2}>Chứng chỉ</Title>
          <Text type="secondary">Tra cứu trạng thái và tải đúng PDF chính thức theo từng version chứng chỉ.</Text>
        </div>
      </div>
      <Card loading={query.isLoading} title={<span><SafetyCertificateOutlined /> Chứng chỉ của tổ chức</span>}>
        {certificates.length ? (
          useCompactPortalList ? (
            <>
              <div aria-label="Danh sách chứng chỉ" className="portal-mobile-list">
                {visibleCertificates.map((item) => (
                  <article className="portal-mobile-card" key={item.id}>
                    <div className="portal-mobile-card__heading">
                      <div className="portal-mobile-card__identity">
                        <strong>{item.cert_number}</strong>
                        <small>{item.series_code} · Version {item.version_no}</small>
                      </div>
                      <Tag color={statusColor(item.status)}>{statusLabel(item.status)}</Tag>
                    </div>
                    <div className="portal-mobile-card__meta">
                      <span><strong>Tiêu chuẩn:</strong> {item.standard_name}</span>
                      <span><strong>Phạm vi:</strong> {item.certification_scope}</span>
                      <span><strong>Hiệu lực:</strong> {formatDate(item.issue_date)} – {formatDate(item.expire_date)}</span>
                    </div>
                    <Space className="portal-mobile-card__actions" wrap>
                      <Button
                        icon={<QrcodeOutlined />}
                        onClick={() => window.open(buildPublicApiUrl(item.public_verification_path), "_blank", "noopener,noreferrer")}
                        size="small"
                      >
                        Tra cứu
                      </Button>
                      <Button
                        disabled={!item.public_pdf_path}
                        icon={<FilePdfOutlined />}
                        onClick={() => item.public_pdf_path && window.open(buildPublicApiUrl(item.public_pdf_path), "_blank", "noopener,noreferrer")}
                        size="small"
                        type={item.official_pdf_available ? "primary" : "default"}
                      >
                        PDF chính thức
                      </Button>
                    </Space>
                  </article>
                ))}
              </div>
              {certificates.length > 10 ? (
                <Pagination
                  className="compact-mobile-pagination"
                  current={visibleCertificatePage}
                  onChange={setCertificatePage}
                  pageSize={10}
                  responsive
                  showSizeChanger={false}
                  showTotal={(total) => `${total} chứng chỉ`}
                  total={certificates.length}
                />
              ) : null}
            </>
          ) : (
          <Table<CustomerCertificate>
            columns={columns}
            dataSource={certificates}
            loading={query.isLoading}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            rowKey="id"
            scroll={{ x: 900 }}
          />
          )
        ) : <Empty description="Chưa có chứng chỉ" />}
      </Card>
    </div>
  );
}
