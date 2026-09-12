"use client";

import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Paragraph, Text } = Typography;
const base = "/master-data-configuration";

type Scheme = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: string;
  effective_from?: string | null;
  effective_to?: string | null;
};

type Standard = {
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

type ReadinessItem = {
  id: string;
  code: string;
  status: "READY" | "NEEDS_ATTENTION";
  issues: string[];
};

type ConfigurationReadiness = {
  schemes: {
    ready: boolean;
    items: ReadinessItem[];
  };
};

type SchemeFormValues = {
  code: string;
  name: string;
  description?: string;
};

type StandardFormValues = {
  scheme_id: string;
  standard_code: string;
  standard_name: string;
  edition: string;
  effective_from: dayjs.Dayjs;
};

const builtInProgramNames: Record<string, string> = {
  QMS: "Hệ thống quản lý chất lượng",
  EMS: "Hệ thống quản lý môi trường",
  OHSMS: "Hệ thống quản lý an toàn và sức khỏe nghề nghiệp",
};

function programName(row: Scheme) {
  const canonical = builtInProgramNames[row.code.trim().toUpperCase()];
  if (!canonical) return row.name;
  if (!row.name.trim() || /hệ thống quản lý chứng nhận/i.test(row.name)) return canonical;
  return row.name;
}

function normalizeStandardCode(codeValue: unknown, editionValue: unknown) {
  const edition = String(editionValue ?? "").trim();
  let code = String(codeValue ?? "").trim();
  if (!edition) return code;
  const escaped = edition.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  code = code.replace(new RegExp(`\\s*[:\\-]?\\s*${escaped}$`, "i"), "").trim();
  return code;
}

function standardEditionLabel(row: Pick<Standard, "standard_code" | "edition">) {
  const code = String(row.standard_code ?? "").trim();
  const edition = String(row.edition ?? "").trim();
  if (!edition) return code;
  return code.includes(edition) ? code : `${code}:${edition}`;
}

function StandardStatus({ row }: { row: Standard }) {
  if (
    row.status !== "ACTIVE"
    || (row.withdrawn_at && !dayjs(row.withdrawn_at).endOf("day").isAfter(dayjs()))
  ) {
    return <Tag>Ngừng áp dụng</Tag>;
  }
  if (dayjs(row.effective_from).startOf("day").isAfter(dayjs().startOf("day"))) {
    return <Tag color="cyan">Chờ hiệu lực · {dayjs(row.effective_from).format("DD/MM/YYYY")}</Tag>;
  }
  return <Tag color="green">Đang áp dụng</Tag>;
}

function ProgramStatus({ value }: { value: string }) {
  return value === "ACTIVE"
    ? <Tag color="blue">Đang sử dụng</Tag>
    : <Tag>Ngừng sử dụng</Tag>;
}

function readinessText(issue: string) {
  if (/phiên bản tiêu chuẩn/i.test(issue)) return "Chưa có phiên bản tiêu chuẩn đang áp dụng";
  if (/quy tắc|configuration|ACTIVE/i.test(issue)) return "Chưa có bộ quy tắc đang áp dụng";
  return issue.replace(/ACTIVE/g, "đang áp dụng");
}

export function CertificationProgramsPanel() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [standardOpen, setStandardOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);
  const [editingStandard, setEditingStandard] = useState<Standard | null>(null);
  const [schemeForm] = Form.useForm<SchemeFormValues>();
  const [standardForm] = Form.useForm<StandardFormValues>();

  const schemes = useQuery({
    queryKey: ["master-schemes"],
    queryFn: async () => (await api.get<Scheme[]>(`${base}/schemes`)).data,
  });
  const standards = useQuery({
    queryKey: ["master-standards"],
    queryFn: async () => (await api.get<Standard[]>(`${base}/standards`)).data,
  });
  const readiness = useQuery({
    queryKey: ["configuration-readiness"],
    queryFn: async () => (await api.get<ConfigurationReadiness>(`${base}/configuration-readiness`)).data,
  });

  const invalidate = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["master-schemes"] }),
    queryClient.invalidateQueries({ queryKey: ["master-standards"] }),
    queryClient.invalidateQueries({ queryKey: ["configuration-readiness"] }),
  ]);

  const standardsByScheme = useMemo(() => {
    const grouped = new Map<string, Standard[]>();
    for (const row of standards.data ?? []) {
      const rows = grouped.get(row.scheme_id) ?? [];
      rows.push(row);
      grouped.set(row.scheme_id, rows);
    }
    for (const rows of grouped.values()) {
      rows.sort((left, right) => dayjs(right.effective_from).valueOf() - dayjs(left.effective_from).valueOf());
    }
    return grouped;
  }, [standards.data]);

  const readinessByScheme = useMemo(
    () => new Map((readiness.data?.schemes.items ?? []).map((item) => [item.id, item])),
    [readiness.data],
  );

  const saveScheme = useMutation({
    mutationFn: async (values: SchemeFormValues) => {
      if (editingScheme) {
        return api.patch(`${base}/schemes/${editingScheme.id}`, {
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
        });
      }
      return api.post(`${base}/schemes`, {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        status: "ACTIVE",
      });
    },
    onSuccess: async () => {
      await invalidate();
      setSchemeOpen(false);
      setEditingScheme(null);
      schemeForm.resetFields();
      messageApi.success("Đã lưu chương trình");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const toggleScheme = useMutation({
    mutationFn: async (row: Scheme) => api.patch(`${base}/schemes/${row.id}`, {
      status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    }),
    onSuccess: async (_, row) => {
      await invalidate();
      messageApi.success(row.status === "ACTIVE" ? "Đã ngừng sử dụng chương trình" : "Đã đưa chương trình vào sử dụng");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const saveStandard = useMutation({
    mutationFn: async (values: StandardFormValues) => {
      const edition = values.edition.trim();
      const standardCode = normalizeStandardCode(values.standard_code, edition);
      if (!standardCode) throw new Error("Mã tiêu chuẩn không hợp lệ. Ví dụ: ISO 9001.");
      const duplicate = (standards.data ?? []).find((item) =>
        item.id !== editingStandard?.id
        && item.scheme_id === values.scheme_id
        && normalizeStandardCode(item.standard_code, item.edition).toUpperCase() === standardCode.toUpperCase()
        && item.edition.trim().toUpperCase() === edition.toUpperCase(),
      );
      if (duplicate) throw new Error(`${standardEditionLabel(duplicate)} đã tồn tại trong chương trình ${duplicate.scheme.code}.`);
      const payload = {
        scheme_id: values.scheme_id,
        standard_code: standardCode,
        standard_name: values.standard_name.trim(),
        edition,
        effective_from: values.effective_from.format("YYYY-MM-DD"),
      };
      return editingStandard
        ? api.patch(`${base}/standards/${editingStandard.id}`, payload)
        : api.post(`${base}/standards`, payload);
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editingStandard);
      await invalidate();
      setStandardOpen(false);
      setEditingStandard(null);
      standardForm.resetFields();
      messageApi.success(wasEditing ? "Đã cập nhật phiên bản tiêu chuẩn" : "Đã thêm phiên bản tiêu chuẩn");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const stopStandard = useMutation({
    mutationFn: async (row: Standard) => api.patch(`${base}/standards/${row.id}`, {
      status: "WITHDRAWN",
      withdrawn_at: dayjs().format("YYYY-MM-DD"),
    }),
    onSuccess: async () => {
      await invalidate();
      messageApi.success("Đã ngừng áp dụng phiên bản tiêu chuẩn");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const deleteStandard = useMutation({
    mutationFn: async (row: Standard) => api.delete(`${base}/standards/${row.id}`),
    onSuccess: async () => {
      await invalidate();
      messageApi.success("Đã xóa phiên bản tiêu chuẩn");
    },
    onError: (error) => messageApi.error(getErrorMessage(error)),
  });

  const openNewScheme = () => {
    setEditingScheme(null);
    schemeForm.resetFields();
    setSchemeOpen(true);
  };

  const openEditScheme = (row: Scheme) => {
    setEditingScheme(row);
    schemeForm.setFieldsValue({
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
    });
    setSchemeOpen(true);
  };

  const openStandard = (schemeId?: string, row?: Standard) => {
    setEditingStandard(row ?? null);
    standardForm.resetFields();
    if (row) {
      standardForm.setFieldsValue({
        scheme_id: row.scheme_id,
        standard_code: normalizeStandardCode(row.standard_code, row.edition),
        standard_name: row.standard_name,
        edition: row.edition,
        effective_from: dayjs(row.effective_from),
      });
    } else if (schemeId) {
      standardForm.setFieldsValue({ scheme_id: schemeId });
    }
    setStandardOpen(true);
  };

  const confirmStop = (row: Standard) => {
    Modal.confirm({
      title: `Ngừng áp dụng ${standardEditionLabel(row)}?`,
      content: "Phiên bản sẽ không còn được chọn cho nghiệp vụ mới. Dữ liệu lịch sử vẫn được giữ nguyên.",
      okText: "Ngừng áp dụng",
      okButtonProps: { danger: true },
      cancelText: "Giữ nguyên",
      onOk: async () => {
        await stopStandard.mutateAsync(row);
      },
    });
  };

  const confirmDelete = (row: Standard) => {
    Modal.confirm({
      title: `Xóa ${standardEditionLabel(row)}?`,
      content: "Chỉ phiên bản chưa được sử dụng mới có thể xóa. Nếu đã có hồ sơ, chứng chỉ hoặc dữ liệu năng lực liên quan, hệ thống sẽ chặn để bảo vệ lịch sử.",
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        await deleteStandard.mutateAsync(row);
      },
    });
  };

  const allSchemes = schemes.data ?? [];
  const readyCount = allSchemes.filter((row) => readinessByScheme.get(row.id)?.status === "READY").length;
  const needsSetupCount = allSchemes.filter((row) => row.status === "ACTIVE" && readinessByScheme.get(row.id)?.status !== "READY").length;
  const loadError = schemes.isError ? getErrorMessage(schemes.error) : standards.isError ? getErrorMessage(standards.error) : null;

  return (
    <div>
      {contextHolder}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 16 }}>Cấu hình đang sử dụng</Text>
          <div style={{ marginTop: 6 }}>
            <Space wrap size={6}>
              <Text>{allSchemes.length} chương trình</Text>
              <Tag color="green">{readyCount} sẵn sàng</Tag>
              {needsSetupCount ? <Tag color="orange">{needsSetupCount} cần thiết lập</Tag> : null}
            </Space>
          </div>
        </div>
        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={openNewScheme}>Thêm chương trình</Button>
          <Button type="primary" icon={<PlusOutlined />} disabled={!allSchemes.length} onClick={() => openStandard()}>Thêm phiên bản tiêu chuẩn</Button>
        </Space>
      </div>

      {loadError ? (
        <Alert
          showIcon
          type="error"
          message="Không tải được chương trình và tiêu chuẩn"
          description={loadError}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      {!loadError && !schemes.isLoading && !allSchemes.length ? (
        <Card>
          <Empty description="Chưa có chương trình chứng nhận">
            <Button type="primary" onClick={openNewScheme}>Thêm chương trình đầu tiên</Button>
          </Empty>
        </Card>
      ) : null}

      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {allSchemes.map((scheme) => {
          const rows = standardsByScheme.get(scheme.id) ?? [];
          const schemeReadiness = readinessByScheme.get(scheme.id);
          const issues = schemeReadiness?.issues ?? [];
          return (
            <Card
              key={scheme.id}
              size="small"
              title={(
                <Space wrap size={8}>
                  <Tag color="blue" style={{ margin: 0 }}>{scheme.code}</Tag>
                  <Text strong style={{ fontSize: 16 }}>{programName(scheme)}</Text>
                  <ProgramStatus value={scheme.status} />
                  {scheme.status === "ACTIVE" ? (
                    schemeReadiness?.status === "READY"
                      ? <Tag color="green">Sẵn sàng</Tag>
                      : <Tag color="orange">Cần thiết lập</Tag>
                  ) : null}
                </Space>
              )}
              extra={(
                <Space>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => openStandard(scheme.id)}>Thêm phiên bản</Button>
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        { key: "edit", icon: <EditOutlined />, label: "Sửa chương trình" },
                        {
                          key: "toggle",
                          icon: <StopOutlined />,
                          label: scheme.status === "ACTIVE" ? "Ngừng sử dụng" : "Đưa vào sử dụng",
                        },
                      ],
                      onClick: ({ key }) => {
                        if (key === "edit") openEditScheme(scheme);
                        if (key === "toggle") toggleScheme.mutate(scheme);
                      },
                    }}
                  >
                    <Button type="text" icon={<MoreOutlined />} aria-label={`Thao tác ${scheme.code}`} />
                  </Dropdown>
                </Space>
              )}
            >
              {scheme.status === "ACTIVE" && issues.length ? (
                <Alert
                  showIcon
                  type="warning"
                  message="Cần hoàn tất cấu hình"
                  description={(
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      {issues.map((issue) => (
                        <div key={issue} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          <Text>{readinessText(issue)}</Text>
                          {/phiên bản tiêu chuẩn/i.test(issue) ? (
                            <Button size="small" onClick={() => openStandard(scheme.id)}>Thêm phiên bản</Button>
                          ) : null}
                        </div>
                      ))}
                    </Space>
                  )}
                  style={{ marginBottom: 12 }}
                />
              ) : null}

              {rows.length ? (
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  {rows.map((standard) => {
                    const applied = standard.status === "ACTIVE"
                      && !dayjs(standard.effective_from).startOf("day").isAfter(dayjs().startOf("day"))
                      && (!standard.withdrawn_at || dayjs(standard.withdrawn_at).endOf("day").isAfter(dayjs()));
                    const actions = [
                      { key: "edit", icon: <EditOutlined />, label: "Sửa" },
                      ...(applied ? [{ key: "stop", icon: <StopOutlined />, label: "Ngừng áp dụng", danger: true }] : []),
                      { key: "delete", icon: <DeleteOutlined />, label: "Xóa", danger: true },
                    ];
                    return (
                      <div
                        key={standard.id}
                        style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto auto", gap: 12, alignItems: "center", padding: "11px 12px", border: "1px solid #edf0f4", borderRadius: 10 }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <Text strong>{standardEditionLabel(standard)}</Text>
                          <div><Text type="secondary">{standard.standard_name}</Text></div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <StandardStatus row={standard} />
                          <div style={{ marginTop: 3 }}>
                            <Text type="secondary">Hiệu lực từ {dayjs(standard.effective_from).format("DD/MM/YYYY")}</Text>
                          </div>
                        </div>
                        <Dropdown
                          trigger={["click"]}
                          menu={{
                            items: actions,
                            onClick: ({ key }) => {
                              if (key === "edit") openStandard(undefined, standard);
                              if (key === "stop") confirmStop(standard);
                              if (key === "delete") confirmDelete(standard);
                            },
                          }}
                        >
                          <Button type="text" icon={<MoreOutlined />} aria-label={`Thao tác ${standardEditionLabel(standard)}`} />
                        </Dropdown>
                      </div>
                    );
                  })}
                </Space>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chưa có phiên bản tiêu chuẩn"
                >
                  <Button size="small" onClick={() => openStandard(scheme.id)}>Thêm phiên bản</Button>
                </Empty>
              )}
            </Card>
          );
        })}
      </Space>

      <Modal
        title={editingScheme ? "Sửa chương trình" : "Thêm chương trình"}
        open={schemeOpen}
        onCancel={() => {
          setSchemeOpen(false);
          setEditingScheme(null);
          schemeForm.resetFields();
        }}
        onOk={() => schemeForm.submit()}
        okText="Lưu"
        confirmLoading={saveScheme.isPending}
        destroyOnHidden
      >
        <Form form={schemeForm} layout="vertical" onFinish={(values) => saveScheme.mutate(values)}>
          <Form.Item name="code" label="Mã chương trình" rules={[{ required: true, message: "Nhập mã chương trình" }]}>
            <Input disabled={Boolean(editingScheme)} placeholder="Ví dụ: QMS" />
          </Form.Item>
          <Form.Item name="name" label="Tên chương trình" rules={[{ required: true, message: "Nhập tên chương trình" }]}>
            <Input placeholder="Ví dụ: Hệ thống quản lý chất lượng" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingStandard ? `Sửa ${standardEditionLabel(editingStandard)}` : "Thêm phiên bản tiêu chuẩn"}
        open={standardOpen}
        onCancel={() => {
          setStandardOpen(false);
          setEditingStandard(null);
          standardForm.resetFields();
        }}
        onOk={() => standardForm.submit()}
        okText="Lưu"
        confirmLoading={saveStandard.isPending}
        destroyOnHidden
      >
        <Form form={standardForm} layout="vertical" onFinish={(values) => saveStandard.mutate(values)}>
          <Form.Item name="scheme_id" label="Chương trình" rules={[{ required: true, message: "Chọn chương trình" }]}>
            <Select
              disabled={Boolean(editingStandard)}
              options={allSchemes.map((row) => ({ value: row.id, label: `${row.code} · ${programName(row)}` }))}
              placeholder="Chọn chương trình"
            />
          </Form.Item>
          <Form.Item name="standard_code" label="Mã tiêu chuẩn" extra="Chỉ nhập mã tiêu chuẩn, ví dụ ISO 9001. Năm phiên bản nhập ở ô bên dưới." rules={[{ required: true, message: "Nhập mã tiêu chuẩn" }]}>
            <Input placeholder="ISO 9001" />
          </Form.Item>
          <Form.Item name="standard_name" label="Tên tiêu chuẩn" rules={[{ required: true, message: "Nhập tên tiêu chuẩn" }]}>
            <Input placeholder="Hệ thống quản lý chất lượng" />
          </Form.Item>
          <Form.Item name="edition" label="Phiên bản / năm" rules={[{ required: true, message: "Nhập phiên bản" }]}>
            <Input placeholder="2015" />
          </Form.Item>
          <Form.Item name="effective_from" label="Có hiệu lực từ" rules={[{ required: true, message: "Chọn ngày hiệu lực" }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Nếu ngày hiệu lực ở tương lai, hệ thống tự hiển thị “Chờ hiệu lực”. Không cần thêm bước chuyển trạng thái.
          </Paragraph>
        </Form>
      </Modal>
    </div>
  );
}
