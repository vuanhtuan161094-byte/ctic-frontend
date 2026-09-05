export type CertificationCaseArea = "overview" | "progress" | "team" | "documents" | "activity";

export interface CertificationCaseCustomer {
  id: string;
  customer_code?: string | null;
  company_name: string;
}

export interface CertificationCaseSite {
  id?: string;
  site_no: number;
  site_name?: string | null;
  address?: string | null;
  activities?: string | null;
  employee_count?: number | null;
  is_headquarters?: boolean | null;
}

export interface CertificationCaseReviewAction {
  id: string;
  action?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  comment?: string | null;
  created_at?: string | null;
  actor?: { full_name?: string | null; username?: string | null } | null;
}

export interface CertificationCaseApplication {
  id: string;
  application_code: string;
  standard_name: string;
  certification_scope?: string | null;
  certification_type?: string | null;
  status: string;
  site_count?: number | null;
  requested_audit_date?: string | null;
  requested_stage1_date?: string | null;
  requested_stage2_date?: string | null;
  customers?: CertificationCaseCustomer | null;
  sites?: CertificationCaseSite[];
  application_reviews?: Array<{
    id: string;
    workflow_status?: string | null;
    review_date?: string | null;
    created_at?: string | null;
    prepared_by?: { full_name?: string | null; username?: string | null } | null;
    users?: { full_name?: string | null; username?: string | null } | null;
    workflow_actions?: CertificationCaseReviewAction[];
  }>;
}

export interface CertificationCaseRecord {
  id: string;
  application_id: string;
  project_code: string;
  standard_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  certification_applications?: CertificationCaseApplication | null;
  contracts?: { id: string; contract_number: string; sign_date?: string | null } | null;
  certification_agreements?: { id: string; agreement_number: string; sign_date?: string | null } | null;
}

export interface CertificationCaseAuditPlan {
  id: string;
  audit_event_id?: string | null;
  plan_code?: string | null;
  audit_type?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  location?: string | null;
  status?: string | null;
  version_no: number;
  audit_event?: {
    id: string;
    event_type?: string | null;
    sequence_no?: number | null;
    planned_mandays?: number | string | null;
    status?: string | null;
  } | null;
}

export interface CertificationCaseDetail extends CertificationCaseRecord {
  audit_plans: CertificationCaseAuditPlan[];
}

export interface CertificationCaseItem {
  item_no: number;
  document_key: string;
  document_name: string;
  storage_type: string;
  status: string;
  reference_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  action_event_id?: string | null;
}

export interface CertificationCycleGroup {
  dossier_key: string;
  dossier_type: string;
  dossier_label: string;
  dossier_description?: string | null;
  sequence_no: number;
  plan_ids: string[];
  plan_codes?: Array<string | null>;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  planned_mandays?: number | string | null;
  next_action?: {
    code: string;
    label: string;
    event_id?: string | null;
    plan_id?: string | null;
    item_key?: string | null;
    responsible_roles?: string[];
    responsible_label?: string | null;
  } | null;
  summary: {
    total_items: number;
    completed_items: number;
    pending_items: number;
    completion_percentage: number;
    dossier_status: string;
  };
  items: CertificationCaseItem[];
}

export interface CertificationCaseFile {
  id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  file_kind: string;
  original_name: string;
  file_url: string | null;
  version_no: number;
  is_current?: boolean;
  uploaded_at: string;
}

export interface CertificationCaseDossier {
  project: {
    id: string;
    project_code: string;
    status: string;
    customer: CertificationCaseCustomer;
    standard_name: string;
    certification_scope?: string | null;
  };
  summary: {
    total_items: number;
    completed_items: number;
    pending_items: number;
    completion_percentage: number;
    dossier_status: string;
  };
  items: CertificationCaseItem[];
  common_items?: CertificationCaseItem[];
  dossiers?: CertificationCycleGroup[];
  current_dossier_key?: string | null;
  source_records?: { application?: CertificationCaseApplication | null };
  files: CertificationCaseFile[];
}

export interface CertificationCaseAlert {
  alert_type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  reference_id: string | null;
  due_date: string | null;
}

export interface CertificationCaseAlerts {
  warning_days: number;
  generated_at: string;
  summary: { total: number; critical: number; warning: number; info: number };
  alerts: CertificationCaseAlert[];
}

export interface CertificationCaseWorkspaceData {
  project: CertificationCaseDetail;
  dossier: CertificationCaseDossier;
  alerts: CertificationCaseAlerts;
}

