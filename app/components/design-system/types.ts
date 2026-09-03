import type { ReactNode } from "react";

export type SemanticTone =
  | "neutral"
  | "info"
  | "attention"
  | "positive"
  | "critical"
  | "inactive";

export type StatusDomain =
  | "application"
  | "applicationReview"
  | "reviewResult"
  | "quotation"
  | "case"
  | "programme"
  | "surveillanceSnapshot"
  | "teamAppointment"
  | "competence"
  | "auditPlan"
  | "report"
  | "finding"
  | "capVersion"
  | "technicalReview"
  | "reviewerAssignment"
  | "reviewItem"
  | "decisionResult"
  | "certificate"
  | "controlledTemplate"
  | "generatedDocument"
  | "changeCase"
  | "specialAudit"
  | "complaint"
  | "appeal"
  | "workItem";

export interface StatusDefinition {
  label: string;
  tone: SemanticTone;
}

export interface DestinationRef {
  label?: string;
  onNavigate?: () => void;
}

export interface ProjectedAction {
  code: string;
  label: string;
  businessMeaning?: string;
  enabled: boolean;
  disabledReason?: string;
  severity?: "NORMAL" | "IMPORTANT" | "BLOCKING" | "DESTRUCTIVE";
  confirmation?: "NONE" | "COMMENT" | "REASON" | "EXPLICIT_CONFIRM";
  onAction?: () => void;
}

export interface StructuredBlocker {
  code: string;
  label: string;
  explanation?: string;
  severity: "INFO" | "WARNING" | "BLOCKING";
  resolution?: DestinationRef;
}

export interface SelectOption {
  label: ReactNode;
  value: string;
}
