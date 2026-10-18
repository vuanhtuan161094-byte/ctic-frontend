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
  UserAddOutlined,
  KeyOutlined,
} from "@ant-design/icons";
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
  Form,
  Grid,
  Input,
  List,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { CustomerPortalAccountModal } from "./CustomerPortalAccountModal";

const { Text, Title } = Typography;
const CUSTOMER_PAGE_SIZE = 10;

const COUNTRY_CODE_OPTIONS = [
  { value: "VN", label: "VN · Việt Nam" },
  { value: "KH", label: "KH · Campuchia" },
  { value: "ID", label: "ID · Indonesia" },
  { value: "CN", label: "CN · Trung Quốc" },
  { value: "JP", label: "JP · Nhật Bản" },
  { value: "KR", label: "KR · Hàn Quốc" },
  { value: "SG", label: "SG · Singapore" },
  { value: "MY", label: "MY · Malaysia" },
  { value: "TH", label: "TH · Thái Lan" },
  { value: "OTHER", label: "Khác · Nhập tên quốc gia" },
];

function normalizeCountryCode(value?: string | null) {
  return String(value ?? "VN").trim().toUpperCase();
}

function taxIdentifierLabel(countryCode?: string | null) {
  return normalizeCountryCode(countryCode) === "VN"
    ? "Mã số thuế"
    : "Tax ID / Business ID";
}


interface Customer {
  id: string;
  customer_code: string;
  company_name: string;
  country_code?: string | null;
  country_name?: string | null;
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
  country_code?: string;
  country_name?: string;
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


interface CustomerUserAccess {
  id: string;
  user_id: string;
  customer_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    status: string | null;
  };
}

