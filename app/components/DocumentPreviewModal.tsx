"use client";

import { DownloadOutlined, FileSearchOutlined } from "@ant-design/icons";
import { Alert, Button, Modal, Spin, Tabs, Typography } from "antd";
import { useEffect, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { downloadDocumentFile, inferDocumentMimeType } from "../lib/document-file-client";
import { buildDocumentPreview, type BuiltPreview } from "../lib/ooxml-preview";

const { Text } = Typography;

export interface PreviewableFile {
  id: string;
  original_name: string;
  mime_type?: string | null;
}

interface Props {
  file: PreviewableFile | null;
  onClose: () => void;
}

export function DocumentPreviewModal({ file, onClose }: Props) {
  const [preview, setPreview] = useState<BuiltPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let nativeUrl: string | null = null;
    setPreview(null);
    setError(null);
    if (!file) return undefined;

    setLoading(true);
    void api.get<Blob>(`/document-files/${file.id}/download`, { responseType: "blob", timeout: 120_000 })
      .then(async (response) => {
        const mime = inferDocumentMimeType(file.original_name, String(response.headers["content-type"] ?? file.mime_type ?? ""));
        const blob = response.data instanceof Blob && response.data.type === mime
          ? response.data
          : new Blob([response.data], { type: mime });
        const built = await buildDocumentPreview(blob, file.original_name, mime);
        if (built.kind === "native") nativeUrl = built.url;
        if (active) setPreview(built);
      })
      .catch((reason) => { if (active) setError(getErrorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
      if (nativeUrl) URL.revokeObjectURL(nativeUrl);
    };
  }, [file]);

  const download = () => {
    if (!file) return;
    void downloadDocumentFile({
      url: `/document-files/${file.id}/download`,
      filename: file.original_name,
      mimeType: file.mime_type,
    });
  };

  return <Modal
    open={Boolean(file)}
    onCancel={onClose}
    title={<span><FileSearchOutlined /> Xem nhanh · {file?.original_name ?? ""}</span>}
    width="min(1180px, 94vw)"
    footer={[
      <Button key="download" icon={<DownloadOutlined />} onClick={download}>Tải file gốc</Button>,
      <Button key="close" type="primary" onClick={onClose}>Đóng</Button>,
    ]}
    destroyOnHidden
  >
    <div className="cmp-document-preview-shell">
      {loading ? <div className="cmp-document-preview-loading"><Spin size="large" /><Text type="secondary">Đang tạo bản xem nhanh...</Text></div> : null}
      {error ? <Alert type="error" showIcon message="Không thể xem tài liệu" description={error} /> : null}
      {!loading && !error && preview?.kind === "docx" ? <>
        <Alert type="info" showIcon message="Bản xem nhanh Word" description="Nội dung được đọc trực tiếp trong CMP. Bố cục Word phức tạp, chữ ký hoặc đối tượng nhúng có thể khác file gốc; dùng Tải file gốc khi cần kiểm tra định dạng chính xác." style={{ marginBottom: 12 }} />
        <div className="cmp-ooxml-preview" dangerouslySetInnerHTML={{ __html: preview.html }} />
      </> : null}
      {!loading && !error && preview?.kind === "xlsx" ? <>
        <Alert type="info" showIcon message="Bản xem nhanh Excel" description="Hiển thị tối đa 200 dòng và 40 cột mỗi sheet để tra cứu nhanh. Công thức/định dạng nâng cao vẫn nằm nguyên trong file gốc." style={{ marginBottom: 12 }} />
        <Tabs items={preview.sheets.map((sheet, index) => ({ key: String(index), label: sheet.name, children: <div className="cmp-ooxml-preview" dangerouslySetInnerHTML={{ __html: sheet.html }} /> }))} />
      </> : null}
      {!loading && !error && preview?.kind === "native" ? (
        preview.mimeType.startsWith("image/")
          ? <img className="cmp-native-image-preview" src={preview.url} alt={file?.original_name ?? "Tài liệu"} />
          : <iframe className="cmp-native-document-preview" src={preview.url} title={file?.original_name ?? "Tài liệu"} />
      ) : null}
      {!loading && !error && preview?.kind === "text" ? <pre className="cmp-text-document-preview">{preview.text}</pre> : null}
      {!loading && !error && preview?.kind === "unsupported" ? <Alert type="warning" showIcon message="Chưa hỗ trợ xem nhanh" description={preview.message} /> : null}
    </div>
  </Modal>;
}
