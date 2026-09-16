import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeadlineSlaBadge } from "../app/components/design-system";

const meta = {
  title: "Components/DeadlineSlaBadge", component: DeadlineSlaBadge,
  args: { state: "ON_TRACK", dueAt: "2026-09-30", formattedDueAt: "30/09/2026", explanation: "Thời hạn mẫu được cung cấp bởi hồ sơ; story không tự tính SLA." },
} satisfies Meta<typeof DeadlineSlaBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DueSoon: Story = { args: { state: "DUE_SOON" } };
export const Overdue: Story = { args: { state: "OVERDUE" } };
export const NotApplicable: Story = { args: { state: "NOT_APPLICABLE", dueAt: null } };
export const MissingDeadline: Story = { args: { dueAt: null } };
