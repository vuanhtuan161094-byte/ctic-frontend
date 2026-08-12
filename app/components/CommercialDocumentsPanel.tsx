"use client";

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  FileDoneOutlined,
  FileOutlined,
  HistoryOutlined,
  PaperClipOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Modal,
  Radio,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { openDocumentFile } from "../lib/document-file-client";

const { Text } = Typography;
const { TextArea } = Input;

type CommercialEntityType = "contract" | "certification_agreement";
type CommercialFileKind = "signed_scan" | "attachment";

interface CommercialEntity {
  id: string;
  referenceNumber: string;
  signDate?: string | null;
}

interface DocumentFileVersion {
  id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  file_kind: string;
  original_name: string;
  mime_type?: string | null;
  file_size?: number | null;
  version_no: number;
  is_current: boolean;
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  download_url?: string | null;
}

interface UploadTarget {
  entityType: CommercialEntityType;
  entityId: string;
  documentType: "signed_contract" | "signed_certification_agreement";
  title: string;
  defaultKind: CommercialFileKind;
}

interface CommercialDocumentsPanelProps {
  projectId: string;
  contract?: CommercialEntity | null;
  agreement?: CommercialEntity | null;
  canManage: boolean;
}

const fileKindLabels: Record<string, string> = {
  signed_scan: "Bản đã ký",
  attachment: "Bản dự thảo / phụ lục",
  generated_docx: "Bản Word",
  generated_pdf: "Bản PDF",
};

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : value;
}

