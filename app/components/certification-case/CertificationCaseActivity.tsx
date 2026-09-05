import { Button, Typography } from "antd";

import { ActivityTimeline, SectionHeader, type ActivityEvent } from "../design-system";
import { formatCaseDate } from "./case-model";
import type { CertificationCaseActivityPage } from "./types";

export interface CertificationCaseActivityProps {
  activity: CertificationCaseActivityPage;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function CertificationCaseActivity({ activity, loadingMore = false, onLoadMore }: CertificationCaseActivityProps) {
  const events: ActivityEvent[] = activity.items.map((item) => ({
    key: item.id,
    title: item.title,
    actor: item.actor?.display_name ?? "Hệ thống nghiệp vụ",
    time: formatCaseDate(item.occurred_at),
    description: item.description ?? undefined,
  }));

  return (
    <div className="cmp-case-area" data-case-area="activity">
      <section className="cmp-case-section">
        <SectionHeader
          title="Hoạt động nghiệp vụ"
          description="Sự kiện bền vững, có cấu trúc và đã lọc quyền; không bao gồm nhật ký bảo mật thô hoặc nhiễu truy cập dữ liệu."
        />
        {events.length ? <ActivityTimeline events={events} /> : <Typography.Text type="secondary">Chưa có hoạt động nghiệp vụ phù hợp để hiển thị.</Typography.Text>}
        {activity.page.has_more ? (
          <div className="cmp-case-activity-more">
            <Button loading={loadingMore} onClick={onLoadMore}>Tải thêm hoạt động</Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
