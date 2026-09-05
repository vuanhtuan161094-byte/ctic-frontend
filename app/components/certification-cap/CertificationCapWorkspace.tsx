import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "../../lib/api";
import CorrectiveActionWorkspaceModal from "../CorrectiveActionWorkspaceModal";
import { EmptyState, ErrorState, ForbiddenState, LoadingSkeleton } from "../design-system";
import { capContextMatches, type CapSection, type CapWorkspaceProjection } from "./cap-model";

interface Props {
  caseId: string | null; findingId: string; customerMode: boolean; roles: string[];
  section: CapSection; versionId: string | null;
  onSection: (section: CapSection) => void; onVersion: (id: string | null) => void;
  onOpenPath: (path: string) => void;
}
export function CertificationCapWorkspace({ caseId, findingId, customerMode, roles, section, versionId, onSection, onVersion, onOpenPath }: Props) {
  const query = useQuery({
    queryKey: ["cap-workspace-v2", customerMode, caseId, findingId], retry: false,
    queryFn: async () => (await api.get<CapWorkspaceProjection>(`/audit-findings/${encodeURIComponent(findingId)}/workspace`, { params: caseId ? { case_id: caseId } : undefined })).data,
  });
  const exit = { label: "Về danh sách", onAction: () => onOpenPath(customerMode ? "/portal/corrective-actions" : "/certifications") };
  if (query.isLoading) return <LoadingSkeleton variant="detail" rows={12} />;
  if (query.isError) {
    const status = isAxiosError(query.error) ? query.error.response?.status : null;
    if (status === 403) return <ForbiddenState exit={exit} />;
    if (status === 404) return <EmptyState title="Nội dung không khả dụng" action={exit} />;
    return <ErrorState retry={{ label: "Thử lại", onAction: () => void query.refetch() }} />;
  }
  const data = query.data;
  if (!data || !capContextMatches(data, caseId, findingId) || (data.audience === "customer") !== customerMode) return <ForbiddenState exit={exit} />;
  return <CorrectiveActionWorkspaceModal
    key={`${customerMode}:${data.context.case_id}:${findingId}`}
    open planId={data.context.audit_id} initialFindingId={findingId} roles={roles}
    onClose={exit.onAction} onChanged={async () => { await query.refetch(); }}
    page={{ data, section, versionId, onSection, onVersion, onOpenPath }}
  />;
}
