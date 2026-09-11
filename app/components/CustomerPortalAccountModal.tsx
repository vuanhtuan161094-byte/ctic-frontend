"use client";

import {
  CheckCircleOutlined,
  CopyOutlined,
  KeyOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";

const { Paragraph, Text } = Typography;

type CustomerOption = {
  id: string;
  customer_code: string;
  company_name: string;
  status?: string | null;
};

type ProvisionResponse = {
  created_new_user: boolean;
  customer: {
    id: string;
    customer_code: string;
    company_name: string;
  };
  user: {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    status: string | null;
  };
  access: {
    id: string;
    status: string;
  };
  temporary_password: string | null;
  note: string;
};

type FormValues = {
  customer_id?: string;
  full_name: string;
  email: string;
  username?: string;
};

interface CustomerPortalAccountModalProps {
  open: boolean;
  customerId?: string | null;
  customerName?: string | null;
  customerCode?: string | null;
  onClose: () => void;
  onSuccess?: (result: ProvisionResponse) => void | Promise<void>;
}

function activeStatus(value?: string | null) {
  return String(value ?? "active").trim().toLowerCase() === "active";
}

export function CustomerPortalAccountModal({
  open,
  customerId,
  customerName,
  customerCode,
  onClose,
  onSuccess,
}: CustomerPortalAccountModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [result, setResult] = useState<ProvisionResponse | null>(null);

  const customersQuery = useQuery({
    enabled: open && !customerId,
    queryKey: ["customers", "portal-account-picker"],
    queryFn: async () => (await api.get<CustomerOption[]>("/customers")).data,
  });

  const customerOptions = useMemo(
    () => (customersQuery.data ?? [])
      .filter((item) => activeStatus(item.status))
      .map((item) => ({
        value: item.id,
        label: `${item.customer_code} · ${item.company_name}`,
      })),
    [customersQuery.data],
  );

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setResult(null);
      form.resetFields();
      if (customerId) {
        form.setFieldValue("customer_id", customerId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, form, open]);

  const provisionMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const targetCustomerId = customerId || values.customer_id;
      if (!targetCustomerId) {
        throw new Error("Vui lòng chọn khách hàng");
      }
      return (await api.post<ProvisionResponse>(`/customers/${targetCustomerId}/portal-users`, {
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        username: values.username?.trim() || undefined,
      })).data;
    },
    onSuccess: async (data) => {
      setResult(data);
      await onSuccess?.(data);
      message.success(data.created_new_user
        ? "Đã tạo tài khoản khách hàng và cấp quyền Portal"
        : "Đã liên kết quyền Portal cho tài khoản khách hàng");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const shareText = result
    ? [
        `Tài khoản cổng khách hàng - ${result.customer.company_name}`,
        `Tên đăng nhập: ${result.user.username}`,
        `Email: ${result.user.email}`,
        result.temporary_password ? `Mật khẩu ban đầu: ${result.temporary_password}` : "",
        result.temporary_password ? "Vui lòng đổi mật khẩu sau khi đăng nhập." : "",
      ].filter(Boolean).join("\n")
    : "";

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      message.success("Đã sao chép thông tin để gửi khách hàng");
    } catch {
      message.error("Không thể sao chép tự động. Vui lòng sao chép thủ công.");
    }
  };

  return (
    <Modal
      cancelText={result ? undefined : "Hủy"}
      destroyOnHidden
      footer={result ? (
        <Space>
          {result.temporary_password ? (
            <Button icon={<CopyOutlined />} onClick={() => void copyShareText()} type="primary">
              Sao chép thông tin gửi khách
            </Button>
          ) : null}
          <Button onClick={onClose}>Đóng</Button>
        </Space>
      ) : undefined}
      okButtonProps={{ icon: <UserAddOutlined /> }}
      okText="Tạo & cấp quyền"
      onCancel={onClose}
      onOk={result ? undefined : () => void form.validateFields().then((values) => provisionMutation.mutate(values))}
      open={open}
      confirmLoading={provisionMutation.isPending}
      title={result ? "Tài khoản khách hàng đã sẵn sàng" : "Tạo tài khoản khách hàng"}
      width={640}
    >
      {result ? (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            showIcon
            type="success"
            icon={<CheckCircleOutlined />}
            message={result.created_new_user ? "Đã tạo tài khoản mới" : "Đã dùng tài khoản CUSTOMER hiện có"}
            description={result.note}
          />
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Khách hàng">
              {result.customer.customer_code} · {result.customer.company_name}
            </Descriptions.Item>
            <Descriptions.Item label="Họ và tên">{result.user.full_name || "—"}</Descriptions.Item>
            <Descriptions.Item label="Tên đăng nhập">
              <Text copyable>{result.user.username}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              <Text copyable>{result.user.email}</Text>
            </Descriptions.Item>
            {result.temporary_password ? (
              <Descriptions.Item label="Mật khẩu ban đầu">
                <Text copyable strong>{result.temporary_password}</Text>
              </Descriptions.Item>
            ) : null}
          </Descriptions>
          {result.temporary_password ? (
            <Alert
              showIcon
              icon={<KeyOutlined />}
              type="warning"
              message="Mật khẩu ban đầu chỉ hiển thị ở lần này"
              description="CMP không lưu mật khẩu dạng rõ. Hãy sao chép thông tin và gửi cho khách hàng qua kênh phù hợp. Hiện hệ thống chưa tự gửi email mời."
            />
          ) : (
            <Alert
              showIcon
              type="info"
              message="Không tạo mật khẩu mới"
              description="Email này đã thuộc một tài khoản CUSTOMER hợp lệ, nên CMP chỉ liên kết/khôi phục quyền truy cập cho khách hàng."
            />
          )}
        </Space>
      ) : (
        <Form form={form} layout="vertical" requiredMark="optional">
          <Alert
            showIcon
            type="info"
            message="Tạo trực tiếp tài khoản Portal cho khách hàng"
            description="Chỉ cần họ tên và email. CMP tự tạo tên đăng nhập và mật khẩu ban đầu nếu đây là tài khoản mới."
            style={{ marginBottom: 16 }}
          />
          {customerId ? (
            <Form.Item label="Khách hàng">
              <Input disabled value={`${customerCode ? `${customerCode} · ` : ""}${customerName || "Khách hàng đã chọn"}`} />
            </Form.Item>
          ) : (
            <Form.Item
              label="Khách hàng"
              name="customer_id"
              rules={[{ required: true, message: "Chọn khách hàng" }]}
            >
              <Select
                showSearch
                loading={customersQuery.isLoading}
                optionFilterProp="label"
                options={customerOptions}
                placeholder="Chọn khách hàng đang hoạt động"
              />
            </Form.Item>
          )}
          <Form.Item
            label="Họ và tên người dùng"
            name="full_name"
            rules={[{ required: true, message: "Nhập họ và tên" }, { min: 2 }, { max: 100 }]}
          >
            <Input placeholder="Ví dụ: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Nhập email" }, { type: "email", message: "Email không hợp lệ" }]}
          >
            <Input placeholder="Ví dụ: qms@khachhang.vn" />
          </Form.Item>
          <Divider plain>Tùy chọn</Divider>
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            extra="Để trống để CMP tự tạo từ email."
            rules={[{ min: 3 }, { max: 50 }]}
          >
            <Input placeholder="Ví dụ: customer.nguyenvana" />
          </Form.Item>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Một khách hàng có thể có nhiều tài khoản. Tất cả tài khoản được tạo ở đây chỉ nhận vai trò CUSTOMER và chỉ truy cập dữ liệu của khách hàng đã liên kết.
          </Paragraph>
        </Form>
      )}
    </Modal>
  );
}
