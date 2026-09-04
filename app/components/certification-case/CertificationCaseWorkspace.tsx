"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { message } from "antd";
import { useEffect } from "react";

import { api, getErrorMessage } from "../../lib/api";
import { isPdfDocument, openDocumentFile, previewDocumentFile } from "../../lib/document-file-client";
import { CycleSelector, EmptyState, ErrorState, ForbiddenState, LoadingSkeleton } from "../design-system";
import { CertificationCaseActivity } from "./CertificationCaseActivity";
import { CertificationCaseDocuments } from "./CertificationCaseDocuments";
import { CertificationCaseHeader } from "./CertificationCaseHeader";
import { CertificationCaseOverview } from "./CertificationCaseOverview";
import { CertificationCaseProgress } from "./CertificationCaseProgress";
import { CertificationCaseTeam } from "./CertificationCaseTeam";
import { cycleLabel, orderedCycles, selectedCycle } from "./case-model";
import type { CertificationCaseAlerts, CertificationCaseArea, CertificationCaseDetail, CertificationCaseDossier, CertificationCaseFile, CertificationCaseWorkspaceData } from "./types";

const areaLabels: Record<CertificationCaseArea, string> = {
  overview: "Tổng quan",
  progress: "Tiến trình",
  team: "Nhóm & nguồn lực",
  documents: "Tài liệu",
  activity: "Hoạt động",
};

const areas = Object.keys(areaLabels) as CertificationCaseArea[];

export interface CertificationCaseWorkspaceViewProps {
  data: CertificationCaseWorkspaceData;
  area: CertificationCaseArea;
  selectedCycleKey?: string | null;
  refreshing?: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onNavigateArea: (area: CertificationCaseArea) => void;
  onCycleChange: (cycleKey: string) => void;
  onOpenCompatibility: (path: string) => void;
  onOpenFile: (file: CertificationCaseFile) => void;
}

export function CertificationCaseWorkspaceView({ data, area, selectedCycleKey, refreshing = false, onBack, onRefresh, onNavigateArea, onCycleChange, onOpenCompatibility, onOpenFile }: CertificationCaseWorkspaceViewProps) {
  const cycles = orderedCycles(data);
  const cycle = selectedCycle(data, selectedCycleKey);

  useEffect(() => {
    if (cycle && selectedCycleKey !== cycle.dossier_key) onCycleChange(cycle.dossier_key);
  }, [cycle, onCycleChange, selectedCycleKey]);

  const content = area === "progress"
    ? <CertificationCaseProgress data={data} cycle={cycle} />
    : area === "team"
      ? <CertificationCaseTeam data={data} cycle={cycle} />
      : area === "documents"
        ? <CertificationCaseDocuments data={data} onOpenFile={onOpenFile} />
        : area === "activity"
          ? <CertificationCaseActivity data={data} />
          : <CertificationCaseOverview data={data} cycle={cycle} onNavigateArea={onNavigateArea} />;

  return (
    <main className="cmp-case-page cmp-case-workspace">
      <CertificationCaseHeader
        data={data}
        cycle={cycle}
        refreshing={refreshing}
        onBack={onBack}
        onRefresh={onRefresh}
        onOpenCompatibility={onOpenCompatibility}
      />

      <nav className="cmp-case-secondary-nav" aria-label="Khu vực hồ sơ chứng nhận">
        {areas.map((item) => (
          <button key={item} type="button" aria-current={area === item ? "page" : undefined} onClick={() => onNavigateArea(item)}>
            {areaLabels[item]}
          </button>
        ))}
      </nav>

      {cycles.length ? (
        <div className="cmp-case-cycle-bar">
          <span>Chu kỳ đang xem</span>
          <CycleSelector
            cycles={cycles.map((item) => ({ key: item.dossier_key, label: cycleLabel(item), sourceIds: item.plan_ids }))}
            value={cycle?.dossier_key}
            onChange={onCycleChange}
          />
        </div>
      ) : null}

      {content}
    </main>
  );
}

export interface CertificationCaseWorkspaceProps {
  caseId: string;
  area: CertificationCaseArea;
  selectedCycleKey?: string | null;
  onBack: () => void;
  onNavigateArea: (area: CertificationCaseArea) => void;
  onCycleChange: (cycleKey: string) => void;
  onOpenCompatibility: (path: string) => void;
}

export function CertificationCaseWorkspace({ caseId, area, selectedCycleKey, onBack, onNavigateArea, onCycleChange, onOpenCompatibility }: CertificationCaseWorkspaceProps) {
  const workspaceQuery = useQuery({
    queryKey: ["certification-project", caseId, "case-workspace-v2"],
    queryFn: async (): Promise<CertificationCaseWorkspaceData> => {
      const [projectResponse, dossierResponse, alertsResponse] = await Promise.all([
        api.get<CertificationCaseDetail>(`/certification-projects/${caseId}`),
        api.get<CertificationCaseDossier>(`/certification-projects/${caseId}/dossier`),
        api.get<CertificationCaseAlerts>(`/certification-projects/${caseId}/alerts?warning_days=90`),
      ]);
      return { project: projectResponse.data, dossier: dossierResponse.data, alerts: alertsResponse.data };
    },
    retry: false,
  });

  if (workspaceQuery.isLoading) return <LoadingSkeleton variant="detail" rows={12} />;
  if (isAxiosError(workspaceQuery.error) && workspaceQuery.error.response?.status === 403) {
    return <ForbiddenState exit={{ label: "Về danh sách hồ sơ", onAction: onBack }} />;
  }
  if (isAxiosError(workspaceQuery.error) && workspaceQuery.error.response?.status === 404) {
    return <EmptyState title="Không tìm thấy hồ sơ" description="Hồ sơ không tồn tại hoặc không còn khả dụng." action={{ label: "Về danh sách", onAction: onBack }} />;
  }
  if (workspaceQuery.isError || !workspaceQuery.data) {
    return <ErrorState description={getErrorMessage(workspaceQuery.error)} retry={{ label: "Thử lại", onAction: () => void workspaceQuery.refetch() }} />;
  }

  const openFile = async (file: CertificationCaseFile) => {
    try {
      const request = { url: `/document-files/${file.id}/download`, filename: file.original_name };
      if (isPdfDocument(file.original_name)) await previewDocumentFile({ ...request, title: file.original_name });
      else await openDocumentFile(request);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <CertificationCaseWorkspaceView
      data={workspaceQuery.data}
      area={area}
      selectedCycleKey={selectedCycleKey}
      refreshing={workspaceQuery.isFetching}
      onBack={onBack}
      onRefresh={() => void workspaceQuery.refetch()}
      onNavigateArea={onNavigateArea}
      onCycleChange={onCycleChange}
      onOpenCompatibility={onOpenCompatibility}
      onOpenFile={(file) => void openFile(file)}
    />
  );
}