function formatFileSize(value?: number | null) {
  if (!value || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function newestCurrent(files: DocumentFileVersion[], preferredKind?: CommercialFileKind) {
  const currentFiles = files
    .filter((file) => file.is_current)
    .sort((a, b) => (b.version_no ?? 0) - (a.version_no ?? 0));

  if (preferredKind) {
    return currentFiles.find((file) => normalize(file.file_kind) === preferredKind) ?? null;
  }

  return currentFiles[0] ?? null;
}

export default function CommercialDocumentsPanel({
  projectId,
  contract,
  agreement,
  canManage,
}: CommercialDocumentsPanelProps) {
  const queryClient = useQueryClient();
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [uploadKind, setUploadKind] = useState<CommercialFileKind>("signed_scan");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [historyEntity, setHistoryEntity] = useState<CommercialEntityType | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const contractFilesQuery = useQuery({
    queryKey: ["commercial-documents", "contract", contract?.id],
    queryFn: async () => {
      const response = await api.get<DocumentFileVersion[]>(
        `/document-files/entity/contract/${contract?.id}`,
      );
      return response.data;
    },
    enabled: Boolean(contract?.id),
    staleTime: 60_000,
  });

  const agreementFilesQuery = useQuery({
    queryKey: ["commercial-documents", "certification_agreement", agreement?.id],
    queryFn: async () => {
      const response = await api.get<DocumentFileVersion[]>(
        `/document-files/entity/certification_agreement/${agreement?.id}`,
      );
      return response.data;
    },
    enabled: Boolean(agreement?.id),
    staleTime: 60_000,
  });

  const contractFiles = contractFilesQuery.data ?? [];
  const agreementFiles = agreementFilesQuery.data ?? [];

  const contractSigned = useMemo(
    () => newestCurrent(contractFiles, "signed_scan"),
    [contractFiles],
  );
  const agreementSigned = useMemo(
    () => newestCurrent(agreementFiles, "signed_scan"),
    [agreementFiles],
  );

  const resetUpload = () => {
    setUploadTarget(null);
    setUploadKind("signed_scan");
    setUploadFile(null);
    setUploadNote("");
    setUploading(false);
  };

  const startUpload = (
    entityType: CommercialEntityType,
    entityId: string,
    title: string,
    defaultKind: CommercialFileKind,
  ) => {
    setActionError(null);
    setUploadTarget({
      entityType,
      entityId,
      documentType:
        entityType === "contract"
          ? "signed_contract"
          : "signed_certification_agreement",
      title,
      defaultKind,
    });
    setUploadKind(defaultKind);
    setUploadFile(null);
    setUploadNote("");
  };

  const submitUpload = async () => {
    if (!uploadTarget || !uploadFile) return;

    if (uploadFile.size > 20 * 1024 * 1024) {
      setActionError("Tệp không được vượt quá 20 MB.");
      return;
    }

    try {
      setUploading(true);
      setActionError(null);

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("entity_type", uploadTarget.entityType);
      formData.append("entity_id", uploadTarget.entityId);
      formData.append("document_type", uploadTarget.documentType);
      formData.append("file_kind", uploadKind);
      if (uploadNote.trim()) formData.append("note", uploadNote.trim());

      await api.post("/document-files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["commercial-documents", uploadTarget.entityType, uploadTarget.entityId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["certification-project", projectId, "workspace"],
        }),
      ]);

      message.success(
        uploadKind === "signed_scan"
          ? `Đã cập nhật bản ký của ${uploadTarget.title}.`
          : `Đã bổ sung tệp cho ${uploadTarget.title}.`,
      );
      resetUpload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const openFile = async (file: DocumentFileVersion) => {
    try {
      setOpeningFileId(file.id);
      setActionError(null);
      await openDocumentFile({
        url: file.download_url || `/document-files/${file.id}/download`,
        filename: file.original_name,
        mimeType: file.mime_type,
        title: file.original_name,
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setOpeningFileId(null);
    }
  };

  const historyFiles = historyEntity === "contract" ? contractFiles : agreementFiles;
  const historyTitle = historyEntity === "contract" ? "Lịch sử tệp hợp đồng" : "Lịch sử tệp thỏa thuận";

  const historyColumns: TableColumnsType<DocumentFileVersion> = [
    {
      title: "Phiên bản",
      dataIndex: "version_no",
      width: 90,
      render: (value: number, record) => (
        <Space size={6}>
          <Text strong>v{value}</Text>
          {record.is_current ? <Tag color="green">Hiện hành</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Loại",
      dataIndex: "file_kind",
      width: 155,
      render: (value: string) => fileKindLabels[normalize(value)] ?? value,
    },
    {
      title: "Tên tệp",
      dataIndex: "original_name",
      ellipsis: true,
    },
    {
      title: "Dung lượng",
      dataIndex: "file_size",
      width: 105,
      render: (value?: number | null) => formatFileSize(value),
    },
    {
      title: "Ngày tải",
      dataIndex: "created_at",
      width: 160,
      render: (value?: string | null) => formatDate(value),
    },
    {
      title: "",
      key: "action",
      width: 105,
      render: (_, record) => (
        <Button
          icon={<DownloadOutlined />}
          loading={openingFileId === record.id}
          onClick={() => void openFile(record)}
          size="small"
        >
          Mở
        </Button>
      ),
    },
  ];

  const renderEntityCard = (
    type: CommercialEntityType,
    entity: CommercialEntity | null | undefined,
    files: DocumentFileVersion[],
    signedFile: DocumentFileVersion | null,
    loading: boolean,
  ) => {
    const isContract = type === "contract";
    const title = isContract ? "Hợp đồng" : "Thỏa thuận chứng nhận";
    const currentAttachment = newestCurrent(files, "attachment");

    if (!entity) {
      return (
        <Card size="small" title={title}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`Hồ sơ chưa liên kết ${title.toLowerCase()}`}
          />
        </Card>
      );
    }

    return (
      <Card
        extra={
          signedFile ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>Đã có bản ký</Tag>
          ) : (
            <Tag color="orange" icon={<WarningOutlined />}>Chưa có bản ký</Tag>
          )
        }
        loading={loading}
        size="small"
        title={
          <Space>
            {signedFile ? <FileDoneOutlined /> : <FileOutlined />}
            {title}
          </Space>
        }
      >
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Số văn bản">
            <Text strong>{entity.referenceNumber || "Chưa cập nhật"}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày ký">
            {entity.signDate ? dayjs(entity.signDate).format("DD/MM/YYYY") : "Chưa cập nhật"}
          </Descriptions.Item>
          <Descriptions.Item label="Bản ký hiện hành">
            {signedFile ? `v${signedFile.version_no} · ${signedFile.original_name}` : "Chưa tải lên"}
          </Descriptions.Item>
          <Descriptions.Item label="Tệp bổ sung hiện hành">
            {currentAttachment ? `v${currentAttachment.version_no} · ${currentAttachment.original_name}` : "Chưa có"}
          </Descriptions.Item>
        </Descriptions>

        <Space wrap>
          {signedFile ? (
            <Button
              icon={<DownloadOutlined />}
              loading={openingFileId === signedFile.id}
              onClick={() => void openFile(signedFile)}
            >
              Mở bản ký
            </Button>
          ) : null}

          {currentAttachment ? (
            <Button
              icon={<PaperClipOutlined />}
              loading={openingFileId === currentAttachment.id}
              onClick={() => void openFile(currentAttachment)}
            >
              Mở tệp bổ sung
            </Button>
          ) : null}

          {canManage ? (
            <>
              <Button
                icon={<UploadOutlined />}
                onClick={() => startUpload(type, entity.id, title.toLowerCase(), "signed_scan")}
                type={signedFile ? "default" : "primary"}
              >
                {signedFile ? "Cập nhật bản ký" : "Tải bản ký"}
              </Button>
              <Button
                icon={<PaperClipOutlined />}
                onClick={() => startUpload(type, entity.id, title.toLowerCase(), "attachment")}
              >
                Thêm dự thảo/phụ lục
              </Button>
            </>
          ) : null}

          {files.length ? (
            <Button icon={<HistoryOutlined />} onClick={() => setHistoryEntity(type)}>
              Lịch sử ({files.length})
            </Button>
          ) : null}
        </Space>
      </Card>
    );
  };

  return (
    <Card
      className="project-detail-card"
      title="Hợp đồng và thỏa thuận chứng nhận"
      extra={
        <Space>
          <Tag color={contractSigned ? "green" : "orange"}>
            Hợp đồng: {contractSigned ? "đã ký" : "chưa có bản ký"}
          </Tag>
          <Tag color={agreementSigned ? "green" : "orange"}>
            Thỏa thuận: {agreementSigned ? "đã ký" : "chưa có bản ký"}
          </Tag>
        </Space>
      }
    >
      {actionError ? (
        <Alert
          closable
          description={actionError}
          message="Không thể thực hiện thao tác tài liệu"
          onClose={() => setActionError(null)}
          showIcon
          type="error"
        />
      ) : null}

      <Alert
        description="Bản tải lên mới sẽ tự tăng số phiên bản. Bản cũ không bị xóa và vẫn có thể mở trong lịch sử."
        icon={<ClockCircleOutlined />}
        showIcon
        type="info"
      />

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          marginTop: 16,
        }}
      >
        {renderEntityCard(
          "contract",
          contract,
          contractFiles,
          contractSigned,
          contractFilesQuery.isLoading,
        )}
        {renderEntityCard(
          "certification_agreement",
          agreement,
          agreementFiles,
          agreementSigned,
          agreementFilesQuery.isLoading,
        )}
      </div>

      <Modal
        cancelText="Hủy"
        destroyOnHidden
        okButtonProps={{ disabled: !uploadFile, loading: uploading }}
        okText="Tải lên và tạo phiên bản"
        onCancel={resetUpload}
        onOk={() => void submitUpload()}
        open={Boolean(uploadTarget)}
        title={`Cập nhật ${uploadTarget?.title ?? "tài liệu"}`}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Radio.Group
            onChange={(event) => setUploadKind(event.target.value as CommercialFileKind)}
            value={uploadKind}
          >
            <Radio.Button value="signed_scan">Bản đã ký</Radio.Button>
            <Radio.Button value="attachment">Bản dự thảo / phụ lục</Radio.Button>
          </Radio.Group>

          <label
            style={{
              alignItems: "center",
              border: "1px dashed #91caff",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              gap: 10,
              justifyContent: "center",
              minHeight: 84,
              padding: 16,
            }}
          >
            <UploadOutlined />
            <span>{uploadFile ? uploadFile.name : "Chọn PDF, Word, JPG hoặc PNG"}</span>
            <input
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              hidden
              onChange={(event) => {
                setUploadFile(event.target.files?.[0] ?? null);
                setActionError(null);
              }}
              type="file"
            />
          </label>

          <TextArea
            maxLength={500}
            onChange={(event) => setUploadNote(event.target.value)}
            placeholder="Ghi chú phiên bản, số phụ lục hoặc nội dung thay đổi"
            rows={3}
            showCount
            value={uploadNote}
          />

          <Alert
            description="Tệp tối đa 20 MB. Khi tải cùng loại tài liệu, hệ thống tự chuyển bản mới thành phiên bản hiện hành và lưu bản cũ trong lịch sử."
            showIcon
            type="warning"
          />
        </Space>
      </Modal>

      <Modal
        cancelText="Đóng"
        destroyOnHidden
        footer={null}
        onCancel={() => setHistoryEntity(null)}
        open={Boolean(historyEntity)}
        title={historyTitle}
        width={920}
      >
        <Table
          columns={historyColumns}
          dataSource={historyFiles}
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có phiên bản tài liệu" />,
          }}
          pagination={false}
          rowKey="id"
          scroll={{ x: 760 }}
          size="small"
        />
      </Modal>
    </Card>
  );
}
