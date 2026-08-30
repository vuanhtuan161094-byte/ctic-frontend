"use client";

import {
  ClockCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  HistoryOutlined,
  LinkOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { downloadDocumentFile } from "../lib/document-file-client";
import { DocumentPreviewModal, type PreviewableFile } from "./DocumentPreviewModal";
import { ControlledDocumentPanel } from "./ControlledDocumentPanel";

const { Text, Title } = Typography;

interface DocumentContext {
  reference_code?: string | null;
  project_id?: string | null;
  project_code?: string | null;
  application_id?: string | null;
  application_code?: string | null;
  customer_id?: string | null;
  customer_code?: string | null;
  company_name?: string | null;
  standard_name?: string | null;
}

interface DocumentUploader {
  id: string;
  username: string;
  full_name?: string | null;
  email?: string | null;
}

interface DocumentRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  file_kind: string;
  original_name: string;
  stored_name: string;
  file_url: string;
  download_url: string;
  mime_type: string;
  file_size: number;
  version_no: number;
  is_current: boolean;
  note?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
  context?: DocumentContext | null;
  uploaded_by_user?: DocumentUploader | null;
}

interface DocumentsResponse {
  generated_at: string;
  summary: {
    total: number;
    current: number;
    archived: number;
    document_types: number;
    linked_projects: number;
  };
  items: DocumentRecord[];
}

interface DocumentsScreenProps {
  onOpenProject?: (projectId: string) => void;
}

const documentTypeLabels: Record<string, string> = {
  audit_checklist: "Bảng kiểm đánh giá",
  audit_log: "Xác nhận đánh giá và ngày công",
  audit_team_assignment: "Chỉ định đoàn đánh giá",
  business_license: "Giấy phép đăng ký kinh doanh",
  certificate_pdf: "Giấy chứng nhận chính thức",
  corrective_action_evidence: "Bằng chứng hành động khắc phục",
  opening_closing_attendance: "Danh sách họp khai mạc/kết thúc",
  technical_review_report: "Báo cáo thẩm xét kỹ thuật",
};

const entityTypeLabels: Record<string, string> = {
  application: "Đơn đăng ký",
  certification_application: "Đơn đăng ký",
  certification_applications: "Đơn đăng ký",
  audit_plan: "Kế hoạch đánh giá",
  audit_plans: "Kế hoạch đánh giá",
  certificate: "Chứng chỉ",
  certificates: "Chứng chỉ",
  project: "Hồ sơ chứng nhận",
  certification_project: "Hồ sơ chứng nhận",
  certification_projects: "Hồ sơ chứng nhận",
  report: "Báo cáo đánh giá",
  reports: "Báo cáo đánh giá",
  technical_review: "Thẩm xét kỹ thuật",
  technical_reviews: "Thẩm xét kỹ thuật",
};

