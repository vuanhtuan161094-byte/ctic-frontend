export type ActiveView =
  | "dashboard"
  | "my-tasks"
  | "my-calendar"
  | "notifications"
  | "delegations"
  | "customers"
  | "applications"
  | "projects"
  | "project-detail"
  | "schedule-resources"
  | "certificates"
  | "documents"
  | "experts"
  | "reports"
  | "system-admin"
  | "configuration-schemes"
  | "configuration-standards"
  | "configuration-capabilities"
  | "configuration-numbering"
  | "configuration-branding"
  | "configuration-classifications"
  | "configuration-mappings"
  | "configuration-import"
  | "customer-results"
  | "customer-certifications"
  | "customer-change-requests"
  | "customer-portal-users"
  | "customer-user-requests"
  | "customer-documents"
  | "customer-document-requests"
  | "governance-cases";

export interface BrowserNavigationState {
  activeView: ActiveView;
  selectedProjectId: string | null;
  selectedCertificateId: string | null;
  selectedAuditPlanId: string | null;
  selectedApplicationReviewId?: string | null;
  selectedProjectDossierKey?: string | null;
  selectedProjectWorkspacePath?: string | null;
}

const activeViewValues: ActiveView[] = [
  "dashboard", "my-tasks", "my-calendar", "notifications", "delegations",
  "customers", "applications", "projects", "project-detail", "schedule-resources",
  "certificates", "documents", "experts", "reports", "system-admin",
  "configuration-schemes", "configuration-standards", "configuration-capabilities",
  "configuration-numbering", "configuration-branding", "configuration-classifications",
  "configuration-mappings", "configuration-import",
  "customer-results", "customer-certifications", "customer-change-requests", "customer-portal-users",
  "customer-user-requests", "customer-documents", "customer-document-requests",
  "governance-cases",
];

export function isActiveView(value: unknown): value is ActiveView {
  return typeof value === "string" && activeViewValues.includes(value as ActiveView);
}

function safeDecode(value?: string | null) {
  if (!value) return null;
  try { return decodeURIComponent(value); } catch { return value; }
}

function normalizePathname(pathname: string) {
  const clean = (pathname || "/").replace(/\/{2,}/g, "/");
  if (clean.length > 1 && clean.endsWith("/")) return clean.slice(0, -1);
  return clean;
}

export function isCanonicalRoutePath(pathname: string, customerPortalMode: boolean) {
  const path = normalizePathname(pathname);
  if (customerPortalMode) return path === "/portal" || path.startsWith("/portal/");
  if (path === "/") return false;
  return [
    "/workspace", "/work", "/calendar", "/notifications", "/delegations",
    "/customers", "/applications", "/certifications", "/schedule",
    "/resources/experts", "/documents", "/governance", "/certificates",
    "/analytics", "/admin",
  ].some((root) => path === root || path.startsWith(`${root}/`));
}

