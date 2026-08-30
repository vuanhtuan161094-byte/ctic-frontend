"use client";

import {
  AuditOutlined,
  EyeOutlined,
  FileProtectOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { openDocumentFile } from "../lib/document-file-client";

const { Text, Title } = Typography;
const { TextArea } = Input;

type Domain = "changes" | "special-audits" | "complaints" | "appeals";
type ActionKind =
  | "change-assessment"
  | "special-plan"
  | "special-result"
  | "complaint-assign"
  | "complaint-investigate"
  | "complaint-close"
  | "appeal-assign"
  | "appeal-review"
  | "appeal-decision";

interface EvidenceFile {
  id: string;
  original_name: string;
  file_size: number;
  sha256: string | null;
  note: string | null;
}

interface GovernanceCase {
  id: string;
  case_number?: string;
  complaint_number?: string;
  appeal_number?: string;
  status: string;
  customer_id?: string | null;
  project_id?: string | null;
  owner_id?: string | null;
  investigator_id?: string | null;
  reviewer_id?: string | null;
  decision_owner_id?: string | null;
  description?: string | null;
  subject?: string | null;
  reason?: string | null;
  grounds?: string | null;
  trigger_type?: string | null;
  change_type?: string | null;
  assessment_outcome?: string | null;
  follow_up_action?: string | null;
  outcome?: string | null;
  acknowledgement_due?: string | null;
  investigation_due?: string | null;
  review_due?: string | null;
  response_due?: string | null;
  overdue?: boolean;
  created_at: string;
  updated_at: string;
  evidence?: EvidenceFile[];
  [key: string]: unknown;
}

interface HistoryItem {
  id: string;
  action: string;
  user_id: string | null;
  outcome: string | null;
  created_at: string;
}

const domainMeta: Record<Domain, { label: string; icon: React.ReactNode; entity: string }> = {
  changes: { label: "Yêu cầu thay đổi", icon: <FileProtectOutlined />, entity: "certification_change_case" },
  "special-audits": { label: "Đánh giá đặc biệt", icon: <AuditOutlined />, entity: "special_audit_case" },
  complaints: { label: "Khiếu nại", icon: <WarningOutlined />, entity: "complaint_case" },
  appeals: { label: "Kháng nghị", icon: <SafetyCertificateOutlined />, entity: "appeal_case" },
};

const finalStatuses = new Set(["COMPLETED", "CLOSED", "REJECTED", "CANCELLED", "OUT_OF_SCOPE"]);

function numberOf(record: GovernanceCase) {
  return record.case_number || record.complaint_number || record.appeal_number || record.id;
}

function summaryOf(record: GovernanceCase) {
  return record.subject || record.description || record.reason || record.grounds || "—";
}

function dueOf(record: GovernanceCase) {
  return record.response_due || record.investigation_due || record.review_due || record.acknowledgement_due;
}

function formatDate(value?: string | null) {
  return value && dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—";
}

export function GovernanceCasesScreen() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState<Domain>("changes");
  const [status, setStatus] = useState<string>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GovernanceCase | null>(null);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [impactFlags, setImpactFlags] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ["governance-cases", domain, status, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      return (await api.get<GovernanceCase[]>(`/governance-cases/${domain}?${params}`)).data;
    },
  });

  const history = useQuery({
    queryKey: ["governance-case-history", domain, selected?.id],
    enabled: Boolean(selected),
    queryFn: async () => (
      await api.get<HistoryItem[]>(`/governance-cases/${domainMeta[domain].entity}/${selected!.id}/history`)
    ).data,
  });

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !action) throw new Error("Chưa chọn action.");
      const id = selected.id;
      if (action === "change-assessment") {
        const special = fields.outcome === "SPECIAL_AUDIT_REQUIRED";
        return api.post(`/governance-cases/changes/${id}/assessment`, {
          outcome: fields.outcome,
          scope_change: impactFlags.includes("scope_change"),
          site_population_change: impactFlags.includes("site_population_change"),
          manday_recalculation_required: impactFlags.includes("manday_recalculation_required"),
          competency_change_required: impactFlags.includes("competency_change_required"),
          special_audit_required: special,
          suspension_consideration_required: impactFlags.includes("suspension_consideration_required"),
          commercial_update_required: impactFlags.includes("commercial_update_required"),
          document_update_required: impactFlags.includes("document_update_required"),
          rationale: fields.note,
          special_audit_trigger_type: fields.trigger_type,
          special_audit_scope: special ? fields.audit_scope : undefined,
        });
      }
      if (action === "special-plan") return api.post(`/governance-cases/special-audits/${id}/plan`, { audit_plan_id: fields.plan_id });
      if (action === "special-result") return api.post(`/governance-cases/special-audits/${id}/result`, { result: fields.note, follow_up_action: fields.follow_up_action });
      if (action === "complaint-assign") return api.post(`/governance-cases/complaints/${id}/assign`, {
        owner_id: fields.owner_id, investigator_id: fields.investigator_id,
        decision_owner_id: fields.decision_owner_id, independence_note: fields.note,
      });
      if (action === "complaint-investigate") return api.post(`/governance-cases/complaints/${id}/investigation`, {
        investigation: fields.note, findings: fields.findings, corrective_actions: fields.actions,
        internal_notes: fields.internal_notes,
      });
      if (action === "complaint-close") return api.post(`/governance-cases/complaints/${id}/close`, {
        outcome_status: fields.outcome_status, final_response: fields.note, closure_note: fields.closure_note,
      });
      if (action === "appeal-assign") return api.post(`/governance-cases/appeals/${id}/assign`, {
        owner_id: fields.owner_id, reviewer_id: fields.reviewer_id,
        decision_owner_id: fields.decision_owner_id, independence_note: fields.note,
      });
      if (action === "appeal-review") return api.post(`/governance-cases/appeals/${id}/review`, {
        review_notes: fields.note, internal_deliberation: fields.internal_notes,
      });
      return api.post(`/governance-cases/appeals/${id}/decision`, {
        outcome: fields.outcome, required_action: fields.required_action, final_response: fields.note,
      });
    },
    onSuccess: async () => {
      message.success("Đã ghi nhận action có kiểm soát.");
      setAction(null);
      setFields({});
      setSelected(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["governance-cases"] }),
        queryClient.invalidateQueries({ queryKey: ["my-work"] }),
      ]);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const acknowledge = useMutation({
    mutationFn: (id: string) => api.post(`/governance-cases/complaints/${id}/acknowledge`),
    onSuccess: async () => {
      message.success("Đã xác nhận tiếp nhận complaint.");
      await queryClient.invalidateQueries({ queryKey: ["governance-cases"] });
      setSelected(null);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: TableColumnsType<GovernanceCase> = useMemo(() => [
    { title: "Số case", key: "number", width: 180, render: (_, record) => <Text strong>{numberOf(record)}</Text> },
    { title: "Nội dung", key: "summary", ellipsis: true, render: (_, record) => summaryOf(record) },
    { title: "Owner", dataIndex: "owner_id", key: "owner", width: 160, ellipsis: true, render: (value) => value || "Chưa phân công" },
    {
      title: "Due date", key: "due", width: 150,
      render: (_, record) => <Text type={record.overdue ? "danger" : undefined}>{formatDate(dueOf(record))}</Text>,
    },
    { title: "Trạng thái", dataIndex: "status", key: "status", width: 160, render: (value) => <Tag color={finalStatuses.has(value) ? "default" : "processing"}>{value}</Tag> },
    { title: "", key: "action", width: 90, render: (_, record) => <Button icon={<EyeOutlined />} onClick={() => setSelected(record)} size="small">Xem</Button> },
  ], []);

  const openAction = (kind: ActionKind, defaults: Record<string, string> = {}) => {
    setFields(defaults);
    setImpactFlags([]);
    setAction(kind);
  };

  const actionButtons = selected ? (
    <Space wrap>
      {domain === "changes" && !selected.assessment_outcome ? <Button onClick={() => openAction("change-assessment", { outcome: "NO_CERTIFICATION_IMPACT" })} type="primary">Đánh giá tác động</Button> : null}
      {domain === "special-audits" && !selected.audit_plan_id ? <Button onClick={() => openAction("special-plan")}>Liên kết PLAN</Button> : null}
      {domain === "special-audits" && selected.audit_plan_id && !selected.result ? <Button onClick={() => openAction("special-result", { follow_up_action: "NONE" })} type="primary">Ghi kết quả</Button> : null}
      {domain === "complaints" && !selected.investigator_id ? <Button onClick={() => openAction("complaint-assign")}>Phân công / SoD</Button> : null}
      {domain === "complaints" && !selected.acknowledgement_date ? <Button loading={acknowledge.isPending} onClick={() => acknowledge.mutate(selected.id)}>Xác nhận tiếp nhận</Button> : null}
      {domain === "complaints" && selected.investigator_id && !selected.investigation ? <Button onClick={() => openAction("complaint-investigate")} type="primary">Cập nhật điều tra</Button> : null}
      {domain === "complaints" && selected.investigation && !finalStatuses.has(selected.status) ? <Button onClick={() => openAction("complaint-close", { outcome_status: "CLOSED" })} type="primary">Chốt phản hồi</Button> : null}
      {domain === "appeals" && !selected.reviewer_id ? <Button onClick={() => openAction("appeal-assign")}>Phân công / SoD</Button> : null}
      {domain === "appeals" && selected.reviewer_id && !selected.review_notes ? <Button onClick={() => openAction("appeal-review")} type="primary">Thẩm xét appeal</Button> : null}
      {domain === "appeals" && selected.review_notes && !selected.outcome ? <Button onClick={() => openAction("appeal-decision", { outcome: "DISMISSED", required_action: "NONE" })} type="primary">Quyết định appeal</Button> : null}
    </Space>
  ) : null;

  return (
    <div className="projects-screen governance-cases-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">GOVERNANCE</span>
          <Title level={2}>Thay đổi & Case</Title>
          <Text type="secondary">Một workspace chung, bốn domain tách biệt và đúng authority.</Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button>
      </div>

      <Card>
        <Tabs activeKey={domain} items={Object.entries(domainMeta).map(([key, meta]) => ({ key, label: <Space>{meta.icon}{meta.label}</Space> }))} onChange={(key) => { setDomain(key as Domain); setSelected(null); }} />
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search allowClear onSearch={setSearch} placeholder="Tìm số case hoặc nội dung" style={{ width: 300 }} />
          <Select allowClear onChange={setStatus} placeholder="Trạng thái" style={{ width: 200 }} options={[
            "SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED", "OPEN", "PLANNED", "INVESTIGATING",
            "RESPONSE_PENDING", "DECISION_PENDING", "COMPLETED", "CLOSED", "REJECTED", "OUT_OF_SCOPE",
          ].map((value) => ({ value, label: value }))} />
        </Space>
        {query.isError ? <Alert description={getErrorMessage(query.error)} message="Không tải được case" showIcon type="error" /> : (
          <Table columns={columns} dataSource={query.data ?? []} loading={query.isLoading} locale={{ emptyText: <Empty description="Không có case phù hợp" /> }} pagination={{ pageSize: 20 }} rowKey="id" />
        )}
      </Card>

      <Drawer onClose={() => setSelected(null)} open={Boolean(selected)} title={selected ? numberOf(selected) : "Chi tiết case"} width={760}>
        {selected ? <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {selected.overdue ? <Alert message="Case đang quá hạn theo due date đã cấu hình" showIcon type="warning" /> : null}
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Domain">{domainMeta[domain].label}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái"><Tag>{selected.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="Nội dung">{summaryOf(selected)}</Descriptions.Item>
            <Descriptions.Item label="Owner">{selected.owner_id || "Chưa phân công"}</Descriptions.Item>
            <Descriptions.Item label="Investigator / Reviewer">{selected.investigator_id || selected.reviewer_id || "—"}</Descriptions.Item>
            <Descriptions.Item label="Decision owner">{selected.decision_owner_id || "—"}</Descriptions.Item>
            <Descriptions.Item label="Due date">{formatDate(dueOf(selected))}</Descriptions.Item>
            <Descriptions.Item label="Kết quả">{selected.assessment_outcome || selected.follow_up_action || selected.outcome || "—"}</Descriptions.Item>
          </Descriptions>
          {actionButtons}
          <Card size="small" title="Evidence attachments">
            {selected.evidence?.length ? <List dataSource={selected.evidence} renderItem={(file) => <List.Item actions={[<Button key="open" onClick={() => void openDocumentFile({ url: `/document-files/${file.id}/download`, filename: file.original_name, title: file.original_name })}>Mở</Button>]}><List.Item.Meta title={file.original_name} description={file.sha256 ? `SHA-256: ${file.sha256.slice(0, 12)}…` : "Chưa neo hash"} /></List.Item>} /> : <Empty description="Chưa có evidence" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
          <Card size="small" title={<Space><HistoryOutlined />Lịch sử audit_log</Space>}>
            <List dataSource={history.data ?? []} loading={history.isLoading} locale={{ emptyText: "Chưa có lịch sử" }} renderItem={(item) => <List.Item><List.Item.Meta title={item.action} description={`${formatDate(item.created_at)} · ${item.user_id || "system"}`} /></List.Item>} />
          </Card>
        </Space> : null}
      </Drawer>

      <Modal confirmLoading={actionMutation.isPending} onCancel={() => setAction(null)} onOk={() => actionMutation.mutate()} open={Boolean(action)} title="Action có kiểm soát" width={680}>
        <Space direction="vertical" style={{ width: "100%" }}>
          {action === "change-assessment" ? <>
            <Select onChange={(value) => setFields({ ...fields, outcome: value })} style={{ width: "100%" }} value={fields.outcome} options={[
              "NO_CERTIFICATION_IMPACT", "DOCUMENT_UPDATE_ONLY", "TECHNICAL_REVIEW_REQUIRED", "SPECIAL_AUDIT_REQUIRED",
              "CERTIFICATE_AMENDMENT_REQUIRED", "EXTENSION_REQUIRED", "REDUCTION_REQUIRED", "SUSPENSION_REVIEW_REQUIRED",
            ].map((value) => ({ value, label: value }))} />
            <Checkbox.Group onChange={(values) => setImpactFlags(values as string[])} options={[
              "scope_change", "site_population_change", "manday_recalculation_required", "competency_change_required",
              "suspension_consideration_required", "commercial_update_required", "document_update_required",
            ]} value={impactFlags} />
            {fields.outcome === "SPECIAL_AUDIT_REQUIRED" ? <Input onChange={(event) => setFields({ ...fields, audit_scope: event.target.value })} placeholder="Phạm vi special audit" value={fields.audit_scope} /> : null}
          </> : null}
          {action === "special-plan" ? <Input onChange={(event) => setFields({ ...fields, plan_id: event.target.value })} placeholder="Audit PLAN UUID" value={fields.plan_id} /> : null}
          {action === "special-result" ? <Select onChange={(value) => setFields({ ...fields, follow_up_action: value })} style={{ width: "100%" }} value={fields.follow_up_action} options={["NONE", "MAINTAIN", "AMEND", "EXTEND_SCOPE", "REDUCE_SCOPE", "SUSPEND", "RESTORE", "WITHDRAW"].map((value) => ({ value, label: value }))} /> : null}
          {["complaint-assign", "appeal-assign"].includes(action ?? "") ? <>
            <Input onChange={(event) => setFields({ ...fields, owner_id: event.target.value })} placeholder="Owner UUID" value={fields.owner_id} />
            {action === "complaint-assign" ? <Input onChange={(event) => setFields({ ...fields, investigator_id: event.target.value })} placeholder="Investigator UUID" value={fields.investigator_id} /> : <Input onChange={(event) => setFields({ ...fields, reviewer_id: event.target.value })} placeholder="Reviewer UUID" value={fields.reviewer_id} />}
            <Input onChange={(event) => setFields({ ...fields, decision_owner_id: event.target.value })} placeholder="Independent decision owner UUID" value={fields.decision_owner_id} />
          </> : null}
          {action === "complaint-investigate" ? <>
            <Input onChange={(event) => setFields({ ...fields, findings: event.target.value })} placeholder="Findings" value={fields.findings} />
            <Input onChange={(event) => setFields({ ...fields, actions: event.target.value })} placeholder="Actions" value={fields.actions} />
            <TextArea onChange={(event) => setFields({ ...fields, internal_notes: event.target.value })} placeholder="Internal notes — không hiển thị cho khách hàng" rows={3} value={fields.internal_notes} />
          </> : null}
          {action === "complaint-close" ? <Select onChange={(value) => setFields({ ...fields, outcome_status: value })} style={{ width: "100%" }} value={fields.outcome_status} options={["CLOSED", "REJECTED", "OUT_OF_SCOPE"].map((value) => ({ value, label: value }))} /> : null}
          {action === "appeal-review" ? <TextArea onChange={(event) => setFields({ ...fields, internal_notes: event.target.value })} placeholder="Internal deliberation — không hiển thị cho khách hàng" rows={3} value={fields.internal_notes} /> : null}
          {action === "appeal-decision" ? <>
            <Select onChange={(value) => setFields({ ...fields, outcome: value })} style={{ width: "100%" }} value={fields.outcome} options={["UPHELD", "PARTIALLY_UPHELD", "DISMISSED", "OUT_OF_SCOPE"].map((value) => ({ value, label: value }))} />
            <Select onChange={(value) => setFields({ ...fields, required_action: value })} style={{ width: "100%" }} value={fields.required_action} options={["NONE", "AMEND", "EXTEND_SCOPE", "REDUCE_SCOPE", "SUSPEND", "RESTORE", "WITHDRAW", "NEW_CERTIFICATION_DECISION"].map((value) => ({ value, label: value }))} />
          </> : null}
          {action !== "special-plan" ? <TextArea onChange={(event) => setFields({ ...fields, note: event.target.value })} placeholder="Rationale / nội dung xử lý / final response" rows={4} value={fields.note} /> : null}
        </Space>
      </Modal>
    </div>
  );
}
