// Controlled QA only: every API call terminates here, including writes.
import { AxiosError, type AxiosAdapter } from "axios";
import { useEffect, useState } from "react";
import { api, type AuthSession } from "../../lib/api";
import { DashboardShell } from "../DashboardShell";
import CertificateIssuanceWorkspaceModal from "../CertificateIssuanceWorkspaceModal";
const key = "cmp-certificate-isolated-qa";
const entry = location.pathname === "/__dev/certificate-workspace";
if (entry) sessionStorage.setItem(key, new URLSearchParams(location.search).get("actor") || "issuer");
const mode = sessionStorage.getItem(key) || "issuer";
const issuance = ["pending", "amend", "recertify", "submit-denied"].includes(mode);
const roles: Record<string, string[]> = { admin: ["ADMIN"], readonly: ["STAFF"], reviewer: ["TECHNICAL_REVIEWER"], auditor: ["AUDITOR"], customer: ["CUSTOMER"] };
const session: AuthSession = { access_token: "isolated-fixture-not-a-credential", user: { id: "qa-issuer", username: "qa-issuer", roles: roles[mode] || ["DECISION_MAKER"] } };
const requests: string[] = [];
const record = (id: string, version: number, status: string) => ({ id, verification_code: `qa-verification-${version}`, technical_review_id: `qa-review-${version}`, certificate_series_id: "qa-series", cert_number: `CTIC-MAU-2026-0042-V${version}`, version_no: version, status,
  organization_name: "Công ty Cổ phần Công nghiệp Xanh và Giải pháp Chuỗi Cung ứng Miền Đông Nam Bộ", organization_address: "Khu Công nghiệp Mẫu, Thành phố Hồ Chí Minh", standard_name: "ISO 9001:2015 · ISO 14001:2015", management_system: "Hệ thống quản lý tích hợp", certification_scope: version === 1 ? "Phạm vi lịch sử: sản xuất thiết bị tại nhà máy A" : "Sản xuất, lắp ráp và cung cấp thiết bị công nghiệp tại nhà máy A và trung tâm dịch vụ B", issue_date: "2026-09-10", expire_date: "2029-09-09", change_reason: "Theo quyết định có thẩm quyền", site_snapshot_json: JSON.stringify([{ site_name: `Nhà máy ${version === 1 ? "A" : "A và B"}`, address: "Địa chỉ địa điểm đã phê duyệt" }]), created_at: "2026-09-10", updated_at: "2026-09-10" });
