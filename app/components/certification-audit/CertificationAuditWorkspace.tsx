"use client";

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  FileDoneOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Alert, Button, Card, List, Space, Tag, Typography, message } from "antd";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { api, getErrorMessage } from "../../lib/api";
import { downloadDocumentFile } from "../../lib/document-file-client";
import AuditExecutionWorkspaceModal, {
  type AuditExecutionWorkspaceMode,
  type ExecutionWorkspace,
  loadAuditExecutionWorkspace,
} from "../AuditExecutionWorkspaceModal";
import type { AuditDocumentPreview } from "../AuditDocumentCenterModal";
import { CertificationCaseActivity } from "../certification-case/CertificationCaseActivity";
import { cycleLabel, formatCaseDate } from "../certification-case/case-model";
import type {
  CertificationCaseActivityPage,
  CertificationCaseProjectionCycle,
  CertificationCaseWorkspaceProjection,
} from "../certification-case/types";
import {
  Breadcrumb,
  DomainStatusBadge,
  EmptyState,
  EntitySummary,
  ErrorState,
  ForbiddenState,
  LoadingSkeleton,
  NextActionBar,
  PageHeader,
  ReadinessBlockerPanel,
  ReadOnlyState,
  SectionHeader,
  type ProjectedAction,
  type StructuredBlocker,
} from "../design-system";

import "./certification-audit.css";
import { auditAction, auditActionSections, auditBelongsToCase, auditExecutionAction, teamDateRange } from "./audit-model";

export type CertificationAuditSection =
  | "overview"
  | "team"
  | "plan"
  | "execution"
  | "findings"
  | "documents"
  | "activity";

export type CertificationAuditExecutionView = "report" | "complete";

export interface AuditTeamReadinessProjection {
  ready_to_issue: boolean;
  reasons: Array<{
    code: string;
    severity: "BLOCK" | "WARNING" | string;
    message: string;
  }>;
}

const sectionLabels: Record<CertificationAuditSection, string> = {
  overview: "Tổng quan",
  team: "Đoàn & ngày công",
  plan: "Kế hoạch",
  execution: "Thực hiện & báo cáo",
  findings: "Phát hiện/HĐKP",
  documents: "Tài liệu",
  activity: "Hoạt động",
};

const sections = Object.keys(sectionLabels) as CertificationAuditSection[];

const auditTypeLabels: Record<string, string> = {
  stage1: "Đánh giá Giai đoạn 1",
  initial_stage1: "Đánh giá Giai đoạn 1",
  stage2: "Đánh giá Giai đoạn 2",
  initial_stage2: "Đánh giá Giai đoạn 2",
  surveillance: "Đánh giá giám sát",
  surveillance1: "Đánh giá giám sát lần 1",
  surveillance2: "Đánh giá giám sát lần 2",
  recertification: "Đánh giá tái chứng nhận",
  special: "Đánh giá đặc biệt",
};

