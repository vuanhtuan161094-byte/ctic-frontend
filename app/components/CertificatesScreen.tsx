"use client";

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FilePdfOutlined,
  HistoryOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  StopOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Pagination,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { buildPublicApiUrl } from "../lib/deployment-config";
import { previewDocumentFile } from "../lib/document-file-client";
import { ResponsiveCardList, type ResponsiveCardItem } from "./design-system";

const { Text, Title } = Typography;

interface CertificateDecision {
  id: string;
  decision_number?: string | null;
  decision_date?: string | null;
  decision_result?: string | null;
  organization_name?: string | null;
  organization_address?: string | null;
  management_system?: string | null;
  standard_name?: string | null;
  certification_scope?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  status?: string | null;
}

interface CertificateNotification {
  id: string;
  notification_number?: string | null;
  notification_date?: string | null;
  audit_type?: string | null;
  notification_result?: string | null;
  has_certification_changes?: boolean | null;
  status?: string | null;
  sent_at?: string | null;
}

interface CertificateReport {
  id: string;
  report_code?: string | null;
  audit_plan_id?: string | null;
  status?: string | null;
}

interface CertificateRecord {
  certificate_series?: { project_id?: string };
  id: string;
  fixture_only?: boolean;
  legal_effect?: boolean;
  public_verification_enabled?: boolean;
  preview_watermark?: string | null;
  verification_code?: string | null;
  technical_review_id: string;
  certificate_series_id?: string | null;
  cert_number: string;
  version_no?: number | null;
  organization_name?: string | null;
  organization_address?: string | null;
  management_system?: string | null;
  standard_name?: string | null;
  certification_scope?: string | null;
  issue_date: string;
  expire_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  technical_reviews?: {
    id: string;
    report_id?: string | null;
    status?: string | null;
    completed_at?: string | null;
    certification_decision?: CertificateDecision | null;
    audit_result_notification?: CertificateNotification | null;
    reports?: CertificateReport | null;
  } | null;
}

interface CertificateHistoryItem {
  id: string;
  from_status: string;
  to_status: string;
  reason: string;
  effective_date: string;
  created_at: string;
  changed_by_user?: {
    id: string;
    username?: string | null;
    full_name?: string | null;
  } | null;
  certification_decision?: {
    id: string;
    decision_number: string;
    decision_type: string;
    decision_result: string;
  } | null;
}

interface SuspensionReview {
  state: "not_suspended" | "missing_status_history" | "initial_period" | "review_due" | "maximum_window_exceeded";
  started_at: string | null;
  initial_review_due_at: string | null;
  maximum_extension_due_at: string | null;
  requires_independent_review: boolean;
}

interface CertificateHistoryResponse {
  suspension_review?: SuspensionReview;
  certificate: {
    id: string;
    cert_number: string;
    status: string;
  };
  history: CertificateHistoryItem[];
}

interface CertificateDocument {
  id: string;
  document_type: string;
  original_name: string;
  version_no: number;
  mime_type?: string | null;
  is_current?: boolean;
  created_at: string;
}

interface CertificateWorkspace {
  certificate: CertificateRecord;
  history: CertificateHistoryItem[];
  suspension_review?: SuspensionReview;
  documents: CertificateDocument[];
}

interface CertificatesScreenProps {
  onOpenPath?: (path: string) => void;
  initialCertificateId?: string | null;
  roles: string[];
}

const statusLabels: Record<string, string> = {
  active: "Đang hiệu lực",
  expired: "Hết hiệu lực",
  replaced: "Đã được thay thế",
  suspended: "Đình chỉ",
  withdrawn: "Đã thu hồi",
  completed: "Đã hoàn thành",
};

const statusColors: Record<string, string> = {
  active: "green",
  expired: "red",
  replaced: "default",
  suspended: "orange",
  withdrawn: "red",
};

function normalize(value?: string | null) {
  return (value ?? "unknown").trim().toLowerCase();
}

