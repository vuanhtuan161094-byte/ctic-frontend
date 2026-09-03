import { Typography } from "antd";

import { ReadOnlyState, SectionHeader } from "../design-system";
import { formatCaseDate, normalizeCaseValue } from "./case-model";
import type { CertificationCaseWorkspaceData, CertificationCycleGroup } from "./types";

export function CertificationCaseTeam({ data, cycle }: { data: CertificationCaseWorkspaceData; cycle: CertificationCycleGroup | null }) {
  const teamItem = cycle?.items.find((item) => normalizeCaseValue(item.document_key) === "audit_team_assignment") ?? null;
  const plans = cycle ? data.project.audit_plans.filter((plan) => cycle.plan_ids.includes(plan.id)) : [];

  return (
    <div className="cmp-case-area" data-case-area="team">
      <section className="cmp-case-section">
        <SectionHeader
          title="Nhóm & nguồn lực"
          description="Nền tảng read-first theo đúng chu kỳ; thao tác bố trí đoàn tiếp tục dùng nghiệp vụ hiện có đến Step 17.4."
        />
        <div className="cmp-case-team-grid">
          <div className="cmp-case-team-summary">
            <span>Hồ sơ bố trí đoàn</span>
            <strong>{teamItem ? (normalizeCaseValue(teamItem.status) === "completed" ? "Đã có dữ liệu" : "Đang chuẩn bị") : "Chưa phát sinh"}</strong>
            <small>{teamItem?.document_name ?? "Nguồn chưa trả về thành phần bố trí đoàn"}</small>
          </div>
          <div className="cmp-case-team-summary">
            <span>Cửa sổ đánh giá</span>
            <strong>{formatCaseDate(cycle?.planned_start_date ?? plans[0]?.planned_start_date)}</strong>
            <small>đến {formatCaseDate(cycle?.planned_end_date ?? plans.at(-1)?.planned_end_date)}</small>
          </div>
          <div className="cmp-case-team-summary">
            <span>Phân bổ dự kiến</span>
            <strong>{cycle?.planned_mandays ?? "Chưa ghi nhận"}</strong>
            <small>ngày công theo nguồn chu kỳ</small>
          </div>
        </div>
      </section>

      <ReadOnlyState reason="Nguồn hiện tại chưa cung cấp bản tổng hợp thành viên, vai trò, năng lực và độc lập. Việc thay đổi bố trí đoàn vẫn được thực hiện tại không gian nghiệp vụ hiện có.">
        <section className="cmp-case-section cmp-case-section--muted">
          <SectionHeader title="Thành viên và điều kiện sẵn sàng" />
          <Typography.Paragraph type="secondary">
            Khi projection được bổ sung ở bước sau, khu vực này sẽ hiển thị Trưởng đoàn, chuyên gia đánh giá, chuyên gia kỹ thuật, phân bổ ngày công, năng lực và độc lập theo cùng cấu trúc.
          </Typography.Paragraph>
        </section>
      </ReadOnlyState>
    </div>
  );
}
