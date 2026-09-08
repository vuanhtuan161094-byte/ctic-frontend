// Imported only by the DEV entry. All requests, including writes, stop at this adapter.
import { AxiosError, type AxiosAdapter } from "axios";
import { useEffect, useState } from "react";
import { api, type AuthSession } from "../../lib/api";
import { DashboardShell } from "../DashboardShell";
import type { TechnicalReviewWorkspace } from "../TechnicalReviewWorkspaceModal";
import { DEV_CERTIFICATION_CASE_WORKSPACE } from "../certification-case/dev-certification-case-fixture";

const QA_KEY = "cmp-review-isolated-qa";
const entry = new URLSearchParams(location.search);
const isEntry = location.pathname === "/__dev/technical-review-workspace";
if (isEntry) sessionStorage.setItem(QA_KEY, entry.get("actor") || "assigned");
const mode = sessionStorage.getItem(QA_KEY) || "assigned";
const session: AuthSession = {
  access_token: "isolated-fixture-not-a-credential",
  user: { id: "qa-reviewer", username: "qa-reviewer", roles: [mode === "customer" ? "CUSTOMER" : mode === "coordinator" ? "COORDINATOR" : mode === "admin" ? "ADMIN" : "TECHNICAL_REVIEWER"] },
};
const requests: string[] = [];
const caseData = structuredClone(DEV_CERTIFICATION_CASE_WORKSPACE);
const criteria = {
  preliminary: [{ key: "p1", label: "Hồ sơ đăng ký và phạm vi chứng nhận phù hợp với báo cáo đánh giá" }, { key: "p2", label: "Đủ hồ sơ và bằng chứng đánh giá tại các địa điểm" }],
  technical: [{ key: "t1", label: "Kết luận đánh giá được hỗ trợ bởi bằng chứng khách quan" }, { key: "t2", label: "Hành động khắc phục đã được xác nhận hiệu lực" }],
};
const data: TechnicalReviewWorkspace = {
  case_id: "dev-case-001",
  plan: { id: "dev-plan-001", plan_code: "KH-MAU-2026-0108", project_code: "HS-MAU-2026-0042", organization_name: "Công ty Cổ phần Giải pháp Công nghiệp Xanh và Chuỗi Cung ứng Miền Đông Nam Bộ", standard_name: "ISO 9001:2015 · ISO 14001:2015 · ISO 45001:2018", planned_start_date: "2026-09-01", planned_end_date: "2026-09-04" },
  report: { id: "dev-report-001", report_code: "BC-MAU-2026-0042", status: "submitted", version_no: 2 },
  can_start: mode !== "blockers", can_assign: mode === "coordinator", can_perform: ["assigned", "blockers", "complete-denied"].includes(mode), assignment_status: "ASSIGNED",
  current_assignment: { id: "qa-assignment", due_at: "2026-09-12" },
  assignment_history: [{ id: "qa-assignment", status: "CURRENT", assigned_at: "2026-09-05", due_at: "2026-09-12", reviewer: { full_name: "Chuyên gia Thẩm xét Mẫu" }, note: "Thẩm xét độc lập theo phạm vi được phân công." }],
  eligibility_errors: mode === "blockers" ? ["Hành động khắc phục chưa hoàn tất."] : [],
  criteria,
  review: {
    id: "dev-tech-review-001", report_id: "dev-report-001", reviewer_id: "qa-reviewer", status: "pending", reviewer: { id: "qa-reviewer", full_name: "Chuyên gia Thẩm xét Mẫu" },
    form_data: {
      review_items: ["Báo cáo đánh giá tích hợp tại các địa điểm", "Hồ sơ hành động khắc phục và xác nhận hiệu lực"].map((name, index) => ({
        item_no: index + 1, document_key: `qa-document-${index + 1}`, document_name: name, status: mode === "blockers" ? "pending" : "accepted", required: true,
        reviewer_comment: "Bằng chứng đáp ứng yêu cầu thẩm xét.", files: mode === "blockers" ? [] : [{ id: `qa-pdf-${index}`, original_name: `Ho-so-chinh-thuc-${index + 1}.pdf`, file_kind: "signed_scan", mime_type: "application/pdf" }],
      })),
      f11: {
        review_date: "2026-09-07", audit_language: "Tiếng Việt",
        preliminary_criteria: criteria.preliminary.map((item) => ({ ...item, result: mode === "blockers" ? "pending" : "yes", comment: "Đã kiểm tra hồ sơ." })),
        technical_criteria: criteria.technical.map((item) => ({ ...item, result: mode === "blockers" ? "pending" : "yes", comment: "Đã đối chiếu bằng chứng." })),
        preliminary_other_comment: "", technical_other_comment: "", recommendation: "certification_recommended", recommendation_comment: "Đề nghị chứng nhận theo phạm vi đã đánh giá.", conditions: "",
      },
    },
  },
  document_history: [{ id: "qa-f11-v2", original_name: "F11-Tham-xet-phien-ban-2.pdf", file_kind: "generated_pdf", version_no: 2, is_current: true, created_at: "2026-09-07" }, { id: "qa-f11-v1", original_name: "F11-Tham-xet-phien-ban-1.pdf", file_kind: "generated_pdf", version_no: 1, is_current: false, created_at: "2026-09-05" }],
};
const assignedReview = structuredClone(data.review!);
if (mode === "coordinator") { data.review = null; data.assignment_status = "UNASSIGNED"; data.current_assignment = undefined; data.assignment_history = []; }
if (mode === "mismatch") data.case_id = "other-case";
if (mode === "empty") caseData.cycles = [];
let failing = mode === "error";
const adapter: AxiosAdapter = async (config) => {
  const url = config.url || "";
  const method = (config.method || "get").toUpperCase();
  const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
  requests.push(`${method} ${url}${body ? ` ${JSON.stringify(body)}` : ""}`);
  window.dispatchEvent(new Event("cmp:review-qa-request"));
  const response = (value: unknown, status = 200) => ({ data: structuredClone(value), status, statusText: String(status), headers: {}, config });
  const fail = (status: number, message: string) => { throw new AxiosError(message, "ERR_BAD_RESPONSE", config, null, response({ message }, status)); };
  if (url === "/auth/me") return response({ user: { ...session.user, permissions: ["projects.read", "technical_reviews.read", "technical_reviews.perform", "technical_review.assign", "customer_portal.access"] } });
  if (url === "/customer-portal/me/dashboard") return response({ customers: [], summary: { applications: 0, active_projects: 0, open_corrective_actions: 0, active_certificates: 0, unread_notifications: 0 }, upcoming_audits: [] });
  if (url === "/me/workspace") return response({ work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 }, priority_work_items: [], recent_records: [], role_kpis: [], calendar_items: [] });
  if (url.includes("/notifications")) return response({ items: [], summary: { unread: 0 }, unread_count: 0 });
  if (url.includes("/certification-cases/") && url.endsWith("/workspace")) {
    if (mode === "denied") return fail(403, "Forbidden");
    if (failing) return fail(500, "QA server unavailable");
    return response(caseData);
  }
  if (url.endsWith("/case-workspace")) return response(data);
  if (url.endsWith("/candidates")) return response([{ id: "qa-reviewer", username: "qa-reviewer", full_name: "Chuyên gia Thẩm xét Mẫu", eligible: true, independent: true }]);
  if (url.endsWith("/preview")) return response({ document_key: "qa-document-1", document_name: "Báo cáo đánh giá tích hợp", fields: [{ label: "Số báo cáo", value: "BC-MAU-2026-0042" }], files: [] });
  if (method !== "GET") {
    if (url.endsWith("/assign")) { data.review = structuredClone(assignedReview); data.assignment_status = "ASSIGNED"; return response(data); }
    if (url.endsWith("/reassign")) return response(data);
    if (url.endsWith("/workspace") && data.review?.form_data?.f11) Object.assign(data.review.form_data.f11, body);
    if (url.includes("/items/")) { const item = data.review?.form_data?.review_items?.find((item) => url.endsWith(`/${item.document_key}`)); if (item) Object.assign(item, body); }
    if (url.endsWith("/complete")) {
      if (mode === "complete-denied") return fail(400, "Phân công đã thay đổi; không thể hoàn tất thẩm xét.");
      if (data.review) { data.review.status = "completed"; data.review.completed_at = "2026-09-07T12:00:00+07:00"; }
      data.can_perform = false; data.can_assign = false;
    }
    if (url.includes("/f11/generate")) return response({ document: data.document_history[0] });
    if (!url.startsWith("/technical-reviews/")) return fail(501, `Unexpected QA write: ${method} ${url}`);
    return response(data);
  }
  if (url === "/dashboard/overview?warning_days=30") return response({});
  return response([]);
};
api.defaults.adapter = adapter;
if (isEntry) {
  const plan = entry.get("entry") === "direct" || mode === "empty" ? "" : `?audit_plan_id=dev-plan-001&technical_review_id=dev-tech-review-001&section=documents`;
  const path = mode === "coordinator" ? "/certifications/dev-case-001/technical-review?audit_plan_id=dev-plan-001" : `/certifications/dev-case-001/technical-review${plan}`;
  history.replaceState(null, "", entry.get("entry") === "legacy" ? "/projects/dev-case-001?workspace=technical-review&audit_plan_id=dev-plan-001&technical_review_id=dev-tech-review-001" : path);
}
export function DevTechnicalReviewWorkspace() {
  const [, update] = useState(0);
  useEffect(() => { const listener = () => update((value) => value + 1); window.addEventListener("cmp:review-qa-request", listener); return () => window.removeEventListener("cmp:review-qa-request", listener); }, []);
  return <><DashboardShell session={session} onLogout={() => { sessionStorage.removeItem(QA_KEY); location.href = "/"; }} /><aside style={{ padding: 16 }} aria-label="QA isolated API">
    <details><summary>QA API mô phỏng — không gửi dữ liệu thật</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{requests.join("\n")}</pre></details>
    {mode === "error" ? <button onClick={() => { failing = false; }}>QA khôi phục API</button> : null}
  </aside></>;
}
