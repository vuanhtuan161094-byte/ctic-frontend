"use client";

import { EyeOutlined, PaperClipOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType, UploadFile } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Grid,
  Input,
  Modal,
  Pagination,
  Select,
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
import { DomainStatusBadge, resolveDomainStatus } from "./design-system/status";
import type { StatusDomain } from "./design-system/types";

const { Text, Title } = Typography;
const { TextArea } = Input;
type PortalDomain = "changes" | "complaints" | "appeals";

const portalDomainMeta: Record<PortalDomain, { label: string; statusDomain: StatusDomain }> = {
  changes: { label: "Thay đổi chứng nhận", statusDomain: "changeCase" },
  complaints: { label: "Khiếu nại", statusDomain: "complaint" },
  appeals: { label: "Kháng nghị", statusDomain: "appeal" },
};

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

function caseSummary(record: PortalCase) {
  return record.subject || record.description || record.grounds || "—";
}

export function CustomerCasesScreen() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const breakpoints = Grid.useBreakpoint();
  const useCompactPortalList = !breakpoints.lg;
  const [domain, setDomain] = useState<PortalDomain>("changes");
  const [selected, setSelected] = useState<PortalCase | null>(null);
  const [casePage, setCasePage] = useState(1);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [createEvidenceFiles, setCreateEvidenceFiles] = useState<UploadFile[]>([]);
  const [additionalEvidenceFiles, setAdditionalEvidenceFiles] = useState<UploadFile[]>([]);
  const createEvidenceFile = createEvidenceFiles[0]?.originFileObj;
  const additionalEvidenceFile = additionalEvidenceFiles[0]?.originFileObj;

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
      if (createEvidenceFile) {
        const form = new FormData();
        form.append("file", createEvidenceFile);
        form.append("note", "Bằng chứng gửi kèm hồ sơ");
        await api.post(`/document-files/customer/cases/${domain === "complaints" ? "complaint" : "appeal"}/${created.id}/evidence`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      message.success(domain === "complaints" ? "Đã gửi khiếu nại." : "Đã gửi kháng nghị.");
      setCreateOpen(false);
      setFields({});
      setCreateEvidenceFiles([]);
      await queryClient.invalidateQueries({ queryKey: ["customer-portal", "governance-cases"] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const evidenceMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !additionalEvidenceFile || domain === "changes") throw new Error("Chưa chọn bằng chứng.");
      const form = new FormData();
      form.append("file", additionalEvidenceFile);
      form.append("note", fields.evidence_note || "Tài liệu bằng chứng bổ sung");
      return api.post(`/document-files/customer/cases/${domain === "complaints" ? "complaint" : "appeal"}/${selected.id}/evidence`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: async () => {
      message.success("Đã tải bằng chứng an toàn.");
      setAdditionalEvidenceFiles([]);
      await queryClient.invalidateQueries({ queryKey: ["customer-portal", "governance-cases"] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: TableColumnsType<PortalCase> = [
    { title: "Số case", key: "number", width: 190, render: (_, record) => <Text strong>{caseNumber(record)}</Text> },
    { title: "Nội dung", key: "summary", render: (_, record) => caseSummary(record) },
    { title: "Ngày gửi", dataIndex: "created_at", key: "created", width: 130, render: (value) => dayjs(value).format("DD/MM/YYYY") },
    { title: "Trạng thái", dataIndex: "status", key: "status", width: 160, render: (value) => <DomainStatusBadge code={value} domain={portalDomainMeta[domain].statusDomain} /> },
    { title: "", key: "action", width: 90, render: (_, record) => <Button icon={<EyeOutlined />} onClick={() => { setSelected(record); setAdditionalEvidenceFiles([]); }} size="small">Xem</Button> },
  ];
  const cases = query.data ?? [];
  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  const filteredCases = normalizedSearch
    ? cases.filter((record) => [
      caseNumber(record),
      caseSummary(record),
      record.status,
      resolveDomainStatus(portalDomainMeta[domain].statusDomain, record.status).label,
      record.challenged_decision?.decision_number,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("vi")
      .includes(normalizedSearch))
    : cases;
  const casePageCount = Math.max(1, Math.ceil(filteredCases.length / 10));
  const visibleCasePage = Math.min(casePage, casePageCount);
  const visibleCases = filteredCases.slice((visibleCasePage - 1) * 10, visibleCasePage * 10);
  const canSubmitCase = Boolean(
    fields.name?.trim()
      && fields.description?.trim()
      && (domain === "complaints" ? fields.subject?.trim() : fields.decision_id?.trim()),
  );

  const resetCreateForm = () => {
    setFields({});
    setCreateEvidenceFiles([]);
  };

  const openCreateForm = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const closeCreateForm = () => {
    setCreateOpen(false);
    resetCreateForm();
  };

  const changePortalDomain = (key: string) => {
    setDomain(key as PortalDomain);
    setCasePage(1);
    setSearch("");
    setSelected(null);
    resetCreateForm();
  };

  return (
    <div className="projects-screen customer-portal-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">Cổng khách hàng</span>
          <Title level={2}>Thay đổi, khiếu nại & kháng nghị</Title>
          <Text type="secondary">Theo dõi yêu cầu thay đổi chứng nhận, gửi khiếu nại hoặc kháng nghị.</Text>
        </div>
        <Space>
          {domain !== "changes" ? <Button icon={<PlusOutlined />} onClick={openCreateForm} type="primary">{domain === "complaints" ? "Gửi khiếu nại" : "Gửi kháng nghị"}</Button> : null}
          <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button>
        </Space>
      </div>
      <Card>
        {useCompactPortalList ? (
          <Select
            aria-label="Loại yêu cầu"
            onChange={changePortalDomain}
            options={Object.entries(portalDomainMeta).map(([value, meta]) => ({ value, label: meta.label }))}
            style={{ marginBottom: 12, width: "100%" }}
            value={domain}
          />
        ) : (
          <Tabs
            activeKey={domain}
            items={Object.entries(portalDomainMeta).map(([key, meta]) => ({ key, label: meta.label }))}
            onChange={changePortalDomain}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginBottom: 16 }}>
          <Input.Search
            allowClear
            onChange={(event) => { setSearch(event.target.value); setCasePage(1); }}
            placeholder="Tìm mã case hoặc nội dung"
            style={{ maxWidth: 360, width: "100%" }}
            value={search}
          />
          <Text type="secondary">{filteredCases.length} case</Text>
        </div>
        {query.isError ? <Alert action={<Button icon={<ReloadOutlined />} onClick={() => void query.refetch()}>Thử lại</Button>} description={getErrorMessage(query.error)} showIcon title="Không tải được case" type="error" /> : query.isLoading ? (
          <Alert showIcon title="Đang tải danh sách case..." type="info" />
        ) : (
          useCompactPortalList ? (
            visibleCases.length ? (
              <>
                <div aria-label="Danh sách yêu cầu và phản hồi" className="portal-mobile-list">
                  {visibleCases.map((record) => (
                    <article className="portal-mobile-card" key={record.id}>
                      <div className="portal-mobile-card__heading">
                        <div className="portal-mobile-card__identity">
                          <strong>{caseNumber(record)}</strong>
                          <small>Gửi ngày {dayjs(record.created_at).format("DD/MM/YYYY")}</small>
                        </div>
                        <Space size={4}>
                          <DomainStatusBadge code={record.status} domain={portalDomainMeta[domain].statusDomain} />
                          {record.overdue ? <Tag color="red">Quá hạn</Tag> : null}
                        </Space>
                      </div>
                      <div className="portal-mobile-card__meta">
                        <span><strong>Nội dung:</strong> {caseSummary(record)}</span>
                        {record.challenged_decision?.decision_number ? <span><strong>Quyết định:</strong> {record.challenged_decision.decision_number}</span> : null}
                      </div>
                      <Button block onClick={() => { setSelected(record); setAdditionalEvidenceFiles([]); }} size="small">Xem chi tiết</Button>
                    </article>
                  ))}
                </div>
                {filteredCases.length > 10 ? <Pagination className="compact-mobile-pagination" current={visibleCasePage} onChange={setCasePage} pageSize={10} responsive showSizeChanger={false} showTotal={(total) => `${total} case`} total={filteredCases.length} /> : null}
              </>
            ) : <Empty description={normalizedSearch ? "Không tìm thấy case phù hợp" : "Chưa có case"} />
          ) : (
            <Table columns={columns} dataSource={filteredCases} locale={{ emptyText: <Empty description={normalizedSearch ? "Không tìm thấy case phù hợp" : "Chưa có case"} /> }} pagination={{ pageSize: 10, hideOnSinglePage: true }} rowKey="id" size="small" />
          )
        )}
      </Card>

      <Drawer
        onClose={() => { setSelected(null); setAdditionalEvidenceFiles([]); }}
        open={Boolean(selected)}
        size={breakpoints.md ? "large" : "default"}
        title={selected ? caseNumber(selected) : "Chi tiết case"}
      >
        {selected ? <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          {selected.overdue ? <Alert title="Case đang quá hạn" showIcon type="warning" /> : null}
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Trạng thái"><DomainStatusBadge code={selected.status} domain={portalDomainMeta[domain].statusDomain} /></Descriptions.Item>
            <Descriptions.Item label="Nội dung">{caseSummary(selected)}</Descriptions.Item>
            <Descriptions.Item label="Kết quả xem xét">{selected.assessment_outcome || selected.outcome || "—"}</Descriptions.Item>
            <Descriptions.Item label="Quyết định bị kháng nghị">{selected.challenged_decision?.decision_number || "—"}</Descriptions.Item>
            <Descriptions.Item label="Phản hồi cuối">{selected.final_response || "Chưa có phản hồi cuối"}</Descriptions.Item>
          </Descriptions>
          {domain !== "changes" ? <Card size="small" title="Tài liệu bằng chứng">
            {selected.evidence?.length ? (
              <Space orientation="vertical" style={{ width: "100%" }}>
                {selected.evidence.map((file) => (
                  <div key={file.id} style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", width: "100%" }}>
                    <Space orientation="vertical" size={0} style={{ minWidth: 0 }}>
                      <Text strong style={{ overflowWrap: "anywhere" }}>{file.original_name}</Text>
                      <Text type="secondary">{file.sha256 ? "Đã xác minh SHA-256" : "Chưa xác minh mã hash"}</Text>
                    </Space>
                    <Button onClick={() => void openDocumentFile({ url: `/document-files/customer/${file.id}/download`, filename: file.original_name, title: file.original_name })}>Mở</Button>
                  </div>
                ))}
              </Space>
            ) : <Empty description="Chưa có tài liệu bằng chứng" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            {!['CLOSED', 'REJECTED', 'OUT_OF_SCOPE'].includes(selected.status) ? <Space wrap style={{ marginTop: 12 }}>
              <Upload
                beforeUpload={(file) => { setAdditionalEvidenceFiles([{ uid: file.uid, name: file.name, status: "done", originFileObj: file }]); return false; }}
                fileList={additionalEvidenceFiles}
                maxCount={1}
                onRemove={() => { setAdditionalEvidenceFiles([]); return true; }}
              >
                <Button icon={<PaperClipOutlined />}>Chọn bằng chứng</Button>
              </Upload>
              <Button disabled={!additionalEvidenceFile} loading={evidenceMutation.isPending} onClick={() => evidenceMutation.mutate()} type="primary">Tải lên</Button>
            </Space> : null}
          </Card> : null}
        </Space> : null}
      </Drawer>

      <Modal
        okButtonProps={{ disabled: !canSubmitCase, loading: createMutation.isPending }}
        okText={domain === "complaints" ? "Gửi khiếu nại" : "Gửi kháng nghị"}
        onCancel={closeCreateForm}
        onOk={() => createMutation.mutate()}
        open={createOpen}
        title={domain === "complaints" ? "Gửi khiếu nại" : "Gửi kháng nghị"}
        width={breakpoints.md ? 520 : "calc(100vw - 24px)"}
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          {domain === "appeals" ? <Input onChange={(event) => setFields({ ...fields, decision_id: event.target.value })} placeholder="Mã định danh quyết định chứng nhận" value={fields.decision_id} /> : null}
          <Input onChange={(event) => setFields({ ...fields, name: event.target.value })} placeholder="Người gửi" value={fields.name} />
          <Input onChange={(event) => setFields({ ...fields, contact: event.target.value })} placeholder="Email / liên hệ" value={fields.contact} />
          {domain === "complaints" ? <Input onChange={(event) => setFields({ ...fields, subject: event.target.value })} placeholder="Chủ đề khiếu nại" value={fields.subject} /> : null}
          <TextArea onChange={(event) => setFields({ ...fields, description: event.target.value })} placeholder={domain === "complaints" ? "Mô tả khiếu nại" : "Nội dung kháng nghị"} rows={4} value={fields.description} />
          <Upload
            beforeUpload={(file) => { setCreateEvidenceFiles([{ uid: file.uid, name: file.name, status: "done", originFileObj: file }]); return false; }}
            fileList={createEvidenceFiles}
            maxCount={1}
            onRemove={() => { setCreateEvidenceFiles([]); return true; }}
          >
            <Button icon={<PaperClipOutlined />}>Đính kèm bằng chứng</Button>
          </Upload>
          <Alert title="Thông tin điều tra, trao đổi nội bộ và ghi chú phân tách nhiệm vụ chỉ dành cho nhân sự tổ chức chứng nhận." showIcon type="info" />
        </Space>
      </Modal>
    </div>
  );
}
