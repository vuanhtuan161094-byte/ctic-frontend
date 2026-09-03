"use client";

import { Button, Card, Checkbox, ConfigProvider, Form, Input, Space } from "antd";
import { useState } from "react";

import { PLATFORM_BRANDING } from "../../lib/platform-branding";
import {
  ActionGuard,
  ActivityTimeline,
  ChangeDiff,
  ConfirmDialog,
  DataTable,
  DeadlineSlaBadge,
  DetailDrawer,
  DomainStatusBadge,
  EmptyState,
  EntityRow,
  ErrorState,
  FilterPopover,
  ForbiddenState,
  FormSection,
  GovernedDocumentCard,
  LoadingSkeleton,
  NextActionBar,
  PageHeader,
  ReadinessBlockerPanel,
  ReadOnlyState,
  ResponsibilityCard,
  SearchToolbar,
  SectionHeader,
} from ".";

const rows = [
  { key: "CASE-001", customer: "Công ty Minh họa", stage: "Đánh giá Giai đoạn 1" },
  { key: "CASE-002", customer: "Doanh nghiệp Mẫu", stage: "Thẩm xét kỹ thuật" },
];

export function DesignSystemShowcase() {
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <ConfigProvider theme={{ token: { colorPrimary: PLATFORM_BRANDING.primaryColor, borderRadius: 10 } }}>
      <main className="cmp-showcase cmp-page-stack" data-development-showcase="true">
        <PageHeader
          identity="DESIGN SYSTEM V2 · DEV ONLY"
          title="Nền tảng giao diện sản phẩm"
          description="Bộ primitive dùng chung cho quy trình quản lý chứng nhận doanh nghiệp."
          metadata={<><DomainStatusBadge domain="case" code="draft" /><DeadlineSlaBadge state="DUE_SOON" dueAt="05/09/2026" explanation="Còn 2 ngày" /></>}
          secondaryActions={<Button onClick={() => setDrawerOpen(true)}>Mở drawer</Button>}
          primaryAction={<Button type="primary" onClick={() => setConfirmOpen(true)}>Hành động chính</Button>}
        />

        <section className="cmp-section-stack">
          <SectionHeader title="Trạng thái theo domain" description="Cùng mã APPROVED có nghĩa và tone theo ngữ cảnh sở hữu." />
          <Space wrap>
            <DomainStatusBadge domain="applicationReview" code="APPROVED" />
            <DomainStatusBadge domain="quotation" code="APPROVED" />
            <DomainStatusBadge domain="controlledTemplate" code="APPROVED" />
            <DeadlineSlaBadge state="NOT_APPLICABLE" />
            <DeadlineSlaBadge state="NOT_CONFIGURED" />
            <DeadlineSlaBadge state="ON_TRACK" dueAt="30/09/2026" />
            <DeadlineSlaBadge state="DUE_SOON" dueAt="05/09/2026" />
            <DeadlineSlaBadge state="OVERDUE" dueAt="01/09/2026" />
          </Space>
        </section>

        <section className="cmp-section-stack">
          <SectionHeader title="Trách nhiệm và readiness" />
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <ResponsibilityCard state="OWN" actor="Nguyễn An" role="Chuyên gia đánh giá" />
            <ResponsibilityCard state="WAITING" role="Chuyên gia thẩm xét kỹ thuật" />
            <ResponsibilityCard state="DELEGATED_TO_ME" actor="Trần Bình" details="Ủy quyền đến 10/09/2026" />
            <ResponsibilityCard state="HANDED_OFF" actor="Lê Chi" />
          </div>
          <ReadinessBlockerPanel blockers={[{ code: "TEAM_COMPETENCE", label: "Chưa đủ bằng chứng năng lực đoàn đánh giá", explanation: "Bổ sung bằng chứng trước khi ban hành.", severity: "BLOCKING" }]} />
          <NextActionBar
            primaryAction={{ code: "AUDIT_PLAN_PREPARE", label: "Hoàn thiện kế hoạch", businessMeaning: "Hoàn thiện dữ liệu còn thiếu trước khi ban hành.", enabled: true }}
            secondaryActions={[{ code: "SAVE", label: "Lưu nháp", enabled: true }]}
          />
        </section>

        <section className="cmp-section-stack">
          <SectionHeader title="Tìm kiếm, bảng và mobile cards" />
          <SearchToolbar
            query={query}
            onQueryChange={setQuery}
            filterControl={<FilterPopover appliedCount={1}><Checkbox defaultChecked>Đang xử lý</Checkbox></FilterPopover>}
          />
          <DataTable
            rowKey="key"
            dataSource={rows}
            columns={[
              { title: "Mã hồ sơ", dataIndex: "key" },
              { title: "Khách hàng", dataIndex: "customer" },
              { title: "Bước hiện tại", dataIndex: "stage" },
            ]}
            responsiveCards={rows.map((row) => ({ key: row.key, title: row.key, fields: [{ key: "customer", label: "Khách hàng", value: row.customer }, { key: "stage", label: "Bước hiện tại", value: row.stage }] }))}
          />
          <EntityRow title="CASE-003 · Công ty Ví dụ" description="ISO 9001:2015 · Đánh giá chứng nhận lần đầu" status={<DomainStatusBadge domain="auditPlan" code="in_progress" />} onSelect={() => setDrawerOpen(true)} />
        </section>

        <section className="cmp-section-stack">
          <SectionHeader title="Form và trạng thái chuẩn" />
          <FormSection title="Thông tin phạm vi" description="Nhóm trường có mô tả và vùng lỗi thống nhất." errors={["Phạm vi chứng nhận chưa đầy đủ."]}>
            <Form layout="vertical"><Form.Item label="Phạm vi chứng nhận" required><Input /></Form.Item></Form>
          </FormSection>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <Card><LoadingSkeleton variant="detail" rows={2} /></Card>
            <Card><EmptyState description="Không có hồ sơ phù hợp với bộ lọc." /></Card>
            <Card><ErrorState correlationId="REQ-DEMO-001" retry={{ label: "Thử lại", onAction: () => undefined }} /></Card>
            <Card><ForbiddenState exit={{ label: "Quay lại", onAction: () => undefined }} /></Card>
          </div>
          <ReadOnlyState reason="Hồ sơ đã được ban hành."><div style={{ padding: 16 }}>Nội dung vẫn được hiển thị.</div></ReadOnlyState>
        </section>

        <section className="cmp-section-stack">
          <SectionHeader title="Lịch sử, tài liệu và diff" />
          <ChangeDiff items={[{ key: "scope", label: "Phạm vi", before: "Sản xuất linh kiện", after: "Sản xuất và lắp ráp linh kiện" }]} />
          <ActivityTimeline events={[{ key: "1", title: "Đã gửi hồ sơ", actor: "Người dùng minh họa", time: "09:15 · 03/09/2026" }]} />
          <GovernedDocumentCard title="Kế hoạch đánh giá" documentClass="Tài liệu được kiểm soát" version="Phiên bản 03" visibility="Nội bộ" statusDomain="generatedDocument" statusCode="ISSUED" />
          <ActionGuard allowed={false} reason="Bạn không phải người được phân công."><Button type="primary">Phê duyệt</Button></ActionGuard>
        </section>

        <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Chi tiết hồ sơ" size="lg">
          <p>Nội dung tham chiếu, lịch sử hoặc preview; tự giới hạn theo viewport.</p>
        </DetailDrawer>
        <ConfirmDialog
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          title="Xác nhận hành động"
          consequence="Hành động này sẽ được ghi nhận trong lịch sử nghiệp vụ."
          variant="reason"
        />
      </main>
    </ConfigProvider>
  );
}