const state = ["suspended", "withdrawn", "expired"].includes(mode) ? mode : "active";
const versions = [record("qa-cert-2", 2, state), record("qa-cert-1", 1, "replaced")];
const documents = versions.map(cert => ({ id: `pdf-${cert.id}`, entity_id: cert.id, document_type: "certificate_pdf", file_kind: "signed_scan", original_name: `Chung-chi-V${cert.version_no}.pdf`, version_no: 1, mime_type: "application/pdf", is_current: true, created_at: "2026-09-10" }));
let failing = mode === "error";
let issued = false;
function workspace(id: string) {
  const cert = issuance && issued ? versions[0] : versions.find(item => item.id === id)!;
  const valid = cert.status === "active";
  return { case_id: mode === "mismatch" ? "other-case" : "qa-case", certificate_id: id, is_historical: cert.id !== versions[0].id, can_upload_pdf: cert.id === versions[0].id && ["issuer", "submit-denied"].includes(mode), versions_truncated: false,
    plan: { id: "qa-plan", project_id: "qa-case", project_code: "HS-MAU-0042", plan_code: "KH-MAU-0042" }, report: { id: "qa-report", report_code: "BC-MAU-0042", status: "technical_review_completed", version_no: 1 }, technical_review: { id: "qa-review", status: "completed" },
    decision: { ...versions[0], id: "qa-decision", decision_number: "QD-MAU-0042", decision_date: "2026-09-10", decision_type: mode === "recertify" ? "RECERTIFY" : mode === "amend" ? "AMEND" : "GRANT", decision_result: "approved", status: "issued" },
    notification: { id: "qa-notification", notification_number: "TB-MAU-0042", status: "sent", notification_result: "certification_granted" },
    certificate: issuance && !issued ? null : cert, current_certificate: mode === "pending" && !issued ? null : versions[0], current_series: { id: "qa-series", series_code: "SER-MAU-0042", status: "active" },
    version_timeline: versions.map(item => ({ ...item, is_current: item.id === versions[0].id, official_pdf_available: documents.some(file => file.entity_id === item.id), documents: documents.filter(file => file.entity_id === item.id), certification_decision: { decision_type: item.version_no === 1 ? "GRANT" : mode === "recertify" && item.version_no === 3 ? "RECERTIFY" : "AMEND", decision_number: "QD-MAU", decision_date: "2026-09-10" } })),
    documents: documents.filter(file => file.entity_id === cert.id), history: [{ id: "qa-history", from_status: "active", to_status: state, reason: "Nguồn quyết định mô phỏng", effective_date: "2026-09-10", created_at: "2026-09-10", certification_decision: { decision_number: "QD-MAU", decision_type: state === "suspended" ? "SUSPEND" : state === "withdrawn" ? "WITHDRAW" : "RESTORE" } }], status_history: [],
    public_verification: { available: true, is_valid: valid, path: `/public/certificates/${cert.verification_code}`, pdf_path: valid ? `/public/certificates/${cert.verification_code}/pdf` : null, qr_path: `/public/certificates/${cert.verification_code}/qr` },
    allowed_status_actions: [], can_issue_status_decision: false, can_issue_certificate: issuance && !issued, requires_certificate_issuance: issuance, maintains_current_certificate: false, eligibility_errors: [],
    issuance_preview: { previous_version: mode === "pending" ? null : versions[0], proposed_version: { ...versions[0], version_no: 3 } }, defaults: { cert_number: "CTIC-SERVER-PROPOSAL", issue_date: "2026-09-10", expire_date: "2029-09-09", change_reason: "Thay đổi theo quyết định" } };
}
const adapter: AxiosAdapter = async config => {
  const url = config.url || "", method = (config.method || "get").toUpperCase();
  requests.push(`${method} ${url}`); window.dispatchEvent(new Event("cmp:certificate-qa"));
  const response = (data: unknown, status = 200) => ({ data: structuredClone(data), status, statusText: String(status), headers: {}, config });
  const fail = (status: number) => { throw new AxiosError("qa-certificate-denied", "ERR_BAD_RESPONSE", config, null, response({ message: "Yêu cầu mô phỏng không được phép" }, status)); };
  if (url === "/auth/me") return response({ user: { ...session.user, permissions: ["projects.read", "certificates.read", "certificates.manage", "customer_portal.access"] } });
  if (url === "/me/workspace") return response({ work_summary: { open: 0 }, priority_work_items: [], recent_records: [], role_kpis: [], calendar_items: [] });
  if (url.includes("notifications")) return response({ items: [], unread_count: 0, summary: { unread: 0 } });
  if (url === "/customer-portal/me/dashboard") return response({ customers: [], summary: {}, upcoming_audits: [] });
  if (url === "/customer-portal/me/certificates") return response(versions.map(cert => ({ ...cert, series_code: "SER-MAU", project: { id: "qa-case" }, official_pdf_available: true, public_verification_path: `/public/certificates/${cert.verification_code}`, public_pdf_path: cert.status === "active" ? `/public/certificates/${cert.verification_code}/pdf` : null })));
  if (url.endsWith("/case-workspace")) {
    if (["denied", "reviewer", "auditor"].includes(mode)) return fail(403); if (failing) return fail(500); if (mode === "missing") return fail(404);
    return response(workspace(url.includes("qa-cert-1") ? "qa-cert-1" : "qa-cert-2"));
  }
  if (url === "/certificates/plan/qa-plan/workspace") return response(workspace("qa-cert-2"));
  if (method !== "GET") {
    if (mode === "submit-denied") return fail(403);
    if (url === "/certificates" && issuance) {
      const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      versions[0].status = "replaced";
      versions.unshift({ ...record("qa-cert-3", 3, "active"), ...body });
      issued = true; return response(versions[0]);
    }
    return fail(501);
  }
  if (url.startsWith("/document-files/")) return response(new Blob(["%PDF-1.4\n% controlled QA document, no business content\n%%EOF"], { type: "application/pdf" }));
  return response([]);
};
api.defaults.adapter = adapter;
if (entry && !issuance) history.replaceState(null, "", mode === "customer" ? "/portal/certificates" : `/certifications/qa-case/certificates/${mode === "historical" ? "qa-cert-1" : "qa-cert-2"}`);
export function DevCertificateWorkspace() {
  const [, update] = useState(0);
  useEffect(() => { const listener = () => update(value => value + 1); window.addEventListener("cmp:certificate-qa", listener); return () => window.removeEventListener("cmp:certificate-qa", listener); }, []);
  return <>{issuance ? <CertificateIssuanceWorkspaceModal open planId="qa-plan" roles={["DECISION_MAKER"]} onClose={() => { location.href = "/__dev/certificate-workspace"; }} /> : <DashboardShell session={session} onLogout={() => { sessionStorage.removeItem(key); location.href = "/"; }} />}
    <aside style={{ padding: 16 }}><details><summary>QA Certificate mô phỏng — không gửi dữ liệu thật</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{requests.join("\n")}</pre></details>{mode === "error" ? <button onClick={() => { failing = false; }}>QA khôi phục API</button> : null}</aside></>;
}
