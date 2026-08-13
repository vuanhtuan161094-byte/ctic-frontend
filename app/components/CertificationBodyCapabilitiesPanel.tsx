"use client";

import { EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";

import { api, getErrorMessage } from "../lib/api";

type IafScope = { id: string; iaf_code: string; iaf_name: string; is_active: boolean };
type Capability = {
  id: string;
  program_code: string;
  program_name: string;
  iaf_scope_id: string;
  status: "ACTIVE" | "INACTIVE";
  effective_from: string;
  effective_to?: string | null;
  notes?: string | null;
  iaf_scope: IafScope;
};
type CapabilityForm = {
  program_code: string;
  program_name: string;
  iaf_scope_id: string;
  status: "ACTIVE" | "INACTIVE";
  effective_from: Dayjs;
  effective_to?: Dayjs;
  notes?: string;
};

const programOptions = [
  { value: "ISO_9001", label: "ISO 9001" },
  { value: "ISO_14001", label: "ISO 14001" },
  { value: "ISO_45001", label: "ISO 45001" },
];

export function CertificationBodyCapabilitiesPanel() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CapabilityForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const [editing, setEditing] = useState<Capability | null>(null);
  const [open, setOpen] = useState(false);

  const capabilitiesQuery = useQuery({
    queryKey: ["certification-body-capabilities"],
    queryFn: async () => (await api.get<Capability[]>("/certification-body-capabilities")).data,
  });
  const iafQuery = useQuery({
    queryKey: ["industry-classifications", "iaf", "cb-capability"],
    queryFn: async () => (await api.get<IafScope[]>("/industry-classifications/iaf-scopes?active=true")).data,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CapabilityForm) => {
      const selectedProgram = programOptions.find((item) => item.value === values.program_code);
      const payload = {
        program_code: values.program_code,
        program_name: values.program_name.trim() || selectedProgram?.label || values.program_code,
        iaf_scope_id: values.iaf_scope_id,
        status: values.status,
        effective_from: values.effective_from.format("YYYY-MM-DD"),
        effective_to: values.effective_to?.format("YYYY-MM-DD"),
        notes: values.notes?.trim() || undefined,
      };
      return editing
        ? api.patch(`/certification-body-capabilities/${editing.id}`, payload)
        : api.post("/certification-body-capabilities", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["certification-body-capabilities"] });
      messageApi.success(editing ? "Đã cập nhật năng lực tổ chức chứng nhận" : "Đã thêm năng lực tổ chức chứng nhận");
      setOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      program_code: "ISO_9001",
      program_name: "ISO 9001",
      status: "ACTIVE",
      effective_from: dayjs().startOf("day"),
    });
    setOpen(true);
  };
  const openEdit = (record: Capability) => {
    setEditing(record);
    form.setFieldsValue({
      program_code: record.program_code,
      program_name: record.program_name,
      iaf_scope_id: record.iaf_scope_id,
      status: record.status,
      effective_from: dayjs(record.effective_from),
      effective_to: record.effective_to ? dayjs(record.effective_to) : undefined,
      notes: record.notes ?? undefined,
    });
    setOpen(true);
  };

  const columns: TableColumnsType<Capability> = [
    { title: "Chương trình", dataIndex: "program_name", key: "program_name" },
    {
      title: "IAF",
      key: "iaf",
      width: 260,
      render: (_, record) => `${record.iaf_scope.iaf_code} · ${record.iaf_scope.iaf_name}`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: Capability["status"]) => (
        <Tag color={status === "ACTIVE" ? "green" : "default"}>
          {status === "ACTIVE" ? "Đang hiệu lực" : "Ngừng hiệu lực"}
        </Tag>
      ),
    },
    {
      title: "Hiệu lực",
      key: "effective",
      width: 220,
      render: (_, record) => `${dayjs(record.effective_from).format("DD/MM/YYYY")} → ${record.effective_to ? dayjs(record.effective_to).format("DD/MM/YYYY") : "Không thời hạn"}`,
    },
    { title: "Ghi chú", dataIndex: "notes", key: "notes", render: (value) => value || "—" },
    {
      title: "",
      key: "action",
      width: 90,
      render: (_, record) => <Button icon={<EditOutlined />} onClick={() => openEdit(record)} size="small">Sửa</Button>,
    },
  ];

  return (
    <>
      {contextHolder}
      <Card
        className="system-admin-table-card"
        extra={(
          <Space>
            <Button icon={<ReloadOutlined />} loading={capabilitiesQuery.isFetching} onClick={() => void capabilitiesQuery.refetch()}>Làm mới</Button>
            <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">Thêm năng lực</Button>
          </Space>
        )}
        title="Năng lực tổ chức chứng nhận"
      >
        <Alert
          message="Master năng lực theo Chương trình/Tiêu chuẩn + IAF"
          description="Dữ liệu này độc lập với năng lực chuyên gia. Bản xem xét chỉ được phê duyệt khi mọi cặp Program + IAF đều đang có năng lực hợp lệ."
          showIcon
          style={{ marginBottom: 16 }}
          type="info"
        />
        <Table<Capability>
          columns={columns}
          dataSource={capabilitiesQuery.data ?? []}
          loading={capabilitiesQuery.isLoading}
          locale={{ emptyText: capabilitiesQuery.isError ? getErrorMessage(capabilitiesQuery.error) : "Chưa cấu hình năng lực" }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowKey="id"
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        destroyOnHidden
        footer={null}
        onCancel={() => setOpen(false)}
        open={open}
        title={editing ? "Cập nhật năng lực" : "Thêm năng lực tổ chức chứng nhận"}
      >
        <Form<CapabilityForm> form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item label="Chương trình/tiêu chuẩn" name="program_code" rules={[{ required: true }]}>
            <Select
              options={programOptions}
              onChange={(value) => form.setFieldValue("program_name", programOptions.find((item) => item.value === value)?.label ?? value)}
            />
          </Form.Item>
          <Form.Item hidden name="program_name"><Input /></Form.Item>
          <Form.Item label="Lĩnh vực IAF" name="iaf_scope_id" rules={[{ required: true, message: "Chọn mã IAF" }]}>
            <Select
              loading={iafQuery.isLoading}
              optionFilterProp="label"
              options={(iafQuery.data ?? []).map((item) => ({ value: item.id, label: `${item.iaf_code} · ${item.iaf_name}` }))}
              showSearch
            />
          </Form.Item>
          <Form.Item label="Trạng thái" name="status" rules={[{ required: true }]}>
            <Select options={[{ value: "ACTIVE", label: "Đang hiệu lực" }, { value: "INACTIVE", label: "Ngừng hiệu lực" }]} />
          </Form.Item>
          <Space align="start" style={{ width: "100%" }}>
            <Form.Item label="Hiệu lực từ" name="effective_from" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" /></Form.Item>
            <Form.Item label="Hiệu lực đến" name="effective_to"><DatePicker format="DD/MM/YYYY" /></Form.Item>
          </Space>
          <Form.Item label="Ghi chú" name="notes"><Input.TextArea maxLength={4000} rows={3} /></Form.Item>
          <Space style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={() => setOpen(false)}>Hủy</Button>
            <Button htmlType="submit" loading={saveMutation.isPending} type="primary">Lưu</Button>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