interface PortalPasswordResetResult {
  user: {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    status: string | null;
  };
  temporary_password: string;
  note: string;
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
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CustomerFormValues>();
  const breakpoints = Grid.useBreakpoint();
  const useCompactCustomerList = !breakpoints.lg;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerPage, setCustomerPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [countryChoice, setCountryChoice] = useState("VN");
  const [portalAccountOpen, setPortalAccountOpen] = useState(false);
  const formCountryCode = Form.useWatch("country_code", form);
  const watchedCountryCode = countryChoice === "OTHER"
    ? "OT"
    : (formCountryCode ?? editingCustomer?.country_code ?? "VN");

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

  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data]);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const selectedCustomer = customers.find((item) => item.id === selectedCustomerId) ?? null;
  const customerAccessQuery = useQuery({
    enabled: Boolean(selectedCustomerId && isAdmin),
    queryKey: ["customers", selectedCustomerId, "user-access"],
    queryFn: async () => (await api.get<CustomerUserAccess[]>(`/customers/${selectedCustomerId}/user-access`)).data,
  });

  const customerAccess = customerAccessQuery.data ?? [];
  const activePortalAccessCount = customerAccess.filter((item) => normalize(item.status) === "active").length;

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
  const customerPageCount = Math.max(1, Math.ceil(filteredCustomers.length / CUSTOMER_PAGE_SIZE));
  const visibleCustomerPage = Math.min(customerPage, customerPageCount);
  const visibleCustomers = filteredCustomers.slice(
    (visibleCustomerPage - 1) * CUSTOMER_PAGE_SIZE,
    visibleCustomerPage * CUSTOMER_PAGE_SIZE,
  );

  const saveMutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const payload = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? value.trim() || undefined : value]),
      ) as Record<string, unknown>;
      if (countryChoice === "OTHER") {
        payload.country_code = "OT";
        payload.country_name = values.country_name?.trim();
      } else {
        payload.country_code = countryChoice;
        payload.country_name = null;
      }
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

  const customerAccessMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "reactivate" | "revoke" }) => {
      if (!selectedCustomerId) throw new Error("Chưa chọn khách hàng");
      if (action === "reactivate") {
        return (await api.put(`/customers/${selectedCustomerId}/user-access/${userId}`)).data;
      }
      return (await api.delete(`/customers/${selectedCustomerId}/user-access/${userId}`)).data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["customers", selectedCustomerId, "user-access"] });
      message.success(variables.action === "reactivate" ? "Đã khôi phục quyền Portal" : "Đã ngừng quyền Portal");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const resetPortalPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!selectedCustomerId) throw new Error("Chưa chọn khách hàng");
      return (await api.post<PortalPasswordResetResult>(
        `/customers/${selectedCustomerId}/portal-users/${userId}/reset-password`,
      )).data;
    },
    onSuccess: (data) => {
      modal.success({
        title: "Đã tạo mật khẩu mới",
        width: 560,
        content: (
          <Space direction="vertical" size="middle" style={{ width: "100%", marginTop: 12 }}>
            <Text>Mật khẩu mới chỉ hiển thị ở lần này. Sao chép để gửi cho khách hàng.</Text>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Tên đăng nhập"><Text copyable>{data.user.username}</Text></Descriptions.Item>
              <Descriptions.Item label="Email"><Text copyable>{data.user.email}</Text></Descriptions.Item>
              <Descriptions.Item label="Mật khẩu ban đầu"><Text copyable strong>{data.temporary_password}</Text></Descriptions.Item>
            </Descriptions>
          </Space>
        ),
      });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingCustomer(null);
    form.resetFields();
    form.setFieldsValue({ country_code: "VN", country_name: undefined });
    setCountryChoice("VN");
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    const normalizedCountry = normalizeCountryCode(customer.country_code ?? "VN");
    const knownCountry = COUNTRY_CODE_OPTIONS.some((option) => option.value === normalizedCountry && option.value !== "OTHER");
    setCountryChoice(knownCountry ? normalizedCountry : "OTHER");
    form.setFieldsValue({
      customer_code: customer.customer_code,
      company_name: customer.company_name,
      country_code: knownCountry ? normalizedCountry : "OT",
      country_name: knownCountry ? undefined : (customer.country_name ?? (normalizedCountry !== "OT" ? normalizedCountry : undefined)),
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
          <small>{record.tax_code ? `${taxIdentifierLabel(record.country_code)} ${record.tax_code}` : `Chưa cập nhật ${taxIdentifierLabel(record.country_code).toLowerCase()}`}</small>
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
          <Text type="secondary">Thông tin pháp lý, liên hệ và hồ sơ chứng nhận theo từng tổ chức.</Text>
        </div>
        {canManage ? <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">Thêm khách hàng</Button> : null}
      </div>

      <section className="customer-summary-strip" aria-label="Tổng hợp khách hàng">
        <div><TeamOutlined /><span>Tổng khách hàng</span><strong>{customers.length}</strong></div>
        <div><CheckCircleOutlined /><span>Đang hoạt động</span><strong>{activeCount}</strong></div>
        <div><FolderOpenOutlined /><span>Đã có hồ sơ</span><strong>{linkedCount}</strong></div>
        <div><StopOutlined /><span>Ngừng hoạt động</span><strong>{inactiveCount}</strong></div>
      </section>

      <Card className="customers-list-card">
        <div className="customer-list-toolbar">
          <Input
            allowClear
            onChange={(event) => { setSearchTerm(event.target.value); setCustomerPage(1); }}
            placeholder="Tìm mã khách hàng, tên tổ chức, mã số thuế, liên hệ..."
            prefix={<SearchOutlined />}
            value={searchTerm}
          />
          <Select
            aria-label="Lọc trạng thái khách hàng"
            onChange={(value) => { setStatusFilter(value); setCustomerPage(1); }}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "active", label: "Đang hoạt động" },
              { value: "inactive", label: "Ngừng hoạt động" },
            ]}
            value={statusFilter}
          />
        </div>
        {useCompactCustomerList ? (
          <>
            {visibleCustomers.length ? (
              <div aria-label="Danh sách khách hàng" className="customer-mobile-list">
                {visibleCustomers.map((customer) => (
                  <article className="customer-mobile-card" key={customer.id}>
                    <div className="customer-mobile-card__heading">
                      <div className="customer-mobile-card__identity">
                        <button
                          aria-label={`Mở hồ sơ ${customer.company_name}`}
                          className="customer-mobile-card__code"
                          onClick={() => setSelectedCustomerId(customer.id)}
                          type="button"
                        >
                          {customer.customer_code}
                        </button>
                        <strong>{customer.company_name}</strong>
                      </div>
                      <CustomerStatusTag status={customer.status} />
                    </div>
                    <div className="customer-mobile-card__meta">
                      <span>{taxIdentifierLabel(customer.country_code)} · {customer.tax_code || "Chưa cập nhật"}</span>
                      <span>{customer.phone || "Chưa cập nhật số điện thoại"}</span>
                      <span>{customer.email || "Chưa cập nhật email"}</span>
                    </div>
                    <div className="customer-mobile-card__actions">
                      <Tag icon={<FolderOpenOutlined />}>
                        {projectsByCustomer.get(customer.id)?.length ?? 0} hồ sơ
                      </Tag>
                      <Button onClick={() => setSelectedCustomerId(customer.id)} size="small">Chi tiết</Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có khách hàng phù hợp" />
            )}
            {filteredCustomers.length > CUSTOMER_PAGE_SIZE ? (
              <Pagination
                className="customer-mobile-pagination"
                current={visibleCustomerPage}
                onChange={setCustomerPage}
                pageSize={CUSTOMER_PAGE_SIZE}
                responsive
                showSizeChanger={false}
                showTotal={(total) => `${total} khách hàng`}
                total={filteredCustomers.length}
              />
            ) : null}
          </>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredCustomers}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có khách hàng phù hợp" /> }}
            pagination={{
              current: visibleCustomerPage,
              pageSize: CUSTOMER_PAGE_SIZE,
              showSizeChanger: false,
              showTotal: (total) => `${total} khách hàng`,
              onChange: setCustomerPage,
            }}
            rowKey="id"
            scroll={{ x: 920 }}
          />
        )}
      </Card>

      <Drawer
        className="customer-detail-drawer"
        destroyOnHidden
        onClose={() => setSelectedCustomerId(null)}
        open={Boolean(selectedCustomer)}
        title={<div><Text type="secondary">Hồ sơ khách hàng</Text><strong>{selectedCustomer?.customer_code}</strong></div>}
        width={620}
      >
        {selectedCustomer ? (
          <div className="customer-detail-content">
            <Card className="customer-identity-card" size="small">
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
              <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="Mã khách hàng">{selectedCustomer.customer_code}</Descriptions.Item>
                <Descriptions.Item label="Quốc gia">{selectedCustomer.country_name?.trim() || normalizeCountryCode(selectedCustomer.country_code)}</Descriptions.Item>
                <Descriptions.Item label={taxIdentifierLabel(selectedCustomer.country_code)}>{selectedCustomer.tax_code || "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Điện thoại">{selectedCustomer.phone || "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Email">{selectedCustomer.email || "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label="Địa chỉ" span={2}>{selectedCustomer.address || "Chưa cập nhật"}</Descriptions.Item>
              </Descriptions>
            </Card>

            {isAdmin ? (
              <Card
                className="customer-access-card"
                size="small"
                title={(
                  <div className="customer-card-title">
                    <span>Tài khoản khách hàng</span>
                    <small>Quyền Portal của tổ chức</small>
                  </div>
                )}
                extra={
                  <Button
                    icon={<UserAddOutlined />}
                    onClick={() => setPortalAccountOpen(true)}
                    type="primary"
                    disabled={normalize(selectedCustomer.status || "active") !== "active"}
                  >
                    Thêm tài khoản
                  </Button>
                }
              >
                <List
                  loading={customerAccessQuery.isLoading}
                  dataSource={customerAccess}
                  locale={{ emptyText: <div className="customer-empty-inline"><TeamOutlined /><Text type="secondary">Chưa có tài khoản khách hàng</Text></div> }}
                  renderItem={(access) => {
                    const active = normalize(access.status) === "active";
                    const accountActive = normalize(access.user.status || "active") === "active";
                    const blockLastRevoke = active && activePortalAccessCount <= 1;
                    return (
                      <List.Item
                        actions={[
                          <Button
                            key="password"
                            icon={<KeyOutlined />}
                            size="small"
                            disabled={!accountActive}
                            loading={resetPortalPasswordMutation.isPending}
                            onClick={() => resetPortalPasswordMutation.mutate(access.user_id)}
                          >
                            Mật khẩu
                          </Button>,
                          active ? (
                            <Popconfirm
                              key="revoke"
                              title="Ngừng quyền Portal của tài khoản này?"
                              description={blockLastRevoke
                                ? "Đây là tài khoản Portal hoạt động cuối cùng của khách hàng; hệ thống giữ lại ít nhất một tài khoản hoạt động."
                                : "Tài khoản vẫn được giữ, chỉ ngừng liên kết truy cập với khách hàng này."}
                              okText="Ngừng quyền"
                              cancelText="Hủy"
                              disabled={blockLastRevoke}
                              onConfirm={() => customerAccessMutation.mutate({ userId: access.user_id, action: "revoke" })}
                            >
                              <Button danger size="small" disabled={blockLastRevoke}>Ngừng</Button>
                            </Popconfirm>
                          ) : (
                            <Button
                              key="reactivate"
                              size="small"
                              disabled={!accountActive}
                              onClick={() => customerAccessMutation.mutate({ userId: access.user_id, action: "reactivate" })}
                            >
                              Khôi phục
                            </Button>
                          ),
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<span className="customer-project-icon"><TeamOutlined /></span>}
                          title={<Space wrap size={6}><strong>{access.user.full_name || access.user.username}</strong><Tag color={active ? "green" : "default"}>{active ? "Có quyền Portal" : "Đã ngừng quyền"}</Tag></Space>}
                          description={<><Text type="secondary">{access.user.email} · @{access.user.username}</Text>{!accountActive ? <><br /><Text type="danger">Tài khoản đang bị khóa/ngừng hoạt động</Text></> : null}</>}
                        />
                      </List.Item>
                    );
                  }}
                />
              </Card>
            ) : null}

            <Card className="customer-projects-card" size="small" title="Hồ sơ chứng nhận" extra={<Tag>{selectedProjects.length} hồ sơ</Tag>}>
              <List
                dataSource={selectedProjects}
                locale={{ emptyText: <div className="customer-empty-inline"><FolderOpenOutlined /><Text type="secondary">Chưa có hồ sơ chứng nhận</Text></div> }}
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
              <Card className="customer-danger-zone" size="small" title="Trạng thái hoạt động">
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

      <CustomerPortalAccountModal
        open={portalAccountOpen}
        customerId={selectedCustomer?.id}
        customerCode={selectedCustomer?.customer_code}
        customerName={selectedCustomer?.company_name}
        onClose={() => setPortalAccountOpen(false)}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ["customers", selectedCustomerId, "user-access"] });
          await queryClient.invalidateQueries({ queryKey: ["system-governance", "customer-access"] });
        }}
      />

      <Modal
        centered={breakpoints.xs}
        className="customer-form-modal"
        cancelText="Hủy"
        confirmLoading={saveMutation.isPending}
        destroyOnHidden
        okText={editingCustomer ? "Lưu thay đổi" : "Tạo khách hàng"}
        onCancel={() => { setFormOpen(false); setEditingCustomer(null); form.resetFields(); }}
        onOk={() => form.validateFields().then((values) => saveMutation.mutate(values)).catch(() => undefined)}
        open={formOpen}
        title={editingCustomer ? "Cập nhật khách hàng" : "Thêm khách hàng"}
        width={760}
      >
        <Form className="customer-form customer-form--compact" form={form} layout="vertical">
          <section className="customer-form-section">
            <div className="customer-form-section__heading customer-form-section__heading--compact">
              <strong>Thông tin tổ chức</strong>
              <Text type="secondary">Mã khách hàng và tên tổ chức là bắt buộc</Text>
            </div>

            <div className="customer-form-grid customer-form-grid--identity">
              <Form.Item label="Mã khách hàng" name="customer_code" rules={[{ required: true, message: "Nhập mã khách hàng" }, { max: 20 }]}>
                <Input disabled={Boolean(editingCustomer)} placeholder="Ví dụ: CUST004" />
              </Form.Item>

              <Form.Item label="Quốc gia">
                <Select
                  value={countryChoice}
                  options={COUNTRY_CODE_OPTIONS}
                  onChange={(value) => {
                    setCountryChoice(value);
                    if (value !== "OTHER") {
                      form.setFieldValue("country_code", value);
                      form.setFieldValue("country_name", undefined);
                    } else {
                      form.setFieldValue("country_code", "OT");
                    }
                  }}
                />
              </Form.Item>

              {countryChoice === "OTHER" ? (
                <Form.Item
                  label="Tên quốc gia"
                  name="country_name"
                  rules={[
                    { required: true, message: "Nhập tên quốc gia" },
                    { max: 100, message: "Tên quốc gia không được vượt quá 100 ký tự" },
                  ]}
                >
                  <Input maxLength={100} placeholder="Ví dụ: Lào, Hoa Kỳ" />
                </Form.Item>
              ) : null}

              <Form.Item hidden name="country_code"><Input /></Form.Item>

              <Form.Item
                dependencies={["country_code"]}
                label={taxIdentifierLabel(watchedCountryCode)}
                name="tax_code"
                rules={[
                  { max: 20, message: "Tax ID/Business ID không được vượt quá 20 ký tự" },
                  ({ getFieldValue }) => ({
                    validator: async (_, value) => {
                      if (!value) return;
                      const countryCode = normalizeCountryCode(getFieldValue("country_code"));
                      if (countryCode !== "VN") return;
                      const normalized = String(value).replace(/[\s-]/g, "");
                      if (!/^\d{10}(?:\d{3})?$/.test(normalized)) {
                        throw new Error("Mã số thuế Việt Nam phải gồm 10 hoặc 13 chữ số");
                      }
                    },
                  }),
                ]}
                extra={normalizeCountryCode(watchedCountryCode) === "VN"
                  ? "10 hoặc 13 chữ số; chấp nhận dạng 0101234567-001."
                  : "Theo định dạng của quốc gia."}
              >
                <Input placeholder={normalizeCountryCode(watchedCountryCode) === "VN" ? "Ví dụ: 0101234567" : "Tax ID / Business ID"} />
              </Form.Item>

              <Form.Item className="customer-form-wide" label="Tên tổ chức" name="company_name" rules={[{ required: true, message: "Nhập tên tổ chức" }, { max: 255 }]}>
                <Input placeholder="Tên pháp lý đầy đủ của tổ chức" />
              </Form.Item>
            </div>
          </section>

          <section className="customer-form-section">
            <div className="customer-form-section__heading customer-form-section__heading--compact">
              <strong>Liên hệ</strong>
              <Text type="secondary">Không bắt buộc</Text>
            </div>

            <div className="customer-form-grid">
              <Form.Item label="Điện thoại" name="phone" rules={[{ max: 20 }]}>
                <Input placeholder="Số điện thoại" />
              </Form.Item>
              <Form.Item label="Email" name="email" rules={[{ type: "email", message: "Email không hợp lệ" }]}>
                <Input placeholder="Email liên hệ" />
              </Form.Item>
              <Form.Item className="customer-form-wide" label="Địa chỉ" name="address">
                <Input placeholder="Địa chỉ trụ sở hoặc địa điểm liên hệ" />
              </Form.Item>
            </div>
          </section>
        </Form>
      </Modal>
    </div>
  );
}
