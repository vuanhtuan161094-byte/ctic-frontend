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
        description={<><strong>{customer?.company_name ?? "Chưa xác định khách hàng"}</strong><span aria-hidden="true"> · </span>{data.project.standard_name}</>}
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

      <div className="cmp-case-hero-grid">
        <div className="cmp-case-hero-fact cmp-case-hero-fact--wide">
          <span>Phạm vi chứng nhận</span>
          <strong>{scope}</strong>
        </div>
        <div className="cmp-case-hero-fact">
          <span>Chu kỳ đang xem</span>
          <strong>{cycle ? cycleLabel(cycle) : "Chưa có dữ liệu chu kỳ"}</strong>
        </div>
        <div className="cmp-case-hero-fact">
          <span>Bước nghiệp vụ hiện tại</span>
          <strong>{currentItem?.document_name ?? "Chưa xác định"}</strong>
        </div>
        <div className="cmp-case-hero-fact">
          <span>Trách nhiệm tiếp theo</span>
          <strong>{cycle?.next_action?.responsible_label ?? "Chưa có thông tin tổng hợp"}</strong>
        </div>
        <div className="cmp-case-hero-fact">
          <span>Thời hạn quan trọng</span>
          {deadline ? (
            <DeadlineSlaBadge
              state={slaState(deadline.alert_type)}
              dueAt={deadline.due_date}
              formattedDueAt={formatCaseDate(deadline.due_date)}
              explanation={deadline.message}
            />
          ) : <strong>Chưa có thời hạn tổng hợp từ nguồn</strong>}
        </div>
      </div>

      <NextActionBar
        primaryAction={primaryAction}
        emptyLabel="Chưa có việc tiếp theo được nguồn nghiệp vụ cung cấp cho chu kỳ này."
      />
    </section>
  );
}
