import { Button, Typography } from "antd";

import { LifecycleStepper, SectionHeader } from "../design-system";
import { cycleLabel, formatCaseDate, lifecycleSteps, normalizeCaseValue } from "./case-model";
import type { CertificationCaseProjectionCycle, CertificationCaseWorkspaceProjection } from "./types";

const sourceStateLabel = (status: string) => {
  const normalized = normalizeCaseValue(status);
  if (normalized === "completed") return "Đã hoàn tất";
  if (normalized === "not_applicable") return "Không áp dụng";
  if (normalized === "pending") return "Đang chờ";
  return status;
};

export function CertificationCaseProgress({ data, cycle, onOpenAudit }: { data: CertificationCaseWorkspaceProjection; cycle: CertificationCaseProjectionCycle | null; onOpenAudit: (auditId: string) => void }) {
  if (!cycle) return <Typography.Text type="secondary">Chưa có dữ liệu chu kỳ để dựng tiến trình.</Typography.Text>;
  const steps = lifecycleSteps(data, cycle);

  return (
    <div className="cmp-case-area cmp-case-progress" data-case-area="progress">
      <section className="cmp-case-section">
        <SectionHeader
          title={`Tiến trình · ${cycleLabel(cycle)}`}
          description="Trạng thái hoàn tất, hiện tại, bị chặn, sắp tới và không áp dụng được tách riêng theo dữ liệu nguồn."
        />
        {steps.length ? <div className="cmp-case-lifecycle"><LifecycleStepper steps={steps} /></div> : (
          <Typography.Text type="secondary">Nguồn chưa trả về thành phần tiến trình cho chu kỳ này.</Typography.Text>
        )}
      </section>

      <section className="cmp-case-section">
        <SectionHeader title="Thành phần nghiệp vụ" description="Danh sách read-first giúp đối chiếu nguồn mà không mở toàn bộ quy trình tác nghiệp." />
        <div className="cmp-case-source-list" role="list" aria-label="Thành phần nghiệp vụ theo chu kỳ">
          {[...cycle.stages].sort((left, right) => left.item_no - right.item_no).map((item) => (
            <div className="cmp-case-source-row" role="listitem" key={`${item.document_key}-${item.item_no}`} data-source-state={normalizeCaseValue(item.status)}>
              <span className="cmp-case-source-index">{item.item_no}</span>
              <div><strong>{item.document_name}</strong><small>{sourceStateLabel(item.status)}</small></div>
            </div>
          ))}
        </div>
      </section>

      <section className="cmp-case-section">
        <SectionHeader title="Kế hoạch và cửa sổ đánh giá" />
        {cycle.plan_ids.length ? (
          <div className="cmp-case-plan-list">
            {cycle.plan_ids.map((planId, index) => (
              <article key={planId}>
                <div><strong>{cycle.plan_codes[index] ?? "Kế hoạch chưa có mã"}</strong><span>Nguồn kế hoạch canonical của chu kỳ</span></div>
                <div><span>{formatCaseDate(cycle.planned_start_date)}</span><span aria-hidden="true">→</span><span>{formatCaseDate(cycle.planned_end_date ?? cycle.planned_start_date)}</span></div>
                <Button onClick={() => onOpenAudit(planId)}>Mở cuộc đánh giá</Button>
              </article>
            ))}
          </div>
        ) : <Typography.Text type="secondary">Chu kỳ chưa có kế hoạch đánh giá được liên kết.</Typography.Text>}
      </section>
    </div>
  );
}
