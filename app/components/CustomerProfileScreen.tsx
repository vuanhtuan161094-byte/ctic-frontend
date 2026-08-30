"use client";

import {
  BankOutlined,
  EditOutlined,
  FileAddOutlined,
  MailOutlined,
  PaperClipOutlined,
  PhoneOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UploadFile } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from "antd";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { openDocumentFile } from "../lib/document-file-client";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface CustomerContact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
}

interface CustomerProfile {
  id: string;
  customer_code: string;
  company_name: string;
  country_code: string;
  country_name: string | null;
  tax_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  contacts: CustomerContact[];
}

interface OrganizationSnapshot {
  organization: {
    id: string;
    customer_code: string;
    company_name: string;
    country_code: string;
    country_name: string | null;
    tax_code: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  contact: {
    id: string | null;
    full_name: string;
    email: string | null;
    phone: string | null;
    position: string | null;
  } | null;
}

interface ChangeRequestAttachment {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  version_no: number;
  note: string | null;
  download_url: string;
}

interface OrganizationChangeRequest {
  id: string;
  request_code: string;
  customer_id: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
  reason: string;
  before_snapshot: OrganizationSnapshot;
  after_snapshot: OrganizationSnapshot;
  review_comment: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  applied_at: string | null;
  customer: {
    customer_code: string;
    company_name: string;
  };
  reviewer: {
    id: string;
    full_name: string | null;
  } | null;
  attachments: ChangeRequestAttachment[];
}

interface ChangeRequestFormValues {
  reason: string;
  company_name?: string;
  address?: string;
  tax_code?: string;
  phone?: string;
  email?: string;
  contact_id?: string;
  contact_full_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_position?: string;
}

const statusMeta: Record<OrganizationChangeRequest["status"], { label: string; color: string }> = {
  SUBMITTED: { label: "Đã gửi", color: "blue" },
  UNDER_REVIEW: { label: "Đang xem xét", color: "processing" },
  APPROVED: { label: "Đã chấp thuận", color: "green" },
  REJECTED: { label: "Không chấp thuận", color: "red" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function changedFields(request: OrganizationChangeRequest) {
  const fields: Array<{ label: string; before: string | null; after: string | null }> = [];
  const before = request.before_snapshot.organization;
  const after = request.after_snapshot.organization;
  const candidates = [
    ["Tên tổ chức", before.company_name, after.company_name],
    ["Địa chỉ", before.address, after.address],
    ["Mã số thuế / Business ID", before.tax_code, after.tax_code],
    ["Điện thoại", before.phone, after.phone],
    ["Email", before.email, after.email],
  ] as const;
  candidates.forEach(([label, oldValue, newValue]) => {
    if ((oldValue ?? "") !== (newValue ?? "")) fields.push({ label, before: oldValue, after: newValue });
  });

  const beforeContact = request.before_snapshot.contact;
  const afterContact = request.after_snapshot.contact;
  if (JSON.stringify(beforeContact) !== JSON.stringify(afterContact)) {
    fields.push({
      label: "Người liên hệ",
      before: beforeContact ? `${beforeContact.full_name}${beforeContact.position ? ` · ${beforeContact.position}` : ""}` : null,
      after: afterContact ? `${afterContact.full_name}${afterContact.position ? ` · ${afterContact.position}` : ""}` : null,
    });
  }
  return fields;
}

export function CustomerProfileScreen() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ChangeRequestFormValues>();
  const [selectedProfile, setSelectedProfile] = useState<CustomerProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["customer-portal", "profile"],
    queryFn: async () => (
      await api.get<CustomerProfile[]>("/customer-portal/me/profile")
    ).data,
  });

  const changeRequestsQuery = useQuery({
    queryKey: ["customer-portal", "organization-change-requests"],
    queryFn: async () => (
      await api.get<OrganizationChangeRequest[]>("/customer-portal/me/organization-change-requests")
    ).data,
  });

  const profiles = useMemo(() => profileQuery.data ?? [], [profileQuery.data]);
  const changeRequests = useMemo(() => changeRequestsQuery.data ?? [], [changeRequestsQuery.data]);

