import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Alert, Button, Select, Space, Typography } from "antd";
import { api } from "../../lib/api";
import CertificationResultWorkspaceModal, { type DecisionWorkspace } from "../CertificationResultWorkspaceModal";
import type { CertificationCaseWorkspaceProjection } from "../certification-case/types";
import { cycleLabel } from "../certification-case/case-model";
import { Breadcrumb, EmptyState, ErrorState, ForbiddenState, LoadingSkeleton } from "../design-system";
import "./certification-decision.css";

export function safeDecisionSection(value: string | null | undefined) { return value === "decision" ? "decision" : "overview"; }
export function decisionContextMatches(data: DecisionWorkspace, caseId: string, planId: string, reviewId: string | null) {
  return data.case_id === caseId && data.plan.project_id === caseId && data.plan.id === planId && (!reviewId || data.technical_review?.id === reviewId);
}
interface Props {
  caseId: string; planId: string | null; reviewId: string | null; section: string; cycleKey: string | null;
  roles: string[]; onOpenPath: (path: string) => void;
}
export function CertificationDecisionWorkspace({ caseId, planId, reviewId, section, cycleKey, roles, onOpenPath }: Props) {
  const caseQuery = useQuery({
    queryKey: ["decision-case-context", caseId], retry: false,
    queryFn: async () => (await api.get<CertificationCaseWorkspaceProjection>(`/certification-cases/${encodeURIComponent(caseId)}/workspace`)).data,
  });
  const caseData = caseQuery.data;
  const cycle = caseData?.cycles.find(item => item.plan_ids.includes(planId ?? ""));
  const validPlan = Boolean(planId && caseData?.identity.id === caseId && cycle && (!cycleKey || cycle.key === cycleKey));
  const query = useQuery({
    queryKey: ["decision-case-workspace", caseId, planId, reviewId], enabled: validPlan, retry: false,
    queryFn: async () => (await api.get<DecisionWorkspace>(`/certification-decisions/plan/${encodeURIComponent(planId!)}/case-workspace`, { params: { case_id: caseId, technical_review_id: reviewId || undefined } })).data,
  });
  const exit = { label: "Về danh sách hồ sơ", onAction: () => onOpenPath("/certifications") };
  const error = caseQuery.error ?? (validPlan ? query.error : null);
  if (error) {
    const status = isAxiosError(error) ? error.response?.status : null;
    if (status === 403 || status === 400) return <ForbiddenState exit={exit} />;
    if (status === 404) return <EmptyState title="Nội dung không khả dụng" action={exit} />;
    return <ErrorState retry={{ label: "Thử lại", onAction: () => { void caseQuery.refetch(); if (validPlan) void query.refetch(); } }} />;
  }
  if (caseQuery.isLoading || (validPlan && query.isLoading)) return <LoadingSkeleton variant="detail" rows={12} />;
  if (!caseData || caseData.identity.id !== caseId || (planId && !validPlan) || (!planId && cycleKey && !caseData.cycles.some(item => item.key === cycleKey))) return <ForbiddenState exit={exit} />;
  const data = query.data;
  if (planId && (!data || !decisionContextMatches(data, caseId, planId, reviewId))) return <ForbiddenState exit={exit} />;
  const navigate = (nextPlan: string, nextSection = "overview") => {
    const nextCycle = caseData.cycles.find(item => item.plan_ids.includes(nextPlan));
    const params = new URLSearchParams({ audit_plan_id: nextPlan, section: safeDecisionSection(nextSection) });
    if (nextCycle) params.set("cycle", nextCycle.key);
    if (reviewId && nextPlan === planId) params.set("technical_review_id", reviewId);
    onOpenPath(`/certifications/${encodeURIComponent(caseId)}/decision?${params}`);
  };
  return <main className="cmp-decision-page">
    <Breadcrumb items={[{ key: "registry", label: "Hồ sơ chứng nhận", onNavigate: () => onOpenPath("/certifications") }, { key: "case", label: caseData.identity.case_reference, onNavigate: () => onOpenPath(`/certifications/${encodeURIComponent(caseId)}`) }, { key: "decision", label: "Quyết định chứng nhận" }]} />
    <div className="cmp-decision-context"><label htmlFor="decision-plan">Cuộc đánh giá / chu kỳ</label>
      <Select id="decision-plan" value={planId} placeholder="Chọn cuộc đánh giá" onChange={(id: string) => navigate(id)} options={caseData.cycles.flatMap(item => item.plan_ids.map((id, index) => ({ value: id, label: `${item.plan_codes[index] || "Cuộc đánh giá"} · ${cycleLabel(item)}` })))} />
      {planId ? <Button onClick={() => onOpenPath(`/certifications/${encodeURIComponent(caseId)}/technical-review?audit_plan_id=${encodeURIComponent(planId)}`)}>Xem thẩm xét kỹ thuật</Button> : null}
      {data?.current_certificate?.id ? <Button onClick={() => onOpenPath(`/certifications/${encodeURIComponent(caseId)}/certificates/${encodeURIComponent(data.current_certificate!.id)}`)}>Mở chứng chỉ</Button> : null}
      {data?.decision && planId ? <Button onClick={() => onOpenPath(`/projects/${encodeURIComponent(caseId)}?workspace=certificate-issue&audit_plan_id=${encodeURIComponent(planId)}&compatibility=legacy`)}>Kiểm tra điều kiện & cấp chứng chỉ</Button> : null}
    </div>
    {data && planId ? <CertificationResultWorkspaceModal key={`${caseId}:${planId}:${reviewId ?? "current"}`} open planId={planId} roles={roles} onClose={() => onOpenPath(`/certifications/${encodeURIComponent(caseId)}`)} onChanged={async () => { await query.refetch(); }} page={{ data, section: safeDecisionSection(section), onSection: key => navigate(planId, key), context: <Space direction="vertical" style={{ width: "100%" }}>
      <Typography.Text>{cycle ? cycleLabel(cycle) : ""} · {caseData.standards_scope.display_name}</Typography.Text>
      <Typography.Paragraph>Phạm vi: {data.defaults.certification_scope || "Chưa có dữ liệu"}</Typography.Paragraph>
      <Alert showIcon type={data.upstream_errors?.length ? "warning" : "info"} message="Nguồn đầu vào báo cáo / HĐKP" description={data.upstream_errors?.join(" · ") || "Không có blocker đầu vào trong kiểm tra thẩm xét hiện tại. Kiến nghị, loại quyết định và dữ liệu biểu mẫu tiếp tục được máy chủ kiểm tra khi ban hành."} />
      <Typography.Text type="secondary">Quyền ban hành theo vai trò người ra quyết định, không có phân công cá nhân riêng. {data.independence === "CONFIRMED" ? "Máy chủ đã xác nhận tính độc lập cho tài khoản hiện tại." : "Chưa có xác nhận tính độc lập cho tài khoản hiện tại."}</Typography.Text>
    </Space> }} /> : <EmptyState title="Chọn cuộc đánh giá" description="Quyết định dựa trên hồ sơ thẩm xét của từng cuộc đánh giá; không tự tạo hoặc tự chọn hồ sơ." />}
  </main>;
}
