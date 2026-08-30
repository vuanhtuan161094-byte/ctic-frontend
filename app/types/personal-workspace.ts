export type WorkPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

export interface PersonalWorkItem {
  id: string;
  work_type: string;
  title: string;
  description: string | null;
  project_id: string | null;
  project_code: string | null;
  organization_name: string | null;
  audit_event_id: string | null;
  audit_plan_id: string | null;
  cycle_key: string | null;
  assigned_role: string | null;
  assignee: string | null;
  status: string;
  priority: WorkPriority;
  due_at: string | null;
  is_overdue: boolean;
  destination_path: string | null;
  context: Record<string, unknown> | null;
  can_execute: boolean;
  is_delegated: boolean;
  delegated_from_user?: {
    id: string;
    username: string;
    full_name?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalCalendarItem {
  id: string;
  type: "AUDIT" | "WORK_DUE" | "REVIEW_DUE" | "DECISION_DUE" | "CERTIFICATE_ACTION_DUE";
  title: string;
  start: string;
  end: string | null;
  all_day: boolean;
  project_id: string | null;
  project_code: string | null;
  organization_name: string | null;
  role_in_event: string | null;
  status: string;
  destination_path: string | null;
  context: Record<string, unknown> | null;
}

export interface PersonalWorkspace {
  generated_at: string;
  user_context: {
    current_user: {
      id: string;
      username: string | null;
      full_name: string | null;
      email: string | null;
    };
    active_roles: string[];
    primary_persona: string;
    personas: string[];
    allowed_sections: string[];
  };
  work_summary: {
    open: number;
    in_progress: number;
    overdue: number;
    due_soon: number;
    high_priority: number;
  };
  priority_work_items: PersonalWorkItem[];
  calendar_items: PersonalCalendarItem[];
  role_kpis: Array<{
    key: string;
    label: string;
    value: number;
    tone: string;
    destination_path: string;
    persona: string;
  }>;
  exceptions: Array<{
    id: string;
    type: string;
    severity: "critical" | "warning";
    title: string;
    message: string;
    due_at: string | null;
    destination_path: string | null;
    context: Record<string, unknown> | null;
  }>;
  recent_records: Array<{
    id: string;
    record_type: string;
    title: string;
    project_code: string | null;
    organization_name: string | null;
    status: string;
    occurred_at: string;
    destination_path: string | null;
    context: Record<string, unknown> | null;
  }>;
  meta: {
    due_soon_days: number;
    certificate_warning_days: number | null;
    data_sources: string[];
    sales_assignment_limitation: string | null;
  };
}
