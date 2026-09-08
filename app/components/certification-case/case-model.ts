import type { LifecycleStep, StructuredBlocker } from "../design-system";

import type {
  CertificationCaseProjectionCycle,
  CertificationCaseWorkspaceProjection,
} from "./types";

export const normalizeCaseValue = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export function formatCaseDate(value?: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function caseCustomer(data: CertificationCaseWorkspaceProjection) {
  return data.customer;
}

export function caseScope(data: CertificationCaseWorkspaceProjection) {
  return data.standards_scope.certification_scope?.trim() || "Chưa ghi nhận phạm vi";
}

export function orderedCycles(data: CertificationCaseWorkspaceProjection) {
  return [...data.cycles].sort((left, right) => left.sequence_no - right.sequence_no);
}

export function selectedCycle(data: CertificationCaseWorkspaceProjection, requestedKey?: string | null) {
  const cycles = orderedCycles(data);
  return cycles.find((cycle) => cycle.key === requestedKey)
    ?? cycles.find((cycle) => cycle.key === data.current_cycle?.key)
    ?? cycles[0]
    ?? null;
}

export function cycleLabel(cycle: CertificationCaseProjectionCycle) {
  const normalized = normalizeCaseValue(cycle.type || cycle.key).replaceAll("-", "_");
  if (normalized.includes("surveillance1") || normalized.includes("surveillance_1")) return "Giám sát lần 1";
  if (normalized.includes("surveillance2") || normalized.includes("surveillance_2")) return "Giám sát lần 2";
  if (normalized.includes("recert")) return "Tái chứng nhận";
  if (normalized.includes("initial")) return "Chứng nhận lần đầu";
  return cycle.label;
}

export function currentCycleItem(cycle: CertificationCaseProjectionCycle | null) {
  if (!cycle) return null;
  return [...cycle.stages]
    .sort((left, right) => left.item_no - right.item_no)
    .find((item) => !["completed", "not_applicable"].includes(normalizeCaseValue(item.status)))
    ?? [...cycle.stages].sort((left, right) => right.item_no - left.item_no)[0]
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

export function lifecycleSteps(data: CertificationCaseWorkspaceProjection, cycle: CertificationCaseProjectionCycle): LifecycleStep[] {
  const steps: LifecycleStep[] = [];
  let currentAssigned = false;
  for (const stage of STAGES) {
    const sourceItems = cycle.stages.filter((item) => stage.itemKeys.includes(normalizeCaseValue(item.document_key)));
    if (sourceItems.length === 0) continue;
    const allNotApplicable = sourceItems.every((item) => normalizeCaseValue(item.status) === "not_applicable");
    const allComplete = sourceItems.every((item) => ["completed", "not_applicable"].includes(normalizeCaseValue(item.status)));
    let state: LifecycleStep["state"];
    if (allNotApplicable) state = "notApplicable";
    else if (allComplete) state = "complete";
    else if (currentAssigned) state = "upcoming";
    else {
      const references = new Set(sourceItems.flatMap((item) => [item.reference_id, item.entity_id, item.action_event_id]).filter(Boolean));
      const blocked = data.blockers.some((blocker) => blocker.severity === "CRITICAL" && blocker.source_id && references.has(blocker.source_id));
      state = blocked ? "blocked" : "current";
      currentAssigned = true;
    }
    const pending = sourceItems.filter((item) => normalizeCaseValue(item.status) === "pending").length;
    steps.push({ key: stage.key, title: stage.title, description: pending ? `${pending} thành phần đang chờ` : undefined, state });
  }
  return steps;
}

export function projectionBlockers(data: CertificationCaseWorkspaceProjection): StructuredBlocker[] {
  return data.blockers.map((blocker) => ({
    code: `${blocker.code}-${blocker.source_id ?? "case"}`,
    label: blocker.message,
    explanation: blocker.due_at ? `Mốc liên quan: ${formatCaseDate(blocker.due_at)}` : undefined,
    severity: blocker.severity === "CRITICAL" ? "BLOCKING" : blocker.severity === "WARNING" ? "WARNING" : "INFO",
  }));
}

export const DOCUMENT_GROUP_LABELS: Record<string, string> = {
  customer_evidence: "Khách hàng / bằng chứng",
  audit: "Tài liệu đánh giá",
  cap: "Hành động khắc phục",
  technical_review: "Thẩm xét kỹ thuật",
  decision_result: "Quyết định / kết quả",
  certificate: "Chứng chỉ",
  other: "Tài liệu khác",
};

export function actionWorkspacePath(data: CertificationCaseWorkspaceProjection) {
  const destination = data.next_action?.destination;
  const auditId = destination?.query.audit_plan_id;
  const findingId = destination?.query.finding_id;
  if (destination && /technical.review/i.test(`${data.next_action?.code ?? ""} ${destination.route_name} ${destination.legacy_path}`)) {
    const params = new URLSearchParams();
    if (auditId) params.set("audit_plan_id", auditId);
    if (destination.query.technical_review_id) params.set("technical_review_id", destination.query.technical_review_id);
    return `/certifications/${encodeURIComponent(data.identity.id)}/technical-review${params.size ? `?${params}` : ""}`;
  }
  if (destination && findingId && /cap/i.test(`${data.next_action?.code ?? ""} ${destination.route_name}`)) {
    return `/certifications/${encodeURIComponent(data.identity.id)}/findings/${encodeURIComponent(findingId)}`;
  }
  if (destination && auditId && /(audit|report|plan)/i.test(`${data.next_action?.code ?? ""} ${destination.route_name}`)) {
    return `/certifications/${encodeURIComponent(data.identity.id)}/audits/${encodeURIComponent(auditId)}`;
  }
  return destination ? destination.legacy_path : null;
}
