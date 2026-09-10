import { useState } from "react";
import { Alert, Button, Descriptions, Drawer, List, Space, Tag, Typography } from "antd";
import type { CertificateDocument, CertificateIssuanceWorkspace } from "../CertificateIssuanceWorkspaceModal";
import { Breadcrumb, PageHeader, ReadOnlyState, SectionHeader } from "../design-system";
import { buildPublicApiUrl } from "../../lib/deployment-config";
import "./certificate-workspace.css";

export interface CertificatePageData extends CertificateIssuanceWorkspace {
  case_id: string; certificate_id: string; is_historical: boolean; can_upload_pdf: boolean; versions_truncated: boolean;
  public_verification: { available: boolean; is_valid: boolean; path: string; pdf_path: string | null; qr_path: string | null };
}
const labels: Record<string, string> = { active: "Đang hiệu lực", suspended: "Đình chỉ", withdrawn: "Đã thu hồi", expired: "Hết hiệu lực", replaced: "Đã được thay thế" };
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";
const sites = (value?: string | null): Array<{ site_name?: string; address?: string }> => { try { return JSON.parse(value || "[]"); } catch { return []; } };
export function CertificateResourcePage({ data, onOpenPath, onOpenDocument, canUpload, uploadFile, uploading, uploadError, onSelectFile, onUpload }: {
  data: CertificatePageData; onOpenPath: (path: string) => void; onOpenDocument: (file: CertificateDocument) => Promise<void>;
  canUpload: boolean; uploadFile: File | null; uploading: boolean; uploadError: string | null; onSelectFile: (file: File | null) => void; onUpload: () => void;
}) {
  const [drawer, setDrawer] = useState<"documents" | "history" | null>(null);
  const cert = data.certificate!;
  const official = data.documents.find(file => file.is_current && file.document_type === "certificate_pdf" && file.mime_type === "application/pdf");
  const path = (id: string) => `/certifications/${encodeURIComponent(data.case_id)}/certificates/${encodeURIComponent(id)}`;
  return <main className="cmp-certificate-page">
    <Breadcrumb items={[{ key: "case", label: "Hồ sơ chứng nhận", onNavigate: () => onOpenPath(`/certifications/${encodeURIComponent(data.case_id)}`) }, { key: "certificate", label: "Chứng chỉ" }]} />
    <PageHeader title={cert.cert_number} identity={`Phiên bản ${cert.version_no} · ${data.current_series?.series_code ?? ""}`} description={cert.organization_name} />
    <Space wrap><Tag color={cert.status === "active" ? "green" : "default"}>{labels[cert.status ?? ""] ?? cert.status ?? "Chưa có trạng thái"}</Tag><Tag>{data.is_historical ? "Phiên bản lịch sử · chỉ đọc" : "Phiên bản hiện hành"}</Tag></Space>
    {data.is_historical ? <Alert showIcon type="info" message="Snapshot lịch sử bất biến" description="Thông tin và PDF bên dưới thuộc đúng phiên bản đang mở; không được dùng để sửa phiên bản hiện hành." action={<Button onClick={() => onOpenPath(path(data.current_certificate!.id))}>Mở bản hiện hành</Button>} /> : !canUpload ? <ReadOnlyState reason="Tài khoản có quyền xem; không có quyền cập nhật PDF của phiên bản này." /> : null}
    <section className="cmp-certificate-section"><SectionHeader title="Nội dung chứng nhận" />
      <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
        <Descriptions.Item label="Tổ chức" span={2}>{cert.organization_name}</Descriptions.Item>
        <Descriptions.Item label="Địa chỉ" span={2}>{cert.organization_address || "—"}</Descriptions.Item>
        <Descriptions.Item label="Tiêu chuẩn">{cert.standard_name}</Descriptions.Item><Descriptions.Item label="Hệ thống quản lý">{cert.management_system || "—"}</Descriptions.Item>
        <Descriptions.Item label="Phạm vi" span={2}>{cert.certification_scope}</Descriptions.Item>
        <Descriptions.Item label="Ngày cấp">{date(cert.issue_date)}</Descriptions.Item><Descriptions.Item label="Hết hiệu lực">{date(cert.expire_date)}</Descriptions.Item>
        <Descriptions.Item label="Căn cứ thay đổi" span={2}>{cert.change_reason || "—"}</Descriptions.Item>
      </Descriptions>
      {sites(cert.site_snapshot_json).length ? <List header="Địa điểm theo snapshot" dataSource={sites(cert.site_snapshot_json)} renderItem={site => <List.Item>{site.site_name} · {site.address}</List.Item>} /> : null}
    </section>
    <section className="cmp-certificate-section"><SectionHeader title="PDF chính thức & xác minh" description="Tài liệu được quản lý theo đúng certificate/version; không sinh thêm PDF hoặc mã QR ở frontend." />
      <Typography.Paragraph>{official ? `PDF hiện hành của phiên bản này: ${official.original_name}` : "Chưa có PDF chính thức của phiên bản này."}</Typography.Paragraph>
      <Space wrap>
        {official ? <Button type="primary" onClick={() => void onOpenDocument(official)}>Xem PDF chính thức</Button> : null}
        <Button type={!official && canUpload ? "primary" : "default"} onClick={() => setDrawer("documents")}>Tài liệu & tải PDF</Button>
        <Button href={buildPublicApiUrl(data.public_verification.path)} target="_blank" rel="noopener noreferrer">Tra cứu trạng thái công khai</Button>
        {data.public_verification.qr_path ? <Button href={buildPublicApiUrl(data.public_verification.qr_path)} target="_blank" rel="noopener noreferrer">Tải QR xác minh</Button> : null}
      </Space>
      <Typography.Paragraph type="secondary">{data.public_verification.is_valid ? "Nguồn xác minh công khai xác nhận chứng chỉ đang hợp lệ." : "Nguồn xác minh công khai không xác nhận hiệu lực của phiên bản này."} {data.public_verification.pdf_path ? "PDF công khai khả dụng." : "PDF công khai chưa khả dụng; tra cứu trạng thái vẫn độc lập với tải PDF."}</Typography.Paragraph>
    </section>
    <section className="cmp-certificate-section"><SectionHeader title="Nguồn quyết định" />
      <Typography.Paragraph>{data.decision?.decision_number || "Chưa có nguồn quyết định"} · {data.decision?.decision_type || "—"} · {date(data.decision?.decision_date)}</Typography.Paragraph>
      <Typography.Paragraph type="secondary">Cấp mới hoặc thay đổi vòng đời phải đi qua cuộc đánh giá và quyết định có thẩm quyền; không sửa trực tiếp trạng thái chứng chỉ tại đây.</Typography.Paragraph>
      <Space wrap><Button onClick={() => onOpenPath(`/certifications/${encodeURIComponent(data.case_id)}/decision?audit_plan_id=${encodeURIComponent(data.plan.id)}&technical_review_id=${encodeURIComponent(cert.technical_review_id)}`)}>Xem quyết định nguồn</Button><Button onClick={() => onOpenPath(`/certifications/${encodeURIComponent(data.case_id)}/progress`)}>Tiến trình & cuộc đánh giá</Button><Button onClick={() => setDrawer("history")}>Lịch sử trạng thái</Button></Space>
    </section>
    <section className="cmp-certificate-section"><SectionHeader title="Các phiên bản trong cùng series" />
      <List dataSource={data.version_timeline} renderItem={version => <List.Item><div><strong>{version.cert_number} · Phiên bản {version.version_no}</strong><p>{version.is_current ? "Hiện hành" : "Lịch sử"} · {labels[version.status ?? ""] ?? version.status} · {version.certification_decision?.decision_type} · {date(version.issue_date)}</p></div><Button disabled={version.id === cert.id} onClick={() => onOpenPath(path(version.id))}>Mở phiên bản {version.version_no}</Button></List.Item>} />
      {data.versions_truncated ? <Typography.Text type="secondary">Hiển thị 50 phiên bản gần nhất. Liên kết trực tiếp đến phiên bản cũ vẫn được hỗ trợ.</Typography.Text> : null}
    </section>
    <Drawer rootClassName="cmp-certificate-drawer" title={drawer === "documents" ? "Tài liệu của phiên bản đang xem" : "Lịch sử trạng thái của phiên bản"} open={Boolean(drawer)} onClose={() => setDrawer(null)} width={560}>
      {drawer === "documents" ? <Space direction="vertical" style={{ width: "100%" }}>
        <List dataSource={data.documents} locale={{ emptyText: "Chưa có tài liệu" }} renderItem={file => <List.Item><div>{file.original_name} · PDF v{file.version_no}{file.is_current ? " · Hiện hành" : " · Lịch sử"}</div><Button onClick={() => void onOpenDocument(file)}>Mở PDF</Button></List.Item>} />
        {canUpload && !data.is_historical ? <><label>Chọn PDF chính thức<input aria-label="Chọn PDF chính thức" type="file" accept="application/pdf,.pdf" onChange={event => onSelectFile(event.target.files?.[0] ?? null)} /></label><Button type="primary" disabled={!uploadFile} loading={uploading} onClick={onUpload}>Tải PDF lên</Button></> : null}
        {uploadError ? <Alert type="error" showIcon message={uploadError} /> : null}
      </Space> : <List dataSource={data.history} locale={{ emptyText: "Chưa có thay đổi trạng thái" }} renderItem={item => <List.Item><div><strong>{labels[item.from_status] ?? item.from_status} → {labels[item.to_status] ?? item.to_status}</strong><p>{item.reason}</p><p>{item.certification_decision?.decision_number} · {item.certification_decision?.decision_type}</p><small>Hiệu lực {date(item.effective_date)} · {item.changed_by_user?.full_name || "Hệ thống"}</small></div></List.Item>} />}
    </Drawer>
  </main>;
}
