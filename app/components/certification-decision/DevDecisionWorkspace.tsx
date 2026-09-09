// DEV-only controlled QA: every request terminates locally, including all writes.
import { AxiosError, type AxiosAdapter } from "axios";
import { useEffect, useState } from "react";
import { api, type AuthSession } from "../../lib/api";
import { DashboardShell } from "../DashboardShell";
import { DEV_CERTIFICATION_CASE_WORKSPACE } from "../certification-case/dev-certification-case-fixture";
const QA_KEY = "cmp-decision-isolated-qa";
const entry = new URLSearchParams(location.search);
const isEntry = location.pathname === "/__dev/decision-workspace";
if (isEntry) sessionStorage.setItem(QA_KEY, entry.get("actor") || "assigned");
const mode = sessionStorage.getItem(QA_KEY) || "assigned";
const roles: Record<string, string[]> = { admin: ["ADMIN"], reviewer: ["TECHNICAL_REVIEWER"], auditor: ["AUDITOR"], coordinator: ["COORDINATOR"], customer: ["CUSTOMER"] };
const session: AuthSession = { access_token: "isolated-fixture-not-a-credential", user: { id: "qa-dm", username: "qa-dm", roles: roles[mode] ?? ["DECISION_MAKER"] } };
const requests: string[] = [];
const caseData = structuredClone(DEV_CERTIFICATION_CASE_WORKSPACE);
if (mode === "empty") caseData.cycles = [];
if (["surveillance", "suspended", "recertification"].includes(mode)) {
  caseData.cycles[0].type = mode === "recertification" ? "recertification" : "surveillance1";
  caseData.cycles[0].key = mode === "recertification" ? "recertification" : "surveillance-1";
}
const types = mode === "surveillance" ? ["MAINTAIN", "AMEND", "EXTEND_SCOPE", "REDUCE_SCOPE", "SUSPEND", "WITHDRAW", "REFUSE"] : mode === "recertification" ? ["RECERTIFY", "REFUSE"] : mode === "suspended" ? ["RESTORE", "WITHDRAW", "REFUSE"] : ["GRANT", "REFUSE"];
const certificate = ["surveillance", "recertification", "suspended"].includes(mode) ? { id: "qa-cert", certificate_series_id: "qa-series", cert_number: "CTIC-2024-0123", version_no: 1, status: mode === "suspended" ? "suspended" : "active", standard_name: "ISO 9001:2015", certification_scope: "Sản xuất và cung cấp thiết bị công nghiệp", expire_date: "2027-09-09" } : null;
const data = {
  case_id: mode === "mismatch" ? "other-case" : "dev-case-001",
  plan: { id: "dev-plan-001", project_id: "dev-case-001", project_code: "HS-MAU-2026-0042", plan_code: "KH-MAU-2026-0108", audit_type: mode === "recertification" ? "Tái chứng nhận" : certificate ? "Giám sát" : "Giai đoạn 2", planned_start_date: "2026-09-01", planned_end_date: "2026-09-04" },
  lifecycle_type: mode === "recertification" ? "recertification" : certificate ? "surveillance" : "initial", is_surveillance: Boolean(certificate && mode !== "recertification"),
  allowed_decision_types: types, current_status: certificate?.status ?? null, allowed_status_actions: [],
  certificate_series: certificate ? [{ id: "qa-series", series_code: "CTIC-2024-0123", status: certificate.status, current_certificate: certificate, allowed_status_actions: [] }] : [],
  current_certificate: certificate, active_certificate: certificate,
  report: { id: "qa-report", report_code: "BC-MAU-2026-0042", status: "technical_review_completed", audit_start_date: "2026-09-01", audit_end_date: "2026-09-04" },
  technical_review: { id: "qa-review", status: mode === "blockers" ? "pending" : "completed", completed_at: mode === "blockers" ? null : "2026-09-07", reviewer_name: "Chuyên gia Thẩm xét Mẫu", recommendation: "certification_recommended", recommendation_comment: "Đề nghị chứng nhận theo phạm vi đã đánh giá và bằng chứng đã xác nhận.", conditions: "Không có điều kiện bổ sung trong hồ sơ mẫu." },
  decision: null as Record<string, unknown> | null, decision_history: [] as Record<string, unknown>[],
  supporting_documents: [{ id: "qa-f11", original_name: "F11-Tham-xet-ho-so-mau.pdf", file_kind: "generated_pdf", version_no: 2, is_current: true, created_at: "2026-09-07" }],
  can_issue_decision: !["admin", "reviewer", "auditor", "coordinator", "readonly", "conflict", "blockers"].includes(mode),
  can_generate_decision: ["assigned", "admin"].includes(mode), independence: mode === "conflict" ? "CONFLICT" : roles[mode] || mode === "readonly" ? "NOT_CHECKED" : "CONFIRMED",
  assignment_basis: "DECISION_MAKER_ROLE", eligibility_errors: mode === "blockers" ? ["Hồ sơ thẩm xét kỹ thuật chưa hoàn thành."] : [], upstream_errors: mode === "blockers" ? ["Còn 1 NC chưa được đóng"] : [],
  notification: null, notification_history: [], can_issue_notification: false,
  defaults: { organization_name: "Công ty Cổ phần Giải pháp Công nghiệp Xanh và Chuỗi Cung ứng Miền Đông Nam Bộ", organization_address: "Khu Công nghiệp Mẫu, Thành phố Hồ Chí Minh", standard_name: "ISO 9001:2015 · ISO 14001:2015", management_system: "Hệ thống quản lý tích hợp", certification_scope: "Sản xuất, lắp ráp và cung cấp thiết bị công nghiệp tại các địa điểm thuộc phạm vi đánh giá", decision_number: "QD-MAU-2026-0042", decision_date: "2026-09-09", effective_date: "2026-09-09", expiry_date: "2029-09-08", surveillance_interval_months: 12, signatory_name: "Người ký Mẫu", signatory_title: "Tổng Giám đốc" },
};
let failing = mode === "error";
const adapter: AxiosAdapter = async config => {
  const url = config.url || ""; const method = (config.method || "get").toUpperCase();
  const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
  requests.push(`${method} ${url}${body ? ` ${JSON.stringify(body)}` : ""}`); window.dispatchEvent(new Event("cmp:decision-qa-request"));
  const response = (value: unknown, status = 200) => ({ data: structuredClone(value), status, statusText: String(status), headers: {}, config });
  const fail = (status: number, message: string) => { throw new AxiosError(message, "ERR_BAD_RESPONSE", config, null, response({ message }, status)); };
  if (url === "/auth/me") return response({ user: { ...session.user, permissions: ["projects.read", "certification_decisions.read", "certification_decisions.issue", "customer_portal.access"] } });
  if (url === "/customer-portal/me/dashboard") return response({ customers: [], summary: { applications: 0, active_projects: 0, open_corrective_actions: 0, active_certificates: 0, unread_notifications: 0 }, upcoming_audits: [] });
  if (url === "/me/workspace") return response({ work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 }, priority_work_items: [], recent_records: [], role_kpis: [], calendar_items: [] });
  if (url.includes("/notifications")) return response({ items: [], summary: { unread: 0 }, unread_count: 0 });
  if (url.includes("/certification-cases/") && url.endsWith("/workspace")) {
    if (mode === "denied") return fail(403, "Forbidden"); if (failing) return fail(500, "Controlled Decision server unavailable"); return response(caseData);
  }
  if (url.endsWith("/case-workspace")) { if (["auditor", "coordinator"].includes(mode)) return fail(403, "Forbidden"); return response(data); }
  if (method !== "GET") {
    if (url === "/certification-decisions") {
      if (mode === "submit-denied" || !data.can_issue_decision) return fail(403, "qa-decision-denied: Quyền ban hành đã thay đổi; vui lòng tải lại hồ sơ.");
      data.decision = { id: "qa-decision", ...body, status: "issued", lifecycle: { requires_certificate_version: true, preserves_current_certificate: false } };
      data.can_issue_decision = false; return response(data.decision);
    }
    if (url.startsWith("/certification-results/decision/qa-decision/generate")) { data.decision_history = [{ id: "qa-f13", original_name: "F13-Quyet-dinh-mau.pdf", file_kind: "generated_pdf", version_no: 1, is_current: true, created_at: "2026-09-09" }]; return response({ document: data.decision_history[0] }); }
    return fail(501, `Unexpected controlled write: ${method} ${url}`);
  }
  return response([]);
};
api.defaults.adapter = adapter;
if (isEntry) {
  const query = entry.get("entry") === "direct" || mode === "empty" ? "" : "?audit_plan_id=dev-plan-001&technical_review_id=qa-review&section=overview";
  history.replaceState(null, "", entry.get("entry") === "legacy" ? "/projects/dev-case-001?workspace=certification-decision&audit_plan_id=dev-plan-001&technical_review_id=qa-review" : `/certifications/dev-case-001/decision${query}`);
}
export function DevDecisionWorkspace() {
  const [, update] = useState(0);
  useEffect(() => { const listener = () => update(value => value + 1); window.addEventListener("cmp:decision-qa-request", listener); return () => window.removeEventListener("cmp:decision-qa-request", listener); }, []);
  return <><DashboardShell session={session} onLogout={() => { sessionStorage.removeItem(QA_KEY); location.href = "/"; }} /><aside style={{ padding: 16 }} aria-label="QA isolated Decision API"><details><summary>QA API mô phỏng — không gửi dữ liệu thật</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{requests.join("\n")}</pre></details>{mode === "error" ? <button onClick={() => { failing = false; }}>QA khôi phục API</button> : null}</aside></>;
}