export function parseCanonicalLocation(
  pathname: string,
  search: string,
  customerPortalMode: boolean,
): BrowserNavigationState {
  const path = normalizePathname(pathname);
  const params = new URLSearchParams(search);
  const base: BrowserNavigationState = {
    activeView: customerPortalMode ? "dashboard" : "dashboard",
    selectedProjectId: null,
    selectedCertificateId: null,
    selectedAuditPlanId: null,
    selectedApplicationReviewId: params.get("review_id"),
    selectedProjectDossierKey: params.get("cycle") ?? params.get("dossier_key"),
    selectedProjectWorkspacePath: null,
  };

  if (customerPortalMode) {
    if (path === "/" || path === "/portal" || path === "/workspace") return base;
    if (path.startsWith("/portal/organization")) return { ...base, activeView: params.get("tab") === "access" ? "customer-portal-users" : "customers" };
    if (path.startsWith("/portal/applications")) return { ...base, activeView: "applications" };
    if (path.startsWith("/portal/calendar")) return { ...base, activeView: "schedule-resources" };
    if (path.startsWith("/portal/corrective-actions")) return { ...base, activeView: "projects" };
    if (path.startsWith("/portal/documents")) return { ...base, activeView: "customer-documents" };
    if (path.startsWith("/portal/results")) return { ...base, activeView: "customer-results" };
    if (path.startsWith("/portal/certificates")) {
      const match = path.match(/^\/portal\/certificates\/([^/?#]+)/);
      return { ...base, activeView: "certificates", selectedCertificateId: safeDecode(match?.[1]) };
    }
    if (path.startsWith("/portal/requests")) return { ...base, activeView: "governance-cases" };
    if (path.startsWith("/portal/notifications")) return { ...base, activeView: "notifications" };
    if (path.startsWith("/portal/certifications")) {
      const match = path.match(/^\/portal\/certifications\/([^/?#]+)/);
      return { ...base, activeView: "customer-certifications", selectedProjectId: safeDecode(match?.[1]) };
    }

    // Legacy portal destinations retained through Step 18.
    if (path.startsWith("/customer-portal/profile")) return { ...base, activeView: "customers" };
    if (path.startsWith("/customer-portal/users")) return { ...base, activeView: "customer-portal-users" };
    if (path.startsWith("/customer-portal/documents")) return { ...base, activeView: "customer-documents" };
    if (path.startsWith("/customer-portal/corrective-actions")) return { ...base, activeView: "projects" };
    if (path.startsWith("/customer-portal/certificates")) return { ...base, activeView: "certificates" };
    if (path.startsWith("/customer-portal/results")) return { ...base, activeView: "customer-results" };
    if (path.startsWith("/customer-portal/notifications")) return { ...base, activeView: "notifications" };
    if (path.startsWith("/customer-portal/cases")) return { ...base, activeView: "governance-cases" };
    return base;
  }

  if (path === "/" || path === "/workspace") return base;
  if (path === "/work" || path.startsWith("/work/")) return { ...base, activeView: "my-tasks" };
  if (path === "/my-work" || path.startsWith("/my-work/")) return { ...base, activeView: "my-tasks" };
  if (path === "/calendar" || path.startsWith("/my-calendar")) return { ...base, activeView: "my-calendar" };
  if (path.startsWith("/notifications")) return { ...base, activeView: "notifications" };
  if (path.startsWith("/delegations")) return { ...base, activeView: "delegations" };
  if (path.startsWith("/customers")) return { ...base, activeView: "customers" };
  if (path.startsWith("/applications")) return { ...base, activeView: "applications", selectedApplicationReviewId: params.get("review_id") };

  const caseMatch = path.match(/^\/certifications\/([^/?#]+)(?:\/(.*))?$/);
  if (caseMatch) {
    const caseId = safeDecode(caseMatch[1]);
    const child = caseMatch[2] ?? "";
    let workspacePath: string | null = null;
    const auditMatch = child.match(/^audits\/([^/?#]+)/);
    const findingMatch = child.match(/^findings\/([^/?#]+)/);
    if (auditMatch) {
      const auditId = safeDecode(auditMatch[1]);
      workspacePath = `/projects/${encodeURIComponent(caseId ?? "")}?workspace=audit-execution&audit_plan_id=${encodeURIComponent(auditId ?? "")}`;
    } else if (findingMatch) {
      const findingId = safeDecode(findingMatch[1]);
      const planId = params.get("audit_plan_id");
      if (planId) workspacePath = `/projects/${encodeURIComponent(caseId ?? "")}?workspace=cap&audit_plan_id=${encodeURIComponent(planId)}&finding_id=${encodeURIComponent(findingId ?? "")}`;
    } else if (child === "technical-review") {
      const planId = params.get("audit_plan_id");
      if (planId) workspacePath = `/projects/${encodeURIComponent(caseId ?? "")}?workspace=technical-review&audit_plan_id=${encodeURIComponent(planId)}`;
    } else if (child === "decision") {
      const planId = params.get("audit_plan_id");
      if (planId) workspacePath = `/projects/${encodeURIComponent(caseId ?? "")}?workspace=certification-decision&audit_plan_id=${encodeURIComponent(planId)}`;
    }
    return {
      ...base,
      activeView: "project-detail",
      selectedProjectId: caseId,
      selectedAuditPlanId: auditMatch ? safeDecode(auditMatch[1]) : null,
      selectedProjectWorkspacePath: workspacePath,
    };
  }
  if (path === "/certifications") return { ...base, activeView: "projects" };

  // Legacy project paths retained through Step 18.
  const legacyProjectMatch = path.match(/^\/(?:projects|certification-projects)\/([^/?#]+)/);
  if (legacyProjectMatch) {
    return {
      ...base,
      activeView: "project-detail",
      selectedProjectId: safeDecode(legacyProjectMatch[1]),
      selectedProjectDossierKey: params.get("dossier_key") ?? params.get("cycle"),
      selectedProjectWorkspacePath: `${path}${search}`,
    };
  }
  if (path === "/projects") return { ...base, activeView: "projects" };

  if (path.startsWith("/schedule")) return { ...base, activeView: "schedule-resources", selectedAuditPlanId: params.get("audit_plan_id") };
  if (path.startsWith("/schedule-resources")) return { ...base, activeView: "schedule-resources", selectedAuditPlanId: params.get("audit_plan_id") };
  if (path.startsWith("/resources/experts") || path.startsWith("/experts")) return { ...base, activeView: "experts" };
  if (path.startsWith("/documents")) return { ...base, activeView: "documents" };
  if (path.startsWith("/governance")) return { ...base, activeView: "governance-cases" };
  if (path.startsWith("/customer-change-requests")) return { ...base, activeView: "customer-change-requests" };
  if (path.startsWith("/customer-user-requests")) return { ...base, activeView: "customer-user-requests" };
  if (path.startsWith("/customer-document-requests")) return { ...base, activeView: "customer-document-requests" };
  if (path.startsWith("/analytics") || path.startsWith("/reports")) return { ...base, activeView: "reports" };
  const configurationRoutes: Record<string, ActiveView> = {
    "/admin/configuration/schemes": "configuration-schemes",
    "/admin/configuration/standards": "configuration-standards",
    "/admin/configuration/capabilities": "configuration-capabilities",
    "/admin/configuration/numbering": "configuration-numbering",
    "/admin/configuration/branding": "configuration-branding",
    "/admin/configuration/classifications": "configuration-classifications",
    "/admin/configuration/mappings": "configuration-mappings",
    "/admin/configuration/import": "configuration-import",
  };
  const configurationRoute = Object.entries(configurationRoutes).find(([route]) => path === route || path.startsWith(`${route}/`));
  if (configurationRoute) return { ...base, activeView: configurationRoute[1] };
  if (path.startsWith("/admin" ) || path.startsWith("/system-admin")) return { ...base, activeView: "system-admin" };

  const certificateMatch = path.match(/^\/certificates\/([^/?#]+)/);
  if (certificateMatch) return { ...base, activeView: "certificates", selectedCertificateId: safeDecode(certificateMatch[1]) };
  if (path.startsWith("/certificates")) return { ...base, activeView: "certificates" };

  return base;
}

export function canonicalPathForNavigation(
  navigation: BrowserNavigationState,
  customerPortalMode: boolean,
): string {
  const query = new URLSearchParams();
  if (navigation.selectedProjectDossierKey) query.set("cycle", navigation.selectedProjectDossierKey);
  if (navigation.selectedApplicationReviewId) query.set("review_id", navigation.selectedApplicationReviewId);
  if (navigation.selectedAuditPlanId && navigation.activeView === "schedule-resources") query.set("audit_plan_id", navigation.selectedAuditPlanId);
  const suffix = () => query.size ? `?${query.toString()}` : "";

  if (customerPortalMode) {
    const portalMap: Partial<Record<ActiveView, string>> = {
      dashboard: "/portal",
      customers: "/portal/organization",
      "customer-portal-users": "/portal/organization?tab=access",
      applications: "/portal/applications",
      "customer-certifications": navigation.selectedProjectId ? `/portal/certifications/${encodeURIComponent(navigation.selectedProjectId)}` : "/portal/certifications",
      "customer-documents": "/portal/documents",
      "governance-cases": "/portal/requests",
      "schedule-resources": "/portal/calendar",
      projects: "/portal/corrective-actions",
      "customer-results": "/portal/results",
      certificates: navigation.selectedCertificateId ? `/portal/certificates/${encodeURIComponent(navigation.selectedCertificateId)}` : "/portal/certificates",
      notifications: "/portal/notifications",
    };
    return portalMap[navigation.activeView] ?? "/portal";
  }

  const internalMap: Partial<Record<ActiveView, string>> = {
    dashboard: "/workspace",
    "my-tasks": "/work",
    "my-calendar": "/calendar",
    notifications: "/notifications",
    delegations: "/delegations",
    customers: "/customers",
    applications: `/applications${suffix()}`,
    projects: "/certifications",
    "project-detail": navigation.selectedProjectId ? `/certifications/${encodeURIComponent(navigation.selectedProjectId)}${suffix()}` : "/certifications",
    "schedule-resources": `/schedule${suffix()}`,
    certificates: navigation.selectedCertificateId ? `/certificates/${encodeURIComponent(navigation.selectedCertificateId)}` : "/certificates",
    documents: "/documents",
    experts: "/resources/experts",
    reports: "/analytics",
    "system-admin": "/admin/accounts",
    "configuration-schemes": "/admin/configuration/schemes",
    "configuration-standards": "/admin/configuration/standards",
    "configuration-capabilities": "/admin/configuration/capabilities",
    "configuration-numbering": "/admin/configuration/numbering",
    "configuration-branding": "/admin/configuration/branding",
    "configuration-classifications": "/admin/configuration/classifications",
    "configuration-mappings": "/admin/configuration/mappings",
    "configuration-import": "/admin/configuration/import",
    "customer-change-requests": "/governance?type=organization-change",
    "governance-cases": "/governance",
    "customer-user-requests": "/admin/accounts?queue=portal-access",
    "customer-document-requests": "/documents?queue=customer-response",
  };
  return internalMap[navigation.activeView] ?? "/workspace";
}

export function createBrowserHistoryPayload(navigation: BrowserNavigationState) {
  const currentState = typeof window !== "undefined" ? window.history.state : null;
  const baseState = currentState && typeof currentState === "object" ? currentState : {};
  return { ...baseState, cmpNavigation: navigation, cticNavigation: navigation };
}

export function readBrowserNavigationState(rawState: unknown): BrowserNavigationState | null {
  if (!rawState || typeof rawState !== "object") return null;
  const container = rawState as { cmpNavigation?: unknown; cticNavigation?: unknown };
  const wrapped = container.cmpNavigation ?? container.cticNavigation;
  if (!wrapped || typeof wrapped !== "object") return null;
  const candidate = wrapped as Partial<BrowserNavigationState>;
  if (!isActiveView(candidate.activeView)) return null;
  return {
    activeView: candidate.activeView,
    selectedProjectId: typeof candidate.selectedProjectId === "string" ? candidate.selectedProjectId : null,
    selectedCertificateId: typeof candidate.selectedCertificateId === "string" ? candidate.selectedCertificateId : null,
    selectedAuditPlanId: typeof candidate.selectedAuditPlanId === "string" ? candidate.selectedAuditPlanId : null,
    selectedApplicationReviewId: typeof candidate.selectedApplicationReviewId === "string" ? candidate.selectedApplicationReviewId : null,
    selectedProjectDossierKey: typeof candidate.selectedProjectDossierKey === "string" ? candidate.selectedProjectDossierKey : null,
    selectedProjectWorkspacePath: typeof candidate.selectedProjectWorkspacePath === "string" ? candidate.selectedProjectWorkspacePath : null,
  };
}

export interface EffectiveAccessContext {
  roles: string[];
  permissions: string[];
}

export function canAccessNavigation(
  access: EffectiveAccessContext,
  options: { anyPermission?: string[]; anyRole?: string[]; adminAlways?: boolean },
) {
  const roles = new Set(access.roles.map((role) => role.trim().toUpperCase()));
  const permissions = new Set(access.permissions.map((permission) => permission.trim().toLowerCase()));
  if (options.adminAlways !== false && roles.has("ADMIN")) return true;
  if (options.anyPermission?.some((permission) => permissions.has(permission.toLowerCase()))) return true;
  if (options.anyRole?.some((role) => roles.has(role.toUpperCase()))) return true;
  return false;
}
