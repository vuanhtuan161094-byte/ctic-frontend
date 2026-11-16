"use client";

import { PlusOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Collapse, Descriptions, Empty, Form, Input, List, Modal, Space, Tag, Typography, message } from "antd";
import { useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { openDocumentFile } from "../lib/document-file-client";

interface OrganizationRow {
  name: string;
  recognition_scope: string;
}
interface F16Revision {
  id: string;
  revision_no: number;
  status: "draft" | "approved";
  organizations: OrganizationRow[];
  prepared_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  manday_reduction_authorized: boolean;
  signed_original_attested: boolean;
}
interface F16IssuedStatus {
  official_issued: boolean;
  signed_file_id: string | null;
  signed_file_sha256: string | null;
  issued_by: string | null;
}
interface F16Export {
  unsigned: boolean;
  document: { id: string; original_name: string; download_url?: string; mime_type: string };
}
interface F16SignedFile {
  id: string;
  sha256?: string | null;
  original_name?: string;
}

interface FormValues {
  organizations: OrganizationRow[];
  justification: string;
}

export function P09RecognizedBodiesPanel() {
  const [form] = Form.useForm<FormValues>();
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [issueNote, setIssueNote] = useState("");
  const [issueBusy, setIssueBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState<"docx" | "pdf" | null>(null);
  const queryClient = useQueryClient();
  const accessQuery = useQuery({
    queryKey: ["auth", "f16-panel-access"],
    queryFn: async () => (await api.get<{ user: { roles: string[]; permissions: string[] } }>("/auth/me")).data.user,
    staleTime: 60000,
  });
  const roles = accessQuery.data?.roles.map((r) => r.toUpperCase()) ?? [];
  const visible = roles.includes("ADMIN") || roles.includes("STAFF");
  const canApprove = roles.includes("ADMIN");
  const readOnly = !visible;

  const revisionsQuery = useQuery({
    queryKey: ["p09", "f16", "revisions"],
    queryFn: async () => (await api.get<F16Revision[]>("/p09/recognized-certification-bodies")).data,
    enabled: visible,
  });
  const revisions = revisionsQuery.data ?? [];
  const currentApproved = revisions.find((revision) => revision.status === "approved");
  const pending = revisions.find((revision) => revision.status === "draft");

  const issueStatusQuery = useQuery({
    queryKey: ["p09", "f16", "issue-status", currentApproved?.id],
    enabled: Boolean(currentApproved?.id && visible),
    queryFn: async () => (await api.get<F16IssuedStatus>(
      `/p09/recognized-certification-bodies/${currentApproved?.id}/issue-status`,
    )).data,
  });

  const renderCurrentForm = async (format: "docx" | "pdf") => {
    if (!currentApproved) return;
    try {
      setExportBusy(format);
      const response = (await api.post<F16Export>(
        `/p09/recognized-certification-bodies/${currentApproved.id}/render`,
        null, { params: { format } },
      )).data;
      await openDocumentFile({
        url: response.document.download_url || `/document-files/${response.document.id}/download`,
        filename: response.document.original_name,
        mimeType: response.document.mime_type,
        title: response.document.original_name,
      });
      message.success("Đã xuất bản F.16 chưa ký vào lịch sử tài liệu.");
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally { setExportBusy(null); }
  };

  const submitSignedForm = async () => {
    if (!currentApproved || !signedFile || !canApprove) return;
    if (signedFile.size > 20 * 1024 * 1024) {
      message.error("Bản ký không được vượt quá 20 MB.");
      return;
    }
    try {
      setIssueBusy(true);
      const payload = new FormData();
      payload.append("file", signedFile);
      payload.append("entity_type", "p09_f16");
      payload.append("entity_id", currentApproved.id);
      payload.append("document_type", "recognized_certification_bodies_f16");
      payload.append("file_kind", "signed_scan");
      const result = (await api.post<F16SignedFile>("/document-files/upload", payload, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 120_000,
      })).data;
      if (!result?.id || !result?.sha256) throw new Error("Bản ký chưa có SHA-256 hợp lệ");
      setSignedFile(null);
      await queryClient.invalidateQueries({ queryKey: ["p09", "f16", "issue-status"] });
      message.success("Đã tải bản ký F.16. Cần người khác xác nhận phát hành.");
    } catch (error) { message.error(getErrorMessage(error)); }
    finally { setIssueBusy(false); }
  };

  const issueApprovedForm = async () => {
    const signedId = issueStatusQuery.data?.signed_file_id;
    if (!currentApproved || !signedId || issueNote.trim().length < 20 || !canApprove) return;
    try {
      setIssueBusy(true);
      await api.post(`/p09/recognized-certification-bodies/${currentApproved.id}/issue`, {
        signed_file_id: signedId,
        issue_note: issueNote.trim(),
      });
      setIssueNote("");
      await queryClient.invalidateQueries({ queryKey: ["p09", "f16", "issue-status"] });
      message.success("F.16 đã được ghi nhận phát hành theo bản ký hiện hành.");
    } catch (error) { message.error(getErrorMessage(error)); }
    finally { setIssueBusy(false); }
  };

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return (await api.post("/p09/recognized-certification-bodies", {
        organizations: values.organizations.map((row) => ({
          name: row.name.trim(),
          recognition_scope: row.recognition_scope.trim(),
        })),
        justification: values.justification.trim(),
      })).data;
    },
    onSuccess: async () => {
      message.success("Đã lưu bản F.16 chờ phê duyệt.");
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["p09", "f16"] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!approveId) throw new Error("Chưa chọn phiên bản F.16");
      return (await api.post(`/p09/recognized-certification-bodies/${approveId}/approve`, {
        approval_note: approvalNote.trim(),
      })).data;
    },
    onSuccess: async () => {
      setApproveId(null);
      setApprovalNote("");
      message.success("Đã ghi nhận phê duyệt độc lập của F.16.");
      await queryClient.invalidateQueries({ queryKey: ["p09", "f16"] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  if (accessQuery.isLoading || readOnly) return null;
  return (
    <Card title="F.16 — Danh sách tổ chức được thừa nhận" style={{ marginTop: 16 }}
      extra={<Button icon={<ReloadOutlined />} size="small" onClick={() => void revisionsQuery.refetch()}
        loading={revisionsQuery.isFetching}>Tải lại</Button>}>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert showIcon type="info" message="Phê duyệt F.16 không đồng nghĩa tự động giảm ngày công đánh giá"
          description="Danh sách chỉ có hiệu lực nội bộ sau khi một quản trị viên khác phê duyệt. Việc công nhận kết quả đánh giá và điều chỉnh ngày công phải có xem xét riêng; bản điện tử này không thay thế chữ ký trên mẫu gốc." />
        {revisionsQuery.isError ? (
          <Alert showIcon type="error" message="Không tải được F.16" description={getErrorMessage(revisionsQuery.error)}
            action={<Button size="small" onClick={() => void revisionsQuery.refetch()}>Thử lại</Button>} />
        ) : null}
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Phiên bản được duyệt">{currentApproved ? `F.16 v${currentApproved.revision_no}` : "Chưa có"}</Descriptions.Item>
          <Descriptions.Item label="Bản đang chờ duyệt">{pending ? `v${pending.revision_no}` : "Không có"}</Descriptions.Item>
        </Descriptions>
        {currentApproved ? (
          <List bordered size="small" header={`Tổ chức đã thừa nhận — F.16 v${currentApproved.revision_no}`}
            dataSource={currentApproved.organizations}
            renderItem={(row, index) => <List.Item>
              <strong>{index + 1}. {row.name}</strong>
              <Typography.Text type="secondary" style={{ marginLeft: 10 }}>{row.recognition_scope}</Typography.Text>
            </List.Item>} />
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có danh sách F.16 được duyệt" />}
        {currentApproved ? (
          <Card size="small" title={`Xuất và phát hành F.16 v${currentApproved.revision_no}`}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Alert showIcon type={issueStatusQuery.data?.official_issued ? "success" : "warning"}
                message={issueStatusQuery.data?.official_issued
                  ? "Bản F.16 đã được xác nhận phát hành theo SHA-256 hiện hành"
                  : "Chưa phát hành chính thức theo bản ký"} />
              <Space wrap>
                <Button disabled={Boolean(exportBusy)} loading={exportBusy === "docx"}
                  onClick={() => void renderCurrentForm("docx")}>Xuất Word chưa ký</Button>
                <Button disabled={Boolean(exportBusy)} loading={exportBusy === "pdf"}
                  onClick={() => void renderCurrentForm("pdf")}>Xuất PDF chưa ký</Button>
              </Space>
              {canApprove ? (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Typography.Text type="secondary">Tải bản F.16 có chữ ký người lập và người duyệt, sau đó dùng tài khoản độc lập để phát hành.</Typography.Text>
                  <input aria-label="Bản ký F.16" type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => setSignedFile(event.target.files?.[0] ?? null)} />
                  <Button disabled={!signedFile || issueBusy} loading={issueBusy}
                    onClick={() => void submitSignedForm()}>Tải bản F.16 đã ký</Button>
                  {issueStatusQuery.data?.signed_file_id && !issueStatusQuery.data.official_issued ? (
                    <>
                      <Input.TextArea aria-label="Căn cứ phát hành F.16" maxLength={2000}
                        rows={3} value={issueNote}
                        onChange={(event) => setIssueNote(event.target.value)}
                        placeholder="Ghi rõ căn cứ đối chiếu chữ ký, ngày, thẩm quyền..." />
                      <Button type="primary" disabled={issueBusy || issueNote.trim().length < 20}
                        onClick={() => void issueApprovedForm()}>Xác nhận phát hành độc lập</Button>
                    </>
                  ) : null}
                </Space>
              ) : null}
            </Space>
          </Card>
        ) : null}
        {pending && canApprove ? (
          <Button type="primary" onClick={() => setApproveId(pending.id)}>
            Xem xét phê duyệt F.16 v{pending.revision_no}
          </Button>
        ) : null}
        <Collapse items={[{
          key: "create",
          label: "Lập phiên bản F.16 mới",
          children: <Form<FormValues> form={form} layout="vertical"
            initialValues={{ organizations: [{ name: "", recognition_scope: "" }], justification: "" }}
            onFinish={(values) => createMutation.mutate(values)}>
            <Form.List name="organizations">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {fields.map((field, index) => (
                    <Card key={field.key} size="small" title={`Tổ chức ${index + 1}`}
                      extra={<Button danger type="link" disabled={fields.length <= 1}
                        onClick={() => remove(field.name)}>Xóa</Button>}>
                      <Form.Item label="Tên tổ chức chứng nhận" name={[field.name, "name"]}
                        rules={[{ required: true, min: 2, message: "Nhập tên tổ chức" }]}>
                        <Input maxLength={255} />
                      </Form.Item>
                      <Form.Item label="Nội dung/phạm vi thừa nhận" name={[field.name, "recognition_scope"]}
                        rules={[{ required: true, min: 3, message: "Nhập nội dung thừa nhận" }]}>
                        <Input.TextArea rows={2} maxLength={2000} />
                      </Form.Item>
                    </Card>
                  ))}
                  <Button icon={<PlusOutlined />} onClick={() => add({ name: "", recognition_scope: "" })}
                    disabled={fields.length >= 100}>Thêm tổ chức</Button>
                </Space>
              )}
            </Form.List>
            <Form.Item label="Lý do lập/cập nhật danh sách" name="justification"
              rules={[{ required: true, min: 20, message: "Nhập lý do ít nhất 20 ký tự" }]}
              style={{ marginTop: 16 }}>
              <Input.TextArea rows={3} maxLength={2000} />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={createMutation.isPending}
              disabled={Boolean(pending)}>Lưu dự thảo chờ phê duyệt</Button>
          </Form>,
        }]} />
        <Collapse items={[{
          key: "history",
          label: `Lịch sử phiên bản F.16 (${revisions.length})`,
          children: <List bordered size="small" dataSource={revisions}
            renderItem={(revision) => <List.Item>
              <Space wrap>
                <Tag color={revision.status === "approved" ? "green" : "orange"}>v{revision.revision_no} · {revision.status}</Tag>
                <Typography.Text>{revision.organizations.length} tổ chức</Typography.Text>
                <Typography.Text type="secondary">Người lập: {revision.prepared_by}</Typography.Text>
                {revision.approved_by ? <Typography.Text type="secondary">Người duyệt: {revision.approved_by}</Typography.Text> : null}
              </Space>
            </List.Item>} />,
        }]} />
      </Space>
      <Modal title="Phê duyệt độc lập F.16" open={Boolean(approveId)}
        okText="Xác nhận phê duyệt" cancelText="Hủy" okButtonProps={{
          loading: approveMutation.isPending, disabled: approvalNote.trim().length < 20,
        }} onOk={() => approveMutation.mutate()}
        onCancel={() => { setApproveId(null); setApprovalNote(""); }}>
        <Alert type="warning" showIcon message="Không thể tự phê duyệt phiên bản do chính mình lập" />
        <Input.TextArea aria-label="Căn cứ phê duyệt F.16" rows={4} maxLength={2000}
          placeholder="Ghi rõ căn cứ phê duyệt, phạm vi được thừa nhận..."
          value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} />
      </Modal>
    </Card>
  );
}
