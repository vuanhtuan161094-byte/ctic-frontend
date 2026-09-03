import type { LifecycleStep, StructuredBlocker } from "../design-system";

import type {
  CertificationCaseAlert,
  CertificationCaseFile,
  CertificationCaseItem,
  CertificationCaseRecord,
  CertificationCaseWorkspaceData,
  CertificationCycleGroup,
} from "./types";

export const normalizeCaseValue = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export function formatCaseDate(value?: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function caseCustomer(record: CertificationCaseRecord) {
  return record.certification_applications?.customers ?? null;
}

export function caseScope(record: CertificationCaseRecord) {
  return record.certification_applications?.certification_scope?.trim() || "Chưa ghi nhận phạm vi";
}

export function orderedCycles(data: CertificationCaseWorkspaceData) {
  return [...(data.dossier.dossiers ?? [])].sort((left, right) => left.sequence_no - right.sequence_no);
}

export function selectedCycle(data: CertificationCaseWorkspaceData, requestedKey?: string | null) {
  const cycles = orderedCycles(data);
  return cycles.find((cycle) => cycle.dossier_key === requestedKey)
    ?? cycles.find((cycle) => cycle.dossier_key === data.dossier.current_dossier_key)
    ?? cycles[0]
    ?? null;
}

export function cycleLabel(cycle: CertificationCycleGroup) {
  const normalized = normalizeCaseValue(cycle.dossier_type || cycle.dossier_key).replaceAll("-", "_");
  if (normalized.includes("surveillance1") || normalized.includes("surveillance_1")) return "Giám sát lần 1";
  if (normalized.includes("surveillance2") || normalized.includes("surveillance_2")) return "Giám sát lần 2";
  if (normalized.includes("recert")) return "Tái chứng nhận";
  if (normalized.includes("initial")) return "Chứng nhận lần đầu";
  return cycle.dossier_label;
}

export function currentCycleItem(cycle: CertificationCycleGroup | null) {
  if (!cycle) return null;
  return [...cycle.items]
    .sort((left, right) => left.item_no - right.item_no)
    .find((item) => !["completed", "not_applicable"].includes(normalizeCaseValue(item.status)))
    ?? [...cycle.items].sort((left, right) => right.item_no - left.item_no)[0]
    ?? null;
}

const STAGES: Array<{ key: string; title: string; itemKeys: string[] }> = [
  { key: "application", title: "Đơn đăng ký", itemKeys: ["certification_application"] },
  { key: "review", title: "Thẩm xét", itemKeys: ["application_review"] },
  { key: "commercial", title: "Thương mại / chấp thuận", itemKeys: ["commercial_acceptance"] },
  { key: "programme", title: "Chương trình đánh giá", itemKeys: ["audit_program"] },
  { key: "team", title: "Bố trí đoàn", itemKeys: ["audit_team_assignment"] },
  { key: "plan", title: "Kế hoạch", itemKeys: ["stage1_audit_plan", "stage2_audit_plan", "audit_plan"] },
  { key: "audit", title: "Đánh giá", itemKeys: ["stage1_audit_report", "stage2_audit_report", "audit_report", "audit_checklist", "opening_closing_attendance", "audit_log"] },
  { key: "cap", title: "Hành động khắc phục", itemKeys: ["nc_cap"] },
  { key: "technical-review", title: "Thẩm xét kỹ thuật", itemKeys: ["technical_review_report"] },
  { key: "decision", title: "Quyết định", itemKeys: ["certification_decision", "audit_result_notification"] },
  { key: "certificate", title: "Chứng chỉ", itemKeys: ["certificate"] },
];

function stageSourceItems(data: CertificationCaseWorkspaceData, cycle: CertificationCycleGroup, itemKeys: string[]) {
  const commonItems = data.dossier.common_items ?? [];
  return [...commonItems, ...cycle.items].filter((item) => itemKeys.includes(normalizeCaseValue(item.document_key)));
}

function hasMatchingAlert(items: CertificationCaseItem[], alerts: CertificationCaseAlert[]) {
  const references = new Set(items.flatMap((item) => [item.reference_id, item.entity_id, item.action_event_id]).filter(Boolean));
  return alerts.some((alert) => alert.reference_id && references.has(alert.reference_id) && alert.severity !== "info");
}

export function lifecycleSteps(data: CertificationCaseWorkspaceData, cycle: CertificationCycleGroup): LifecycleStep[] {
  const cycleType = normalizeCaseValue(cycle.dossier_type || cycle.dossier_key);
  const steps: LifecycleStep[] = [];
  let currentAssigned = false;

  for (const stage of STAGES) {
    const sourceItems = stageSourceItems(data, cycle, stage.itemKeys);
    const isHistoricalOnly = ["application", "review", "commercial"].includes(stage.key) && !cycleType.includes("initial");
    if (isHistoricalOnly) continue;

    if (stage.key === "commercial") {
      const complete = Boolean(data.project.contracts || data.project.certification_agreements);
      steps.push({ key: stage.key, title: stage.title, state: complete ? "complete" : currentAssigned ? "upcoming" : "current" });
      if (!complete) currentAssigned = true;
      continue;
    }

    if (sourceItems.length === 0) continue;
    const allNotApplicable = sourceItems.every((item) => normalizeCaseValue(item.status) === "not_applicable");
    const allComplete = sourceItems.every((item) => ["completed", "not_applicable"].includes(normalizeCaseValue(item.status)));
    let state: LifecycleStep["state"];
    if (allNotApplicable) state = "notApplicable";
    else if (allComplete) state = "complete";
    else if (currentAssigned) state = "upcoming";
    else {
      state = hasMatchingAlert(sourceItems, data.alerts.alerts) ? "blocked" : "current";
      currentAssigned = true;
    }
    const pending = sourceItems.filter((item) => normalizeCaseValue(item.status) === "pending").length;
    steps.push({
      key: stage.key,
      title: stage.title,
      description: pending ? `${pending} thành phần đang chờ` : undefined,
      state,
    });
  }
  return steps;
}

export function alertBlockers(alerts: CertificationCaseAlert[]): StructuredBlocker[] {
  return alerts.map((alert, index) => ({
    code: `${alert.alert_type}-${alert.reference_id ?? index}`,
    label: alert.message,
    explanation: alert.due_date ? `Mốc liên quan: ${formatCaseDate(alert.due_date)}` : undefined,
    severity: alert.severity === "critical" ? "BLOCKING" : alert.severity === "warning" ? "WARNING" : "INFO",
  }));
}

export function importantDeadline(alerts: CertificationCaseAlert[]) {
  const dated = alerts.filter((alert) => alert.due_date).sort((left, right) => (
    new Date(left.due_date ?? 0).getTime() - new Date(right.due_date ?? 0).getTime()
  ));
  return dated[0] ?? null;
}

export type DocumentGroupKey = "customer" | "audit" | "cap" | "review" | "decision" | "certificate" | "other";

export const DOCUMENT_GROUP_LABELS: Record<DocumentGroupKey, string> = {
  customer: "Bằng chứng khách hàng",
  audit: "Tài liệu đánh giá",
  cap: "Bằng chứng HĐKP",
  review: "Thẩm xét kỹ thuật",
  decision: "Quyết định và kết quả",
  certificate: "Chứng chỉ",
  other: "Tệp đính kèm khác",
};

export function documentGroup(file: CertificationCaseFile): DocumentGroupKey {
  const value = normalizeCaseValue(`${file.document_type} ${file.file_kind} ${file.entity_type}`);
  if (value.includes("certificate")) return "certificate";
  if (value.includes("technical") || value.includes("review")) return "review";
  if (value.includes("decision") || value.includes("result") || value.includes("notification")) return "decision";
  if (value.includes("finding") || value.includes("cap") || value.includes("corrective")) return "cap";
  if (value.includes("audit") || value.includes("plan") || value.includes("report") || value.includes("checklist")) return "audit";
  if (value.includes("application") || value.includes("customer") || value.includes("business")) return "customer";
  return "other";
}

export function actionWorkspacePath(caseId: string, cycle: CertificationCycleGroup) {
  const action = cycle.next_action;
  if (!action) return null;
  const workspaceByAction: Record<string, string> = {
    UPDATE_INFORMATION: "surveillance-change",
    REVIEW_CHANGE: "surveillance-change",
    APPOINT_TEAM: "audit-team",
    PLAN_AUDIT: "audit-plan",
    EXECUTE_AUDIT: "audit-execution",
    COMPLETE_NC_CAP: "cap",
    TECHNICAL_REVIEW: "technical-review",
    MAKE_DECISION: "certification-decision",
    NOTIFY_RESULT: "certification-decision",
    ISSUE_CERTIFICATE: "certificate-issue",
  };
  const workspace = workspaceByAction[action.code];
  if (!workspace) return null;
  const query = new URLSearchParams({ workspace, dossier_key: cycle.dossier_key });
  const planId = action.plan_id ?? cycle.plan_ids[0];
  if (planId) query.set("audit_plan_id", planId);
  if (action.event_id) query.set("audit_event_id", action.event_id);
  return `/projects/${encodeURIComponent(caseId)}?${query.toString()}`;
}
