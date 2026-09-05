import { Button, Descriptions, List, Select, Space, Tag, Typography, Alert } from "antd";
import { ArrowLeftOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { Breadcrumb, DomainStatusBadge, EmptyState, PageHeader, ReadOnlyState, SectionHeader } from "../design-system";
import { capSections, selectedCapVersion, type CapSection, type CapWorkspaceProjection, type CapEvidence, type CapVersion } from "./cap-model";
import "./certification-cap.css";

const date = (value?: string | null) => value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa ghi nhận";
export interface CapWorkspaceViewProps {
  data: CapWorkspaceProjection; section: CapSection; versionId: string | null; editing: boolean;
  onSection: (section: CapSection) => void; onVersion: (id: string | null) => void;
  onOpenPath: (path: string) => void; onRefresh: () => void; onRespond: () => void;
  onReview: (version: CapVersion) => void; onClose: () => void;
  onUpload: (version: CapVersion) => void; onDownload: (file: CapEvidence) => void;
}
export function CapWorkspaceView({ data, section, versionId, editing, onSection, onVersion, onOpenPath, onRefresh, onRespond, onReview, onClose, onUpload, onDownload }: CapWorkspaceViewProps) {
  const { finding, context, allowed_actions: actions } = data;
  const { latest, selected, versions } = selectedCapVersion(finding, versionId);
  const historical = Boolean(selected && latest && selected.id !== latest.id);
  const portal = data.audience === "customer";
  const auditPath = `/certifications/${encodeURIComponent(context.case_id)}/audits/${encodeURIComponent(context.audit_id)}?section=findings`;
  const primary = editing || historical ? null : actions.respond ? { label: latest ? "Gửi phiên bản HĐKP mới" : "Gửi HĐKP", run: onRespond }
    : actions.close ? { label: "Đóng NC", run: onClose }
      : actions.review && latest?.status === "submitted" ? { label: "Thẩm xét CAP", run: () => onReview(latest) } : null;
  const evidence = selected?.evidence_files ?? [];
  return <main className="cmp-cap-page" data-cap-route={`${context.case_id}:${finding.id}`}>
    <Breadcrumb items={[{ key: "cases", label: portal ? "Hành động khắc phục" : "Hồ sơ chứng nhận", onNavigate: () => onOpenPath(portal ? "/portal/corrective-actions" : `/certifications/${encodeURIComponent(context.case_id)}/progress`) }, { key: "finding", label: finding.finding_code }]} />
    <PageHeader title={finding.finding_code} description={context.customer_name} secondaryActions={<Space wrap>
      <Button icon={<ArrowLeftOutlined />} onClick={() => onOpenPath(portal ? "/portal/corrective-actions" : auditPath)}>{portal ? "Danh sách HĐKP" : "Về cuộc đánh giá"}</Button>
      <Button aria-label="Tải lại HĐKP" icon={<ReloadOutlined />} onClick={onRefresh} />
      {primary ? <Button type="primary" onClick={primary.run}>{primary.label}</Button> : null}
    </Space>} />
    <div className="cmp-cap-summary">
      <Space wrap><DomainStatusBadge domain="finding" code={finding.status === "action_accepted" ? "response_accepted" : finding.status} /><Tag>{finding.finding_type === "major_nc" ? "NC nặng" : finding.finding_type === "minor_nc" ? "NC nhẹ" : finding.finding_type}</Tag><span>{context.project_code} · {context.plan_code || "Chưa cấp mã kế hoạch"}</span></Space>
      <Space wrap><span>Điều khoản: {finding.clause || "Chưa ghi nhận"}</span><Tag color={finding.is_overdue && finding.status !== "closed" ? "red" : undefined}>{finding.status === "closed" ? "Đã hoàn tất" : finding.is_overdue ? "Quá hạn" : finding.due_date ? "Hạn HĐKP" : "Chưa cấu hình hạn"}: {date(finding.due_date)}</Tag><span>{latest ? `Phiên bản hiện hành: ${latest.version_no}` : "Chưa có phản hồi"}</span></Space>
    </div>
    {finding.status === "revision_required" && latest?.review_comment ? <Alert type="warning" showIcon title="Yêu cầu bổ sung/chỉnh sửa" description={latest.review_comment} /> : null}
    {!primary && !editing && !actions.upload_evidence ? <ReadOnlyState reason="Tài khoản hiện tại chưa có thao tác HĐKP khả dụng cho phát hiện này." /> : null}
    <nav className="cmp-cap-nav" aria-label="Nội dung HĐKP">{Object.entries(capSections).map(([key, label]) => <Button key={key} aria-current={section === key ? "page" : undefined} onClick={() => onSection(key as CapSection)}>{label}</Button>)}</nav>
    {!(editing && section === "response") ? <section className="cmp-cap-content">
      <SectionHeader title={capSections[section]} />
      {section === "overview" ? <Descriptions column={1} items={[
        { key: "requirement", label: "Yêu cầu", children: finding.requirement || "Chưa ghi nhận" },
        { key: "description", label: "Mô tả phát hiện", children: finding.description },
        { key: "evidence", label: "Bằng chứng khách quan", children: finding.objective_evidence || "Chưa ghi nhận" },
        { key: "detected", label: "Ngày phát hiện", children: date(finding.detected_date) },
        { key: "audit", label: "Cuộc đánh giá", children: context.audit_type || "Chưa ghi nhận" },
      ]} /> : null}
      {["response", "evidence", "versions", "review"].includes(section) ? <>
        {section === "evidence" && !portal ? <Button onClick={() => onOpenPath(`/projects/${encodeURIComponent(context.case_id)}?workspace=cap&audit_plan_id=${encodeURIComponent(context.audit_id)}&finding_id=${encodeURIComponent(finding.id)}&compatibility=legacy`)}>Mở biểu mẫu và tài liệu hiện hữu</Button> : null}
        <div className="cmp-cap-version"><Typography.Text strong>{historical ? "Đang xem phiên bản lịch sử · chỉ đọc" : "Phản hồi hiện hành"}</Typography.Text>
          <Select aria-label="Phiên bản HĐKP" value={versionId ?? latest?.id} placeholder="Chưa có phiên bản" onChange={onVersion} options={versions.map((version) => ({ value: version.id, label: `Phiên bản ${version.version_no}${version.id === latest?.id ? " · Hiện hành" : " · Lịch sử"}` }))} />
          {versionId ? <Button onClick={() => onVersion(null)}>Về bản hiện hành</Button> : null}
        </div>
        {!selected ? <EmptyState title={versionId ? "Phiên bản không còn khả dụng" : "Chưa có phản hồi HĐKP"} /> : <>
          <DomainStatusBadge domain="capVersion" code={selected.status} />
          {["response", "versions"].includes(section) ? <Descriptions column={1} items={[
            { key: "root", label: "Nguyên nhân gốc rễ", children: selected.root_cause },
            { key: "correction", label: "Sửa chữa tức thời", children: selected.correction },
            { key: "plan", label: "Hành động khắc phục", children: selected.corrective_action_plan },
            { key: "owner", label: "Người phụ trách", children: selected.responsible_person || "Chưa ghi nhận" },
            { key: "target", label: "Dự kiến hoàn thành", children: date(selected.target_date) },
          ]} /> : null}
          {["evidence", "versions"].includes(section) ? <>
            <Typography.Title level={5}>Bằng chứng · phiên bản {selected.version_no}</Typography.Title>
            {evidence.length ? <List dataSource={evidence} renderItem={(file) => <List.Item><span>{file.original_name}</span><Button icon={<DownloadOutlined />} onClick={() => onDownload(file)}>Tải xuống</Button></List.Item>} /> : <EmptyState title="Chưa có bằng chứng cho phiên bản này" />}
            {!historical && actions.upload_evidence ? <Button onClick={() => onUpload(selected)}>Tải bằng chứng</Button> : null}
          </> : null}
          {["review", "versions"].includes(section) ? <Descriptions column={1} items={[
            { key: "submitted", label: "Ngày gửi", children: date(selected.submitted_at) },
            { key: "reviewed", label: "Ngày thẩm xét", children: date(selected.reviewed_at) },
            { key: "comment", label: "Kết quả/ý kiến thẩm xét", children: selected.review_comment || "Chưa có ý kiến thẩm xét" },
            ...(!portal ? [{ key: "reviewer", label: "Người thẩm xét", children: selected.reviewed_by_user?.full_name || "Chưa ghi nhận" }] : []),
          ]} /> : null}
        </>}
      </> : null}
      {section === "activity" ? <>
        <Typography.Paragraph type="secondary">Các mốc gửi và thẩm xét từ lịch sử phiên bản của phát hiện này.</Typography.Paragraph>
        {versions.length ? <List dataSource={[...versions].reverse()} renderItem={(version) => <List.Item><span>Phiên bản {version.version_no} · Gửi: {date(version.submitted_at)}{version.reviewed_at ? ` · Thẩm xét: ${date(version.reviewed_at)}` : ""}</span><DomainStatusBadge domain="capVersion" code={version.status} /></List.Item>} /> : <EmptyState title="Chưa có hoạt động phản hồi" />}
        {finding.closed_at ? <Typography.Paragraph>Đóng NC: {date(finding.closed_at)}{!portal && finding.close_comment ? ` · ${finding.close_comment}` : ""}</Typography.Paragraph> : null}
      </> : null}
    </section> : null}
  </main>;
}