export interface CertificationCaseDestination {
  route_name: string;
  params: Record<string, string>;
  query: Record<string, string>;
  legacy_path: string | null;
  contract_version: "2.0";
}

export interface CertificationCaseProjectionCycle {
  key: string;
  type: string;
  label: string;
  description?: string | null;
  sequence_no: number;
  plan_ids: string[];
  plan_codes: Array<string | null>;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  planned_mandays?: number | string | null;
  summary: {
    total_items?: number;
    completed_items?: number;
    pending_items?: number;
    completion_percentage?: number;
    dossier_status?: string;
  };
  stages: CertificationCaseItem[];
}

export interface CertificationCaseActivityEvent {
  id: string;
  occurred_at: string;
  type: string;
  title: string;
  description: string | null;
  actor: { display_name: string } | null;
  cycle_key: string | null;
  stage: string | null;
  destination: CertificationCaseDestination | null;
  importance: "INFO" | "IMPORTANT" | "CRITICAL";
}

export interface CertificationCaseActivityPage {
  contract_version: "2.0";
  items: CertificationCaseActivityEvent[];
  page: { limit: number; next_cursor: string | null; has_more: boolean };
}

export interface CertificationCaseProjectedFile {
  id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  file_kind: string;
  original_name: string;
  version_no: number;
  uploaded_at: string;
}

export interface CertificationCaseWorkspaceProjection {
  contract_version: "2.0";
  identity: {
    id: string;
    case_reference: string;
    application_id: string;
    application_reference: string;
    created_at: string;
    updated_at: string;
  };
  customer: { id: string; code?: string | null; name: string };
  standards_scope: {
    standards: Array<{ display_name: string }>;
    display_name: string;
    certification_scope: string;
    certification_type?: string | null;
    sites: CertificationCaseSite[];
  };
  cycles: CertificationCaseProjectionCycle[];
  current_cycle: { key: string; label: string } | null;
  case_status: string;
  current_stage: { code: string; label: string; status: string; source_id: string | null } | null;
  responsibility: { label: string; action_code: string | null; work_item_id: string | null } | null;
  next_action: {
    code: string;
    label: string;
    business_meaning: string;
    authorized: boolean;
    disabled_reason: string | null;
    destination: CertificationCaseDestination;
  } | null;
  allowed_actions: Array<{
    code: string;
    label: string;
    work_item_id: string;
    due_at: string | null;
    destination: CertificationCaseDestination;
  }>;
  blockers: Array<{
    code: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    message: string;
    due_at: string | null;
    source_id: string | null;
  }>;
  sla: {
    applicability: "APPLICABLE" | "NOT_APPLICABLE";
    status: "NOT_APPLICABLE" | "NOT_CONFIGURED" | "DUE" | "WARNING" | "OVERDUE";
    due_at: string | null;
    remaining_days: number | null;
  };
  team_summary: {
    status: "NOT_CONFIGURED" | "READY" | "BLOCKED";
    appointment: {
      id: string;
      plan_id: string;
      number: string;
      appointment_date: string;
      status: string;
      team_lead: string | null;
      audit_start_date: string | null;
      audit_end_date: string | null;
    } | null;
    members: Array<{
      id: string;
      expert: { id: string; employee_code: string | null; display_name: string };
      role: string;
      planned_start_date: string;
      planned_end_date: string;
      planned_mandays: number | string | null;
      assignment_status: string;
      competency_status: string;
      confirmed: boolean;
    }>;
    planned_mandays: number | null;
    competence: { status: string; reasons: Array<{ code: string; severity: string; message: string }> };
    independence: { status: string; reasons: Array<{ code: string; severity: string; message: string }> };
    blockers: Array<{ code: string; severity: string; message: string }>;
  };
  document_summary: {
    total: number;
    groups: Array<{
      key: "customer_evidence" | "audit" | "cap" | "technical_review" | "decision_result" | "certificate" | "other";
      count: number;
      ready: boolean;
      latest: CertificationCaseProjectedFile | null;
      items: CertificationCaseProjectedFile[];
    }>;
  };
  recent_activity: CertificationCaseActivityPage;
  links: {
    self: CertificationCaseDestination;
    activity: CertificationCaseDestination;
    legacy_project: string;
    legacy_dossier: string;
    legacy_alerts: string;
  };
  projection_meta: { generated_at: string; bounded: true; mutation_capable: false };
}
