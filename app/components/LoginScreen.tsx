"use client";

import {
  ArrowRightOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Form, Input } from "antd";
import { useState } from "react";

import {
  api,
  type AuthSession,
  getErrorMessage,
} from "../lib/api";
import { PLATFORM_BRANDING } from "../lib/platform-branding";

interface LoginScreenProps {
  onLogin: (session: AuthSession) => void;
}

interface LoginFormValues {
  username: string;
  password: string;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await api.post<AuthSession>("/auth/login", values);
      onLogin(response.data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Giới thiệu hệ thống">
        <div className="brand brand-light">
          <span className="brand-mark">{PLATFORM_BRANDING.shortName}</span>
          <span className="brand-copy">
            <strong>{PLATFORM_BRANDING.organizationName}</strong>
            <small>{PLATFORM_BRANDING.platformNameEn}</small>
          </span>
        </div>

        <div className="login-story-content">
          <span className="eyebrow eyebrow-light">NỀN TẢNG QUẢN LÝ CHỨNG NHẬN</span>
          <h1>Kiểm soát toàn bộ vòng đời chứng nhận trên một hệ thống.</h1>
          <p>
            Chuẩn hóa quy trình P.09 từ đăng ký, đánh giá, thẩm xét đến phát
            hành và duy trì chứng chỉ.
          </p>

          <div className="login-benefits">
            <div>
              <AuditOutlined />
              <span><strong>Quy trình rõ ràng</strong><small>Theo dõi từng bước và người xử lý</small></span>
            </div>
            <div>
              <FileProtectOutlined />
              <span><strong>Hồ sơ tập trung</strong><small>Tài liệu, phiên bản và lịch sử đầy đủ</small></span>
            </div>
            <div>
              <SafetyCertificateOutlined />
              <span><strong>Chứng chỉ xác thực</strong><small>Tra cứu công khai bằng mã QR</small></span>
            </div>
          </div>
        </div>

        <div className="login-story-footer">
          <CheckCircleOutlined /> Dữ liệu được kiểm soát theo tài khoản người dùng
        </div>
      </section>

      <section className="login-form-area">
        <div className="login-card">
          <div className="mobile-brand">
            <span className="brand-mark">{PLATFORM_BRANDING.shortName}</span>
            <strong>{PLATFORM_BRANDING.organizationName}</strong>
          </div>

          <span className="eyebrow">HỆ THỐNG NỘI BỘ</span>
          <h2>Đăng nhập</h2>
          <p className="login-intro">
            Sử dụng tài khoản đã được {PLATFORM_BRANDING.organizationName} cấp để tiếp tục.
          </p>

          {errorMessage ? (
            <Alert
              className="login-alert"
              type="error"
              showIcon
              message={errorMessage}
            />
          ) : null}

          <Form<LoginFormValues>
            layout="vertical"
            requiredMark={false}
            onFinish={handleSubmit}
          >
            <Form.Item
              label="Tên đăng nhập"
              name="username"
              rules={[{ required: true, message: "Nhập tên đăng nhập" }]}
            >
              <Input
                autoComplete="username"
                prefix={<UserOutlined />}
                placeholder="Nhập tên đăng nhập"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: "Nhập mật khẩu" }]}
            >
              <Input.Password
                autoComplete="current-password"
                prefix={<LockOutlined />}
                placeholder="Nhập mật khẩu"
                size="large"
              />
            </Form.Item>

            <Button
              block
              className="login-submit"
              htmlType="submit"
              loading={submitting}
              size="large"
              type="primary"
            >
              Đăng nhập <ArrowRightOutlined />
            </Button>
          </Form>

          <p className="login-help">
            Nếu không đăng nhập được, liên hệ {PLATFORM_BRANDING.supportContactLabel} để kiểm tra
            trạng thái tài khoản.
          </p>
        </div>
      </section>
    </main>
  );
}
