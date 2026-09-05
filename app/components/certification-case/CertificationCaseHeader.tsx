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
import { actionWorkspacePath, caseCustomer, caseScope, currentCycleItem, cycleLabel, formatCaseDate, normalizeCaseValue } from "./case-model";
import type { CertificationCaseProjectionCycle, CertificationCaseWorkspaceProjection } from "./types";

function slaState(status: CertificationCaseWorkspaceProjection["sla"]["status"]): DeadlineSlaState {
  if (status === "OVERDUE") return "OVERDUE";
  if (status === "WARNING") return "DUE_SOON";
  if (status === "NOT_APPLICABLE" || status === "NOT_CONFIGURED") return status;
  return "ON_TRACK";
}

export interface CertificationCaseHeaderProps {
  data: CertificationCaseWorkspaceProjection;
  cycle: CertificationCaseProjectionCycle | null;
  refreshing?: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onOpenCompatibility: (path: string) => void;
}

export function CertificationCaseHeader({ data, cycle, refreshing, onBack, onRefresh, onOpenCompatibility }: CertificationCaseHeaderProps) {
  const customer = caseCustomer(data);
  const scope = caseScope(data);
  const currentItem = currentCycleItem(cycle);
  const compatibilityPath = actionWorkspacePath(data);
  const blockingCount = data.blockers.filter((blocker) => blocker.severity === "CRITICAL").length;
  const warningCount = data.blockers.filter((blocker) => blocker.severity === "WARNING").length;
  const primaryAction: ProjectedAction | null = data.next_action ? {
    code: data.next_action.code,
    label: data.next_action.label,
    businessMeaning: data.next_action.business_meaning,
    enabled: data.next_action.authorized && Boolean(compatibilityPath),
    disabledReason: data.next_action.disabled_reason ?? "Chưa có đích nghiệp vụ tương thích.",
    severity: "IMPORTANT",
    onAction: compatibilityPath ? () => onOpenCompatibility(compatibilityPath) : undefined,
  } : null;

  return (
    <section className="cmp-case-hero" aria-labelledby="certification-case-title">
      <PageHeader
        identity="HỒ SƠ CHỨNG NHẬN"
        title={<span id="certification-case-title">{data.identity.case_reference}</span>}
        description={(
          <div className="cmp-case-primary-identity">
            <strong>{customer.name}</strong>
            <span>{data.standards_scope.display_name}</span>
          </div>
        )}
        metadata={(
          <>
            <DomainStatusBadge domain="case" code={normalizeCaseValue(data.case_status)} />
            <Typography.Text type="secondary">Cập nhật {formatCaseDate(data.identity.updated_at)}</Typography.Text>
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
          <div><span>Người xử lý</span><strong>{data.responsibility?.label ?? "Chưa có thông tin tổng hợp"}</strong></div>
          <div>
            <span>Hạn quan trọng</span>
            {data.sla.applicability === "APPLICABLE" ? (
              <DeadlineSlaBadge
                state={slaState(data.sla.status)}
                dueAt={data.sla.due_at}
                formattedDueAt={formatCaseDate(data.sla.due_at)}
                explanation={data.sla.remaining_days === null ? undefined : `${data.sla.remaining_days} ngày còn lại theo nguồn thời hạn hiện có.`}
              />
            ) : <DeadlineSlaBadge state={slaState(data.sla.status)} />}
          </div>
        </div>
      </div>

      {blockingCount || warningCount ? (
        <div className="cmp-case-alert-summary" data-severity={blockingCount ? "blocking" : "warning"}>
          <strong>{blockingCount ? `${blockingCount} điều kiện đang chặn` : `${warningCount} điểm cần chú ý`}</strong>
          <span>{data.blockers[0]?.message}</span>
        </div>
      ) : null}

      <NextActionBar
        primaryAction={primaryAction}
        emptyLabel="Chưa có việc tiếp theo được nguồn nghiệp vụ cung cấp cho chu kỳ này."
      />
    </section>
  );
}
