import type { CertificationCaseWorkspaceProjection } from "../certification-case/types";

type AuditAction = CertificationCaseWorkspaceProjection["allowed_actions"][number];

export const auditActionSections: Record<string, "team" | "plan" | "execution"> = {
  "audit_team.issue": "team",
  "audit_plan.prepare": "plan",
  "audit.execute": "execution",
};

export function auditAction(data: CertificationCaseWorkspaceProjection, auditId: string): AuditAction | null {
  return data.allowed_actions.find((action) =>
    action.destination.query.audit_plan_id === auditId &&
    Object.hasOwn(auditActionSections, action.code),
  ) ?? null;
}

export function auditExecutionAction(data: CertificationCaseWorkspaceProjection, auditId: string): AuditAction | null {
  return data.allowed_actions.find((action) =>
    action.destination.query.audit_plan_id === auditId && action.code === "audit.execute",
  ) ?? null;
}

export function auditBelongsToCase(caseId: string, auditId: string, plan: { id: string; project_id?: string | null }) {
  return plan.id === auditId && plan.project_id === caseId;
}

export function teamDateRange(members: Array<{ planned_start_date?: string | null; planned_end_date?: string | null }>) {
  const starts = members.map((member) => member.planned_start_date).filter((date): date is string => Boolean(date && Number.isFinite(Date.parse(date))));
  const ends = members.map((member) => member.planned_end_date).filter((date): date is string => Boolean(date && Number.isFinite(Date.parse(date))));
  return {
    start: starts.sort((left, right) => Date.parse(left) - Date.parse(right))[0],
    end: ends.sort((left, right) => Date.parse(right) - Date.parse(left))[0],
  };
}