function statusLabel(value?: string | null) {
  const normalized = normalize(value);
  return statusLabels[normalized] ?? normalized.replaceAll("_", " ");
}

function CertificateStatusTag({ status }: { status?: string | null }) {
  const normalized = normalize(status);
  const icon = normalized === "active"
    ? <CheckCircleOutlined />
    : normalized === "suspended"
      ? <StopOutlined />
      : <WarningOutlined />;

  return <Tag color={statusColors[normalized] ?? "default"} icon={icon}>{statusLabel(status)}</Tag>;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY") : "—";
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const date = dayjs(value);
  return date.isValid() ? date.startOf("day").diff(dayjs().startOf("day"), "day") : null;
}

function certificateOrganization(certificate: CertificateRecord) {
  return certificate.organization_name
    ?? certificate.technical_reviews?.certification_decision?.organization_name
    ?? "Chưa cập nhật tổ chức";
}

function certificateStandard(certificate: CertificateRecord) {
  return certificate.standard_name
    ?? certificate.technical_reviews?.certification_decision?.standard_name
    ?? "Chưa cập nhật tiêu chuẩn";
}

function isFixtureCertificatePreview(certificate: CertificateRecord | null | undefined) {
  return Boolean(certificate && (certificate.fixture_only === true || certificate.legal_effect === false));
}

async function optionalRequest<T>(request: Promise<{ data: T }>, fallback: T): Promise<T> {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403 || status === 404) return fallback;
    throw error;
  }
}

