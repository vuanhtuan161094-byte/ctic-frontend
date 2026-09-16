import type { Meta, StoryObj } from "@storybook/react-vite";
import { DomainStatusBadge } from "../app/components/design-system";

const meta = { title: "Foundations/Design language" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const tones = ["neutral", "info", "attention", "positive", "critical", "inactive"] as const;

export const Colors: Story = {
  render: () => (
    <section className="cmp-section-stack">
      <h1>Màu nền tảng và ngữ nghĩa</h1>
      <p>Màu thương hiệu độc lập với trạng thái nghiệp vụ. Giá trị lấy trực tiếp từ token CMP.</p>
      {["brand-primary", "brand-strong", "brand-accent", "neutral-0", "neutral-50", "neutral-100", "neutral-300", "neutral-500", "neutral-600", "neutral-700", "neutral-900", ...tones.map((tone) => `state-${tone}`)].map((token) => (
        <div key={token} className="cmp-inline-stack">
          <span aria-hidden="true" style={{ display: "inline-block", width: "var(--cmp-space-12)", height: "var(--cmp-space-6)", background: `var(--cmp-${token})`, border: "1px solid var(--cmp-border-default)" }} />
          <code>--cmp-{token}</code>
        </div>
      ))}
    </section>
  ),
};

export const Typography: Story = {
  render: () => (
    <section className="cmp-section-stack">
      <h1>Phân cấp chữ</h1>
      {["xs", "sm", "md", "lg", "xl", "2xl"].map((size) => (
        <p key={size} style={{ margin: 0, fontSize: `var(--cmp-font-size-${size})` }}>
          {size} — Hồ sơ chứng nhận hệ thống quản lý chất lượng
        </p>
      ))}
      <p style={{ color: "var(--cmp-text-secondary)" }}>Thông tin hỗ trợ: chuyên gia đã nhận phân công thẩm xét.</p>
    </section>
  ),
};

export const Spacing: Story = {
  render: () => (
    <section className="cmp-section-stack">
      <h1>Khoảng cách</h1>
      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((step) => (
        <div key={step} className="cmp-inline-stack">
          <span aria-hidden="true" style={{ width: `var(--cmp-space-${step})`, height: "var(--cmp-space-4)", background: "var(--cmp-brand-primary)" }} />
          <code>--cmp-space-{step}</code>
        </div>
      ))}
      <p>Chỉ minh họa token; không áp dụng thay đổi mật độ toàn ứng dụng.</p>
    </section>
  ),
};

export const RadiusAndElevation: Story = {
  render: () => (
    <section className="cmp-page-stack">
      <h1>Bo góc và độ nổi</h1>
      <div className="cmp-inline-stack">
        {["sm", "md", "lg", "full"].map((radius) => (
          <div key={radius} style={{ padding: "var(--cmp-space-6)", border: "1px solid var(--cmp-border-default)", borderRadius: `var(--cmp-radius-${radius})` }}>radius-{radius}</div>
        ))}
      </div>
      <div className="cmp-inline-stack">
        {["low", "raised", "overlay"].map((level) => (
          <div key={level} style={{ margin: "var(--cmp-space-2)", padding: "var(--cmp-space-6)", borderRadius: "var(--cmp-radius-md)", boxShadow: `var(--cmp-shadow-${level})` }}>shadow-{level}</div>
        ))}
      </div>
    </section>
  ),
};

export const StatusSemantics: Story = {
  render: () => (
    <section className="cmp-section-stack">
      <h1>Ngữ nghĩa trạng thái</h1>
      <p>Nhãn văn bản luôn đi cùng màu; không dùng màu thương hiệu để suy ra kết quả nghiệp vụ.</p>
      {["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "CANCELLED"].map((code, index) => (
        <div key={code} className="cmp-inline-stack"><DomainStatusBadge domain="application" code={code} /><span>{tones[index]}</span></div>
      ))}
    </section>
  ),
};
