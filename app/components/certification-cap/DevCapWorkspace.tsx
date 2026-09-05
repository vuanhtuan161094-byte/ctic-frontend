import { AxiosError, type AxiosAdapter } from "axios";
import { useEffect, useState } from "react";
import { api, type AuthSession } from "../../lib/api";
import { DashboardShell } from "../DashboardShell";
import { DEV_CERTIFICATION_AUDIT_CASE_WORKSPACE, DEV_AUDIT_EXECUTION_WORKSPACE, DEV_AUDIT_READINESS, DEV_AUDIT_DOCUMENTS } from "../certification-audit/dev-certification-audit-fixture";
import type { CapWorkspaceProjection } from "./cap-model";

const QA_KEY = "cmp-cap-isolated-qa";
const entry = new URLSearchParams(location.search);
if (location.pathname === "/__dev/cap-workspace") sessionStorage.setItem(QA_KEY, entry.get("actor") || "reviewer");
const mode = sessionStorage.getItem(QA_KEY) || "reviewer";
const customer = mode.startsWith("customer");
const session: AuthSession = { access_token: "isolated-fixture-not-a-credential", user: { id: "qa-user", username: "qa", roles: [customer ? "CUSTOMER" : "AUDITOR"] } };
const requests: string[] = [];
const data: CapWorkspaceProjection = {
  contract_version: "1.0", audience: customer ? "customer" : "internal",
  context: { case_id: "dev-case-001", audit_id: "dev-plan-001", plan_code: "KHĐG-MAU-2026", audit_type: "Đánh giá giám sát", project_code: "HS-2026-MAU", customer_name: "Công ty Cổ phần Giải pháp Chất lượng Việt Nam" },
  finding: { id: "dev-finding-001", finding_code: "NC-MAU-001", finding_type: "minor_nc", status: customer ? "revision_required" : "response_submitted",
    description: "Hồ sơ kiểm soát quá trình chưa đầy đủ bằng chứng xác nhận hiệu lực hành động khắc phục tại đơn vị.",
    objective_evidence: "Biên bản kiểm tra hồ sơ quá trình và kết quả phỏng vấn tại hiện trường.", clause: "10.2", requirement: "Lưu bằng chứng về hành động và kết quả khắc phục.",
    detected_date: "2026-09-01T12:00:00+07:00", due_date: "2026-10-01T12:00:00+07:00", is_overdue: false,
    corrective_actions: [
      { id: "dev-v2", version_no: 2, status: customer ? "revision_required" : "submitted", root_cause: "Nguyên nhân phiên bản 2", correction: "Bổ sung hồ sơ kiểm soát", corrective_action_plan: "Đào tạo và xác minh hiệu lực sau 30 ngày", responsible_person: "Phụ trách chất lượng", submitted_at: "2026-09-04T12:00:00+07:00", review_comment: customer ? "Bổ sung bằng chứng xác nhận hiệu lực." : null, evidence_files: [{ id: "e2", original_name: "Bang-chung-phien-ban-2.pdf", download_url: "/document-files/e2/download" }] },
      { id: "dev-v1", version_no: 1, status: "revision_required", root_cause: "Nguyên nhân phiên bản 1 — lịch sử bất biến", correction: "Sửa chữa bản 1", corrective_action_plan: "Kế hoạch bản 1", submitted_at: "2026-09-02T12:00:00+07:00", reviewed_at: "2026-09-03T12:00:00+07:00", review_comment: "Cần phân tích sâu nguyên nhân gốc rễ.", evidence_files: [{ id: "e1", original_name: "Bang-chung-phien-ban-1.pdf", download_url: "/document-files/e1/download" }] },
    ],
  },
  allowed_actions: { respond: customer || mode === "responder", review: mode === "reviewer", close: false, upload_evidence: mode !== "reader" },
};
if (mode === "reader") data.allowed_actions = { respond: false, review: false, close: false, upload_evidence: false };
if (mode === "responder") data.finding.status = "revision_required";
if (mode === "empty") data.finding.corrective_actions = [];
if (mode === "mismatch") data.context.case_id = "other-case";
if (mode === "closed") { data.finding.status = "closed"; data.finding.closed_at = "2026-09-05T12:00:00+07:00"; data.allowed_actions = { respond: false, review: false, close: false, upload_evidence: false }; }
const adapter: AxiosAdapter = async (config) => {
  const url = config.url || "";
  const method = (config.method || "get").toUpperCase();
  requests.push(`${method} ${url}`);
  window.dispatchEvent(new Event("cmp:qa-request"));
  const response = (body: unknown, status = 200) => ({ data: body, status, statusText: String(status), headers: {}, config });
  if (url.includes("/workspace") && url.includes("/audit-findings/")) {
    if (mode.includes("denied")) throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, null, response({ message: "Forbidden" }, 403));
    if (mode === "error") throw new AxiosError("Unavailable", "ERR_BAD_RESPONSE", config, null, response({}, 500));
    return response(structuredClone(data));
  }
  if (method !== "GET") {
    const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    if (url.startsWith("/audit-findings/") && url.includes("/corrective-actions") && method === "POST") {
      const next = { ...body, id: "dev-v3", version_no: 3, status: "submitted", submitted_at: "2026-09-05T12:00:00+07:00", evidence_files: [] };
      data.finding.corrective_actions.unshift(next); data.finding.status = "response_submitted"; data.allowed_actions.respond = false; data.allowed_actions.upload_evidence = true;
      return response(next);
    }
    if (url.endsWith("/review")) {
      data.finding.corrective_actions[0].status = body.review_result;
      data.finding.corrective_actions[0].review_comment = body.review_comment;
      data.finding.status = body.review_result === "accepted" ? "action_accepted" : "revision_required";
      data.allowed_actions.close = body.review_result === "accepted"; data.allowed_actions.review = false;
    }
    if (url.endsWith("/close")) { data.finding.status = "closed"; data.allowed_actions = { respond: false, review: false, close: false, upload_evidence: false }; }
    return response({ id: "fixture-result" });
  }
  if (url === "/auth/me") return response({ user: { ...session.user, permissions: ["projects.read", "customer_portal.access", "findings.manage", "documents.manage"] } });
  if (url === "/me/workspace") return response({ work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 }, priority_work_items: [], recent_records: [], role_kpis: [], calendar_items: [] });
  if (url.includes("/certification-cases/") && url.endsWith("/workspace")) return response(DEV_CERTIFICATION_AUDIT_CASE_WORKSPACE);
  if (url.startsWith("/audit-plans/")) return response(DEV_AUDIT_EXECUTION_WORKSPACE.plan);
  if (url.startsWith("/reports/plan/")) return response(DEV_AUDIT_EXECUTION_WORKSPACE.reports);
  if (url.startsWith("/audit-team-appointments/plan/")) return response(DEV_AUDIT_EXECUTION_WORKSPACE.appointment);
  if (url.endsWith("/readiness")) return response(DEV_AUDIT_READINESS);
  if (url.startsWith("/audit-documents/plan/")) return response(DEV_AUDIT_DOCUMENTS);
  if (url.startsWith("/audit-findings/report/")) return response([data.finding]);
  if (url.includes("/notifications")) return response({ items: [], summary: { unread: 0 }, unread_count: 0 });
  return response([]);
};
// DEV-only module, activated explicitly. Every api request is intercepted, including writes.
api.defaults.adapter = adapter;
if (location.pathname === "/__dev/cap-workspace") {
  history.replaceState(null, "", entry.get("entry") === "audit"
    ? "/certifications/dev-case-001/audits/dev-plan-001?section=findings"
    : customer ? "/portal/corrective-actions/dev-finding-001?case_id=dev-case-001"
      : "/certifications/dev-case-001/findings/dev-finding-001");
}
export function DevCapWorkspace() {
  const [, update] = useState(0);
  useEffect(() => { const listener = () => update((value) => value + 1); window.addEventListener("cmp:qa-request", listener); return () => window.removeEventListener("cmp:qa-request", listener); }, []);
  return <><DashboardShell session={session} onLogout={() => { sessionStorage.removeItem(QA_KEY); location.href = "/"; }} /><details style={{ padding: 16 }}><summary>QA API mô phỏng — không gửi dữ liệu thật</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{requests.join("\n")}</pre></details></>;
}
