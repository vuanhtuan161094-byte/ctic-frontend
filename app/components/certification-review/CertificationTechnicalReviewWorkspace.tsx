import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Alert, Button, Select, Space, Typography } from "antd";
import { api } from "../../lib/api";
import TechnicalReviewWorkspaceModal, { type TechnicalReviewWorkspace } from "../TechnicalReviewWorkspaceModal";
import type { CertificationCaseWorkspaceProjection } from "../certification-case/types";
import { cycleLabel } from "../certification-case/case-model";
import { Breadcrumb, EmptyState, ErrorState, ForbiddenState, LoadingSkeleton } from "../design-system";
import "./certification-review.css";

export const reviewSections = ["documents", "preliminary", "technical", "recommendation", "history"] as const;
export function safeReviewSection(value: string | null | undefined) {
  return reviewSections.find((item) => item === value) ?? "documents";
}
export function reviewContextMatches(data: TechnicalReviewWorkspace, caseId: string, planId: string, reviewId: string | null) {
  return data.case_id === caseId && data.plan.id === planId && (!reviewId || data.review?.id === reviewId);
}
interface Props {
  caseId: string; planId: string | null; reviewId: string | null; section: string; cycleKey: string | null;
  roles: string[]; onOpenPath: (path: string) => void;
}
export function CertificationTechnicalReviewWorkspace({ caseId, planId, reviewId, section, cycleKey, roles, onOpenPath }: Props) {
  const caseQuery = useQuery({
    queryKey: ["technical-review-case-context", caseId], retry: false,
    queryFn: async () => (await api.get<CertificationCaseWorkspaceProjection>(`/certification-cases/${encodeURIComponent(caseId)}/workspace`)).data,
  });
  const caseData = caseQuery.data;
  const cycle = caseData?.cycles.find((item) => item.plan_ids.includes(planId ?? ""));
  const validPlan = Boolean(planId && caseData?.identity.id === caseId && cycle && (!cycleKey || cycle.key === cycleKey));
  const query = useQuery({
    queryKey: ["technical-review-case-workspace", caseId, planId, reviewId], enabled: validPlan, retry: false,
    queryFn: async () => (await api.get<TechnicalReviewWorkspace>(`/technical-reviews/plan/${encodeURIComponent(planId!)}/case-workspace`, { params: { case_id: caseId, review_id: reviewId || undefined } })).data,
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
  if (!caseData || caseData.identity.id !== caseId || (planId && !validPlan)) return <ForbiddenState exit={exit} />;
  const navigate = (nextPlan: string, nextSection = "documents") => {
    const nextCycle = caseData.cycles.find((item) => item.plan_ids.includes(nextPlan));
    const params = new URLSearchParams({ audit_plan_id: nextPlan, section: safeReviewSection(nextSection) });
    if (nextCycle) params.set("cycle", nextCycle.key);
    if (reviewId && nextPlan === planId) params.set("technical_review_id", reviewId);
    onOpenPath(`/certifications/${encodeURIComponent(caseId)}/technical-review?${params}`);
  };
  const data = query.data;
  if (planId && (!data || !reviewContextMatches(data, caseId, planId, reviewId))) return <ForbiddenState exit={exit} />;
  return <main className="cmp-review-page">
    <Breadcrumb items={[{ key: "registry", label: "Hồ sơ chứng nhận", onNavigate: () => onOpenPath("/certifications") }, { key: "case", label: caseData.identity.case_reference, onNavigate: () => onOpenPath(`/certifications/${encodeURIComponent(caseId)}`) }, { key: "review", label: "Thẩm xét kỹ thuật" }]} />
    <div className="cmp-review-context">
      <label htmlFor="review-plan">Cuộc đánh giá / chu kỳ</label>
      <Select id="review-plan" value={planId} placeholder="Chọn cuộc đánh giá để thẩm xét" onChange={(id: string) => navigate(id)} options={caseData.cycles.flatMap((item) => item.plan_ids.map((id, index) => ({ value: id, label: `${item.plan_codes[index] || "Cuộc đánh giá"} · ${cycleLabel(item)}` })))} />
      {planId ? <Button onClick={() => onOpenPath(`/certifications/${encodeURIComponent(caseId)}/audits/${encodeURIComponent(planId)}`)}>Về cuộc đánh giá</Button> : null}
      {planId && data?.review?.status === "completed" ? <Button onClick={() => {
        const params = new URLSearchParams({ audit_plan_id: planId, technical_review_id: data.review!.id });
        if (cycle) params.set("cycle", cycle.key);
        onOpenPath(`/certifications/${encodeURIComponent(caseId)}/decision?${params}`);
      }}>Xem quyết định chứng nhận</Button> : null}
    </div>
    {data && planId ? <TechnicalReviewWorkspaceModal key={`${caseId}:${planId}:${reviewId ?? "current"}`} open planId={planId} roles={roles} onClose={() => onOpenPath(`/certifications/${encodeURIComponent(caseId)}`)} onChanged={async () => { await query.refetch(); }} page={{
      data, section: safeReviewSection(section), onSection: (key) => navigate(planId, key),
      context: <Space direction="vertical" style={{ width: "100%" }}>
        <Typography.Text>{cycle ? cycleLabel(cycle) : ""} · {caseData.standards_scope.display_name}</Typography.Text>
        <Typography.Paragraph>Phạm vi: {caseData.standards_scope.certification_scope || "Chưa có dữ liệu phạm vi"}</Typography.Paragraph>
        <Alert showIcon type={data.eligibility_errors.length ? "warning" : "info"} message="Điều kiện báo cáo / HĐKP" description={data.eligibility_errors.join(" · ") || (data.can_start ? "Báo cáo và HĐKP đáp ứng điều kiện đầu vào theo kiểm tra của máy chủ. Điều kiện hoàn tất F.11 được kiểm tra riêng." : "Chưa xác nhận điều kiện đầu vào.")} />
        <Typography.Text type="secondary">{data.can_perform ? "Máy chủ đã xác nhận phân công/ủy quyền và tính độc lập cho tài khoản hiện tại; quyền được kiểm tra lại khi thao tác." : "Chưa có xác nhận quyền thực hiện thẩm xét cho tài khoản hiện tại."}</Typography.Text>
      </Space>,
    }} /> : <EmptyState title="Chọn cuộc đánh giá" description={caseData.cycles.length ? "Thẩm xét theo báo cáo của từng cuộc đánh giá; không tự chọn hoặc tạo hồ sơ mới." : "Hồ sơ chưa có cuộc đánh giá để thẩm xét."} />}
  </main>;
}
