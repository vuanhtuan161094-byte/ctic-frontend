export type CapSection = "overview" | "response" | "evidence" | "versions" | "review" | "activity";
export const capSections: Record<CapSection, string> = {
  overview: "Tổng quan phát hiện", response: "Phản hồi/HĐKP", evidence: "Bằng chứng",
  versions: "Lịch sử phiên bản", review: "Thẩm xét CAP", activity: "Hoạt động",
};
export function capSection(value?: string | null): CapSection {
  return value && Object.hasOwn(capSections, value) ? value as CapSection : "overview";
}
export interface CapEvidence {
  id: string; original_name: string; download_url: string; version_no?: number | null; created_at?: string | null;
}
export interface CapVersion {
  id: string; version_no: number; status: string; root_cause: string; correction: string;
  corrective_action_plan: string; responsible_person?: string | null; target_date?: string | null;
  submitted_at?: string | null; reviewed_at?: string | null; review_comment?: string | null;
  submitted_by_user?: { full_name?: string | null } | null;
  reviewed_by_user?: { full_name?: string | null } | null;
  evidence_files?: CapEvidence[]; form_data?: Record<string, unknown> | null;
}
export interface CapFinding {
  id: string; finding_code: string; finding_type: string; status: string; description: string;
  objective_evidence: string; clause?: string | null; requirement?: string | null;
  detected_date?: string | null; due_date?: string | null; is_overdue?: boolean;
  closed_at?: string | null; close_comment?: string | null; corrective_actions: CapVersion[];
}
export interface CapWorkspaceProjection {
  contract_version: string; audience: "internal" | "customer";
  context: { case_id: string; audit_id: string; plan_code?: string | null; audit_type?: string | null;
    project_code: string; customer_name: string };
  finding: CapFinding;
  allowed_actions: { respond: boolean; review: boolean; close: boolean; upload_evidence: boolean };
}
export function capContextMatches(data: CapWorkspaceProjection, caseId: string | null, findingId: string) {
  return data.finding.id === findingId && (!caseId || data.context.case_id === caseId);
}
export function selectedCapVersion(finding: CapFinding, versionId: string | null) {
  const versions = [...finding.corrective_actions].sort((a, b) => b.version_no - a.version_no);
  return { latest: versions[0] ?? null, selected: versionId ? versions.find((item) => item.id === versionId) ?? null : versions[0] ?? null, versions };
}
