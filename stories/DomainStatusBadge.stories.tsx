import type { Meta, StoryObj } from "@storybook/react-vite";
import { DomainStatusBadge } from "../app/components/design-system";

const meta = {
  title: "Components/DomainStatusBadge", component: DomainStatusBadge,
  args: { domain: "application", code: "DRAFT" },
} satisfies Meta<typeof DomainStatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AllSemanticTones: Story = {
  render: () => <div className="cmp-inline-stack">{["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "CANCELLED"].map((code) => <DomainStatusBadge key={code} domain="application" code={code} />)}</div>,
};
export const UnknownCode: Story = { args: { code: "AWAITING_ARCHIVE", label: "Chờ lưu trữ" } };
export const DetailedLabel: Story = { args: { code: "REVISION_REQUIRED", label: "Cần bổ sung phạm vi chứng nhận" } };
