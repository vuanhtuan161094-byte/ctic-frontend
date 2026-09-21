"use client";

import {
  CheckCircleOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Col,
  Collapse,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { DataTable, LoadingSkeleton } from "./design-system";
import "./configuration-workspaces.css";

const { Text } = Typography;

type IafScope = { id: string; iaf_code: string; iaf_name: string; is_active: boolean };
type Scheme = { id: string; code: string; name: string; status: string };
type StandardEdition = {
  id: string;
  scheme_id: string;
  standard_code: string;
  standard_name: string;
  edition: string;
  status: string;
  effective_from: string;
  withdrawn_at?: string | null;
  scheme: Scheme;
};
type Capability = {
  id: string;
  program_code: string;
  program_name: string;
  standard_edition_id?: string | null;
  iaf_scope_id: string;
  status: "ACTIVE" | "INACTIVE";
  effective_from: string;
  effective_to?: string | null;
  notes?: string | null;
  iaf_scope: IafScope;
  standard_edition?: StandardEdition | null;
};
type BatchForm = {
  standard_edition_id: string;
  iaf_scope_ids: string[];
  status: "ACTIVE" | "INACTIVE";
  effective_from: Dayjs;
  effective_to?: Dayjs;
  notes?: string;
};
type EditForm = {
  status: "ACTIVE" | "INACTIVE";
  effective_from: Dayjs;
  effective_to?: Dayjs;
  notes?: string;
};

function formatStandardCode(standard: StandardEdition) {
  const code = standard.standard_code.trim();
  const edition = standard.edition.trim();
  if (!edition) return code;
  const normalized = code.toLocaleLowerCase();
  const normalizedEdition = edition.toLocaleLowerCase();
  if (
    normalized.endsWith(`:${normalizedEdition}`)
    || normalized.endsWith(` ${normalizedEdition}`)
    || normalized.endsWith(`-${normalizedEdition}`)
    || normalized.endsWith(`/${normalizedEdition}`)
  ) {
    return code;
  }
  return `${code}:${edition}`;
}

function standardLabel(standard?: StandardEdition | null, fallback?: string) {
  if (!standard) return fallback || "Dữ liệu cũ theo chương trình";
  return formatStandardCode(standard);
}

function isEffective(record: Capability) {
  const today = dayjs().startOf("day");
  return record.status === "ACTIVE"
    && !dayjs(record.effective_from).startOf("day").isAfter(today)
    && (!record.effective_to || !dayjs(record.effective_to).startOf("day").isBefore(today));
}

function isExpiring(record: Capability) {
  return isEffective(record) && Boolean(record.effective_to)
    && dayjs(record.effective_to).startOf("day").diff(dayjs().startOf("day"), "day") <= 30;
}

function isExpired(record: Capability) {
  return record.status === "ACTIVE" && Boolean(record.effective_to)
    && dayjs(record.effective_to).startOf("day").isBefore(dayjs().startOf("day"));
}

function capabilityStatus(record: Capability) {
  return <Tag color={isEffective(record) ? "green" : record.status === "ACTIVE" ? "gold" : "default"}>
    {isEffective(record) ? "Đang có năng lực" : record.status === "ACTIVE" ? "Chưa/không còn hiệu lực" : "Ngừng năng lực"}
  </Tag>;
}

function capabilityValidity(record: Capability) {
  return <div>
    <div>Từ {dayjs(record.effective_from).format("DD/MM/YYYY")}</div>
    <Text type="secondary">{record.effective_to ? `Đến ${dayjs(record.effective_to).format("DD/MM/YYYY")}` : "Không thời hạn"}</Text>
    {isExpiring(record) ? <div><Tag color="gold">Hết hạn trong 30 ngày</Tag></div> : null}
  </div>;
}

export function CertificationBodyCapabilitiesPanel() {
  const queryClient = useQueryClient();
  const [batchForm] = Form.useForm<BatchForm>();
  const [editForm] = Form.useForm<EditForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Capability | null>(null);
  const [standardFilter, setStandardFilter] = useState<string | undefined>();
  const [iafFilter, setIafFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [search, setSearch] = useState("");
  const [validityFilter, setValidityFilter] = useState("ALL");

  const selectedStandardId = Form.useWatch("standard_edition_id", batchForm);
  const selectedIafIds = Form.useWatch("iaf_scope_ids", batchForm) ?? [];

  const capabilitiesQuery = useQuery({
    queryKey: ["certification-body-capabilities"],
    queryFn: async () => (await api.get<Capability[]>("/certification-body-capabilities")).data,
  });
  const iafQuery = useQuery({
    queryKey: ["industry-classifications", "iaf", "cb-capability"],
    queryFn: async () => (await api.get<IafScope[]>("/industry-classifications/iaf-scopes?active=true")).data,
  });
  const standardsQuery = useQuery({
    queryKey: ["master-data-configuration", "standards", "cb-capability"],
    queryFn: async () => (await api.get<StandardEdition[]>("/master-data-configuration/standards")).data,
  });

  const standards = useMemo(
    () => (standardsQuery.data ?? []).filter((item) => item.status === "ACTIVE"),
    [standardsQuery.data],
  );
  const selectedStandard = standards.find((item) => item.id === selectedStandardId);
  const existingForSelected = new Set(
    (capabilitiesQuery.data ?? [])
      .filter((item) => item.standard_edition_id === selectedStandardId)
      .map((item) => item.iaf_scope_id),
  );

  const saveBatch = useMutation({
    mutationFn: async (values: BatchForm) => {
      if (!values.status || !values.effective_from) {
        throw new Error("Thiếu trạng thái hoặc ngày bắt đầu hiệu lực. Mở mục Hiệu lực & ghi chú để kiểm tra.");
      }
      return (await api.post("/certification-body-capabilities/batch", {
        standard_edition_id: values.standard_edition_id,
        iaf_scope_ids: values.iaf_scope_ids,
        status: values.status,
        effective_from: values.effective_from.format("YYYY-MM-DD"),
        effective_to: values.effective_to?.format("YYYY-MM-DD"),
        notes: values.notes?.trim() || undefined,
      })).data as { created_count: number; existing_count: number };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["certification-body-capabilities"] });
      messageApi.success(
        result.created_count
          ? `Đã thêm ${result.created_count} lĩnh vực IAF vào năng lực tổ chức`
          : "Các lĩnh vực IAF đã được cấu hình trước đó",
      );
      setCreateOpen(false);
      batchForm.resetFields();
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const saveEdit = useMutation({
    mutationFn: async (values: EditForm) => {
      if (!editing) return;
      if (!values.status || !values.effective_from) {
        throw new Error("Thiếu trạng thái hoặc ngày bắt đầu hiệu lực.");
      }
      await api.patch(`/certification-body-capabilities/${editing.id}`, {
        status: values.status,
        effective_from: values.effective_from.format("YYYY-MM-DD"),
        effective_to: values.effective_to?.format("YYYY-MM-DD"),
        notes: values.notes?.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["certification-body-capabilities"] });
      messageApi.success("Đã cập nhật năng lực tổ chức");
      setEditing(null);
      editForm.resetFields();
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setCreateOpen(true);
  };
  const openEdit = (record: Capability) => {
    setEditing(record);
  };

  const rows = useMemo(() => {
    return (capabilitiesQuery.data ?? []).filter((item) => {
      if (standardFilter && (item.standard_edition_id ?? item.program_code) !== standardFilter) return false;
      if (iafFilter && item.iaf_scope_id !== iafFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (validityFilter === "EFFECTIVE" && !isEffective(item)) return false;
      if (validityFilter === "EXPIRING" && !isExpiring(item)) return false;
      if (validityFilter === "EXPIRED" && !isExpired(item)) return false;
      const term = search.trim().toLocaleLowerCase();
      return !term || [standardLabel(item.standard_edition, item.program_name), item.program_code,
        item.iaf_scope.iaf_code, item.iaf_scope.iaf_name, item.notes ?? ""].join(" ").toLocaleLowerCase().includes(term);
    });
  }, [capabilitiesQuery.data, iafFilter, standardFilter, statusFilter, search, validityFilter]);

  const activeRows = (capabilitiesQuery.data ?? []).filter(isEffective);
  const activeStandards = new Set(activeRows.map((item) => item.standard_edition_id ?? item.program_code)).size;
  const activeIaf = new Set(activeRows.map((item) => item.iaf_scope.iaf_code)).size;

  const columns: TableColumnsType<Capability> = [
    {
      title: "Lĩnh vực IAF",
      key: "iaf",
      width: 280,
      render: (_, record) => (
        <div>
          <Tag color="blue">IAF {record.iaf_scope.iaf_code}</Tag>
          <span>{record.iaf_scope.iaf_name}</span>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 145,
      render: (_, record) => capabilityStatus(record),
    },
    {
      title: "Hiệu lực",
      key: "effective",
      width: 180,
      render: (_, record) => capabilityValidity(record),
    },
    { title: "Tham chiếu / ghi chú", dataIndex: "notes", key: "notes", render: (value) => value || "—" },
    {
      title: "",
      key: "action",
      width: 90,
      fixed: "right",
      render: (_, record) => <Button icon={<EditOutlined />} onClick={() => openEdit(record)} size="small">Sửa</Button>,
    },
  ];

  const standardOptions = standards.map((item) => ({
    value: item.id,
    label: `${item.scheme.code} · ${formatStandardCode(item)} — ${item.standard_name}`,
  }));
  const filterStandardOptions = (capabilitiesQuery.data ?? []).map((item) => ({
    value: item.standard_edition_id ?? item.program_code,
    label: standardLabel(item.standard_edition, item.program_name),
  })).filter((item, index, array) => array.findIndex((other) => other.value === item.value) === index);
  const groups = new Map<string, Capability[]>();
  for (const record of rows) {
    const key = record.standard_edition_id ?? record.program_code;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  const totalIaf = iafQuery.isSuccess ? new Set(iafQuery.data.map((item) => item.iaf_code)).size : undefined;
  const summaryValue = (value: number) => capabilitiesQuery.isSuccess ? value : "—";


  return (
    <>
      {contextHolder}
      <section className="capability-workspace" aria-label="Năng lực tổ chức">
        <div className="configuration-summary" aria-label="Tổng quan năng lực">
          <div><Statistic title="Đang hiệu lực" value={summaryValue(activeRows.length)} /></div>
          <div><Statistic title="Tiêu chuẩn / chương trình" value={summaryValue(activeStandards)} /><Text type="secondary">Đang hiệu lực</Text></div>
          <div><Statistic title="IAF khác nhau" value={summaryValue(activeIaf)} suffix={totalIaf === undefined ? undefined : `/ ${totalIaf}`} /><Text type="secondary">Đang hiệu lực / danh mục</Text></div>
          <div><Statistic title="Hết hạn trong 30 ngày" value={summaryValue(activeRows.filter(isExpiring).length)} /></div>
          <div><Statistic title="Đã hết hạn" value={summaryValue((capabilitiesQuery.data ?? []).filter(isExpired).length)} /></div>
          <div><Statistic title="Ngừng năng lực" value={summaryValue((capabilitiesQuery.data ?? []).filter((item) => item.status === "INACTIVE").length)} /></div>
        </div>
        <div className="capability-toolbar">
          <Text strong>Năng lực theo tiêu chuẩn · {rows.length} kết quả</Text>
          <Space>
            <Button icon={<ReloadOutlined />} loading={capabilitiesQuery.isFetching} onClick={() => void capabilitiesQuery.refetch()}>Làm mới</Button>
            <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">Thêm năng lực</Button>
          </Space>
        </div>
        <div className="capability-filters" aria-label="Lọc năng lực">
          <Select allowClear aria-label="Lọc theo tiêu chuẩn" options={filterStandardOptions} placeholder="Tất cả tiêu chuẩn" showSearch optionFilterProp="label" value={standardFilter} onChange={setStandardFilter} />
          <Input allowClear aria-label="Tìm năng lực" placeholder="Tìm IAF, tiêu chuẩn, ghi chú..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Collapse ghost size="small" items={[{
          key: "filters",
          label: "Bộ lọc",
          children: <div className="capability-filters">
            <Select allowClear aria-label="Lọc theo IAF" options={(iafQuery.data ?? []).map((item) => ({ value: item.id, label: `IAF ${item.iaf_code} · ${item.iaf_name}` }))} placeholder="Tất cả IAF" showSearch optionFilterProp="label" value={iafFilter} onChange={setIafFilter} />
            <Select aria-label="Lọc theo trạng thái" options={[
              { value: "ALL", label: "Tất cả trạng thái" },
              { value: "ACTIVE", label: "Đang/được lên lịch hiệu lực" },
              { value: "INACTIVE", label: "Ngừng năng lực" },
            ]} value={statusFilter} onChange={setStatusFilter} />
            <Select aria-label="Lọc theo hiệu lực" options={[
              { value: "ALL", label: "Tất cả thời hạn" },
              { value: "EFFECTIVE", label: "Đang hiệu lực" },
              { value: "EXPIRING", label: "Hết hạn trong 30 ngày" },
              { value: "EXPIRED", label: "Đã hết hạn" },
            ]} value={validityFilter} onChange={setValidityFilter} />
          </div>,
        }]} />
        {capabilitiesQuery.isError ? <Alert type="error" showIcon title="Không tải được năng lực" description={getErrorMessage(capabilitiesQuery.error)} /> : capabilitiesQuery.isLoading ? <LoadingSkeleton variant="list" /> : rows.length ? (
          <Collapse defaultActiveKey={[...groups.keys()]} items={[...groups].map(([key, records]) => {
            const first = records[0];
            return {
              key,
              label: <div className="capability-group-heading">
                <div><Text strong>{standardLabel(first.standard_edition, first.program_name)}</Text><Text type="secondary">{first.standard_edition?.scheme ? `${first.standard_edition.scheme.code} · ${first.standard_edition.scheme.name}` : "Dữ liệu cũ theo chương trình"}</Text></div>
                <Space wrap><Tag>{new Set(records.map((item) => item.iaf_scope_id)).size} lĩnh vực IAF</Tag><Tag>{records.filter(isEffective).length} đang hiệu lực</Tag></Space>
              </div>,
              children: <DataTable<Capability>
                size="small"
                columns={columns}
                dataSource={records}
                pagination={{ pageSize: 15, showSizeChanger: true }}
                rowKey="id"
                scroll={{ x: 760 }}
                responsiveCards={records.map((record) => ({
                  key: record.id,
                  title: <Tag color="blue">IAF {record.iaf_scope.iaf_code}</Tag>,
                  status: capabilityStatus(record),
                  fields: [
                    { key: "name", label: "Lĩnh vực", value: record.iaf_scope.iaf_name },
                    { key: "validity", label: "Hiệu lực", value: capabilityValidity(record) },
                    ...(record.notes ? [{ key: "notes", label: "Ghi chú", value: record.notes }] : []),
                  ],
                  actions: <Button icon={<EditOutlined />} onClick={() => openEdit(record)} size="small">Sửa</Button>,
                }))}
              />,
            };
          })} />
        ) : <Text type="secondary">{capabilitiesQuery.data?.length ? "Không có năng lực phù hợp bộ lọc" : "Chưa khai báo năng lực tổ chức"}</Text>}
        <Collapse
          ghost
          size="small"
          style={{ marginBottom: 12 }}
          items={[{
            key: "help",
            label: "Hướng dẫn & thống kê chi tiết",
            children: (
              <>
                <Alert
                  title="Năng lực tổ chức = tiêu chuẩn/phiên bản + các lĩnh vực IAF được phép chứng nhận"
                  description="Khi xem xét đơn, CMP lấy ISIC của khách → NACE → IAF rồi đối chiếu bảng này. Năng lực tổ chức và năng lực từng chuyên gia là hai lớp kiểm tra riêng."
                  showIcon
                  style={{ marginBottom: 12 }}
                  type="info"
                />
                <Text>
                  Ví dụ: ISO 9001:2015 có năng lực IAF 14, 19 và 28 → chọn đúng ISO 9001:2015, tích 3 IAF rồi lưu một lần. Khi có ISO 9001:2026, khai báo riêng cho phiên bản mới để giữ nguyên lịch sử 2015.
                </Text>
              </>
            ),
          }]}
        />

      </section>

      <Modal
        className="capability-modal"
        afterOpenChange={(open) => {
          if (!open) return;
          batchForm.resetFields();
          batchForm.setFieldsValue({
            status: "ACTIVE",
            effective_from: dayjs().startOf("day"),
            iaf_scope_ids: [],
          });
        }}
        destroyOnHidden
        footer={null}
        onCancel={() => setCreateOpen(false)}
        open={createOpen}
        title="Thêm năng lực tổ chức"
        width={720}
      >
        <Collapse
          ghost
          size="small"
          style={{ marginBottom: 12 }}
          items={[{
            key: "guide",
            label: "Xem hướng dẫn",
            children: (
              <Alert
                showIcon
                type="info"
                title="Chọn 1 tiêu chuẩn, sau đó tích nhiều IAF và lưu một lần"
                description="Các IAF đã có cho đúng phiên bản tiêu chuẩn sẽ được đánh dấu để tránh tạo trùng."
              />
            ),
          }]}
        />
        <Form<BatchForm> form={batchForm} layout="vertical" onFinish={(values) => saveBatch.mutate(values)}>
          <Form.Item
            label="Chương trình / tiêu chuẩn / phiên bản"
            name="standard_edition_id"
            extra="Ví dụ: QMS · ISO 9001:2015. Khi có ISO 9001:2026, khai báo edition 2026 riêng để không làm thay đổi lịch sử 2015."
            rules={[{ required: true, message: "Chọn phiên bản tiêu chuẩn" }]}
          >
            <Select
              loading={standardsQuery.isLoading}
              options={standardOptions}
              placeholder="Chọn QMS · ISO 9001:2015..."
              showSearch
              optionFilterProp="label"
              onChange={() => batchForm.setFieldValue("iaf_scope_ids", [])}
            />
          </Form.Item>

          {selectedStandard ? (
            <Space style={{ marginBottom: 12 }} wrap>
              <CheckCircleOutlined style={{ color: "#389e0d" }} />
              <Text strong>{selectedStandard.scheme.code} · {formatStandardCode(selectedStandard)}</Text>
              <Text type="secondary">Hiệu lực từ {dayjs(selectedStandard.effective_from).format("DD/MM/YYYY")}</Text>
            </Space>
          ) : null}

          <Form.Item
            label={`Lĩnh vực IAF được cấp năng lực${selectedIafIds.length ? ` · đã chọn ${selectedIafIds.length}` : ""}`}
            name="iaf_scope_ids"
            extra={`Toàn hệ thống hiện có ${iafQuery.data?.length ?? "—"} lĩnh vực IAF. Chỉ tích những lĩnh vực thật sự nằm trong phạm vi năng lực/công nhận của tổ chức.`}
            rules={[{ required: true, message: "Chọn ít nhất một lĩnh vực IAF" }]}
          >
            <Select
              disabled={!selectedStandardId}
              loading={iafQuery.isLoading}
              mode="multiple"
              maxTagCount="responsive"
              optionFilterProp="label"
              options={(iafQuery.data ?? []).map((item) => ({
                value: item.id,
                label: `IAF ${item.iaf_code} · ${item.iaf_name}${existingForSelected.has(item.id) ? " · đã có" : ""}`,
                disabled: existingForSelected.has(item.id),
              }))}
              placeholder="Tìm theo mã hoặc tên IAF..."
              showSearch
            />
          </Form.Item>

          <Collapse
            ghost
            size="small"
            style={{ marginBottom: 12 }}
            items={[{
              key: "advanced",
              label: "Hiệu lực & ghi chú",
              forceRender: true,
              children: (
                <>
                  <Row gutter={12}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Trạng thái" name="status" rules={[{ required: true }]}>
                        <Select options={[{ value: "ACTIVE", label: "Có năng lực" }, { value: "INACTIVE", label: "Ngừng năng lực" }]} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Có hiệu lực từ" name="effective_from" rules={[{ required: true, message: "Chọn ngày bắt đầu" }]}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Có hiệu lực đến" name="effective_to">
                        <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    label="Tham chiếu / ghi chú"
                    name="notes"
                    extra="Không bắt buộc. Có thể ghi số chứng thư công nhận, quyết định nội bộ hoặc giới hạn cần nhớ."
                  >
                    <Input.TextArea maxLength={4000} rows={3} placeholder="Ví dụ: Theo phạm vi công nhận của BoA" />
                  </Form.Item>
                </>
              ),
            }]}
          />
          <Space style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button htmlType="submit" loading={saveBatch.isPending} type="primary">
              {selectedIafIds.length ? `Lưu ${selectedIafIds.length} lĩnh vực IAF` : "Lưu năng lực"}
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        className="capability-modal"
        afterOpenChange={(open) => {
          if (!open || !editing) return;
          editForm.resetFields();
          editForm.setFieldsValue({
            status: editing.status,
            effective_from: dayjs(editing.effective_from),
            effective_to: editing.effective_to ? dayjs(editing.effective_to) : undefined,
            notes: editing.notes ?? undefined,
          });
        }}
        destroyOnHidden
        footer={null}
        onCancel={() => setEditing(null)}
        open={Boolean(editing)}
        title="Cập nhật năng lực"
        width={640}
      >
        {editing ? (
          <>
            <Alert
              type="info"
              showIcon
              title={`${standardLabel(editing.standard_edition, editing.program_name)} · IAF ${editing.iaf_scope.iaf_code}`}
              description={editing.iaf_scope.iaf_name}
              style={{ marginBottom: 16 }}
            />
            <Form<EditForm> form={editForm} layout="vertical" onFinish={(values) => saveEdit.mutate(values)}>
              <Form.Item label="Trạng thái" name="status" rules={[{ required: true }]}>
                <Select options={[{ value: "ACTIVE", label: "Có năng lực" }, { value: "INACTIVE", label: "Ngừng năng lực" }]} />
              </Form.Item>
              <Row gutter={12}>
                <Col xs={24} md={12}><Form.Item label="Có hiệu lực từ" name="effective_from" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Có hiệu lực đến" name="effective_to"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col>
              </Row>
              <Form.Item label="Tham chiếu / ghi chú" name="notes"><Input.TextArea maxLength={4000} rows={3} /></Form.Item>
              <Space style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={() => setEditing(null)}>Hủy</Button>
                <Button htmlType="submit" loading={saveEdit.isPending} type="primary">Lưu thay đổi</Button>
              </Space>
            </Form>
          </>
        ) : null}
      </Modal>
    </>
  );
}
