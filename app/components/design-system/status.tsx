import { Tooltip } from "antd";

import type { SemanticTone, StatusDefinition, StatusDomain } from "./types";

type StatusVocabulary = Record<StatusDomain, Record<string, StatusDefinition>>;

const definition = (label: string, tone: SemanticTone): StatusDefinition => ({ label, tone });

export const DOMAIN_STATUS_VOCABULARY: StatusVocabulary = {
  application: {
    DRAFT: definition("Nháp", "neutral"), SUBMITTED: definition("Đã gửi", "info"),
    UNDER_REVIEW: definition("Đang thẩm xét", "attention"), REVISION_REQUIRED: definition("Cần bổ sung", "attention"),
    ACCEPTED: definition("Đã chấp thuận", "positive"), REJECTED: definition("Không chấp thuận", "critical"),
    CANCELLED: definition("Đã hủy", "inactive"), IN_CERTIFICATION: definition("Đã tạo hồ sơ chứng nhận", "positive"),
    project_created: definition("Đã tạo hồ sơ chứng nhận", "positive"),
  },
  applicationReview: {
    DRAFT: definition("Bản thẩm xét nháp", "neutral"), SUBMITTED: definition("Chờ chuyên gia thẩm xét", "attention"),
    RETURNED: definition("Đã trả lại để bổ sung", "attention"), APPROVED: definition("Đã phê duyệt", "positive"),
  },
  reviewResult: {
    DRAFT: definition("Chưa có kết quả", "neutral"),
    ACCEPTED: definition("Đủ điều kiện", "positive"), REJECTED: definition("Không đủ điều kiện", "critical"),
    NEED_MORE_INFO: definition("Cần thêm thông tin", "attention"),
  },
  quotation: {
    DRAFT: definition("Nháp", "neutral"), UNDER_REVIEW: definition("Đang xem xét", "attention"),
    APPROVED: definition("Đã duyệt", "positive"), SENT: definition("Đã gửi khách hàng", "info"),
    ACCEPTED: definition("Khách hàng chấp thuận", "positive"), REJECTED: definition("Khách hàng từ chối", "critical"),
    EXPIRED: definition("Hết hiệu lực", "inactive"), CANCELLED: definition("Đã hủy", "inactive"),
  },
  case: {
    draft: definition("Hồ sơ mới", "neutral"), certification_approved: definition("Đã chấp thuận chứng nhận", "positive"),
    certification_rejected: definition("Không chấp thuận chứng nhận", "critical"), decision_deferred: definition("Tạm hoãn quyết định", "attention"),
  },
  programme: {
    draft: definition("Chương trình nháp", "neutral"), planned: definition("Đã lên lịch", "info"),
    in_progress: definition("Đang thực hiện", "attention"), completed: definition("Hoàn tất", "positive"),
    cancelled: definition("Đã hủy", "inactive"),
  },
  surveillanceSnapshot: {
    DRAFT: definition("Thông tin giám sát nháp", "neutral"), CONFIRMED: definition("Đã xác nhận", "info"),
    REVIEWED: definition("Đã xem xét thay đổi", "positive"),
  },
  teamAppointment: {
    draft: definition("Đang chuẩn bị", "neutral"), not_issued: definition("Đang chuẩn bị", "neutral"),
    issued: definition("Đã ban hành", "positive"), cancelled: definition("Đã hủy", "inactive"),
  },
  competence: {
    APPROVED: definition("Đáp ứng", "positive"), qualified: definition("Đáp ứng", "positive"),
    not_qualified: definition("Không đáp ứng", "critical"), not_required: definition("Không yêu cầu", "neutral"),
    not_assigned: definition("Chưa phân công", "attention"), ACTIVE: definition("Đang hoạt động", "info"), OPEN: definition("Đang mở", "attention"),
  },
  auditPlan: {
    draft: definition("Kế hoạch nháp", "neutral"), in_progress: definition("Đang đánh giá", "attention"),
    completed: definition("Đã hoàn tất", "positive"), cancelled: definition("Đã hủy", "inactive"),
  },
  report: {
    draft: definition("Báo cáo nháp", "neutral"), stage1_completed: definition("Đã hoàn tất báo cáo Giai đoạn 1", "info"),
    corrective_action_required: definition("Chờ HĐKP", "attention"), ready_for_technical_review: definition("Sẵn sàng thẩm xét kỹ thuật", "positive"),
    technical_review_completed: definition("Đã thẩm xét kỹ thuật", "positive"),
  },
  finding: {
    recorded: definition("Đã ghi nhận", "neutral"), open: definition("Đang mở", "attention"),
    response_submitted: definition("Đã gửi HĐKP", "info"), revision_required: definition("Cần sửa HĐKP", "attention"),
    response_accepted: definition("HĐKP được chấp nhận", "positive"), closed: definition("Đã đóng", "inactive"),
  },
  capVersion: {
    submitted: definition("Đã gửi", "info"), accepted: definition("Đã chấp nhận", "positive"),
    revision_required: definition("Cần sửa", "attention"),
  },
  technicalReview: {
    pending: definition("Chờ thẩm xét", "attention"), in_progress: definition("Đang thẩm xét", "info"),
    completed: definition("Đã hoàn tất", "positive"),
  },
  reviewerAssignment: {
    CURRENT: definition("Đang được phân công", "info"), REASSIGNED: definition("Đã phân công lại", "inactive"),
    COMPLETED: definition("Đã hoàn thành", "positive"),
  },
  reviewItem: {
    pending: definition("Chưa xem xét", "neutral"), submitted: definition("Đã gửi", "info"),
    changes_requested: definition("Yêu cầu sửa", "attention"), resubmitted: definition("Đã gửi lại", "info"),
    accepted: definition("Đã chấp nhận", "positive"),
  },
  decisionResult: {
    approved: definition("Đã chấp thuận", "positive"), rejected: definition("Không chấp thuận", "critical"),
    deferred: definition("Tạm hoãn", "attention"),
  },
  certificate: {
    active: definition("Đang hiệu lực", "positive"), suspended: definition("Tạm đình chỉ", "attention"),
    withdrawn: definition("Đã thu hồi", "critical"), expired: definition("Hết hiệu lực", "inactive"),
    replaced: definition("Đã thay thế", "inactive"),
  },
  controlledTemplate: {
    DRAFT: definition("Nháp", "neutral"), UNDER_REVIEW: definition("Đang xem xét", "attention"),
    REVIEWED: definition("Đã xem xét", "info"), APPROVED: definition("Đã phê duyệt", "positive"),
    EFFECTIVE: definition("Đang hiệu lực", "positive"), SUPERSEDED: definition("Đã thay thế", "inactive"),
    WITHDRAWN: definition("Đã thu hồi", "critical"),
  },
  generatedDocument: {
    DRAFT: definition("Nháp", "neutral"), UNDER_REVIEW: definition("Đang xem xét", "attention"),
    REVIEWED: definition("Đã xem xét", "info"), APPROVED: definition("Đã phê duyệt", "positive"),
    ISSUED: definition("Đã ban hành", "positive"), VOID: definition("Đã vô hiệu", "critical"),
  },
  changeCase: {
    SUBMITTED: definition("Đã gửi", "info"), IMPACT_ASSESSED: definition("Đã đánh giá tác động", "info"),
    ACTION_REQUIRED: definition("Cần hành động tiếp", "attention"), COMPLETED: definition("Hoàn tất", "positive"),
    REJECTED: definition("Không chấp nhận", "critical"), CANCELLED: definition("Đã hủy", "inactive"),
  },
  specialAudit: {
    OPEN: definition("Đang mở", "attention"), PLANNED: definition("Đã lập kế hoạch", "info"),
    RESULT_RECORDED: definition("Đã ghi nhận kết quả, chờ xử lý tiếp", "attention"), CLOSED: definition("Đã đóng", "inactive"),
    CANCELLED: definition("Đã hủy", "inactive"),
  },
  complaint: {
    RECEIVED: definition("Đã tiếp nhận", "info"), UNDER_REVIEW: definition("Đang phân công/xem xét", "attention"),
    ACKNOWLEDGED: definition("Đã xác nhận", "info"), INVESTIGATING: definition("Đang điều tra", "attention"),
    RESPONSE_PENDING: definition("Chờ phản hồi", "attention"), CLOSED: definition("Đã đóng", "inactive"),
    REJECTED: definition("Không chấp nhận", "critical"), OUT_OF_SCOPE: definition("Ngoài phạm vi", "inactive"),
  },
  appeal: {
    SUBMITTED: definition("Đã gửi", "info"), UNDER_REVIEW: definition("Đang xem xét", "attention"),
    DECISION_PENDING: definition("Chờ quyết định", "attention"), CLOSED: definition("Đã đóng", "inactive"),
    REJECTED: definition("Không chấp nhận", "critical"), OUT_OF_SCOPE: definition("Ngoài phạm vi", "inactive"),
  },
  workItem: {
    OPEN: definition("Chưa bắt đầu", "neutral"), IN_PROGRESS: definition("Đang xử lý", "info"),
    DONE: definition("Đã hoàn thành", "positive"), CANCELLED: definition("Đã hủy", "inactive"),
  },
};

