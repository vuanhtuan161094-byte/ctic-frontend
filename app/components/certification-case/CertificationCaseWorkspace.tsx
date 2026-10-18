"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { message } from "antd";
import { useEffect, useState } from "react";

import { api, getErrorMessage } from "../../lib/api";
import { isPdfDocument, openDocumentFile, previewDocumentFile } from "../../lib/document-file-client";
import { CycleSelector, EmptyState, ErrorState, ForbiddenState, LoadingSkeleton } from "../design-system";
import "./certification-case.css";
import { CertificationCaseActivity } from "./CertificationCaseActivity";
import { CertificationCaseDocuments } from "./CertificationCaseDocuments";
import { CertificationCaseHeader } from "./CertificationCaseHeader";
import { CertificationCaseOverview } from "./CertificationCaseOverview";
import { CertificationCaseProgress } from "./CertificationCaseProgress";
import { CertificationCaseTeam } from "./CertificationCaseTeam";
import { cycleLabel, orderedCycles, selectedCycle } from "./case-model";
import type { CertificationCaseActivityPage, CertificationCaseArea, CertificationCaseProjectedFile, CertificationCaseWorkspaceProjection } from "./types";

const areaLabels: Record<CertificationCaseArea, string> = {
  overview: "Tổng quan",
  progress: "Tiến trình",
  team: "Nhóm & nguồn lực",
  documents: "Tài liệu",
  activity: "Hoạt động",
};

const areas = Object.keys(areaLabels) as CertificationCaseArea[];
export interface CertificationCaseWorkspaceViewProps {
  data: CertificationCaseWorkspaceProjection;
  area: CertificationCaseArea;
  selectedCycleKey?: string | null;
  refreshing?: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onNavigateArea: (area: CertificationCaseArea) => void;
  onCycleChange: (cycleKey: string) => void;
  onOpenCompatibility: (path: string) => void;
  onOpenAudit: (auditId: string) => void;
  onOpenFile: (file: CertificationCaseProjectedFile) => void;
  activity?: CertificationCaseActivityPage;
  activityLoading?: boolean;
  onLoadMoreActivity?: () => void;
}

export function CertificationCaseWorkspaceView({ data, area, selectedCycleKey, refreshing = false, onBack, onRefresh, onNavigateArea, onCycleChange, onOpenCompatibility, onOpenAudit, onOpenFile, activity = data.recent_activity, activityLoading = false, onLoadMoreActivity }: CertificationCaseWorkspaceViewProps) {
  const cycles = orderedCycles(data);
  const cycle = selectedCycle(data, selectedCycleKey);

  useEffect(() => {
    if (cycle && selectedCycleKey !== cycle.key) onCycleChange(cycle.key);
  }, [cycle, onCycleChange, selectedCycleKey]);

  const content = area === "progress"
    ? <CertificationCaseProgress data={data} cycle={cycle} onOpenAudit={onOpenAudit} onOpenPath={onOpenCompatibility} />
    : area === "team"
      ? <CertificationCaseTeam data={data} cycle={cycle} />
      : area === "documents"
        ? <CertificationCaseDocuments data={data} onOpenFile={onOpenFile} />
        : area === "activity"
          ? <CertificationCaseActivity activity={activity} loadingMore={activityLoading} onLoadMore={onLoadMoreActivity} />
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
            cycles={cycles.map((item) => ({ key: item.key, label: cycleLabel(item), sourceIds: item.plan_ids }))}
            value={cycle?.key}
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
  onOpenAudit: (auditId: string) => void;
}

export function CertificationCaseWorkspace({ caseId, area, selectedCycleKey, onBack, onNavigateArea, onCycleChange, onOpenCompatibility, onOpenAudit }: CertificationCaseWorkspaceProps) {
  const workspaceQuery = useQuery({
    queryKey: ["certification-case", caseId, "workspace-v2"],
    queryFn: async (): Promise<CertificationCaseWorkspaceProjection> => {
      const response = await api.get<CertificationCaseWorkspaceProjection>(`/certification-cases/${caseId}/workspace`);
      return response.data;
    },
    retry: false,
  });
  const [activity, setActivity] = useState<CertificationCaseActivityPage | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

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

  const openFile = async (file: CertificationCaseProjectedFile) => {
    try {
      const request = { url: `/document-files/${file.id}/download`, filename: file.original_name };
      if (isPdfDocument(file.original_name)) await previewDocumentFile({ ...request, title: file.original_name });
      else await openDocumentFile(request);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const loadMoreActivity = async () => {
    const current = activity ?? workspaceQuery.data.recent_activity;
    if (!current.page.next_cursor || activityLoading) return;
    setActivityLoading(true);
    try {
      const query = new URLSearchParams({ cursor: current.page.next_cursor, limit: String(current.page.limit) });
      if (selectedCycleKey) query.set("cycle", selectedCycleKey);
      const response = await api.get<CertificationCaseActivityPage>(`/certification-cases/${caseId}/activity?${query.toString()}`);
      setActivity({ ...response.data, items: [...current.items, ...response.data.items] });
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setActivityLoading(false);
    }
  };

  return (
    <CertificationCaseWorkspaceView
      data={workspaceQuery.data}
      area={area}
      selectedCycleKey={selectedCycleKey}
      refreshing={workspaceQuery.isFetching}
      onBack={onBack}
      onRefresh={() => { setActivity(null); void workspaceQuery.refetch(); }}
      onNavigateArea={onNavigateArea}
      onCycleChange={onCycleChange}
      onOpenCompatibility={onOpenCompatibility}
      onOpenAudit={onOpenAudit}
      onOpenFile={(file) => void openFile(file)}
      activity={activity ?? workspaceQuery.data.recent_activity}
      activityLoading={activityLoading}
      onLoadMoreActivity={() => void loadMoreActivity()}
    />
  );
}