export function CertificatesScreen({ initialCertificateId, onOpenPath }: CertificatesScreenProps) {
  const selectionContext = initialCertificateId ?? null;
  const [certificateSelection, setCertificateSelection] = useState<{
    context: string | null;
    certificateId: string | null;
  } | null>(null);
  const selectedCertificateId = certificateSelection?.context === selectionContext
    ? certificateSelection.certificateId
    : selectionContext;
  const setSelectedCertificateId = useCallback((certificateId: string | null) => {
    setCertificateSelection({ context: selectionContext, certificateId });
  }, [selectionContext]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [standardFilter, setStandardFilter] = useState("all");
  const [certificatePage, setCertificatePage] = useState(1);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const certificatesQuery = useQuery({
    queryKey: ["certificates", "workspace"],
    queryFn: async () => {
      const response = await api.get<CertificateRecord[]>("/certificates");
      return response.data;
    },
  });

  const workspaceQuery = useQuery<CertificateWorkspace>({
    queryKey: ["certificate", selectedCertificateId, "workspace"],
    enabled: Boolean(selectedCertificateId),
    queryFn: async () => {
      if (!selectedCertificateId) throw new Error("Chưa chọn chứng chỉ");

      const [certificateResponse, historyResponse, documents] = await Promise.all([
        api.get<CertificateRecord>(`/certificates/${selectedCertificateId}`),
        api.get<CertificateHistoryResponse>(`/certificates/${selectedCertificateId}/status-history`),
        optionalRequest(
          api.get<CertificateDocument[]>(`/document-files/entity/certificate/${selectedCertificateId}/current`),
          [],
        ),
      ]);

      return {
        certificate: certificateResponse.data,
        history: historyResponse.data.history,
        suspension_review: historyResponse.data.suspension_review,
        documents,
      };
    },
  });

  const selectedCertificate = workspaceQuery.data?.certificate;

  const certificates = useMemo(() => certificatesQuery.data ?? [], [certificatesQuery.data]);
  const standards = useMemo(
    () => Array.from(new Set(certificates.map(certificateStandard).filter((value) => !value.startsWith("Chưa ")))).sort(),
    [certificates],
  );
  const statuses = useMemo(
    () => Array.from(new Set(certificates.map((certificate) => normalize(certificate.status)))).sort(),
    [certificates],
  );
  const filteredCertificates = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase("vi");

    return certificates.filter((certificate) => {
      const matchesKeyword = !keyword || [
        certificate.cert_number,
        certificate.verification_code,
        certificateOrganization(certificate),
        certificateStandard(certificate),
      ].join(" ").toLocaleLowerCase("vi").includes(keyword);
      const matchesStatus = statusFilter === "all" || normalize(certificate.status) === statusFilter;
      const matchesStandard = standardFilter === "all" || certificateStandard(certificate) === standardFilter;
      return matchesKeyword && matchesStatus && matchesStandard;
    });
  }, [certificates, searchTerm, standardFilter, statusFilter]);
  const certificatePageSize = 10;
  const certificatePageCount = Math.max(1, Math.ceil(filteredCertificates.length / certificatePageSize));
  const currentCertificatePage = Math.min(certificatePage, certificatePageCount);
  const pageCertificates = filteredCertificates.slice(
    (currentCertificatePage - 1) * certificatePageSize,
    currentCertificatePage * certificatePageSize,
  );

  const activeCount = certificates.filter((certificate) => normalize(certificate.status) === "active").length;
  const expiringCount = certificates.filter((certificate) => {
    const remaining = daysUntil(certificate.expire_date);
    return normalize(certificate.status) === "active" && remaining !== null && remaining >= 0 && remaining <= 90;
  }).length;
  const inactiveCount = certificates.length - activeCount;

  const openDocument = async (documentFile: CertificateDocument) => {
    setOpeningDocumentId(documentFile.id);
    setDocumentError(null);

    try {
      await previewDocumentFile({
        url: `/document-files/${documentFile.id}/download`,
        filename: documentFile.original_name,
        mimeType: documentFile.mime_type,
        title: documentFile.original_name,
      });
    } catch (error) {
      setDocumentError(getErrorMessage(error));
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const columns = useMemo<TableColumnsType<CertificateRecord>>(() => [
    {
      title: "Số chứng chỉ",
      dataIndex: "cert_number",
      key: "cert_number",
      render: (value: string, record) => (
        <Space align="start" className="certificate-number-cell" orientation="vertical" size={0}>
          <Button className="certificate-code-button" onClick={() => record.certificate_series?.project_id && onOpenPath ? onOpenPath(`/certifications/${encodeURIComponent(record.certificate_series.project_id)}/certificates/${encodeURIComponent(record.id)}`) : setSelectedCertificateId(record.id)} type="link">
            {value}
          </Button>
          {isFixtureCertificatePreview(record) ? <Tag color="gold">FIXTURE_10Y · BẢN MÔ PHỎNG</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Tổ chức",
      key: "organization",
      render: (_, record) => (
        <div className="certificate-primary-cell">
          <strong>{certificateOrganization(record)}</strong>
          <span>{record.organization_address ?? record.technical_reviews?.certification_decision?.organization_address ?? "Chưa cập nhật địa chỉ"}</span>
        </div>
      ),
    },
    {
      title: "Phiên bản",
      dataIndex: "version_no",
      key: "version_no",
      width: 90,
      render: (value?: number | null) => value ?? 1,
    },
    {
      title: "Vai trò phiên bản",
      key: "version_role",
      width: 125,
      render: (_, record) => normalize(record.status) === "replaced"
        ? <Tag>Lịch sử</Tag>
        : <Tag color="blue">Hiện hành</Tag>,
    },
    {
      title: "Tiêu chuẩn",
      key: "standard",
      responsive: ["md"],
      render: (_, record) => certificateStandard(record),
    },
    {
      title: "Hiệu lực",
      key: "validity",
      responsive: ["lg"],
      render: (_, record) => (
        <div className="certificate-validity-cell">
          <span>{formatDate(record.issue_date)} – {formatDate(record.expire_date)}</span>
          {normalize(record.status) === "active" ? <small>{Math.max(daysUntil(record.expire_date) ?? 0, 0)} ngày còn lại</small> : null}
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 145,
      render: (value: string) => <CertificateStatusTag status={value} />,
    },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 95,
      render: (_, record) => <Button icon={<EyeOutlined />} onClick={() => setSelectedCertificateId(record.id)} size="small">Chi tiết</Button>,
    },
  ], [setSelectedCertificateId, onOpenPath]);

  const responsiveCertificateCards: ResponsiveCardItem[] = pageCertificates.map((record) => ({
    key: record.id,
    title: (
      <Space align="start" className="certificate-number-cell" orientation="vertical" size={0}>
        <Button
          className="certificate-code-button"
          onClick={() => record.certificate_series?.project_id && onOpenPath
            ? onOpenPath(`/certifications/${encodeURIComponent(record.certificate_series.project_id)}/certificates/${encodeURIComponent(record.id)}`)
            : setSelectedCertificateId(record.id)}
          type="link"
        >
          {record.cert_number}
        </Button>
        {isFixtureCertificatePreview(record) ? <Tag color="gold">FIXTURE_10Y · BẢN MÔ PHỎNG</Tag> : null}
      </Space>
    ),
    status: <CertificateStatusTag status={record.status} />,
    fields: [
      {
        key: "organization",
        label: "Tổ chức",
        value: (
          <div className="certificate-primary-cell">
            <strong>{certificateOrganization(record)}</strong>
            <span>{record.organization_address ?? record.technical_reviews?.certification_decision?.organization_address ?? "Chưa cập nhật địa chỉ"}</span>
          </div>
        ),
      },
      { key: "standard", label: "Tiêu chuẩn", value: certificateStandard(record) },
      {
        key: "version",
        label: "Phiên bản",
        value: (
          <Space size={6}>
            <span>v{record.version_no ?? 1}</span>
            {normalize(record.status) === "replaced" ? <Tag>Lịch sử</Tag> : <Tag color="blue">Hiện hành</Tag>}
          </Space>
        ),
      },
      {
        key: "validity",
        label: "Hiệu lực",
        value: (
          <div className="certificate-validity-cell">
            <span>{formatDate(record.issue_date)} – {formatDate(record.expire_date)}</span>
            {normalize(record.status) === "active" ? <small>{Math.max(daysUntil(record.expire_date) ?? 0, 0)} ngày còn lại</small> : null}
          </div>
        ),
      },
    ],
    actions: <Button icon={<EyeOutlined />} onClick={() => setSelectedCertificateId(record.id)} size="small">Chi tiết</Button>,
  }));

  const decision = selectedCertificate?.technical_reviews?.certification_decision;
  const notification = selectedCertificate?.technical_reviews?.audit_result_notification;
  const report = selectedCertificate?.technical_reviews?.reports;
  const selectedCertificateIsFixturePreview = isFixtureCertificatePreview(selectedCertificate);
  const suspensionReview = workspaceQuery.data?.suspension_review;
  const certificateDocuments = selectedCertificateIsFixturePreview ? [] : workspaceQuery.data?.documents ?? [];
  const certificatePdf = certificateDocuments.find((file) => file.document_type === "certificate_pdf")
    ?? certificateDocuments[0];
  const canUsePublicLinks = !selectedCertificateIsFixturePreview
    && selectedCertificate?.public_verification_enabled !== false
    && normalize(selectedCertificate?.status) === "active"
    && Boolean(selectedCertificate?.verification_code)
    && Boolean(certificatePdf);
  const publicPdfUrl = selectedCertificate?.verification_code
    ? buildPublicApiUrl(`/public/certificates/${selectedCertificate.verification_code}/pdf`)
    : null;
  const qrUrl = selectedCertificate?.verification_code
    ? buildPublicApiUrl(`/public/certificates/${selectedCertificate.verification_code}/qr`)
    : null;

  return (
    <div className="certificates-screen">
      <div className="certificates-heading">
        <div>
          <Title level={2}>Chứng chỉ</Title>
          <Text type="secondary">Theo dõi hiệu lực, hồ sơ phát hành, PDF chính thức và mã QR tra cứu.</Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={certificatesQuery.isFetching} onClick={() => void certificatesQuery.refetch()}>Làm mới</Button>
      </div>

      {certificates.some(isFixtureCertificatePreview) ? (
        <Alert
          className="certificate-fixture-warning"
          title="Đang hiển thị dữ liệu mô phỏng FIXTURE_10Y"
          description="Các bản xem trước này không phải chứng chỉ đã cấp, không có giá trị chứng nhận và không được xác minh công khai."
          showIcon
          type="warning"
        />
      ) : null}

      <section className="certificate-summary-grid" aria-label="Tổng hợp chứng chỉ">
        <Card><Statistic prefix={<SafetyCertificateOutlined />} title="Tổng chứng chỉ" value={certificates.length} /></Card>
        <Card><Statistic prefix={<CheckCircleOutlined />} title="Đang hiệu lực" value={activeCount} /></Card>
        <Card><Statistic prefix={<ClockCircleOutlined />} title="Sắp hết hạn trong 90 ngày" value={expiringCount} /></Card>
        <Card><Statistic prefix={<HistoryOutlined />} title="Không còn hiện hành" value={inactiveCount} /></Card>
      </section>

      <Card className="certificates-list-card">
        <div className="certificate-filter-bar">
          <Input allowClear onChange={(event) => { setSearchTerm(event.target.value); setCertificatePage(1); }} placeholder="Tìm số chứng chỉ, tổ chức, mã xác minh..." prefix={<SearchOutlined />} value={searchTerm} />
          <Select
            aria-label="Lọc trạng thái chứng chỉ"
            onChange={(value) => { setStatusFilter(value); setCertificatePage(1); }}
            options={[{ value: "all", label: "Tất cả trạng thái" }, ...statuses.map((status) => ({ value: status, label: statusLabel(status) }))]}
            value={statusFilter}
          />
          <Select
            aria-label="Lọc tiêu chuẩn chứng chỉ"
            onChange={(value) => { setStandardFilter(value); setCertificatePage(1); }}
            options={[{ value: "all", label: "Tất cả tiêu chuẩn" }, ...standards.map((standard) => ({ value: standard, label: standard }))]}
            value={standardFilter}
          />
        </div>

        {certificatesQuery.isLoading ? <Skeleton active paragraph={{ rows: 10 }} /> : null}
        {certificatesQuery.isError ? (
          <Alert
            action={<Button onClick={() => void certificatesQuery.refetch()} size="small">Thử lại</Button>}
            description={getErrorMessage(certificatesQuery.error)}
            message="Không tải được danh sách chứng chỉ"
            showIcon
            type="error"
          />
        ) : null}
        {certificatesQuery.isSuccess ? (
          <>
            <div className="cmp-data-table--responsive">
              <Table
                columns={columns}
                dataSource={filteredCertificates}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có chứng chỉ phù hợp" /> }}
                onChange={(pagination) => setCertificatePage(pagination.current ?? 1)}
                pagination={{ current: currentCertificatePage, pageSize: certificatePageSize, showSizeChanger: false, showTotal: (total) => `${total} chứng chỉ` }}
                rowKey="id"
                scroll={{ x: 980 }}
              />
            </div>
            <ResponsiveCardList
              empty={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có chứng chỉ phù hợp" />}
              items={responsiveCertificateCards}
            />
            {filteredCertificates.length > certificatePageSize ? (
              <div className="certificate-mobile-pagination">
                <Pagination
                  current={currentCertificatePage}
                  onChange={setCertificatePage}
                  pageSize={certificatePageSize}
                  showSizeChanger={false}
                  showTotal={(total, range) => `${range[0]}–${range[1]} / ${total}`}
                  total={filteredCertificates.length}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </Card>

      <Drawer
        className="certificate-detail-drawer"
        onClose={() => {
          setSelectedCertificateId(null);
          setDocumentError(null);
        }}
        open={Boolean(selectedCertificateId)}
        title={(
          <div className="certificate-drawer-title">
            <span>Chi tiết chứng chỉ</span>
            <strong>{selectedCertificate?.cert_number ?? "Đang tải dữ liệu..."}</strong>
          </div>
        )}
        width={780}
      >
        {workspaceQuery.isLoading ? <Skeleton active paragraph={{ rows: 16 }} /> : null}
        {workspaceQuery.isError ? (
          <Alert
            action={<Button onClick={() => void workspaceQuery.refetch()} size="small">Thử lại</Button>}
            description={getErrorMessage(workspaceQuery.error)}
            message="Không tải được chi tiết chứng chỉ"
            showIcon
            type="error"
          />
        ) : null}

        {selectedCertificate ? (
          <div className="certificate-workspace">
            <section className="certificate-identity-card">
              <div className="certificate-identity-heading">
                <div>
                  <Text type="secondary">Giấy chứng nhận hệ thống quản lý</Text>
                  <Title level={3}>{selectedCertificate.cert_number}</Title>
                </div>
                <div className="certificate-identity-controls">
                  <CertificateStatusTag status={selectedCertificate.status} />
                </div>
              </div>
              {selectedCertificateIsFixturePreview ? (
                <Alert
                  className="certificate-fixture-warning"
                  title={selectedCertificate.preview_watermark ?? "FIXTURE_10Y — BẢN MÔ PHỎNG, KHÔNG CÓ GIÁ TRỊ CHỨNG NHẬN"}
                  description="Không mở PDF chính thức hoặc đường dẫn tra cứu công khai từ dữ liệu mô phỏng."
                  showIcon
                  type="warning"
                />
              ) : null}
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Tổ chức" span={2}>{certificateOrganization(selectedCertificate)}</Descriptions.Item>
                <Descriptions.Item label="Tiêu chuẩn">{certificateStandard(selectedCertificate)}</Descriptions.Item>
                <Descriptions.Item label="Phiên bản">{selectedCertificate.version_no ?? 1}</Descriptions.Item>
                <Descriptions.Item label="Hệ thống">{selectedCertificate.management_system ?? decision?.management_system ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Ngày cấp">{formatDate(selectedCertificate.issue_date)}</Descriptions.Item>
                <Descriptions.Item label="Hết hạn">{formatDate(selectedCertificate.expire_date)}</Descriptions.Item>
                <Descriptions.Item label="Phạm vi" span={2}>{selectedCertificate.certification_scope ?? decision?.certification_scope ?? "Chưa cập nhật phạm vi"}</Descriptions.Item>
                <Descriptions.Item label="Mã xác minh" span={2}><Text copyable={Boolean(selectedCertificate.verification_code)}>{selectedCertificate.verification_code ?? "Chưa có"}</Text></Descriptions.Item>
              </Descriptions>
            </section>

            {normalize(selectedCertificate.status) === "suspended" ? (
              <Alert
                showIcon
                type={suspensionReview?.state === "maximum_window_exceeded" ? "error" : "warning"}
                title={suspensionReview?.state === "maximum_window_exceeded"
                  ? "Đã vượt khung theo dõi đình chỉ tối đa 6 tháng"
                  : suspensionReview?.requires_independent_review
                    ? "Đến hạn xem xét đình chỉ chứng nhận"
                    : "Chứng chỉ đang trong thời gian đình chỉ"}
                description={suspensionReview?.initial_review_due_at
                  ? `Mốc xem xét 3 tháng: ${formatDate(suspensionReview.initial_review_due_at)}. Mốc 6 tháng: ${formatDate(suspensionReview.maximum_extension_due_at)}. Việc gia hạn, khôi phục hoặc thu hồi phải do người có thẩm quyền quyết định và có hồ sơ, không được tự động thay đổi trạng thái.`
                  : "Chưa đủ lịch sử hiệu lực đình chỉ để xác định hạn xem xét. Vui lòng kiểm tra quyết định gốc và hồ sơ trước khi xử lý."}
              />
            ) : null}

            {documentError ? <Alert closable description={documentError} message="Không mở được tài liệu" onClose={() => setDocumentError(null)} showIcon type="error" /> : null}

            <section className="certificate-actions-card">
              <div>
                <strong>Tài liệu chính thức và tra cứu QR</strong>
                <span>PDF nội bộ được kiểm soát quyền; QR chỉ công khai với chứng chỉ đang hiệu lực.</span>
              </div>
              <Space wrap>
                {certificatePdf ? (
                  <Button icon={<FilePdfOutlined />} loading={openingDocumentId === certificatePdf.id} onClick={() => void openDocument(certificatePdf)}>Mở PDF</Button>
                ) : <Button disabled icon={<FilePdfOutlined />}>Chưa có PDF</Button>}
                {canUsePublicLinks && publicPdfUrl ? <Button href={publicPdfUrl} icon={<EyeOutlined />} target="_blank">Tra cứu công khai</Button> : null}
                {canUsePublicLinks && qrUrl ? <Button href={qrUrl} icon={<QrcodeOutlined />} target="_blank" type="primary">Tải QR</Button> : null}
              </Space>
            </section>

            <section className="certificate-detail-section">
              <div className="certificate-section-heading">
                <div><strong>Hồ sơ phát hành</strong><span>Liên kết quyết định, thông báo và báo cáo đánh giá</span></div>
              </div>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Quyết định">{decision?.decision_number ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Ngày quyết định">{formatDate(decision?.decision_date)}</Descriptions.Item>
                <Descriptions.Item label="Thông báo kết quả">{notification?.notification_number ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái gửi">{notification?.sent_at ? `Đã gửi ${formatDate(notification.sent_at)}` : "Chưa gửi"}</Descriptions.Item>
                <Descriptions.Item label="Báo cáo đánh giá">{report?.report_code ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Thẩm xét kỹ thuật">{statusLabel(selectedCertificate.technical_reviews?.status)}</Descriptions.Item>
              </Descriptions>
            </section>

            <section className="certificate-detail-section certificate-document-section">
              <div className="certificate-section-heading">
                <div><strong>Tệp chứng chỉ</strong><span>Các phiên bản hiện hành đang được lưu trong hệ thống</span></div>
                <Tag>{certificateDocuments.length} tệp</Tag>
              </div>
              <List
                dataSource={certificateDocuments}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tệp chứng chỉ" /> }}
                renderItem={(file) => (
                  <List.Item actions={[<Button key="open" loading={openingDocumentId === file.id} onClick={() => void openDocument(file)} size="small">Mở tệp</Button>]}>
                    <List.Item.Meta
                      avatar={<FilePdfOutlined className="certificate-file-icon" />}
                      description={`Phiên bản ${file.version_no} · ${formatDate(file.created_at)}`}
                      title={file.original_name}
                    />
                  </List.Item>
                )}
              />
            </section>

            <section className="certificate-detail-section">
              <div className="certificate-section-heading">
                <div><strong>Lịch sử trạng thái</strong><span>Các thay đổi được xác nhận bằng tài khoản người thực hiện</span></div>
              </div>
              {workspaceQuery.data?.history.length ? (
                <Timeline
                  items={workspaceQuery.data.history.map((item) => ({
                    color: normalize(item.to_status) === "active" ? "green" : "orange",
                    children: (
                      <div className="certificate-history-item">
                        <strong>{statusLabel(item.from_status)} → {statusLabel(item.to_status)}</strong>
                        <span>{item.certification_decision?.decision_number ? `Quyết định ${item.certification_decision.decision_number} · ` : ""}{item.reason}</span>
                        <small>{formatDate(item.effective_date)} · {item.changed_by_user?.full_name ?? item.changed_by_user?.username ?? "Hệ thống"} · {dayjs(item.created_at).format("DD/MM/YYYY HH:mm")}</small>
                      </div>
                    ),
                  }))}
                />
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thay đổi trạng thái" />}
            </section>
          </div>
        ) : null}
      </Drawer>

    </div>
  );
}
