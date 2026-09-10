import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "../../lib/api";
import CertificateIssuanceWorkspaceModal from "../CertificateIssuanceWorkspaceModal";
import type { CertificatePageData } from "./CertificateResourcePage";
import { EmptyState, ErrorState, ForbiddenState, LoadingSkeleton } from "../design-system";

export function certificateContextMatches(data: CertificatePageData, caseId: string, certificateId: string) {
  return data.case_id === caseId && data.plan.project_id === caseId && data.certificate_id === certificateId && data.certificate?.id === certificateId;
}
export function CertificationCertificateWorkspace({ caseId, certificateId, roles, onOpenPath }: { caseId: string; certificateId: string; roles: string[]; onOpenPath: (path: string) => void }) {
  const query = useQuery({ queryKey: ["certificate-case-workspace", caseId, certificateId], retry: false,
    queryFn: async () => (await api.get<CertificatePageData>(`/certificates/${encodeURIComponent(certificateId)}/case-workspace`, { params: { case_id: caseId } })).data });
  const exit = { label: "Về hồ sơ chứng nhận", onAction: () => onOpenPath("/certifications") };
  if (query.error) {
    const status = isAxiosError(query.error) ? query.error.response?.status : null;
    if (status === 403 || status === 400) return <ForbiddenState exit={exit} />;
    if (status === 404) return <EmptyState title="Chứng chỉ không khả dụng" action={exit} />;
    return <ErrorState retry={{ label: "Thử lại", onAction: () => { void query.refetch(); } }} />;
  }
  if (query.isLoading) return <LoadingSkeleton variant="detail" rows={12} />;
  if (!query.data || !certificateContextMatches(query.data, caseId, certificateId)) return <ForbiddenState exit={exit} />;
  return <CertificateIssuanceWorkspaceModal key={`${caseId}:${certificateId}`} open planId={query.data.plan.id} roles={roles}
    onClose={exit.onAction} onChanged={async () => { await query.refetch(); }} page={{ data: query.data, onOpenPath }} />;
}
