import { Typography } from "antd";

import { ActivityTimeline, ReadOnlyState, SectionHeader, type ActivityEvent } from "../design-system";
import { formatCaseDate, normalizeCaseValue } from "./case-model";
import type { CertificationCaseWorkspaceData } from "./types";

function reviewActionLabel(action?: string | null) {
  const normalized = normalizeCaseValue(action);
  if (normalized.includes("approve")) return "Đã phê duyệt thẩm xét đơn";
  if (normalized.includes("return")) return "Đã trả lại thẩm xét để bổ sung";
  if (normalized.includes("submit")) return "Đã gửi thẩm xét đơn";
  if (normalized.includes("assign")) return "Đã phân công thẩm xét đơn";
  return "Đã cập nhật thẩm xét đơn";
}

export function CertificationCaseActivity({ data }: { data: CertificationCaseWorkspaceData }) {
  const application = data.project.certification_applications;
  const reviewEvents: Array<ActivityEvent & { occurredAt: string }> = (application?.application_reviews ?? []).flatMap((review) => (
    (review.workflow_actions ?? []).filter((action) => action.created_at).map((action) => ({
      key: `review-${action.id}`,
      title: reviewActionLabel(action.action),
      actor: action.actor?.full_name ?? action.actor?.username ?? "Người dùng hệ thống",
      time: formatCaseDate(action.created_at),
      description: action.comment?.trim() || undefined,
      occurredAt: action.created_at ?? "",
    }))
  ));
  const events = [
    ...reviewEvents,
    {
      key: "case-created",
      title: "Hồ sơ chứng nhận được tạo",
      time: formatCaseDate(data.project.created_at),
      description: application?.application_code ? `Từ đơn đăng ký ${application.application_code}` : undefined,
      occurredAt: data.project.created_at,
    },
  ].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .map((event) => ({
      key: event.key,
      title: event.title,
      actor: event.actor,
      time: event.time,
      description: event.description,
    }));

  return (
    <div className="cmp-case-area" data-case-area="activity">
      <section className="cmp-case-section">
        <SectionHeader
          title="Hoạt động nghiệp vụ"
          description="Chỉ hiển thị các sự kiện có cấu trúc, có thời điểm và nguồn đáng tin cậy."
        />
        {events.length ? <ActivityTimeline events={events} /> : <Typography.Text type="secondary">Chưa có hoạt động nghiệp vụ có cấu trúc.</Typography.Text>}
      </section>
      <ReadOnlyState reason="Nguồn hiện tại chưa cung cấp dòng hoạt động hợp nhất theo hồ sơ. Nhật ký bảo mật thô và các lần đọc dữ liệu không được đưa vào khu vực này." />
    </div>
  );
}
