"use client";

import {
  CheckCircleOutlined,
  EditOutlined,
  FileAddOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface CustomerPortalOrganization {
  id: string;
  customer_code: string;
  company_name: string;
}

interface OperationalStandardEdition {
  id: string;
  scheme_id: string;
  standard_code: string;
  standard_name: string;
  edition: string;
  effective_from: string;
  label?: string;
  scheme: {
    id: string;
    code: string;
    name: string;
  };
}

interface CustomerApplicationSite {
  site_no?: number;
  site_name?: string | null;
  address: string;
  activities?: string | null;
  employee_count?: number | null;
  is_headquarters?: boolean;
}

interface CustomerApplication {
  id: string;
  customer_id: string;
  application_code: string;
  application_date: string;
  certification_type: string | null;
  standard_name: string;
  certification_scope: string;
  headquarters_address: string | null;
  representative_name: string | null;
  representative_position: string | null;
  representative_phone: string | null;
  representative_email: string | null;
  contact_name: string | null;
  contact_position: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  total_employee_count: number | null;
  employee_count: number | null;
  shift_count: number | null;
  shift1_count: number | null;
  shift2_count: number | null;
  shift3_count: number | null;
  external_provider_used: boolean | null;
  outsourced_processes: string | null;
  requested_audit_date: string | null;
  stage1_requested_date: string | null;
  stage2_requested_date: string | null;
  other_management_systems: boolean | null;
  management_system_details: string | null;
  certificate_languages: string | null;
  other_requests: string | null;
  declaration_accepted: boolean;
  status: string;
  portal_status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REVISION_REQUIRED" | "ACCEPTED" | "IN_CERTIFICATION" | "REJECTED" | "CANCELLED";
  can_edit: boolean;
  can_submit: boolean;
  customers: CustomerPortalOrganization;
  sites: CustomerApplicationSite[];
  project: { id: string; project_code: string; status: string | null } | null;
}

interface ApplicationFormValues {
  customer_id?: string;
  application_date: Dayjs;
  certification_type?: string;
  standard_names: string[];
  certification_scope: string;
  headquarters_address?: string;
  representative_name?: string;
  representative_position?: string;
  representative_phone?: string;
  representative_email?: string;
  contact_name?: string;
  contact_position?: string;
  contact_phone?: string;
  contact_email?: string;
  total_employee_count?: number;
  employee_count?: number;
  shift_count?: number;
  shift1_count?: number;
  shift2_count?: number;
  shift3_count?: number;
  external_provider_used?: boolean;
  outsourced_processes?: string;
  requested_audit_date?: Dayjs;
  stage1_requested_date?: Dayjs;
  stage2_requested_date?: Dayjs;
  other_management_systems?: boolean;
  management_system_details?: string;
  certificate_languages?: string[];
  other_requests?: string;
  declaration_accepted: boolean;
  sites?: Array<{
    site_name?: string;
    address: string;
    activities?: string;
    employee_count?: number;
    is_headquarters?: boolean;
  }>;
}

const portalStatusMeta: Record<CustomerApplication["portal_status"], { label: string; color: string }> = {
  DRAFT: { label: "Bản nháp", color: "default" },
  SUBMITTED: { label: "Đã gửi", color: "blue" },
  UNDER_REVIEW: { label: "Đang xem xét", color: "processing" },
  REVISION_REQUIRED: { label: "Cần bổ sung", color: "orange" },
  ACCEPTED: { label: "Đã chấp nhận", color: "green" },
  IN_CERTIFICATION: { label: "Đã tạo hồ sơ chứng nhận", color: "green" },
  REJECTED: { label: "Không chấp nhận", color: "red" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

function toDate(value?: string | null) {
  return value ? dayjs(value) : undefined;
}

function operationalStandardLabel(row: Pick<OperationalStandardEdition, "standard_code" | "edition" | "label">) {
  if (row.label?.trim()) return row.label.trim();
  const code = row.standard_code.trim();
  const edition = row.edition.trim();
  return edition && !code.toUpperCase().includes(edition.toUpperCase())
    ? `${code}:${edition}`
    : code;
}

function toPayload(values: ApplicationFormValues) {
  const { standard_names, ...rest } = values;
  return {
    ...rest,
    standard_name: (standard_names ?? []).join(" + "),
    application_date: values.application_date.format("YYYY-MM-DD"),
    requested_audit_date: values.requested_audit_date?.format("YYYY-MM-DD"),
    stage1_requested_date: values.stage1_requested_date?.format("YYYY-MM-DD"),
    stage2_requested_date: values.stage2_requested_date?.format("YYYY-MM-DD"),
    sites: (values.sites ?? []).map((site, index) => ({
      ...site,
      site_no: index + 1,
      is_headquarters: index === 0 ? true : Boolean(site.is_headquarters),
    })),
  };
}

export function CustomerApplicationsScreen() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const breakpoints = Grid.useBreakpoint();
  const useCompactPortalList = !breakpoints.lg;
  const [form] = Form.useForm<ApplicationFormValues>();
  const [editing, setEditing] = useState<CustomerApplication | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [applicationPage, setApplicationPage] = useState(1);

  const applicationsQuery = useQuery({
    queryKey: ["customer-portal", "applications"],
    queryFn: async () => (
      await api.get<CustomerApplication[]>("/customer-portal/me/applications")
    ).data,
  });
  const operationalStandardsQuery = useQuery({
    queryKey: ["customer-portal", "operational-standards"],
    queryFn: async () => (
      await api.get<OperationalStandardEdition[]>("/customer-portal/me/operational-standards")
    ).data,
    enabled: modalOpen,
    staleTime: 60_000,
    retry: false,
  });
  const organizationsQuery = useQuery({
    queryKey: ["customer-portal", "profile"],
    queryFn: async () => (
      await api.get<CustomerPortalOrganization[]>("/customer-portal/me/profile")
    ).data,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customer-portal", "applications"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-portal", "dashboard"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: ApplicationFormValues) => {
      const payload = toPayload(values);
      if (editing) {
        return (await api.patch(`/customer-portal/me/applications/${editing.id}`, payload)).data;
      }
      return (await api.post("/customer-portal/me/applications", payload)).data;
    },
    onSuccess: async () => {
      message.success(editing ? "Đã cập nhật đơn đăng ký." : "Đã tạo bản nháp đơn đăng ký.");
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => (
      await api.post(`/customer-portal/me/applications/${id}/submit`)
    ).data,
    onSuccess: async () => {
      message.success("Đã gửi đơn đăng ký tới tổ chức chứng nhận.");
      await refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const organizations = useMemo(() => organizationsQuery.data ?? [], [organizationsQuery.data]);
  const operationalStandards = useMemo(() => operationalStandardsQuery.data ?? [], [operationalStandardsQuery.data]);
  const operationalStandardOptions = useMemo(() => {
    const groups = new Map<string, { label: string; options: Array<{ value: string; label: string }> }>();
    for (const row of operationalStandards) {
      const group = groups.get(row.scheme.id) ?? {
        label: `${row.scheme.code} · ${row.scheme.name}`,
        options: [],
      };
      const label = operationalStandardLabel(row);
      if (!group.options.some((item) => item.value === label)) {
        group.options.push({ value: label, label });
      }
      groups.set(row.scheme.id, group);
    }
    return Array.from(groups.values());
  }, [operationalStandards]);
  const organizationOptions = useMemo(
    () => organizations.map((item) => ({
      value: item.id,
      label: `${item.customer_code} · ${item.company_name}`,
    })),
    [organizations],
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      application_date: dayjs(),
      certification_type: "INITIAL",
      customer_id: organizations.length === 1 ? organizations[0].id : undefined,
      declaration_accepted: false,
      sites: [{ address: "", is_headquarters: true }],
    });
    setModalOpen(true);
  };

  const openEdit = (item: CustomerApplication) => {
    setEditing(item);
    form.resetFields();
    form.setFieldsValue({
      customer_id: item.customer_id,
      application_date: dayjs(item.application_date),
      certification_type: item.certification_type ?? undefined,
      standard_names: item.standard_name.split(" + ").map((value) => value.trim()).filter(Boolean),
      certification_scope: item.certification_scope,
      headquarters_address: item.headquarters_address ?? undefined,
      representative_name: item.representative_name ?? undefined,
      representative_position: item.representative_position ?? undefined,
      representative_phone: item.representative_phone ?? undefined,
      representative_email: item.representative_email ?? undefined,
      contact_name: item.contact_name ?? undefined,
      contact_position: item.contact_position ?? undefined,
      contact_phone: item.contact_phone ?? undefined,
      contact_email: item.contact_email ?? undefined,
      total_employee_count: item.total_employee_count ?? undefined,
      employee_count: item.employee_count ?? undefined,
      shift_count: item.shift_count ?? undefined,
      shift1_count: item.shift1_count ?? undefined,
      shift2_count: item.shift2_count ?? undefined,
      shift3_count: item.shift3_count ?? undefined,
      external_provider_used: item.external_provider_used ?? undefined,
      outsourced_processes: item.outsourced_processes ?? undefined,
      requested_audit_date: toDate(item.requested_audit_date),
      stage1_requested_date: toDate(item.stage1_requested_date),
      stage2_requested_date: toDate(item.stage2_requested_date),
      other_management_systems: item.other_management_systems ?? undefined,
      management_system_details: item.management_system_details ?? undefined,
      certificate_languages: item.certificate_languages
        ? item.certificate_languages.split(",").map((value) => value.trim()).filter(Boolean)
        : undefined,
      other_requests: item.other_requests ?? undefined,
      declaration_accepted: item.declaration_accepted,
      sites: item.sites.map((site) => ({
        site_name: site.site_name ?? undefined,
        address: site.address,
        activities: site.activities ?? undefined,
        employee_count: site.employee_count ?? undefined,
        is_headquarters: site.is_headquarters,
      })),
    });
    setModalOpen(true);
  };

  const columns: TableColumnsType<CustomerApplication> = [
    {
      title: "Đơn đăng ký",
      key: "application",
      render: (_, item) => (
        <div className="table-primary-cell">
          <strong>{item.application_code}</strong>
          <small>{dayjs(item.application_date).format("DD/MM/YYYY")} · {item.customers.company_name}</small>
        </div>
      ),
    },
    {
      title: "Tiêu chuẩn",
      dataIndex: "standard_name",
      key: "standard_name",
    },
    {
      title: "Phạm vi",
      dataIndex: "certification_scope",
      key: "certification_scope",
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      key: "portal_status",
      render: (_, item) => {
        const meta = portalStatusMeta[item.portal_status];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Hồ sơ",
      key: "project",
      render: (_, item) => item.project ? <Tag color="green">{item.project.project_code}</Tag> : "—",
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, item) => renderApplicationActions(item),
    },
  ];

  const renderApplicationActions = (item: CustomerApplication, compact = false) => (
        <Space className={compact ? "portal-mobile-card__actions" : undefined} wrap>
          <Button disabled={!item.can_edit} icon={<EditOutlined />} onClick={() => openEdit(item)} size="small">
            Sửa
          </Button>
          <Button
            disabled={!item.can_submit}
            icon={<SendOutlined />}
            loading={submitMutation.isPending}
            onClick={() => Modal.confirm({
              title: "Gửi đơn đăng ký?",
              content: "Sau khi gửi, đơn sẽ chuyển sang trạng thái chờ tiếp nhận và tạm khóa chỉnh sửa.",
              okText: "Gửi đơn",
              cancelText: "Hủy",
              onOk: async () => submitMutation.mutateAsync(item.id),
            })}
            size="small"
            type={item.can_submit ? "primary" : "default"}
          >
            Gửi đơn
          </Button>
        </Space>
      );

  const applications = applicationsQuery.data ?? [];
  const applicationPageCount = Math.max(1, Math.ceil(applications.length / 10));
  const visibleApplicationPage = Math.min(applicationPage, applicationPageCount);
  const visibleApplications = applications.slice((visibleApplicationPage - 1) * 10, visibleApplicationPage * 10);

  if (applicationsQuery.isError) {
    return <Alert message="Không tải được đơn đăng ký" description={getErrorMessage(applicationsQuery.error)} showIcon type="error" />;
  }

  return (
    <div className="projects-screen customer-portal-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">CỔNG KHÁCH HÀNG</span>
          <Title level={2}>Đơn đăng ký chứng nhận</Title>
          <Text type="secondary">Tạo, cập nhật và gửi đơn đăng ký trực tiếp. Sau khi gửi, tổ chức chứng nhận tiếp nhận và phân công người xem xét.</Text>
        </div>
        <Button icon={<FileAddOutlined />} onClick={openCreate} type="primary">Tạo đơn đăng ký</Button>
      </div>

      <Card loading={applicationsQuery.isLoading}>
        {applications.length ? (
          useCompactPortalList ? (
            <>
              <div aria-label="Danh sách đơn đăng ký" className="portal-mobile-list">
                {visibleApplications.map((item) => {
                  const status = portalStatusMeta[item.portal_status];
                  return (
                    <article className="portal-mobile-card" key={item.id}>
                      <div className="portal-mobile-card__heading">
                        <div className="portal-mobile-card__identity">
                          <strong>{item.application_code}</strong>
                          <small>{dayjs(item.application_date).format("DD/MM/YYYY")} · {item.customers.company_name}</small>
                        </div>
                        <Tag color={status.color}>{status.label}</Tag>
                      </div>
                      <div className="portal-mobile-card__meta">
                        <span><strong>Tiêu chuẩn:</strong> {item.standard_name}</span>
                        <span><strong>Phạm vi:</strong> {item.certification_scope}</span>
                        <span><strong>Hồ sơ:</strong> {item.project?.project_code ?? "Chưa hình thành"}</span>
                      </div>
                      {renderApplicationActions(item, true)}
                    </article>
                  );
                })}
              </div>
              {applications.length > 10 ? (
                <Pagination
                  className="compact-mobile-pagination"
                  current={visibleApplicationPage}
                  onChange={setApplicationPage}
                  pageSize={10}
                  responsive
                  showSizeChanger={false}
                  showTotal={(total) => `${total} đơn`}
                  total={applications.length}
                />
              ) : null}
            </>
          ) : (
          <Table<CustomerApplication>
            columns={columns}
            dataSource={applications}
            loading={applicationsQuery.isLoading}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            rowKey="id"
            scroll={{ x: 1000 }}
          />
          )
        ) : <Empty description="Chưa có đơn đăng ký" />}
      </Card>

      <Modal
        centered
        className="customer-application-modal"
        footer={null}
        forceRender
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        open={modalOpen}
        title={editing ? `Cập nhật ${editing.application_code}` : "Tạo đơn đăng ký chứng nhận"}
        width={980}
      >
        <Form<ApplicationFormValues>
          className="customer-application-form"
          form={form}
          layout="vertical"
          onFinish={(values) => saveMutation.mutate(values)}
        >
          <div className="customer-application-form__fields">
          {organizations.length > 1 ? (
            <Form.Item label="Tổ chức" name="customer_id" rules={[{ required: true, message: "Chọn tổ chức" }]}>
              <Select disabled={Boolean(editing)} options={organizationOptions} />
            </Form.Item>
          ) : null}

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Ngày đăng ký" name="application_date" rules={[{ required: true, message: "Chọn ngày đăng ký" }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Loại chứng nhận" name="certification_type">
                <Select options={[
                  { value: "INITIAL", label: "Chứng nhận lần đầu" },
                  { value: "TRANSFER", label: "Chuyển đổi chứng nhận" },
                  { value: "OTHER", label: "Khác" },
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                extra="Chỉ hiển thị tiêu chuẩn mà tổ chức chứng nhận đang tiếp nhận."
                label="Tiêu chuẩn"
                name="standard_names"
                rules={[{ required: true, message: "Chọn ít nhất một tiêu chuẩn" }]}
              >
                <Select
                  disabled={operationalStandardsQuery.isError || (!operationalStandardsQuery.isLoading && operationalStandards.length === 0)}
                  loading={operationalStandardsQuery.isLoading}
                  mode="multiple"
                  optionFilterProp="label"
                  options={operationalStandardOptions}
                  placeholder={operationalStandardsQuery.isLoading ? "Đang tải tiêu chuẩn..." : "Chọn tiêu chuẩn"}
                  showSearch
                />
              </Form.Item>
            </Col>
          </Row>

          {operationalStandardsQuery.isError ? (
            <Alert
              description="Không thể tải danh sách tiêu chuẩn đang tiếp nhận. Vui lòng thử lại trước khi lưu đơn."
              message="Chưa tải được danh sách tiêu chuẩn"
              showIcon
              style={{ marginBottom: 16 }}
              type="error"
            />
          ) : !operationalStandardsQuery.isLoading && operationalStandards.length === 0 ? (
            <Alert
              description="Hiện chưa có chương trình và phiên bản tiêu chuẩn sẵn sàng tiếp nhận đơn mới."
              message="Chưa có tiêu chuẩn đang tiếp nhận"
              showIcon
              style={{ marginBottom: 16 }}
              type="warning"
            />
          ) : null}

          <Form.Item label="Phạm vi đề nghị chứng nhận" name="certification_scope" rules={[{ required: true, message: "Nhập phạm vi chứng nhận" }]}>
            <TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
          </Form.Item>
          <Form.Item label="Địa chỉ trụ sở" name="headquarters_address">
            <TextArea autoSize={{ minRows: 1, maxRows: 3 }} />
          </Form.Item>

          <Title level={5}>Đại diện và người liên hệ</Title>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Người đại diện" name="representative_name"><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Chức vụ" name="representative_position"><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Điện thoại đại diện" name="representative_phone"><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Email đại diện" name="representative_email" rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Người liên hệ" name="contact_name"><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Chức vụ người liên hệ" name="contact_position"><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Điện thoại liên hệ" name="contact_phone"><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Email liên hệ" name="contact_email" rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input /></Form.Item></Col>
          </Row>

          <Title level={5}>Nhân sự và ca làm việc</Title>
          <Row gutter={16}>
            <Col xs={12} md={4}><Form.Item label="Tổng nhân sự" name="total_employee_count"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Nhân sự hiệu lực" name="employee_count"><InputNumber min={1} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Số ca" name="shift_count"><InputNumber min={1} max={3} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Ca 1" name="shift1_count"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Ca 2" name="shift2_count"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Ca 3" name="shift3_count"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
          </Row>

          <Title level={5}>Địa điểm chứng nhận</Title>
          <Form.List name="sites">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {fields.map((field, index) => (
                  <Card key={field.key} size="small" title={index === 0 ? "Trụ sở chính" : `Địa điểm ${index + 1}`}>
                    <Row gutter={12}>
                      <Col xs={24} md={8}><Form.Item label="Tên địa điểm" name={[field.name, "site_name"]}><Input /></Form.Item></Col>
                      <Col xs={24} md={16}><Form.Item label="Địa chỉ" name={[field.name, "address"]} rules={[{ required: index === 0, message: "Nhập địa chỉ" }]}><Input /></Form.Item></Col>
                      <Col xs={24} md={16}><Form.Item label="Hoạt động" name={[field.name, "activities"]}><Input /></Form.Item></Col>
                      <Col xs={16} md={5}><Form.Item label="Nhân sự" name={[field.name, "employee_count"]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
                      <Col xs={8} md={3} style={{ display: "flex", alignItems: "center" }}>
                        {index > 0 ? <Button danger onClick={() => remove(field.name)}>Xóa</Button> : null}
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button onClick={() => add({ address: "" })}>+ Thêm địa điểm</Button>
              </Space>
            )}
          </Form.List>

          <Title level={5} style={{ marginTop: 20 }}>Thời gian đề nghị và thông tin bổ sung</Title>
          <Row gutter={16}>
            <Col xs={24} md={8}><Form.Item label="Ngày đánh giá đề nghị" name="requested_audit_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="GĐ1 đề nghị" name="stage1_requested_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="GĐ2 đề nghị" name="stage2_requested_date"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col>
          </Row>
          <Form.Item name="external_provider_used" valuePropName="checked"><Checkbox>Có sử dụng quá trình thuê ngoài / nhà cung cấp bên ngoài liên quan</Checkbox></Form.Item>
          <Form.Item label="Quá trình thuê ngoài" name="outsourced_processes"><TextArea autoSize={{ minRows: 1, maxRows: 4 }} /></Form.Item>
          <Form.Item name="other_management_systems" valuePropName="checked"><Checkbox>Có hệ thống quản lý khác đang áp dụng</Checkbox></Form.Item>
          <Form.Item label="Thông tin hệ thống quản lý khác" name="management_system_details"><TextArea autoSize={{ minRows: 1, maxRows: 4 }} /></Form.Item>
          <Form.Item label="Ngôn ngữ chứng chỉ" name="certificate_languages">
            <Select mode="tags" placeholder="Ví dụ: Vietnamese, English, Chinese" />
          </Form.Item>
          <Form.Item label="Yêu cầu khác" name="other_requests"><TextArea autoSize={{ minRows: 1, maxRows: 4 }} /></Form.Item>

          <Form.Item
            name="declaration_accepted"
            valuePropName="checked"
          >
            <Checkbox>
              Tôi xác nhận các thông tin cung cấp là chính xác và đồng ý sử dụng cho quá trình xem xét đăng ký chứng nhận. Xác nhận này là bắt buộc trước khi Gửi đơn, nhưng không bắt buộc khi lưu bản nháp.
            </Checkbox>
          </Form.Item>

          <Alert
            message="Bản nháp chưa được tổ chức chứng nhận xem xét cho đến khi bạn bấm Gửi đơn."
            showIcon
            style={{ marginBottom: 16 }}
            type="info"
          />
          </div>

          <Space className="customer-application-form-actions" style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button htmlType="submit" icon={<CheckCircleOutlined />} loading={saveMutation.isPending} type="primary">
              Lưu bản nháp
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