const fileKindLabels: Record<string, string> = {
  attachment: "Tệp đính kèm",
  generated_docx: "Word hệ thống",
  generated_xlsx: "Excel hệ thống",
  generated_pdf: "PDF hệ thống",
  signed_pdf: "PDF đã xác nhận",
  signed_scan: "Bản quét đã xác nhận",
};

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function humanize(value?: string | null) {
  const normalized = normalize(value);
  if (!normalized) return "";
  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function documentTypeLabel(value?: string | null) {
  const normalized = normalize(value);
  return documentTypeLabels[normalized] ?? (humanize(value) || "Chưa phân loại");
}

function entityTypeLabel(value?: string | null) {
  const normalized = normalize(value);
  return entityTypeLabels[normalized] ?? (humanize(value) || "Đối tượng nghiệp vụ");
}

function fileKindLabel(value?: string | null) {
  const normalized = normalize(value);
  return fileKindLabels[normalized] ?? (humanize(value) || "Tệp hồ sơ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("HH:mm · DD/MM/YYYY") : "—";
}

function formatFileSize(value?: number | null) {
  const size = Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function uploaderName(record: DocumentRecord) {
  return record.uploaded_by_user?.full_name?.trim()
    || record.uploaded_by_user?.username
    || "Tài khoản hệ thống";
}

export function DocumentsScreen({ onOpenProject }: DocumentsScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [versionFilter, setVersionFilter] = useState("current");
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewableFile | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const documentsQuery = useQuery({
    queryKey: ["document-files", "catalog"],
    queryFn: async () => {
      const response = await api.get<DocumentsResponse>("/document-files");
      return response.data;
    },
  });

  const versionsQuery = useQuery({
    enabled: Boolean(selectedDocument),
    queryKey: [
      "document-files",
      "versions",
      selectedDocument?.entity_type,
      selectedDocument?.entity_id,
      selectedDocument?.document_type,
    ],
    queryFn: async () => {
      if (!selectedDocument) return [];
      const query = new URLSearchParams({ document_type: selectedDocument.document_type });
      const response = await api.get<DocumentRecord[]>(
        `/document-files/entity/${encodeURIComponent(selectedDocument.entity_type)}/${selectedDocument.entity_id}?${query.toString()}`,
      );
      return response.data;
    },
  });

  const documentTypes = useMemo(() => {
    const values = new Set(documentsQuery.data?.items.map((item) => item.document_type) ?? []);
    return Array.from(values).sort((left, right) => documentTypeLabel(left).localeCompare(documentTypeLabel(right), "vi"));
  }, [documentsQuery.data?.items]);

  const entityTypes = useMemo(() => {
    const values = new Set(documentsQuery.data?.items.map((item) => item.entity_type) ?? []);
    return Array.from(values).sort((left, right) => entityTypeLabel(left).localeCompare(entityTypeLabel(right), "vi"));
  }, [documentsQuery.data?.items]);

  const filteredDocuments = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase("vi");
    return (documentsQuery.data?.items ?? []).filter((item) => {
      if (documentTypeFilter !== "all" && item.document_type !== documentTypeFilter) return false;
      if (entityTypeFilter !== "all" && item.entity_type !== entityTypeFilter) return false;
      if (versionFilter === "current" && !item.is_current) return false;
      if (versionFilter === "archived" && item.is_current) return false;
      if (!keyword) return true;

      const searchable = [
        item.original_name,
        item.document_type,
        item.file_kind,
        item.note,
        item.context?.reference_code,
        item.context?.project_code,
        item.context?.application_code,
        item.context?.customer_code,
        item.context?.company_name,
        item.context?.standard_name,
        uploaderName(item),
      ].filter(Boolean).join(" ").toLocaleLowerCase("vi");

      return searchable.includes(keyword);
    });
  }, [documentTypeFilter, documentsQuery.data?.items, entityTypeFilter, searchTerm, versionFilter]);

  const openFile = async (record: DocumentRecord, download = false) => {
    if (!download) {
      setPreviewFile({ id: record.id, original_name: record.original_name, mime_type: record.mime_type });
      return;
    }
    const setter = setDownloadingId;
    setter(record.id);
    try {
      const request = {
        url: record.download_url,
        filename: record.original_name,
        mimeType: record.mime_type,
      };
      await downloadDocumentFile(request);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setter(null);
    }
  };

  const columns = useMemo<TableColumnsType<DocumentRecord>>(() => [
    {
      title: "Tài liệu",
      key: "document",
      width: 310,
      render: (_, record) => (
        <button className="document-name-button" onClick={() => setSelectedDocument(record)} type="button">
          <FileOutlined />
          <span><strong>{record.original_name}</strong><small>{documentTypeLabel(record.document_type)}</small></span>
        </button>
      ),
    },
    {
      title: "Liên kết nghiệp vụ",
      key: "context",
      width: 260,
      render: (_, record) => (
        <div className="document-context-cell">
          <strong>{record.context?.company_name ?? entityTypeLabel(record.entity_type)}</strong>
          <span>{record.context?.project_code ?? record.context?.reference_code ?? record.entity_id}</span>
          {record.context?.standard_name ? <small>{record.context.standard_name}</small> : null}
        </div>
      ),
    },
    {
      title: "Phiên bản",
      key: "version",
      width: 130,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text strong>Phiên bản {record.version_no}</Text>
          {record.is_current ? <Tag color="green">Hiện hành</Tag> : <Tag>Lịch sử</Tag>}
        </Space>
      ),
    },
    {
      title: "Tệp",
      key: "file",
      width: 160,
      render: (_, record) => <div className="document-file-meta"><span>{fileKindLabel(record.file_kind)}</span><small>{formatFileSize(record.file_size)}</small></div>,
    },
    {
      title: "Cập nhật",
      key: "updated",
      width: 210,
      render: (_, record) => <div className="document-uploader-cell"><strong>{uploaderName(record)}</strong><small>{formatDateTime(record.created_at)}</small></div>,
    },
    {
      title: "",
      key: "actions",
      fixed: "right",
      width: 115,
      render: (_, record) => <Button icon={<EyeOutlined />} onClick={() => setSelectedDocument(record)} size="small">Chi tiết</Button>,
    },
  ], []);

  const summary = documentsQuery.data?.summary;

  return (
    <div className="documents-screen">
      <div className="documents-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ CHỨNG NHẬN</span>
          <Title level={2}>Tài liệu & Mẫu biểu</Title>
          <Text type="secondary">Quản lý tài liệu, mẫu biểu và hồ sơ trong một luồng đơn giản; kho tệp nghiệp vụ khác được thu gọn bên dưới khi cần tra cứu.</Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={documentsQuery.isFetching} onClick={() => void documentsQuery.refetch()}>Làm mới</Button>
      </div>

      {documentsQuery.isLoading ? <Card><Skeleton active paragraph={{ rows: 10 }} /></Card> : null}
      {documentsQuery.isError ? <Alert action={<Button onClick={() => void documentsQuery.refetch()}>Thử lại</Button>} message="Không thể tải danh mục tài liệu" description={getErrorMessage(documentsQuery.error)} showIcon type="error" /> : null}

      {documentsQuery.data ? (
        <>
          <ControlledDocumentPanel />

          <Collapse
            className="documents-secondary-catalog"
            items={[{
              key: "other-files",
              label: `Kho tệp nghiệp vụ khác · ${summary?.current ?? 0} tệp hiện hành`,
              children: <Card className="documents-catalog-card" bordered={false}>
                <Alert message="Khu vực tra cứu phụ" description="Dùng khi cần tìm các tệp đính kèm phát sinh từ đơn đăng ký, kế hoạch, báo cáo, CAP... Không cần mở khu vực này để quản lý tài liệu và mẫu biểu ở trên." type="info" showIcon style={{ marginBottom: 16 }} />
                <div className="documents-filter-bar">
                  <Input allowClear onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm tên tệp, khách hàng, mã hồ sơ..." prefix={<SearchOutlined />} value={searchTerm} />
                  <Select aria-label="Loại tài liệu" onChange={setDocumentTypeFilter} options={[{ value: "all", label: "Tất cả loại tài liệu" }, ...documentTypes.map((value) => ({ value, label: documentTypeLabel(value) }))]} value={documentTypeFilter} />
                  <Select aria-label="Nguồn nghiệp vụ" onChange={setEntityTypeFilter} options={[{ value: "all", label: "Tất cả nguồn nghiệp vụ" }, ...entityTypes.map((value) => ({ value, label: entityTypeLabel(value) }))]} value={entityTypeFilter} />
                  <Select aria-label="Trạng thái phiên bản" onChange={setVersionFilter} options={[{ value: "current", label: "Tệp hiện hành" }, { value: "archived", label: "Phiên bản lịch sử" }, { value: "all", label: "Tất cả phiên bản" }]} value={versionFilter} />
                </div>
                <Table columns={columns} dataSource={filteredDocuments} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có tài liệu phù hợp bộ lọc" /> }} pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} tài liệu` }} rowKey="id" scroll={{ x: 1_180 }} />
              </Card>,
            }]}
          />

          <div className="documents-update-note">Dữ liệu cập nhật {formatDateTime(documentsQuery.data.generated_at)}</div>
        </>
      ) : null}

      <Drawer className="document-detail-drawer" onClose={() => setSelectedDocument(null)} open={Boolean(selectedDocument)} placement="right" title={selectedDocument ? <div><Text type="secondary">Chi tiết tài liệu</Text><div className="drawer-title-code">{selectedDocument.original_name}</div></div> : null} width={780}>
        {selectedDocument ? (
          <div className="document-detail-content">
            <Card className="document-identity-card">
              <div className="document-identity-heading">
                <div><Text type="secondary">{documentTypeLabel(selectedDocument.document_type)}</Text><Title level={3}>{selectedDocument.original_name}</Title></div>
                {selectedDocument.is_current ? <Tag color="green">Phiên bản hiện hành</Tag> : <Tag>Phiên bản lịch sử</Tag>}
              </div>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Nguồn">{entityTypeLabel(selectedDocument.entity_type)}</Descriptions.Item>
                <Descriptions.Item label="Mã tham chiếu">{selectedDocument.context?.reference_code ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Khách hàng">{selectedDocument.context?.company_name ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Hồ sơ">{selectedDocument.context?.project_code ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Tiêu chuẩn">{selectedDocument.context?.standard_name ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Dung lượng">{formatFileSize(selectedDocument.file_size)}</Descriptions.Item>
                <Descriptions.Item label="Loại tệp">{fileKindLabel(selectedDocument.file_kind)}</Descriptions.Item>
                <Descriptions.Item label="Người cập nhật">{uploaderName(selectedDocument)}</Descriptions.Item>
                <Descriptions.Item label="Thời điểm">{formatDateTime(selectedDocument.created_at)}</Descriptions.Item>
                <Descriptions.Item label="Ghi chú" span={2}>{selectedDocument.note?.trim() || "Không có ghi chú"}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card className="document-workspace-card" title="Thao tác tài liệu">
              <Space wrap>
                <Button icon={<EyeOutlined />} onClick={() => void openFile(selectedDocument)}>Xem</Button>
                <Button icon={<DownloadOutlined />} loading={downloadingId === selectedDocument.id} onClick={() => void openFile(selectedDocument, true)}>Tải xuống</Button>
                {selectedDocument.context?.project_id && onOpenProject ? <Button icon={<LinkOutlined />} onClick={() => onOpenProject(selectedDocument.context!.project_id!)}>Mở hồ sơ chứng nhận</Button> : null}
              </Space>
            </Card>

            <Card className="document-version-card" title={<Space><HistoryOutlined />Lịch sử phiên bản</Space>}>
              {versionsQuery.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : null}
              {versionsQuery.isError ? <Alert description={getErrorMessage(versionsQuery.error)} message="Không thể tải lịch sử phiên bản" showIcon type="error" /> : null}
              {versionsQuery.data ? <List dataSource={versionsQuery.data} locale={{ emptyText: "Chưa có lịch sử phiên bản" }} renderItem={(item) => <List.Item actions={[<Button icon={<EyeOutlined />} key="open" onClick={() => void openFile(item)} size="small">Xem</Button>]}><List.Item.Meta avatar={<div className={item.is_current ? "version-icon current" : "version-icon"}><ClockCircleOutlined /></div>} description={`${uploaderName(item)} · ${formatDateTime(item.created_at)} · ${formatFileSize(item.file_size)}`} title={<Space wrap><Text strong>Phiên bản {item.version_no}</Text>{item.is_current ? <Tag color="green">Hiện hành</Tag> : <Tag>Lịch sử</Tag>}</Space>} /></List.Item>} /> : null}
            </Card>
          </div>
        ) : null}
      </Drawer>
      <DocumentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