export interface DomainStatusBadgeProps {
  domain: StatusDomain;
  code: string;
  label?: string;
  tone?: SemanticTone;
}

export function resolveDomainStatus(domain: StatusDomain, code: string): StatusDefinition {
  return DOMAIN_STATUS_VOCABULARY[domain][code] ?? definition(code, "neutral");
}

export function DomainStatusBadge({ domain, code, label, tone }: DomainStatusBadgeProps) {
  const resolved = resolveDomainStatus(domain, code);
  const content = label ?? resolved.label;
  return (
    <Tooltip title={`${domain}: ${code}`}>
      <span className={`cmp-status-badge cmp-tone-${tone ?? resolved.tone}`} data-status-domain={domain} data-status-code={code}>
        {content}
      </span>
    </Tooltip>
  );
}

export type DeadlineSlaState = "NOT_APPLICABLE" | "NOT_CONFIGURED" | "ON_TRACK" | "DUE_SOON" | "OVERDUE";

const SLA_DEFINITIONS: Record<DeadlineSlaState, StatusDefinition> = {
  NOT_APPLICABLE: definition("Không áp dụng", "neutral"),
  NOT_CONFIGURED: definition("Chưa cấu hình thời hạn", "attention"),
  ON_TRACK: definition("Đúng hạn", "info"),
  DUE_SOON: definition("Sắp đến hạn", "attention"),
  OVERDUE: definition("Quá hạn", "critical"),
};

export interface DeadlineSlaBadgeProps {
  state: DeadlineSlaState;
  dueAt?: string | null;
  explanation?: string;
  formattedDueAt?: string;
}

export function DeadlineSlaBadge({ state, dueAt, explanation, formattedDueAt }: DeadlineSlaBadgeProps) {
  const effectiveState: DeadlineSlaState = state !== "NOT_APPLICABLE" && !dueAt ? "NOT_CONFIGURED" : state;
  const resolved = SLA_DEFINITIONS[effectiveState];
  const dateLabel = dueAt ? (formattedDueAt ?? dueAt) : undefined;
  const tooltip = [dateLabel ? `Hạn: ${dateLabel}` : undefined, explanation].filter(Boolean).join(" · ");
  const badge = (
    <span className={`cmp-status-badge cmp-tone-${resolved.tone}`} data-sla-state={effectiveState}>
      {resolved.label}{dateLabel ? ` · ${dateLabel}` : ""}
    </span>
  );
  return tooltip ? <Tooltip title={tooltip}>{badge}</Tooltip> : badge;
}
