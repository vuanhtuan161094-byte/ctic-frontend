import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { EmptyState, ErrorState, ReadOnlyState } from "../app/components/design-system";

const meta = { title: "Components/States" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { render: () => <EmptyState title="Chưa có tài liệu" description="Tài liệu của hồ sơ sẽ xuất hiện tại đây sau khi được tiếp nhận." /> };
export const EmptyWithAction: Story = { render: () => <EmptyState title="Chưa có hồ sơ phù hợp" description="Thử thay đổi điều kiện tìm kiếm." action={{ label: "Xóa bộ lọc", onAction: fn() }} /> };
export const Error: Story = { render: () => <ErrorState description="Không thể tải danh sách hồ sơ. Vui lòng thử lại hoặc liên hệ quản trị viên." correlationId="DEMO-2026-0012" retry={{ label: "Thử lại", onAction: fn() }} /> };
export const ReadOnly: Story = { render: () => <ReadOnlyState reason="Hồ sơ đã hoàn tất; tài khoản hiện tại chỉ được tra cứu thông tin và tài liệu đã ban hành." /> };
