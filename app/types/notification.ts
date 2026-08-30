export type NotificationCategory =
  | "WORK_ASSIGNED"
  | "WORK_DUE_SOON"
  | "WORK_OVERDUE"
  | "WORK_ESCALATED"
  | "WORKFLOW_UPDATE"
  | "CAP_DUE"
  | "TECHNICAL_REVIEW_READY"
  | "CERTIFICATION_DECISION_READY"
  | "CERTIFICATE_ISSUE_READY"
  | "CERTIFICATE_EXPIRING"
  | "CERTIFICATE_STATUS_CHANGED";

export type NotificationSeverity = "INFO" | "NORMAL" | "WARNING" | "CRITICAL";

export interface PersonalNotification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  status: "unread" | "read" | "resolved";
  destination_path: string | null;
  context: Record<string, unknown> | null;
  entity_type: string | null;
  entity_id: string | null;
  project_id: string | null;
  audit_event_id: string | null;
  work_item: {
    id: string;
    status: string;
    completed: boolean;
  } | null;
  due_date: string | null;
  channel: "IN_APP";
}

export interface NotificationResponse {
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  filter: {
    status: string;
    category: string | null;
    severity: string | null;
    limit: number;
  };
  items: PersonalNotification[];
}
