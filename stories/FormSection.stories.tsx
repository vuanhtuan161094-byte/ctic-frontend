import type { Meta, StoryObj } from "@storybook/react-vite";
import { Form, Input } from "antd";
import { FormSection } from "../app/components/design-system";

const meta = {
  title: "Components/FormSection", component: FormSection,
  args: { title: "Thông tin liên hệ", description: "Thông tin mẫu dùng để xem bố cục; không gửi dữ liệu đến máy chủ.", children: null },
  render: (args) => (
    <FormSection {...args}>
      <Form layout="vertical" name="storybook-contact">
        <Form.Item name="name" label="Người liên hệ" initialValue="Nguyễn Minh An"><Input /></Form.Item>
        <Form.Item name="email" label="Email" initialValue="contact@example.com"><Input type="email" /></Form.Item>
      </Form>
    </FormSection>
  ),
} satisfies Meta<typeof FormSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ValidationSummary: Story = { args: { errors: ["Cần xác nhận người liên hệ phụ trách hồ sơ."] } };
export const ConstrainedWidth: Story = { decorators: [(Story) => <div style={{ maxWidth: 390 }}><Story /></div>] };
