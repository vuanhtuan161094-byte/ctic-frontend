"use client";

import {
  BankOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FolderOpenOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  UndoOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Text, Title } = Typography;

interface Customer {
  id: string;
  customer_code: string;
  company_name: string;
  tax_code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerFormValues {
  customer_code: string;
  company_name: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface CertificationProject {
  id: string;
  project_code: string;
  standard_name: string;
  status: string;
  updated_at: string;
  certification_applications?: {
    application_code: string;
    customers?: {
      id: string;
    } | null;
  } | null;
}

interface CustomersScreenProps {
  onOpenProject: (projectId: string) => void;
  roles: string[];
}

const projectStatusLabels: Record<string, string> = {
  certificate_issued: "Đã cấp chứng chỉ",
  closed: "Đã đóng",
  completed: "Hoàn thành",
  corrective_action_required: "Chờ khắc phục NC",
  draft: "Khởi tạo",
  in_progress: "Đang thực hiện",
  pending: "Chờ xử lý",
  pending_technical_review: "Chờ thẩm xét",
  technical_review_completed: "Đã thẩm xét",
};

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function CustomerStatusTag({ status }: { status?: string | null }) {
  const active = normalize(status || "active") === "active";
  return (
    <Tag color={active ? "green" : "default"} icon={active ? <CheckCircleOutlined /> : <StopOutlined />}>
      {active ? "Đang hoạt động" : "Ngừng hoạt động"}
    </Tag>
  );
}

export function CustomersScreen({ onOpenProject, roles }: CustomersScreenProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CustomerFormValues>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const normalizedRoles = roles.map((role) => normalize(role));
  const canManage = normalizedRoles.some((role) => ["admin", "staff", "sales"].includes(role));
  const isAdmin = normalizedRoles.includes("admin");

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await api.get<Customer[]>("/customers")).data,
  });

  const projectsQuery = useQuery({
    queryKey: ["certification-projects"],
    queryFn: async () => (await api.get<CertificationProject[]>("/certification-projects")).data,
  });

  const customers = customersQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const selectedCustomer = customers.find((item) => item.id === selectedCustomerId) ?? null;

  const projectsByCustomer = useMemo(() => {
    const grouped = new Map<string, CertificationProject[]>();
    projects.forEach((project) => {
      const customerId = project.certification_applications?.customers?.id;
      if (!customerId) return;
      grouped.set(customerId, [...(grouped.get(customerId) ?? []), project]);
    });
    return grouped;
  }, [projects]);

  const filteredCustomers = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase("vi");
    return customers.filter((customer) => {
      const matchesSearch = !keyword || [
        customer.customer_code,
        customer.company_name,
        customer.tax_code,
        customer.email,
        customer.phone,
      ].some((value) => value?.toLocaleLowerCase("vi").includes(keyword));
      const status = normalize(customer.status || "active");
      return matchesSearch && (statusFilter === "all" || status === statusFilter);
    });
  }, [customers, searchTerm, statusFilter]);

  const saveMutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? value.trim() || undefined : value]),
      );
      if (editingCustomer) {
        return (await api.patch<Customer>(`/customers/${editingCustomer.id}`, payload)).data;
      }
      return (await api.post<Customer>("/customers", payload)).data;
    },
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      setFormOpen(false);
      setEditingCustomer(null);
      form.resetFields();
      setSelectedCustomerId(customer.id);
      message.success(editingCustomer ? "Đã cập nhật thông tin khách hàng" : "Đã tạo khách hàng mới");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (customerId: string) => (await api.delete<Customer>(`/customers/${customerId}`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      message.success("Đã chuyển khách hàng sang trạng thái ngừng hoạt động");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const reactivateMutation = useMutation({
    mutationFn: async (customerId: string) =>
      (await api.patch<Customer>(`/customers/${customerId}/reactivate`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      message.success("Đã khôi phục hoạt động khách hàng trên hồ sơ cũ");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingCustomer(null);
    form.resetFields();
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.setFieldsValue({
      customer_code: customer.customer_code,
      company_name: customer.company_name,
      tax_code: customer.tax_code ?? undefined,
      address: customer.address ?? undefined,
      phone: customer.phone ?? undefined,
      email: customer.email ?? undefined,
    });
    setFormOpen(true);
  };

  const columns: TableColumnsType<Customer> = [
    {
      title: "Mã khách hàng",
      dataIndex: "customer_code",
      key: "customer_code",
      width: 145,
      render: (value: string, record) => (
        <button className="project-code-link" onClick={() => setSelectedCustomerId(record.id)} type="button">
          {value}
        </button>
      ),
    },
    {
      title: "Tổ chức",
      key: "organization",
      render: (_, record) => (
        <div className="customer-name-cell">
          <strong>{record.company_name}</strong>
          <small>{record.tax_code ? `MST ${record.tax_code}` : "Chưa cập nhật mã số thuế"}</small>
        </div>
      ),
    },
    {
      title: "Liên hệ",
      key: "contact",
      responsive: ["lg"],
      render: (_, record) => (
        <div className="customer-contact-cell">
          <span><PhoneOutlined /> {record.phone || "Chưa cập nhật"}</span>
          <small><MailOutlined /> {record.email || "Chưa cập nhật"}</small>
        </div>
      ),
    },
    {
      title: "Hồ sơ chứng nhận",
      key: "projects",
      width: 150,
      align: "center",
      render: (_, record) => <Tag icon={<FolderOpenOutlined />}>{projectsByCustomer.get(record.id)?.length ?? 0} hồ sơ</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 155,
      render: (value: string | null) => <CustomerStatusTag status={value} />,
    },
    {
      title: "Cập nhật",
      dataIndex: "updated_at",
      key: "updated_at",
      responsive: ["xl"],
      width: 110,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "",
      key: "action",
      width: 90,
      render: (_, record) => <Button onClick={() => setSelectedCustomerId(record.id)} size="small">Chi tiết</Button>,
    },
  ];

  if (customersQuery.isLoading || projectsQuery.isLoading) {
    return <Card><Skeleton active paragraph={{ rows: 12 }} /></Card>;
  }

  if (customersQuery.isError || projectsQuery.isError) {
    const error = customersQuery.error ?? projectsQuery.error;
    return (
      <Card>
        <Empty description={getErrorMessage(error)} />
        <Button onClick={() => { void customersQuery.refetch(); void projectsQuery.refetch(); }}>Thử lại</Button>
      </Card>
    );
  }

  const activeCount = customers.filter((item) => normalize(item.status || "active") === "active").length;
  const inactiveCount = customers.length - activeCount;
  const linkedCount = customers.filter((item) => (projectsByCustomer.get(item.id)?.length ?? 0) > 0).length;
  const selectedProjects = selectedCustomer ? projectsByCustomer.get(selectedCustomer.id) ?? [] : [];

  return (
    <div className="customers-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">DỮ LIỆU KHÁCH HÀNG</span>
          <Title level={2}>Khách hàng</Title>
          <Text type="secondary">Quản lý thông tin pháp lý, liên hệ và toàn bộ hồ sơ chứng nhận của từng tổ chức.</Text>
        </div>
        {canManage ? <Button icon={<PlusOutlined />} onClick={openCreate} size="large" type="primary">Thêm khách hàng</Button> : null}
      </div>

      <section className="project-summary-grid" aria-label="Tổng hợp khách hàng">
        <Card><Statistic prefix={<TeamOutlined />} title="Tổng khách hàng" value={customers.length} /></Card>
        <Card><Statistic prefix={<CheckCircleOutlined />} title="Đang hoạt động" value={activeCount} /></Card>
        <Card><Statistic prefix={<FolderOpenOutlined />} title="Đã có hồ sơ chứng nhận" value={linkedCount} /></Card>
        <Card><Statistic prefix={<StopOutlined />} title="Ngừng hoạt động" value={inactiveCount} /></Card>
      </section>

      <Card className="customers-list-card">
        <div className="customer-list-toolbar">
          <Input
            allowClear
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm mã khách hàng, tên tổ chức, mã số thuế, liên hệ..."
            prefix={<SearchOutlined />}
            value={searchTerm}
          />
          <Select
            aria-label="Lọc trạng thái khách hàng"
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "active", label: "Đang hoạt động" },
              { value: "inactive", label: "Ngừng hoạt động" },
            ]}
            value={statusFilter}
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredCustomers}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có khách hàng phù hợp" /> }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} khách hàng` }}
          rowKey="id"
          scroll={{ x: 920 }}
        />
      </Card>

      <Drawer
        className="customer-detail-drawer"
        destroyOnHidden
        onClose={() => setSelectedCustomerId(null)}
        open={Boolean(selectedCustomer)}
        title={<div><Text type="secondary">Hồ sơ khách hàng</Text><strong>{selectedCustomer?.customer_code}</strong></div>}
        width={760}
      >
        {selectedCustomer ? (
          <div className="customer-detail-content">
            <Card className="customer-identity-card">
              <div className="customer-detail-heading">
                <div className="customer-avatar"><BankOutlined /></div>
                <div><Title level={3}>{selectedCustomer.company_name}</Title><CustomerStatusTag status={selectedCustomer.status} /></div>
                <Space>
                  {isAdmin && normalize(selectedCustomer.status || "active") !== "active" ? (
                    <Popconfirm
                      cancelText="Hủy"
                      description="Khách hàng sẽ được phép sử dụng lại cho các nghiệp vụ mới."
                      okText="Khôi phục hoạt động"
                      onConfirm={() => reactivateMutation.mutate(selectedCustomer.id)}
                      title="Khôi phục hoạt động khách hàng này?"
                    >
                      <Button icon={<UndoOutlined />} loading={reactivateMutation.isPending} type="primary">Khôi phục hoạt động</Button>
                    </Popconfirm>
                  ) : null}
                  {canManage ? <Button icon={<EditOutlined />} onClick={() => openEdit(selectedCustomer)}>Chỉnh sửa</Button> : null}
                </Space>
              </div>
              <Descriptions column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Mã khách hàng">{selectedCustomer.customer_code}</Descriptions.Item>
                <Descriptions.Item label="Mã số thuế">{selectedCustomer.tax_code || "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Điện thoại">{selectedCustomer.phone || "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Email">{selectedCustomer.email || "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Địa chỉ" span={2}>{selectedCustomer.address || "Chưa cập nhật"}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Hồ sơ chứng nhận" extra={<Tag>{selectedProjects.length} hồ sơ</Tag>}>
              <List
                dataSource={selectedProjects}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Khách hàng chưa có hồ sơ chứng nhận" /> }}
                renderItem={(project) => (
                  <List.Item actions={[<Button key="open" onClick={() => onOpenProject(project.id)} size="small">Mở hồ sơ</Button>]}>
                    <List.Item.Meta
                      avatar={<span className="customer-project-icon"><FolderOpenOutlined /></span>}
                      description={`${project.certification_applications?.application_code ?? "Chưa có đơn"} · Cập nhật ${dayjs(project.updated_at).format("DD/MM/YYYY")}`}
                      title={<Space><strong className="code-value">{project.project_code}</strong><Tag>{projectStatusLabels[normalize(project.status)] ?? project.status}</Tag></Space>}
                    />
                    <Text>{project.standard_name}</Text>
                  </List.Item>
                )}
              />
            </Card>

            {isAdmin ? (
              <Card className="customer-danger-zone" title="Trạng thái hoạt động">
                {normalize(selectedCustomer.status || "active") === "active" ? (
                  <div><Text>Ngừng hoạt động chỉ khóa việc sử dụng khách hàng cho nghiệp vụ mới, không xóa hồ sơ đã có.</Text>
                    <Popconfirm
                      cancelText="Hủy"
                      description="Dữ liệu và hồ sơ chứng nhận cũ vẫn được giữ nguyên."
                      okButtonProps={{ danger: true }}
                      okText="Ngừng hoạt động"
                      onConfirm={() => deactivateMutation.mutate(selectedCustomer.id)}
                      title="Ngừng hoạt động khách hàng này?"
                    >
                      <Button danger icon={<StopOutlined />} loading={deactivateMutation.isPending}>Ngừng hoạt động</Button>
                    </Popconfirm>
                  </div>
                ) : <Text>Khách hàng đang tạm ngừng. Sử dụng nút “Khôi phục hoạt động” phía trên để tiếp tục nghiệp vụ trên chính hồ sơ cũ.</Text>}
              </Card>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Modal
        cancelText="Hủy"
        confirmLoading={saveMutation.isPending}
        destroyOnHidden
        okText={editingCustomer ? "Lưu thay đổi" : "Tạo khách hàng"}
        onCancel={() => { setFormOpen(false); setEditingCustomer(null); form.resetFields(); }}
        onOk={() => void form.validateFields().then((values) => saveMutation.mutate(values))}
        open={formOpen}
        title={editingCustomer ? "Cập nhật khách hàng" : "Thêm khách hàng"}
        width={720}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <div className="customer-form-grid">
            <Form.Item label="Mã khách hàng" name="customer_code" rules={[{ required: true, message: "Nhập mã khách hàng" }, { max: 20 }]}>
              <Input disabled={Boolean(editingCustomer)} placeholder="Ví dụ: CUST004" />
            </Form.Item>
            <Form.Item label="Mã số thuế" name="tax_code" rules={[{ max: 20 }]}>
              <Input placeholder="Mã số thuế của tổ chức" />
            </Form.Item>
            <Form.Item className="customer-form-wide" label="Tên tổ chức" name="company_name" rules={[{ required: true, message: "Nhập tên tổ chức" }, { max: 255 }]}>
              <Input placeholder="Tên pháp lý đầy đủ của tổ chức" />
            </Form.Item>
            <Form.Item label="Điện thoại" name="phone" rules={[{ max: 20 }]}>
              <Input placeholder="Số điện thoại liên hệ" />
            </Form.Item>
            <Form.Item label="Email" name="email" rules={[{ type: "email", message: "Email không hợp lệ" }]}>
              <Input placeholder="Email liên hệ" />
            </Form.Item>
            <Form.Item className="customer-form-wide" label="Địa chỉ" name="address">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Địa chỉ trụ sở hoặc địa điểm liên hệ" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