const teamRoleLabels: Record<string, string> = {
  team_leader: "Trưởng đoàn đánh giá",
  lead_auditor: "Trưởng đoàn đánh giá",
  auditor: "Chuyên gia đánh giá",
  technical_expert: "Chuyên gia kỹ thuật",
  observer: "Quan sát viên",
  trainee: "Chuyên gia tập sự",
  witness_evaluator: "Đánh giá viên chứng kiến",
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function auditTypeLabel(value?: string | null) {
  const key = normalize(value).replaceAll("-", "_");
  return auditTypeLabels[key] ?? value?.replaceAll("_", " ") ?? "Cuộc đánh giá";
}

function teamRoleLabel(value?: string | null) {
  return teamRoleLabels[normalize(value)] ?? value?.replaceAll("_", " ") ?? "Thành viên";
}

function assignmentStatusPresentation(value?: string | null) {
  const key = normalize(value).replaceAll("-", "_");
  const known: Record<string, { label: string; color: string }> = {
    confirmed: { label: "Đã xác nhận", color: "green" },
    pending_confirmation: { label: "Chờ xác nhận", color: "orange" },
  };
  return known[key] ?? { label: value?.replaceAll("_", " ") || "Chưa cập nhật", color: "default" };
}

function auditCycle(
  data: CertificationCaseWorkspaceProjection,
  auditId: string,
): CertificationCaseProjectionCycle | null {
  return data.cycles.find((cycle) => cycle.plan_ids.includes(auditId)) ?? null;
}

function readinessBlockers(
  workspace: ExecutionWorkspace,
  readiness?: AuditTeamReadinessProjection | null,
): StructuredBlocker[] {
  const blockers: StructuredBlocker[] = [];
  if (!workspace.appointment) {
    blockers.push({
      code: "TEAM_NOT_CONFIGURED",
      label: "Chưa có bố trí đoàn cho kế hoạch này",
      explanation: "Bố trí đoàn và ngày công tiếp tục được quản lý bởi workflow hiện hữu.",
      severity: "WARNING",
    });
  }
  if (workspace.appointment && !readiness) {
    blockers.push({ code: "READINESS_UNAVAILABLE", label: "Chưa xác nhận được điều kiện sẵn sàng của đoàn.", severity: "INFO" });
  } else if (readiness?.ready_to_issue === false && !readiness.reasons.length) {
    blockers.push({ code: "TEAM_NOT_READY", label: "Đoàn chưa đáp ứng điều kiện ban hành.", severity: "BLOCKING" });
  }
  for (const reason of readiness?.reasons ?? []) {
    blockers.push({
      code: reason.code,
      label: reason.message,
      severity: reason.severity === "BLOCK" ? "BLOCKING" : reason.severity === "WARNING" ? "WARNING" : "INFO",
    });
  }
  const gate = workspace.plan.stage2_lifecycle_gate;
  if (gate?.applicable && !gate.allowed) {
    blockers.push({
      code: gate.code || "STAGE1_GATE",
      label: "Chưa đủ điều kiện bắt đầu Giai đoạn 2",
      explanation: gate.message,
      severity: "BLOCKING",
    });
  }
  return blockers;
}

function planCompatibilityPath(
  caseId: string,
  auditId: string,
  workspace: string,
  cycleKey?: string | null,
) {
  const query = new URLSearchParams({ workspace, audit_plan_id: auditId });
  if (cycleKey) query.set("dossier_key", cycleKey);
  return `/projects/${encodeURIComponent(caseId)}?${query.toString()}`;
}

export interface CertificationAuditWorkspaceViewProps {
  caseId: string;
  auditId: string;
  data: CertificationCaseWorkspaceProjection;
  workspace: ExecutionWorkspace;
  readiness?: AuditTeamReadinessProjection | null;
  readinessError?: ReactNode;
  documents?: AuditDocumentPreview | null;
  documentsLoading?: boolean;
  documentsError?: ReactNode;
  activity?: CertificationCaseActivityPage | null;
  activityLoading?: boolean;
  activityError?: ReactNode;
  section: CertificationAuditSection;
  executionView: CertificationAuditExecutionView;
  executionContent?: ReactNode;
  refreshing?: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onNavigateSection: (section: CertificationAuditSection) => void;
  onNavigateExecutionView: (view: CertificationAuditExecutionView) => void;
  onOpenCompatibility: (path: string) => void;
  onOpenDocument?: (url: string, filename: string) => void;
  onLoadMoreActivity?: () => void;
}

export function CertificationAuditWorkspaceView({
  caseId,
  auditId,
  data,
  workspace,
  readiness,
  readinessError,
  documents,
  documentsLoading = false,
  documentsError,
  activity,
  activityLoading = false,
  activityError,
  section,
  executionView,
  executionContent,
  refreshing = false,
  onBack,
  onRefresh,
  onNavigateSection,
  onNavigateExecutionView,
  onOpenCompatibility,
  onOpenDocument,
  onLoadMoreActivity,
}: CertificationAuditWorkspaceViewProps) {
  const sectionNavigationRef = useRef<HTMLElement | null>(null);
  const plan = workspace.plan;
  const appointment = workspace.appointment;
  const reports = workspace.reports;
  const cycle = auditCycle(data, auditId);
  const serverAction = auditAction(data, auditId);
  const executionAuthorized = Boolean(auditExecutionAction(data, auditId));
  const teamDates = teamDateRange(appointment?.members ?? []);
  const blockers = readinessBlockers(workspace, readiness);
  const teamLead = appointment?.members?.find((member) =>
    ["team_leader", "lead_auditor"].includes(normalize(member.team_role)),
  );
  const currentReport = reports[0] ?? null;

  useEffect(() => {
    const navigation = sectionNavigationRef.current;
    if (!navigation || navigation.scrollWidth <= navigation.clientWidth) return;
    navigation.querySelector<HTMLButtonElement>('[aria-current="page"]')?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [section]);

  const primaryAction: ProjectedAction | null = serverAction && !["execution", "findings"].includes(section)
    ? {
        code: serverAction.code,
        label: serverAction.label,
        businessMeaning: "Mở công việc được phân công trong cuộc đánh giá này.",
        enabled: true,
        onAction: () => {
          const targetSection = auditActionSections[serverAction.code];
          if (targetSection === "execution") {
            onNavigateSection("execution");
            onNavigateExecutionView("report");
          } else {
            onOpenCompatibility(planCompatibilityPath(caseId, auditId, targetSection === "team" ? "audit-team" : "audit-plan", cycle?.key));
          }
        },
      }
    : null;

  const compatibilityPath = (workspaceName: string) =>
    planCompatibilityPath(caseId, auditId, workspaceName, cycle?.key);

  const content = section === "team" ? (
    <section className="cmp-audit-section">
      <SectionHeader
        title="Đoàn đánh giá và ngày công"
        description="Thành viên, thời gian tham gia và điều kiện sẵn sàng của đoàn đánh giá."
        actions={<Button onClick={() => onOpenCompatibility(compatibilityPath("audit-team"))}>Mở bố trí đoàn tương thích</Button>}
      />
      {!appointment ? (
        <EmptyState title="Chưa có bố trí đoàn" description="Kế hoạch này chưa có quyết định bố trí đoàn đánh giá." />
      ) : (
        <>
          <div className="cmp-audit-summary-grid">
            <EntitySummary compact title="Quyết định bố trí" items={[
              { label: "Số quyết định", value: appointment.appointment_number ?? "Chưa cấp số" },
              { label: "Trạng thái", value: appointment.status ?? "Chưa cập nhật" },
              { label: "Trưởng đoàn", value: teamLead?.experts?.full_name ?? "Chưa phân công" },
            ]} />
            <EntitySummary compact title="Ngày công" items={[
              { label: "Thành viên", value: `${appointment.members?.length ?? 0} người` },
              { label: "Từ ngày", value: formatCaseDate(teamDates.start) },
              { label: "Đến ngày", value: formatCaseDate(teamDates.end) },
            ]} />
          </div>
          {readinessError ? <Alert showIcon type="warning" title="Không tải được readiness của đoàn" description={readinessError} /> : null}
          <ReadinessBlockerPanel blockers={blockers} readyMessage="Đoàn đánh giá đáp ứng điều kiện ban hành." />
          <List
            className="cmp-audit-team-list"
            dataSource={appointment.members ?? []}
            locale={{ emptyText: "Chưa có thành viên" }}
            renderItem={(member) => {
              const assignmentStatus = assignmentStatusPresentation(member.assignment_status);
              return (
                <List.Item>
                  <List.Item.Meta
                    title={member.experts?.full_name ?? "Thành viên chưa xác định"}
                    description={`${teamRoleLabel(member.team_role)} · ${Number(member.planned_mandays ?? 0).toFixed(1)} MD · ${formatCaseDate(member.planned_start_date)} – ${formatCaseDate(member.planned_end_date)}`}
                  />
                  <Tag color={assignmentStatus.color}>{assignmentStatus.label}</Tag>
                </List.Item>
              );
            }}
          />
        </>
      )}
    </section>
  ) : section === "plan" ? (
    <section className="cmp-audit-section">
      <SectionHeader
        title="Kế hoạch cuộc đánh giá"
        description="Mục tiêu, phạm vi, tiêu chí và các điều kiện cần hoàn tất trước đánh giá."
        actions={<Button onClick={() => onOpenCompatibility(compatibilityPath("audit-plan"))}>Mở workspace kế hoạch tương thích</Button>}
      />
      <EntitySummary title={plan.plan_code ?? "Kế hoạch chưa có mã"} items={[
        { label: "Loại đánh giá", value: auditTypeLabel(plan.audit_type) },
        { label: "Thời gian dự kiến", value: `${formatCaseDate(plan.planned_start_date)} – ${formatCaseDate(plan.planned_end_date)}` },
        { label: "Địa điểm", value: plan.location ?? "Chưa cập nhật" },
        { label: "Mục tiêu", value: plan.audit_objectives ?? "Chưa cập nhật" },
        { label: "Tiêu chí", value: plan.audit_criteria ?? "Chưa cập nhật" },
        { label: "Phạm vi", value: plan.audit_scope ?? "Chưa cập nhật" },
      ]} />
      {readinessError ? <Alert showIcon type="warning" title="Không tải được readiness của đoàn" description={readinessError} /> : null}
      <ReadinessBlockerPanel blockers={blockers} readyMessage="Chưa ghi nhận điều kiện cản trở kế hoạch và đoàn đánh giá." />
    </section>
  ) : section === "execution" ? (
    <section className="cmp-audit-section">
      <SectionHeader title="Thực hiện và báo cáo" description="Ghi nhận kết quả, nộp báo cáo và xác nhận hoàn thành cuộc đánh giá." />
      <div className="cmp-audit-local-nav" role="group" aria-label="Khu vực thực hiện và hoàn thành">
        <Button aria-pressed={executionView === "report"} onClick={() => onNavigateExecutionView("report")}>Báo cáo đánh giá</Button>
        <Button aria-pressed={executionView === "complete"} onClick={() => onNavigateExecutionView("complete")}>Hoàn thành cuộc đánh giá</Button>
      </div>
      {executionAuthorized ? executionContent : (
        <ReadOnlyState reason="Bạn có thể xem cuộc đánh giá. Hiện chưa có công việc thực hiện đánh giá được cấp cho tài khoản này.">
          {executionContent}
        </ReadOnlyState>
      )}
    </section>
  ) : section === "findings" ? (
    <section className="cmp-audit-section">
      <SectionHeader title="Phát hiện và Hành động khắc phục" description="Ghi nhận phát hiện và theo dõi các điểm không phù hợp của cuộc đánh giá." />
      <Alert showIcon type="info" title="Theo dõi hành động khắc phục" description="Mở HĐKP từ từng NC để xem phản hồi, lịch sử và kết quả xem xét trong không gian xử lý hiện có." />
      {executionAuthorized ? executionContent : (
        <ReadOnlyState reason="Tài khoản hiện chỉ được xem phát hiện của cuộc đánh giá.">{executionContent}</ReadOnlyState>
      )}
    </section>
  ) : section === "documents" ? (
    <section className="cmp-audit-section">
      <SectionHeader
        title="Tài liệu cuộc đánh giá"
        description="Biểu mẫu và phiên bản tài liệu của cuộc đánh giá. Mở trung tâm tài liệu để cập nhật hoặc sinh biểu mẫu."
        actions={<Button onClick={() => onOpenCompatibility(compatibilityPath("audit-documents"))}>Mở trung tâm tài liệu tương thích</Button>}
      />
      {documentsLoading ? <LoadingSkeleton variant="list" rows={6} /> : documentsError ? (
        <Alert showIcon type="warning" title="Không tải được danh mục tài liệu" description={documentsError} />
      ) : documents?.documents.length ? (
        <div className="cmp-audit-document-grid">
          {documents.documents.map((document) => {
            const current = document.history.find((file) => file.is_current) ?? document.history[0] ?? null;
            return (
              <Card key={document.card_key ?? `${document.document_type}-${document.entity_id}`} size="small" title={`${document.form_code} · ${document.label}`}>
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Tag color={document.can_generate ? "blue" : "default"}>{document.can_generate ? "Có thể sinh từ dữ liệu hiện hữu" : "Chưa đủ dữ liệu để sinh"}</Tag>
                  <Typography.Text type="secondary">{document.history.length} phiên bản · {current?.original_name ?? "Chưa có tệp hiện hành"}</Typography.Text>
                  {current && onOpenDocument ? <Button onClick={() => onOpenDocument(current.download_url, current.original_name)}>Tải tệp hiện hành</Button> : null}
                </Space>
              </Card>
            );
          })}
        </div>
      ) : <EmptyState title="Chưa có tài liệu" description="Chưa có biểu mẫu hoặc tệp cho kế hoạch này." />}
    </section>
  ) : section === "activity" ? (
    <section className="cmp-audit-section">
      <SectionHeader title="Hoạt động theo chu kỳ" description="Lịch sử chung của chu kỳ chứa cuộc đánh giá này; có thể bao gồm các cuộc đánh giá và công việc khác trong cùng chu kỳ." />
      {activityError ? <ErrorState description={activityError} /> : activity ? <CertificationCaseActivity activity={activity} loadingMore={activityLoading} onLoadMore={onLoadMoreActivity} /> : <LoadingSkeleton variant="list" rows={5} />}
    </section>
  ) : (
    <section className="cmp-audit-section">
      <SectionHeader title="Tổng quan cuộc đánh giá" description="Lịch thực hiện, nguồn lực, báo cáo và các điều kiện cần lưu ý." />
      <div className="cmp-audit-summary-grid">
        <EntitySummary compact title="Lịch đánh giá" items={[
          { label: "Dự kiến", value: `${formatCaseDate(plan.planned_start_date)} – ${formatCaseDate(plan.planned_end_date)}` },
          { label: "Thực tế", value: currentReport ? `${formatCaseDate(currentReport.audit_start_date)} – ${formatCaseDate(currentReport.audit_end_date)}` : "Chưa ghi nhận" },
        ]} />
        <EntitySummary compact title="Nguồn lực và kết quả" items={[
          { label: "Trưởng đoàn", value: teamLead?.experts?.full_name ?? "Chưa phân công" },
          { label: "Báo cáo", value: currentReport?.report_code ?? "Chưa tạo" },
          { label: "Ngày công kế hoạch", value: plan.audit_event?.planned_mandays == null ? "Chưa ghi nhận" : `${Number(plan.audit_event.planned_mandays).toFixed(1)} MD` },
        ]} />
      </div>
      {readinessError ? <Alert showIcon type="warning" title="Không tải được readiness của đoàn" description={readinessError} /> : null}
      <ReadinessBlockerPanel blockers={blockers} readyMessage="Chưa ghi nhận điều kiện cản trở cuộc đánh giá." />
    </section>
  );

  return (
    <main className="cmp-audit-page" data-audit-route={`${caseId}:${auditId}`}>
      <Breadcrumb items={[
        { key: "cases", label: "Hồ sơ chứng nhận", onNavigate: onBack },
        { key: "case", label: data.identity.case_reference, onNavigate: onBack },
        { key: "audit", label: plan.plan_code ?? "Cuộc đánh giá" },
      ]} />
      <PageHeader
        identity="CUỘC ĐÁNH GIÁ"
        title={plan.plan_code ?? "Kế hoạch chưa có mã"}
        description={`${data.customer.name} · ${data.standards_scope.display_name}`}
        metadata={(
          <>
            <DomainStatusBadge domain="auditPlan" code={plan.status ?? "draft"} />
            <Tag icon={<CalendarOutlined />}>{auditTypeLabel(plan.audit_type)}</Tag>
            {cycle ? <Tag>{cycleLabel(cycle)}</Tag> : null}
            {teamLead ? <Tag icon={<TeamOutlined />}>{teamLead.experts?.full_name}</Tag> : null}
          </>
        )}
        primaryAction={primaryAction ? <NextActionBar primaryAction={primaryAction} /> : undefined}
        secondaryActions={(
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Về hồ sơ</Button>
            <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>Làm mới</Button>
          </Space>
        )}
      />

      <nav ref={sectionNavigationRef} className="cmp-audit-secondary-nav" aria-label="Khu vực cuộc đánh giá">
        {sections.map((item) => (
          <button key={item} type="button" aria-current={section === item ? "page" : undefined} onClick={() => onNavigateSection(item)}>
            {sectionLabels[item]}
          </button>
        ))}
      </nav>

      <div className="cmp-audit-context-strip">
        <span><FolderOpenOutlined /> {data.identity.case_reference}</span>
        <span><CalendarOutlined /> {formatCaseDate(plan.planned_start_date)} – {formatCaseDate(plan.planned_end_date)}</span>
        <span><FileDoneOutlined /> {reports.length} báo cáo</span>
        {serverAction?.due_at ? <span>Hạn công việc: {formatCaseDate(serverAction.due_at)}</span> : null}
      </div>

      {content}
    </main>
  );
}

export interface CertificationAuditWorkspaceProps {
  caseId: string;
  auditId: string;
  roles: string[];
  section: CertificationAuditSection;
  executionView: CertificationAuditExecutionView;
  onBack: () => void;
  onNavigateSection: (section: CertificationAuditSection) => void;
  onNavigateExecutionView: (view: CertificationAuditExecutionView) => void;
  onOpenCompatibility: (path: string) => void;
}

export function CertificationAuditWorkspace({
  caseId,
  auditId,
  roles,
  section,
  executionView,
  onBack,
  onNavigateSection,
  onNavigateExecutionView,
  onOpenCompatibility,
}: CertificationAuditWorkspaceProps) {
  const [activity, setActivity] = useState<CertificationCaseActivityPage | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const caseQuery = useQuery({
    queryKey: ["certification-case", caseId, "workspace-v2"],
    queryFn: async () => (await api.get<CertificationCaseWorkspaceProjection>(`/certification-cases/${caseId}/workspace`)).data,
    retry: false,
  });
  const executionQuery = useQuery({
    queryKey: ["audit-execution", auditId],
    queryFn: () => loadAuditExecutionWorkspace(auditId),
    retry: false,
  });
  const appointmentId = executionQuery.data?.appointment?.id ?? null;
  const matchingContext = Boolean(caseQuery.data && executionQuery.data && auditBelongsToCase(caseId, auditId, executionQuery.data.plan));
  const readinessQuery = useQuery({
    queryKey: ["audit-team-readiness", appointmentId],
    queryFn: async () => (await api.get<AuditTeamReadinessProjection>(`/audit-team-appointments/${appointmentId}/readiness`)).data,
    enabled: matchingContext && Boolean(appointmentId),
    retry: false,
  });
  const documentsQuery = useQuery({
    queryKey: ["audit-documents", auditId],
    queryFn: async () => (await api.get<AuditDocumentPreview>(`/audit-documents/plan/${auditId}`)).data,
    enabled: matchingContext && section === "documents",
    retry: false,
  });
  const cycle = caseQuery.data ? auditCycle(caseQuery.data, auditId) : null;
  const activityQuery = useQuery({
    queryKey: ["certification-audit", caseId, auditId, "activity", cycle?.key],
    queryFn: async () => {
      const query = new URLSearchParams({ limit: "25" });
      if (cycle?.key) query.set("cycle", cycle.key);
      return (await api.get<CertificationCaseActivityPage>(`/certification-cases/${caseId}/activity?${query.toString()}`)).data;
    },
    enabled: matchingContext && section === "activity" && Boolean(cycle),
    retry: false,
  });

  const errors = [caseQuery.error, executionQuery.error];
  if (caseQuery.isLoading || executionQuery.isLoading) return <LoadingSkeleton variant="detail" rows={14} />;
  if (errors.some((error) => isAxiosError(error) && error.response?.status === 403)) {
    return <ForbiddenState exit={{ label: "Về danh sách hồ sơ", onAction: onBack }} />;
  }
  if (errors.some((error) => isAxiosError(error) && error.response?.status === 404)) {
    return <EmptyState title="Không tìm thấy cuộc đánh giá" description="Cuộc đánh giá không tồn tại hoặc không còn khả dụng." action={{ label: "Về hồ sơ", onAction: onBack }} />;
  }
  if (caseQuery.isError || executionQuery.isError || !caseQuery.data || !executionQuery.data) {
    return <ErrorState description={getErrorMessage(caseQuery.error ?? executionQuery.error)} retry={{ label: "Thử lại", onAction: () => { void caseQuery.refetch(); void executionQuery.refetch(); } }} />;
  }
  if (!auditBelongsToCase(caseId, auditId, executionQuery.data.plan)) {
    return <ForbiddenState exit={{ label: "Về danh sách hồ sơ", onAction: onBack }} />;
  }

  const serverAction = auditExecutionAction(caseQuery.data, auditId);
  const refresh = async () => {
    setActivity(null);
    await Promise.all([
      caseQuery.refetch(),
      executionQuery.refetch(),
      appointmentId ? readinessQuery.refetch() : Promise.resolve(),
      section === "documents" ? documentsQuery.refetch() : Promise.resolve(),
      section === "activity" ? activityQuery.refetch() : Promise.resolve(),
    ]);
  };
  const loadMoreActivity = async () => {
    const current = activity ?? activityQuery.data;
    if (!current?.page.next_cursor || activityLoading) return;
    setActivityLoading(true);
    try {
      const query = new URLSearchParams({ cursor: current.page.next_cursor, limit: String(current.page.limit) });
      if (cycle?.key) query.set("cycle", cycle.key);
      const next = (await api.get<CertificationCaseActivityPage>(`/certification-cases/${caseId}/activity?${query.toString()}`)).data;
      setActivity({ ...next, items: [...current.items, ...next.items] });
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setActivityLoading(false);
    }
  };
  const executionMode: AuditExecutionWorkspaceMode = section === "findings"
    ? "findings"
    : section === "execution"
      ? executionView
      : "full";
  const executionContent = ["execution", "findings"].includes(section) ? (
    <AuditExecutionWorkspaceModal
      open
      planId={auditId}
      roles={roles}
      mode={executionMode}
      presentation="page"
      mutationAuthorized={Boolean(serverAction)}
      onOpenFinding={(findingId) => onOpenCompatibility(
        `/certifications/${encodeURIComponent(caseId)}/findings/${encodeURIComponent(findingId)}?audit_plan_id=${encodeURIComponent(auditId)}`,
      )}
      onClose={() => undefined}
      onChanged={refresh}
    />
  ) : null;

  return (
    <CertificationAuditWorkspaceView
      caseId={caseId}
      auditId={auditId}
      data={caseQuery.data}
      workspace={executionQuery.data}
      readiness={readinessQuery.data}
      readinessError={readinessQuery.isError ? getErrorMessage(readinessQuery.error) : undefined}
      documents={documentsQuery.data}
      documentsLoading={documentsQuery.isLoading}
      documentsError={documentsQuery.isError ? getErrorMessage(documentsQuery.error) : undefined}
      activity={activity ?? activityQuery.data}
      activityLoading={activityLoading || activityQuery.isLoading}
      activityError={!cycle ? "Chưa xác định được chu kỳ của cuộc đánh giá để tải hoạt động." : activityQuery.isError ? getErrorMessage(activityQuery.error) : undefined}
      section={section}
      executionView={executionView}
      executionContent={executionContent}
      refreshing={caseQuery.isFetching || executionQuery.isFetching}
      onBack={onBack}
      onRefresh={() => void refresh()}
      onNavigateSection={onNavigateSection}
      onNavigateExecutionView={onNavigateExecutionView}
      onOpenCompatibility={onOpenCompatibility}
      onOpenDocument={(url, filename) => void downloadDocumentFile({ url, filename }).catch((error) => message.error(getErrorMessage(error)))}
      onLoadMoreActivity={() => void loadMoreActivity()}
    />
  );
}
