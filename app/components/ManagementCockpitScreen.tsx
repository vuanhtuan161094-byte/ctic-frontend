"use client";

import {
  BarChartOutlined,
  DollarOutlined,
  DownloadOutlined,
  FileAddOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { api, getErrorMessage } from "../lib/api";

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

type PeriodPreset = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "QUARTER" | "YEAR" | "CUSTOM";
interface Kpi { key: string; label: string; definition: string; unit: string; value: number | string; numerator?: number; denominator?: number }
interface CurrencyMetrics { currency: string; pipeline_value: string; contracted_value: string; invoiced: string; collected: string; outstanding: string }
interface Cockpit {
  generated_at: string;
  filter_context: { preset: string; from: string; to_exclusive: string; timezone: string; scheme: { id: string; code: string; name: string } | null };
  executive: Kpi[];
  operations: { open_nc: number; overdue_nc: number; pending_technical_reviews: number; status_breakdowns: Record<string, Array<{ status: string | null; _count: { _all: number } }>> };
  commercial: { by_currency: CurrencyMetrics[]; mixed_currency_total: null };
  resource: { utilization_percentage: null; utilization_note: string; workload: Array<{ expert_id: string; expert_name: string; assigned_mandays: string; completed_mandays: string; engagement_count: number }> };
  governance: { open_changes: number; open_complaints: number; open_appeals: number; documents_by_status: Array<{ status: string | null; _count: { _all: number } }> };
}
interface Scheme { id: string; code: string; name: string }
interface Customer { id: string; customer_code: string; company_name: string }
interface Contract { id: string; contract_number: string; currency?: string | null; customers?: Customer }
interface Quotation {
  id: string; quotation_number: string; version_no: number; quotation_date: string; validity_date?: string | null;
  currency: string; total_amount: string; technical_approved_mandays?: string | null; status: string;
  customer: Customer; scheme?: Scheme | null; linked_contract?: { id: string; contract_number: string } | null;
}
interface BillingMilestone { id: string; milestone_name: string; milestone_type: string; planned_amount: string; paid_amount: string; currency: string; status: string; invoice_reference?: string | null; planned_date?: string | null; contract: { contract_number: string } }
interface PageResult<T> { items: T[]; total: number; page: number; page_size: number }

const money = (value: string, currency: string) => new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 4 }).format(Number(value));
const statusColor: Record<string, string> = { DRAFT: "default", UNDER_REVIEW: "blue", APPROVED: "cyan", SENT: "geekblue", ACCEPTED: "green", REJECTED: "red", EXPIRED: "orange", CANCELLED: "default", PAID: "green", PARTIALLY_PAID: "orange", INVOICED: "blue" };

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

