import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "antd";
import { PageHeader, DomainStatusBadge } from "../app/components/design-system";

const meta = {
  title: "Components/PageHeader",
  component: PageHeader,
  args: {
    title: "Hồ sơ chứng nhận",
    identity: "HS-2026-0012 · Doanh nghiệp minh họa",
    description: "Theo dõi phạm vi, tiến độ đánh giá và các bước xử lý tiếp theo.",
    metadata: <DomainStatusBadge domain="application" code="UNDER_REVIEW" />,
    primaryAction: <Button type="primary">Xem công việc</Button>,
  },
} satisfies Meta<typeof PageHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ReadOnly: Story = { args: { primaryAction: undefined, description: "Hồ sơ đã đóng; thông tin được lưu để tra cứu." } };
export const LongContent: Story = {
  args: { title: "Chứng nhận hệ thống quản lý chất lượng cho hoạt động sản xuất, lắp ráp và bảo trì thiết bị", secondaryActions: <Button>Tra cứu tài liệu</Button> },
};
export const ConstrainedWidth: Story = {
  args: LongContent.args,
  decorators: [(Story) => <div style={{ maxWidth: 390 }}><Story /></div>],
};