  const createMutation = useMutation({
    mutationFn: async (values: ChangeRequestFormValues) => {
      if (!selectedProfile) throw new Error("Chưa chọn tổ chức cần thay đổi.");
      const created = (
        await api.post<{ id: string }>("/customer-portal/me/organization-change-requests", {
          customer_id: selectedProfile.id,
          ...values,
        })
      ).data;

      for (const uploadFile of fileList) {
        const rawFile = uploadFile.originFileObj;
        if (!rawFile) continue;
        const body = new FormData();
        body.append("file", rawFile);
        await api.post(
          `/document-files/customer/organization-change-requests/${created.id}/attachment`,
          body,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
      }
      return created;
    },
    onSuccess: async () => {
      message.success("Đã gửi yêu cầu thay đổi hồ sơ tới tổ chức chứng nhận.");
      setModalOpen(false);
      setSelectedProfile(null);
      setFileList([]);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-portal", "organization-change-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-portal", "dashboard"] }),
      ]);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openRequestModal = (profile: CustomerProfile) => {
    setSelectedProfile(profile);
    setFileList([]);
    form.setFieldsValue({
      reason: "",
      company_name: profile.company_name,
      address: profile.address ?? undefined,
      tax_code: profile.tax_code ?? undefined,
      phone: profile.phone ?? undefined,
      email: profile.email ?? undefined,
    });
    setModalOpen(true);
  };

  const contactOptions = useMemo(
    () => (selectedProfile?.contacts ?? []).map((contact) => ({
      value: contact.id,
      label: `${contact.full_name}${contact.position ? ` · ${contact.position}` : ""}`,
    })),
    [selectedProfile],
  );

  const selectedContactId = Form.useWatch("contact_id", form);
  const selectedContact = useMemo(
    () => selectedProfile?.contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [selectedContactId, selectedProfile],
  );

  const applySelectedContact = (contactId?: string) => {
    const contact = selectedProfile?.contacts.find((item) => item.id === contactId);
    if (!contact) {
      form.setFieldsValue({
        contact_full_name: undefined,
        contact_email: undefined,
        contact_phone: undefined,
        contact_position: undefined,
      });
      return;
    }
    form.setFieldsValue({
      contact_full_name: contact.full_name,
      contact_email: contact.email ?? undefined,
      contact_phone: contact.phone ?? undefined,
      contact_position: contact.position ?? undefined,
    });
  };

  const openAttachment = async (attachment: ChangeRequestAttachment) => {
    setOpeningAttachmentId(attachment.id);
    try {
      await openDocumentFile({
        url: attachment.download_url,
        filename: attachment.original_name,
        mimeType: attachment.mime_type,
        title: attachment.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  if (profileQuery.isLoading) return <Card><Alert message="Đang tải hồ sơ tổ chức..." type="info" /></Card>;
  if (profileQuery.isError) {
    return (
      <Alert
        action={<Button onClick={() => void profileQuery.refetch()}>Thử lại</Button>}
        description={getErrorMessage(profileQuery.error)}
        message="Không tải được hồ sơ tổ chức"
        showIcon
        type="error"
      />
    );
  }

  return (
    <div className="projects-screen customer-portal-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">CỔNG KHÁCH HÀNG</span>
          <Title level={2}>Hồ sơ tổ chức</Title>
          <Text type="secondary">Thông tin chính thức do tổ chức chứng nhận quản lý và lịch sử yêu cầu thay đổi từ Portal.</Text>
        </div>
      </div>

      {profiles.length ? profiles.map((profile) => (
        <Card
          extra={<Button icon={<EditOutlined />} onClick={() => openRequestModal(profile)}>Yêu cầu thay đổi</Button>}
          key={profile.id}
          style={{ marginBottom: 16 }}
          title={<Space><BankOutlined /><span>{profile.company_name}</span><Tag>{profile.customer_code}</Tag></Space>}
        >
          <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
            <Descriptions.Item label="Quốc gia">{profile.country_name ?? profile.country_code}</Descriptions.Item>
            <Descriptions.Item label="Mã số thuế / Business ID">{profile.tax_code ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ" span={2}>{profile.address ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{profile.phone ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Email">{profile.email ?? "—"}</Descriptions.Item>
          </Descriptions>

          <Title level={5} style={{ marginTop: 20 }}>Người liên hệ</Title>
          {profile.contacts.length ? (
            <List
              dataSource={profile.contacts}
              renderItem={(contact) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<UserOutlined />}
                    description={(
                      <Space size={12} wrap>
                        {contact.position ? <Tag>{contact.position}</Tag> : null}
                        {contact.phone ? <Text><PhoneOutlined /> {contact.phone}</Text> : null}
                        {contact.email ? <Text><MailOutlined /> {contact.email}</Text> : null}
                      </Space>
                    )}
                    title={<Text strong>{contact.full_name}</Text>}
                  />
                </List.Item>
              )}
            />
          ) : <Empty description="Chưa có người liên hệ được khai báo" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        </Card>
      )) : <Empty description="Tài khoản chưa được gán cho tổ chức khách hàng" />}

      <Card title="Lịch sử yêu cầu thay đổi">
        {changeRequestsQuery.isError ? (
          <Alert description={getErrorMessage(changeRequestsQuery.error)} message="Không tải được lịch sử yêu cầu" showIcon type="error" />
        ) : (
          <List
            dataSource={changeRequests}
            locale={{ emptyText: "Chưa có yêu cầu thay đổi hồ sơ" }}
            renderItem={(request) => {
              const meta = statusMeta[request.status];
              const changes = changedFields(request);
              return (
                <List.Item>
                  <List.Item.Meta
                    description={(
                      <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <Text type="secondary">Gửi {formatDateTime(request.submitted_at)} · {request.reason}</Text>
                        {changes.map((change) => (
                          <Text key={change.label}>
                            <strong>{change.label}:</strong> {change.before ?? "—"} → {change.after ?? "—"}
                          </Text>
                        ))}
                        {request.review_comment ? <Text type="secondary">Phản hồi: {request.review_comment}</Text> : null}
                        {request.attachments.length ? (
                          <Space wrap>
                            {request.attachments.map((attachment) => (
                              <Button
                                icon={<PaperClipOutlined />}
                                key={attachment.id}
                                loading={openingAttachmentId === attachment.id}
                                onClick={() => void openAttachment(attachment)}
                                size="small"
                              >
                                {attachment.original_name}
                              </Button>
                            ))}
                          </Space>
                        ) : null}
                      </Space>
                    )}
                    title={<Space><Text strong>{request.request_code}</Text><Tag color={meta.color}>{meta.label}</Tag></Space>}
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      <Modal
        destroyOnHidden
        okButtonProps={{ loading: createMutation.isPending }}
        okText="Gửi yêu cầu"
        onCancel={() => setModalOpen(false)}
        onOk={() => void form.validateFields().then((values) => createMutation.mutate(values))}
        open={modalOpen}
        title={`Yêu cầu thay đổi hồ sơ${selectedProfile ? ` · ${selectedProfile.customer_code}` : ""}`}
        width={780}
      >
        <Alert
          description="Thông tin chính thức chỉ được cập nhật sau khi Điều phối viên của tổ chức chứng nhận xem xét và chấp thuận. Hệ thống lưu snapshot trước/sau để bảo đảm audit trail."
          message="Quy trình thay đổi có kiểm soát"
          showIcon
          style={{ marginBottom: 16 }}
          type="info"
        />
        <Form form={form} layout="vertical">
          <Form.Item label="Lý do thay đổi" name="reason" rules={[{ required: true, min: 5, message: "Nhập lý do thay đổi" }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Tên tổ chức" name="company_name"><Input /></Form.Item>
          <Form.Item label="Địa chỉ" name="address"><TextArea rows={2} /></Form.Item>
          <Space align="start" size={16} style={{ width: "100%" }} wrap>
            <Form.Item label="Mã số thuế / Business ID" name="tax_code"><Input style={{ width: 240 }} /></Form.Item>
            <Form.Item label="Điện thoại" name="phone"><Input style={{ width: 220 }} /></Form.Item>
            <Form.Item label="Email" name="email" rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input style={{ width: 280 }} /></Form.Item>
          </Space>

          <Title level={5}>Người liên hệ</Title>
          <Form.Item label="Chọn người liên hệ cần sửa" name="contact_id">
            <Select
              allowClear
              onChange={(value) => applySelectedContact(value)}
              options={contactOptions}
              placeholder="Chọn người liên hệ hiện có hoặc để trống để đề nghị thêm mới"
            />
          </Form.Item>
          {selectedContact ? <Text type="secondary">Đang chỉnh: {selectedContact.full_name}</Text> : null}
          <Space align="start" size={16} style={{ width: "100%" }} wrap>
            <Form.Item label="Họ và tên" name="contact_full_name"><Input style={{ width: 240 }} /></Form.Item>
            <Form.Item label="Chức vụ" name="contact_position"><Input style={{ width: 220 }} /></Form.Item>
            <Form.Item label="Điện thoại" name="contact_phone"><Input style={{ width: 200 }} /></Form.Item>
            <Form.Item label="Email" name="contact_email" rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input style={{ width: 260 }} /></Form.Item>
          </Space>

          <Form.Item label="Tệp đính kèm (không bắt buộc)">
            <Upload
              beforeUpload={() => false}
              fileList={fileList}
              maxCount={5}
              onChange={({ fileList: next }) => setFileList(next)}
            >
              <Button icon={<FileAddOutlined />}>Chọn tệp</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
