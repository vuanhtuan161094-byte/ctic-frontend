export interface StatusCount {
  status: string;
  count: number;
}

export interface DashboardAlert {
  id: string;
  alert_type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  due_date: string | null;
}

export interface RecentProject {
  id: string;
  project_code: string;
  standard_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  current_cycle?: {
    dossier_key: string;
    cycle_label: string;
    stage_label: string;
    display_label: string;
    event_id: string;
  } | null;
  certification_applications?: {
    application_code: string;
    certification_type: string;
    customers?: {
      id: string;
      customer_code: string;
      company_name: string;
    } | null;
  } | null;
}

export interface RecentCertificate {
  id: string;
  verification_code: string | null;
  cert_number: string;
  issue_date: string;
  expire_date: string;
  status: string;
  created_at: string;
}

export interface UpcomingAudit {
  id: string;
  event_type: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  planned_mandays: number | string | null;
  status: string;
  audit_programs?: {
    id: string;
    project_id: string;
    program_code: string;
    organization_name: string;
    standard_name: string;
  } | null;
}

export interface DashboardOverview {
  generated_at: string;
  warning_days: number;
  summary: {
    customers: { total: number; active: number };
    projects: { total: number; active: number };
    applications: { pending: number };
    certificates: { active: number; expiring: number; expired: number };
    audits: { upcoming: number; overdue: number };
    findings: { open: number; overdue: number };
    technical_reviews: { pending: number };
    notifications: { unsent: number };
    alerts: { total: number; critical: number; warning: number; info: number };
  };
  status_breakdown: {
    projects: StatusCount[];
    certificates: StatusCount[];
    applications: StatusCount[];
    technical_reviews: StatusCount[];
  };
  recent_projects: RecentProject[];
  recent_certificates: RecentCertificate[];
  upcoming_audits: UpcomingAudit[];
  priority_alerts: DashboardAlert[];
}

export interface NotificationSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
}
