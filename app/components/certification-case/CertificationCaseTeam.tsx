import { Typography } from "antd";

import { ReadinessBlockerPanel, SectionHeader } from "../design-system";
import { formatCaseDate, normalizeCaseValue } from "./case-model";
import type { CertificationCaseProjectionCycle, CertificationCaseWorkspaceProjection } from "./types";

const roleLabel = (role: string) => ({
  team_leader: "Trưởng đoàn",
  auditor: "Chuyên gia đánh giá",
  technical_expert: "Chuyên gia kỹ thuật",
  witness_evaluator: "Chuyên gia đánh giá chứng kiến",
}[normalizeCaseValue(role)] ?? role.replaceAll("_", " "));

const readinessLabel = (status: string) => ({
  READY: "Sẵn sàng",
  BLOCKED: "Đang bị chặn",
  WARNING: "Cần chú ý",
  NOT_EVALUATED: "Chưa đánh giá",
  NOT_CONFIGURED: "Chưa bố trí",
}[status] ?? status);

export function CertificationCaseTeam({ data, cycle }: { data: CertificationCaseWorkspaceProjection; cycle: CertificationCaseProjectionCycle | null }) {
  const team = data.team_summary;
  const blockers = team.blockers.map((item) => ({
    code: item.code,
    label: item.message,
    severity: item.severity === "BLOCK" ? "BLOCKING" as const : "WARNING" as const,
  }));

  return (
    <div className="cmp-case-area" data-case-area="team">
      <section className="cmp-case-section">
        <SectionHeader
          title="Nhóm & nguồn lực"
          description="Dữ liệu bố trí đoàn, ngày công, năng lực và độc lập được tổng hợp từ nguồn nghiệp vụ của chu kỳ đang chọn."
        />
        <div className="cmp-case-team-grid">
          <div className="cmp-case-team-summary">
            <span>Quyết định bố trí đoàn</span>
            <strong>{team.appointment?.number ?? "Chưa phát sinh"}</strong>
            <small>{team.appointment ? `${readinessLabel(team.status)} · ${formatCaseDate(team.appointment.appointment_date)}` : "Chưa có quyết định cho chu kỳ này"}</small>
          </div>
          <div className="cmp-case-team-summary">
            <span>Cửa sổ đánh giá</span>
            <strong>{formatCaseDate(team.appointment?.audit_start_date ?? cycle?.planned_start_date)}</strong>
            <small>đến {formatCaseDate(team.appointment?.audit_end_date ?? cycle?.planned_end_date)}</small>
          </div>
          <div className="cmp-case-team-summary">
            <span>Phân bổ dự kiến</span>
            <strong>{team.planned_mandays ?? cycle?.planned_mandays ?? "Chưa ghi nhận"}</strong>
            <small>ngày công theo nguồn bố trí hiện hành</small>
          </div>
        </div>
      </section>

      <section className="cmp-case-section">
        <SectionHeader
          title="Thành viên và vai trò"
          description={team.appointment?.team_lead ? `Trưởng đoàn: ${team.appointment.team_lead}` : "Chưa xác định Trưởng đoàn."}
        />
        {team.members.length ? (
          <div className="cmp-case-source-list" role="list" aria-label="Thành viên đoàn đánh giá">
            {team.members.map((member) => (
              <div className="cmp-case-source-row" role="listitem" key={member.id} data-source-state={member.confirmed ? "completed" : "pending"}>
                <span className="cmp-case-source-index">{member.expert.employee_code ?? "—"}</span>
                <div>
                  <strong>{member.expert.display_name}</strong>
                  <small>{roleLabel(member.role)} · {member.planned_mandays ?? 0} MD · {formatCaseDate(member.planned_start_date)}–{formatCaseDate(member.planned_end_date)}</small>
                </div>
              </div>
            ))}
          </div>
        ) : <Typography.Text type="secondary">Chưa có thành viên được bố trí cho chu kỳ này.</Typography.Text>}
      </section>

      <section className="cmp-case-section">
        <SectionHeader title="Điều kiện sẵn sàng" description="Kết quả lấy từ bộ kiểm tra năng lực và độc lập hiện hữu; không đánh giá lại ở trình duyệt." />
        <div className="cmp-case-team-grid">
          <div className="cmp-case-team-summary"><span>Năng lực</span><strong>{readinessLabel(team.competence.status)}</strong><small>{team.competence.reasons.length} lý do liên quan</small></div>
          <div className="cmp-case-team-summary"><span>Độc lập</span><strong>{readinessLabel(team.independence.status)}</strong><small>{team.independence.reasons.length} lý do liên quan</small></div>
          <div className="cmp-case-team-summary"><span>Tổng thể</span><strong>{readinessLabel(team.status)}</strong><small>{team.blockers.length} điều kiện cần xử lý</small></div>
        </div>
      </section>

      {blockers.length ? <ReadinessBlockerPanel title="Lý do chưa sẵn sàng" blockers={blockers} /> : null}
    </div>
  );
}
