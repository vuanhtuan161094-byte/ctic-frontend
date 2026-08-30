"use client";

import { EyeOutlined, PaperClipOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { openDocumentFile } from "../lib/document-file-client";

const { Text, Title } = Typography;
const { TextArea } = Input;
type PortalDomain = "changes" | "complaints" | "appeals";

interface PortalEvidence {
  id: string;
  original_name: string;
  note: string | null;
  sha256: string | null;
}

interface PortalCase {
  id: string;
  case_number?: string;
  complaint_number?: string;
  appeal_number?: string;
  status: string;
  description?: string;
  subject?: string;
  grounds?: string;
  assessment_outcome?: string | null;
  final_response?: string | null;
  outcome?: string | null;
  required_action?: string | null;
  challenged_decision?: { id: string; decision_number: string; decision_type: string; decision_date: string } | null;
  evidence?: PortalEvidence[];
  overdue?: boolean;
  created_at: string;
}

function caseNumber(record: PortalCase) {
  return record.case_number || record.complaint_number || record.appeal_number || record.id;
}

export function CustomerCasesScreen() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState<PortalDomain>("changes");
  const [selected, setSelected] = useState<PortalCase | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const query = useQuery({
    queryKey: ["customer-portal", "governance-cases", domain],
    queryFn: async () => (
      await api.get<PortalCase[]>(`/customer-portal/me/cases/${domain}`)
    ).data,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (domain === "complaints") {
        return api.post("/customer-portal/me/cases/complaints", {
          received_date: dayjs().format("YYYY-MM-DD"),
          complainant_name: fields.name,
          complainant_contact: fields.contact || undefined,
          subject: fields.subject,
          description: fields.description,
          source_channel: "CUSTOMER_PORTAL",
        });
      }
      return api.post("/customer-portal/me/cases/appeals", {
        challenged_decision_id: fields.decision_id,
        appellant_name: fields.name,
        appellant_contact: fields.contact || undefined,
        grounds: fields.description,
      });
    },
    onSuccess: async (response) => {
      const created = response.data as PortalCase;
      if (evidenceFile) {
        const form = new FormData();
        form.append("file", evidenceFile);
        form.append("note", "Evidence submitted with case");
        await api.post(`/document-files/customer/cases/${domain === "complaints" ? "complaint" : "appeal"}/${created.id}/evidence`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      message.success(domain === "complaints" ? "Đã gửi complaint." : "Đã gửi appeal.");
      setCreateOpen(false);
      setFields({});
      setEvidenceFile(null);
      await queryClient.invalidateQueries({ queryKey: ["customer-portal", "governance-cases"] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const evidenceMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !evidenceFile || domain === "changes") throw new Error("Chưa chọn evidence.");
      const form = new FormData();
      form.append("file", evidenceFile);
      form.append("note", fields.evidence_note || "Additional evidence");
      return api.post(`/document-files/customer/cases/${domain === "complaints" ? "complaint" : "appeal"}/${selected.id}/evidence`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: async () => {
      message.success("Đã tải evidence qua secure pipeline.");
      setEvidenceFile(null);
      await queryClient.invalidateQueries({ queryKey: ["customer-portal", "governance-cases"] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: TableColumnsType<PortalCase> = [
    { title: "Số case", key: "number", width: 190, render: (_, record) => <Text strong>{caseNumber(record)}</Text> },
    { title: "Nội dung", key: "summary", render: (_, record) => record.subject || record.description || record.grounds || "—" },
    { title: "Ngày gửi", dataIndex: "created_at", key: "created", width: 130, render: (value) => dayjs(value).format("DD/MM/YYYY") },
    { title: "Trạng thái", dataIndex: "status", key: "status", width: 160, render: (value) => <Tag color="processing">{value}</Tag> },
    { title: "", key: "action", width: 90, render: (_, record) => <Button icon={<EyeOutlined />} onClick={() => setSelected(record)} size="small">Xem</Button> },
  ];

  return (
    <div className="projects-screen customer-portal-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">CỔNG KHÁCH HÀNG</span>
          <Title level={2}>Thay đổi & Phản hồi</Title>
          <Text type="secondary">Theo dõi impact status, gửi complaint hoặc appeal bằng projection dành riêng cho khách hàng.</Text>
        </div>
        <Space>
          {domain !== "changes" ? <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} type="primary">{domain === "complaints" ? "Gửi complaint" : "Gửi appeal"}</Button> : null}
          <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button>
        </Space>
      </div>
      <Card>
        <Tabs activeKey={domain} items={[
          { key: "changes", label: "Thay đổi chứng nhận" },
          { key: "complaints", label: "Complaints" },
          { key: "appeals", label: "Appeals" },
        ]} onChange={(key) => { setDomain(key as PortalDomain); setSelected(null); }} />
        {query.isError ? <Alert description={getErrorMessage(query.error)} message="Không tải được case" showIcon type="error" /> : (
          <Table columns={columns} dataSource={query.data ?? []} loading={query.isLoading} locale={{ emptyText: <Empty description="Chưa có case" /> }} pagination={{ pageSize: 15 }} rowKey="id" />
        )}
      </Card>

      <Drawer onClose={() => setSelected(null)} open={Boolean(selected)} title={selected ? caseNumber(selected) : "Chi tiết"} width={680}>
        {selected ? <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {selected.overdue ? <Alert message="Case đang quá hạn" showIcon type="warning" /> : null}
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Trạng thái">{selected.status}</Descriptions.Item>
            <Descriptions.Item label="Nội dung">{selected.subject || selected.description || selected.grounds || "—"}</Descriptions.Item>
            <Descriptions.Item label="Impact / Outcome">{selected.assessment_outcome || selected.outcome || "—"}</Descriptions.Item>
            <Descriptions.Item label="Quyết định bị appeal">{selected.challenged_decision?.decision_number || "—"}</Descriptions.Item>
            <Descriptions.Item label="Phản hồi cuối">{selected.final_response || "Chưa có phản hồi cuối"}</Descriptions.Item>
          </Descriptions>
          {domain !== "changes" ? <Card size="small" title="Evidence attachments">
            <List dataSource={selected.evidence ?? []} locale={{ emptyText: "Chưa có evidence" }} renderItem={(file) => <List.Item actions={[<Button key="open" onClick={() => void openDocumentFile({ url: `/document-files/customer/${file.id}/download`, filename: file.original_name, title: file.original_name })}>Mở</Button>]}><List.Item.Meta title={file.original_name} description={file.sha256 ? "Đã xác minh SHA-256" : "Chưa neo hash"} /></List.Item>} />
            {!['CLOSED', 'REJECTED', 'OUT_OF_SCOPE'].includes(selected.status) ? <Space style={{ marginTop: 12 }}>
              <Upload beforeUpload={(file) => { setEvidenceFile(file); return false; }} maxCount={1}><Button icon={<PaperClipOutlined />}>Chọn evidence</Button></Upload>
              <Button disabled={!evidenceFile} loading={evidenceMutation.isPending} onClick={() => evidenceMutation.mutate()} type="primary">Tải lên</Button>
            </Space> : null}
          </Card> : null}
        </Space> : null}
      </Drawer>

      <Modal confirmLoading={createMutation.isPending} onCancel={() => setCreateOpen(false)} onOk={() => createMutation.mutate()} open={createOpen} title={domain === "complaints" ? "Gửi complaint" : "Gửi appeal"}>
        <Space direction="vertical" style={{ width: "100%" }}>
          {domain === "appeals" ? <Input onChange={(event) => setFields({ ...fields, decision_id: event.target.value })} placeholder="Exact certification decision UUID" value={fields.decision_id} /> : null}
          <Input onChange={(event) => setFields({ ...fields, name: event.target.value })} placeholder="Người gửi" value={fields.name} />
          <Input onChange={(event) => setFields({ ...fields, contact: event.target.value })} placeholder="Email / liên hệ" value={fields.contact} />
          {domain === "complaints" ? <Input onChange={(event) => setFields({ ...fields, subject: event.target.value })} placeholder="Chủ đề" value={fields.subject} /> : null}
          <TextArea onChange={(event) => setFields({ ...fields, description: event.target.value })} placeholder={domain === "complaints" ? "Mô tả complaint" : "Grounds of appeal"} rows={5} value={fields.description} />
          <Upload beforeUpload={(file) => { setEvidenceFile(file); return false; }} maxCount={1}><Button icon={<PaperClipOutlined />}>Đính kèm evidence</Button></Upload>
          <Alert message="Các ghi chú điều tra, deliberation và SoD nội bộ không được hiển thị trên Portal." showIcon type="info" />
        </Space>
      </Modal>
    </div>
  );
}