export function ManagementCockpitScreen({ roles }: { roles: string[] }) {
  const normalizedRoles = roles.map((role) => role.trim().toUpperCase());
  const canManageCommercial = normalizedRoles.some((role) => ["ADMIN", "STAFF", "SALES"].includes(role));
  const [preset, setPreset] = useState<PeriodPreset>("THIS_MONTH");
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [schemeId, setSchemeId] = useState<string>();
  const [quotationPage, setQuotationPage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);
  const [quotationOpen, setQuotationOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quotationForm] = Form.useForm();
  const [billingForm] = Form.useForm();

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams({ preset });
    if (schemeId) params.set("scheme_id", schemeId);
    if (preset === "CUSTOM" && customRange) {
      params.set("from", customRange[0].format("YYYY-MM-DD"));
      params.set("to", customRange[1].format("YYYY-MM-DD"));
    }
    return params.toString();
  }, [customRange, preset, schemeId]);

  const cockpitQuery = useQuery({
    queryKey: ["management-cockpit", filterQuery],
    queryFn: async () => (await api.get<Cockpit>(`/commercial-management-reporting/cockpit?${filterQuery}`)).data,
    enabled: preset !== "CUSTOM" || Boolean(customRange),
  });
  const schemesQuery = useQuery({ queryKey: ["management-cockpit", "schemes"], queryFn: async () => (await api.get<Scheme[]>("/master-data-configuration/schemes?active_only=true")).data });
  const quotationsQuery = useQuery({ queryKey: ["commercial", "quotations", quotationPage], queryFn: async () => (await api.get<PageResult<Quotation>>(`/commercial-management-reporting/quotations?page=${quotationPage}&page_size=25`)).data });
  const billingQuery = useQuery({ queryKey: ["commercial", "billing", billingPage], queryFn: async () => (await api.get<PageResult<BillingMilestone>>(`/commercial-management-reporting/billing-milestones?page=${billingPage}&page_size=25`)).data });
  const customersQuery = useQuery({ queryKey: ["commercial", "customers"], queryFn: async () => (await api.get<Customer[]>("/customers")).data, enabled: canManageCommercial });
  const contractsQuery = useQuery({ queryKey: ["commercial", "contracts"], queryFn: async () => (await api.get<Contract[]>("/contracts")).data, enabled: canManageCommercial });

  const refresh = () => Promise.all([
    cockpitQuery.refetch(), quotationsQuery.refetch(), billingQuery.refetch(), schemesQuery.refetch(),
  ]);

  const exportCsv = async () => {
    try {
      const response = await api.get(`/commercial-management-reporting/cockpit/export.csv?${filterQuery}`, { responseType: "blob" });
      downloadBlob(response.data as Blob, `cmp-management-${dayjs().format("YYYYMMDD-HHmm")}.csv`);
      message.success("Đã xuất báo cáo theo đúng bộ lọc hiện tại.");
    } catch (error) { message.error(getErrorMessage(error)); }
  };

  const createQuotation = async () => {
    try {
      const values = await quotationForm.validateFields();
      setSaving(true);
      await api.post("/commercial-management-reporting/quotations", {
        quotation_number: values.quotation_number.trim(), customer_id: values.customer_id, scheme_id: values.scheme_id,
        quotation_date: values.quotation_date.format("YYYY-MM-DD"), validity_date: values.validity_date?.format("YYYY-MM-DD"),
        currency: values.currency.trim().toUpperCase(), discount_amount: values.discount_amount || "0", tax_amount: values.tax_amount || "0",
        commercial_notes: values.commercial_notes,
        lines: [{ description: values.line_description.trim(), quantity: String(values.quantity), unit_price: String(values.unit_price) }],
      });
      message.success("Đã tạo báo giá DRAFT.");
      setQuotationOpen(false); quotationForm.resetFields();
      await Promise.all([quotationsQuery.refetch(), cockpitQuery.refetch()]);
    } catch (error) { if (error instanceof Error || (error && typeof error === "object" && "response" in error)) message.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  const transitionQuotation = async (id: string, action: string) => {
    try {
      await api.post(`/commercial-management-reporting/quotations/${id}/transition`, { action });
      await Promise.all([quotationsQuery.refetch(), cockpitQuery.refetch()]);
      message.success("Đã cập nhật vòng đời báo giá.");
    } catch (error) { message.error(getErrorMessage(error)); }
  };

  const createBilling = async () => {
    try {
      const values = await billingForm.validateFields(); setSaving(true);
      await api.post("/commercial-management-reporting/billing-milestones", {
        contract_id: values.contract_id, milestone_type: values.milestone_type, milestone_name: values.milestone_name.trim(),
        planned_amount: String(values.planned_amount), currency: values.currency.trim().toUpperCase(),
        planned_date: values.planned_date?.format("YYYY-MM-DD"), note: values.note,
      });
      setBillingOpen(false); billingForm.resetFields();
      await Promise.all([billingQuery.refetch(), cockpitQuery.refetch()]); message.success("Đã tạo billing milestone.");
    } catch (error) { if (error instanceof Error || (error && typeof error === "object" && "response" in error)) message.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  const quotationColumns: TableColumnsType<Quotation> = [
    { title: "Báo giá", render: (_, row) => <Space direction="vertical" size={0}><Text strong>{row.quotation_number} · v{row.version_no}</Text><Text type="secondary">{row.customer.company_name}</Text></Space> },
    { title: "Scheme", render: (_, row) => row.scheme?.code ?? "—" },
    { title: "MD kỹ thuật", dataIndex: "technical_approved_mandays", render: (value) => value ?? "Không có snapshot" },
    { title: "Giá trị", render: (_, row) => money(row.total_amount, row.currency) },
    { title: "Trạng thái", dataIndex: "status", render: (value) => <Tag color={statusColor[value]}>{value}</Tag> },
    { title: "Hợp đồng", render: (_, row) => row.linked_contract?.contract_number ?? "—" },
    { title: "Thao tác", render: (_, row) => canManageCommercial ? <Space wrap>
      {row.status === "DRAFT" ? <Button size="small" onClick={() => void transitionQuotation(row.id, "SUBMIT_REVIEW")}>Gửi duyệt</Button> : null}
      {row.status === "UNDER_REVIEW" ? <Button size="small" onClick={() => void transitionQuotation(row.id, "APPROVE")}>Duyệt</Button> : null}
      {row.status === "APPROVED" ? <Button size="small" onClick={() => void transitionQuotation(row.id, "SEND")}>Đã gửi</Button> : null}
      {row.status === "SENT" ? <Button size="small" type="primary" onClick={() => void transitionQuotation(row.id, "ACCEPT")}>Chấp nhận</Button> : null}
    </Space> : null },
  ];
  const billingColumns: TableColumnsType<BillingMilestone> = [
    { title: "Mốc", render: (_, row) => <Space direction="vertical" size={0}><Text strong>{row.milestone_name}</Text><Text type="secondary">{row.contract.contract_number}</Text></Space> },
    { title: "Kế hoạch", render: (_, row) => money(row.planned_amount, row.currency) },
    { title: "Đã thu", render: (_, row) => money(row.paid_amount, row.currency) },
    { title: "Tham chiếu hóa đơn", dataIndex: "invoice_reference", render: (value) => value ?? "—" },
    { title: "Trạng thái", dataIndex: "status", render: (value) => <Tag color={statusColor[value]}>{value}</Tag> },
  ];

  const cockpit = cockpitQuery.data;
  return <div className="management-cockpit-screen">
    <div className="page-heading management-cockpit-heading">
      <div><span className="eyebrow">COMMERCIAL & MANAGEMENT BI</span><Title level={2}>Buồng lái quản trị</Title><Text type="secondary">KPI do backend định nghĩa, dữ liệu giao dịch là nguồn sự thật.</Text></div>
      <Space wrap>
        <Select aria-label="Khoảng báo cáo" value={preset} onChange={setPreset} options={[
          { value: "TODAY", label: "Hôm nay" }, { value: "THIS_WEEK", label: "Tuần này" }, { value: "THIS_MONTH", label: "Tháng này" },
          { value: "QUARTER", label: "Quý này" }, { value: "YEAR", label: "Năm nay" }, { value: "CUSTOM", label: "Tùy chỉnh" },
        ]} />
        {preset === "CUSTOM" ? <RangePicker aria-label="Khoảng tùy chỉnh" value={customRange} onChange={(value) => setCustomRange(value as [Dayjs, Dayjs] | null)} /> : null}
        <Select allowClear aria-label="Lọc scheme" placeholder="Tất cả scheme" value={schemeId} onChange={setSchemeId} options={(schemesQuery.data ?? []).map((scheme) => ({ value: scheme.id, label: `${scheme.code} · ${scheme.name}` }))} />
        <Button icon={<DownloadOutlined />} disabled={!cockpit} onClick={() => void exportCsv()}>Xuất CSV</Button>
        <Button icon={<ReloadOutlined />} loading={cockpitQuery.isFetching} onClick={() => void refresh()}>Làm mới</Button>
      </Space>
    </div>
    {cockpitQuery.isError ? <Alert showIcon type="error" message="Không thể tải cockpit" description={getErrorMessage(cockpitQuery.error)} /> : null}
    {cockpit ? <Tabs items={[
      { key: "executive", label: "Điều hành", children: <>
        <section className="management-kpi-grid" aria-label="KPI điều hành">{cockpit.executive.map((kpi) => <Card key={kpi.key} title={kpi.label}><Statistic value={kpi.value} /><Text type="secondary">{kpi.definition}</Text>{kpi.denominator !== undefined ? <div><Tag>{kpi.numerator}/{kpi.denominator}</Tag></div> : null}</Card>)}</section>
        <section className="management-detail-grid">
          <Card title="Vận hành chứng nhận"><Descriptions column={1}><Descriptions.Item label="NC đang mở">{cockpit.operations.open_nc}</Descriptions.Item><Descriptions.Item label="NC quá hạn">{cockpit.operations.overdue_nc}</Descriptions.Item><Descriptions.Item label="Chờ thẩm xét kỹ thuật">{cockpit.operations.pending_technical_reviews}</Descriptions.Item></Descriptions></Card>
          <Card title="Chất lượng & quản trị"><Descriptions column={1}><Descriptions.Item label="Change case đang mở">{cockpit.governance.open_changes}</Descriptions.Item><Descriptions.Item label="Complaint đang mở">{cockpit.governance.open_complaints}</Descriptions.Item><Descriptions.Item label="Appeal đang mở">{cockpit.governance.open_appeals}</Descriptions.Item></Descriptions></Card>
        </section>
      </> },
      { key: "commercial", label: "Commercial", children: <>
        <Alert showIcon type="info" message="Mọi tổng tiền được nhóm theo currency; CMP không tự quy đổi FX và không gọi contract value là revenue recognized." />
        <section className="commercial-currency-grid">{cockpit.commercial.by_currency.map((item) => <Card key={item.currency} title={`Commercial · ${item.currency}`}><Descriptions column={1}><Descriptions.Item label="Pipeline">{money(item.pipeline_value, item.currency)}</Descriptions.Item><Descriptions.Item label="Đã ký">{money(item.contracted_value, item.currency)}</Descriptions.Item><Descriptions.Item label="Đã lập tham chiếu hóa đơn">{money(item.invoiced, item.currency)}</Descriptions.Item><Descriptions.Item label="Đã thu">{money(item.collected, item.currency)}</Descriptions.Item><Descriptions.Item label="Còn phải thu">{money(item.outstanding, item.currency)}</Descriptions.Item></Descriptions></Card>)}</section>
        {!cockpit.commercial.by_currency.length ? <Card>Chưa có dữ liệu commercial trong bộ lọc.</Card> : null}
      </> },
      { key: "resource", label: "Nguồn lực", children: <Card title="Workload chuyên gia" extra={<Tag color="orange">Không suy diễn utilization %</Tag>}><Alert showIcon type="warning" message={cockpit.resource.utilization_note} /><Table pagination={{ pageSize: 10 }} rowKey="expert_id" dataSource={cockpit.resource.workload} columns={[{ title: "Chuyên gia", dataIndex: "expert_name" }, { title: "MD phân công", dataIndex: "assigned_mandays" }, { title: "MD hoàn tất", dataIndex: "completed_mandays" }, { title: "Engagement", dataIndex: "engagement_count" }]} /></Card> },
      { key: "quotations", label: "Báo giá", children: <Card title="Báo giá / proposal" extra={canManageCommercial ? <Button icon={<FileAddOutlined />} type="primary" onClick={() => setQuotationOpen(true)}>Tạo báo giá</Button> : null}><Table columns={quotationColumns} dataSource={quotationsQuery.data?.items ?? []} loading={quotationsQuery.isLoading} onChange={(pagination) => setQuotationPage(pagination.current ?? 1)} pagination={{ current: quotationPage, total: quotationsQuery.data?.total, pageSize: quotationsQuery.data?.page_size ?? 25 }} rowKey="id" scroll={{ x: 1100 }} /></Card> },
      { key: "billing", label: "Billing", children: <Card title="Mốc lập hóa đơn / thanh toán" extra={canManageCommercial ? <Button icon={<DollarOutlined />} onClick={() => setBillingOpen(true)}>Tạo milestone</Button> : null}><Table columns={billingColumns} dataSource={billingQuery.data?.items ?? []} loading={billingQuery.isLoading} onChange={(pagination) => setBillingPage(pagination.current ?? 1)} pagination={{ current: billingPage, total: billingQuery.data?.total, pageSize: billingQuery.data?.page_size ?? 25 }} rowKey="id" /></Card> },
    ]} /> : <Card loading={cockpitQuery.isLoading}><BarChartOutlined /> Chọn đủ bộ lọc để tải KPI.</Card>}

    <Modal title="Tạo báo giá" open={quotationOpen} onCancel={() => setQuotationOpen(false)} onOk={() => void createQuotation()} confirmLoading={saving} okText="Tạo DRAFT">
      <Form form={quotationForm} layout="vertical" initialValues={{ quotation_date: dayjs(), currency: "VND", quantity: "1", discount_amount: "0", tax_amount: "0" }}>
        <Form.Item label="Số báo giá" name="quotation_number" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="Khách hàng" name="customer_id" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={(customersQuery.data ?? []).map((customer) => ({ value: customer.id, label: `${customer.customer_code} · ${customer.company_name}` }))} /></Form.Item>
        <Form.Item label="Scheme" name="scheme_id"><Select allowClear options={(schemesQuery.data ?? []).map((scheme) => ({ value: scheme.id, label: `${scheme.code} · ${scheme.name}` }))} /></Form.Item>
        <Space style={{ width: "100%" }}><Form.Item label="Ngày báo giá" name="quotation_date" rules={[{ required: true }]}><DatePicker /></Form.Item><Form.Item label="Hiệu lực đến" name="validity_date"><DatePicker /></Form.Item><Form.Item label="Currency" name="currency" rules={[{ required: true }]}><Input maxLength={3} /></Form.Item></Space>
        <Form.Item label="Dòng dịch vụ" name="line_description" rules={[{ required: true }]}><Input /></Form.Item>
        <Space><Form.Item label="Số lượng" name="quantity" rules={[{ required: true }]}><Input inputMode="decimal" /></Form.Item><Form.Item label="Đơn giá" name="unit_price" rules={[{ required: true }]}><Input inputMode="decimal" /></Form.Item><Form.Item label="Chiết khấu" name="discount_amount"><Input inputMode="decimal" /></Form.Item><Form.Item label="Thuế metadata" name="tax_amount"><Input inputMode="decimal" /></Form.Item></Space>
        <Form.Item label="Ghi chú commercial" name="commercial_notes"><Input.TextArea rows={2} /></Form.Item>
        <Alert showIcon type="info" message="Manday kỹ thuật (nếu có) được backend đọc từ Application Review APPROVED; form commercial không được nhập/sửa manday." />
      </Form>
    </Modal>
    <Modal title="Tạo billing milestone" open={billingOpen} onCancel={() => setBillingOpen(false)} onOk={() => void createBilling()} confirmLoading={saving}>
      <Form form={billingForm} layout="vertical" initialValues={{ milestone_type: "CONTRACT_SIGNING", currency: "VND" }}>
        <Form.Item label="Hợp đồng" name="contract_id" rules={[{ required: true }]}><Select options={(contractsQuery.data ?? []).map((contract) => ({ value: contract.id, label: `${contract.contract_number} · ${contract.customers?.company_name ?? ""}` }))} /></Form.Item>
        <Form.Item label="Loại mốc" name="milestone_type" rules={[{ required: true }]}><Select options={["CONTRACT_SIGNING", "STAGE_1", "STAGE_2", "SURVEILLANCE", "RECERTIFICATION", "CERTIFICATE_ISSUANCE", "CUSTOM"].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item label="Tên mốc" name="milestone_name" rules={[{ required: true }]}><Input /></Form.Item>
        <Space><Form.Item label="Giá trị kế hoạch" name="planned_amount" rules={[{ required: true }]}><Input inputMode="decimal" /></Form.Item><Form.Item label="Currency" name="currency" rules={[{ required: true }]}><Input maxLength={3} /></Form.Item><Form.Item label="Ngày kế hoạch" name="planned_date"><DatePicker /></Form.Item></Space>
        <Form.Item label="Ghi chú" name="note"><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </Modal>
  </div>;
}
