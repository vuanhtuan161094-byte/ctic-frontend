import { api } from "./api";

export type TaskDestination =
  | "project-detail"
  | "projects"
  | "applications"
  | "schedule-resources"
  | "certificates";

export interface TaskNavigationTarget {
  destination: TaskDestination;
  entityId?: string | null;
  workspacePath?: string;
}

interface AuditPlanReference {
  id: string;
  project_id: string;
}

interface AuditFindingReference {
  reports?: {
    audit_plan_id?: string | null;
  } | null;
}

interface TechnicalReviewReference {
  reports?: {
    audit_plan_id?: string | null;
  } | null;
}

interface AuditResultNotificationReference {
  technical_reviews?: {
    reports?: {
      audit_plan_id?: string | null;
    } | null;
  } | null;
}

function requireEntityId(entityId?: string | null) {
  if (!entityId) {
    throw new Error("Thông báo chưa được liên kết với hồ sơ nghiệp vụ.");
  }

  return entityId;
}

async function resolveProjectFromAuditPlan(
  auditPlanId?: string | null,
): Promise<TaskNavigationTarget> {
  if (!auditPlanId) {
    throw new Error("Không xác định được kế hoạch đánh giá của hồ sơ.");
  }

  const response = await api.get<AuditPlanReference>(
    `/audit-plans/${auditPlanId}`,
  );

  if (!response.data.project_id) {
    throw new Error("Kế hoạch đánh giá chưa được liên kết với hồ sơ chứng nhận.");
  }

  return {
    destination: "project-detail",
    entityId: response.data.project_id,
  };
}

/**
 * Chuyển entity của thông báo/cảnh báo về đúng màn hình nghiệp vụ.
 * Các entity trung gian như NC, thẩm xét và thông báo kết quả được truy ngược
 * qua báo cáo -> kế hoạch đánh giá -> hồ sơ chứng nhận.
 */
export async function resolveTaskNavigation(
  entityType?: string | null,
  entityId?: string | null,
): Promise<TaskNavigationTarget> {
  const normalizedType = (entityType ?? "").trim().toLowerCase();

  if (normalizedType === "certificate") {
    return {
      destination: "certificates",
      entityId: requireEntityId(entityId),
    };
  }

  if (normalizedType === "audit_program_event") {
    const eventId = requireEntityId(entityId);
    const response = await api.get<AuditPlanReference[]>(
      `/audit-plans/event/${eventId}`,
    );

    const latestPlan = response.data[0];

    if (!latestPlan) {
      throw new Error("Cuộc đánh giá chưa có kế hoạch đánh giá tương ứng.");
    }

    return {
      destination: "schedule-resources",
      entityId: latestPlan.id,
    };
  }

  if (normalizedType === "audit_finding") {
    const findingId = requireEntityId(entityId);
    const response = await api.get<AuditFindingReference>(
      `/audit-findings/${findingId}`,
    );

    return resolveProjectFromAuditPlan(response.data.reports?.audit_plan_id);
  }

  if (normalizedType === "technical_review") {
    const reviewId = requireEntityId(entityId);
    const response = await api.get<TechnicalReviewReference>(
      `/technical-reviews/${reviewId}`,
    );

    const planId = response.data.reports?.audit_plan_id;
    const target = await resolveProjectFromAuditPlan(planId);
    return { ...target, workspacePath: `/certifications/${encodeURIComponent(target.entityId!)}/technical-review?audit_plan_id=${encodeURIComponent(planId!)}&technical_review_id=${encodeURIComponent(reviewId)}` };
  }

  if (normalizedType === "audit_result_notification") {
    const notificationId = requireEntityId(entityId);
    const response = await api.get<AuditResultNotificationReference>(
      `/audit-result-notifications/${notificationId}`,
    );

    return resolveProjectFromAuditPlan(
      response.data.technical_reviews?.reports?.audit_plan_id,
    );
  }

  if (normalizedType === "certification_decision") {
    const decisionId = requireEntityId(entityId);
    const response = await api.get<AuditResultNotificationReference & { technical_review_id?: string }>(`/certification-decisions/${decisionId}`);
    const planId = response.data.technical_reviews?.reports?.audit_plan_id;
    const target = await resolveProjectFromAuditPlan(planId);
    const params = new URLSearchParams({ audit_plan_id: planId!, section: "decision" });
    if (response.data.technical_review_id) params.set("technical_review_id", response.data.technical_review_id);
    return { ...target, workspacePath: `/certifications/${encodeURIComponent(target.entityId!)}/decision?${params}` };
  }

  return {
    destination: "projects",
    entityId: null,
  };
}
