import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "antd";
import { SectionHeader } from "../app/components/design-system";

const meta = {
  title: "Components/SectionHeader", component: SectionHeader,
  args: { title: "Phạm vi chứng nhận", description: "Các địa điểm và hoạt động thuộc hồ sơ đang xem xét." },
} satisfies Meta<typeof SectionHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithAction: Story = { args: { actions: <Button>Xem chi tiết</Button> } };
export const LongContent: Story = { args: { title: "Tài liệu chứng minh năng lực và tính độc lập của đoàn đánh giá", description: "Kiểm tra tài liệu của các chuyên gia được phân công trước khi ban hành kế hoạch đánh giá." } };
export const ConstrainedWidth: Story = { args: LongContent.args, decorators: [(Story) => <div style={{ maxWidth: 390 }}><Story /></div>] };
