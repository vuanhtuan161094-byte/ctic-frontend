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
