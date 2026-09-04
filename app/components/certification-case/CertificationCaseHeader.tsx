import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";

import {
  DeadlineSlaBadge,
  DomainStatusBadge,
  NextActionBar,
  PageHeader,
  type DeadlineSlaState,
  type ProjectedAction,
} from "../design-system";
import { actionWorkspacePath, caseCustomer, caseScope, currentCycleItem, cycleLabel, formatCaseDate, importantDeadline, normalizeCaseValue } from "./case-model";
import type { CertificationCaseWorkspaceData, CertificationCycleGroup } from "./types";

function slaState(alertType: string): DeadlineSlaState {
  const normalized = normalizeCaseValue(alertType);
  if (normalized.includes("overdue") || normalized.includes("expired")) return "OVERDUE";
  if (normalized.includes("upcoming") || normalized.includes("expiring")) return "DUE_SOON";
  return "ON_TRACK";
}

export interface CertificationCaseHeaderProps {
  data: CertificationCaseWorkspaceData;
  cycle: CertificationCycleGroup | null;
  refreshing?: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onOpenCompatibility: (path: string) => void;
}

export function CertificationCaseHeader({ data, cycle, refreshing, onBack, onRefresh, onOpenCompatibility }: CertificationCaseHeaderProps) {
  const customer = caseCustomer(data.project) ?? data.dossier.project.customer;
  const scope = caseScope(data.project);
  const currentItem = currentCycleItem(cycle);
  const deadline = importantDeadline(data.alerts.alerts);
  const compatibilityPath = cycle ? actionWorkspacePath(data.project.id, cycle) : null;
  const blockingCount = data.alerts.alerts.filter((alert) => alert.severity === "critical").length;
  const warningCount = data.alerts.alerts.filter((alert) => alert.severity === "warning").length;
  const primaryAction: ProjectedAction | null = cycle?.next_action ? {
    code: cycle.next_action.code,
    label: cycle.next_action.label,
    businessMeaning: `Tiếp tục tại không gian nghiệp vụ hiện có. Trách nhiệm: ${cycle.next_action.responsible_label ?? "được xác định trong bước xử lý"}.`,
    enabled: Boolean(compatibilityPath),
    disabledReason: "Nguồn hiện tại chưa cung cấp đích nghiệp vụ an toàn.",
    severity: "IMPORTANT",
    onAction: compatibilityPath ? () => onOpenCompatibility(compatibilityPath) : undefined,
  } : null;

  return (
    <section className="cmp-case-hero" aria-labelledby="certification-case-title">
      <PageHeader
        identity="HỒ SƠ CHỨNG NHẬN"
        title={<span id="certification-case-title">{data.project.project_code}</span>}
        description={(
          <div className="cmp-case-primary-identity">
            <strong>{customer?.company_name ?? "Chưa xác định khách hàng"}</strong>
            <span>{data.project.standard_name}</span>
          </div>
        )}
        metadata={(
          <>
            <DomainStatusBadge domain="case" code={normalizeCaseValue(data.project.status)} />
            <Typography.Text type="secondary">Cập nhật {formatCaseDate(data.project.updated_at)}</Typography.Text>
          </>
        )}
        secondaryActions={(
          <div className="cmp-case-header-actions">
            <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Danh sách hồ sơ</Button>
            <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>Làm mới</Button>
          </div>
        )}
      />

      <div className="cmp-case-operational-context">
        <div className="cmp-case-operational-scope">
          <span>Phạm vi chứng nhận</span>
          <strong>{scope}</strong>
        </div>
        <div className="cmp-case-operational-grid">
          <div><span>Chu kỳ đang xem</span><strong>{cycle ? cycleLabel(cycle) : "Chưa có dữ liệu"}</strong></div>
          <div><span>Bước hiện tại</span><strong>{currentItem?.document_name ?? "Chưa xác định"}</strong></div>
          <div><span>Người xử lý</span><strong>{cycle?.next_action?.responsible_label ?? "Chưa có thông tin tổng hợp"}</strong></div>
          <div>
            <span>Hạn quan trọng</span>
            {deadline ? (
              <DeadlineSlaBadge
                state={slaState(deadline.alert_type)}
                dueAt={deadline.due_date}
                formattedDueAt={formatCaseDate(deadline.due_date)}
                explanation={deadline.message}
              />
            ) : <strong>Chưa có thời hạn tổng hợp</strong>}
          </div>
        </div>
      </div>

      {blockingCount || warningCount ? (
        <div className="cmp-case-alert-summary" data-severity={blockingCount ? "blocking" : "warning"}>
          <strong>{blockingCount ? `${blockingCount} điều kiện đang chặn` : `${warningCount} điểm cần chú ý`}</strong>
          <span>{data.alerts.alerts[0]?.message}</span>
        </div>
      ) : null}

      <NextActionBar
        primaryAction={primaryAction}
        emptyLabel="Chưa có việc tiếp theo được nguồn nghiệp vụ cung cấp cho chu kỳ này."
      />
    </section>
  );
}
