"use client";

import { PlusOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Collapse, Descriptions, Empty, Form, Input, List, Modal, Space, Tag, Typography, message } from "antd";
import { useState } from "react";

import { api, getErrorMessage } from "../lib/api";

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
interface FormValues {
  organizations: OrganizationRow[];
  justification: string;
}

export function P09RecognizedBodiesPanel() {
  const [form] = Form.useForm<FormValues>();
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
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
    <Card title="F.16-P.09 — Danh sách tổ chức được thừa nhận" style={{ marginTop: 16 }}
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
