"use client";

import {
  CalendarOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { ResponsiveCardList, type ResponsiveCardItem } from "./design-system";

const { Text } = Typography;

interface ExpertResourceGovernancePanelProps {
  expertId: string;
  canManage: boolean;
}

interface AvailabilityPeriod {
  id: string;
  availability_type: string;
  start_datetime: string;
  end_datetime: string;
  reason?: string | null;
  note?: string | null;
  status: string;
  cancellation_reason?: string | null;
  created_at: string;
}

interface IndependenceConflict {
  id: string;
  customer_id: string;
  conflict_type?: string;
  description?: string;
  risk_level?: string | null;
  valid_from: string;
  valid_to?: string | null;
  declaration_status: string;
  independence_status: string;
  review_note?: string | null;
  mitigation_justification?: string | null;
  declared_at: string;
  customer?: {
    customer_code: string;
    company_name: string;
  } | null;
  declared_by_user?: { full_name?: string | null; username?: string | null } | null;
  reviewed_by_user?: { full_name?: string | null; username?: string | null } | null;
}

interface ResourceAction {
  id: string;
  action_type: string;
  entity_type: string;
  reason?: string | null;
  created_at: string;
  actor?: { full_name?: string | null; username?: string | null } | null;
}

interface ResourceOverview {
  requested_period: { start_datetime: string; end_datetime: string };
  workload: {
    assigned_mandays: number;
    engagement_count: number;
    occupied_days: number;
    overlapping_assignments: number;
    remote_workload_assignments: number;
    other_commitments: number;
    other_commitment_days: number;
    unavailable_days: number;
    leave_days: number;
    capacity_threshold_mandays: null;
    capacity_exceeded: boolean;
  };
  workload_assignments: Array<{
    id: string;
    plan_code?: string | null;
    audit_type?: string | null;
    start_date: string;
    end_date: string;
    planned_mandays?: number | string | null;
    workload_type: string;
  }>;
  availability_periods: AvailabilityPeriod[];
  independence_conflicts: IndependenceConflict[];
  action_history: ResourceAction[];
}

interface CustomerOption {
  id: string;
  customer_code: string;
  company_name: string;
}

interface AvailabilityFormValues {
  availability_type: string;
  period: [Dayjs, Dayjs];
  reason?: string;
  note?: string;
}

interface ConflictFormValues {
  customer_id: string;
  conflict_type: string;
  description: string;
  risk_level?: string;
  validity: [Dayjs, Dayjs | null];
}

interface ReviewFormValues {
  independence_status: string;
  review_note: string;
  mitigation_justification?: string;
}

interface CancelFormValues {
  reason: string;
}

const availabilityLabels: Record<string, string> = {
  AVAILABLE: "Sẵn sàng",
  UNAVAILABLE: "Không sẵn sàng",
  LEAVE: "Nghỉ phép",
  OTHER_COMMITMENT: "Cam kết công việc khác",
};

const conflictLabels: Record<string, string> = {
  EMPLOYMENT: "Quan hệ lao động",
  CONSULTANCY: "Tư vấn",
  FINANCIAL_INTEREST: "Lợi ích tài chính",
  CLOSE_RELATIONSHIP: "Quan hệ gần gũi",
  PRIOR_INVOLVEMENT: "Tham gia trước đây",
  SELF_REVIEW_RISK: "Nguy cơ tự xem xét",
  OTHER: "Khác",
};

const decisionLabels: Record<string, string> = {
  OPEN: "Chờ xem xét",
  CLEARED: "Được phép",
  RESTRICTED: "Hạn chế",
  PROHIBITED: "Cấm phân công",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}

function actorName(value?: { full_name?: string | null; username?: string | null } | null) {
  return value?.full_name || value?.username || "—";
}

function decisionTag(value: string) {
  const color: Record<string, string> = {
    OPEN: "gold",
    CLEARED: "green",
    RESTRICTED: "orange",
    PROHIBITED: "red",
  };
  return <Tag color={color[value] ?? "default"}>{decisionLabels[value] ?? value}</Tag>;
}

export default function ExpertResourceGovernancePanel({
  expertId,
  canManage,
}: ExpertResourceGovernancePanelProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("day"),
    dayjs().add(90, "day").startOf("day"),
  ]);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<IndependenceConflict | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    kind: "availability" | "conflict";
    id: string;
  } | null>(null);
  const [activeResourceTab, setActiveResourceTab] = useState("availability");
  const [mobileResourceOpen, setMobileResourceOpen] = useState(false);
  const [mobilePage, setMobilePage] = useState<{ tab: string; page: number }>({ tab: "availability", page: 1 });
  const [availabilityForm] = Form.useForm<AvailabilityFormValues>();
  const [conflictForm] = Form.useForm<ConflictFormValues>();
  const [reviewForm] = Form.useForm<ReviewFormValues>();
  const [cancelForm] = Form.useForm<CancelFormValues>();

  const startDate = range[0].format("YYYY-MM-DD");
  const endDate = range[1].format("YYYY-MM-DD");
  const resourceQuery = useQuery({
    queryKey: ["expert-resource-governance", expertId, startDate, endDate],
    queryFn: async () => (await api.get<ResourceOverview>(
      `/experts/${expertId}/resource-governance?start_date=${startDate}&end_date=${endDate}`,
    )).data,
  });
  const customersQuery = useQuery({
    queryKey: ["expert-resource-customers"],
    queryFn: async () => (await api.get<CustomerOption[]>("/experts/resource-customers")).data,
    enabled: canManage,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["expert-resource-governance", expertId] });
    await queryClient.invalidateQueries({ queryKey: ["expert-recommendations"] });
  };

  const createAvailabilityMutation = useMutation({
    mutationFn: async (values: AvailabilityFormValues) => (await api.post(
      `/experts/${expertId}/availability`,
      {
        availability_type: values.availability_type,
        start_datetime: values.period[0].format("YYYY-MM-DD"),
        end_datetime: values.period[1].format("YYYY-MM-DD"),
        reason: values.reason,
        note: values.note,
      },
    )).data,
    onSuccess: async () => {
      message.success("Đã ghi nhận lịch nguồn lực");
      setAvailabilityOpen(false);
      availabilityForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const cancelAvailabilityMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => (await api.post(
      `/experts/${expertId}/availability/${id}/cancel`,
      { reason },
    )).data,
    onSuccess: async () => {
      message.success("Đã hủy lịch và giữ lịch sử");
      setCancelTarget(null);
      cancelForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const declareConflictMutation = useMutation({
    mutationFn: async (values: ConflictFormValues) => (await api.post(
      `/experts/${expertId}/conflicts`,
      {
        customer_id: values.customer_id,
        conflict_type: values.conflict_type,
        description: values.description,
        risk_level: values.risk_level,
        valid_from: values.validity[0].format("YYYY-MM-DD"),
        valid_to: values.validity[1]?.format("YYYY-MM-DD"),
      },
    )).data,
    onSuccess: async () => {
      message.success("Đã ghi nhận conflict declaration");
      setConflictOpen(false);
      conflictForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const reviewConflictMutation = useMutation({
    mutationFn: async (values: ReviewFormValues) => (await api.post(
      `/experts/${expertId}/conflicts/${reviewTarget?.id}/review`,
      values,
    )).data,
    onSuccess: async () => {
      message.success("Đã lưu quyết định independence");
      setReviewTarget(null);
      reviewForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const cancelConflictMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => (await api.post(
      `/experts/${expertId}/conflicts/${id}/cancel`,
      { reason },
    )).data,
    onSuccess: async () => {
      message.success("Đã hủy declaration và giữ lịch sử");
      setCancelTarget(null);
      cancelForm.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const availabilityActionNode = (row: AvailabilityPeriod) => canManage && row.status === "ACTIVE" ? (
    <Button danger onClick={() => setCancelTarget({ kind: "availability", id: row.id })} size="small" type="text">Hủy</Button>
  ) : null;
  const conflictActionNode = (row: IndependenceConflict) => canManage && row.declaration_status === "ACTIVE" ? (
    <Space>
      <Button size="small" onClick={() => {
        reviewForm.setFieldsValue({
          independence_status: row.independence_status === "OPEN" ? "CLEARED" : row.independence_status,
          review_note: row.review_note ?? undefined,
          mitigation_justification: row.mitigation_justification ?? undefined,
        });
        setReviewTarget(row);
      }}>Review</Button>
      <Button danger onClick={() => setCancelTarget({ kind: "conflict", id: row.id })} size="small" type="text">Hủy</Button>
    </Space>
  ) : null;

  const availabilityColumns: TableColumnsType<AvailabilityPeriod> = [
    {
      title: "Loại lịch",
      dataIndex: "availability_type",
      width: 190,
      render: (value: string) => (
        <Tag color={value === "LEAVE" || value === "UNAVAILABLE" ? "red" : value === "OTHER_COMMITMENT" ? "gold" : "green"}>
          {availabilityLabels[value] ?? value}
        </Tag>
      ),
    },
    {
      title: "Thời gian",
      width: 220,
      render: (_, row) => `${formatDate(row.start_datetime)} – ${formatDate(row.end_datetime)}`,
    },
    { title: "Lý do", dataIndex: "reason", render: (value?: string | null) => value || "—" },
    { title: "Ghi chú", dataIndex: "note", render: (value?: string | null) => value || "—" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 130,
      render: (value: string) => <Tag color={value === "ACTIVE" ? "blue" : "default"}>{value === "ACTIVE" ? "Hiệu lực" : "Đã hủy"}</Tag>,
    },
    ...(canManage ? [{
      title: "",
      width: 90,
      render: (_: unknown, row: AvailabilityPeriod) => availabilityActionNode(row),
    }] : []),
  ];

  const conflictColumns: TableColumnsType<IndependenceConflict> = [
    {
      title: "Khách hàng",
      width: 240,
      render: (_, row) => row.customer
        ? `${row.customer.customer_code} · ${row.customer.company_name}`
        : row.customer_id,
    },
    ...(canManage ? [{
      title: "Conflict",
      dataIndex: "conflict_type",
      width: 180,
      render: (value: string) => conflictLabels[value] ?? value,
    }, {
      title: "Mô tả",
      dataIndex: "description",
      width: 280,
    }] : []),
    {
      title: "Hiệu lực",
      width: 190,
      render: (_, row) => `${formatDate(row.valid_from)} – ${row.valid_to ? formatDate(row.valid_to) : "Không giới hạn"}`,
    },
    {
      title: "Decision",
      dataIndex: "independence_status",
      width: 150,
      render: (value: string) => decisionTag(value),
    },
    ...(canManage ? [{
      title: "Review / mitigation",
      width: 280,
      render: (_: unknown, row: IndependenceConflict) => (
        <Space direction="vertical" size={0}>
          <Text>{row.review_note || "Chưa review"}</Text>
          {row.mitigation_justification ? <Text type="secondary">{row.mitigation_justification}</Text> : null}
        </Space>
      ),
    }] : []),
    ...(canManage ? [{
      title: "Thao tác",
      width: 160,
      fixed: "right" as const,
      render: (_: unknown, row: IndependenceConflict) => conflictActionNode(row),
    }] : []),
  ];

  const overview = resourceQuery.data;
  const availabilityCards: ResponsiveCardItem[] = (overview?.availability_periods ?? []).map((row) => ({
    key: row.id,
    title: availabilityLabels[row.availability_type] ?? row.availability_type,
    status: <Tag color={row.status === "ACTIVE" ? "blue" : "default"}>{row.status === "ACTIVE" ? "Hiệu lực" : "Đã hủy"}</Tag>,
    fields: [
      { key: "dates", label: "Thời gian", value: `${formatDate(row.start_datetime)} – ${formatDate(row.end_datetime)}` },
      { key: "reason", label: "Lý do", value: row.reason || "—" },
      { key: "note", label: "Ghi chú", value: row.note || "—" },
    ],
    actions: availabilityActionNode(row),
  }));
  const conflictCards: ResponsiveCardItem[] = (overview?.independence_conflicts ?? []).map((row) => ({
    key: row.id,
    title: row.customer ? `${row.customer.customer_code} · ${row.customer.company_name}` : row.customer_id,
    status: decisionTag(row.independence_status),
    fields: [
      ...(canManage ? [
        { key: "type", label: "Conflict", value: conflictLabels[row.conflict_type || ""] ?? row.conflict_type ?? "—" },
        { key: "description", label: "Mô tả", value: row.description || "—" },
      ] : []),
      { key: "dates", label: "Hiệu lực", value: `${formatDate(row.valid_from)} – ${row.valid_to ? formatDate(row.valid_to) : "Không giới hạn"}` },
      ...(canManage ? [{ key: "review", label: "Review / mitigation", value: <Space orientation="vertical" size={2}><span>{row.review_note || "Chưa review"}</span>{row.mitigation_justification ? <span>{row.mitigation_justification}</span> : null}</Space> }] : []),
    ],
    actions: conflictActionNode(row),
  }));
  const assignmentCards: ResponsiveCardItem[] = (overview?.workload_assignments ?? []).map((row) => ({
    key: row.id,
    title: row.plan_code || "Chưa có mã kế hoạch",
    status: <Tag color={row.workload_type === "OCCUPIED" ? "red" : "gold"}>{row.workload_type === "OCCUPIED" ? "Occupied" : "Remote warning"}</Tag>,
    fields: [
      { key: "type", label: "Loại", value: row.audit_type || "—" },
      { key: "dates", label: "Thời gian", value: `${formatDate(row.start_date)} – ${formatDate(row.end_date)}` },
      { key: "mandays", label: "MD", value: row.planned_mandays ?? "Derived theo ngày" },
    ],
  }));
  const actionCards: ResponsiveCardItem[] = (overview?.action_history ?? []).map((row) => ({
    key: row.id,
    title: row.action_type,
    fields: [
      { key: "date", label: "Thời điểm", value: dayjs(row.created_at).format("DD/MM/YYYY HH:mm") },
      { key: "actor", label: "Người thực hiện", value: actorName(row.actor) },
      { key: "reason", label: "Lý do / kết quả", value: row.reason || "—" },
    ],
  }));
  const renderMobileCards = (tab: string, cards: ResponsiveCardItem[], empty: string) => {
    const pageSize = 8;
    const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
    const page = Math.min(mobilePage.tab === tab ? mobilePage.page : 1, pageCount);
    return <>
      <ResponsiveCardList empty={<Empty description={empty} />} items={cards.slice((page - 1) * pageSize, page * pageSize)} />
      {cards.length > pageSize ? <Pagination className="expert-resource-mobile-pagination" current={page} onChange={(nextPage) => setMobilePage({ tab, page: nextPage })} pageSize={pageSize} showSizeChanger={false} total={cards.length} /> : null}
    </>;
  };

  return (
    <div className="expert-detail-stack">
      <Card size="small">
        <Space wrap>
          <Text strong>Khoảng xem nguồn lực</Text>
          <DatePicker.RangePicker
            allowClear={false}
            format="DD/MM/YYYY"
            onChange={(value) => {
              if (value?.[0] && value[1]) setRange([value[0], value[1]]);
            }}
            value={range}
          />
          <Text type="secondary">Capacity được tính từ assignment thực tế; chưa cấu hình ngưỡng MD toàn cục.</Text>
        </Space>
      </Card>

      <div className="expert-detail-kpis">
        <Card size="small"><Statistic title="Assigned MD" value={overview?.workload.assigned_mandays ?? 0} precision={1} /></Card>
        <Card size="small"><Statistic title="Audit engagements" value={overview?.workload.engagement_count ?? 0} /></Card>
        <Card size="small"><Statistic title="Ngày occupied" value={overview?.workload.occupied_days ?? 0} /></Card>
        <Card size="small"><Statistic title="Other commitments" value={overview?.workload.other_commitments ?? 0} /></Card>
      </div>

      <Select
        aria-label="Mục nguồn lực và độc lập"
        className="expert-resource-mobile-select"
        onChange={(tab) => { setActiveResourceTab(tab); setMobileResourceOpen(false); }}
        onOpenChange={setMobileResourceOpen}
        open={mobileResourceOpen}
        options={[
          { value: "availability", label: "Availability" },
          { value: "independence", label: "Independence" },
          { value: "resource-overview", label: "Resource overview" },
        ]}
        value={activeResourceTab}
      />
      <Tabs activeKey={activeResourceTab} className="expert-resource-tabs" onChange={setActiveResourceTab} items={[
        {
          key: "availability",
          label: <span><CalendarOutlined /> Availability</span>,
          children: (
            <Card
              className="expert-competency-tab-card"
              extra={canManage ? <Button icon={<PlusOutlined />} onClick={() => {
                availabilityForm.setFieldsValue({
                  availability_type: "UNAVAILABLE",
                  period: [dayjs(), dayjs()],
                });
                setAvailabilityOpen(true);
              }} type="primary">Thêm lịch</Button> : null}
              title="Lịch unavailable, nghỉ phép và cam kết khác"
            >
              <div className="expert-resource-responsive">
              <div className="cmp-data-table--responsive"><Table
                columns={availabilityColumns}
                dataSource={overview?.availability_periods ?? []}
                loading={resourceQuery.isLoading}
                locale={{ emptyText: <Empty description="Chưa có lịch nguồn lực" /> }}
                pagination={{ pageSize: 8 }}
                rowKey="id"
                scroll={{ x: 1100 }}
              /></div>
              {renderMobileCards("availability", availabilityCards, "Chưa có lịch nguồn lực")}
              </div>
            </Card>
          ),
        },
        {
          key: "independence",
          label: <span><SafetyCertificateOutlined /> Independence</span>,
          children: (
            <Card
              className="expert-competency-tab-card"
              extra={canManage ? <Button icon={<PlusOutlined />} onClick={() => {
                conflictForm.setFieldsValue({
                  conflict_type: "PRIOR_INVOLVEMENT",
                  risk_level: "MEDIUM",
                  validity: [dayjs(), null],
                });
                setConflictOpen(true);
              }} type="primary">Khai báo conflict</Button> : null}
              title="Conflict declaration và independence decision theo khách hàng"
            >
              <div className="expert-resource-responsive">
              <div className="cmp-data-table--responsive"><Table
                columns={conflictColumns}
                dataSource={overview?.independence_conflicts ?? []}
                loading={resourceQuery.isLoading}
                locale={{ emptyText: <Empty description="Chưa có khai báo independence" /> }}
                pagination={{ pageSize: 8 }}
                rowKey="id"
                scroll={{ x: 1450 }}
              /></div>
              {renderMobileCards("independence", conflictCards, "Chưa có khai báo independence")}
              </div>
            </Card>
          ),
        },
        {
          key: "resource-overview",
          label: <span><StopOutlined /> Resource overview</span>,
          children: (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Card title="Assignments và workload sắp tới">
                <div className="expert-resource-responsive">
                <div className="cmp-data-table--responsive"><Table
                  dataSource={overview?.workload_assignments ?? []}
                  columns={[
                    { title: "Audit plan", dataIndex: "plan_code", render: (value?: string | null) => value || "—" },
                    { title: "Loại", dataIndex: "audit_type", render: (value?: string | null) => value || "—" },
                    { title: "Thời gian", render: (_: unknown, row) => `${formatDate(row.start_date)} – ${formatDate(row.end_date)}` },
                    { title: "MD", dataIndex: "planned_mandays", render: (value?: number | string | null) => value ?? "Derived theo ngày" },
                    { title: "Tính chất", dataIndex: "workload_type", render: (value: string) => <Tag color={value === "OCCUPIED" ? "red" : "gold"}>{value === "OCCUPIED" ? "Occupied" : "Remote warning"}</Tag> },
                  ]}
                  locale={{ emptyText: <Empty description="Không có assignment trong khoảng xem" /> }}
                  pagination={false}
                  rowKey="id"
                /></div>
                {renderMobileCards("assignments", assignmentCards, "Không có assignment trong khoảng xem")}
                </div>
              </Card>
              <Card title="Lịch sử resource & independence">
                <div className="expert-resource-responsive">
                <div className="cmp-data-table--responsive"><Table
                  dataSource={overview?.action_history ?? []}
                  columns={[
                    { title: "Thời điểm", dataIndex: "created_at", width: 170, render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm") },
                    { title: "Hành động", dataIndex: "action_type", width: 220 },
                    { title: "Người thực hiện", dataIndex: "actor", width: 200, render: (value) => actorName(value) },
                    { title: "Lý do / kết quả", dataIndex: "reason", render: (value?: string | null) => value || "—" },
                  ]}
                  locale={{ emptyText: <Empty description="Chưa có lịch sử resource governance" /> }}
                  pagination={{ pageSize: 10 }}
                  rowKey="id"
                /></div>
                {renderMobileCards("history", actionCards, "Chưa có lịch sử resource governance")}
                </div>
              </Card>
            </Space>
          ),
        },
      ]} />

      <Modal
        confirmLoading={createAvailabilityMutation.isPending}
        okText="Lưu lịch"
        onCancel={() => setAvailabilityOpen(false)}
        onOk={() => void availabilityForm.validateFields().then((values) => createAvailabilityMutation.mutate(values))}
        open={availabilityOpen}
        title="Ghi nhận availability / commitment"
      >
        <Form form={availabilityForm} layout="vertical">
          <Form.Item label="Loại lịch" name="availability_type" rules={[{ required: true }]}>
            <Select options={Object.entries(availabilityLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item label="Khoảng thời gian" name="period" rules={[{ required: true }]}>
            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Lý do" name="reason"><Input /></Form.Item>
          <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={declareConflictMutation.isPending}
        okText="Ghi nhận declaration"
        onCancel={() => setConflictOpen(false)}
        onOk={() => void conflictForm.validateFields().then((values) => declareConflictMutation.mutate(values))}
        open={conflictOpen}
        title="Khai báo conflict of interest"
        width={720}
      >
        <Form form={conflictForm} layout="vertical">
          <Form.Item label="Khách hàng" name="customer_id" rules={[{ required: true }]}>
            <Select
              loading={customersQuery.isLoading}
              options={(customersQuery.data ?? []).map((customer) => ({
                value: customer.id,
                label: `${customer.customer_code} · ${customer.company_name}`,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="Loại conflict" name="conflict_type" rules={[{ required: true }]}>
            <Select options={Object.entries(conflictLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item label="Risk level" name="risk_level"><Select allowClear options={[
            { value: "LOW", label: "Thấp" },
            { value: "MEDIUM", label: "Trung bình" },
            { value: "HIGH", label: "Cao" },
            { value: "CRITICAL", label: "Nghiêm trọng" },
          ]} /></Form.Item>
          <Form.Item label="Hiệu lực (ngày kết thúc có thể để trống)" name="validity" rules={[{ required: true }]}>
            <DatePicker.RangePicker allowEmpty={[false, true]} format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Mô tả" name="description" rules={[{ required: true, min: 3 }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={reviewConflictMutation.isPending}
        okText="Lưu decision"
        onCancel={() => setReviewTarget(null)}
        onOk={() => void reviewForm.validateFields().then((values) => reviewConflictMutation.mutate(values))}
        open={Boolean(reviewTarget)}
        title="Independence decision"
      >
        <Form form={reviewForm} layout="vertical">
          <Form.Item label="Quyết định" name="independence_status" rules={[{ required: true }]}>
            <Select options={[
              { value: "CLEARED", label: "Được phép phân công" },
              { value: "RESTRICTED", label: "Hạn chế / cần xem xét" },
              { value: "PROHIBITED", label: "Cấm phân công" },
            ]} />
          </Form.Item>
          <Form.Item label="Nhận xét review" name="review_note" rules={[{ required: true, min: 3 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Biện pháp giảm thiểu / justification" name="mitigation_justification">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={cancelAvailabilityMutation.isPending || cancelConflictMutation.isPending}
        okButtonProps={{ danger: true }}
        okText="Xác nhận hủy"
        onCancel={() => {
          setCancelTarget(null);
          cancelForm.resetFields();
        }}
        onOk={() => void cancelForm.validateFields().then(({ reason }) => {
          if (!cancelTarget) return;
          if (cancelTarget.kind === "availability") {
            cancelAvailabilityMutation.mutate({ id: cancelTarget.id, reason });
          } else {
            cancelConflictMutation.mutate({ id: cancelTarget.id, reason });
          }
        })}
        open={Boolean(cancelTarget)}
        title={cancelTarget?.kind === "availability" ? "Hủy lịch nguồn lực" : "Hủy conflict declaration"}
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item label="Lý do hủy" name="reason" rules={[{ required: true, min: 3 }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
